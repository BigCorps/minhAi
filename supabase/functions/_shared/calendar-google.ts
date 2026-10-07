import { isInternalServiceRequest } from './internal-service-auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
export function json(error: string | null, status = 200, data: Record<string, unknown> = {}) { return new Response(JSON.stringify(error ? { success: false, error } : { success: true, ...data }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
export function authorize(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', Allow: 'POST, OPTIONS' } });
  if (req.method !== 'POST') return json('method_not_allowed', 405);
  if (!isInternalServiceRequest(req)) return json('unauthorized', 401);
  if (!SUPABASE_URL) return json('service_unavailable', 503);
  return null;
}
export async function readInput(req: Request, maxBytes = 16384) {
  const reader = req.body?.getReader(); if (!reader) throw Error('invalid_request');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { await reader.cancel(); throw Error('invalid_request'); } chunks.push(value); } } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function adminClient() { return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } }); }
export async function activeCompany(admin: any, companyId: string) {
  const { data, error } = await admin.from('companies').select('id,is_active').eq('id', companyId).maybeSingle();
  return error ? 'service_unavailable' : !data || data.is_active !== true ? 'company_not_found' : null;
}
function ready(account: any) { return typeof account?.access_token === 'string' && !!account.access_token && Date.parse(account.expires_at) > Date.now() + 60000; }
function scopeAllowed(account: any, write: boolean) {
  const scopes = Array.isArray(account.scopes) ? account.scopes : String(account.scopes || account.scope || '').split(/\s+/);
  return (write ? ['calendar', 'calendar.events'] : ['calendar', 'calendar.events', 'calendar.readonly']).some(scope => scopes.includes(scope) || scopes.includes(`https://www.googleapis.com/auth/${scope}`));
}
export async function googleAccount(admin: any, companyId: string, write = false): Promise<{ account?: any; error?: string }> {
  const lookup = () => admin.from('google_accounts').select('*').eq('company_id', companyId).eq('is_active', true).limit(1).maybeSingle();
  let { data: account, error } = await lookup();
  if (error) return { error: 'service_unavailable' }; if (!account) return { error: 'google_account_unavailable' }; if (!scopeAllowed(account, write)) return { error: 'calendar_scope_required' };
  if (!ready(account)) {
    try {
      const refresh = await fetch(`${SUPABASE_URL}/functions/v1/google-refresh-token`, { method: 'POST', headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE, 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: companyId }), signal: AbortSignal.timeout(30000) });
      const result = await refresh.json().catch(() => null); if (!refresh.ok || result?.success !== true) return { error: 'google_reconnect_required' };
      ({ data: account, error } = await lookup()); if (error || !ready(account) || !scopeAllowed(account, write)) return { error: 'google_reconnect_required' };
    } catch { return { error: 'google_reconnect_required' }; }
  }
  return { account };
}
export function accountErrorStatus(error: string) { return error === 'service_unavailable' ? 503 : error === 'google_account_unavailable' ? 404 : 409; }
export function eventUrl(id: string) { return `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`; }
