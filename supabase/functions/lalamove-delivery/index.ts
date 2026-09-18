import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LALAMOVE_API_KEY = Deno.env.get('LALAMOVE_API_KEY') ?? ''
const LALAMOVE_API_SECRET = Deno.env.get('LALAMOVE_API_SECRET') ?? ''
const MARKET = Deno.env.get('LALAMOVE_MARKET') ?? 'BR'
const SERVICE_TYPE = Deno.env.get('LALAMOVE_SERVICE_TYPE') ?? 'LALAGO'
const TIMEZONE = Deno.env.get('LALAMOVE_TIMEZONE') ?? 'America/Sao_Paulo'

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function fail(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return json({ success: false, error, ...extra }, status)
}

function isInternal(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  return !!SERVICE_ROLE && auth === `Bearer ${SERVICE_ROLE}`
}

function baseUrl() {
  const env = Deno.env.get('LALAMOVE_ENVIRONMENT') ?? 'sandbox'
  return env === 'production'
    ? 'https://rest.lalamove.com'
    : 'https://rest.sandbox.lalamove.com'
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function buildHeaders(method: string, path: string, body: string, requestId: string) {
  if (!LALAMOVE_API_KEY || !LALAMOVE_API_SECRET) throw new Error('lalamove_credentials_missing')
  const time = Date.now().toString()
  const rawSignature = `${time}\r\n${method}\r\n${path}\r\n\r\n${body}`
  const signature = await hmacHex(LALAMOVE_API_SECRET, rawSignature)
  return {
    'Content-Type': 'application/json',
    Authorization: `hmac ${LALAMOVE_API_KEY}:${time}:${signature}`,
    Market: MARKET,
    'Request-ID': requestId,
  }
}

function providerMessage(data: any) {
  return String(
    data?.message ||
    data?.errors?.[0]?.message ||
    data?.errors?.[0]?.detail ||
    'lalamove_provider_error'
  )
}

function applyMarkup(originalCents: number) {
  const raw = Number(Deno.env.get('LALAMOVE_MARKUP_PERCENT') ?? '50')
  const percent = Number.isFinite(raw) && raw >= 0 ? raw : 50
  return Math.ceil(originalCents * (1 + percent / 100))
}

function phoneBR(value: unknown): string | null {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return `+${digits}`
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`
  return null
}

function distanceKm(distance: any): number | null {
  const value = Number(distance?.value)
  if (!Number.isFinite(value)) return null
  const unit = String(distance?.unit || '').toLowerCase()
  if (unit === 'm' || unit === 'meter' || unit === 'meters') return value / 1000
  if (unit === 'km' || unit === 'kilometer' || unit === 'kilometers') return value
  return value > 500 ? value / 1000 : value
}

function localClock() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ''
  return { weekday: get('weekday'), hour: Number(get('hour')), minute: Number(get('minute')) }
}

function isWithinSchedule(schedule: Record<string, { enabled: boolean; open: string; close: string }> | null) {
  if (!schedule || Object.keys(schedule).length === 0) return true
  const keys: Record<string, string> = { Sun: 'dom', Mon: 'seg', Tue: 'ter', Wed: 'qua', Thu: 'qui', Fri: 'sex', Sat: 'sab' }
  const now = localClock()
  const row = schedule[keys[now.weekday]]
  if (!row?.enabled) return false
  const [oh, om] = String(row.open || '00:00').split(':').map(Number)
  const [ch, cm] = String(row.close || '23:59').split(':').map(Number)
  const current = now.hour * 60 + now.minute
  const open = oh * 60 + om
  const close = ch * 60 + cm
  return current >= open && current < close
}

async function geocodeAddress(address: string) {
  const key = Deno.env.get('GOOGLE_MAPS_API_KEY')
  if (!key) return null
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=br&key=${key}`
  const res = await fetch(url)
  const data = await res.json()
  const loc = data?.results?.[0]?.geometry?.location
  return data?.status === 'OK' && loc ? { lat: Number(loc.lat), lng: Number(loc.lng) } : null
}

async function expandCep(address: string) {
  const trimmed = address.trim()
  if (!/^\d{5}-?\d{3}$/.test(trimmed)) return trimmed
  try {
    const cep = trimmed.replace(/\D/g, '')
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await res.json()
    if (data?.erro) return trimmed
    return `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`
  } catch {
    return trimmed
  }
}

type CompanyDelivery = {
  delivery_enabled: boolean
  delivery_auto_dispatch: boolean
  delivery_who_pays: 'cliente' | 'empresa'
  delivery_pickup_address: string | null
  delivery_pickup_phone: string | null
  telefone_fixo: string | null
  business_address: string | null
  delivery_max_radius_km: number | null
  delivery_min_order_cents: number
  delivery_schedule: Record<string, { enabled: boolean; open: string; close: string }>
  delivery_message: string | null
  name: string
}

async function createQuotation(company: CompanyDelivery, deliveryAddress: string, orderTotalCents: number, requestId: string) {
  if (!company.delivery_enabled) throw new Error('delivery_not_available')
  if (company.delivery_min_order_cents > 0 && orderTotalCents < company.delivery_min_order_cents) {
    throw new Error(`minimum_order:${company.delivery_min_order_cents}`)
  }
  if (!isWithinSchedule(company.delivery_schedule)) throw new Error('delivery_outside_schedule')

  const pickupAddress = company.delivery_pickup_address || company.business_address
  if (!pickupAddress) throw new Error('pickup_address_required')
  const dropAddress = await expandCep(deliveryAddress)

  const [pickup, drop] = await Promise.all([
    geocodeAddress(`${pickupAddress}${pickupAddress.includes('Brasil') ? '' : ', Brasil'}`),
    geocodeAddress(`${dropAddress}${dropAddress.includes('Brasil') ? '' : ', Brasil'}`),
  ])
  if (!pickup) throw new Error('pickup_address_not_found')
  if (!drop) throw new Error('delivery_address_not_found')

  const body = JSON.stringify({
    data: {
      serviceType: SERVICE_TYPE,
      language: 'pt_BR',
      stops: [
        { coordinates: { lat: String(pickup.lat), lng: String(pickup.lng) }, address: pickupAddress },
        { coordinates: { lat: String(drop.lat), lng: String(drop.lng) }, address: dropAddress },
      ],
    },
  })
  const path = '/v3/quotations'
  const headers = await buildHeaders('POST', path, body, requestId)
  const response = await fetch(`${baseUrl()}${path}`, { method: 'POST', headers, body })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(providerMessage(data)), { providerStatus: response.status, providerData: data })

  const payload = data?.data ?? data
  const originalCents = Math.round(Number(payload?.priceBreakdown?.total || 0) * 100)
  if (!payload?.quotationId || !Number.isFinite(originalCents) || originalCents <= 0) {
    throw new Error('invalid_quotation_response')
  }
  const km = distanceKm(payload?.distance)
  if (company.delivery_max_radius_km && km != null && km > company.delivery_max_radius_km) {
    throw new Error(`delivery_outside_radius:${company.delivery_max_radius_km}`)
  }

  return {
    payload,
    quotationId: String(payload.quotationId),
    originalCents,
    finalCents: applyMarkup(originalCents),
    distanceKm: km,
    expiresAt: payload?.expiresAt ? String(payload.expiresAt) : null,
    etaMinutes: payload?.stops?.[1]?.eta
      ? Math.max(0, Math.round((new Date(payload.stops[1].eta).getTime() - Date.now()) / 60000))
      : null,
    address: dropAddress,
  }
}

