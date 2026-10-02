import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers })
}

function base64url(bytes: Uint8Array) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function makePublicToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `chk_${base64url(bytes)}`
}

function amountCents(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const cents = Math.round(n)
  return cents >= 1 && cents <= 999_999_999 ? cents : null
}

function trimText(value: unknown, max: number) {
  const s = String(value ?? '').trim()
  return s ? s.slice(0, max) : null
}

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = JSON.stringify(value)
  if (raw.length > 16_000) throw new Error('metadata_too_large')
  return value as Record<string, unknown>
}

function safeSuccessUrl(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('invalid_success_url') }
  if (url.protocol !== 'https:') throw new Error('invalid_success_url')
  if (url.username || url.password) throw new Error('invalid_success_url')
  return url.toString().slice(0, 2000)
}

function ascii(value: string, max: number, fallback: string) {
  const cleaned = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, max)
  return cleaned || fallback
}

function tlv(id: string, value: string) {
  return `${id}${String(new TextEncoder().encode(value).length).padStart(2, '0')}${value}`
}

function crc16(payload: string) {
  let crc = 0xffff
  for (const b of new TextEncoder().encode(payload)) {
    crc ^= b << 8
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function buildStaticPixCode(args: { key: string; amountCents: number; txid: string; merchantName: string; merchantCity: string }) {
  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', args.key)
  const beforeCrc = tlv('00', '01') + tlv('26', merchantAccount) + tlv('52', '0000') + tlv('53', '986')
    + tlv('54', (args.amountCents / 100).toFixed(2)) + tlv('58', 'BR') + tlv('59', ascii(args.merchantName, 25, 'RECEBEDOR PIX'))
    + tlv('60', ascii(args.merchantCity, 15, 'SAO PAULO')) + tlv('62', tlv('05', args.txid)) + '6304'
  return beforeCrc + crc16(beforeCrc)
}

async function runtime(admin: any) {
  const { data, error } = await admin.from('pixwiki_v2_runtime_config').select('*').eq('id', true).maybeSingle()
  if (error || !data) throw new Error('v2_runtime_not_configured')
  return data
}

async function authUser(admin: any, req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token || token === SERVICE_ROLE) return null
  const { data, error } = await admin.auth.getUser(token)
  return error ? null : data?.user ?? null
}

async function managerCompany(admin: any, userId: string, companyId: string) {
  const { data: company } = await admin.from('companies')
    .select('id,user_id,name,slug,segment_key,is_active')
    .eq('id', companyId).eq('segment_key', 'pix_wiki').eq('is_active', true).maybeSingle()
  if (!company) return null
  if (company.user_id === userId) return company
  const { data: member } = await admin.from('company_admins').select('role')
    .eq('company_id', companyId).eq('user_id', userId).maybeSingle()
  return member && ['owner', 'manager'].includes(String(member.role)) ? company : null
}

async function allowance(admin: any, userId: string, isTest: boolean) {
  if (isTest) return { allowed: true, reason: 'test' }
  const { data, error } = await admin.rpc('pixwiki_v2_automation_allowance', { p_user_id: userId })
  if (error) throw new Error(`allowance_failed:${error.message}`)
  const row = Array.isArray(data) ? data[0] : data
  return row || { allowed: false, reason: 'allowance_unavailable' }
}

function sessionTtlSeconds(raw: unknown, fallback: number) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.max(300, Math.min(604800, Math.floor(n)))
}

