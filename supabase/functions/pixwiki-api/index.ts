import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_VERSION = '2026-10-01'

function responseHeaders(requestId: string) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, idempotency-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Expose-Headers': 'X-Request-Id, X-PixWiki-Version',
    'X-Request-Id': requestId,
    'X-PixWiki-Version': API_VERSION,
    'Cache-Control': 'no-store',
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function base64url(bytes: Uint8Array) {
  let value = ''
  for (const byte of bytes) value += String.fromCharCode(byte)
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function makePublicToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `chk_${base64url(bytes)}`
}

function intParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.floor(parsed))) : fallback
}

function isoDate(raw: string | null, fallback: Date) {
  if (!raw) return fallback.toISOString()
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) throw new Error('invalid_date')
  return date.toISOString()
}

function normalizeAmount(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const cents = Math.round(parsed)
  return cents >= 1 && cents <= 999_999_999 ? cents : null
}

function textValue(value: unknown, max: number) {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, max) : null
}

function metadataValue(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = JSON.stringify(value)
  if (raw.length > 16_000) throw new Error('metadata_too_large')
  return value as Record<string, unknown>
}

function orderItems(value: unknown) {
  if (value == null) return []
  if (!Array.isArray(value)) throw new Error('invalid_items')
  if (value.length > 100) throw new Error('too_many_items')
  return value.map((raw: any, index: number) => {
    const quantity = Math.floor(Number(raw?.quantity ?? 1))
    const price = normalizeAmount(raw?.price ?? raw?.unit_amount_cents ?? raw?.price_cents)
    const description = textValue(raw?.description ?? raw?.name, 240)
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 999 || !price || !description) {
      throw new Error(`invalid_item_${index}`)
    }
    return {
      quantity,
      price,
      description,
      sku: textValue(raw?.sku, 120),
    }
  })
}

function addressValue(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const out = {
    cep: textValue(raw.cep ?? raw.postal_code, 16),
    street: textValue(raw.street, 200),
    neighborhood: textValue(raw.neighborhood, 120),
    city: textValue(raw.city, 120),
    state: textValue(raw.state, 80),
    number: textValue(raw.number, 40),
    complement: textValue(raw.complement, 160),
  }
  return Object.values(out).some(Boolean) ? out : null
}

function successUrl(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('invalid_success_url') }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid_success_url')
  return url.toString().slice(0, 2000)
}

async function authKey(supabase: any, req: Request) {
  const raw = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!raw.startsWith('pw_live_') || raw.length < 24) return null
  const hash = await sha256(raw)
  const { data } = await supabase.from('pixwiki_api_keys')
    .select('id,user_id,name,key_prefix,revoked_at')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .maybeSingle()
  return data || null
}

