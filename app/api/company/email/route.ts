import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cleanUuid, resolveCompanyActor } from '@/lib/orders-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROFILE_TYPES = ['frentista', 'atendente', 'caixa', 'gerente', 'colaborador', 'administrador'];
const MAX_PAYLOAD_BYTES = 3 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  let input;
  try {
    // Limitar o corpo mesmo quando Content-Length não é fornecido pelo cliente.
    if (Number(request.headers.get('content-length')) > MAX_PAYLOAD_BYTES) {
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
        if (size > MAX_PAYLOAD_BYTES) {
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
  const id = typeof input?.company_id === 'string' ? cleanUuid(input.company_id) : '';
  if (!id) return json({ ok: false, reason: 'invalid_company_id' }, 400);
  const to = typeof input?.to === 'string' ? input.to.trim() : '';
  const localPart = to.split('@')[0];
  if (!to || to.length > 254 || CONTROLS.test(input.to)
    || !/^[^\s<>(),;:"\[\]\\@]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(to)
    || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return json({ ok: false, reason: 'invalid_email' }, 400);
  }
  const subject = typeof input?.subject === 'string' ? input.subject.trim() : '';
  if (!subject || subject.length > 200 || CONTROLS.test(input.subject)) {
    return json({ ok: false, reason: 'invalid_subject' }, 400);
  }
  if (typeof input?.body !== 'string' || !input.body.trim() || Buffer.byteLength(input.body, 'utf8') > 50 * 1024) {
    return json({ ok: false, reason: 'invalid_body' }, 400);
  }

  let attachments: Array<{ filename: string; content: string; encoding: string; contentType: string }> | undefined;
  if (input.attachments !== undefined) {
    if (!Array.isArray(input.attachments) || input.attachments.length > 1) {
      return json({ ok: false, reason: 'invalid_attachments' }, 400);
    }
    attachments = [];
    for (const attachment of input.attachments) {
      if (typeof attachment?.content !== 'string' || typeof attachment?.filename !== 'string'
        || !/^(?:qrcode|barcode_[a-z0-9_-]{1,32})\.png$/i.test(attachment.filename)
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(attachment.content)) {
        return json({ ok: false, reason: 'invalid_attachments' }, 400);
      }
      const bytes = Buffer.from(attachment.content, 'base64');
      if (bytes.length <= PNG_SIGNATURE.length || bytes.length > MAX_ATTACHMENT_BYTES
        || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
        return json({ ok: false, reason: 'invalid_attachments' }, 400);
      }
      attachments.push({
        filename: attachment.filename, content: bytes.toString('base64'), encoding: 'base64', contentType: 'image/png',
      });
    }
  }

  try {
    const profileTokens = Array.isArray(input.profile_tokens)
      ? input.profile_tokens.filter((token: unknown) => typeof token === 'string' && token.length <= 512).slice(0, 12) : [];
    const resolved = await resolveCompanyActor(request, { profile_tokens: profileTokens }, id, PROFILE_TYPES);
    if (!resolved.actor) {
      if (resolved.error === 'company_not_found') return json({ ok: false, reason: 'company_not_found' }, 404);
      if (resolved.error?.endsWith('_failed')) return json({ ok: false, reason: 'email_unavailable' }, 503);
      const hasCredentials = Boolean(request.headers.get('authorization') || profileTokens.length);
      return json({ ok: false, reason: hasCredentials ? 'forbidden' : 'unauthorized' }, hasCredentials ? 403 : 401);
    }

    const admin = createAdminClient();
    const { count, error } = await admin.from('email_logs').select('id', { count: 'exact', head: true })
      .eq('company_id', id).eq('email_type', 'assistant_manual').eq('status', 'sent')
      .gte('sent_at', new Date(Date.now() - 10 * 60_000).toISOString());
    if (error || typeof count !== 'number') return json({ ok: false, reason: 'email_unavailable' }, 503);
    if (count >= 20) return json({ ok: false, reason: 'rate_limited' }, 429);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) return json({ ok: false, reason: 'email_unavailable' }, 503);
    const response = await fetch(`${url}/functions/v1/enviar-email-google-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRole}` },
      body: JSON.stringify({
        company_id: id, to, subject, body: input.body,
        ...(attachments?.length ? { attachments } : {}), email_type: 'assistant_manual',
      }),
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
