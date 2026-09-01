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
function ascii(value: string, max: number, fallback: string) {
  const cleaned = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 $%*+\-./:]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, max)
  return cleaned || fallback
}
function buildPixCode(key: string, amountCents: number, txid: string, name: string, city: string) {
  const merchant = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', key)
  const before = tlv('00', '01') + tlv('26', merchant) + tlv('52', '0000') + tlv('53', '986') + tlv('54', (amountCents / 100).toFixed(2)) + tlv('58', 'BR') + tlv('59', ascii(name, 25, 'RECEBEDOR PIX')) + tlv('60', ascii(city, 15, 'SAO PAULO')) + tlv('62', tlv('05', txid)) + '6304'
  return before + crc16(before)
}
function makeTxid() {
  return `FA${crypto.randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`
}

async function getUser(req: Request, supabase: any) {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return null
  const { data, error } = await supabase.auth.getUser(jwt)
  return error ? null : data.user || null
}

async function hasAccess(supabase: any, userId: string, companyId: string) {
  const { data: company } = await supabase.from('companies')
    .select('id,user_id,name,receiving_pix_key,receiving_pix_key_type')
    .eq('id', companyId).maybeSingle()
  if (!company) return null
  if (company.user_id === userId) return company
  const { data: admin } = await supabase.from('company_admins').select('role').eq('company_id', companyId).eq('user_id', userId).maybeSingle()
  return admin && ['owner', 'manager'].includes(String(admin.role)) ? company : null
}


async function hasCheckoutSkill(supabase: any, companyId: string) {
  const { data } = await supabase.from('funcionaria_company_skills').select('status').eq('company_id', companyId).eq('skill_key', 'checkout_payments').maybeSingle()
  return !!data && ['active', 'cancel_pending'].includes(String(data.status))
}

async function loadCheckout(supabase: any, rawCode: string) {
  const clean = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const { data: checkout } = await supabase.from('funcionaria_checkouts').select('*').eq('codigo', clean).maybeSingle()
  if (!checkout) return null
  const { data: pedido } = await supabase.from('pedidos').select('id,company_id,total,status').eq('id', checkout.pedido_id).maybeSingle()
  return pedido ? { checkout, pedido } : null
}

async function validToken(supabase: any, connection: any) {
  const expires = new Date(connection.expires_at).getTime()
  if (Number.isFinite(expires) && expires > Date.now() + 5 * 60 * 1000) return connection.access_token
  if (!connection.refresh_token || !MP_CLIENT_ID || !MP_CLIENT_SECRET) return connection.access_token
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: MP_CLIENT_ID, client_secret: MP_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: connection.refresh_token }),
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
  await supabase.from('mp_connections').update(update).eq('id', connection.id)
  return data.access_token
}

function responsePayload(tx: any, checkout: any) {
  return {
    success: true,
    status: checkout.status,
    checkout_id: checkout.id,
    transaction_id: tx.id,
    amount_brl: (Number(tx.amount_cents || 0) / 100).toFixed(2),
    original_amount_brl: (Number(tx.original_amount_cents ?? tx.amount_cents ?? 0) / 100).toFixed(2),
    discount_cents: Number(tx.discount_cents || 0),
    qr_code_url: tx.qr_code_url,
    pix_code: tx.pix_code,
    expires_at: tx.expires_at,
    payment_provider: tx.payment_provider,
    payment_mode: checkout.pix_payment_mode || (tx.payment_provider === 'pix_direct' ? 'free' : 'mercadopago'),
    receipt_token: checkout.status === 'pago' ? checkout.receipt_token : null,
  }
}

async function reconcileDirect(transactionId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/pix-direct-reconcile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
    body: JSON.stringify({ transaction_id: transactionId }),
  })
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

function otherPaymentLocked(checkout: any) {
  return !!checkout.card_provider || !!checkout.card_reference_id || !!checkout.cash_requested_at || ['tef', 'nfc', 'dinheiro'].includes(String(checkout.metodo_pagamento || '')) || ['aguardando_dinheiro', 'aguardando_troco'].includes(String(checkout.status))
}

async function getMpConnection(supabase: any, userId: string) {
  const { data } = await supabase.from('mp_connections')
    .select('id,user_id,mp_user_id,access_token,refresh_token,expires_at,granted_scope,is_active')
    .eq('user_id', userId).eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  return data || null
}

