import "server-only";
import { db, checked } from "./server";
import { isProduct } from "./catalog";
import { classifyCommercial, eligibleCommercialBusiness, isCommercialType } from "./commercial-classification";

export async function saveCommercialClassification(opportunityId: string, mode: unknown = "automatic", type?: unknown) {
  if (typeof mode !== "string" || !["automatic", "manual", "recalculate"].includes(mode)) throw new Error("invalid_classification_mode");
  const d = db();
  const opportunity = checked(await d.from("sdr_opportunities").select("lead_id,product,qualification").eq("id", opportunityId).single())!;
  const lead = checked(await d.from("sdr_leads").select("company_name,domain,cnpj,source,evidence").eq("id", opportunity.lead_id).single())!;
  if (!isProduct(opportunity.product)) throw new Error("invalid_product");
  if (!eligibleCommercialBusiness(lead)) throw new Error("lead_not_eligible");
  if (mode === "manual" && !isCommercialType(type)) throw new Error("invalid_commercial_type");
  const classification = mode === "manual" ? { type, confidence: 1, reasons: ["manual_override"] } :
    classifyCommercial({ product: opportunity.product, lead, qualification: opportunity.qualification }, undefined, true);
  // The RPC reads the latest qualification under lock; a newer manual override always wins over automatic saves.
  return checked(await d.rpc("sdr_set_commercial_classification", {
    p_opportunity: opportunityId, p_mode: mode, p_classification: classification,
  }));
}
