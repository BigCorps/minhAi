import "server-only";

import { checked, db, event } from "./server";
import { emailContent } from "./channels";
import { messageVariant, recipientSnapshot } from "./outreach";
import { saveCommercialClassification } from "./commercial-classification-server";
import { researchBusinessContact } from "./web-research";

const POLICY = "first_contact_v1";
const AUTO_SCAN_LIMIT = 20;

function readyBudget(row: any) {
  return !!row?.enabled
    && Number(row.used_units || 0) < Number(row.limit_units || 0)
    && !!row.expires_at
    && new Date(row.expires_at).getTime() > Date.now();
}

function automaticRecipient(o: any, l: any) {
  if (l.email_status === "verified" && l.email) {
    const snapshot = recipientSnapshot(o, l, { recipient_kind: "individual" });
    return {
      ...snapshot,
      recipient_evidence: {
        ...snapshot.recipient_evidence,
        automation_policy: POLICY,
      },
    };
  }

  const contacts = Array.isArray(o.qualification?.web_research?.companyContacts)
    ? o.qualification.web_research.companyContacts
    : [];
  const valid = new Map<string, any>();
  for (const candidate of contacts) {
    if (candidate?.type !== "email") continue;
    try {
      const snapshot = recipientSnapshot(o, l, {
        recipient_kind: "company_contact",
        recipient_address: candidate.value,
      });
      valid.set(snapshot.recipient_address, {
        ...snapshot,
        recipient_evidence: {
          ...snapshot.recipient_evidence,
          automation_policy: POLICY,
        },
      });
    } catch {
      // Invalid or ambiguous corporate contacts stay out of automation.
    }
  }
  if (valid.size !== 1) return null;
  return [...valid.values()][0];
}

async function loadOpportunity(id: string) {
  return checked(
    await db()
      .from("sdr_opportunities")
      .select("*,lead:sdr_leads(*)")
      .eq("id", id)
      .single(),
  )!;
}

async function classifyIfNeeded(o: any, force = false) {
  const current = o.qualification?.commercial_classification;
  if (current?.source === "manual") return o;
  if (force) {
    await saveCommercialClassification(o.id, "recalculate");
    return loadOpportunity(o.id);
  }
  if (!current?.type) {
    await saveCommercialClassification(o.id, "automatic");
    return loadOpportunity(o.id);
  }
  return o;
}

async function maybeResearch(o: any, allowResearch: boolean) {
  if (!allowResearch) return o;
  const research = o.qualification?.web_research;
  if (research?.status) return o;
  try {
    await researchBusinessContact(o.id);
    return loadOpportunity(o.id);
  } catch (error) {
    const code = error instanceof Error ? error.message : "web_research_failed";
    await event("worker", "automatic_research_skipped", o.lead_id, o.id, { code });
    return loadOpportunity(o.id);
  }
}

