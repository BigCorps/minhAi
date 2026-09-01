import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MP_CLIENT_ID = Deno.env.get('ML_APP_ID')!
const MP_CLIENT_SECRET = Deno.env.get('ML_APP_SECRET')!
const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

async function getValidMercadoPagoToken(supabase: any, connection: any) {
  const expiresAt = new Date(connection.expires_at).getTime()
  const refreshMarginMs = 7 * 24 * 60 * 60 * 1000
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + refreshMarginMs) return connection.access_token
  if (!connection.refresh_token) throw new Error('mp_refresh_unavailable')

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
  if (connection.legacy_connection_id) await supabase.from('mp_connections').update(update).eq('id', connection.legacy_connection_id)
  return data.access_token
}

async function runPixWikiSync(supabase: any, companyId: string, connectionId: string) {
  const { data: secretRow } = await supabase.from('pixwiki_internal_secrets').select('secret').eq('key', 'sync_cron').maybeSingle()
  if (!secretRow?.secret) return
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/pixwiki-sync-mp-receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pixwiki-cron-key': String(secretRow.secret) },
      body: JSON.stringify({ company_id: companyId, connection_id: connectionId }),
    })
  } catch (error) {
    console.warn('[pixwiki-confirm-payment] sync complementar falhou:', error)
  }
}

async function reconcileDirect(transactionId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/pix-direct-reconcile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify({ transaction_id: transactionId }),
  })
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: jsonHeaders })
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const body = await req.json().catch(() => ({}))
    const transactionId = String(body?.transaction_id ?? '')
    if (!transactionId) return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: jsonHeaders })

    const { data: providerTx, error: txError } = await supabase.from('pix_transactions')
      .select('id,company_id,user_id,txid,status,amount_cents,original_amount_cents,discount_cents,payment_provider,direct_intent_id,confirmed_at')
      .eq('id', transactionId)
      .eq('origem', 'pixwiki_link')
      .maybeSingle()

    let tx: any = providerTx
    if (!tx && !txError) {
      const { data: directTx } = await supabase.from('pix_transactions')
        .select('id,company_id,user_id,txid,status,amount_cents,original_amount_cents,discount_cents,payment_provider,direct_intent_id,confirmed_at')
        .eq('id', transactionId)
        .eq('origem', 'pixwiki_link_free')
        .maybeSingle()
      tx = directTx
    }

    if (txError || !tx) return new Response(JSON.stringify({ error: 'transaction_not_found' }), { status: 404, headers: jsonHeaders })

    const responsePayload = (row: any) => ({
      success: true,
      status: 'confirmed',
      amount_brl: (Number(row.amount_cents || 0) / 100).toFixed(2),
      original_amount_brl: (Number(row.original_amount_cents ?? row.amount_cents ?? 0) / 100).toFixed(2),
      discount_cents: Number(row.discount_cents || 0),
      payment_provider: row.payment_provider,
      payment_mode: row.payment_provider === 'pix_direct' ? 'free' : 'mercadopago',
      confirmed_at: row.confirmed_at,
    })

    if (tx.status === 'confirmed') return new Response(JSON.stringify(responsePayload(tx)), { headers: jsonHeaders })

    const { data: settings } = await supabase.from('pixwiki_payment_settings')
      .select('mp_connection_id')
      .eq('company_id', tx.company_id)
      .eq('user_id', tx.user_id)
      .maybeSingle()
    if (!settings?.mp_connection_id) return new Response(JSON.stringify({ error: 'mp_connection_required' }), { status: 409, headers: jsonHeaders })

    if (tx.payment_provider === 'pix_direct') {
      const { response, data: match } = await reconcileDirect(tx.id)

      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: match?.error || 'direct_reconcile_failed',
          message: match?.message,
        }), { status: response.status, headers: jsonHeaders })
      }

      if (!match?.matched || !match?.provider_payment_id) {
        return new Response(JSON.stringify({ success: false, status: 'pending', error: 'payment_not_confirmed' }), { status: 400, headers: jsonHeaders })
      }

      const approvedAt = match.paid_at || new Date().toISOString()
      const { data: updated, error: updateError } = await supabase.from('pix_transactions')
        .update({ status: 'confirmed', confirmed_at: approvedAt, updated_at: new Date().toISOString() })
        .eq('id', tx.id)
        .eq('status', 'pending')
        .select('id,status,amount_cents,original_amount_cents,discount_cents,payment_provider,direct_intent_id,confirmed_at')
        .maybeSingle()
      if (updateError) throw updateError

      await runPixWikiSync(supabase, tx.company_id, settings.mp_connection_id)

      if (tx.direct_intent_id) {
        const { data: receipt } = await supabase.from('mp_received_payments')
          .select('id')
          .eq('mp_connection_id', settings.mp_connection_id)
          .eq('mp_payment_id', String(match.provider_payment_id))
          .limit(1)
          .maybeSingle()

        if (receipt?.id) {
          await supabase.from('pix_direct_intents')
            .update({ matched_receipt_id: receipt.id, updated_at: new Date().toISOString() })
            .eq('id', tx.direct_intent_id)
            .is('matched_receipt_id', null)
        }
      }

      return new Response(JSON.stringify(responsePayload(updated ?? {
        ...tx,
        status: 'confirmed',
        confirmed_at: approvedAt,
      })), { headers: jsonHeaders })
    }

    if (tx.payment_provider !== 'mercadopago' || !tx.txid) {
      return new Response(JSON.stringify({ error: 'unsupported_provider' }), { status: 409, headers: jsonHeaders })
    }

    const { data: connection, error: connectionError } = await supabase.from('pixwiki_mp_connections')
      .select('id,user_id,company_id,legacy_connection_id,access_token,refresh_token,expires_at,granted_scope,is_active')
      .eq('id', settings.mp_connection_id)
      .eq('company_id', tx.company_id)
      .eq('user_id', tx.user_id)
      .eq('is_active', true)
      .maybeSingle()
    if (connectionError || !connection) return new Response(JSON.stringify({ error: 'mp_connection_required' }), { status: 409, headers: jsonHeaders })

    const token = await getValidMercadoPagoToken(supabase, connection)
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(tx.txid))}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const payment = await paymentResponse.json().catch(() => ({}))
    if (!paymentResponse.ok) return new Response(JSON.stringify({ error: 'payment_lookup_failed' }), { status: 502, headers: jsonHeaders })

    if (payment?.status !== 'approved') {
      return new Response(JSON.stringify({ success: false, status: payment?.status ?? 'pending', error: 'payment_not_confirmed' }), { status: 400, headers: jsonHeaders })
    }

    const approvedAt = payment.date_approved ?? new Date().toISOString()
    const { data: updated, error: updateError } = await supabase.from('pix_transactions')
      .update({ status: 'confirmed', confirmed_at: approvedAt, updated_at: new Date().toISOString() })
      .eq('id', tx.id)
      .eq('status', 'pending')
      .select('id,status,amount_cents,original_amount_cents,discount_cents,payment_provider,confirmed_at')
      .maybeSingle()
    if (updateError) throw updateError

    await runPixWikiSync(supabase, tx.company_id, settings.mp_connection_id)
    return new Response(JSON.stringify(responsePayload(updated ?? { ...tx, status: 'confirmed', confirmed_at: approvedAt })), { headers: jsonHeaders })
  } catch (error) {
    console.error('[pixwiki-confirm-payment]', error instanceof Error ? error.message : error)
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: jsonHeaders })
  }
})
