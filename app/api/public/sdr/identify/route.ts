import { createClient } from "@/lib/supabase-server";
import { db, checked, readToken, body } from "@/lib/sdr/server";
import { platformAdminJson } from "@/lib/platform-admin-http";
export async function POST(req: Request) {
  if (new URL(req.url).origin !== req.headers.get("origin"))
    return platformAdminJson({ ok: false }, 403);
  try {
    const input = await body(req),
      id = readToken(String(input.token || ""));
    if (!id) return platformAdminJson({ ok: false }, 400);
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user) return platformAdminJson({ ok: false }, 401);
    const d = db(),
      o = checked(
        await d
          .from("sdr_opportunities")
          .select("id,lead_id,user_id")
          .eq("id", id)
          .single(),
      )!;
    const l = checked(
      await d.from("sdr_leads").select("email").eq("id", o.lead_id).single(),
    )!;
    // A forwarded link cannot claim another person's purchase. Account email must match the lead.
    if (
      !user.email_confirmed_at ||
      !l.email ||
      user.email?.toLowerCase() !== l.email.toLowerCase()
    )
      return platformAdminJson({ ok: false }, 403);
    if (!o.user_id)
      checked(
        await d
          .from("sdr_opportunities")
          .update({ user_id: user.id, linked_at: new Date().toISOString() })
          .eq("id", id)
          .is("user_id", null),
      );
    return platformAdminJson({ ok: true });
  } catch {
    return platformAdminJson({ ok: false }, 400);
  }
}
