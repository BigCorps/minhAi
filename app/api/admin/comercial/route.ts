import {
  adminRequest,
  body,
  checked,
  db,
  event,
  origin,
  signToken,
} from "@/lib/sdr/server";
import {
  identityKeys,
  isProduct,
  normalizeLead,
  PROVIDERS,
  PRODUCTS,
} from "@/lib/sdr/catalog";
import { discover, verifyEmail, enrichEconodataDecisionMaker } from "@/lib/sdr/providers";
import {
  seedTemplates,
  submitTemplate,
  syncTemplate,
  emailContent,
} from "@/lib/sdr/channels";
import { monitoriaSnapshot } from "@/lib/sdr/monitoria";
import { reconcileSales, recordActivation } from "@/lib/sdr/sales";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
const text = (v: unknown, max = 2000) =>
  String(v || "")
    .trim()
    .slice(0, max);
const integer = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error("invalid_number");
  return n;
};
const date = (v: unknown) => {
  if (!v) return null;
  const value = String(v);
  const d = new Date(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? value + "-03:00" : value,
  );
  if (!Number.isFinite(d.getTime())) throw new Error("invalid_date");
  return d.toISOString();
};
export async function GET(req: Request) {
  return adminRequest(req, async () => {
    const d = db();
    const url = new URL(req.url);
    const page = integer(url.searchParams.get("page") || 0, 0, 10000);
    let oq = d
      .from("sdr_opportunities")
      .select("*,lead:sdr_leads(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * 30, page * 30 + 29);
    const campaign = url.searchParams.get("campaign");
    if (campaign) oq = oq.eq("campaign_id", campaign);
    const [
      campaigns,
      opportunities,
      budgets,
      templates,
      runs,
      queue,
      metrics,
      monitoria,
    ] = await Promise.all([
      d.from("sdr_campaigns").select("*").order("lane").order("product"),
      oq,
      d.from("sdr_provider_budgets").select("*"),
      d.from("sdr_templates").select("*"),
      d
        .from("sdr_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
      d
        .from("sdr_queue")
        .select("id,opportunity_id,channel,status,error_code,due_at,sent_at")
        .order("created_at", { ascending: false })
        .limit(100),
      d.rpc("sdr_metrics"),
      monitoriaSnapshot(),
    ]);
    return {
      campaigns: checked(campaigns),
      opportunities: checked(opportunities),
      total: opportunities.count,
      page,
      budgets: checked(budgets),
      templates: checked(templates),
      runs: checked(runs),
      queue: checked(queue),
      metrics: checked(metrics),
      monitoria,
      config: {
        live: process.env.SDR_LIVE_SEND === "true",
        token: !!process.env.SDR_TOKEN_SECRET,
        email: !!process.env.SDR_GOOGLE_ACCOUNT_ID,
        whatsapp: !!process.env.SDR_WHATSAPP_NUMBER_ID,
        providers: Object.fromEntries(
          PROVIDERS.map((p) => [
            p,
            !!process.env[`${p.toUpperCase()}_API_KEY`],
          ]),
        ),
      },
    };
  });
}
export async function POST(req: Request) {
  return adminRequest(req, async (actor) => {
    const input = await body(req),
      d = db();
    const id = text(input.id, 100);
    switch (input.action) {
      case "econodata_decision_maker":
        return enrichEconodataDecisionMaker(id);
      case "campaign": {
        const patch = {
          provider: PROVIDERS.includes(input.provider) ? input.provider : null,
          enabled: input.enabled === true,
          auto_discover: input.auto_discover === true,
          filters: input.filters,
          cursor: {},
          trial_ends_at: date(input.trial_ends_at),
          max_runs: integer(input.max_runs, 1, 1000),
          daily_limit: integer(input.daily_limit, 1, 100),
          max_touches: integer(input.max_touches, 1, 3),
          cost_cents: integer(input.cost_cents || 0, 0, 100000000),
        };
        if (
          !patch.filters ||
          Array.isArray(patch.filters) ||
          typeof patch.filters !== "object"
        )
          throw new Error("filters_required");
        checked(await d.from("sdr_campaigns").update(patch).eq("id", id));
        await event(actor, "campaign_updated", null, null, { campaignId: id });
        return {};
      }
      case "budget": {
        if (!PROVIDERS.includes(input.provider))
          throw new Error("invalid_provider");
        checked(
          await d
            .from("sdr_provider_budgets")
            .update({
              limit_units: integer(input.limit_units, 0, 1000000),
              expires_at: date(input.expires_at),
              enabled: input.enabled === true,
            })
            .eq("provider", input.provider),
        );
        return {};
      }
      case "discover":
        return discover(id);
      case "verify_email":
        return verifyEmail(id);
      case "import": {
        const l = normalizeLead({
          ...input.lead,
          source: "manual",
          email_status: "unknown",
        });
        if (!l.company_name || l.evidence.length < 15 || !l.source_ref)
          throw new Error("source_evidence_required");
        const leadId = checked(
          await d.rpc("sdr_import_lead", {
            p_lead: l,
            p_campaign: id,
            p_keys: identityKeys(l),
          }),
        );
        await event(actor, "lead_imported", leadId, null);
        return { leadId };
      }
      case "review": {
        if (text(input.evidence).length < 15)
          throw new Error("fit_evidence_required");
        checked(
          await d
            .from("sdr_leads")
            .update({ outreach_reviewed: true, evidence: text(input.evidence) })
            .eq("id", id),
        );
        await event(actor, "fit_reviewed", id, null, {
          evidence: text(input.evidence),
        });
        return {};
      }
      case "handoff":
        checked(
          await d.rpc("sdr_stop", {
            p_lead: id,
            p_reason: "admin_handoff",
            p_suppress: false,
          }),
        );
        return {};
      case "optout":
        checked(
          await d.rpc("sdr_stop", {
            p_lead: id,
            p_reason: "admin_optout",
            p_suppress: true,
          }),
        );
        return {};
      case "consent": {
        const evidence = text(input.evidence);
        if (evidence.length < 20) throw new Error("consent_evidence_required");
        const o = checked(
          await d
            .from("sdr_opportunities")
            .select("product,lead_id")
            .eq("id", id)
            .single(),
        )!;
        const l = checked(
          await d
            .from("sdr_leads")
            .select("phone,suppressed_at")
            .eq("id", o.lead_id)
            .single(),
        )!;
        if (!l.phone || l.suppressed_at) throw new Error("contact_blocked");
        checked(
          await d
            .from("sdr_consents")
            .insert({
              lead_id: o.lead_id,
              product: o.product,
              channel: "whatsapp",
              address: l.phone,
              evidence,
              version: "manual-reviewed-v1",
            }),
        );
        await event(actor, "consent_recorded", o.lead_id, id, { evidence });
        return {};
      }
      case "enqueue": {
        const result = checked(
          await d.rpc("sdr_enqueue", {
            p_opportunity: id,
            p_channel: input.channel,
          }),
        );
        await event(actor, "outreach_queued", null, id, {
          channel: input.channel,
        });
        return { id: result };
      }
      case "preview": {
        const o = checked(
          await d.from("sdr_opportunities").select("*").eq("id", id).single(),
        )!;
        const l = checked(
          await d.from("sdr_leads").select("*").eq("id", o.lead_id).single(),
        )!;
        return {
          ...emailContent(o, l, 0),
          url: `${origin()}/comercial/conhecer/${signToken(id)}`,
        };
      }
      case "stage": {
        if (!["meeting", "proposal", "lost"].includes(input.stage))
          throw new Error("invalid_stage");
        const o = checked(
          await d
            .from("sdr_opportunities")
            .select("lead_id,stage")
            .eq("id", id)
            .single(),
        )!;
        if (["paid", "won"].includes(o.stage))
          throw new Error("paid_stage_is_automatic");
        checked(
          await d
            .from("sdr_opportunities")
            .update({
              stage: input.stage,
              estimated_cents: integer(
                input.estimated_cents || 0,
                0,
                100000000,
              ),
            })
            .eq("id", id),
        );
        checked(
          await d.rpc("sdr_stop", {
            p_lead: o.lead_id,
            p_reason: "human_negotiation",
            p_suppress: false,
          }),
        );
        await event(actor, "stage_updated", o.lead_id, id, {
          stage: input.stage,
          note: text(input.note),
        });
        return {};
      }
      case "monitoria_link": {
        const snapshot = await monitoriaSnapshot();
        if (
          !snapshot.available ||
          !snapshot.data.projects.some((p: any) => p.id === input.project_id)
        )
          throw new Error("monitoria_project_not_found");
        checked(
          await d
            .from("sdr_opportunities")
            .update({ external_ref: input.project_id })
            .eq("id", id)
            .eq("product", "monitoria_vip"),
        );
        await event(actor, "monitoria_linked", null, id, {
          projectId: input.project_id,
        });
        return {};
      }
      case "activation":
        await recordActivation(id, text(input.evidence), actor);
        return {};
      case "reconcile":
        return reconcileSales();
      case "seed_templates":
        await seedTemplates();
        return {};
      case "submit_template":
        if (!isProduct(input.product)) throw new Error("invalid_product");
        return submitTemplate(input.product);
      case "sync_template":
        if (!isProduct(input.product)) throw new Error("invalid_product");
        return syncTemplate(input.product);
      default:
        throw new Error("invalid_action");
    }
  });
}
