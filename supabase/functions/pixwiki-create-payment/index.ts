import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MP_CLIENT_ID = Deno.env.get('ML_APP_ID')!
const MP_CLIENT_SECRET = Deno.env.get('ML_APP_SECRET')!
const jsonHeaders = { 'Content-Type': 'application/json' }

function normalizeAmountCents(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const cents = Math.round(n)
  if (cents < 1 || cents > 999999999) return null
  return cents
}

function ascii(value: string, max: number, fallback: string) {
  const cleaned = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, max)
  return cleaned || fallback
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

function buildStaticPixCode(args: { key: string; amountCents: number; txid: string; merchantName: string; merchantCity: string }) {
  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', args.key)
  const beforeCrc = tlv('00', '01') + tlv('26', merchantAccount) + tlv('52', '0000') + tlv('53', '986')
    + tlv('54', (args.amountCents / 100).toFixed(2)) + tlv('58', 'BR') + tlv('59', ascii(args.merchantName, 25, 'RECEBEDOR PIX'))
    + tlv('60', ascii(args.merchantCity, 15, 'SAO PAULO')) + tlv('62', tlv('05', args.txid)) + '6304'
  return beforeCrc + crc16(beforeCrc)
}

function makeTxid() {
  return `PW${crypto.randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`
}

