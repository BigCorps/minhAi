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
const ECONODATA_DECISION_MAKER_RESERVE = 1000;
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
type EconodataPerson = {
  nome: string;
  cargos: string[];
  tipo: string;
  nivelDecisao: string;
  classificacaoMacro: string[];
  classificacaoMicro: string[];
  dataDado: string;
};
const normalizedRole = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const econodataDecisionScore = (person: EconodataPerson) => {
  const roles = person.cargos.map(normalizedRole);
  const text = roles.join(" ");
  const groups: [RegExp, number][] = [
    [/\b(proprietario|proprietaria|socio|socia|fundador|fundadora|owner|founder|presidente|ceo)\b/, 80],
    [/\b(diretor|diretora|director)\b/, 60],
    [/\b(gerente|manager)\b/, 40],
    [/\b(coordenador|coordenadora|head|lider)\b/, 25],
  ];
  const cargo = groups.find(([pattern]) => pattern.test(text))?.[1] || 0;
  const affinity = normalizedRole([...person.cargos, ...person.classificacaoMacro, ...person.classificacaoMicro].join(" "));
  const junior = roles.filter((role) => /\b(assistente|assistant|estagiario|estagiaria|intern|trainee|junior)\b/.test(role)).length;
  return (person.nivelDecisao.toUpperCase() === "C-LEVEL" ? 100 : 0) + cargo +
    (/\b(evento|eventos|comercial|vendas|sales|marketing)\b/.test(affinity) ? 20 : 0) -
    (junior > roles.length / 2 ? 50 : 0);
};
const selectEconodataDecisionMaker = (items: unknown[]): EconodataPerson | undefined => {
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && !!item.trim()) : [];
  return items.slice(0, LIMIT).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    if (typeof value.nome !== "string" || !value.nome.trim()) return [];
    return [{
      nome: value.nome.trim(), cargos: strings(value.cargos),
      tipo: typeof value.tipo === "string" ? value.tipo : "",
      nivelDecisao: typeof value.nivelDecisao === "string" ? value.nivelDecisao : "",
      classificacaoMacro: strings(value.classificacaoMacro), classificacaoMicro: strings(value.classificacaoMicro),
      dataDado: typeof value.dataDado === "string" ? value.dataDado : "",
    }];
  }).sort((a, b) => econodataDecisionScore(b) - econodataDecisionScore(a))[0];
};
export async function enrichEconodataDecisionMaker(opportunityId: string) {
  const d = db();
  const opportunity = checked(await d.from("sdr_opportunities").select("*").eq("id", opportunityId).single())!;
  if (["lost", "won", "paid"].includes(opportunity.stage) || opportunity.qualification?.decision_maker?.source === "econodata")
    throw new Error("lead_not_eligible");
  const lead = checked(await d.from("sdr_leads").select("source,cnpj").eq("id", opportunity.lead_id).single())!;
  const campaign = checked(await d.from("sdr_campaigns").select("provider").eq("id", opportunity.campaign_id).single())!;
  const cnpj = String(lead.cnpj || "").replace(/\D/g, "");
  if (lead.source !== "econodata" || campaign.provider !== "econodata" || !/^\d{14}$/.test(cnpj))
    throw new Error("lead_not_eligible");
  const params = new URLSearchParams({ papel: "decisores", pagina: "1", tamanho: "5" });
  const fingerprint = createHash("sha256").update(JSON.stringify({
    action: "econodata_decision_maker", lead: opportunity.lead_id,
    campaign: opportunity.campaign_id, papel: "decisores", pagina: 1, tamanho: 5,
  })).digest("hex");
  const run = checked(await d.rpc("sdr_reserve_run", {
    p_campaign: opportunity.campaign_id, p_units: ECONODATA_DECISION_MAKER_RESERVE, p_fingerprint: fingerprint,
  }));
  let tokensCharged: number | null = null;
  try {
    const result = await api("econodata", `/companies/${cnpj}/people?${params}`);
    const header = result.headers.get("x-tokens-charged");
    const actual = header?.trim() ? Number(header) : NaN;
    tokensCharged = Number.isFinite(actual) && actual >= 0 ? actual : null;
    if (!Array.isArray(result.payload?.itens)) throw new Error("provider_schema_changed");
    const selected = selectEconodataDecisionMaker(result.payload.itens);
    if (!selected) throw new Error("decision_maker_not_found");
    checked(await d.from("sdr_leads").update({
      contact_name: selected.nome,
      evidence: `Decisor selecionado no organograma Econodata. Cargos: ${selected.cargos.join(", ") || "não informados"}. Nível de decisão: ${selected.nivelDecisao || "não informado"}. Próxima etapa: localizar e validar email profissional.`,
    }).eq("id", opportunity.lead_id));
    const { nome: _name, ...attributes } = selected;
    checked(await d.from("sdr_opportunities").update({
      qualification: {
        ...(opportunity.qualification || {}),
        decision_maker: { source: "econodata", ...attributes, selectedAt: new Date().toISOString() },
      },
    }).eq("id", opportunityId));
    checked(await d.from("sdr_runs").update({
      status: "completed", imported: 0, duplicates: 0,
      credits_charged: tokensCharged, finished_at: new Date().toISOString(),
    }).eq("id", run));
    return { message: "Decisor selecionado. Próxima etapa: localizar e validar email profissional." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "operation_failed";
    checked(await d.from("sdr_runs").update({
      status: "failed", imported: 0, duplicates: 0,
      credits_charged: tokensCharged,
      error_code: /^[a-z0-9_]+$/.test(message) ? message : "operation_failed",
      finished_at: new Date().toISOString(),
    }).eq("id", run));
    throw error;
  }
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
      incluir: ["cadastro"],
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
function hunterLookupDomain(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  try {
    const isUrl = /^https?:\/\//i.test(input);
    if (!isUrl && /[\s/:?#@]/.test(input)) return null;
    const url = new URL(isUrl ? input : `https://${input}`);
    if (url.username || url.password || url.port) return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname.length > 253 || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
    const labels = hostname.split(".");
    return labels.length >= 2 && labels.every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ? hostname : null;
  } catch {
    return null;
  }
}
export function buildHunterEmailFinderParams(lead: {
  contact_name: string; domain?: unknown; company_name?: unknown;
}) {
  const full_name = lead.contact_name.trim();
  const domain = hunterLookupDomain(lead.domain);
  if (domain) return new URLSearchParams({ full_name, domain });
  const company = typeof lead.company_name === "string" ? lead.company_name.trim() : "";
  if (!company || /^cnpj\s/i.test(company)) throw new Error("company_identity_required");
  return new URLSearchParams({ full_name, company });
}

export async function findHunterDecisionMakerEmail(opportunityId: string) {
  const d = db();
  const opportunity = checked(await d.from("sdr_opportunities").select("*").eq("id", opportunityId).single())!;
  const lead = checked(await d.from("sdr_leads").select("*").eq("id", opportunity.lead_id).single())!;
  if (lead.source !== "econodata" || !/^\d{14}$/.test(String(lead.cnpj || "").replace(/\D/g, "")) ||
      typeof lead.contact_name !== "string" || !lead.contact_name.trim() ||
      opportunity.qualification?.decision_maker?.source !== "econodata" ||
      ["lost", "won", "paid"].includes(opportunity.stage)) throw new Error("lead_not_eligible");
  if (lead.email) throw new Error("email_already_present");
  const params = buildHunterEmailFinderParams(lead);
  checked(await d.rpc("sdr_reserve_units", { p_provider: "hunter", p_units: 1 }));
  const result = await api("hunter", `/email-finder?${params}`);
  const data = result.payload?.data;
  const email = typeof data?.email === "string" ? data.email.trim() : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    checked(await d.rpc("sdr_release_units", { p_provider: "hunter", p_units: 1 }));
    throw new Error("hunter_email_not_found");
  }
  if (data.verification?.status !== "valid") throw new Error("hunter_email_not_verified");
  checked(await d.from("sdr_leads").update({
    email, email_status: "verified",
    evidence: [lead.evidence, "Email profissional localizado e validado pelo Hunter Email Finder para o decisor selecionado pela Econodata."].filter(Boolean).join(" "),
  }).eq("id", opportunity.lead_id));
  checked(await d.from("sdr_opportunities").update({
    qualification: {
      ...(opportunity.qualification || {}),
      email_enrichment: {
        source: "hunter",
        lookupMethod: params.has("domain") ? "domain" : "company",
        score: typeof data.score === "number" && Number.isFinite(data.score) ? data.score : null,
        position: typeof data.position === "string" ? data.position : null,
        company: typeof data.company === "string" ? data.company : null,
        verificationStatus: "valid", foundAt: new Date().toISOString(),
      },
    },
  }).eq("id", opportunityId));
  return { status: "verified" };
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
