import { isInternalServiceRequest } from '../_shared/internal-service-auth.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const BANCO_INTER_API_KEY = Deno.env.get('BANCO_INTER_API_KEY') ?? ''
const INFINITEPAY_HANDLE = 'bigcorps'
const INFINITEPAY_BRIDGE_URL = 'https://checkout.bigcorps.com.br/redirect.html'
const INFINITEPAY_PAYMENT_CHECK_URL = 'https://api.checkout.infinitepay.io/payment_check'
const FUNCIONARIA_CARD_RETURN_URL = 'https://funcionaria.net/api/funcionaria/storefront-infinitepay/return'

function configuredSecret() {
  try {
    const parsed = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || 'null')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return ''
    const preferred = typeof parsed.default === 'string' ? parsed.default : ''
    if (preferred.startsWith('sb_secret_')) return preferred
    return Object.values(parsed).find((value) =>
      typeof value === 'string' && value.startsWith('sb_secret_')
    ) as string || ''
  } catch {
    return ''
  }
}

const ADMIN_KEY = configuredSecret() || SERVICE_ROLE

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers })
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
    .select('id,company_id,subtotal,desconto,total,status,delivery_requested,cliente_nome,cliente_telefone,cliente_email')
    .eq('id', checkout.pedido_id)
    .eq('company_id', checkout.company_id)
    .maybeSingle()

  if (!pedido) return null

  const { data: company } = await supabase
    .from('companies')
    .select('id,user_id,name,slug,delivery_auto_dispatch')
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

async function dispatchIfNeeded(supabase: any, pedido: any, company: any) {
  if (pedido?.delivery_requested !== true) return null
  if (company?.delivery_auto_dispatch !== true) {
    return { ok: true, skipped: 'auto_dispatch_disabled' }
  }

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

  const dispatch = await dispatchIfNeeded(supabase, loaded.pedido, loaded.company)
  return { settlement, dispatch }
}


function cleanOptional(value: unknown, max: number) {
  const text = String(value || '').trim().slice(0, max)
  return text || ''
}

function cardOrderNsu(checkoutId: string) {
  return `funcionaria-storefront-${checkoutId}`
}

function cardCheckoutUrl(loaded: any, amountCents: number) {
  const { checkout, pedido } = loaded
  const params = new URLSearchParams({
    valor_centavos: String(amountCents),
    order_id: cardOrderNsu(checkout.id),
    handle: INFINITEPAY_HANDLE,
    payment_method: 'credit',
    app: 'funcionaria',
    result_url: FUNCIONARIA_CARD_RETURN_URL,
  })

  const name = cleanOptional(pedido.cliente_nome, 120)
  const phone = String(pedido.cliente_telefone || '').replace(/\D/g, '').slice(0, 13)
  const email = cleanOptional(pedido.cliente_email, 160).toLowerCase()
  if (name) params.set('nome', name)
  if (phone) params.set('telefone', phone)
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) params.set('email', email)

  return `${INFINITEPAY_BRIDGE_URL}?${params.toString()}`
}

function cardPayload(payment: any, checkout: any) {
  return {
    success: true,
    status: checkout?.status === 'pago' || payment?.status === 'paid' ? 'paid' : String(payment?.status || 'pending'),
    payment_method: 'card',
    provider: 'infinitepay_bigcorps',
    checkout_id: checkout?.id || payment?.checkout_id || null,
    order_nsu: payment?.order_nsu || null,
    checkout_url: payment?.checkout_url || null,
    amount_cents: Number(payment?.expected_amount_cents || 0),
    provider_paid_amount_cents: Number(payment?.provider_paid_amount_cents || 0),
    provider_surcharge_cents: Number(payment?.provider_surcharge_cents || 0),
    can_reopen: payment?.status === 'pending' && !payment?.transaction_nsu,
    receipt_token: checkout?.status === 'pago' || payment?.status === 'paid' ? checkout?.receipt_token || null : null,
  }
}