export async function prepareAutomaticFirstContacts() {
  const d = db();
  const now = new Date().toISOString();

  const rolloutRows = checked(
    await d
      .from("sdr_product_rollouts")
      .select("product,status,auto_discovery_enabled,auto_outreach_enabled,live_send_enabled,daily_send_cap")
      .eq("status", "active")
      .eq("auto_outreach_enabled", true)
      .eq("live_send_enabled", true)
      .gt("daily_send_cap", 0),
  ) || [];
  if (!rolloutRows.length) return { scanned: 0, researched: 0, queued: 0 };

  const rolloutByProduct = new Map(rolloutRows.map((r: any) => [r.product, r]));
  const campaignRows = checked(
    await d
      .from("sdr_campaigns")
      .select("id,product,enabled,trial_ends_at,daily_limit,max_touches")
      .eq("enabled", true)
      .gt("trial_ends_at", now)
      .eq("max_touches", 1),
  ) || [];
  const campaigns = campaignRows.filter((c: any) => rolloutByProduct.has(c.product));
  if (!campaigns.length) return { scanned: 0, researched: 0, queued: 0, capacityRemaining: 0 };

  const capacities = new Map<string, number>();
  for (const campaign of campaigns) {
    const capacity = Number(checked(await d.rpc("sdr_automatic_outreach_capacity", {
      p_product: campaign.product,
      p_campaign: campaign.id,
    })) || 0);
    capacities.set(campaign.id, capacity);
  }
  const activeCampaigns = campaigns.filter((campaign: any) => (capacities.get(campaign.id) || 0) > 0);
  if (!activeCampaigns.length) return { scanned: 0, researched: 0, queued: 0, capacityRemaining: 0 };

  const budget = checked(
    await d
      .from("sdr_provider_budgets")
      .select("provider,enabled,limit_units,used_units,expires_at")
      .eq("provider", "web_research")
      .maybeSingle(),
  );
  let researchAvailable = readyBudget(budget);
  let researched = 0;

  const campaignIds = activeCampaigns.map((c: any) => c.id);
  const opportunities = checked(
    await d
      .from("sdr_opportunities")
      .select("*,lead:sdr_leads(*)")
      .in("campaign_id", campaignIds)
      .eq("stage", "new")
      .order("created_at", { ascending: true })
      .limit(AUTO_SCAN_LIMIT),
  ) || [];

  let queued = 0;
  for (const initial of opportunities) {
    const lead = initial.lead;
    if (!lead || lead.owner !== "minhai" || lead.suppressed_at || lead.human_at || lead.last_inbound_at || lead.last_contact_at)
      continue;
    const rollout: any = rolloutByProduct.get(initial.product);
    if (!rollout) continue;
    const remaining = capacities.get(initial.campaign_id) || 0;
    if (remaining <= 0) continue;

    let o = await classifyIfNeeded(initial);
    let type = o.qualification?.commercial_classification?.type;
    let recipient = ["customer", "partner"].includes(type)
      ? automaticRecipient(o, o.lead)
      : null;

    const needsMoreEvidence = !["customer", "partner"].includes(type) || !recipient;
    if (needsMoreEvidence && rollout.auto_discovery_enabled && researchAvailable && researched < 1) {
      o = await maybeResearch(o, true);
      researched++;
      const refreshedBudget = checked(
        await d
          .from("sdr_provider_budgets")
          .select("provider,enabled,limit_units,used_units,expires_at")
          .eq("provider", "web_research")
          .maybeSingle(),
      );
      researchAvailable = readyBudget(refreshedBudget);
      o = await classifyIfNeeded(o, true);
      type = o.qualification?.commercial_classification?.type;
      recipient = ["customer", "partner"].includes(type)
        ? automaticRecipient(o, o.lead)
        : null;
    }
    if (!["customer", "partner"].includes(type) || !recipient) continue;

    try {
      const variant = messageVariant(type);
      const message = emailContent(o, o.lead, 0, variant, recipient.recipient_kind);
      const snapshot = {
        ...recipient,
        message_variant: variant,
        message_subject: message.subject,
        message_body: message.body,
        enqueue_mode: "automatic",
      };
      const queueId = checked(
        await d.rpc("sdr_enqueue_automatic_email", {
          p_opportunity: o.id,
          p_snapshot: snapshot,
        }),
      );
      queued++;
      capacities.set(initial.campaign_id, Math.max(0, (capacities.get(initial.campaign_id) || 0) - 1));
      await event("worker", "automatic_outreach_queued", o.lead_id, o.id, {
        queueId,
        policy: POLICY,
        recipientKind: recipient.recipient_kind,
        variant,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "automatic_enqueue_failed";
      if (!["company_already_contacted", "campaign_daily_limit", "product_daily_limit"].includes(code)) {
        await event("worker", "automatic_outreach_skipped", o.lead_id, o.id, { code });
      }
    }
  }

  return {
    scanned: opportunities.length,
    researched,
    queued,
    capacityRemaining: [...capacities.values()].reduce((total, value) => total + Math.max(0, value), 0),
  };
}
