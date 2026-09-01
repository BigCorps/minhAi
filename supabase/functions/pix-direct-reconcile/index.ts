import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MP_CLIENT_ID = Deno.env.get('ML_APP_ID')!
const MP_CLIENT_SECRET = Deno.env.get('ML_APP_SECRET')!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers })
}

function isServiceRequest(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return !!SERVICE_ROLE && token === SERVICE_ROLE
}

function paymentTimestamp(payment: any) {
  const raw = payment?.date_approved || payment?.date_created || payment?.date_last_updated
  const ms = raw ? new Date(raw).getTime() : NaN
  return Number.isFinite(ms) ? ms : NaN
}

async function refreshMpToken(
  supabase: any,
  connection: any,
  table: 'mp_connections' | 'pixwiki_mp_connections',
) {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 5 * 60 * 1000) {
    return connection.access_token
  }

  if (!connection.refresh_token || !MP_CLIENT_ID || !MP_CLIENT_SECRET) {
    return connection.access_token
  }

  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.access_token) return connection.access_token

  const update = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? connection.refresh_token,
    expires_at: new Date(Date.now() + Number(data.expires_in ?? 15552000) * 1000).toISOString(),
    granted_scope: data.scope ?? connection.granted_scope ?? null,
    updated_at: new Date().toISOString(),
  }

  await supabase.from(table).update(update).eq('id', connection.id)

  if (table === 'pixwiki_mp_connections' && connection.legacy_connection_id) {
    await supabase.from('mp_connections').update(update).eq('id', connection.legacy_connection_id)
  }

  return data.access_token
}

async function resolveConnection(supabase: any, intent: any, tx: any) {
  const scope = String(intent.connection_scope || '')
  const expectedMpUserId = scope.startsWith('mpuser:') ? scope.slice('mpuser:'.length) : ''

  if (intent.product === 'pixwiki') {
    const { data: settings } = await supabase
      .from('pixwiki_payment_settings')
      .select('mp_connection_id')
      .eq('company_id', intent.company_id)
      .maybeSingle()

    if (!settings?.mp_connection_id) return null

    let query = supabase
      .from('pixwiki_mp_connections')
      .select('id,user_id,company_id,legacy_connection_id,mp_user_id,access_token,refresh_token,expires_at,granted_scope,is_active')
      .eq('id', settings.mp_connection_id)
      .eq('company_id', intent.company_id)
      .eq('is_active', true)

    if (expectedMpUserId) query = query.eq('mp_user_id', expectedMpUserId)

    const { data } = await query.maybeSingle()
    return data ? { connection: data, table: 'pixwiki_mp_connections' as const } : null
  }

  const userId = intent.user_id || tx?.user_id
  if (!userId) return null

  let query = supabase
    .from('mp_connections')
    .select('id,user_id,mp_user_id,access_token,refresh_token,expires_at,granted_scope,is_active')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (expectedMpUserId) query = query.eq('mp_user_id', expectedMpUserId)

  const { data } = await query
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ? { connection: data, table: 'mp_connections' as const } : null
}