async function cardPaymentByCheckout(supabase: any, checkoutId: string) {
  const { data, error } = await supabase
    .from('funcionaria_storefront_card_payments')
    .select('*')
    .eq('checkout_id', checkoutId)
    .maybeSingle()
  if (error) throw error
  return data || null
}

async function settleCard(supabase: any, loaded: any, payment: any) {
  if (!payment?.transaction_nsu) throw new Error('card_transaction_missing')

  const { data: settlement, error } = await supabase.rpc(
    'funcionaria_settle_storefront_commission',
    {
      p_pedido_id: loaded.pedido.id,
      p_checkout_id: loaded.checkout.id,
      p_provider: 'infinitepay_bigcorps',
      p_provider_reference: String(payment.transaction_nsu),
      p_payment_transaction_id: null,
      p_provider_fee_cents: 0,
      p_paid_at: payment.paid_at || new Date().toISOString(),
    },
  )
  if (error) throw error

  const dispatch = await dispatchIfNeeded(supabase, loaded.pedido, loaded.company)
  return { settlement, dispatch }
}

async function createCard(supabase: any, checkoutId: string) {
  const loaded = await loadCheckout(supabase, checkoutId)
  if (!loaded) return json({ error: 'checkout_not_found' }, 404)

  const { checkout, pedido } = loaded
  if (checkout.status === 'pago' || pedido.status === 'pago') {
    return json({
      success: true,
      status: 'paid',
      payment_method: 'card',
      checkout_id: checkout.id,
      receipt_token: checkout.receipt_token,
    })
  }
  if (checkout.status === 'cancelado' || checkout.status === 'expirado') {
    return json({ error: 'checkout_not_payable' }, 409)
  }

  const amountCents = centsFromBrl(pedido.total)
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return json({ error: 'invalid_order_total' }, 409)
  }

  const checkoutUrl = cardCheckoutUrl(loaded, amountCents)
  const { data, error } = await supabase.rpc('funcionaria_prepare_storefront_card', {
    p_checkout_id: checkout.id,
    p_expected_amount_cents: amountCents,
    p_checkout_url: checkoutUrl,
  })
  if (error) {
    const message = String(error.message || '')
    const code = [
      'checkout_expired','checkout_not_payable','payment_in_progress',
      'storefront_not_commission_mode','card_expected_amount_mismatch',
      'card_session_conflict',
    ].find((value) => message.includes(value))
    if (code) return json({ error: code }, code === 'checkout_expired' ? 410 : 409)
    throw error
  }

  const preparedStatus = String(data?.status || 'pending')
  const preparedOrderNsu = String(data?.order_nsu || cardOrderNsu(checkout.id))
  if (preparedStatus === 'paid') return await confirmCardByOrder(supabase, preparedOrderNsu)

  return json({
    success: true,
    status: preparedStatus,
    payment_method: 'card',
    provider: 'infinitepay_bigcorps',
    checkout_id: checkout.id,
    order_nsu: preparedOrderNsu,
    checkout_url: String(data?.checkout_url || checkoutUrl),
    amount_cents: amountCents,
    receipt_token: data?.receipt_token || null,
  })
}

async function loadCardByOrder(supabase: any, orderNsu: string) {
  const { data: payment, error } = await supabase
    .from('funcionaria_storefront_card_payments')
    .select('*')
    .eq('order_nsu', orderNsu)
    .maybeSingle()
  if (error) throw error
  if (!payment) return null
  const loaded = await loadCheckout(supabase, String(payment.checkout_id))
  if (!loaded) return null
  return { payment, loaded }
}