async function createSession(admin: any, args: {
  userId: string
  createdByUserId?: string | null
  companyId: string
  origin: 'pix_link' | 'checkout' | 'api'
  amountCents: number
  description?: unknown
  externalId?: unknown
  customerName?: unknown
  customerEmail?: unknown
  customerPhone?: unknown
  metadata?: unknown
  successUrl?: unknown
  apiKeyId?: string | null
  apiIdempotencyKey?: string | null
  isTest?: boolean
  expiresInSeconds?: unknown
}) {
  const config = await runtime(admin)
  const isTest = args.isTest === true
  const allowed = await allowance(admin, args.userId, isTest)
  if (allowed?.allowed !== true) {
    const error: any = new Error(String(allowed?.reason || 'automation_unavailable'))
    error.status = 402
    error.details = allowed
    throw error
  }

  const ttl = sessionTtlSeconds(args.expiresInSeconds, Number(config.default_session_ttl_seconds || 86400))
  const publicToken = makePublicToken()
  const row = {
    public_token: publicToken,
    user_id: args.userId,
    created_by_user_id: args.createdByUserId || args.userId,
    company_id: args.companyId,
    origin: args.origin,
    status: 'created',
    amount_cents: args.amountCents,
    description: trimText(args.description, 255),
    external_id: trimText(args.externalId, 200),
    customer_name: trimText(args.customerName, 160),
    customer_email: trimText(args.customerEmail, 320),
    customer_phone: trimText(args.customerPhone, 40),
    metadata: cleanMetadata(args.metadata),
    success_url: safeSuccessUrl(args.successUrl),
    api_key_id: args.apiKeyId || null,
    api_idempotency_key: args.apiIdempotencyKey || null,
    is_test: isTest,
    expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  }

  const { data, error } = await admin.from('pixwiki_v2_checkout_sessions').insert(row)
    .select('id,public_token,user_id,company_id,origin,status,amount_cents,description,external_id,is_test,expires_at,created_at')
    .single()
  if (error) throw error
  return data
}

function publicSession(row: any) {
  return {
    checkout_id: row.id,
    token: row.public_token,
    origin: row.origin,
    status: row.status,
    amount_cents: Number(row.amount_cents || 0),
    expected_amount_cents: row.expected_amount_cents == null ? null : Number(row.expected_amount_cents),
    discount_cents: Number(row.discount_cents || 0),
    description: row.description || null,
    expires_at: row.expires_at,
    payment_expires_at: row.payment_expires_at || null,
    paid_at: row.paid_at || null,
    success_url: row.status === 'paid' ? row.success_url || null : null,
  }
}

async function sessionByToken(admin: any, token: string) {
  if (!/^chk_[A-Za-z0-9_-]{24,100}$/.test(token)) return null
  const { data } = await admin.from('pixwiki_v2_checkout_sessions').select('*').eq('public_token', token).maybeSingle()
  return data || null
}

async function ensureTransaction(admin: any, session: any, slot: any) {
  if (session.transaction_id) {
    const { data: existing } = await admin.from('pix_transactions')
      .select('id,pix_code,qr_code_url,status,expires_at,amount_cents,original_amount_cents,discount_cents,direct_intent_id')
      .eq('id', session.transaction_id).maybeSingle()
    if (existing) return existing
  }

  if (!slot?.direct_intent_id || !slot?.pix_key || !slot?.txid || !slot?.expected_amount_cents) {
    throw new Error('slot_payload_incomplete')
  }

  const pixCode = buildStaticPixCode({
    key: String(slot.pix_key),
    amountCents: Number(slot.expected_amount_cents),
    txid: String(slot.txid),
    merchantName: String(slot.merchant_name || 'RECEBEDOR PIX'),
    merchantCity: String(slot.merchant_city || 'SAO PAULO'),
  })
  const qrCodeUrl = `https://www.minhai.app/api/qrcode?size=400&data=${encodeURIComponent(pixCode)}&company_id=${encodeURIComponent(session.company_id)}&color=%23059669`
  const origem = session.origin === 'api' ? 'pixwiki_v2_api' : session.origin === 'pix_link' ? 'pixwiki_v2_pix_link' : 'pixwiki_v2_checkout'

  const payload = {
    company_id: session.company_id,
    user_id: session.user_id,
    txid: String(slot.txid),
    pix_code: pixCode,
    qr_code_url: qrCodeUrl,
    amount_cents: Number(slot.expected_amount_cents),
    original_amount_cents: Number(session.amount_cents),
    discount_cents: Number(slot.discount_cents || 0),
    direct_intent_id: String(slot.direct_intent_id),
    destination_pix_key: String(slot.pix_key),
    destination_pix_key_type: slot.pix_key_type || null,
    status: 'pending',
    expires_at: slot.payment_expires_at,
    requested_by_voice: false,
    purpose: 'payment',
    payment_provider: 'pix_direct',
    origem,
    referencia_id: session.id,
    notes: `PixWiki V2 ${session.origin} ${session.id}`,
  }

  let transaction: any = null
  const inserted = await admin.from('pix_transactions').insert(payload)
    .select('id,pix_code,qr_code_url,status,expires_at,amount_cents,original_amount_cents,discount_cents,direct_intent_id')
    .maybeSingle()

  if (inserted.error) {
    const { data: raced } = await admin.from('pix_transactions')
      .select('id,pix_code,qr_code_url,status,expires_at,amount_cents,original_amount_cents,discount_cents,direct_intent_id')
      .eq('direct_intent_id', String(slot.direct_intent_id)).maybeSingle()
    if (!raced) throw inserted.error
    transaction = raced
  } else {
    transaction = inserted.data
  }

  if (!transaction) throw new Error('transaction_create_failed')

  const { error: updateError } = await admin.from('pixwiki_v2_checkout_sessions').update({
    transaction_id: transaction.id,
    status: 'payment_ready',
    updated_at: new Date().toISOString(),
  }).eq('id', session.id).in('status', ['slot_reserved', 'payment_ready'])
  if (updateError) throw updateError

  return transaction
}

