import "server-only";
import { randomBytes } from "node:crypto";
import { db, checked } from "./server";
import { eligibleCommercialBusiness } from "./commercial-classification";
import { businessHostname } from "./catalog";
export const PARTNER_STATUSES = ["prospected", "contacted", "interested", "active", "paused", "closed"] as const;
export async function partnerSnapshot() {
  const d = db();
  const results = await Promise.all([
    d.from("partner_programs").select("id,product,name,link_base_url,status,config").order("name"),
    d.from("partner_memberships").select("*,partner:partners(*),program:partner_programs(name,product,link_base_url),links:partner_links(id,slug,code,status)").order("created_at", { ascending: false }).limit(200),
    d.from("sdr_opportunities").select("id,product,qualification,stage,lead:sdr_leads(id,company_name,domain,cnpj,source)").in("qualification->commercial_classification->>type", ["partner", "customer_or_partner"]).not("stage", "in", "(lost,won,paid)").limit(200),
    d.from("partner_referrals").select("membership_id,status,converted_value_cents").order("referred_at", { ascending: false }).limit(1000),
  ]);
  for (const result of results) {
    if (result.error && !["42P01", "PGRST205"].includes(result.error.code)) checked(result);
  }
  if (results.some(result => result.error && ["42P01", "PGRST205"].includes(result.error.code))) {
    return { available: false, programs: [], memberships: [], candidates: [], referrals: [] };
  }
  return { available: true, programs: checked(results[0]), memberships: checked(results[1]), candidates: (checked(results[2]) || []).filter((o: any) => eligibleCommercialBusiness(o.lead)), referrals: checked(results[3]) };
}
export async function promotePartner(opportunityId: string, programId: unknown, requestedSlug: unknown) {
  if (typeof programId !== "string" || !/^[0-9a-f-]{36}$/i.test(programId)) throw new Error("invalid_program");
  const d = db();
  const o = checked(await d.from("sdr_opportunities").select("lead_id").eq("id", opportunityId).single())!;
  const lead = checked(await d.from("sdr_leads").select("company_name,domain,cnpj,source").eq("id", o.lead_id).single())!;
  if (!eligibleCommercialBusiness(lead)) throw new Error("lead_not_eligible");
  const domain = businessHostname(lead.domain);
  const generated = lead.company_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "parceiro";
  const slug = requestedSlug === undefined || requestedSlug === "" ? `${generated}-${randomBytes(3).toString("hex")}` : requestedSlug;
  if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(slug)) throw new Error("invalid_partner_slug");
  return checked(await d.rpc("partner_promote_opportunity", { p_opportunity: opportunityId, p_program: programId, p_slug: slug,
    p_code: randomBytes(12).toString("hex"), p_domain: domain }));
}
export async function updatePartnerStatus(membershipId: string, status: unknown) {
  if (typeof status !== "string" || !(PARTNER_STATUSES as readonly string[]).includes(status)) throw new Error("invalid_partner_status");
  return checked(await db().rpc("partner_set_membership_status", { p_membership: membershipId, p_status: status }));
}
