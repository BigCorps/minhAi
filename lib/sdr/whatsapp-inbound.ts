import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { variantesTelefoneBusca } from "@/lib/conviteria/gestao-servidor";
import { PRODUCTS, type Product } from "./catalog";

export type CommercialWhatsappContext = {
  opportunityId: string;
  leadId: string;
  product: Product;
  companyName: string;
  contactName: string | null;
};

export function isCommercialWhatsappOptOut(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^(sair|parar|pare|cancelar|stop|remover|não quero|nao quero)(\b|$)/.test(normalized);
}

export async function findCommercialWhatsappContext(
  admin: SupabaseClient,
  fromId: string,
): Promise<CommercialWhatsappContext | null> {
  const variants = variantesTelefoneBusca(fromId);
  if (!variants.length) return null;
  const { data: leads, error: leadError } = await admin
    .from("sdr_leads")
    .select("id,company_name,contact_name,phone,suppressed_at")
    .in("phone", variants)
    .is("suppressed_at", null)
    .limit(20);
  if (leadError || !leads?.length) return null;

  const leadIds = leads.map((lead: any) => lead.id);
  const { data: opportunities, error: opportunityError } = await admin
    .from("sdr_opportunities")
    .select("id,lead_id,product,stage,created_at")
    .in("lead_id", leadIds)
    .in("stage", ["new", "contacted", "replied", "qualified", "meeting", "proposal"])
    .order("created_at", { ascending: false })
    .limit(20);
  if (opportunityError || !opportunities?.length) return null;

  const opportunity = opportunities.find((item: any) => item.product in PRODUCTS);
  if (!opportunity) return null;
  const lead = leads.find((item: any) => item.id === opportunity.lead_id);
  if (!lead) return null;

  return {
    opportunityId: opportunity.id,
    leadId: opportunity.lead_id,
    product: opportunity.product as Product,
    companyName: String(lead.company_name || "empresa").slice(0, 160),
    contactName: lead.contact_name ? String(lead.contact_name).slice(0, 120) : null,
  };
}

export function commercialWhatsappAutoReply(
  context: CommercialWhatsappContext,
  inboundText: string,
) {
  if (isCommercialWhatsappOptOut(inboundText)) {
    return "Tudo certo. Registramos seu pedido e não enviaremos novas mensagens comerciais para este número. — BigCorps";
  }
  const product = PRODUCTS[context.product];
  const greeting = context.contactName ? `Olá, ${context.contactName}!` : "Olá!";
  return `${greeting} Obrigado por responder sobre ${product.name}. Recebemos sua mensagem e nossa equipe comercial continuará o atendimento por aqui. A prospecção automática foi pausada para este contato. — BigCorps`;
}
