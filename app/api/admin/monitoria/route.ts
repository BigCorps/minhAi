import { getPlatformAdminAccess } from "@/lib/platform-admin";
import {
  platformAdminAccessError,
  platformAdminJson,
  platformAdminUnavailable,
} from "@/lib/platform-admin-http";
import { monitoriaDirectory } from "@/lib/sdr/monitoria";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);
  const q = new URL(req.url).searchParams;
  const view = q.get("view") || "users";
  const product = q.get("product") || "all";
  const page = Number(q.get("page") || 1);
  if (
    !["users", "billing", "summary"].includes(view) ||
    !["all", "standard", "vip"].includes(product) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000
  ) {
    return platformAdminJson({ ok: false, error: "invalid_filter" }, 400);
  }
  const result = await monitoriaDirectory({
    view: view as "users" | "billing" | "summary",
    product: product as "all" | "standard" | "vip",
    page,
    search: (q.get("search") || "").slice(0, 120),
  });
  if (!result.available)
    return platformAdminUnavailable(result.error || "directory_unavailable");
  return platformAdminJson({ ok: true, data: result.data });
}
