import { getSupabaseServerKey } from '@/lib/supabase-server-key';
import { internalServiceHeaders } from '@/lib/internal-service-headers';
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cleanUuid, resolveCompanyActor } from '@/lib/orders-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROFILE_TYPES = ['cliente', 'frentista', 'atendente', 'caixa', 'gerente', 'colaborador', 'administrador'];
const ALLOWED_FIELDS = new Set(['company_id', 'subject', 'body', 'profile_tokens']);
const MAX_REQUEST_BYTES = 512 * 1024;
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin !== null) {
    try {
      const parsed = new URL(origin);
      const host = request.headers.get('host') || request.nextUrl.host;
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.host !== host) {
        return json({ ok: false, reason: 'origin_not_allowed' }, 403);
      }
    } catch {
      return json({ ok: false, reason: 'origin_not_allowed' }, 403);
    }
  }

  let input;
  try {
    if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) {
      return json({ ok: false, reason: 'payload_too_large' }, 413);
    }
    const reader = request.body?.getReader();
    if (!reader) return json({ ok: false, reason: 'invalid_request' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_REQUEST_BYTES) {
          await reader.cancel();
          return json({ ok: false, reason: 'payload_too_large' }, 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return json({ ok: false, reason: 'invalid_request' }, 400);
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return json({ ok: false, reason: 'invalid_request' }, 400);
  }
  if (Object.keys(input).some(key => ['to', 'email', 'recipient', 'destination'].includes(key.toLowerCase()))) {
    return json({ ok: false, reason: 'recipient_not_allowed' }, 400);
  }
  if (Object.keys(input).some(key => !ALLOWED_FIELDS.has(key))) {
    return json({ ok: false, reason: 'invalid_request' }, 400);
  }
  const id = typeof input.company_id === 'string' ? cleanUuid(input.company_id) : '';
  if (!id) return json({ ok: false, reason: 'invalid_company_id' }, 400);
  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  if (!subject || subject.length > 200 || CONTROLS.test(input.subject)) {
    return json({ ok: false, reason: 'invalid_subject' }, 400);
  }
  if (typeof input.body !== 'string' || !input.body.trim() || Buffer.byteLength(input.body, 'utf8') > 50 * 1024) {
    return json({ ok: false, reason: 'invalid_body' }, 400);
  }

  try {
    const admin = createAdminClient();
    const { data: company, error: companyError } = await admin.from('companies')
      .select('id,is_active,is_public').eq('id', id).maybeSingle();
    if (companyError) return json({ ok: false, reason: 'email_unavailable' }, 503);
    if (!company || company.is_active !== true) return json({ ok: false, reason: 'company_not_found' }, 404);

    if (company.is_public !== true) {
      const { data: funcionaria, error } = await admin.from('funcionaria_company_settings')
        .select('company_id').eq('company_id', id).maybeSingle();
      if (error) return json({ ok: false, reason: 'email_unavailable' }, 503);
      if (!funcionaria) {
        const profileTokens = Array.isArray(input.profile_tokens)
          ? input.profile_tokens.filter((token: unknown) => typeof token === 'string' && token.length <= 512).slice(0, 12) : [];
        const resolved = await resolveCompanyActor(request, { profile_tokens: profileTokens }, id, PROFILE_TYPES);
        if (!resolved.actor) {
          if (resolved.error?.endsWith('_failed')) return json({ ok: false, reason: 'email_unavailable' }, 503);
          const credentials = Boolean(request.headers.get('authorization') || profileTokens.length);
          return json({ ok: false, reason: credentials ? 'forbidden' : 'unauthorized' }, credentials ? 403 : 401);
        }
      }
    }

    // Schema legado: somente o servidor consulta os campos de conta Google.
    const { data: account, error: accountError } = await admin.from('google_accounts')
      .select('*').eq('company_id', id).eq('is_active', true).limit(1).maybeSingle();
    if (accountError) return json({ ok: false, reason: 'email_unavailable' }, 503);
    const to = [account?.email, account?.google_email, account?.user_email]
      .find(value => typeof value === 'string' && value.trim())?.trim();
    if (!to || to.length > 254 || CONTROLS.test(to) || !/^[^\s<>(),;:"\[\]\\@]+@[^\s<>(),;:"\[\]\\@]+\.[^\s<>(),;:"\[\]\\@]+$/.test(to)) {
      return json({ ok: false, reason: 'google_email_unavailable' }, 409);
    }

    const { count, error: limitError } = await admin.from('email_logs').select('id', { count: 'exact', head: true })
      .eq('company_id', id).eq('email_type', 'assistant_result').eq('status', 'sent')
      .gte('sent_at', new Date(Date.now() - 10 * 60_000).toISOString());
    if (limitError || typeof count !== 'number') return json({ ok: false, reason: 'email_unavailable' }, 503);
    if (count >= 20) return json({ ok: false, reason: 'rate_limited' }, 429);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = getSupabaseServerKey();
    if (!url || !serviceRole) return json({ ok: false, reason: 'email_unavailable' }, 503);
    const response = await fetch(`${url}/functions/v1/enviar-email-google-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...internalServiceHeaders(serviceRole) },
      body: JSON.stringify({ company_id: id, to, subject, body: input.body, email_type: 'assistant_result' }),
      signal: AbortSignal.timeout(40_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) return json({ ok: false, reason: 'email_failed' }, 502);
    return json({ ok: true });
  } catch {
    return json({ ok: false, reason: 'email_failed' }, 502);
  }
}

function methodNotAllowed() {
  return NextResponse.json({ ok: false, reason: 'method_not_allowed' }, {
    status: 405, headers: { 'Cache-Control': 'no-store', Allow: 'POST' },
  });
}

export { methodNotAllowed as GET, methodNotAllowed as HEAD, methodNotAllowed as OPTIONS,
  methodNotAllowed as PUT, methodNotAllowed as PATCH, methodNotAllowed as DELETE };
