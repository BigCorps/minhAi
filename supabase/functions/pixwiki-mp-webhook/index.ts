import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MP_CLIENT_ID = Deno.env.get('ML_APP_ID')!
const MP_CLIENT_SECRET = Deno.env.get('ML_APP_SECRET')!
const headers = { 'Content-Type': 'application/json' }

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers }) }
function cents(value: unknown): number | null { const n = typeof value === 'number' ? value : Number(value); return Number.isFinite(n) ? Math.round(n * 100) : null }
function safeText(value: unknown): string | null { if (value === null || value === undefined) return null; const text = String(value).trim(); return text || null }
function payerBank(payment: any): string | null { const bank = payment?.point_of_interaction?.transaction_data?.bank_info?.payer; return safeText(bank?.long_name ?? bank?.name ?? bank?.institution_name) }
function minimalMetadata(payment: any) { return { collector_id: payment?.collector_id ?? null, bank_transfer_id: payment?.point_of_interaction?.transaction_data?.bank_transfer_id ?? payment?.transaction_details?.bank_transfer_id ?? null, money_release_status: payment?.money_release_status ?? null, status_detail: payment?.status_detail ?? null, live_mode: payment?.live_mode ?? null, total_paid_amount: payment?.transaction_details?.total_paid_amount ?? null, net_received_amount: payment?.transaction_details?.net_received_amount ?? null } }