async function cancelPixPayment(supabase: any, checkout: any, company: any) {
  if (!checkout.pix_transaction_id) return { ok: true }
  const { data: tx } = await supabase.from('pix_transactions').select('*').eq('id', checkout.pix_transaction_id).maybeSingle()
  if (!tx) return { ok: true }
  if (tx.status === 'confirmed') return { ok: false, error: 'already_paid', tx }
  if (tx.status !== 'pending') return { ok: true }

  if (tx.payment_provider === 'pix_direct') {
    // O BR Code direto não pode ser revogado depois de exibido. Liberar outra
    // forma de pagamento criaria risco de pagamento tardio em duplicidade.
    return { ok: false, error: 'pix_direct_not_cancelable' }
  }

  if (tx.payment_provider === 'mercadopago') {
    const mpConn = await getMpConnection(supabase, company.user_id)
    if (!mpConn) return { ok: false, error: 'mp_connection_required' }
    const token = await validToken(supabase, mpConn)
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(tx.txid))}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    const data = await response.json().catch(() => ({}))
    const status = String(data?.status || '').toLowerCase()
    if (status === 'approved') {
      const paidAt = data.date_approved || data.date_created || new Date().toISOString()
      await supabase.from('pix_transactions').update({ status: 'confirmed', confirmed_at: paidAt, updated_at: new Date().toISOString() }).eq('id', tx.id).eq('status', 'pending')
      const { data: finalized, error } = await supabase.rpc('funcionaria_finalizar_pix', {
        p_checkout_id: checkout.id,
        p_transaction_id: tx.id,
        p_provider_payment_id: String(data.id || tx.txid || ''),
        p_paid_at: paidAt,
      })
      if (error) throw error
      return { ok: false, error: 'already_paid', paid: true, finalized }
    }
    if (!response.ok || !['cancelled', 'canceled'].includes(status)) {
      return { ok: false, error: 'pix_cancel_failed' }
    }
    await supabase.from('pix_transactions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', tx.id).eq('status', 'pending')
    return { ok: true }
  }

  return { ok: false, error: 'pix_not_cancelable' }
}