async function getValidMercadoPagoToken(supabase: any, connection: any) {
  const expiresAt = new Date(connection.expires_at).getTime()
  const refreshMarginMs = 7 * 24 * 60 * 60 * 1000
  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + refreshMarginMs) return connection.access_token
  if (!connection.refresh_token) throw new Error('mp_refresh_unavailable')
  if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) throw new Error('mp_oauth_not_configured')

  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: MP_CLIENT_ID, client_secret: MP_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: connection.refresh_token }),
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

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: jsonHeaders })
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const companyId = String(body?.company_id ?? '')
    const amountCents = normalizeAmountCents(body?.amount_cents)
    if (!companyId || !amountCents) return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: jsonHeaders })

    const { data: company, error: companyError } = await supabase.from('companies')
      .select('id,user_id,name,slug,logo_url,is_active,segment_key,business_address')
      .eq('id', companyId).eq('segment_key', 'pix_wiki').eq('is_active', true).maybeSingle()
    if (companyError || !company) return new Response(JSON.stringify({ error: 'company_not_found' }), { status: 404, headers: jsonHeaders })

    const { data: canServe, error: serveError } = await supabase.rpc('pixwiki_can_serve_subdomain', { p_slug: company.slug })
    if (serveError || !canServe) return new Response(JSON.stringify({ error: 'pix_link_plan_required' }), { status: 403, headers: jsonHeaders })

    const [{ data: settings, error: settingsError }, { data: preference }] = await Promise.all([
      supabase.from('pixwiki_payment_settings').select('mp_connection_id,pix_key,pix_key_type')
        .eq('company_id', company.id).eq('user_id', company.user_id).maybeSingle(),
      supabase.from('pix_payment_preferences').select('mode,merchant_city,allow_payer_choice')
        .eq('company_id', company.id).eq('product', 'pixwiki').maybeSingle(),
    ])

    if (settingsError || !settings?.mp_connection_id) return new Response(JSON.stringify({ error: 'mp_connection_required' }), { status: 409, headers: jsonHeaders })

    const { data: connection, error: connectionError } = await supabase.from('pixwiki_mp_connections')
      .select('id,user_id,company_id,legacy_connection_id,mp_user_id,access_token,refresh_token,expires_at,granted_scope,is_active')
      .eq('id', settings.mp_connection_id).eq('company_id', company.id).eq('user_id', company.user_id).eq('is_active', true).maybeSingle()
    if (connectionError || !connection) return new Response(JSON.stringify({ error: 'mp_connection_required' }), { status: 409, headers: jsonHeaders })

    const configuredMode = preference?.mode === 'free' ? 'free' : 'mercadopago'
    const requestedMode = body?.payment_mode === 'free' || body?.payment_mode === 'mercadopago' ? body.payment_mode : null
    const paymentMode = preference?.allow_payer_choice && requestedMode ? requestedMode : configuredMode

    if (paymentMode === 'free') {
      if (!settings.pix_key) return new Response(JSON.stringify({ error: 'pix_key_required' }), { status: 409, headers: jsonHeaders })

      const txid = makeTxid()
      const { data: intent, error: intentError } = await supabase.rpc('pix_direct_reserve_intent', {
        p_company_id: company.id,
        p_user_id: company.user_id,
        p_product: 'pixwiki',
        p_product_reference: company.slug,
        p_original_amount_cents: amountCents,
        p_connection_scope: `pixwiki:${connection.id}`,
        p_pix_key: settings.pix_key,
        p_pix_key_type: settings.pix_key_type,
        p_txid: txid,
        p_expires_seconds: 1800,
        p_metadata: { source: 'pixwiki_link', slug: company.slug },
      })
      if (intentError || !intent) {
        if (String(intentError?.message || '').includes('pix_direct_slots_unavailable')) {
          return new Response(JSON.stringify({ error: 'pix_direct_slots_unavailable' }), { status: 409, headers: jsonHeaders })
        }
        throw new Error(`direct_intent_failed:${String(intentError?.message || '')}`)
      }

      const pixCode = buildStaticPixCode({
        key: settings.pix_key,
        amountCents: Number(intent.expected_amount_cents),
        txid,
        merchantName: company.name,
        merchantCity: preference?.merchant_city || 'SAO PAULO',
      })
      const qrCodeUrl = `https://www.minhai.app/api/qrcode?size=400&data=${encodeURIComponent(pixCode)}&company_id=${company.id}&color=%23059669`

      const { data: transaction, error: txError } = await supabase.from('pix_transactions').insert({
        company_id: company.id, user_id: company.user_id, txid, pix_code: pixCode, qr_code_url: qrCodeUrl,
        amount_cents: intent.expected_amount_cents, original_amount_cents: amountCents, discount_cents: intent.discount_cents,
        direct_intent_id: intent.id, destination_pix_key: settings.pix_key, destination_pix_key_type: settings.pix_key_type,
        status: 'pending', expires_at: intent.expires_at, requested_by_voice: false, purpose: 'payment',
        payment_provider: 'pix_direct', origem: 'pixwiki_link_free', notes: `PixWiki Link grátis ${company.slug}.pix.wiki`,
      }).select('id,expires_at').single()

      if (txError || !transaction) {
        await supabase.from('pix_direct_intents').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', intent.id)
        throw new Error('transaction_create_failed')
      }

      return new Response(JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        amount_brl: (Number(intent.expected_amount_cents) / 100).toFixed(2),
        original_amount_brl: (amountCents / 100).toFixed(2),
        discount_cents: Number(intent.discount_cents || 0),
        qr_code_url: qrCodeUrl,
        pix_code: pixCode,
        company_name: company.name,
        expires_at: transaction.expires_at,
        payment_provider: 'pix_direct',
        payment_mode: 'free',
        allow_payer_choice: !!preference?.allow_payer_choice,
      }), { headers: jsonHeaders })
    }

    const token = await getValidMercadoPagoToken(supabase, connection)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        transaction_amount: amountCents / 100,
        description: `PixWiki - ${company.name}`.slice(0, 255),
        payment_method_id: 'pix',
        payer: { email: `pixwiki+${company.id}@minhai.app` },
        date_of_expiration: expiresAt,
        external_reference: `pixwiki:${company.id}:${crypto.randomUUID()}`,
        metadata: { product: 'pixwiki', company_id: company.id, slug: company.slug },
      }),
    })
    const payment = await paymentResponse.json().catch(() => ({}))
    if (!paymentResponse.ok || !payment?.id || !payment?.point_of_interaction?.transaction_data?.qr_code) {
      console.error('[pixwiki-create-payment] Mercado Pago:', paymentResponse.status, payment?.message ?? payment?.error ?? 'erro')
      return new Response(JSON.stringify({ error: 'payment_create_failed' }), { status: 502, headers: jsonHeaders })
    }

    const pixCode = String(payment.point_of_interaction.transaction_data.qr_code)
    const qrBase64 = String(payment.point_of_interaction.transaction_data.qr_code_base64 ?? '')
    const transactionId = crypto.randomUUID()
    const { data: transaction, error: txError } = await supabase.from('pix_transactions').insert({
      id: transactionId, company_id: company.id, user_id: company.user_id, amount_cents: amountCents,
      original_amount_cents: amountCents, discount_cents: 0, status: 'pending', expires_at: payment.date_of_expiration ?? expiresAt,
      requested_by_voice: false, pix_code: pixCode, qr_code_url: qrBase64 ? `data:image/png;base64,${qrBase64}` : null,
      purpose: 'payment', payment_provider: 'mercadopago', txid: String(payment.id), origem: 'pixwiki_link',
      notes: `PixWiki Link ${company.slug}.pix.wiki`,
    }).select('id,expires_at').single()
    if (txError || !transaction) throw new Error('transaction_create_failed')

    return new Response(JSON.stringify({
      success: true,
      transaction_id: transaction.id,
      amount_brl: (amountCents / 100).toFixed(2),
      original_amount_brl: (amountCents / 100).toFixed(2),
      discount_cents: 0,
      qr_code_url: qrBase64 ? `data:image/png;base64,${qrBase64}` : null,
      pix_code: pixCode,
      company_name: company.name,
      expires_at: transaction.expires_at,
      payment_provider: 'mercadopago',
      payment_mode: 'mercadopago',
      provider_payment_id: String(payment.id),
      allow_payer_choice: !!preference?.allow_payer_choice,
    }), { headers: jsonHeaders })
  } catch (error) {
    console.error('[pixwiki-create-payment]', error instanceof Error ? error.message : error)
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: jsonHeaders })
  }
})