async function log(supabase: any, key: any, method: string, path: string, status: number, startedAt: number, requestId: string) {
  if (!key?.id) return
  await Promise.all([
    supabase.from('pixwiki_api_request_logs').insert({
      user_id: key.user_id,
      api_key_id: key.id,
      method,
      path: path.slice(0, 500),
      status_code: status,
      duration_ms: Math.max(0, Date.now() - startedAt),
      request_id: requestId,
      api_version: API_VERSION,
    }),
    supabase.from('pixwiki_api_keys').update({
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', key.id),
  ])
}

function checkout(row: any) {
  return {
    id: row.id,
    company_id: row.company_id,
    origin: row.origin,
    status: row.status,
    amount_cents: Number(row.amount_cents || 0),
    expected_amount_cents: row.expected_amount_cents == null ? null : Number(row.expected_amount_cents),
    discount_cents: Number(row.discount_cents || 0),
    description: row.description || null,
    external_id: row.external_id || null,
    order_nsu: row.external_id || null,
    customer: {
      name: row.customer_name || null,
      email: row.customer_email || null,
      phone: row.customer_phone || null,
      phone_number: row.customer_phone || null,
    },
    items: Array.isArray(row.metadata?.items) ? row.metadata.items : [],
    address: row.metadata?.address || null,
    metadata: row.metadata || {},
    success_url: row.success_url || null,
    redirect_url: row.success_url || null,
    checkout_url: `https://pix.wiki/c/${row.public_token}`,
    payment: {
      receipt_id: row.receipt_id || null,
      provider_payment_id: row.provider_payment_id || null,
      pix_txid: row.pix_txid || null,
      payment_expires_at: row.payment_expires_at || null,
      paid_at: row.paid_at || null,
    },
    is_test: row.is_test === true,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function receipt(row: any) {
  return {
    id: row.id,
    company_id: row.company_id,
    mp_payment_id: row.mp_payment_id ?? null,
    amount_cents: Number(row.amount_cents || 0),
    original_amount_cents: Number(row.original_amount_cents ?? row.amount_cents ?? 0),
    discount_cents: Number(row.discount_cents || 0),
    fee_amount_cents: Number(row.fee_amount_cents || 0),
    net_amount_cents: Number(row.net_amount_cents || 0),
    currency: 'BRL',
    status: row.status,
    source: row.source,
    provider: row.provider,
    received_at: row.received_at,
    checkout: row.checkout_id ? {
      id: row.checkout_id,
      external_id: row.external_id || null,
      description: row.description || null,
      customer: {
        name: row.customer_name || null,
        email: row.customer_email || null,
        phone: row.customer_phone || null,
      },
      metadata: row.metadata || {},
      is_test: row.is_test === true,
    } : null,
  }
}

async function companyAllowed(supabase: any, userId: string, companyId: string) {
  const { data } = await supabase.from('companies')
    .select('id,name,slug')
    .eq('id', companyId)
    .eq('user_id', userId)
    .eq('segment_key', 'pix_wiki')
    .eq('is_active', true)
    .maybeSingle()
  return data || null
}

async function automationAllowed(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc('pixwiki_v2_automation_allowance', { p_user_id: userId })
  if (error) throw new Error(`allowance_failed:${error.message}`)
  const row = Array.isArray(data) ? data[0] : data
  return row || { allowed: false, reason: 'allowance_unavailable' }
}

async function createApiCheckout(supabase: any, key: any, req: Request, body: any) {
  const { data: config } = await supabase.from('pixwiki_v2_runtime_config')
    .select('checkout_api_enabled,default_session_ttl_seconds')
    .eq('id', true)
    .maybeSingle()
  if (!config?.checkout_api_enabled) return { status: 403, body: { error: 'checkout_api_disabled' } }

  const idempotency = String(req.headers.get('idempotency-key') || '').trim()
  if (idempotency.length < 8 || idempotency.length > 200) {
    return { status: 400, body: { error: 'idempotency_key_required' } }
  }

  const { data: replay } = await supabase.from('pixwiki_v2_checkout_sessions')
    .select('*')
    .eq('user_id', key.user_id)
    .eq('api_idempotency_key', idempotency)
    .maybeSingle()
  if (replay) return { status: 200, body: { data: checkout(replay), idempotent_replay: true } }

  const companyId = String(body?.company_id || '')
  const company = await companyAllowed(supabase, key.user_id, companyId)
  if (!company) return { status: 403, body: { error: 'company_not_allowed' } }

  const items = orderItems(body?.items)
  const itemsTotal = items.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
  const cents = normalizeAmount(body?.amount_cents) ?? (itemsTotal > 0 ? itemsTotal : null)
  if (!cents) return { status: 400, body: { error: 'invalid_amount' } }
  if (itemsTotal > 0 && Number(cents) !== Number(itemsTotal)) {
    return { status: 400, body: { error: 'items_total_mismatch', expected_amount_cents: itemsTotal } }
  }
  const metadata = metadataValue(body?.metadata)
  if (items.length) metadata.items = items
  const address = addressValue(body?.address)
  if (address) metadata.address = address
  if (JSON.stringify(metadata).length > 16_000) throw new Error('metadata_too_large')

  const isTest = body?.test === true
  if (!isTest) {
    const allowance = await automationAllowed(supabase, key.user_id)
    if (allowance?.allowed !== true) {
      return { status: 402, body: { error: allowance?.reason || 'automation_unavailable', allowance } }
    }
  }

  const ttlRaw = Number(body?.expires_in_seconds)
  const fallbackTtl = Number(config.default_session_ttl_seconds || 86400)
  const ttl = Number.isFinite(ttlRaw) ? Math.max(300, Math.min(604800, Math.floor(ttlRaw))) : fallbackTtl

  const row = {
    public_token: makePublicToken(),
    user_id: key.user_id,
    created_by_user_id: key.user_id,
    company_id: companyId,
    origin: 'api',
    status: 'created',
    amount_cents: cents,
    description: textValue(body?.description ?? body?.comment, 255),
    external_id: textValue(body?.external_id ?? body?.order_nsu ?? body?.order_id, 200),
    customer_name: textValue(body?.customer?.name ?? body?.customer_name, 160),
    customer_email: textValue(body?.customer?.email ?? body?.customer_email, 320),
    customer_phone: textValue(body?.customer?.phone ?? body?.customer?.phone_number ?? body?.customer_phone, 40),
    metadata,
    success_url: successUrl(body?.success_url ?? body?.redirect_url),
    api_key_id: key.id,
    api_idempotency_key: idempotency,
    is_test: isTest,
    expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  }

  const { data, error } = await supabase.from('pixwiki_v2_checkout_sessions').insert(row).select('*').single()
  if (error) {
    if (String(error.code || '') === '23505') {
      const { data: raced } = await supabase.from('pixwiki_v2_checkout_sessions')
        .select('*')
        .eq('user_id', key.user_id)
        .eq('api_idempotency_key', idempotency)
        .maybeSingle()
      if (raced) return { status: 200, body: { data: checkout(raced), idempotent_replay: true } }
    }
    throw error
  }

  return { status: 201, body: { data: checkout(data), idempotent_replay: false } }
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID()
  const headers = responseHeaders(requestId)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  const started = Date.now()
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const url = new URL(req.url)
  let path = url.searchParams.get('resource') || '/'
  if (!path.startsWith('/')) path = `/${path}`
  let key: any = null

  const finish = async (status: number, body: any) => {
    await log(supabase, key, req.method, path, status, started, requestId)
    const payload = body && typeof body === 'object' && !Array.isArray(body)
      ? { ...body, api_version: API_VERSION, request_id: requestId }
      : { data: body, api_version: API_VERSION, request_id: requestId }
    return new Response(JSON.stringify(payload), { status, headers })
  }

  try {
    if (!['GET', 'POST'].includes(req.method)) return await finish(405, { error: 'method_not_allowed' })

    key = await authKey(supabase, req)
    if (!key) return await finish(401, { error: 'invalid_api_key' })

    const minute = new Date(Date.now() - 60_000).toISOString()
    const { count } = await supabase.from('pixwiki_api_request_logs')
      .select('id', { count: 'exact', head: true })
      .eq('api_key_id', key.id)
      .gte('created_at', minute)
    if (Number(count || 0) >= 120) {
      return await finish(429, { error: 'rate_limit_exceeded', retry_after_seconds: 60 })
    }

    if (req.method === 'GET' && path === '/') {
      return await finish(200, {
        name: 'PixWiki API',
        endpoints: [
          'GET /companies',
          'GET /summary',
          'GET /receipts',
          'GET /receipts/:id',
          'GET /checkouts',
          'POST /checkouts',
          'GET /checkouts/:id',
          'POST /checkouts/:id/cancel',
        ],
      })
    }

    if (req.method === 'GET' && path === '/companies') {
      const { data: companies, error } = await supabase.from('companies')
        .select('id,name,slug,logo_url,is_active')
        .eq('user_id', key.user_id)
        .eq('segment_key', 'pix_wiki')
        .order('created_at', { ascending: true })
      if (error) throw error

      const ids = (companies || []).map((company: any) => company.id)
      let connected = new Set<string>()
      if (ids.length) {
        const { data: connections } = await supabase.from('pixwiki_mp_connections')
          .select('company_id')
          .in('company_id', ids)
          .eq('is_active', true)
        connected = new Set((connections || []).map((item: any) => String(item.company_id)))
      }

      return await finish(200, {
        data: (companies || []).map((company: any) => ({
          ...company,
          mp_connected: connected.has(String(company.id)),
        })),
      })
    }

    if (req.method === 'GET' && path === '/summary') {
      const companyId = url.searchParams.get('company_id')
      const source = url.searchParams.get('source') || 'all'
      if (!['all', 'pix_key', 'pix_link', 'checkout', 'api'].includes(source)) {
        return await finish(400, { error: 'invalid_source' })
      }
      if (companyId && !(await companyAllowed(supabase, key.user_id, companyId))) {
        return await finish(403, { error: 'company_not_allowed' })
      }

      const end = new Date()
      const start = new Date(end.getTime() - 30 * 86400000)
      const from = isoDate(url.searchParams.get('from'), start)
      const to = isoDate(url.searchParams.get('to'), end)
      const { data, error } = await supabase.rpc('pixwiki_v2_api_summary_internal', {
        p_user_id: key.user_id,
        p_company_id: companyId || null,
        p_source: source,
        p_start_at: from,
        p_end_at: to,
      })
      if (error) throw error

      return await finish(200, {
        data: data?.[0] || {
          receipt_count: 0,
          gross_cents: 0,
          fee_cents: 0,
          net_cents: 0,
          pix_key_count: 0,
          pix_link_count: 0,
          checkout_count: 0,
          api_count: 0,
        },
        from,
        to,
      })
    }

    if (req.method === 'GET' && path === '/receipts') {
      const companyId = url.searchParams.get('company_id')
      const source = url.searchParams.get('source') || 'all'
      const status = url.searchParams.get('status') || 'all'
      const limit = intParam(url.searchParams.get('limit'), 50, 1, 100)
      const offset = intParam(url.searchParams.get('offset'), 0, 0, 100000)
      if (!['all', 'pix_key', 'pix_link', 'checkout', 'api'].includes(source)) {
        return await finish(400, { error: 'invalid_source' })
      }
      if (!['all', 'approved', 'confirmed'].includes(status)) {
        return await finish(400, { error: 'invalid_status' })
      }
      if (companyId && !(await companyAllowed(supabase, key.user_id, companyId))) {
        return await finish(403, { error: 'company_not_allowed' })
      }

      const end = new Date()
      const start = new Date(end.getTime() - 30 * 86400000)
      const from = isoDate(url.searchParams.get('from'), start)
      const to = isoDate(url.searchParams.get('to'), end)
      const { data, error } = await supabase.rpc('pixwiki_v2_api_receipts_internal', {
        p_user_id: key.user_id,
        p_receipt_id: null,
        p_company_id: companyId || null,
        p_source: source,
        p_status: status,
        p_start_at: from,
        p_end_at: to,
        p_limit: limit,
        p_offset: offset,
      })
      if (error) throw error
      const rows = data || []
      const total = rows.length ? Number(rows[0].total_count || 0) : 0
      return await finish(200, {
        data: rows.map(receipt),
        pagination: { limit, offset, total },
        from,
        to,
      })
    }

    const receiptMatch = path.match(/^\/receipts\/([0-9a-f-]{36})$/i)
    if (req.method === 'GET' && receiptMatch) {
      const { data, error } = await supabase.rpc('pixwiki_v2_api_receipts_internal', {
        p_user_id: key.user_id,
        p_receipt_id: receiptMatch[1],
        p_company_id: null,
        p_source: 'all',
        p_status: 'all',
        p_start_at: '1970-01-01T00:00:00.000Z',
        p_end_at: '2999-12-31T23:59:59.999Z',
        p_limit: 1,
        p_offset: 0,
      })
      if (error) throw error
      if (!data?.length) return await finish(404, { error: 'receipt_not_found' })
      return await finish(200, { data: receipt(data[0]) })
    }

    if (req.method === 'GET' && path === '/checkouts') {
      const companyId = url.searchParams.get('company_id')
      const status = url.searchParams.get('status') || 'all'
      const origin = url.searchParams.get('origin') || 'all'
      const externalId = url.searchParams.get('external_id') || url.searchParams.get('order_nsu')
      const limit = intParam(url.searchParams.get('limit'), 50, 1, 100)
      const offset = intParam(url.searchParams.get('offset'), 0, 0, 100000)
      if (!['all', 'created', 'queued', 'slot_reserved', 'payment_ready', 'paid', 'cancelled', 'expired', 'failed'].includes(status)) {
        return await finish(400, { error: 'invalid_status' })
      }
      if (!['all', 'pix_link', 'checkout', 'api'].includes(origin)) {
        return await finish(400, { error: 'invalid_origin' })
      }
      if (companyId && !(await companyAllowed(supabase, key.user_id, companyId))) {
        return await finish(403, { error: 'company_not_allowed' })
      }

      let query = supabase.from('pixwiki_v2_checkout_sessions')
        .select('*', { count: 'exact' })
        .eq('user_id', key.user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (companyId) query = query.eq('company_id', companyId)
      if (status !== 'all') query = query.eq('status', status)
      if (origin !== 'all') query = query.eq('origin', origin)
      if (externalId) query = query.eq('external_id', externalId.slice(0, 200))

      const { data, error, count: total } = await query
      if (error) throw error
      return await finish(200, {
        data: (data || []).map(checkout),
        pagination: { limit, offset, total: total || 0 },
      })
    }

    if (req.method === 'POST' && path === '/checkouts') {
      const body = await req.json().catch(() => ({}))
      const result = await createApiCheckout(supabase, key, req, body)
      return await finish(result.status, result.body)
    }

    const checkoutMatch = path.match(/^\/checkouts\/([0-9a-f-]{36})$/i)
    if (req.method === 'GET' && checkoutMatch) {
      const { data, error } = await supabase.from('pixwiki_v2_checkout_sessions')
        .select('*')
        .eq('id', checkoutMatch[1])
        .eq('user_id', key.user_id)
        .maybeSingle()
      if (error) throw error
      if (!data) return await finish(404, { error: 'checkout_not_found' })
      return await finish(200, { data: checkout(data) })
    }

    const cancelMatch = path.match(/^\/checkouts\/([0-9a-f-]{36})\/cancel$/i)
    if (req.method === 'POST' && cancelMatch) {
      const { data: session } = await supabase.from('pixwiki_v2_checkout_sessions')
        .select('id,user_id,status')
        .eq('id', cancelMatch[1])
        .eq('user_id', key.user_id)
        .maybeSingle()
      if (!session) return await finish(404, { error: 'checkout_not_found' })

      const { data, error } = await supabase.rpc('pixwiki_v2_cancel_checkout', {
        p_checkout_id: session.id,
        p_user_id: key.user_id,
      })
      if (error) throw error
      return await finish(data === true ? 200 : 409, {
        ok: data === true,
        error: data === true ? undefined : 'checkout_not_cancellable',
      })
    }

    return await finish(404, { error: 'not_found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    console.error('[pixwiki-api]', requestId, message)
    const status = message === 'invalid_date' || message.includes('metadata_') || message.includes('success_url') || message.includes('invalid_item') || message.includes('too_many_items') || message.includes('invalid_items') ? 400 : 500
    return await finish(status, { error: message })
  }
})
