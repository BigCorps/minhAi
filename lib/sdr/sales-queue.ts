import "server-only";

import { checked, db } from "./server";

const OPEN_STAGES = ["new", "contacted", "replied", "qualified", "meeting", "proposal"];
const HIGH_TICKET = new Set(["monitoria_vip", "pixwiki"]);

function priority(o: any) {
  const l = o.lead || {};
  const type = o.qualification?.commercial_classification?.type;
  if (o.stage === "replied") return 100;
  if (o.stage === "qualified") return 92;
  if (o.stage === "meeting") return 88;
  if (o.stage === "proposal") return 84;
  if (l.human_at) return 80;
  if (HIGH_TICKET.has(o.product) && ["new", "contacted"].includes(o.stage)) return 74;
  if (type === "customer_or_partner") return 68;
  if (o.stage === "contacted") return 62;
  return 0;
}

function actionFor(o: any) {
  if (o.stage === "replied") return "Responder e qualificar";
  if (o.stage === "qualified") return "Entrar em contato e avançar";
  if (o.stage === "meeting") return "Realizar reunião";
  if (o.stage === "proposal") return "Acompanhar proposta";
  if (o.lead?.human_at) return "Continuar atendimento humano";
  if (HIGH_TICKET.has(o.product)) return "Revisar oportunidade de alto ticket";
  if (o.qualification?.commercial_classification?.type === "customer_or_partner")
    return "Definir abordagem e assumir";
  return "Revisar contato";
}

export async function sellerQueueSnapshot() {
  const d = db();
  const rows = checked(
    await d
      .from("sdr_opportunities")
      .select("*,lead:sdr_leads(*)")
      .in("stage", OPEN_STAGES)
      .order("created_at", { ascending: false })
      .limit(250),
  ) || [];

  const ranked = rows
    .filter((o: any) => !o.lead?.suppressed_at)
    .map((o: any) => ({
      ...o,
      sales_priority: priority(o),
      recommended_action: actionFor(o),
    }))
    .filter((o: any) => o.sales_priority > 0)
    .sort((a: any, b: any) =>
      b.sales_priority - a.sales_priority
      || new Date(b.lead?.last_inbound_at || b.lead?.last_contact_at || b.created_at).getTime()
       - new Date(a.lead?.last_inbound_at || a.lead?.last_contact_at || a.created_at).getTime()
    )
    .slice(0, 100);

  const ids = ranked.map((o: any) => o.id);
  let recentQueue: any[] = [];
  if (ids.length) {
    recentQueue = checked(
      await d
        .from("sdr_queue")
        .select("opportunity_id,channel,status,sent_at,error_code,recipient_address,created_at")
        .in("opportunity_id", ids)
        .order("created_at", { ascending: false }),
    ) || [];
  }
  const queueByOpportunity = new Map<string, any>();
  for (const q of recentQueue) if (!queueByOpportunity.has(q.opportunity_id)) queueByOpportunity.set(q.opportunity_id, q);

  return ranked.map((o: any) => ({
    ...o,
    last_outreach: queueByOpportunity.get(o.id) || null,
  }));
}
