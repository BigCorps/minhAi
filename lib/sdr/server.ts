import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { getPlatformAdminAccess } from "@/lib/platform-admin";
import {
  platformAdminJson,
  platformAdminAccessError,
} from "@/lib/platform-admin-http";
export const db = () => createAdminClient();
export function checked<T>(r: { data: T; error: unknown }): T {
  if (r.error) {
    const message = (r.error as { message?: string }).message || "";
    throw new Error(
      /^[a-z_]+$/.test(message) ? message : "database_operation_failed",
    );
  }
  return r.data;
}
export function required(name: string) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`configure_${name}`);
  return v;
}
export function origin() {
  const u = new URL(process.env.SDR_PUBLIC_URL || "https://minhai.app");
  if (u.protocol !== "https:" && u.hostname !== "localhost")
    throw new Error("invalid_public_url");
  return u.origin;
}
export function signToken(id: string) {
  const p = Buffer.from(
    JSON.stringify({ id, exp: Math.floor(Date.now() / 1000) + 30 * 86400 }),
  ).toString("base64url");
  return (
    p +
    "." +
    createHmac("sha256", required("SDR_TOKEN_SECRET"))
      .update(p)
      .digest("base64url")
  );
}
export function readToken(token: string) {
  try {
    if (token.length > 512) return null;
    const [p, s] = token.split(".");
    const sig = createHmac("sha256", required("SDR_TOKEN_SECRET"))
      .update(p)
      .digest();
    const provided = Buffer.from(s || "", "base64url");
    if (sig.length !== provided.length || !timingSafeEqual(sig, provided))
      return null;
    const v = JSON.parse(Buffer.from(p, "base64url").toString());
    return typeof v.id === "string" &&
      /^[a-f0-9-]{36}$/.test(v.id) &&
      v.exp > Date.now() / 1000
      ? (v.id as string)
      : null;
  } catch {
    return null;
  }
}
export function secretMatches(actual: string | null, env: string) {
  const expected = process.env[env];
  if (!expected || !actual) return false;
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function adminRequest(
  req: Request,
  action: (actor: string) => Promise<unknown>,
) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);
  if (
    req.method !== "GET" &&
    new URL(req.url).origin !== req.headers.get("origin")
  )
    return platformAdminJson({ ok: false, error: "origin_rejected" }, 403);
  try {
    return platformAdminJson({ ok: true, data: await action(access.user.id) });
  } catch (e) {
    const m = e instanceof Error ? e.message : "operation_failed";
    return platformAdminJson(
      {
        ok: false,
        error: /^[a-z0-9_]+$/.test(m) ? m : "operation_failed",
      },
      400,
    );
  }
}
export async function body(req: Request) {
  const raw = await req.text();
  if (raw.length > 30000) throw new Error("body_too_large");
  return JSON.parse(raw);
}
export async function event(
  actor: string,
  type: string,
  leadId: string | null,
  opportunityId: string | null,
  detail: Record<string, unknown> = {},
) {
  checked(
    await db()
      .from("sdr_events")
      .insert({
        actor,
        event_type: type,
        lead_id: leadId,
        opportunity_id: opportunityId,
        detail,
      }),
  );
}
export async function fetchJson(url: string, init: RequestInit = {}) {
  const r = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`provider_http_${r.status}`);
  const payload = await r.json().catch(() => null);
  if (!payload) throw new Error("provider_invalid_response");
  return { payload, headers: r.headers };
}