async function signalInfinitePay(
  supabase: any,
  orderNsu: string,
  transactionNsu: string,
  slug: string,
  receiptUrl?: string,
) {
  if (!/^funcionaria-storefront-[0-9a-f-]{36}$/i.test(orderNsu)) {
    return json({ error: 'invalid_order_nsu' }, 400)
  }
  if (!transactionNsu || transactionNsu.length > 255 || !slug || slug.length > 255) {
    return json({ error: 'invalid_provider_identifiers' }, 400)
  }

  const found = await loadCardByOrder(supabase, orderNsu)
  if (!found) return json({ error: 'card_payment_not_found' }, 404)
  const { payment, loaded } = found

  if (payment.status === 'paid') {
    return json({ ...cardPayload(payment, loaded.checkout), company_slug: loaded.company.slug })
  }

  if (payment.transaction_nsu && payment.transaction_nsu !== transactionNsu) {
    await supabase
      .from('funcionaria_storefront_card_payments')
      .update({ status: 'reconciliation_required', error_code: 'transaction_nsu_conflict' })
      .eq('id', payment.id)
    return json({ error: 'provider_reference_conflict' }, 409)
  }

  const { data: signaled, error } = await supabase
    .from('funcionaria_storefront_card_payments')
    .update({
      status: 'signaled',
      transaction_nsu: transactionNsu,
      invoice_slug: slug,
      receipt_url: cleanOptional(receiptUrl, 1000) || null,
      signaled_at: new Date().toISOString(),
      error_code: null,
    })
    .eq('id', payment.id)
    .in('status', ['pending', 'signaled', 'reconciliation_required'])
    .select('*')
    .maybeSingle()

  if (error || !signaled) throw error || new Error('card_signal_failed')
  return json({
    ...cardPayload(signaled, loaded.checkout),
    company_slug: loaded.company.slug,
    transaction_nsu: signaled.transaction_nsu,
    invoice_slug: signaled.invoice_slug,
  })
}

async function verifyInfinitePay(payment: any) {
  if (!payment?.transaction_nsu || !payment?.invoice_slug) {
    return { paid: false, reason: 'provider_identifiers_pending', data: null as any }
  }

  const response = await fetch(INFINITEPAY_PAYMENT_CHECK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handle: INFINITEPAY_HANDLE,
      order_nsu: payment.order_nsu,
      transaction_nsu: payment.transaction_nsu,
      slug: payment.invoice_slug,
    }),
    signal: AbortSignal.timeout(7000),
  })
  const data = await response.json().catch(() => null)

  if (!response.ok || !data?.success || data?.paid !== true) {
    return { paid: false, reason: 'pending', data }
  }

  const amount = Number(data.amount)
  const paidAmount = Number(data.paid_amount ?? data.amount)
  const installments = Number(data.installments || 1)
  const captureMethod = String(data.capture_method || '')

  if (!Number.isInteger(amount) || amount !== Number(payment.expected_amount_cents)) {
    return { paid: false, reason: 'amount_mismatch', data }
  }
  if (captureMethod !== 'credit_card') {
    return { paid: false, reason: 'capture_method_mismatch', data }
  }
  if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
    return { paid: false, reason: 'installments_invalid', data }
  }
  if (!Number.isFinite(paidAmount) || paidAmount <= amount) {
    return { paid: false, reason: 'fee_pass_through_not_confirmed', data }
  }

  return {
    paid: true,
    reason: 'paid',
    data,
    amount,
    paidAmount: Math.round(paidAmount),
    installments,
    captureMethod,
  }
}

