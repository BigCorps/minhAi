import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_VERSION = '2026-10-01'
const jsonHeaders = { 'Content-Type': 'application/json', 'X-PixWiki-Version': API_VERSION }
const retryMinutes: Record<number, number> = { 1: 1, 2: 5, 3: 30, 4: 120 }

async function internalSecret(supabase: any) {
  const { data } = await supabase.from('pixwiki_internal_secrets')
    .select('secret')
    .eq('key', 'webhook_internal')
    .maybeSingle()
  return data?.secret ? String(data.secret) : ''
}

async function authenticate(supabase: any, req: Request) {
  const expected = await internalSecret(supabase)
  return !!expected && req.headers.get('x-pixwiki-internal-key') === expected
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function privateIp(host: string) {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!match) return false
  const a = Number(match[1]), b = Number(match[2])
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
}

function safeUrl(raw: string) {
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('invalid_webhook_url') }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('invalid_webhook_url')
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:') || privateIp(host)) {
    throw new Error('private_webhook_host_not_allowed')
  }
  return url.toString()
}

async function activeHooks(supabase: any, userId: string, companyId: string) {
  const { data, error } = await supabase.from('pixwiki_webhooks')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .contains('event_types', ['pix.received'])
    .or(`company_id.is.null,company_id.eq.${companyId}`)
  if (error) throw error
  return data || []
}