async function existingReceiptId(supabase: any, mpUserId: string, providerPaymentId: string) {
  if (!mpUserId || !providerPaymentId) return null

  const { data: connections } = await supabase
    .from('pixwiki_mp_connections')
    .select('id')
    .eq('mp_user_id', mpUserId)
    .eq('is_active', true)

  const ids = (connections || []).map((row: any) => row.id).filter(Boolean)
  if (!ids.length) return null

  const { data: receipt } = await supabase
    .from('mp_received_payments')
    .select('id')
    .eq('mp_payment_id', providerPaymentId)
    .in('mp_connection_id', ids)
    .limit(1)
    .maybeSingle()

  return receipt?.id || null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ success: false, error: 'method_not_allowed' }, 405)
  if (!isServiceRequest(req)) return json({ success: false, error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({})) as Record<string, any>
  const transactionId = String(body.transaction_id || '')
  const requestedIntentId = String(body.intent_id || '')

  if (!transactionId && !requestedIntentId) {
    return json({ success: false, error: 'transaction_or_intent_required' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    let tx: any = null
    let intentId = requestedIntentId

    if (transactionId) {
      const { data, error } = await supabase
        .from('pix_transactions')
        .select('id,company_id,user_id,status,payment_provider,direct_intent_id,amount_cents,original_amount_cents,discount_cents,confirmed_at,origem')
        .eq('id', transactionId)
        .maybeSingle()

      if (error || !data) return json({ success: false, error: 'transaction_not_found' }, 404)
      tx = data
      intentId = String(data.direct_intent_id || intentId || '')
    }

    if (!intentId) return json({ success: false, error: 'direct_intent_missing' }, 409)

    const { data: intent, error: intentError } = await supabase
      .from('pix_direct_intents')
      .select('id,company_id,user_id,product,product_reference,connection_scope,status,expected_amount_cents,original_amount_cents,discount_cents,provider_payment_id,matched_receipt_id,created_at,expires_at,confirmed_at,metadata')
      .eq('id', intentId)
      .maybeSingle()

    if (intentError || !intent) return json({ success: false, error: 'direct_intent_not_found' }, 404)

    if (intent.status === 'confirmed' && intent.provider_payment_id) {
      return json({
        success: true,
        matched: true,
        already_confirmed: true,
        intent_id: intent.id,
        transaction_id: tx?.id || null,
        product: intent.product,
        provider_payment_id: String(intent.provider_payment_id),
        paid_at: intent.confirmed_at,
        receipt_id: intent.matched_receipt_id || null,
        expected_amount_cents: Number(intent.expected_amount_cents),
        original_amount_cents: Number(intent.original_amount_cents),
        discount_cents: Number(intent.discount_cents || 0),
      })
    }

    if (intent.status !== 'pending') {
      return json({ success: true, matched: false, status: intent.status, intent_id: intent.id })
    }

    if (new Date(intent.expires_at).getTime() <= Date.now()) {
      await supabase
        .from('pix_direct_intents')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', intent.id)
        .eq('status', 'pending')
      return json({ success: true, matched: false, status: 'expired', intent_id: intent.id })
    }

    const resolved = await resolveConnection(supabase, intent, tx)
    if (!resolved) return json({ success: false, error: 'mp_connection_required' }, 409)

    const { connection, table } = resolved
    const token = await refreshMpToken(supabase, connection, table)
    const startMs = new Date(intent.created_at).getTime() - 10_000
    const endMs = new Date(intent.expires_at).getTime()

    const search = new URL('https://api.mercadopago.com/v1/payments/search')
    search.searchParams.set('status', 'approved')
    search.searchParams.set('sort', 'date_last_updated')
    search.searchParams.set('criteria', 'asc')
    search.searchParams.set('range', 'date_last_updated')
    search.searchParams.set('begin_date', new Date(startMs).toISOString())
    search.searchParams.set('end_date', new Date(Math.min(Date.now(), endMs)).toISOString())
    search.searchParams.set('limit', '100')

    const response = await fetch(search, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      console.error('[pix-direct-reconcile] MP search:', response.status, payload?.message || payload?.error || '')
      return json({ success: false, error: 'mp_search_failed' }, 502)
    }

    const rawCandidates = (Array.isArray(payload?.results) ? payload.results : []).filter((payment: any) => {
      const paidMs = paymentTimestamp(payment)
      return payment?.status === 'approved'
        && payment?.payment_method_id === 'pix'
        && payment?.point_of_interaction?.type === 'PSP_TRANSFER'
        && Math.round(Number(payment?.transaction_amount || 0) * 100) === Number(intent.expected_amount_cents)
        && Number.isFinite(paidMs)
        && paidMs >= startMs
        && paidMs <= endMs
    })

    const ids = rawCandidates.map((payment: any) => String(payment.id)).filter(Boolean)
    let claimed = new Set<string>()

    if (ids.length) {
      const { data: used } = await supabase
        .from('pix_direct_intents')
        .select('provider_payment_id')
        .in('provider_payment_id', ids)
      claimed = new Set((used || []).map((row: any) => String(row.provider_payment_id)))
    }

    const candidates = rawCandidates.filter((payment: any) => !claimed.has(String(payment.id)))

    if (candidates.length === 0) {
      return json({ success: true, matched: false, status: 'pending', intent_id: intent.id })
    }

    if (candidates.length > 1) {
      return json({
        success: false,
        matched: false,
        error: 'ambiguous_direct_payment',
        message: 'Mais de um Pix compatível foi encontrado; a confirmação automática foi bloqueada por segurança.',
        intent_id: intent.id,
      }, 409)
    }

    const payment = candidates[0]
    const providerPaymentId = String(payment.id)
    const paidAt = payment.date_approved || payment.date_created || new Date().toISOString()
    const mpUserId = String(connection.mp_user_id || '').trim()
    const receiptId = await existingReceiptId(supabase, mpUserId, providerPaymentId)

    const { data: claimedIntent, error: claimError } = await supabase.rpc('pix_direct_claim_provider_payment', {
      p_intent_id: intent.id,
      p_provider_payment_id: providerPaymentId,
      p_paid_at: paidAt,
      p_receipt_id: receiptId,
      p_finalize_transaction: false,
    })

    if (claimError) throw claimError

    return json({
      success: true,
      matched: true,
      already_confirmed: false,
      intent_id: intent.id,
      transaction_id: tx?.id || null,
      product: intent.product,
      provider_payment_id: providerPaymentId,
      paid_at: paidAt,
      receipt_id: claimedIntent?.matched_receipt_id || receiptId || null,
      expected_amount_cents: Number(intent.expected_amount_cents),
      original_amount_cents: Number(intent.original_amount_cents),
      discount_cents: Number(intent.discount_cents || 0),
    })
  } catch (error) {
    console.error('[pix-direct-reconcile]', error instanceof Error ? error.message : error)
    return json({ success: false, error: 'internal_error' }, 500)
  }
})
