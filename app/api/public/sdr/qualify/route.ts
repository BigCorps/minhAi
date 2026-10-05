import { db, checked, readToken, body, event } from "@/lib/sdr/server";
import { qualificationScore } from "@/lib/sdr/catalog";
import { platformAdminJson } from "@/lib/platform-admin-http";
export async function POST(req: Request) {
  if (new URL(req.url).origin !== req.headers.get("origin"))
    return platformAdminJson({ ok: false }, 403);
  try {
    const input = await body(req);
    const id = readToken(String(input.token || ""));
    if (!id) return platformAdminJson({ ok: false }, 400);
    const q = {
      need: String(input.need || "").slice(0, 1000),
      scale: String(input.scale || "").slice(0, 200),
      authority: ["yes", "no"].includes(input.authority)
        ? input.authority
        : "no",
      timing: ["now", "30days", "later"].includes(input.timing)
        ? input.timing
        : "later",
    };
    if (q.need.trim().length < 8) throw new Error("need_required");
    const d = db();
    const o = checked(
      await d.from("sdr_opportunities").select("*").eq("id", id).single(),
    )!;
    const l = checked(
      await d
        .from("sdr_leads")
        .select("suppressed_at,phone")
        .eq("id", o.lead_id)
        .single(),
    )!;
    if (l.suppressed_at) return platformAdminJson({ ok: false }, 409);
    checked(
      await d
        .from("sdr_opportunities")
        .update({
          qualification: q,
          score: qualificationScore(q),
          ...(["new", "contacted", "replied", "qualified"].includes(o.stage)
            ? { stage: "qualified" }
            : {}),
        })
        .eq("id", id),
    );
    if (input.whatsapp === true && l.phone) {
      checked(
        await d
          .from("sdr_consents")
          .insert({
            lead_id: o.lead_id,
            channel: "whatsapp",
            address: l.phone,
            product: o.product,
            evidence:
              "Checkbox explícito na página comercial autenticada por link individual; texto versão sdr-v1",
          }),
      );
    }
    checked(
      await d.rpc("sdr_stop", {
        p_lead: o.lead_id,
        p_reason: "qualification_received",
        p_suppress: false,
      }),
    );
    await event("lead", "qualified", o.lead_id, o.id, {
      score: qualificationScore(q),
    });
    return platformAdminJson({ ok: true });
  } catch {
    return platformAdminJson({ ok: false, error: "qualification_failed" }, 400);
  }
}