async function confirmCardByOrder(supabase: any, orderNsu: string) {
  const found = await loadCardByOrder(supabase, orderNsu)
  if (!found) return json({ error: 'card_payment_not_found' }, 404)
  let { payment, loaded } = found

  if (loaded.checkout.status === 'pago' || loaded.pedido.status === 'pago') {
    return json({
      ...cardPayload({ ...payment, status: 'paid' }, { ...loaded.checkout, status: 'pago' }),
      company_slug: loaded.company.slug,
    })
  }

  if (payment.status === 'paid') {
    const settled = await settleCard(supabase, loaded, payment)
    const refreshed = await loadCheckout(supabase, loaded.checkout.id)
    return json({
      ...cardPayload(payment, { ...(refreshed?.checkout || loaded.checkout), status: 'pago' }),
      settlement: settled.settlement,
      dispatch: settled.dispatch,
      company_slug: loaded.company.slug,
    })
  }

  const verified = await verifyInfinitePay(payment)
  if (!verified.paid) {
    if (['amount_mismatch','capture_method_mismatch','installments_invalid','fee_pass_through_not_confirmed'].includes(verified.reason)) {
      await supabase
        .from('funcionaria_storefront_card_payments')
        .update({ status: 'reconciliation_required', error_code: verified.reason })
        .eq('id', payment.id)
      return json({ error: verified.reason, status: 'reconciliation_required', company_slug: loaded.company.slug }, 409)
    }
    return json({
      ...cardPayload(payment, loaded.checkout),
      status: 'pending',
      company_slug: loaded.company.slug,
    })
  }

  const paidAt = new Date().toISOString()
  const { data: marked, error } = await supabase
    .from('funcionaria_storefront_card_payments')
    .update({
      status: 'paid',
      capture_method: verified.captureMethod,
      installments: verified.installments,
      provider_amount_cents: verified.amount,
      provider_paid_amount_cents: verified.paidAmount,
      provider_surcharge_cents: verified.paidAmount - verified.amount,
      verified_at: paidAt,
      paid_at: paidAt,
      error_code: null,
    })
    .eq('id', payment.id)
    .in('status', ['pending', 'signaled'])
    .select('*')
    .maybeSingle()

  if (error) throw error
  payment = marked || { ...payment, status: 'paid', paid_at: paidAt,
    provider_amount_cents: verified.amount, provider_paid_amount_cents: verified.paidAmount,
    provider_surcharge_cents: verified.paidAmount - verified.amount,
    capture_method: verified.captureMethod, installments: verified.installments }

  const settled = await settleCard(supabase, loaded, payment)
  const refreshed = await loadCheckout(supabase, loaded.checkout.id)
  return json({
    ...cardPayload(payment, { ...(refreshed?.checkout || loaded.checkout), status: 'pago' }),
    settlement: settled.settlement,
    dispatch: settled.dispatch,
    company_slug: loaded.company.slug,
  })
}

async function storefrontStatus(supabase: any, checkoutId: string) {
  const loaded = await loadCheckout(supabase, checkoutId)
  if (!loaded) return json({ error: 'checkout_not_found' }, 404)

  if (loaded.checkout.status === 'pago' || loaded.pedido.status === 'pago') {
    return json({
      success: true,
      status: 'paid',
      checkout_id: loaded.checkout.id,
      receipt_token: loaded.checkout.receipt_token,
    })
  }

  const card = await cardPaymentByCheckout(supabase, checkoutId)
  if (card) return await confirmCardByOrder(supabase, String(card.order_nsu))

  return await checkPix(supabase, checkoutId)
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
  if (checkout.card_provider || checkout.cash_requested_at) {
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
  if (!isInternalServiceRequest(req)) return json({ error: 'unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, ADMIN_KEY)

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

    if (action === 'create_card') {
      const checkoutId = String(body.checkout_id || '')
      if (!checkoutId) return json({ error: 'checkout_id_required' }, 400)
      return await createCard(supabase, checkoutId)
    }

    if (action === 'signal_infinitepay') {
      return await signalInfinitePay(
        supabase,
        String(body.order_nsu || ''),
        String(body.transaction_nsu || ''),
        String(body.slug || ''),
        String(body.receipt_url || ''),
      )
    }

    if (action === 'confirm_card') {
      const orderNsu = String(body.order_nsu || '')
      if (!orderNsu) return json({ error: 'order_nsu_required' }, 400)
      return await confirmCardByOrder(supabase, orderNsu)
    }

    if (action === 'status') {
      const checkoutId = String(body.checkout_id || '')
      if (!checkoutId) return json({ error: 'checkout_id_required' }, 400)
      return await storefrontStatus(supabase, checkoutId)
    }

    return json({ error: 'invalid_action' }, 400)
  } catch (error) {
    console.error('[funcionaria-storefront-payments]', error)
    return json({ error: error instanceof Error ? error.message : 'internal_error' }, 500)
  }
})