async function checkoutContext(supabase: any, receipt: any) {
  const { data: byReceipt } = await supabase.from('pixwiki_v2_checkout_sessions')
    .select('id,public_token,user_id,company_id,origin,status,amount_cents,expected_amount_cents,discount_cents,description,external_id,customer_name,customer_email,customer_phone,metadata,is_test,receipt_id,provider_payment_id,paid_at,created_at')
    .eq('company_id', receipt.company_id)
    .eq('receipt_id', receipt.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (byReceipt) return byReceipt

  if (receipt.mp_payment_id) {
    const { data: byProvider } = await supabase.from('pixwiki_v2_checkout_sessions')
      .select('id,public_token,user_id,company_id,origin,status,amount_cents,expected_amount_cents,discount_cents,description,external_id,customer_name,customer_email,customer_phone,metadata,is_test,receipt_id,provider_payment_id,paid_at,created_at')
      .eq('company_id', receipt.company_id)
      .eq('provider_payment_id', String(receipt.mp_payment_id))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (byProvider) return byProvider
  }

  return null
}

async function ensureUsage(supabase: any, receipt: any, session: any, origin: string) {
  if (session) {
    const { error } = await supabase.rpc('pixwiki_v2_record_usage', {
      p_user_id: session.user_id,
      p_company_id: session.company_id,
      p_receipt_id: receipt.id,
      p_origin: origin,
      p_idempotency_key: `pixwiki:v2:checkout:${session.id}`,
      p_units: 1,
      p_convenience_credit_cents: Number(session.discount_cents || 0),
      p_is_test: session.is_test === true,
      p_occurred_at: session.paid_at || receipt.date_approved || receipt.date_created || new Date().toISOString(),
      p_metadata: {
        checkout_id: session.id,
        external_id: session.external_id || null,
        origin,
        source: 'webhook_dispatch',
      },
    })
    if (error) throw new Error(`usage_record_failed:${error.message}`)
    return { allowed: true, charged: session.is_test !== true }
  }

  // Se outro canal V2 já cobrou este receipt, Webhook entra no mesmo uso.
  const { data: existing } = await supabase.from('pixwiki_v2_usage_events')
    .select('id')
    .eq('receipt_id', receipt.id)
    .eq('is_test', false)
    .limit(1)
    .maybeSingle()
  if (existing) return { allowed: true, charged: false }

  const { data: allowanceData, error: allowanceError } = await supabase.rpc('pixwiki_v2_automation_allowance', { p_user_id: receipt.user_id })
  if (allowanceError) throw new Error(`allowance_failed:${allowanceError.message}`)
  const allowance = Array.isArray(allowanceData) ? allowanceData[0] : allowanceData
  if (allowance?.allowed !== true) {
    return { allowed: false, reason: String(allowance?.reason || 'automation_unavailable'), allowance }
  }

  const { error: usageError } = await supabase.rpc('pixwiki_v2_record_usage', {
    p_user_id: receipt.user_id,
    p_company_id: receipt.company_id,
    p_receipt_id: receipt.id,
    p_origin: origin,
    p_idempotency_key: `pixwiki:v2:receipt:${receipt.id}`,
    p_units: 1,
    p_convenience_credit_cents: 0,
    p_is_test: false,
    p_occurred_at: receipt.date_approved || receipt.date_created || new Date().toISOString(),
    p_metadata: { source: 'webhook_dispatch', origin },
  })
  if (usageError) throw new Error(`usage_record_failed:${usageError.message}`)
  return { allowed: true, charged: true }
}

async function ensureEvent(supabase: any, receiptId: string) {
  const { data: old } = await supabase.from('pixwiki_webhook_events')
    .select('*')
    .eq('receipt_id', receiptId)
    .eq('event_type', 'pix.received')
    .maybeSingle()
  if (old) {
    // Eventos legados sem nenhuma tentativa podem ser recriados no contrato V2.
    // Se já houve delivery, preservamos o payload original para idempotência/auditoria.
    if (String(old.api_version || 'legacy-v1') === 'legacy-v1') {
      const { count } = await supabase.from('pixwiki_webhook_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', old.id)
      if (Number(count || 0) === 0) {
        await supabase.from('pixwiki_webhook_events').delete().eq('id', old.id)
      } else {
        return { event: old, reason: null }
      }
    } else {
      return { event: old, reason: null }
    }
  }

  const { data: receipt } = await supabase.from('mp_received_payments')
    .select('id,user_id,company_id,mp_payment_id,amount_cents,fee_amount_cents,net_amount_cents,status,source,date_approved,date_created,created_at')
    .eq('id', receiptId)
    .eq('status', 'approved')
    .maybeSingle()
  if (!receipt) throw new Error('receipt_not_found')

  const hooks = await activeHooks(supabase, receipt.user_id, receipt.company_id)
  if (!hooks.length) return { event: null, reason: 'no_webhooks' }

  const [{ data: company }, session] = await Promise.all([
    supabase.from('companies').select('id,name,slug').eq('id', receipt.company_id).maybeSingle(),
    checkoutContext(supabase, receipt),
  ])
  if (!company) throw new Error('company_not_found')

  const origin = session?.origin || (receipt.source === 'pixwiki_link' ? 'pix_link' : 'pix_key')
  const usage = await ensureUsage(supabase, receipt, session, origin)
  if (usage.allowed !== true) return { event: null, reason: usage.reason || 'automation_unavailable', allowance: usage.allowance }

  const eventId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const receivedAt = receipt.date_approved || receipt.date_created || receipt.created_at || createdAt
  const originalAmount = Number(session?.amount_cents ?? receipt.amount_cents ?? 0)
  const discountCents = Number(session?.discount_cents || 0)
  const context = session ? {
    checkout_id: session.id,
    checkout_url: `https://pix.wiki/c/${session.public_token}`,
    external_id: session.external_id || null,
    description: session.description || null,
    customer: {
      name: session.customer_name || null,
      email: session.customer_email || null,
      phone: session.customer_phone || null,
    },
    metadata: session.metadata || {},
  } : null

  const payload = {
    id: eventId,
    event: 'pix.received',
    type: 'pix.received',
    api_version: API_VERSION,
    created_at: createdAt,
    livemode: session?.is_test !== true,
    test: session?.is_test === true,
    data: {
      // Campos de primeiro nível preservam o contrato legado e ganham contexto V2.
      receipt_id: receipt.id,
      company: { id: company.id, name: company.name, slug: company.slug },
      mp_payment_id: receipt.mp_payment_id || null,
      source: origin,
      provider_source: receipt.source || null,
      amount_cents: Number(receipt.amount_cents || 0),
      original_amount_cents: originalAmount,
      discount_cents: discountCents,
      fee_amount_cents: Number(receipt.fee_amount_cents || 0),
      net_amount_cents: Number(receipt.net_amount_cents ?? (Number(receipt.amount_cents || 0) - Number(receipt.fee_amount_cents || 0))),
      currency: 'BRL',
      status: receipt.status,
      received_at: receivedAt,
      context,
    },
  }

  const { data, error } = await supabase.from('pixwiki_webhook_events').insert({
    id: eventId,
    user_id: receipt.user_id,
    company_id: receipt.company_id,
    receipt_id: receipt.id,
    event_type: 'pix.received',
    api_version: API_VERSION,
    checkout_id: session?.id || null,
    external_id: session?.external_id || null,
    origin,
    payload,
  }).select('*').single()

  if (!error) return { event: data, reason: null }

  const { data: raced } = await supabase.from('pixwiki_webhook_events')
    .select('*')
    .eq('receipt_id', receiptId)
    .eq('event_type', 'pix.received')
    .maybeSingle()
  if (raced) return { event: raced, reason: null }
  throw error
}

async function ensureDeliveries(supabase: any, event: any) {
  const hooks = await activeHooks(supabase, event.user_id, event.company_id)
  for (const hook of hooks) {
    await supabase.from('pixwiki_webhook_deliveries').upsert({
      event_id: event.id,
      webhook_id: hook.id,
      status: 'pending',
    }, { onConflict: 'event_id,webhook_id', ignoreDuplicates: true })
  }
}

async function deliver(supabase: any, delivery: any) {
  const [{ data: event }, { data: hook }] = await Promise.all([
    supabase.from('pixwiki_webhook_events').select('*').eq('id', delivery.event_id).maybeSingle(),
    supabase.from('pixwiki_webhooks').select('*').eq('id', delivery.webhook_id).maybeSingle(),
  ])

  if (!event || !hook || hook.is_active !== true) {
    await supabase.from('pixwiki_webhook_deliveries').update({
      status: 'failed',
      last_error: 'webhook_or_event_unavailable',
      updated_at: new Date().toISOString(),
    }).eq('id', delivery.id)
    return { id: delivery.id, ok: false }
  }

  const { data: secretRow } = await supabase.from('pixwiki_webhook_secrets')
    .select('signing_secret')
    .eq('webhook_id', hook.id)
    .maybeSingle()
  if (!secretRow?.signing_secret) throw new Error('webhook_secret_missing')

  const attempt = Number(delivery.attempt_count || 0) + 1
  const now = new Date()
  const timestamp = Math.floor(now.getTime() / 1000).toString()
  const raw = JSON.stringify(event.payload)
  const signature = await hmac(String(secretRow.signing_secret), `${timestamp}.${raw}`)
  const version = String(event.api_version || event.payload?.api_version || 'legacy-v1')

  let statusCode: number | null = null
  let responseBody = ''
  let lastError = ''
  let ok = false

  try {
    const response = await fetch(safeUrl(String(hook.url)), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PixWiki-Webhooks/2.0',
        'X-PixWiki-Event': event.event_type,
        'X-PixWiki-Event-Id': event.id,
        'X-PixWiki-Timestamp': timestamp,
        'X-PixWiki-Version': version,
        'X-PixWiki-Signature': `v1=${signature}`,
        'Idempotency-Key': event.id,
      },
      body: raw,
      signal: AbortSignal.timeout(8000),
    })
    statusCode = response.status
    responseBody = (await response.text()).slice(0, 1000)
    ok = response.ok
    if (!ok) lastError = `HTTP ${response.status}`
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'delivery_failed'
  }

  const update: any = {
    attempt_count: attempt,
    response_status: statusCode,
    response_body: responseBody || null,
    last_error: lastError || null,
    last_attempt_at: now.toISOString(),
    updated_at: now.toISOString(),
  }

  if (ok) {
    update.status = 'delivered'
    update.delivered_at = now.toISOString()
    update.next_attempt_at = null
    await Promise.all([
      supabase.from('pixwiki_webhook_deliveries').update(update).eq('id', delivery.id),
      supabase.from('pixwiki_webhooks').update({
        last_success_at: now.toISOString(),
        last_status_code: statusCode,
        updated_at: now.toISOString(),
      }).eq('id', hook.id),
    ])
    return { id: delivery.id, ok: true, status: statusCode, attempt }
  }

  if (attempt >= 5) {
    update.status = 'failed'
    update.next_attempt_at = null
  } else {
    update.status = 'retrying'
    update.next_attempt_at = new Date(now.getTime() + (retryMinutes[attempt] ?? 120) * 60000).toISOString()
  }

  await Promise.all([
    supabase.from('pixwiki_webhook_deliveries').update(update).eq('id', delivery.id),
    supabase.from('pixwiki_webhooks').update({
      last_failure_at: now.toISOString(),
      last_status_code: statusCode,
      updated_at: now.toISOString(),
    }).eq('id', hook.id),
  ])

  return { id: delivery.id, ok: false, status: statusCode, attempt, retry: update.status === 'retrying', error: lastError }
}