async function expirePendingPix(supabase: any, checkout: any, pedido: any, tx: any) {
  const expiresAt = tx?.expires_at || checkout.expires_at
  if (!expiresAt || new Date(expiresAt).getTime() > Date.now()) return false
  await supabase.from('pix_transactions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', tx.id).eq('status', 'pending')
  if (tx.direct_intent_id) await supabase.from('pix_direct_intents').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', tx.direct_intent_id).eq('status', 'pending')
  await supabase.from('funcionaria_checkouts').update({ status: 'expirado', updated_at: new Date().toISOString() }).eq('id', checkout.id).eq('status', 'em_pagamento')
  await supabase.from('pedidos').update({ status: 'cancelado', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', pedido.id).in('status', ['aberto', 'aguardando_pagamento'])
  return true
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const user = await getUser(req, supabase)
  if (!user) return json({ error: 'unauthorized' }, 401)

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const action = String(body.action || 'create')
    const loaded = await loadCheckout(supabase, String(body.codigo || ''))
    if (!loaded) return json({ error: 'checkout_not_found' }, 404)
    const { checkout, pedido } = loaded
    const company = await hasAccess(supabase, user.id, checkout.company_id)
    if (!company) return json({ error: 'forbidden' }, 403)
    if (!await hasCheckoutSkill(supabase, checkout.company_id)) return json({ error: 'skill_not_active' }, 403)

    if (action === 'cancel_payment') {
      if (checkout.status === 'pago') return json({ error: 'already_paid' }, 409)
      if (otherPaymentLocked(checkout)) return json({ error: 'payment_in_progress' }, 409)
      const canceled = await cancelPixPayment(supabase, checkout, company)
      if (!canceled.ok) return json({ error: canceled.error, paid: canceled.paid || false, finalized: canceled.finalized || null }, 409)
      await supabase.from('funcionaria_checkouts').update({
        status: 'aguardando_pagamento',
        metodo_pagamento: null,
        pix_transaction_id: null,
        pix_payment_mode: null,
        updated_at: new Date().toISOString(),
      }).eq('id', checkout.id).in('status', ['aguardando_pagamento', 'em_pagamento'])
      return json({ success: true, status: 'aguardando_pagamento' })
    }

    // Compatibilidade: cancel continua cancelando a venda inteira, como na versão anterior.
    if (action === 'cancel') {
      if (checkout.status === 'pago') return json({ error: 'already_paid' }, 409)
      if (otherPaymentLocked(checkout)) return json({ error: 'payment_in_progress' }, 409)
      const canceled = await cancelPixPayment(supabase, checkout, company)
      if (!canceled.ok) return json({ error: canceled.error, paid: canceled.paid || false, finalized: canceled.finalized || null }, 409)
      await supabase.from('funcionaria_checkouts').update({ status: 'cancelado', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', checkout.id).in('status', ['aguardando_pagamento', 'em_pagamento'])
      await supabase.from('pedidos').update({ status: 'cancelado', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', pedido.id).in('status', ['aberto', 'aguardando_pagamento'])
      return json({ success: true, status: 'cancelado' })
    }

    if (action === 'create' && checkout.status === 'aguardando_pagamento' && checkout.expires_at && new Date(checkout.expires_at).getTime() <= Date.now()) {
      await supabase.from('funcionaria_checkouts').update({ status: 'expirado', updated_at: new Date().toISOString() }).eq('id', checkout.id).eq('status', 'aguardando_pagamento')
      await supabase.from('pedidos').update({ status: 'cancelado', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', pedido.id).in('status', ['aberto', 'aguardando_pagamento'])
      return json({ error: 'checkout_expired' }, 410)
    }
    if (checkout.status === 'pago' && checkout.pix_transaction_id) {
      const { data: done } = await supabase.from('pix_transactions').select('*').eq('id', checkout.pix_transaction_id).maybeSingle()
      return json(done ? responsePayload(done, checkout) : { success: true, status: 'pago', receipt_token: checkout.receipt_token })
    }
    if (otherPaymentLocked(checkout)) return json({ error: 'payment_in_progress' }, 409)

    const mpConn = await getMpConnection(supabase, company.user_id)
    if (!mpConn) return json({ error: 'mp_connection_required' }, 409)

    if (action === 'create') {
      if (checkout.pix_transaction_id) {
        const { data: existing } = await supabase.from('pix_transactions').select('*').eq('id', checkout.pix_transaction_id).maybeSingle()
        if (existing && existing.status === 'pending') return json(responsePayload(existing, checkout))
        if (existing && existing.status === 'confirmed') {
          const { data: finalized, error: finalizeError } = await supabase.rpc('funcionaria_finalizar_pix', {
            p_checkout_id: checkout.id,
            p_transaction_id: existing.id,
            p_provider_payment_id: String(existing.txid || ''),
            p_paid_at: existing.confirmed_at || new Date().toISOString(),
          })
          if (finalizeError) throw finalizeError
          return json({ ...responsePayload(existing, { ...checkout, status: 'pago' }), finalized })
        }
      }
      if (checkout.status !== 'aguardando_pagamento' && checkout.status !== 'em_pagamento') return json({ error: 'payment_in_progress' }, 409)

      const amountCents = Math.round(Number(pedido.total || 0) * 100)
      if (!Number.isFinite(amountCents) || amountCents <= 0) return json({ error: 'invalid_amount' }, 409)
      const { data: pref } = await supabase.from('pix_payment_preferences').select('mode,merchant_city').eq('company_id', checkout.company_id).eq('product', 'funcionaria').maybeSingle()
      const mode = pref?.mode === 'free' ? 'free' : 'mercadopago'

      if (mode === 'free') {
        const key = String(company.receiving_pix_key || '').trim()
        if (!key) return json({ error: 'pix_key_required' }, 409)
        const localTxid = makeTxid()
        const expiresSeconds = Math.max(60, Math.min(1800, Math.floor((new Date(checkout.expires_at).getTime() - Date.now()) / 1000)))
        const { data: intent, error: intentError } = await supabase.rpc('pix_direct_reserve_intent', {
          p_company_id: checkout.company_id,
          p_user_id: company.user_id,
          p_product: 'funcionaria',
          p_product_reference: checkout.id,
          p_original_amount_cents: amountCents,
          p_connection_scope: `mp:${mpConn.id}`,
          p_pix_key: key,
          p_pix_key_type: company.receiving_pix_key_type || null,
          p_txid: localTxid,
          p_expires_seconds: expiresSeconds,
          p_metadata: { checkout_id: checkout.id, pedido_id: pedido.id, codigo: checkout.codigo },
        })
        if (intentError || !intent) {
          if (String(intentError?.message || '').includes('pix_direct_slots_unavailable')) return json({ error: 'pix_direct_slots_unavailable' }, 409)
          throw intentError || new Error('direct_intent_failed')
        }
        const pixCode = buildPixCode(key, Number(intent.expected_amount_cents), localTxid, company.name, pref?.merchant_city || 'SAO PAULO')
        const qr = `https://www.minhai.app/api/qrcode?size=400&data=${encodeURIComponent(pixCode)}&company_id=${checkout.company_id}&color=%236D28D9`
        const { data: tx, error: txError } = await supabase.from('pix_transactions').insert({
          company_id: checkout.company_id,
          user_id: company.user_id,
          pedido_id: pedido.id,
          txid: localTxid,
          pix_code: pixCode,
          qr_code_url: qr,
          amount_cents: intent.expected_amount_cents,
          original_amount_cents: amountCents,
          discount_cents: intent.discount_cents,
          direct_intent_id: intent.id,
          destination_pix_key: key,
          destination_pix_key_type: company.receiving_pix_key_type || null,
          status: 'pending',
          expires_at: intent.expires_at,
          requested_by_voice: false,
          purpose: 'payment',
          payment_provider: 'pix_direct',
          origem: 'funcionaria_pix_free',
          notes: `FuncionarIA checkout ${checkout.codigo}`,
        }).select('*').single()
        if (txError || !tx) {
          await supabase.from('pix_direct_intents').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', intent.id)
          throw txError || new Error('transaction_create_failed')
        }
        const { data: updated } = await supabase.from('funcionaria_checkouts').update({
          status: 'em_pagamento', metodo_pagamento: 'pix', pix_transaction_id: tx.id, pix_payment_mode: 'free', updated_at: new Date().toISOString(),
        }).eq('id', checkout.id).eq('status', 'aguardando_pagamento').select('*').maybeSingle()
        if (!updated) {
          await supabase.from('pix_transactions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', tx.id).eq('status', 'pending')
          await supabase.from('pix_direct_intents').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', intent.id).eq('status', 'pending')
          return json({ error: 'payment_in_progress' }, 409)
        }
        return json(responsePayload(tx, updated))
      }

      const token = await validToken(supabase, mpConn)
      const expiration = new Date(Math.min(new Date(checkout.expires_at).getTime(), Date.now() + 30 * 60 * 1000)).toISOString()
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `funcionaria-pix-${checkout.id}` },
        body: JSON.stringify({
          transaction_amount: amountCents / 100,
          description: `FuncionarIA - ${company.name}`.slice(0, 255),
          payment_method_id: 'pix',
          payer: { email: `funcionaria+${checkout.company_id}@minhai.app` },
          date_of_expiration: expiration,
          external_reference: `funcionaria:${checkout.id}`,
          metadata: { product: 'funcionaria', checkout_id: checkout.id, pedido_id: pedido.id },
        }),
      })
      const mp = await mpRes.json().catch(() => ({}))
      if (!mpRes.ok || !mp?.id || !mp?.point_of_interaction?.transaction_data?.qr_code) return json({ error: 'payment_create_failed' }, 502)
      const pixCode = String(mp.point_of_interaction.transaction_data.qr_code)
      const base64 = String(mp.point_of_interaction.transaction_data.qr_code_base64 || '')
      const { data: tx, error: txError } = await supabase.from('pix_transactions').insert({
        company_id: checkout.company_id,
        user_id: company.user_id,
        pedido_id: pedido.id,
        txid: String(mp.id),
        pix_code: pixCode,
        qr_code_url: base64 ? `data:image/png;base64,${base64}` : null,
        amount_cents: amountCents,
        original_amount_cents: amountCents,
        discount_cents: 0,
        status: 'pending',
        expires_at: mp.date_of_expiration || expiration,
        requested_by_voice: false,
        purpose: 'payment',
        payment_provider: 'mercadopago',
        origem: 'funcionaria_pix_mp',
        notes: `FuncionarIA checkout ${checkout.codigo}`,
      }).select('*').single()
      if (txError || !tx) throw txError || new Error('transaction_create_failed')
      const { data: updated } = await supabase.from('funcionaria_checkouts').update({
        status: 'em_pagamento', metodo_pagamento: 'pix', pix_transaction_id: tx.id, pix_payment_mode: 'mercadopago', updated_at: new Date().toISOString(),
      }).eq('id', checkout.id).eq('status', 'aguardando_pagamento').select('*').maybeSingle()
      if (!updated) {
        await supabase.from('pix_transactions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', tx.id).eq('status', 'pending')
        return json({ error: 'payment_in_progress' }, 409)
      }
      return json(responsePayload(tx, updated))
    }

    if (action === 'check') {
      if (!checkout.pix_transaction_id) return json({ error: 'pix_not_started' }, 409)
      const { data: tx } = await supabase.from('pix_transactions').select('*').eq('id', checkout.pix_transaction_id).maybeSingle()
      if (!tx) return json({ error: 'transaction_not_found' }, 404)
      if (tx.status === 'confirmed') {
        const { data: finalized, error: finalizeError } = await supabase.rpc('funcionaria_finalizar_pix', {
          p_checkout_id: checkout.id,
          p_transaction_id: tx.id,
          p_provider_payment_id: String(tx.txid || ''),
          p_paid_at: tx.confirmed_at || new Date().toISOString(),
        })
        if (finalizeError) throw finalizeError
        return json({ ...responsePayload(tx, { ...checkout, status: 'pago', receipt_token: finalized?.receipt_token || checkout.receipt_token }), finalized })
      }

      let providerId = ''
      let paidAt = ''
      if (tx.payment_provider === 'pix_direct') {
        const { response, data: match } = await reconcileDirect(tx.id)
        if (!response.ok) return json({ error: match?.error || 'direct_reconcile_failed', message: match?.message }, response.status)
        if (!match?.matched || !match?.provider_payment_id) {
          if (await expirePendingPix(supabase, checkout, pedido, tx)) return json({ success: false, status: 'expired' })
          return json({ success: false, status: 'pending' })
        }
        providerId = String(match.provider_payment_id)
        paidAt = match.paid_at || new Date().toISOString()
      } else if (tx.payment_provider === 'mercadopago') {
        const token = await validToken(supabase, mpConn)
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(tx.txid))}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
        const mp = await mpRes.json().catch(() => ({}))
        if (!mpRes.ok) return json({ error: 'payment_lookup_failed' }, 502)
        if (mp?.status !== 'approved') {
          if (['cancelled', 'canceled', 'rejected', 'expired'].includes(String(mp?.status || '').toLowerCase()) || await expirePendingPix(supabase, checkout, pedido, tx)) {
            await supabase.from('pix_transactions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', tx.id).eq('status', 'pending')
            await supabase.from('funcionaria_checkouts').update({ status: 'expirado', updated_at: new Date().toISOString() }).eq('id', checkout.id).eq('status', 'em_pagamento')
            await supabase.from('pedidos').update({ status: 'cancelado', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', pedido.id).in('status', ['aberto', 'aguardando_pagamento'])
            return json({ success: false, status: 'expired' })
          }
          return json({ success: false, status: mp?.status || 'pending' })
        }
        providerId = String(mp.id)
        paidAt = mp.date_approved || mp.date_created || new Date().toISOString()
      } else {
        return json({ error: 'unsupported_provider' }, 409)
      }

      const { data: finalized, error: finalizeError } = await supabase.rpc('funcionaria_finalizar_pix', {
        p_checkout_id: checkout.id,
        p_transaction_id: tx.id,
        p_provider_payment_id: providerId,
        p_paid_at: paidAt,
      })
      if (finalizeError) throw finalizeError
      const { data: done } = await supabase.from('pix_transactions').select('*').eq('id', tx.id).single()
      return json({ ...responsePayload(done || tx, { ...checkout, status: 'pago', receipt_token: finalized?.receipt_token || checkout.receipt_token }), finalized })
    }

    return json({ error: 'invalid_action' }, 400)
  } catch (error) {
    console.error('[funcionaria-pix]', error instanceof Error ? error.message : error)
    return json({ error: error instanceof Error ? error.message : 'internal_error' }, 500)
  }
})
