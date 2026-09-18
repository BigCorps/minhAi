import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BANCO_INTER_API_KEY = Deno.env.get('BANCO_INTER_API_KEY') ?? ''

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers })
}

function isInternal(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  return !!SERVICE_ROLE && auth === `Bearer ${SERVICE_ROLE}`
}

function centsFromBrl(value: unknown) {
  return Math.round(Number(value || 0) * 100)
}

async function billingCompany(supabase: any) {
  const { data, error } = await supabase
    .from('companies')
    .select('id,user_id,name,receiving_pix_key,receiving_pix_key_type')
    .eq('name', 'Gerente BigCorps')
    .eq('email_contato', 'contato@bigcorps.com.br')
    .limit(1)
    .maybeSingle()

  if (error || !data) throw new Error('billing_company_not_found')
  if (!String(data.receiving_pix_key || '').trim()) throw new Error('billing_pix_key_not_configured')
  return data
}

async function generatePix(amountCents: number, label: string, pixKey: string) {
  if (!BANCO_INTER_API_KEY) throw new Error('banco_inter_not_configured')

  const response = await fetch('https://inter.btsolucao.com.br/cob.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BANCO_INTER_API_KEY}`,
    },
    body: JSON.stringify({
      amount: { original: (amountCents / 100).toFixed(2) },
      expiresIn: 1800,
      displayText: label.slice(0, 120),
      modalidadeAlteracao: 0,
      chave: pixKey,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.txid || !data?.pixCopiaECola) {
    console.error('[funcionaria-storefront-payments] Inter create:', data)
    throw new Error('pix_create_failed')
  }

  return data
}

async function checkInter(txid: string) {
  if (!BANCO_INTER_API_KEY) throw new Error('banco_inter_not_configured')

  const response = await fetch(
    `https://inter.btsolucao.com.br/get.php?txid=${encodeURIComponent(txid)}`,
    {
      headers: {
        Authorization: `Bearer ${BANCO_INTER_API_KEY}`,
        Accept: 'application/json',
      },
    },
  )

  const raw = await response.json().catch(() => ({}))
  if (!response.ok) return { paid: false, raw }

  const data = raw?.data || raw
  const status = String(data?.status || '').toUpperCase()
  const paid = ['CONCLUIDA', 'PAGO', 'REALIZADO', 'CONCLUIDO'].includes(status)
  const amount = Number(data?.valor ?? data?.amount?.original ?? 0)
  const paidAt = data?.datapagamento || data?.horario || data?.paid_at || new Date().toISOString()

  return { paid, amount, paidAt, raw }
}

async function loadCheckout(supabase: any, checkoutId: string) {
  const { data: checkout } = await supabase
    .from('funcionaria_checkouts')
    .select('*')
    .eq('id', checkoutId)
    .eq('origem', 'storefront')
    .maybeSingle()

  if (!checkout) return null

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id,company_id,subtotal,desconto,total,status,delivery_requested')
    .eq('id', checkout.pedido_id)
    .eq('company_id', checkout.company_id)
    .maybeSingle()

  if (!pedido) return null

  const { data: company } = await supabase
    .from('companies')
    .select('id,user_id,name,delivery_auto_dispatch')
    .eq('id', checkout.company_id)
    .maybeSingle()

  if (!company) return null

  return { checkout, pedido, company }
}

async function existingPix(supabase: any, checkout: any) {
  if (!checkout?.pix_transaction_id) return null

  const { data } = await supabase
    .from('pix_transactions')
    .select('*')
    .eq('id', checkout.pix_transaction_id)
    .maybeSingle()

  return data || null
}

function paymentPayload(tx: any, checkout: any) {
  return {
    success: true,
    status: checkout.status === 'pago' ? 'paid' : String(tx?.status || 'pending'),
    checkout_id: checkout.id,
    transaction_id: tx?.id || null,
    pix_code: tx?.pix_code || null,
    qr_code_url: tx?.qr_code_url || null,
    amount_cents: Number(tx?.amount_cents || 0),
    expires_at: tx?.expires_at || checkout.expires_at,
    receipt_token: checkout.status === 'pago' ? checkout.receipt_token : null,
  }
}

async function dispatchIfNeeded(supabase: any, pedido: any) {
  if (pedido?.delivery_requested !== true) return null

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/lalamove-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({
        action: 'order',
        company_id: pedido.company_id,
        pedido_id: pedido.id,
      }),
    })
    const data = await response.json().catch(() => ({}))
    return { ok: response.ok, data }
  } catch (error) {
    console.error('[funcionaria-storefront-payments] delivery dispatch:', error)
    return { ok: false, data: { error: 'dispatch_request_failed' } }
  }
}

