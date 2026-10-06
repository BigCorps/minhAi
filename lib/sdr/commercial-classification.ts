import { PRODUCTS, isProduct, businessHostname, type Product } from "./catalog";

export const COMMERCIAL_TYPES = ["customer", "partner", "customer_or_partner", "low_priority"] as const;
export type CommercialType = (typeof COMMERCIAL_TYPES)[number];
export const COMMERCIAL_LABELS: Record<CommercialType, string> = {
  customer: "Cliente", partner: "Parceiro", customer_or_partner: "Cliente ou Parceiro", low_priority: "Baixa prioridade",
};
export const COMMERCIAL_ROUTES = {
  customer: "customer_outreach", partner: "partner_outreach", customer_or_partner: "customer_or_partner_review", low_priority: "low_priority",
} as const;
export const COMMERCIAL_ROUTE_LABELS = {
  customer_outreach: "Cliente", partner_outreach: "Parceria", customer_or_partner_review: "Revisar cliente ou parceria", low_priority: "Baixa prioridade",
} as const;
export type CommercialClassification = {
  type: CommercialType; confidence: number; reasons: string[]; recommendedRoute: string; classifiedAt: string;
  source: "automatic" | "manual"; rulesVersion: number;
};
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function isCommercialType(value: unknown): value is CommercialType {
  return typeof value === "string" && COMMERCIAL_TYPES.includes(value as CommercialType);
}
export function eligibleCommercialBusiness(lead: Record<string, any>) {
  return !!(typeof lead.company_name === "string" && lead.company_name.trim() &&
    (/^\d{14}$/.test(String(lead.cnpj || "").replace(/\D/g, "")) ||
      (["econodata", "hunter", "apollo", "web_research"].includes(lead.source) && businessHostname(lead.domain))) &&
    !/^(pessoa fisica|consumidor|noiva|noivo|casal|perfil pessoal)\b/.test(normalized(lead.company_name)));
}
const contains = (text: string, signal: string) => (` ${text} `).includes(` ${normalized(signal)} `);
function businessEvidence(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  const text = value.slice(0, max);
  if (/ignore|instru[cç]|execute|api.?key|password|segredo|classifi(?:que|car) como/i.test(text)) return "";
  // Names/addresses/phones are never classification features; only business descriptions.
  return normalized(text.replace(/\S+@\S+/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/\d[\d\s()./+\-]{7,}\d/g, " "));
}
export function classifyCommercial(input: {
  product: Product; lead: Record<string, any>; qualification?: Record<string, any>;
}, previous?: CommercialClassification, recalculate = false): CommercialClassification {
  if (!isProduct(input.product)) throw new Error("invalid_product");
  if (!eligibleCommercialBusiness(input.lead)) throw new Error("lead_not_eligible");
  if (!recalculate && previous?.source === "manual" && isCommercialType(previous.type)) return previous;
  const config = PRODUCTS[input.product].commercial;
  // Only business evidence already stored; no person names, titles, sensitive attributes or web snippets.
  const text = [businessEvidence(input.lead.company_name, 160), businessEvidence(input.lead.evidence, 2000),
    businessEvidence(input.qualification?.need, 500)].filter(Boolean).join(" ");
  const excluded = config.exclusionSignals.some(signal => contains(text, signal));
  const customer = excluded ? [] : config.customerProfiles.filter(profile => profile.signals.some(signal => contains(text, signal)));
  const partner = excluded ? [] : config.partnerProfiles.filter(profile => profile.signals.some(signal => contains(text, signal)));
  const type: CommercialType = customer.length && partner.length ? "customer_or_partner" : customer.length ? "customer" : partner.length ? "partner" : "low_priority";
  const reasons = excluded ? ["excluded_business_context"] : [...customer.map(profile => `customer_${profile.code}`), ...partner.map(profile => `partner_${profile.code}`)];
  if (!reasons.length) reasons.push("insufficient_icp_evidence");
  return {
    type, confidence: excluded ? 0.95 : customer.length || partner.length ? Math.min(0.9, 0.65 + 0.05 * (customer.length + partner.length)) : 0.35,
    reasons: reasons.slice(0, 10), recommendedRoute: COMMERCIAL_ROUTES[type], classifiedAt: new Date().toISOString(), source: "automatic", rulesVersion: 1,
  };
}
export function commercialSuggestion(product: unknown, lead: Record<string, any>, qualification: Record<string, any> = {}) {
  if (!isProduct(product) || !eligibleCommercialBusiness(lead)) return null;
  return classifyCommercial({ product, lead, qualification }, qualification.commercial_classification);
}
