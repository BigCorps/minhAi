import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MP_CLIENT_ID = Deno.env.get('ML_APP_ID')!
const MP_CLIENT_SECRET = Deno.env.get('ML_APP_SECRET')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function jwtSub(req: Request): string {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  const payloadPart = token.split('.')[1] || ''
  if (!payloadPart) return ''
  try {
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    return String(payload?.sub || '').trim()
  } catch {
    return ''
  }
}

function cents(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

function safeText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

function payerBank(payment: any): string | null {
  const bank = payment?.point_of_interaction?.transaction_data?.bank_info?.payer
  return safeText(bank?.long_name ?? bank?.name ?? bank?.institution_name)
}

function minimalMetadata(payment: any) {
  return {
    collector_id: payment?.collector_id ?? null,
    bank_transfer_id:
      payment?.point_of_interaction?.transaction_data?.bank_transfer_id ??
      payment?.transaction_details?.bank_transfer_id ??
      null,
    money_release_status: payment?.money_release_status ?? null,
    status_detail: payment?.status_detail ?? null,
    live_mode: payment?.live_mode ?? null,
    total_paid_amount: payment?.transaction_details?.total_paid_amount ?? null,
    net_received_amount: payment?.transaction_details?.net_received_amount ?? null,
  }
}

async function validToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 5 * 60 * 1000) {
    return connection.access_token
  }

  if (!connection.refresh_token || !MP_CLIENT_ID || !MP_CLIENT_SECRET) {
    if (connection.access_token) return connection.access_token
    throw new Error('mp_token_unavailable')
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
  if (!response.ok || !data?.access_token) throw new Error('mp_refresh_failed')

  const update = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? connection.refresh_token,
    expires_at: new Date(Date.now() + Number(data.expires_in ?? 15552000) * 1000).toISOString(),
    granted_scope: data.scope ?? connection.granted_scope ?? null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('pixwiki_mp_connections').update(update).eq('id', connection.id)
  if (error) throw new Error('mp_refresh_persist_failed')
  if (connection.legacy_connection_id) {
    await supabase.from('mp_connections').update(update).eq('id', connection.legacy_connection_id)
  }
  return String(data.access_token)
}

