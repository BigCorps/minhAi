import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers }) }
function normalizeCode(v: unknown) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }

async function getUser(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const auth = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await auth.auth.getUser(token)
  return error ? null : data.user || null
}

async function accessCompany(supabase: any, userId: string, companyId: string) {
  const { data: company } = await supabase
    .from('companies')
    .select('id,user_id,name,slug,mp_access_token,mp_terminal_id,infinitepay_handle')
    .eq('id', companyId).maybeSingle()
  if (!company) return null
  if (company.user_id === userId) return company
  const { data: admin } = await supabase.from('company_admins').select('role').eq('company_id', companyId).eq('user_id', userId).maybeSingle()
  return admin && ['owner','manager'].includes(String(admin.role)) ? company : null
}

async function hasCheckoutSkill(supabase: any, companyId: string) {
  const { data } = await supabase.from('funcionaria_company_skills').select('status').eq('company_id', companyId).eq('skill_key', 'checkout_payments').maybeSingle()
  return !!data && ['active','cancel_pending'].includes(String(data.status))
}

async function loadCheckout(supabase: any, code: string) {
  const { data: checkout } = await supabase.from('funcionaria_checkouts').select('*').eq('codigo', code).maybeSingle()
  if (!checkout) return null
  const { data: pedido } = await supabase.from('pedidos').select('id,total,status').eq('id', checkout.pedido_id).maybeSingle()
  if (!pedido) return null
  return { checkout, pedido }
}

async function mpSettings(supabase: any, companyId: string) {
  const { data } = await supabase.from('company_function_settings').select('config').eq('company_id', companyId).eq('function_key', 'tef_credito').maybeSingle()
  return {
    maxInstallments: Number(data?.config?.max_installments || 12),
    minInstallmentValueCents: Number(data?.config?.min_installment_value_cents || 0),
    installmentsCost: String(data?.config?.installments_cost || 'seller'),
  }
}

async function capabilities(supabase: any, company: any) {
  const hasMp = !!company.mp_access_token && !!company.mp_terminal_id
  const hasInfinite = !!company.infinitepay_handle
  const mp = await mpSettings(supabase, company.id)
  return {
    debit: hasMp ? { enabled: true, provider: 'mp_point' } : hasInfinite ? { enabled: true, provider: 'infinitepay' } : { enabled: false, provider: null },
    credit: hasMp ? { enabled: true, provider: 'mp_point', max_installments: mp.maxInstallments, min_installment_value_cents: mp.minInstallmentValueCents } : hasInfinite ? { enabled: true, provider: 'infinitepay', max_installments: 1 } : { enabled: false, provider: null },
  }
}

async function createMp(supabase: any, company: any, checkout: any, pedido: any, payment: 'debit'|'credit', installments: number) {
  const settings = await mpSettings(supabase, company.id)
  if (payment === 'credit') {
    if (installments < 1 || installments > settings.maxInstallments) throw new Error('invalid_installments')
    if (settings.minInstallmentValueCents > 0 && Math.ceil(Math.round(Number(pedido.total) * 100) / installments) < settings.minInstallmentValueCents) throw new Error('installment_value_too_low')
  }
  const amountCents = Math.round(Number(pedido.total) * 100)
  const externalReference = `funcionaria-${checkout.id}-${Date.now()}`
  const paymentType = payment === 'credit' ? 'credit_card' : 'debit_card'
  const orderBody: any = {
    type: 'point',
    external_reference: externalReference,
    expiration_time: 'PT2M',
    transactions: { payments: [{ amount: (amountCents / 100).toFixed(2) }] },
    config: {
      point: { terminal_id: String(company.mp_terminal_id).trim(), print_on_terminal: 'seller_ticket' },
      payment_method: { default_type: paymentType },
    },
    description: `FuncionarIA ${checkout.codigo} - ${company.name}`,
  }
  if (payment === 'credit' && installments > 1) {
    orderBody.config.payment_method = {
      default_type: paymentType,
      default_installments: installments,
      installments_cost: settings.installmentsCost,
    }
  }
  const response = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${String(company.mp_access_token).trim()}`,
      'X-Idempotency-Key': externalReference,
    },
    body: JSON.stringify(orderBody),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.id) throw new Error(data?.message || 'mp_order_failed')
  const { data: locked } = await supabase.from('funcionaria_checkouts').update({
    status: 'em_pagamento',
    metodo_pagamento: 'tef',
    card_provider: 'mp_point',
    card_reference_id: String(data.id),
    metadata: { ...(checkout.metadata || {}), card_payment_type: payment, card_installments: installments, card_external_reference: externalReference },
    updated_at: new Date().toISOString(),
  }).eq('id', checkout.id).eq('status', 'aguardando_pagamento').is('pix_transaction_id', null).is('card_provider', null).is('cash_requested_at', null).select('id').maybeSingle()
  if (!locked) {
    await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(String(data.id))}`, { method: 'DELETE', headers: { Authorization: `Bearer ${String(company.mp_access_token).trim()}` } }).catch(() => null)
    throw new Error('payment_in_progress')
  }
  return { success: true, provider: 'mp_point', status: 'awaiting', reference_id: String(data.id), amount_cents: amountCents, installments }
}

