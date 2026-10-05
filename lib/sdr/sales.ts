import "server-only";
import { db, checked, event } from "./server";
import { monitoriaSnapshot } from "./monitoria";
export async function reconcileSales() {
  const d = db();
  const local = checked(await d.rpc("sdr_reconcile_payments"));
  const remote = await monitoriaSnapshot();
  let monitoria = 0;
  if (remote.available) {
    const opportunities = checked(
      await d
        .from("sdr_opportunities")
        .select("id,lead_id,external_ref,created_at")
        .eq("product", "monitoria_vip")
        .not("external_ref", "is", null),
    );
    for (const o of opportunities || []) {
      const contracts = remote.data.contracts.filter(
        (c: any) =>
          c.project_id === o.external_ref &&
          c.paid_at &&
          c.invoice_status === "paid" &&
          c.paid_invoice_cents > 0 &&
          new Date(c.paid_at) >= new Date(o.created_at),
      );
      for (const c of remote.data.contracts.filter(
        (c: any) =>
          c.project_id === o.external_ref &&
          c.invoice_status &&
          c.invoice_status !== "paid",
      )) {
        checked(
          await d
            .from("sdr_payments")
            .delete()
            .eq("event_id", `monitoria:contract:${c.id}`)
            .eq("opportunity_id", o.id),
        );
      }
      for (const c of contracts) {
        checked(
          await d
            .from("sdr_payments")
            .upsert(
              {
                event_id: `monitoria:contract:${c.id}`,
                opportunity_id: o.id,
                amount_cents: c.paid_invoice_cents,
                paid_at: c.paid_at,
                source: "monitoria.vip_contracts",
              },
              { onConflict: "event_id" },
            ),
        );
        if (c.activated_at)
          checked(
            await d
              .from("sdr_opportunities")
              .update({ activated_at: c.activated_at })
              .eq("id", o.id),
          );
        monitoria++;
      }
      if (contracts.length)
        checked(
          await d.rpc("sdr_stop", {
            p_lead: o.lead_id,
            p_reason: "payment_confirmed",
            p_suppress: false,
          }),
        );
    }
  }
  checked(await d.rpc("sdr_refresh_sales"));
  return { local, monitoria, monitoriaAvailable: remote.available };
}
export async function recordActivation(
  id: string,
  evidence: string,
  actor: string,
) {
  if (evidence.trim().length < 20)
    throw new Error("activation_evidence_required");
  const o = checked(
    await db()
      .from("sdr_opportunities")
      .select("id,lead_id,paid_cents")
      .eq("id", id)
      .single(),
  )!;
  if (!o.paid_cents) throw new Error("confirmed_payment_required");
  await event(actor, "activation_verified", o.lead_id, o.id, {
    evidence: evidence.slice(0, 2000),
  });
  checked(
    await db()
      .from("sdr_opportunities")
      .update({ activated_at: new Date().toISOString() })
      .eq("id", id),
  );
  checked(await db().rpc("sdr_refresh_sales"));
}
