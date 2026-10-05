import { db, checked, readToken } from "@/lib/sdr/server";
import { platformAdminJson } from "@/lib/platform-admin-http";
export async function POST(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    const id = readToken(token);
    if (!id) return platformAdminJson({ ok: false }, 400);
    const d = db();
    const o = checked(
      await d.from("sdr_opportunities").select("lead_id").eq("id", id).single(),
    )!;
    checked(
      await d.rpc("sdr_stop", {
        p_lead: o.lead_id,
        p_reason: "unsubscribe",
        p_suppress: true,
      }),
    );
    return platformAdminJson({ ok: true });
  } catch {
    return platformAdminJson({ ok: false }, 400);
  }
}