async function settlePix(supabase: any, loaded: any, tx: any, paidAt: string) {
  const feeBps = Math.max(0, Number(Deno.env.get('FUNCIONARIA_INTER_FEE_BPS') ?? '0'))
  const fixedFee = Math.max(0, Number(Deno.env.get('FUNCIONARIA_INTER_FEE_CENTS') ?? '0'))
  const providerFee = Math.max(
    0,
    Math.round(Number(tx.amount_cents || 0) * feeBps / 10000) + fixedFee,
  )

  const { data: settlement, error } = await supabase.rpc(
    'funcionaria_settle_storefront_commission',
    {
      p_pedido_id: loaded.pedido.id,
      p_checkout_id: loaded.checkout.id,
      p_provider: 'inter_bigcorps',
      p_provider_reference: String(tx.txid || tx.id),
      p_payment_transaction_id: tx.id,
      p_provider_fee_cents: providerFee,
      p_paid_at: paidAt,
    },
  )

  if (error) throw error

  const dispatch = await dispatchIfNeeded(supabase, loaded.pedido)
  return { settlement, dispatch }
}

async function createPix(supabase: any, checkoutId: string) {
  const loaded = await loadCheckout(supabase, checkoutId)
  if (!loaded) return json({ error: 'checkout_not_found' }, 404)

  const { checkout, pedido, company } = loaded

  if (checkout.status === 'pago' || pedido.status === 'pago') {
    return json({
      success: true,
      status: 'paid',
      checkout_id: checkout.id,
      receipt_token: checkout.receipt_token,
    })
  }

  if (checkout.status === 'cancelado' || checkout.status === 'expirado') {
    return json({ error: 'checkout_not_payable' }, 409)
  }

  if (checkout.expires_at && new Date(checkout.expires_at).getTime() <= Date.now()) {
    await supabase
      .from('funcionaria_checkouts')
      .update({ status: 'expirado', updated_at: new Date().toISOString() })
      .eq('id', checkout.id)
      .in('status', ['aguardando_pagamento', 'em_pagamento'])

    return json({ error: 'checkout_expired' }, 410)
  }

  const existing = await existingPix(supabase, checkout)
  if (existing?.status === 'pending') {
    return json(paymentPayload(existing, checkout))
  }
  if (existing?.status === 'confirmed') {
    const result = await settlePix(
      supabase,
      loaded,
      existing,
      existing.confirmed_at || new Date().toISOString(),
    )
    return json({
      ...paymentPayload(existing, { ...checkout, status: 'pago' }),
      settlement: result.settlement,
      dispatch: result.dispatch,
    })
  }

  if (!['aguardando_pagamento', 'em_pagamento'].includes(String(checkout.status || ''))) {
    return json({ error: 'payment_in_progress' }, 409)
  }

  const amountCents = centsFromBrl(pedido.total)
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return json({ error: 'invalid_order_total' }, 409)
  }

  const billing = await billingCompany(supabase)
  const pixKey = String(billing.receiving_pix_key || '').trim()
  const pix = await generatePix(
    amountCents,
    `FuncionarIA - ${company.name} - pedido ${String(pedido.id).slice(0, 8)}`,
    pixKey,
  )

  const expiresAt = new Date(
    Math.min(
      new Date(checkout.expires_at).getTime(),
      Date.now() + 30 * 60_000,
    ),
  ).toISOString()

  const qrCodeUrl =
    pix.qrcode ||
    `https://www.minhai.app/api/qrcode?size=400&data=${encodeURIComponent(String(pix.pixCopiaECola))}&color=%236D28D9`

  const { data: tx, error: txError } = await supabase
    .from('pix_transactions')
    .insert({
      company_id: pedido.company_id,
      user_id: company.user_id,
      pedido_id: pedido.id,
      txid: String(pix.txid),
      pix_code: String(pix.pixCopiaECola),
      qr_code_url: qrCodeUrl,
      amount_cents: amountCents,
      original_amount_cents: amountCents,
      discount_cents: 0,
      destination_pix_key: pixKey,
      destination_pix_key_type: billing.receiving_pix_key_type || null,
      status: 'pending',
      expires_at: expiresAt,
      requested_by_voice: false,
      purpose: 'payment',
      payment_provider: 'bigcorps',
      origem: 'funcionaria_storefront_commission',
      referencia_id: checkout.id,
      notes: `FuncionarIA storefront commission ${checkout.codigo}`,
    })
    .select('*')
    .single()

  if (txError || !tx) {
    console.error('[funcionaria-storefront-payments] transaction:', txError?.message)
    return json({ error: 'transaction_create_failed' }, 500)
  }

  const { data: locked } = await supabase
    .from('funcionaria_checkouts')
    .update({
      status: 'em_pagamento',
      metodo_pagamento: 'pix',
      pix_transaction_id: tx.id,
      pix_payment_mode: 'commission',
      updated_at: new Date().toISOString(),
    })
    .eq('id', checkout.id)
    .in('status', ['aguardando_pagamento', 'em_pagamento'])
    .is('card_provider', null)
    .is('cash_requested_at', null)
    .select('*')
    .maybeSingle()

  if (!locked) {
    await supabase
      .from('pix_transactions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', tx.id)
      .eq('status', 'pending')

    return json({ error: 'payment_in_progress' }, 409)
  }

  return json(paymentPayload(tx, locked))
}