async function validToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 5 * 60 * 1000) return connection.access_token
  if (!connection.refresh_token || !MP_CLIENT_ID || !MP_CLIENT_SECRET) {
    if (connection.access_token) return connection.access_token
    throw new Error('mp_token_unavailable')
  }
  const response = await fetch('https://api.mercadopago.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: MP_CLIENT_ID, client_secret: MP_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: connection.refresh_token }) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.access_token) throw new Error('mp_refresh_failed')
  const update = { access_token: data.access_token, refresh_token: data.refresh_token ?? connection.refresh_token, expires_at: new Date(Date.now() + Number(data.expires_in ?? 15552000) * 1000).toISOString(), granted_scope: data.scope ?? connection.granted_scope ?? null, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('pixwiki_mp_connections').update(update).eq('id', connection.id)
  if (error) throw new Error('mp_refresh_persist_failed')
  if (connection.legacy_connection_id) await supabase.from('mp_connections').update(update).eq('id', connection.legacy_connection_id)
  return String(data.access_token)
}

function parseSignature(value: string | null) {
  const parts = new Map<string, string>()
  for (const item of String(value || '').split(',')) { const [key, ...rest] = item.trim().split('='); if (key && rest.length) parts.set(key, rest.join('=')) }
  return { ts: parts.get('ts') || '', v1: parts.get('v1') || '' }
}
async function hmacHex(secret: string, message: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
function secureEqual(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0 }
async function validateSignatureIfConfigured(supabase: any, req: Request, dataId: string) {
  const { data: secretRow } = await supabase.from('pixwiki_internal_secrets').select('secret').eq('key', 'mp_webhook_secret').maybeSingle()
  const secret = String(secretRow?.secret || '').trim()
  if (!secret) return true
  const xRequestId = String(req.headers.get('x-request-id') || '').trim()
  const parsed = parseSignature(req.headers.get('x-signature'))
  if (!parsed.ts || !parsed.v1) return false
  const pieces: string[] = []
  if (dataId) pieces.push(`id:${dataId};`)
  if (xRequestId) pieces.push(`request-id:${xRequestId};`)
  pieces.push(`ts:${parsed.ts};`)
  const expected = await hmacHex(secret, pieces.join(''))
  return secureEqual(expected, parsed.v1)
}

async function notifyReceipt(supabase: any, receiptId: string) {
  try {
    const { data: secretRow } = await supabase.from('pixwiki_internal_secrets').select('secret').eq('key', 'notify_internal').maybeSingle()
    if (!secretRow?.secret) return
    await fetch(`${SUPABASE_URL}/functions/v1/pixwiki-notify`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-pixwiki-internal-key': String(secretRow.secret) }, body: JSON.stringify({ receipt_id: receiptId }) })
  } catch (error) { console.warn('[pixwiki-mp-webhook] notify:', error instanceof Error ? error.message : error) }
}

async function markWebhook(supabase: any, connection: any, paymentId: string, handled: boolean, reason: string | null) {
  await supabase.from('pixwiki_fast_watch_state').upsert({
    company_id: connection.company_id,
    user_id: connection.user_id,
    last_webhook_at: new Date().toISOString(),
    last_webhook_payment_id: paymentId || null,
    last_webhook_handled: handled,
    last_webhook_reason: reason,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' })
}

async function normalizePayment(supabase: any, connection: any, payment: any) {
  if (payment?.status !== 'approved' || payment?.payment_method_id !== 'pix') return { handled: false, reason: 'not_approved_pix' }
  const mpPaymentId = String(payment.id || '')
  const amountCents = cents(payment.transaction_amount)
  if (!mpPaymentId || !amountCents || amountCents <= 0) return { handled: false, reason: 'invalid_payment' }
  const collectorId = safeText(payment.collector_id)
  if (collectorId && connection.mp_user_id && collectorId !== String(connection.mp_user_id)) return { handled: false, reason: 'collector_mismatch' }

  const { data: providerLink } = await supabase.from('pix_transactions').select('id').eq('company_id', connection.company_id).eq('txid', mpPaymentId).limit(1).maybeSingle()
  let source = providerLink?.id ? 'pixwiki_link' : 'pix_key'
  const netCents = cents(payment?.transaction_details?.net_received_amount)
  const feeFromDetails = Array.isArray(payment?.fee_details) ? payment.fee_details.reduce((sum: number, fee: any) => sum + (cents(fee?.amount) ?? 0), 0) : null
  const inferredFee = netCents !== null ? Math.max(0, amountCents - netCents) : 0
  const feeCents = feeFromDetails !== null && feeFromDetails > 0 ? feeFromDetails : inferredFee
  const finalNet = netCents ?? Math.max(0, amountCents - feeCents)

  const { data: previous } = await supabase.from('mp_received_payments').select('id,notification_eligible,notified_at').eq('mp_payment_id', mpPaymentId).maybeSingle()
  const record: Record<string, unknown> = {
    mp_payment_id: mpPaymentId, user_id: connection.user_id, company_id: connection.company_id, mp_connection_id: connection.id,
    amount_cents: amountCents, net_amount_cents: finalNet, fee_amount_cents: feeCents, currency: safeText(payment.currency_id) ?? 'BRL',
    status: safeText(payment.status) ?? 'approved', payment_method_id: safeText(payment.payment_method_id), payment_type_id: safeText(payment.payment_type_id),
    operation_type: safeText(payment.operation_type), interaction_type: safeText(payment?.point_of_interaction?.type), interaction_subtype: safeText(payment?.point_of_interaction?.sub_type),
    source, payer_bank: payerBank(payment), date_created: payment.date_created ?? null, date_approved: payment.date_approved ?? null, date_last_updated: payment.date_last_updated ?? null,
    provider_metadata: minimalMetadata(payment), updated_at: new Date().toISOString(),
  }
  if (!previous?.id) record.notification_eligible = true
  const { data: saved, error: saveError } = await supabase.from('mp_received_payments').upsert(record, { onConflict: 'mp_payment_id' }).select('id').single()
  if (saveError) throw saveError

  if (source === 'pix_key' && saved?.id) {
    const { data: matchedIntent } = await supabase.from('pix_direct_intents').select('id').eq('matched_receipt_id', saved.id).eq('product', 'pixwiki').limit(1).maybeSingle()
    if (matchedIntent?.id) {
      const { data: directLink } = await supabase.from('pix_transactions').select('id').eq('direct_intent_id', matchedIntent.id).eq('origem', 'pixwiki_link_free').limit(1).maybeSingle()
      if (directLink?.id) {
        source = 'pixwiki_link'
        await supabase.from('mp_received_payments').update({ source, updated_at: new Date().toISOString() }).eq('id', saved.id)
      }
    }
  }

  if (!previous?.id && saved?.id) {
    const task = notifyReceipt(supabase, String(saved.id))
    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(task)
    else void task
  }
  return { handled: true, is_new: !previous?.id, receipt_id: saved?.id || null, source }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ ok: true })
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  try {
    const url = new URL(req.url)
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const type = String(body?.type || url.searchParams.get('type') || '').toLowerCase()
    const dataId = String(url.searchParams.get('data.id') || body?.data?.id || '').trim()
    const mpUserId = String(body?.user_id || '').trim()
    if (type && type !== 'payment') return json({ ok: true, ignored: true, reason: 'unsupported_topic' })
    if (!dataId || !mpUserId) return json({ ok: true, ignored: true, reason: 'missing_payment_identity' })

    const signatureOk = await validateSignatureIfConfigured(supabase, req, dataId)
    if (!signatureOk) return json({ ok: false, error: 'invalid_signature' }, 401)

    const { data: connection, error: connectionError } = await supabase.from('pixwiki_mp_connections')
      .select('id,company_id,user_id,legacy_connection_id,mp_user_id,access_token,refresh_token,expires_at,granted_scope,is_active')
      .eq('mp_user_id', mpUserId).eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (connectionError) throw connectionError
    if (!connection) return json({ ok: true, ignored: true, reason: 'unknown_mp_user' })

    const token = await validToken(supabase, connection)
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    const payment = await paymentResponse.json().catch(() => ({}))
    if (!paymentResponse.ok) {
      await markWebhook(supabase, connection, dataId, false, `payment_lookup_failed:${paymentResponse.status}`)
      return json({ ok: true, deferred: true, reason: 'payment_lookup_failed' })
    }

    const result = await normalizePayment(supabase, connection, payment)
    await markWebhook(supabase, connection, dataId, !!result.handled, result.handled ? null : String(result.reason || 'ignored'))
    return json({ ok: true, payment_id: dataId, ...result })
  } catch (error) {
    console.error('[pixwiki-mp-webhook]', error instanceof Error ? error.message : error)
    return json({ ok: true, deferred: true, reason: 'internal_error' })
  }
})