async function retrieveQuotation(quotationId: string, requestId: string) {
  const path = `/v3/quotations/${encodeURIComponent(quotationId)}`
  const headers = await buildHeaders('GET', path, '', requestId)
  const response = await fetch(`${baseUrl()}${path}`, { method: 'GET', headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) return null
  return data?.data ?? data
}

async function handleQuote(supabase: any, body: any) {
  const companyId = String(body?.company_id || '')
  const address = String(body?.delivery_address || '').trim().slice(0, 500)
  const orderTotalCents = Math.round(Number(body?.order_total_cents || 0))
  if (!companyId || address.length < 8 || !Number.isFinite(orderTotalCents) || orderTotalCents <= 0) {
    return fail('invalid_quote_request', 400)
  }

  const { data: company } = await supabase
    .from('companies')
    .select('delivery_enabled,delivery_auto_dispatch,delivery_who_pays,delivery_pickup_address,delivery_pickup_phone,telefone_fixo,business_address,delivery_max_radius_km,delivery_min_order_cents,delivery_schedule,delivery_message,name')
    .eq('id', companyId)
    .maybeSingle()
  if (!company) return fail('company_not_found', 404)

  const requestId = crypto.randomUUID()
  try {
    const quote = await createQuotation(company as CompanyDelivery, address, orderTotalCents, requestId)
    return json({
      success: true,
      request_id: requestId,
      quotation_id: quote.quotationId,
      price_cents: quote.finalCents,
      price_original_cents: quote.originalCents,
      price_brl: (quote.finalCents / 100).toFixed(2),
      eta_minutes: quote.etaMinutes,
      distance_km: quote.distanceKm,
      expires_at: quote.expiresAt,
    })
  } catch (error: any) {
    const message = String(error?.message || 'delivery_quote_failed')
    if (message.startsWith('minimum_order:')) {
      const cents = Number(message.split(':')[1] || 0)
      return fail('minimum_order_not_met', 409, { minimum_order_cents: cents })
    }
    if (message.startsWith('delivery_outside_radius:')) {
      return fail('delivery_outside_radius', 409, { max_radius_km: Number(message.split(':')[1] || 0) })
    }
    const status = Number(error?.providerStatus || 0)
    return fail(message, status >= 400 && status < 500 ? status : 502, { request_id: requestId })
  }
}

async function setDispatchState(supabase: any, pedidoId: string, state: string, error: string | null) {
  await supabase.from('pedidos').update({
    delivery_dispatch_state: state,
    delivery_last_error: error,
    updated_at: new Date().toISOString(),
  }).eq('id', pedidoId)
}

async function handleOrder(supabase: any, body: any) {
  const companyId = String(body?.company_id || '')
  const pedidoId = String(body?.pedido_id || '')
  const manual = body?.manual === true
  if (!companyId || !pedidoId) return fail('invalid_dispatch_request', 400)

  const { data: pedidoPre } = await supabase
    .from('pedidos')
    .select('id,company_id,status,delivery_requested,lalamove_order_id,delivery_share_link')
    .eq('id', pedidoId)
    .eq('company_id', companyId)
    .maybeSingle()
  if (!pedidoPre) return fail('pedido_not_found', 404)
  if (pedidoPre.lalamove_order_id) {
    return json({ success: true, already_created: true, order_id: pedidoPre.lalamove_order_id, share_link: pedidoPre.delivery_share_link })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('delivery_enabled,delivery_auto_dispatch,delivery_who_pays,delivery_pickup_address,delivery_pickup_phone,telefone_fixo,business_address,delivery_max_radius_km,delivery_min_order_cents,delivery_schedule,delivery_message,name')
    .eq('id', companyId)
    .maybeSingle()
  if (!company) return fail('company_not_found', 404)
  if (!manual && company.delivery_auto_dispatch !== true) {
    return json({ success: true, skipped: true, reason: 'auto_dispatch_disabled' })
  }

  const { data: prepared, error: prepareError } = await supabase.rpc('funcionaria_prepare_lalamove_dispatch', {
    p_pedido_id: pedidoId,
  })
  if (prepareError) return fail('dispatch_prepare_failed', 500)
  if (prepared?.already_created) {
    return json({ success: true, already_created: true, order_id: prepared.order_id, share_link: prepared.share_link })
  }
  if (!prepared?.success) {
    const code = String(prepared?.error || 'dispatch_not_prepared')
    return fail(code, code === 'payment_not_confirmed' ? 409 : code === 'dispatch_in_progress' || code === 'dispatch_uncertain' ? 409 : 400)
  }

  const requestId = String(prepared.request_id || '')
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id,company_id,subtotal,total,status,cliente_nome,cliente_telefone,delivery_requested,delivery_address,delivery_fee_cents,delivery_fee_original_cents,delivery_who_pays_snapshot,lalamove_quotation_id,lalamove_quote_expires_at,delivery_dispatch_request_id')
    .eq('id', pedidoId)
    .eq('company_id', companyId)
    .maybeSingle()
  if (!pedido) {
    await setDispatchState(supabase, pedidoId, 'failed', 'pedido_not_found_after_prepare')
    return fail('pedido_not_found', 404)
  }

  const pickupAddress = company.delivery_pickup_address || company.business_address
  const pickupPhone = phoneBR(company.delivery_pickup_phone || company.telefone_fixo)
  const recipientPhone = phoneBR(pedido.cliente_telefone)
  if (!pickupAddress || !pickupPhone || !recipientPhone || !pedido.delivery_address) {
    const missing = !pickupAddress ? 'pickup_address_required' : !pickupPhone ? 'pickup_phone_required' : !recipientPhone ? 'customer_phone_required' : 'delivery_address_required'
    await setDispatchState(supabase, pedidoId, 'failed', missing)
    return fail(missing, 409)
  }

  const whoPays = pedido.delivery_who_pays_snapshot === 'empresa' ? 'empresa' : pedido.delivery_who_pays_snapshot === 'cliente' ? 'cliente' : company.delivery_who_pays

  let quotePayload: any = null
  let quotationId = String(pedido.lalamove_quotation_id || '')
  let originalCents = Number(pedido.delivery_fee_original_cents || 0)
  let finalCents = Number(pedido.delivery_fee_cents || 0)
  let quoteExpires = pedido.lalamove_quote_expires_at ? new Date(pedido.lalamove_quote_expires_at).getTime() : 0

  if (quotationId && quoteExpires > Date.now() + 5000) {
    quotePayload = await retrieveQuotation(quotationId, crypto.randomUUID())
  }

  if (!quotePayload) {
    try {
      const fresh = await createQuotation(company as CompanyDelivery, String(pedido.delivery_address), Math.round(Number(pedido.subtotal || 0) * 100), crypto.randomUUID())
      quotePayload = fresh.payload
      quotationId = fresh.quotationId
      originalCents = fresh.originalCents
      quoteExpires = fresh.expiresAt ? new Date(fresh.expiresAt).getTime() : 0

      if (whoPays === 'cliente') {
        // O cliente já pagou o frete cotado. O markup de 50% cria margem de segurança,
        // mas nunca despachamos automaticamente se o novo custo bruto superar o valor arrecadado.
        if (!finalCents || originalCents > finalCents) {
          await setDispatchState(supabase, pedidoId, 'failed', 'requote_exceeds_collected_delivery_fee')
          return fail('requote_exceeds_collected_delivery_fee', 409)
        }
      } else {
        finalCents = fresh.finalCents
      }

      await supabase.from('pedidos').update({
        lalamove_quotation_id: quotationId,
        lalamove_quote_expires_at: fresh.expiresAt,
        delivery_fee_original_cents: originalCents,
        ...(whoPays === 'empresa' ? { delivery_fee_cents: finalCents } : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', pedidoId)
    } catch (error: any) {
      await setDispatchState(supabase, pedidoId, 'failed', String(error?.message || 'delivery_requote_failed'))
      return fail(String(error?.message || 'delivery_requote_failed'), 409)
    }
  }

  const stops = Array.isArray(quotePayload?.stops) ? quotePayload.stops : []
  const pickupStopId = String(stops?.[0]?.stopId || '')
  const dropStopId = String(stops?.[1]?.stopId || '')
  if (!pickupStopId || !dropStopId) {
    await setDispatchState(supabase, pedidoId, 'failed', 'quotation_stops_missing')
    return fail('quotation_stops_missing', 502)
  }

  let reserved = false
  if (whoPays === 'empresa') {
    const { data: reserve, error: reserveError } = await supabase.rpc('funcionaria_reserve_delivery_fee', {
      p_pedido_id: pedidoId,
      p_amount_cents: Math.round(finalCents),
      p_request_id: requestId,
    })
    if (reserveError || !reserve?.success) {
      await setDispatchState(supabase, pedidoId, 'failed', String(reserve?.error || 'delivery_balance_reserve_failed'))
      return fail(String(reserve?.error || 'delivery_balance_reserve_failed'), reserve?.error === 'saldo_insuficiente' ? 402 : 409, reserve || {})
    }
    reserved = true
  }

  const orderBody = JSON.stringify({
    data: {
      quotationId,
      sender: {
        stopId: pickupStopId,
        name: String(company.name || 'Empresa').slice(0, 120),
        phone: pickupPhone,
      },
      recipients: [{
        stopId: dropStopId,
        name: String(pedido.cliente_nome || 'Cliente').slice(0, 120),
        phone: recipientPhone,
      }],
      isPODEnabled: true,
    },
  })

  const path = '/v3/orders'
  let response: Response
  let data: any
  try {
    const headers = await buildHeaders('POST', path, orderBody, requestId)
    response = await fetch(`${baseUrl()}${path}`, { method: 'POST', headers, body: orderBody })
    data = await response.json().catch(() => ({}))
  } catch (error: any) {
    await setDispatchState(supabase, pedidoId, 'uncertain', String(error?.message || 'provider_response_unknown'))
    return fail('dispatch_uncertain', 502, { request_id: requestId })
  }

  if (!response.ok) {
    const providerError = providerMessage(data)
    if (response.status >= 500) {
      await setDispatchState(supabase, pedidoId, 'uncertain', providerError)
      return fail('dispatch_uncertain', 502, { request_id: requestId, provider_error: providerError })
    }
    if (reserved) await supabase.rpc('funcionaria_refund_delivery_fee', { p_pedido_id: pedidoId, p_reason: providerError })
    await setDispatchState(supabase, pedidoId, 'failed', providerError)
    return fail(providerError, response.status || 502, { request_id: requestId })
  }

  let payload = data?.data ?? data
  const orderId = String(payload?.orderId || '')
  if (!orderId) {
    await setDispatchState(supabase, pedidoId, 'uncertain', 'provider_order_id_missing')
    return fail('dispatch_uncertain', 502, { request_id: requestId })
  }

  let shareLink = payload?.shareLink ? String(payload.shareLink) : null
  if (!shareLink) {
    try {
      const detailsPath = `/v3/orders/${encodeURIComponent(orderId)}`
      const detailsHeaders = await buildHeaders('GET', detailsPath, '', crypto.randomUUID())
      const detailsRes = await fetch(`${baseUrl()}${detailsPath}`, { method: 'GET', headers: detailsHeaders })
      const detailsData = await detailsRes.json().catch(() => ({}))
      const details = detailsData?.data ?? detailsData
      if (detailsRes.ok && details?.shareLink) shareLink = String(details.shareLink)
    } catch { /* share link também pode chegar por webhook */ }
  }

  const { error: saveError } = await supabase.from('pedidos').update({
    lalamove_order_id: orderId,
    delivery_share_link: shareLink,
    delivery_status: String(payload?.status || 'ASSIGNING_DRIVER').toLowerCase(),
    delivery_dispatch_state: 'created',
    delivery_last_error: null,
    lalamove_quotation_id: quotationId,
    delivery_fee_original_cents: originalCents,
    updated_at: new Date().toISOString(),
  }).eq('id', pedidoId).eq('delivery_dispatch_request_id', requestId)

  if (saveError) {
    await setDispatchState(supabase, pedidoId, 'uncertain', 'provider_created_but_local_save_failed')
    return fail('dispatch_uncertain', 502, { request_id: requestId, order_id: orderId, share_link: shareLink })
  }

  return json({ success: true, order_id: orderId, share_link: shareLink, request_id: requestId })
}

function constantEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function validateWebhook(req: Request, payload: any) {
  if (!payload?.apiKey || payload.apiKey !== LALAMOVE_API_KEY) return false
  if (!payload?.timestamp || !payload?.signature || !payload?.data) return false
  const path = Deno.env.get('LALAMOVE_WEBHOOK_PATH') || new URL(req.url).pathname
  const body = JSON.stringify(payload.data)
  const raw = `${payload.timestamp}\r\nPOST\r\n${path}\r\n\r\n${body}`
  const expected = await hmacHex(LALAMOVE_API_SECRET, raw)
  return constantEqual(expected, String(payload.signature).toLowerCase())
}

function eventDate(payload: any) {
  const updated = payload?.data?.updatedAt
  if (updated && !Number.isNaN(new Date(updated).getTime())) return new Date(updated)
  const raw = Number(payload?.timestamp || 0)
  const ms = raw > 0 && raw < 1e12 ? raw * 1000 : raw
  return Number.isFinite(ms) && ms > 0 ? new Date(ms) : new Date()
}

async function handleWebhook(req: Request, supabase: any, payload: any) {
  const valid = await validateWebhook(req, payload)
  if (!valid) return fail('invalid_webhook_signature', 401)

  const eventId = String(payload.eventId || '')
  const eventType = String(payload.eventType || '')
  const order = payload?.data?.order || null
  const orderId = String(order?.orderId || '')
  const rawTs = Number(payload?.timestamp || 0)
  const tsMs = rawTs > 0 && rawTs < 1e12 ? rawTs * 1000 : rawTs

  if (eventId) {
    const { error: eventError } = await supabase.from('lalamove_webhook_events').insert({
      event_id: eventId,
      lalamove_order_id: orderId || null,
      event_type: eventType || 'UNKNOWN',
      event_timestamp_ms: Number.isFinite(tsMs) ? Math.round(tsMs) : null,
    })
    if (eventError?.code === '23505') return json({ received: true, duplicate: true })
    if (eventError) console.error('lalamove webhook event log:', eventError.message)
  }

  if (!orderId) return json({ received: true })

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id,company_id,status,cliente_telefone,cliente_email,platform,conversation_id,delivery_share_link,delivery_last_webhook_at')
    .eq('lalamove_order_id', orderId)
    .maybeSingle()
  if (!pedido) return json({ received: true })

  const incomingAt = eventDate(payload)
  if (pedido.delivery_last_webhook_at && new Date(pedido.delivery_last_webhook_at).getTime() > incomingAt.getTime()) {
    return json({ received: true, stale: true })
  }

  const statusMap: Record<string, string> = {
    ASSIGNING_DRIVER: 'assigning',
    ON_GOING: 'on_going',
    PICKED_UP: 'picked_up',
    COMPLETED: 'completed',
    CANCELED: 'cancelled',
    REJECTED: 'cancelled',
    EXPIRED: 'cancelled',
  }
  const deliveryStatus = statusMap[String(order?.status || '')] || (eventType === 'DRIVER_ASSIGNED' ? 'driver_assigned' : null)
  const shareLink = order?.shareLink ? String(order.shareLink) : pedido.delivery_share_link

  const patch: Record<string, unknown> = {
    delivery_last_webhook_at: incomingAt.toISOString(),
    delivery_last_webhook_event_id: eventId || null,
    ...(deliveryStatus ? { delivery_status: deliveryStatus } : {}),
    ...(shareLink ? { delivery_share_link: shareLink } : {}),
    ...(deliveryStatus === 'completed' && pedido.status === 'pago' ? { status: 'entregue' } : {}),
    updated_at: new Date().toISOString(),
  }
  await supabase.from('pedidos').update(patch).eq('id', pedido.id)

  if (eventType === 'DRIVER_ASSIGNED' && pedido.cliente_telefone && shareLink) {
    await supabase.functions.invoke('notificar-entrega-cliente', {
      body: {
        pedido_id: pedido.id,
        share_link: shareLink,
        company_id: pedido.company_id,
        cliente_telefone: pedido.cliente_telefone,
        cliente_email: pedido.cliente_email ?? null,
        platform: pedido.platform ?? null,
        conversation_id: pedido.conversation_id ?? null,
      },
    }).catch(() => null)
  }

  return json({ received: true })
}

serve(async (req) => {
  if (req.method === 'GET') return json({ ok: true })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') return fail('method_not_allowed', 405)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const bodyText = await req.text()
  if (!bodyText || bodyText.trim() === '' || bodyText.trim() === '{}') {
    // Validação inicial do webhook: Lalamove exige HTTP 200 mesmo sem payload.
    return json({ received: true })
  }

  let body: any
  try { body = JSON.parse(bodyText) } catch { return fail('invalid_json', 400) }

  if (body?.signature && body?.apiKey && body?.eventType) {
    return handleWebhook(req, supabase, body)
  }

  if (!isInternal(req)) return fail('unauthorized', 401)

  if (body?.action === 'quote') return handleQuote(supabase, body)
  if (body?.action === 'order') return handleOrder(supabase, body)
  return fail('invalid_action', 400)
})