async function checkPix(supabase: any, checkoutId: string, transactionId?: string) {
  let loaded = checkoutId ? await loadCheckout(supabase, checkoutId) : null

  let tx: any = null
  if (transactionId) {
    const { data } = await supabase
      .from('pix_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('origem', 'funcionaria_storefront_commission')
      .maybeSingle()
    tx = data || null

    if (!loaded && tx?.referencia_id) {
      loaded = await loadCheckout(supabase, String(tx.referencia_id))
    }
  } else if (loaded) {
    tx = await existingPix(supabase, loaded.checkout)
  }

  if (!loaded) return json({ error: 'checkout_not_found' }, 404)
  if (!tx) {
    if (loaded.checkout.status === 'pago' || loaded.pedido.status === 'pago') {
      return json({
        success: true,
        status: 'paid',
        checkout_id: loaded.checkout.id,
        receipt_token: loaded.checkout.receipt_token,
      })
    }
    return json({ success: true, status: 'not_started' })
  }

  if (tx.status === 'confirmed') {
    const result = await settlePix(
      supabase,
      loaded,
      tx,
      tx.confirmed_at || new Date().toISOString(),
    )
    return json({
      ...paymentPayload(tx, { ...loaded.checkout, status: 'pago' }),
      settlement: result.settlement,
      dispatch: result.dispatch,
    })
  }

  if (tx.status !== 'pending') {
    return json({ success: true, status: tx.status })
  }

  if (tx.expires_at && new Date(tx.expires_at).getTime() <= Date.now()) {
    await supabase
      .from('pix_transactions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', tx.id)
      .eq('status', 'pending')

    await supabase
      .from('funcionaria_checkouts')
      .update({ status: 'expirado', updated_at: new Date().toISOString() })
      .eq('id', loaded.checkout.id)
      .eq('status', 'em_pagamento')

    return json({ success: true, status: 'expired' })
  }

  const result = await checkInter(String(tx.txid || ''))
  if (!result.paid) {
    return json(paymentPayload(tx, loaded.checkout))
  }

  const expected = Number(tx.amount_cents || 0) / 100
  if (
    Number.isFinite(result.amount) &&
    result.amount > 0 &&
    Math.abs(result.amount - expected) > 0.01
  ) {
    return json({ error: 'paid_amount_mismatch' }, 409)
  }

  const paidAt = new Date(result.paidAt || Date.now()).toISOString()

  const { data: confirmed } = await supabase
    .from('pix_transactions')
    .update({
      status: 'confirmed',
      confirmed_at: paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tx.id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  const effectiveTx = confirmed || { ...tx, status: 'confirmed', confirmed_at: paidAt }
  const settled = await settlePix(supabase, loaded, effectiveTx, paidAt)

  return json({
    ...paymentPayload(effectiveTx, { ...loaded.checkout, status: 'pago' }),
    settlement: settled.settlement,
    dispatch: settled.dispatch,
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!isInternal(req)) return json({ error: 'unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const action = String(body.action || '')

    if (action === 'create_pix') {
      const checkoutId = String(body.checkout_id || '')
      if (!checkoutId) return json({ error: 'checkout_id_required' }, 400)
      return await createPix(supabase, checkoutId)
    }

    if (action === 'check_pix') {
      const checkoutId = String(body.checkout_id || '')
      const transactionId = String(body.transaction_id || '')
      if (!checkoutId && !transactionId) {
        return json({ error: 'checkout_or_transaction_required' }, 400)
      }
      return await checkPix(supabase, checkoutId, transactionId || undefined)
    }

    return json({ error: 'invalid_action' }, 400)
  } catch (error) {
    console.error('[funcionaria-storefront-payments]', error)
    return json({ error: error instanceof Error ? error.message : 'internal_error' }, 500)
  }
})