async function processReceipt(supabase: any, receiptId: string) {
  const result = await ensureEvent(supabase, receiptId)
  if (!result.event) return { skipped: true, reason: result.reason, allowance: result.allowance || undefined }

  await ensureDeliveries(supabase, result.event)
  const { data: deliveries } = await supabase.from('pixwiki_webhook_deliveries')
    .select('*')
    .eq('event_id', result.event.id)
    .eq('status', 'pending')

  const output = []
  for (const delivery of deliveries || []) output.push(await deliver(supabase, delivery))
  return { event_id: result.event.id, api_version: result.event.api_version || API_VERSION, deliveries: output }
}

async function retryDue(supabase: any) {
  const now = new Date().toISOString()
  const { data: deliveries, error } = await supabase.from('pixwiki_webhook_deliveries')
    .select('*')
    .in('status', ['pending', 'retrying'])
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) throw error

  const output = []
  for (const delivery of deliveries || []) output.push(await deliver(supabase, delivery))
  return output
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: jsonHeaders })
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    if (!(await authenticate(supabase, req))) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: jsonHeaders })
    }

    const body = await req.json().catch(() => ({}))
    if (body?.retry_due === true) {
      const results = await retryDue(supabase)
      return new Response(JSON.stringify({ ok: true, api_version: API_VERSION, processed: results.length, results }), { headers: jsonHeaders })
    }

    const receiptId = String(body?.receipt_id || '')
    if (!receiptId) return new Response(JSON.stringify({ error: 'receipt_id_required' }), { status: 400, headers: jsonHeaders })
    return new Response(JSON.stringify({ ok: true, api_version: API_VERSION, ...(await processReceipt(supabase, receiptId)) }), { headers: jsonHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    console.error('[pixwiki-webhook-dispatch]', message)
    return new Response(JSON.stringify({ ok: false, error: message, api_version: API_VERSION }), { status: 500, headers: jsonHeaders })
  }
})