async function prepare(admin: any, token: string) {
  const config = await runtime(admin)
  if (config.checkout_public_prepare_enabled !== true) throw new Error('checkout_prepare_disabled')

  let session = await sessionByToken(admin, token)
  if (!session) return json({ error: 'checkout_not_found' }, 404)
  if (session.status === 'paid') return json({ ok: true, ...publicSession(session) })
  if (['cancelled', 'expired', 'failed'].includes(String(session.status))) {
    return json({ ok: false, ...publicSession(session), error: `checkout_${session.status}` }, 410)
  }

  const allowed = await allowance(admin, session.user_id, session.is_test === true)
  if (allowed?.allowed !== true) {
    return json({ ok: false, error: String(allowed?.reason || 'automation_unavailable'), allowance: allowed }, 402)
  }

  const { data, error } = await admin.rpc('pixwiki_v2_acquire_checkout_slot', { p_checkout_id: session.id })
  if (error) {
    const message = String(error.message || '')
    const status = message.includes('mp_connection_required') || message.includes('pix_key_required') ? 409 : 500
    return json({ ok: false, error: message.split(':')[0] || 'slot_acquire_failed' }, status)
  }
  const slot = Array.isArray(data) ? data[0] : data
  if (!slot) return json({ ok: false, error: 'slot_acquire_failed' }, 500)

  if (slot.state === 'queued') {
    return json({
      ok: true,
      status: 'queued',
      checkout_id: session.id,
      queue_position: Number(slot.queue_position || 1),
      retry_after_ms: 1500,
      expires_at: session.expires_at,
    }, 202)
  }

  if (slot.state === 'paid') {
    session = await sessionByToken(admin, token)
    if (!session) return json({ error: 'checkout_not_found' }, 404)
    return json({ ok: true, ...publicSession(session) })
  }

  if (!['slot_reserved', 'payment_ready'].includes(String(slot.state))) {
    return json({ ok: false, error: `checkout_${slot.state}` }, 409)
  }

  session = await sessionByToken(admin, token)
  if (!session) return json({ error: 'checkout_not_found' }, 404)
  const transaction = await ensureTransaction(admin, session, slot)
  session = await sessionByToken(admin, token)

  return json({
    ok: true,
    ...publicSession(session),
    status: session?.status || 'payment_ready',
    pix_code: transaction.pix_code,
    qr_code_url: transaction.qr_code_url,
    payment_expires_at: transaction.expires_at,
  })
}

