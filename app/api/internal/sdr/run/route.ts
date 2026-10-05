import { secretMatches } from "@/lib/sdr/server";
import { runWorker } from "@/lib/sdr/worker";
import { platformAdminJson } from "@/lib/platform-admin-http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: Request) {
  if (
    !secretMatches(
      req.headers.get("authorization")?.replace(/^Bearer /, "") || null,
      "SDR_WORKER_SECRET",
    )
  )
    return platformAdminJson({ ok: false }, 401);
  try {
    return platformAdminJson({ ok: true, data: await runWorker() });
  } catch {
    return platformAdminJson({ ok: false, error: "worker_failed" }, 503);
  }
}