async function createInfinite(supabase: any, company: any, checkout: any, pedido: any, payment: 'debit'|'credit') {
  const amountCents = Math.round(Number(pedido.total) * 100)
  const handle = String(company.infinitepay_handle || '').replace(/^\$/,'')
  const orderId = `funcionaria-${checkout.id}-${Date.now()}`
  const resultUrl = `https://funcionaria.net/terminal?codigo=${checkout.codigo}`
  const params = new URLSearchParams({
    amount: String(amountCents),
    payment_method: payment,
    installments: '1',
    order_id: orderId,
    result_url: resultUrl,
    app_client_referrer: handle,
  })
  const deepLink = `https://infinitepay.onelink.me/JmLI/infinitetapapp?${params.toString()}`
  const { data: locked } = await supabase.from('funcionaria_checkouts').update({
    status: 'em_pagamento',
    metodo_pagamento: 'nfc',
    card_provider: 'infinitepay',
    card_reference_id: orderId,
    metadata: { ...(checkout.metadata || {}), card_payment_type: payment, card_installments: 1, infinitepay_link: deepLink },
    updated_at: new Date().toISOString(),
  }).eq('id', checkout.id).eq('status', 'aguardando_pagamento').is('pix_transaction_id', null).is('card_provider', null).is('cash_requested_at', null).select('id').maybeSingle()
  if (!locked) throw new Error('payment_in_progress')
  return { success: true, provider: 'infinitepay', status: 'awaiting', reference_id: orderId, deep_link: deepLink, amount_cents: amountCents, installments: 1 }
}

async function checkMp(supabase: any, company: any, checkout: any) {
  const orderId = String(checkout.card_reference_id || '')
  if (!orderId) return { status: 'pending' }
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${String(company.mp_access_token).trim()}` },
  })
  const data = await response.json().catch(() => ({}))
  const status = String(data?.status || '').toLowerCase()
  if (['processed','partially_processed'].includes(status)) {
    const paymentId = data?.transactions?.payments?.[0]?.id ? String(data.transactions.payments[0].id) : orderId
    const { data: result, error } = await supabase.rpc('funcionaria_finalize_nonpix_payment', {
      p_checkout_id: checkout.id,
      p_method: 'tef',
      p_provider: 'mp_point',
      p_provider_reference: paymentId,
      p_paid_at: new Date().toISOString(),
    })
    if (error) throw error
    return { status: 'paid', ...result }
  }
  if (['cancelled','expired','rejected'].includes(status)) {
    await supabase.from('funcionaria_checkouts').update({ status: 'aguardando_pagamento', metodo_pagamento: null, card_provider: null, card_reference_id: null, updated_at: new Date().toISOString() }).eq('id', checkout.id)
    return { status: 'cancelled' }
  }
  return { status: 'pending', provider_status: status || 'unknown' }
}

async function checkInfinite(supabase: any, checkout: any) {
  const orderId = String(checkout.card_reference_id || '')
  if (!orderId) return { status: 'pending' }
  let paid = false
  try {
    const response = await fetch(`https://checkout.bigcorps.com.br/api/verificar-por-ordem?order_id=${encodeURIComponent(orderId)}`, { signal: AbortSignal.timeout(5000) })
    if (response.ok) {
      const data = await response.json()
      paid = ['paid','approved','success'].includes(String(data?.status || '').toLowerCase())
    }
  } catch {}
  if (!paid) {
    const { data } = await supabase.from('payment_status').select('status').eq('order_id', orderId).maybeSingle()
    paid = !!data && ['paid','approved','success'].includes(String(data.status || '').toLowerCase())
  }
  if (!paid) return { status: 'pending' }
  const { data: result, error } = await supabase.rpc('funcionaria_finalize_nonpix_payment', {
    p_checkout_id: checkout.id,
    p_method: 'nfc',
    p_provider: 'infinitepay',
    p_provider_reference: orderId,
    p_paid_at: new Date().toISOString(),
  })
  if (error) throw error
  return { status: 'paid', ...result }
}


async function hasPendingPix(supabase: any, checkout: any) {
  if (!checkout.pix_transaction_id) return false
  const { data } = await supabase.from('pix_transactions').select('status').eq('id', checkout.pix_transaction_id).maybeSingle()
  return data?.status === 'pending'
}

