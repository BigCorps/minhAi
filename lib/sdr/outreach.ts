import { businessHostname } from "./catalog";
import { eligibleCommercialBusiness } from "./commercial-classification";

export type MessageVariant = "customer" | "partner";
export function safeEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
}
export function contactSource(value: unknown): string | null {
  try {
    const u = new URL(String(value));
    if (u.protocol !== "https:" || u.username || u.password || u.port || !businessHostname(u.hostname)) return null;
    return u.href;
  } catch { return null; }
}
export function messageVariant(type: unknown, selected?: unknown): MessageVariant {
  if (type === "low_priority") throw new Error("low_priority_outreach_blocked");
  if (type === "customer" || type === "partner") {
    if (selected && selected !== type) throw new Error("classification_variant_mismatch");
    return type;
  }
  if (type === "customer_or_partner" && (selected === "customer" || selected === "partner")) return selected;
  throw new Error(type === "customer_or_partner" ? "explicit_variant_required" : "commercial_classification_required");
}
export function recipientSnapshot(o: any, l: any, input: any) {
  if (!eligibleCommercialBusiness(l)) throw new Error("business_lead_required");
  if (input.recipient_kind === "individual") {
    if (!safeEmail(l.email) || l.email_status !== "verified") throw new Error("verified_email_required");
    return { recipient_kind: "individual", recipient_address: l.email.toLowerCase(), recipient_source_url: null, recipient_evidence: {} };
  }
  if (input.recipient_kind !== "company_contact") throw new Error("explicit_recipient_required");
  const research = o.qualification?.web_research;
  const address = String(input.recipient_address || "").toLowerCase();
  const contact = (Array.isArray(research?.companyContacts) ? research.companyContacts : []).find((c: any) => c.type === "email" && String(c.value).toLowerCase() === address);
  const source = contactSource(contact?.sourceUrl);
  const domain = businessHostname(l.domain);
  const generic = /^(administrativo|administracao|admin|contato|comercial|info|eventos|vendas|atendimento|recepcao|financeiro|suporte|support|hello|ola|contact|sales|office|reservas|booking|faleconosco|marketing|sac)([._+-][a-z0-9._+-]+)?$/i;
  if (research?.status !== "completed" || !contact || !safeEmail(address) || !domain || address.split("@")[1] !== domain || !generic.test(address.split("@")[0]) || !source || research.conflictingEvidence === true || !Array.isArray(research.sources) || !research.sources.some((s: any) => contactSource(s.url) === source))
    throw new Error("validated_company_contact_required");
  return { recipient_kind: "company_contact", recipient_address: address, recipient_source_url: source,
    recipient_evidence: { validation: "web_research_company_contact", validatorVersion: research.validatorVersion ?? null } };
}
export function followupSnapshot(q: any) {
  return Object.fromEntries(["recipient_kind", "recipient_address", "recipient_source_url", "recipient_evidence", "message_variant", "message_subject", "message_body", "enqueue_mode", "reviewed_by", "reviewed_at"].map(key => [key, q[key]]));
}
