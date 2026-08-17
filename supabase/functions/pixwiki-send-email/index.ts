import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!
const headers = { 'Content-Type': 'application/json' }

function money(cents: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(cents ?? 0)) / 100)
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

function base64UrlUtf8(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function authenticateInternal(supabase: any, req: Request) {
  const supplied = req.headers.get('x-pixwiki-internal-key') ?? ''
  const { data } = await supabase.from('pixwiki_internal_secrets').select('secret').eq('key', 'notify_internal').maybeSingle()
  return Boolean(data?.secret && supplied === data.secret)
}

async function validGoogleToken(supabase: any) {
  const { data: account, error } = await supabase.from('system_email_account')
    .select('id,google_email,access_token,refresh_token,expires_at,is_active')
    .eq('is_active', true).limit(1).maybeSingle()
  if (error || !account) throw new Error('Conta Google de sistema não configurada')

  const expires = new Date(account.expires_at).getTime()
  if (Number.isFinite(expires) && expires > Date.now() + 5 * 60 * 1000) {
    return { token: account.access_token, from: account.google_email }
  }
  if (!account.refresh_token || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Não foi possível renovar a conta Google de sistema')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.access_token) throw new Error(`Falha ao renovar Gmail (${response.status})`)

  const { error: updateError } = await supabase.from('system_email_account').update({
    access_token: data.access_token,
    expires_at: new Date(Date.now() + Number(data.expires_in ?? 3600) * 1000).toISOString(),
    last_token_refresh: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', account.id)
  if (updateError) throw new Error('Gmail renovado, mas não foi possível persistir o token')
  return { token: data.access_token, from: account.google_email }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers })
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  try {
    if (!(await authenticateInternal(supabase, req))) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers })
    const body = await req.json().catch(() => ({}))
    const receiptId = String(body?.receipt_id ?? '')
    if (!receiptId) return new Response(JSON.stringify({ error: 'receipt_id_required' }), { status: 400, headers })

    const { data: receipt, error: receiptError } = await supabase.from('mp_received_payments')
      .select('id,company_id,user_id,amount_cents,fee_amount_cents,net_amount_cents,source,date_approved,date_created')
      .eq('id', receiptId).maybeSingle()
    if (receiptError || !receipt) throw new Error('Recebimento PixWiki não encontrado')

    const [{ data: company }, { data: settings }] = await Promise.all([
      supabase.from('companies').select('id,name,logo_url').eq('id', receipt.company_id).maybeSingle(),
      supabase.from('pixwiki_notification_settings').select('notification_email,email_enabled').eq('company_id', receipt.company_id).maybeSingle(),
    ])
    if (!settings?.email_enabled) return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'email_disabled' }), { headers })
    const recipient = String(settings?.notification_email ?? '').trim()
    if (!recipient) return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no_recipient' }), { headers })

    const { token, from } = await validGoogleToken(supabase)
    const companyName = company?.name || 'Seu recebimento'
    const isLink = receipt.source === 'pixwiki_link'
    const sourceLabel = isLink ? 'Pix Link' : 'Chave Pix'
    const approvedAt = receipt.date_approved || receipt.date_created || new Date().toISOString()
    const dateLabel = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(approvedAt))

    const amount = money(receipt.amount_cents)
    const net = money(receipt.net_amount_cents ?? receipt.amount_cents)
    const subject = `Pix recebido: ${net} ✅`

    const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a">
      <div style="max-width:560px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
        <div style="padding:24px 28px;background:#0f172a;color:#ffffff">
          <div style="font-size:13px;opacity:.75;margin-bottom:5px">PixWiki</div>
          <div style="font-size:24px;font-weight:700">Pix recebido ✅</div>
        </div>
        <div style="padding:28px">
          <div style="font-size:38px;font-weight:800;letter-spacing:-1px">${escapeHtml(net)}</div>
          <div style="margin-top:8px;color:#64748b">${escapeHtml(companyName)} · ${escapeHtml(sourceLabel)} · ${escapeHtml(dateLabel)}</div>
          <div style="margin-top:18px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;color:#065f46">
            Valor identificado na sua conta Mercado Pago: <strong>${escapeHtml(net)}</strong>.
          </div>
          ${isLink && receipt.amount_cents !== receipt.net_amount_cents ? `<div style="margin-top:12px;color:#64748b;font-size:13px">Valor original do Pix: ${escapeHtml(amount)}. O valor acima já considera o que efetivamente entrou na conta.</div>` : ''}
          <div style="margin-top:22px;padding-top:18px;border-top:1px solid #e2e8f0;color:#475569;font-size:14px;line-height:1.5">
            O dinheiro foi recebido diretamente na sua conta Mercado Pago.
          </div>
          <a href="https://pix.wiki/dashboard" style="display:inline-block;margin-top:22px;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Abrir PixWiki</a>
        </div>
        <div style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:12px">Notificação automática PixWiki · BigCorps</div>
      </div>
    </body></html>`

    const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`
    const messageHeaders = [
      `To: ${recipient}`,
      ...(from ? [`From: PixWiki <${from}>`] : []),
      `Subject: ${subjectEncoded}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
    ].join('\r\n')
    const raw = `${messageHeaders}\r\n\r\n${html}`

    const gmail = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: base64UrlUtf8(raw) }),
    })
    const result = await gmail.json().catch(() => ({}))
    if (!gmail.ok) throw new Error(`Gmail API falhou (${gmail.status})`)

    return new Response(JSON.stringify({ ok: true, recipient, provider_message_id: result?.id ?? null, thread_id: result?.threadId ?? null }), { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    console.error('[pixwiki-send-email]', message)
    return new Response(JSON.stringify({ ok: false, error: message }), { status: 500, headers })
  }
})
