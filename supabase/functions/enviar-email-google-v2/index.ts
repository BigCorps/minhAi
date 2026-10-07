import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Exclusivamente server-to-server. Deploy futuro requer verify_jwt=false;
// a autorização abaixo compara a credencial inteira, sem aceitar JWTs comuns.
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const EMAIL_TYPES = new Set(['assistant_manual', 'assistant_result', 'manager_assistance', 'funcionaria_cash', 'meta_manual', 'pix', 'pedido', 'manual']);
const FIELDS = new Set(['company_id', 'to', 'subject', 'body', 'email_type', 'attachments']);
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/;
const MAX_REQUEST = 3 * 1024 * 1024;
const MAX_ATTACHMENT = 2 * 1024 * 1024;
const encoder = new TextEncoder();

function json(error: string | null, status = 200) {
  return new Response(JSON.stringify(error ? { success: false, error } : { success: true }), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function email(value: unknown): string | null {
  if (typeof value !== 'string' || CONTROLS.test(value)) return null;
  const text = value.trim();
  const local = text.split('@')[0];
  if (text.length > 254 || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(text) ? text : null;
}

function base64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}
function encodedWords(text: string): string {
  const words: string[] = [];
  let part = '';
  for (const char of text) {
    if (encoder.encode(part + char).length > 42) { words.push(`=?UTF-8?B?${base64(encoder.encode(part))}?=`); part = ''; }
    part += char;
  }
  if (part) words.push(`=?UTF-8?B?${base64(encoder.encode(part))}?=`);
  return words.join('\r\n ');
}
function wrapBase64(text: string): string { return text.match(/.{1,76}/g)?.join('\r\n') || ''; }
function escapeHtml(value: unknown): string {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function safeUrl(value: unknown): string {
  try { const url = new URL(String(value || '')); return ['http:', 'https:'].includes(url.protocol) ? escapeHtml(url.href) : ''; } catch { return ''; }
}
function template(company: any, body: string): string {
  const logo = safeUrl(company.logo_url || company.webapp_logo_url);
  const site = safeUrl(company.website);
  const phone = String(company.whatsapp_number || '').replace(/\D/g, '');
  const content = /<[a-z][\s\S]*>/i.test(body) ? body : escapeHtml(body).replace(/\r?\n/g, '<br>');
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
      <div style="padding:24px;border-bottom:1px solid #e2e8f0">${logo ? `<img src="${logo}" alt="${escapeHtml(company.name)}" style="max-height:64px;max-width:180px"><br>` : ''}<strong>${escapeHtml(company.name || 'minhAi')}</strong></div>
      <div style="padding:28px;line-height:1.6">${content}</div>
      <div style="padding:20px;background:#f8fafc;color:#64748b;font-size:13px">
        ${site ? `<a href="${site}" style="color:#475569">${escapeHtml(company.website)}</a><br>` : ''}
        ${phone ? `<a href="https://wa.me/${phone}" style="color:#475569">WhatsApp</a><br>` : ''}
        ${escapeHtml(company.business_address)}
      </div>
      <div style="padding:16px;text-align:center;font-size:12px;color:#94a3b8">Enviado via <a href="https://minhai.app" style="color:#64748b">minhAi</a> · Tecnologia <a href="https://bigcorps.com.br" style="color:#64748b">BigCorps</a></div>
    </div></body></html>`;
}
function rfcId(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 998 && /^<[^<>\s@\x00-\x1f\x7f]+@[^<>\s@\x00-\x1f\x7f]+>$/.test(value) ? value : null;
}
function scopesAllowSend(account: any): boolean {
  const scopes = Array.isArray(account.scopes) ? account.scopes : String(account.scopes || account.scope || '').split(/\s+/);
  return scopes.includes('https://www.googleapis.com/auth/gmail.send') || scopes.includes('gmail.send');
}
function tokenReady(account: any): boolean {
  return typeof account?.access_token === 'string' && Boolean(account.access_token)
    && new Date(account.expires_at).getTime() > Date.now() + 60_000;
}
async function readInput(req: Request): Promise<any> {
  if (Number(req.headers.get('content-length')) > MAX_REQUEST) throw new Error('payload_too_large');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('invalid_request');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_REQUEST) { await reader.cancel(); throw new Error('payload_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS', 'Cache-Control': 'no-store' } });
  if (req.method !== 'POST') return json('method_not_allowed', 405);
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!SERVICE_ROLE || token !== SERVICE_ROLE) return json('unauthorized', 401);
  if (!SUPABASE_URL) return json('service_unavailable', 503);

  let input;
  try { input = await readInput(req); } catch (error) {
    return json(error instanceof Error && error.message === 'payload_too_large' ? 'payload_too_large' : 'invalid_request', 400);
  }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !FIELDS.has(key))) return json('invalid_request', 400);
  const companyId = typeof input.company_id === 'string' ? input.company_id.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId)) return json('invalid_company_id', 400);
  const to = email(input.to);
  if (!to) return json('invalid_email', 400);
  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  if (!subject || subject.length > 200 || CONTROLS.test(input.subject)) return json('invalid_subject', 400);
  if (typeof input.body !== 'string' || !input.body.trim() || encoder.encode(input.body).length > 50 * 1024) return json('invalid_body', 400);
  if (typeof input.email_type !== 'string' || !EMAIL_TYPES.has(input.email_type)) return json('invalid_email_type', 400);

  let attachment: { filename: string; content: string } | null = null;
  if (input.attachments !== undefined) {
    if (!Array.isArray(input.attachments) || input.attachments.length > 1) return json('invalid_attachments', 400);
    const file = input.attachments[0];
    if (file !== undefined) {
      if (!file || Object.keys(file).some(key => !['filename', 'content', 'encoding', 'contentType'].includes(key))
        || typeof file.filename !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,100}\.png$/i.test(file.filename) || file.filename.includes('..')
        || file.encoding !== 'base64' || file.contentType !== 'image/png' || typeof file.content !== 'string'
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) return json('invalid_attachments', 400);
      let binary;
      try { binary = atob(file.content); } catch { return json('invalid_attachments', 400); }
      const magic = [137, 80, 78, 71, 13, 10, 26, 10];
      if (binary.length <= 8 || binary.length > MAX_ATTACHMENT || magic.some((value, index) => binary.charCodeAt(index) !== value)
        || btoa(binary) !== file.content) return json('invalid_attachments', 400);
      attachment = { filename: file.filename, content: file.content };
    }
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: company, error: companyError } = await admin.from('companies')
      .select('id,is_active,name,logo_url,webapp_logo_url,website,whatsapp_number,business_address').eq('id', companyId).maybeSingle();
    if (companyError) return json('service_unavailable', 503);
    if (!company || company.is_active !== true) return json('company_not_found', 404);
    async function accountLookup() {
      return await admin.from('google_accounts').select('*').eq('company_id', companyId).eq('is_active', true).limit(1).maybeSingle();
    }
    let { data: account, error: accountError } = await accountLookup();
    if (accountError) return json('service_unavailable', 503);
    if (!account) return json('google_account_unavailable', 404);
    if (!scopesAllowSend(account)) return json('gmail_send_scope_required', 409);
    if (!tokenReady(account)) {
      try {
        const refresh = await fetch(`${SUPABASE_URL}/functions/v1/google-refresh-token`, {
          method: 'POST', headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE, 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId }), signal: AbortSignal.timeout(30_000),
        });
        const refreshed = await refresh.json().catch(() => null);
        if (!refresh.ok || refreshed?.success !== true) return json('google_reconnect_required', 409);
        ({ data: account, error: accountError } = await accountLookup());
        if (accountError || !account || !tokenReady(account) || !scopesAllowSend(account)) return json('google_reconnect_required', 409);
      } catch { return json('google_reconnect_required', 409); }
    }
    const from = email(account.email || account.google_email || account.user_email);
    if (!from) return json('google_account_unavailable', 409);

    let thread: any = null;
    if (['pix', 'pedido'].includes(input.email_type)) {
      // Dia comercial brasileiro; sem receber datas/thread IDs do caller.
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const date = ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
      const start = new Date(`${date}T00:00:00-03:00`);
      const { data, error } = await admin.from('email_logs').select('gmail_thread_id,gmail_rfc_message_id')
        .eq('company_id', companyId).eq('to_email', to).eq('email_type', input.email_type)
        .eq('status', 'sent')
        .gte('sent_at', start.toISOString()).lt('sent_at', new Date(start.getTime() + 86400000).toISOString())
        .not('gmail_thread_id', 'is', null).order('sent_at', { ascending: false }).limit(1).maybeSingle();
      if (error) return json('service_unavailable', 503);
      thread = data;
    }
    const threadId = typeof thread?.gmail_thread_id === 'string' && /^[a-z0-9_-]+$/i.test(thread.gmail_thread_id) ? thread.gmail_thread_id : null;
    const previousRfc = threadId ? rfcId(thread?.gmail_rfc_message_id) : null;
    const headers = [
      `From: ${encodedWords(String(company.name || 'minhAi').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').slice(0, 200))} <${from}>`,
      `To: ${to}`, `Subject: ${encodedWords(subject)}`, 'MIME-Version: 1.0',
      ...(previousRfc ? [`In-Reply-To: ${previousRfc}`, `References: ${previousRfc}`] : []),
    ];
    const html64 = wrapBase64(base64(encoder.encode(template(company, input.body))));
    let mime;
    if (attachment) {
      const boundary = `minhai_${crypto.randomUUID()}`;
      mime = [...headers, `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
        `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', html64,
        `--${boundary}`, `Content-Type: image/png; name="${attachment.filename}"`, `Content-Disposition: attachment; filename="${attachment.filename}"`,
        'Content-Transfer-Encoding: base64', '', wrapBase64(attachment.content), `--${boundary}--`, ''].join('\r\n');
    } else {
      mime = [...headers, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', html64, ''].join('\r\n');
    }
    const raw = base64(encoder.encode(mime)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const gmailResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }), signal: AbortSignal.timeout(30_000),
    });
    if (!gmailResp.ok) return json('gmail_send_failed', 502);
    // Depois de confirmação Gmail, nenhuma falha auxiliar deve induzir retry.
    const sentPayload = await gmailResp.json().catch(() => null);
    const sent = sentPayload && typeof sentPayload === 'object' ? sentPayload : {};
    const messageId = typeof sent.id === 'string' ? sent.id : null;
    let realRfc: string | null = null;
    if (messageId) {
      try {
        const metadataResp = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=Message-ID`, {
          headers: { Authorization: `Bearer ${account.access_token}` }, signal: AbortSignal.timeout(10_000),
        });
        if (metadataResp.ok) {
          const metadata = await metadataResp.json();
          realRfc = rfcId(metadata.payload?.headers?.find((header: any) => String(header.name).toLowerCase() === 'message-id')?.value);
        }
      } catch { /* metadata é best-effort; nunca fabricar um RFC Message-ID */ }
    }
    try {
      const { error } = await admin.from('email_logs').insert({
        company_id: companyId, to_email: to, subject, body: input.body, status: 'sent', email_type: input.email_type,
        gmail_message_id: messageId, gmail_thread_id: typeof sent.threadId === 'string' ? sent.threadId : threadId, gmail_rfc_message_id: realRfc,
      });
      if (error) console.warn('[email-v2] email_log_write_failed_after_send');
    } catch { console.warn('[email-v2] email_log_write_failed_after_send'); }
    return json(null);
  } catch { return json('service_unavailable', 503); }
});
