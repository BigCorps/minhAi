import { PRODUCTS, type Product } from "./catalog";

export type CommercialPlaybook = {
  customerMotion: string;
  partnerMotion: string;
  primaryChannel: "email";
  whatsappPolicy: "after_consent";
  decisionMakerRequired: boolean;
  manualReviewRequired: boolean;
  defaultPilotSize: number;
};

const MANUAL_REVIEW = new Set<Product>(["melhoria"]);
const PARTNER_FIRST = new Set<Product>(["conviteia", "midia", "artefinal", "funcionaria"]);
const HIGH_TICKET = new Set<Product>(["pixwiki", "monitoria_vip"]);

export function commercialPlaybook(product: Product): CommercialPlaybook {
  const p = PRODUCTS[product];
  return {
    customerMotion: `Cliente: ${p.commercial.customerValueProposition}`,
    partnerMotion: `Parceiro: ${p.commercial.partnerValueProposition}`,
    primaryChannel: "email",
    whatsappPolicy: "after_consent",
    decisionMakerRequired: true,
    manualReviewRequired: MANUAL_REVIEW.has(product) || HIGH_TICKET.has(product),
    defaultPilotSize: HIGH_TICKET.has(product) ? 2 : PARTNER_FIRST.has(product) ? 3 : 3,
  };
}

export function allCommercialPlaybooks() {
  return (Object.keys(PRODUCTS) as Product[]).map(product => ({ product, ...commercialPlaybook(product) }));
}