function cashLocked(checkout: any) {
  return ['aguardando_dinheiro', 'aguardando_troco'].includes(String(checkout.status)) || !!checkout.cash_requested_at || checkout.metodo_pagamento === 'dinheiro'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const user = await getUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const action = String(body.action || 'availability')
    const code = normalizeCode(body.codigo)
    if (code.length !== 8) return json({ error: 'invalid_code' }, 400)
    const loaded = await loadCheckout(supabase, code)
    if (!loaded) return json({ error: 'checkout_not_found' }, 404)
    const { checkout, pedido } = loaded
    const company = await accessCompany(supabase, user.id, checkout.company_id)
    if (!company) return json({ error: 'forbidden' }, 403)
    if (!await hasCheckoutSkill(supabase, company.id)) return json({ error: 'skill_not_active' }, 403)
    if (checkout.status === 'aguardando_pagamento' && checkout.expires_at && new Date(checkout.expires_at).getTime() <= Date.now()) {
      await supabase.from('funcionaria_checkouts').update({ status: 'expirado', updated_at: new Date().toISOString() }).eq('id', checkout.id).in('status', ['aguardando_pagamento','em_pagamento','aguardando_dinheiro','aguardando_troco'])
      await supabase.from('pedidos').update({ status: 'cancelado', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', pedido.id).in('status', ['aberto','aguardando_pagamento'])
      return json({ error: 'checkout_expired' }, 410)
    }
    if (['pago','cancelado','expirado'].includes(checkout.status)) return json({ error: `checkout_${checkout.status}` }, 409)

    if (action === 'availability') return json({ success: true, capabilities: await capabilities(supabase, company) })

    if (action === 'create') {
      const payment = String(body.payment_method || '') as 'debit'|'credit'
      if (!['debit','credit'].includes(payment)) return json({ error: 'invalid_payment_method' }, 400)
      if (cashLocked(checkout)) return json({ error: 'payment_in_progress', active_method: 'cash' }, 409)
      if (await hasPendingPix(supabase, checkout)) return json({ error: 'payment_in_progress', active_method: 'pix' }, 409)
      if (checkout.status === 'em_pagamento' && checkout.card_provider && checkout.card_reference_id) {
        return json({ success: true, duplicate: true, provider: checkout.card_provider, reference_id: checkout.card_reference_id, status: 'awaiting', deep_link: checkout.metadata?.infinitepay_link || null, payment_method: checkout.metadata?.card_payment_type || null })
      }
      if (checkout.status !== 'aguardando_pagamento') return json({ error: 'payment_in_progress' }, 409)
      const caps = await capabilities(supabase, company)
      const cap = payment === 'debit' ? caps.debit : caps.credit
      if (!cap.enabled) return json({ error: 'payment_not_configured' }, 409)
      const installments = payment === 'credit' ? Math.max(1, Number(body.installments || 1)) : 1
      const result = cap.provider === 'mp_point'
        ? await createMp(supabase, company, checkout, pedido, payment, installments)
        : await createInfinite(supabase, company, checkout, pedido, payment)
      return json(result)
    }

    if (action === 'check') {
      if (!checkout.card_provider) return json({ status: 'pending' })
      const result = checkout.card_provider === 'mp_point'
        ? await checkMp(supabase, company, checkout)
        : await checkInfinite(supabase, checkout)
      return json({ success: true, ...result })
    }

    if (action === 'cancel') {
      if (!checkout.card_provider || !checkout.card_reference_id) return json({ error: 'card_not_started' }, 409)
      if (cashLocked(checkout) || await hasPendingPix(supabase, checkout)) return json({ error: 'payment_in_progress' }, 409)
      if (checkout.card_provider !== 'mp_point') return json({ error: 'payment_not_cancelable' }, 409)
      if (!company.mp_access_token) return json({ error: 'payment_not_configured' }, 409)

      let cancelResponse: Response | null = null
      try {
        cancelResponse = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(checkout.card_reference_id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${String(company.mp_access_token).trim()}` },
        })
      } catch {
        return json({ error: 'card_cancel_failed' }, 502)
      }

      if (!cancelResponse.ok) {
        const current = await checkMp(supabase, company, checkout)
        if (current.status === 'paid') return json({ success: true, ...current })
        return json({ error: 'card_cancel_failed', provider_status: current.status }, 409)
      }

      await supabase.from('funcionaria_checkouts').update({
        status: 'aguardando_pagamento', metodo_pagamento: null, card_provider: null, card_reference_id: null,
        metadata: { ...(checkout.metadata || {}), infinitepay_link: null }, updated_at: new Date().toISOString(),
      }).eq('id', checkout.id).eq('status', 'em_pagamento').eq('card_provider', 'mp_point')
      return json({ success: true, status: 'cancelled' })
    }

    return json({ error: 'invalid_action' }, 400)
  } catch (error) {
    console.error('[funcionaria-card]', error)
    return json({ error: error instanceof Error ? error.message : 'internal_error' }, 500)
  }
})