async function notifyReceipt(supabase: any, receiptId: string) {
  try {
    const { data: secretRow } = await supabase
      .from('pixwiki_internal_secrets')
      .select('secret')
      .eq('key', 'notify_internal')
      .maybeSingle()
    if (!secretRow?.secret) return

    await fetch(`${SUPABASE_URL}/functions/v1/pixwiki-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pixwiki-internal-key': String(secretRow.secret),
      },
      body: JSON.stringify({ receipt_id: receiptId }),
    })
  } catch (error) {
    console.warn('[pixwiki-fast-watch] notify:', error instanceof Error ? error.message : error)
  }
}

async function markState(supabase: any, companyId: string, values: Record<string, unknown>) {
  await supabase
    .from('pixwiki_fast_watch_state')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  // verify_jwt=true valida a assinatura/expiração no gateway. Aqui só lemos o
  // `sub` já autenticado, evitando uma chamada extra ao Auth a cada ciclo.
  const userId = jwtSub(req)
  if (!userId) return json({ ok: false, error: 'unauthorized' }, 401)

  const startedAt = Date.now()
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  let companyId = ''

  try {
    const body = await req.json().catch(() => ({}))
    companyId = String(body?.company_id || '').trim()
    if (!companyId) return json({ ok: false, error: 'company_required' }, 400)

    const { data: acquired, error: acquireError } = await supabase.rpc('pixwiki_fast_watch_acquire', {
      p_company_id: companyId,
      p_user_id: userId,
      p_min_interval_ms: 1800,
    })
    if (acquireError) throw new Error(`fast_watch_acquire_failed:${acquireError.message}`)
    if (!acquired) {
      return json({ ok: true, throttled: true, new_count: 0, duration_ms: Date.now() - startedAt })
    }

    const { data: connection, error: connectionError } = await supabase
      .from('pixwiki_mp_connections')
      .select('id,company_id,user_id,legacy_connection_id,mp_user_id,access_token,refresh_token,expires_at,granted_scope,is_active')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (connectionError) throw connectionError
    if (!connection) {
      await markState(supabase, companyId, {
        last_finished_at: new Date().toISOString(),
        last_new_count: 0,
        last_error: 'mp_connection_required',
      })
      return json({ ok: true, skipped: true, reason: 'mp_connection_required', new_count: 0 })
    }

    const token = await validToken(supabase, connection)
    const now = new Date()
    const begin = new Date(now.getTime() - 5 * 60 * 1000)
    const search = new URL('https://api.mercadopago.com/v1/payments/search')
    search.searchParams.set('status', 'approved')
    search.searchParams.set('sort', 'date_last_updated')
    search.searchParams.set('criteria', 'desc')
    search.searchParams.set('range', 'date_last_updated')
    search.searchParams.set('begin_date', begin.toISOString())
    search.searchParams.set('end_date', now.toISOString())
    search.searchParams.set('limit', '20')
    search.searchParams.set('offset', '0')

    const response = await fetch(search, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`mp_search_failed:${response.status}`)

    const pixPayments = (Array.isArray(payload?.results) ? payload.results : [])
      .filter((payment: any) => payment?.status === 'approved' && payment?.payment_method_id === 'pix')

    const ids = pixPayments.map((payment: any) => String(payment.id || '')).filter(Boolean)
    if (!ids.length) {
      await markState(supabase, companyId, {
        last_finished_at: new Date().toISOString(), last_new_count: 0, last_error: null,
      })
      return json({ ok: true, new_count: 0, checked: 0, duration_ms: Date.now() - startedAt })
    }

    const [{ data: existing }, { data: linkTransactions }] = await Promise.all([
      supabase.from('mp_received_payments').select('mp_payment_id').in('mp_payment_id', ids),
      supabase.from('pix_transactions').select('txid').eq('company_id', companyId).in('txid', ids),
    ])

    const existingIds = new Set((existing || []).map((row: any) => String(row.mp_payment_id)))
    const linkIds = new Set((linkTransactions || []).map((row: any) => String(row.txid)))
    const newReceiptIds: string[] = []

    for (const payment of pixPayments) {
      const mpPaymentId = String(payment.id || '')
      if (!mpPaymentId || existingIds.has(mpPaymentId)) continue
      const amountCents = cents(payment.transaction_amount)
      if (!amountCents || amountCents <= 0) continue

      const netCents = cents(payment?.transaction_details?.net_received_amount)
      const feeFromDetails = Array.isArray(payment?.fee_details)
        ? payment.fee_details.reduce((sum: number, fee: any) => sum + (cents(fee?.amount) ?? 0), 0)
        : null
      const inferredFee = netCents !== null ? Math.max(0, amountCents - netCents) : 0
      const feeCents = feeFromDetails !== null && feeFromDetails > 0 ? feeFromDetails : inferredFee
      const finalNet = netCents ?? Math.max(0, amountCents - feeCents)
      const source = linkIds.has(mpPaymentId) ? 'pixwiki_link' : 'pix_key'

      const record = {
        mp_payment_id: mpPaymentId,
        user_id: userId,
        company_id: companyId,
        mp_connection_id: connection.id,
        amount_cents: amountCents,
        net_amount_cents: finalNet,
        fee_amount_cents: feeCents,
        currency: safeText(payment.currency_id) ?? 'BRL',
        status: safeText(payment.status) ?? 'approved',
        payment_method_id: safeText(payment.payment_method_id),
        payment_type_id: safeText(payment.payment_type_id),
        operation_type: safeText(payment.operation_type),
        interaction_type: safeText(payment?.point_of_interaction?.type),
        interaction_subtype: safeText(payment?.point_of_interaction?.sub_type),
        source,
        payer_bank: payerBank(payment),
        date_created: payment.date_created ?? null,
        date_approved: payment.date_approved ?? null,
        date_last_updated: payment.date_last_updated ?? null,
        provider_metadata: minimalMetadata(payment),
        notification_eligible: true,
        updated_at: new Date().toISOString(),
      }

      const { data: saved, error: insertError } = await supabase
        .from('mp_received_payments')
        .insert(record)
        .select('id')
        .single()

      if (insertError) {
        if ((insertError as any)?.code === '23505') continue
        throw insertError
      }
      if (!saved?.id) continue

      newReceiptIds.push(String(saved.id))
      existingIds.add(mpPaymentId)

      if (source === 'pix_key') {
        const { data: matchedIntent } = await supabase
          .from('pix_direct_intents')
          .select('id')
          .eq('matched_receipt_id', saved.id)
          .eq('product', 'pixwiki')
          .limit(1)
          .maybeSingle()

        if (matchedIntent?.id) {
          const { data: directLink } = await supabase
            .from('pix_transactions')
            .select('id')
            .eq('direct_intent_id', matchedIntent.id)
            .eq('origem', 'pixwiki_link_free')
            .limit(1)
            .maybeSingle()

          if (directLink?.id) {
            await supabase.from('mp_received_payments')
              .update({ source: 'pixwiki_link', updated_at: new Date().toISOString() })
              .eq('id', saved.id)
          }
        }
      }
    }

    await markState(supabase, companyId, {
      last_finished_at: new Date().toISOString(),
      last_new_count: newReceiptIds.length,
      last_error: null,
    })

    if (newReceiptIds.length) {
      const notificationTask = Promise.allSettled(
        newReceiptIds.map((receiptId) => notifyReceipt(supabase, receiptId)),
      )
      const edgeRuntime = (globalThis as any).EdgeRuntime
      if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(notificationTask)
      else void notificationTask
    }

    return json({
      ok: true,
      new_count: newReceiptIds.length,
      checked: pixPayments.length,
      duration_ms: Date.now() - startedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    console.error('[pixwiki-fast-watch]', message)
    if (companyId) {
      await markState(supabase, companyId, {
        last_finished_at: new Date().toISOString(),
        last_error: message.slice(0, 1000),
      })
    }
    return json({ ok: false, error: 'fast_watch_failed', message }, 502)
  }
})
