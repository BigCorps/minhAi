import "server-only";
import { createHash } from "node:crypto";
import { db, checked, fetchJson, required } from "./server";
import {
  normalizeLead,
  identityKeys,
  type LeadInput,
  type Provider,
} from "./catalog";
const LIMIT = 5;
const ECONODATA_PILOT_RESERVE = 5000;
const key = (p: Provider) => required(`${p.toUpperCase()}_API_KEY`);
type HunterContact = {
  value?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  verification?: { status?: string };
  decision_maker?: boolean;
  seniority?: string;
  confidence?: number;
};
const hunterContactName = (contact: HunterContact) =>
  [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
const hunterContactRank = (contact: HunterContact) => {
  const position = (contact.position || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return [
    Number(contact.decision_maker === true),
    Number(contact.seniority === "executive"),
    Number(/\b(owner|founder|fundador|fundadora|socio|socia|ceo|chief|president|presidente|head)\b/.test(position)),
    Number(/\b(director|diretor|diretora|manager|gerente)\b/.test(position)),
    Number(/\b(commercial|comercial|sales|vendas|marketing)\b/.test(position)),
    Number.isFinite(contact.confidence) ? contact.confidence! : 0,
  ];
};
const selectHunterContact = (contacts: HunterContact[]) =>
  contacts
    .filter(
      (contact) =>
        contact.value?.trim() &&
        contact.verification?.status === "valid" &&
        hunterContactName(contact) &&
        contact.position?.trim(),
    )
    .sort((a, b) => {
      const aRank = hunterContactRank(a);
      const bRank = hunterContactRank(b);
      for (let i = 0; i < aRank.length; i++) {
        if (aRank[i] !== bRank[i]) return bRank[i] - aRank[i];
      }
      return 0;
    })[0];
async function api(
  p: Provider,
  path: string,
  payload?: unknown,
  extra: Record<string, string> = {},
) {
  const base = {
    hunter: "https://api.hunter.io/v2",
    apollo: "https://api.apollo.io/api/v1",
    econodata: "https://api.econodata.com.br/v4",
  }[p];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (p === "apollo") headers["x-api-key"] = key(p);
  else headers.Authorization = `Bearer ${key(p)}`;
  return fetchJson(
    base + path,
    {
      method: payload ? "POST" : "GET",
      headers,
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    },
    { provider: p, path: path.split("?")[0] },
  );
}
export async function discover(campaignId: string) {
  const d = db();
  const c = checked(
    await d.from("sdr_campaigns").select("*").eq("id", campaignId).single(),
  )!;
  if (!c.provider) throw new Error("provider_missing");
  const p = c.provider as Provider;
  if (c.cursor?.exhausted) throw new Error("search_exhausted");
  const filters = c.filters as Record<string, any>;
  if (!Object.keys(filters).length) throw new Error("filters_required");
  if (
    c.product === "melhoria" &&
    JSON.stringify(filters).match(
      /depress|ansied|doen[cç]|diagn[oó]st|sa[uú]de mental/i,
    )
  )
    throw new Error("sensitive_targeting_rejected");
  let request: any;
  let reserve = LIMIT;
  if (p === "econodata") {
    request = {
      filtros: filters,
    };
    // Internal guardrail only; actual provider billing comes from X-Tokens-Charged.
    reserve = ECONODATA_PILOT_RESERVE;
  } else if (p === "apollo") {
    request = {
      ...filters,
      page: Number(c.cursor?.page || 1),
      per_page: LIMIT,
    };
  } else {
    request = filters;
    if (c.cursor?.searched) throw new Error("hunter_free_first_page_only");
  }
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ p, request }))
    .digest("hex");
  const run = checked(
    await d.rpc("sdr_reserve_run", {
      p_campaign: c.id,
      p_units: reserve,
      p_fingerprint: fingerprint,
    }),
  );
  let imported = 0,
    duplicates = 0;
  let charged: number | null = null;
  try {
    let leads: LeadInput[] = [];
    let cursor: any = { exhausted: true };
    if (p === "econodata") {
      const result = await api(p, "/companies/search_list", request);
      const rows = result.payload.resultados;
      if (!Array.isArray(rows)) throw new Error("provider_schema_changed");
      const h = result.headers.get("x-tokens-charged");
      // X-Tokens-Charged is documented by Econodata; missing/invalid is unknown.
      const actual = h?.trim() ? Number(h) : NaN;
      charged = Number.isFinite(actual) && actual >= 0 ? actual : null;
      leads = rows.slice(0, LIMIT).map((r: any) => {
        // Company discovery only: retain CNPJ for a later people/organogram lookup.
        return {
          company_name:
            r.cadastro?.nomeFantasia || r.cadastro?.razaoSocial || `CNPJ ${r.cnpj}`,
          cnpj: r.cnpj,
          email: null,
          phone: null,
          email_status: "unknown",
          source: p,
          source_ref: r.cnpj,
          evidence: "Empresa descoberta pela segmentação Econodata; primeira etapa retornou somente identificação básica. Cadastro, decisores e contatos ainda não foram consultados.",
        };
      });
      cursor = { exhausted: true };
    } else if (p === "hunter") {
      const found = await api(p, "/discover", request);
      if (!Array.isArray(found.payload.data))
        throw new Error("provider_schema_changed");
      charged = 0;
      const companies = found.payload.data
        .filter((company: any) => company.domain && company.emails_count?.personal !== 0)
        .sort((a: any, b: any) =>
          Number(b.emails_count?.personal > 0) - Number(a.emails_count?.personal > 0),
        )
        .slice(0, LIMIT);
      for (const company of companies) {
        const params = new URLSearchParams({
          domain: company.domain,
          limit: "10",
          type: "personal",
          verification_status: "valid",
          required_field: "full_name,position",
        });
        const foundEmail = await api(
          p,
          `/domain-search?${params}`,
        );
        const emails = foundEmail.payload.data?.emails;
        if (!Array.isArray(emails) || !emails.length) continue;
        charged++;
        const contact = selectHunterContact(emails);
        if (!contact) continue;
        leads.push({
          company_name: company.organization || company.domain,
          domain: company.domain,
          email: contact?.value,
          contact_name: hunterContactName(contact),
          email_status:
            contact?.verification?.status === "valid" ? "verified" : "unknown",
          source: p,
          source_ref: company.domain,
          evidence: `Empresa retornada pelo Hunter Discover; contato profissional pessoal selecionado localmente pelo Domain Search. Cargo: ${contact.position}. Decision maker: ${contact.decision_maker === true ? "true" : "false"}.${contact.seniority ? ` Seniority: ${contact.seniority}.` : ""}${contact.confidence != null ? ` Confidence: ${contact.confidence}.` : ""} Filtro da campanha: ${JSON.stringify(filters)}`,
        });
      }
      cursor = { searched: true, exhausted: true };
    } else {
      const found = await api(p, "/mixed_people/api_search", request);
      if (!Array.isArray(found.payload.people))
        throw new Error("provider_schema_changed");
      for (const prospect of found.payload.people.slice(0, LIMIT)) {
        const personId = prospect.id || prospect.person_id;
        if (!personId) continue;
        const params = new URLSearchParams({
          id: personId,
          reveal_personal_emails: "false",
          reveal_phone_number: "false",
          run_waterfall_email: "false",
          run_waterfall_phone: "false",
        });
        const enriched = await api(p, `/people/match?${params}`, {});
        const person = enriched.payload.person;
        if (!person) continue;
        const org = person.organization || prospect.organization || {};
        leads.push({
          company_name: org.name || "Empresa não informada",
          contact_name: person.name,
          domain: org.primary_domain || org.website_url,
          email: person.email,
          email_status:
            person.email_status === "verified" ? "verified" : "unknown",
          source: p,
          source_ref: person.id,
          evidence: `Cargo profissional: ${person.title || "não informado"}. Empresa retornada pela busca Apollo: ${JSON.stringify(filters)}.`,
        });
      }
      cursor = {
        page: request.page + 1,
        exhausted: found.payload.people.length < LIMIT,
      };
    }
    for (const input of leads) {
      const lead = normalizeLead(input);
      const keys = identityKeys(lead);
      if (!keys.length || !lead.company_name) continue;
      const existing = checked(
        await d
          .from("sdr_lead_keys")
          .select("lead_id")
          .in("key", keys)
          .limit(1),
      );
      checked(
        await d.rpc("sdr_import_lead", {
          p_lead: lead,
          p_campaign: c.id,
          p_keys: keys,
        }),
      );
      if (existing?.length) duplicates++;
      else imported++;
    }
    checked(await d.from("sdr_campaigns").update({ cursor }).eq("id", c.id));
    checked(
      await d
        .from("sdr_runs")
        .update({
          status: "completed",
          credits_charged: charged,
          imported,
          duplicates,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run),
    );
    return {
      imported,
      duplicates,
      creditsReserved: reserve,
      creditsCharged: charged,
    };
  } catch (e) {
    checked(
      await d
        .from("sdr_runs")
        .update({
          status: "failed",
          error_code: e instanceof Error ? e.message : "provider_failed",
          imported,
          duplicates,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run),
    );
    throw e;
  }
}
export async function verifyEmail(leadId: string) {
  const d = db();
  const l = checked(
    await d.from("sdr_leads").select("email").eq("id", leadId).single(),
  )!;
  if (!l.email) throw new Error("email_missing");
  // Dedicated verification is explicit and reserved atomically against the Hunter budget.
  checked(
    await d.rpc("sdr_reserve_units", { p_provider: "hunter", p_units: 1 }),
  );
  const r = await api(
    "hunter",
    `/email-verifier?email=${encodeURIComponent(l.email)}`,
  );
  const status =
    r.payload.data?.status === "valid"
      ? "verified"
      : r.payload.data?.status || "unknown";
  checked(
    await d.from("sdr_leads").update({ email_status: status }).eq("id", leadId),
  );
  return { status };
}
