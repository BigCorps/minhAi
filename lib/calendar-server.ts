import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { resolveCompanyActor } from '@/lib/orders-server';
import { PUBLIC_PROFILES } from '@/supabase/functions/_shared/calendar-security';
export function calendarJson(value: unknown, status = 200, extra: Record<string, string> = {}) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store', ...extra } }); }
export function fail(reason: string, status = 400) { return calendarJson({ ok: false, reason }, status); }
export function originAllowed(req: Request) {
  const origin = req.headers.get('origin'); if (origin === null) return true;
  try { const parsed = new URL(origin); return ['http:', 'https:'].includes(parsed.protocol) && parsed.host === (req.headers.get('host') || new URL(req.url).host); } catch { return false; }
}
export async function calendarInput(req: Request, allowed: string[]) {
  if (!originAllowed(req)) throw { reason: 'origin_not_allowed', status: 403 };
  const reader = req.body?.getReader(); if (!reader) throw { reason: 'invalid_request', status: 400 };
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 16384) { await reader.cancel(); throw { reason: 'payload_too_large', status: 413 }; } chunks.push(value); } } finally { reader.releaseLock(); }
  let input; try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw { reason: 'invalid_request', status: 400 }; }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) throw { reason: 'invalid_request', status: 400 };
  return input;
}
export function caught(error: any) { return fail(error?.reason || 'calendar_unavailable', error?.status || 503); }
export async function publicCompany(req: Request, input: any, id: string) {
  const admin = createAdminClient();
  const { data: company, error } = await admin.from('companies').select('id,is_active,is_public').eq('id', id).maybeSingle();
  if (error) throw { reason: 'calendar_unavailable', status: 503 };
  if (!company || company.is_active !== true) throw { reason: 'company_not_found', status: 404 };
  if (company.is_public !== true) {
    const { data: settings, error } = await admin.from('funcionaria_company_settings').select('company_id').eq('company_id', id).maybeSingle();
    if (error) throw { reason: 'calendar_unavailable', status: 503 };
    if (!settings) {
      const resolved = await resolveCompanyActor(req, input, id, PUBLIC_PROFILES);
      if (!resolved.actor) throw { reason: 'forbidden', status: resolved.error?.endsWith('_failed') ? 503 : 403 };
    }
  }
  return admin;
}
const SAFE_ERRORS = new Set(['company_not_found', 'google_account_unavailable', 'google_reconnect_required', 'calendar_scope_required', 'calendar_result_limit', 'appointment_not_found', 'invalid_appointment_state', 'slot_unavailable', 'invalid_dates', 'appointment_update_failed', 'calendar_delete_failed', 'calendar_update_failed']);
export async function calendarEdge(name: 'listar-eventos-google-v2' | 'appointment-actions-v2', payload: any) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY, url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) throw { reason: 'calendar_unavailable', status: 503 };
  const response = await fetch(`${url}/functions/v1/${name}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(60000) });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) throw { reason: SAFE_ERRORS.has(result?.error) ? result.error : 'calendar_unavailable', status: [404,409].includes(response.status) ? response.status : 502 };
  return result;
}
// Defesa local complementar. Limita também o tamanho do cache; não é global entre instâncias.
const rates = new Map<string, { count: number; reset: number }>();
export function searchRate(req: Request) {
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').slice(0, 128);
  const now = Date.now();
  for (const [key, value] of rates) if (value.reset <= now) rates.delete(key);
  if (rates.size >= 10000 && !rates.has(ip)) return calendarJson({ ok: false, reason: 'rate_limited' }, 429, { 'Retry-After': '60' });
  const entry = rates.get(ip) || { count: 0, reset: now + 60000 }; entry.count++; rates.set(ip, entry);
  return entry.count > 20 ? calendarJson({ ok: false, reason: 'rate_limited' }, 429, { 'Retry-After': String(Math.max(1, Math.ceil((entry.reset - now) / 1000))) }) : null;
}
export function unsupported() { return calendarJson({ ok: false, reason: 'method_not_allowed' }, 405, { Allow: 'POST' }); }