async function confirm(admin: any, token: string) {
  let session = await sessionByToken(admin, token)
  if (!session) return json({ error: 'checkout_not_found' }, 404)
  if (session.status === 'paid') return json({ ok: true, ...publicSession(session) })
  if (!session.transaction_id) return json({ ok: true, ...publicSession(session), pending: true })

  const { data: acquired, error: throttleError } = await admin.rpc('pixwiki_v2_checkout_reconcile_acquire', {
    p_checkout_id: session.id,
    p_min_interval_ms: 1800,
  })
  if (throttleError) throw throttleError
  if (acquired !== true) return json({ ok: true, ...publicSession(session), pending: true, throttled: true })

  const response = await fetch(`${SUPABASE_URL}/functions/v1/pix-direct-reconcile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify({ transaction_id: session.transaction_id }),
  })
  const result = await response.json().catch(() => ({}))

  if (!response.ok && response.status !== 409) {
    return json({ ok: false, error: result?.error || 'reconcile_failed' }, response.status)
  }
  if (response.status === 409 && result?.error === 'ambiguous_direct_payment') {
    return json({ ok: false, error: 'ambiguous_direct_payment', message: result?.message }, 409)
  }

  session = await sessionByToken(admin, token)
  return json({ ok: true, ...publicSession(session), pending: session?.status !== 'paid' })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const action = String(body.action || '')

    if (action === 'status') {
      const session = await sessionByToken(admin, String(body.token || ''))
      if (!session) return json({ error: 'checkout_not_found' }, 404)
      return json({ ok: true, ...publicSession(session) })
    }

    if (action === 'prepare') return await prepare(admin, String(body.token || ''))
    if (action === 'confirm') return await confirm(admin, String(body.token || ''))

    if (action === 'create_owner') {
      const config = await runtime(admin)
      if (config.checkout_owner_enabled !== true) return json({ error: 'owner_checkout_disabled' }, 403)
      const user = await authUser(admin, req)
      if (!user) return json({ error: 'not_authenticated' }, 401)
      const companyId = String(body.company_id || '')
      const company = await managerCompany(admin, user.id, companyId)
      if (!company) return json({ error: 'company_not_allowed' }, 403)
      const cents = amountCents(body.amount_cents)
      if (!cents) return json({ error: 'invalid_amount' }, 400)
      const origin = body.origin === 'pix_link' ? 'pix_link' : 'checkout'
      const isTest = body.is_test === true
      if (origin === 'pix_link' && config.pix_link_v2_enabled !== true && !isTest) {
        return json({ error: 'pix_link_v2_not_enabled' }, 403)
      }
      const session = await createSession(admin, {
        userId: company.user_id,
        createdByUserId: user.id,
        companyId,
        origin,
        amountCents: cents,
        description: body.description,
        externalId: body.external_id,
        customerName: body.customer_name,
        customerEmail: body.customer_email,
        customerPhone: body.customer_phone,
        metadata: body.metadata,
        successUrl: body.success_url,
        isTest,
        expiresInSeconds: body.expires_in_seconds,
      })
      return json({ ok: true, checkout: publicSession(session), checkout_url: `https://pix.wiki/c/${session.public_token}` }, 201)
    }

    if (action === 'create_link') {
      const config = await runtime(admin)
      if (config.pix_link_v2_enabled !== true) return json({ error: 'pix_link_v2_not_enabled' }, 404)
      const slug = String(body.slug || '').trim().toLowerCase()
      const cents = amountCents(body.amount_cents)
      if (!slug || !cents) return json({ error: 'invalid_request' }, 400)
      const { data: company } = await admin.from('companies')
        .select('id,user_id,name,slug').eq('slug', slug).eq('segment_key', 'pix_wiki').eq('is_active', true).maybeSingle()
      if (!company) return json({ error: 'company_not_found' }, 404)
      const session = await createSession(admin, {
        userId: company.user_id,
        createdByUserId: company.user_id,
        companyId: company.id,
        origin: 'pix_link',
        amountCents: cents,
        description: body.description || `Pix Link - ${company.name}`,
        externalId: body.external_id,
        metadata: body.metadata,
        expiresInSeconds: body.expires_in_seconds,
      })
      return json({ ok: true, checkout: publicSession(session), checkout_url: `https://pix.wiki/c/${session.public_token}` }, 201)
    }

    if (action === 'cancel_owner') {
      const user = await authUser(admin, req)
      if (!user) return json({ error: 'not_authenticated' }, 401)
      const id = String(body.checkout_id || '')
      const { data: session } = await admin.from('pixwiki_v2_checkout_sessions').select('id,company_id').eq('id', id).maybeSingle()
      if (!session) return json({ error: 'checkout_not_found' }, 404)
      if (!(await managerCompany(admin, user.id, session.company_id))) return json({ error: 'company_not_allowed' }, 403)
      const { data, error } = await admin.rpc('pixwiki_v2_cancel_checkout', { p_checkout_id: id, p_user_id: null })
      if (error) throw error
      return json({ ok: data === true })
    }

    return json({ error: 'invalid_action' }, 400)
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'internal_error'
    const status = Number(error?.status || 0) || (message.includes('metadata_') || message.includes('success_url') ? 400 : 500)
    console.error('[pixwiki-v2-checkout]', message)
    return json({ error: message, details: error?.details || undefined }, status)
  }
})
