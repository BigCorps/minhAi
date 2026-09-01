import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const NOTIFY_URL = `${SUPABASE_URL}/functions/v1`

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers }) }
function code(v: unknown) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }
const DENOMS = [2, 5, 10, 20, 50, 100, 200]

async function userFrom(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const auth = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await auth.auth.getUser(token)
  return error ? null : data.user || null
}
async function allowed(supabase: any, uid: string, companyId: string) {
  const { data: c } = await supabase.from('companies').select('id,user_id,name,email_contato').eq('id', companyId).maybeSingle()
  if (!c) return null
  if (c.user_id === uid) return c
  const { data: a } = await supabase.from('company_admins').select('role').eq('company_id', companyId).eq('user_id', uid).maybeSingle()
  return a && ['owner','manager'].includes(String(a.role)) ? c : null
}
async function hasSkill(supabase: any, companyId: string) {
  const { data } = await supabase.from('funcionaria_company_skills').select('status').eq('company_id', companyId).eq('skill_key', 'checkout_payments').maybeSingle()
  return data && ['active','cancel_pending'].includes(String(data.status))
}
function parseBanknotes(input: unknown) {
  const src = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const clean: Record<string, number> = {}
  let cents = 0
  for (const d of DENOMS) {
    const qty = Math.max(0, Math.min(50, Math.floor(Number(src[String(d)] || 0))))
    if (qty) clean[String(d)] = qty
    cents += d * 100 * qty
  }
  return { clean, cents }
}
async function notify(supabase: any, company: any, checkout: any, totalCents: number, tenderedCents: number, changeCents: number, banknotes: Record<string, number>) {
  const [{ data: profile }, { data: cfg }] = await Promise.all([
    supabase.from('company_profiles').select('nome,email,telefone').eq('company_id', company.id).eq('tipo', 'gerente').eq('is_active', true).limit(1).maybeSingle(),
    supabase.from('company_function_settings').select('config').eq('company_id', company.id).eq('function_key', 'chamar_gerente').maybeSingle(),
  ])
  const name = profile?.nome || 'Responsável'
  const email = profile?.email || company.email_contato || ''
  const phone = String(profile?.telefone || '').replace(/\D/g, '')
  const config = cfg?.config || {}
  const notesText = Object.entries(banknotes).map(([denom, qty]) => `${qty}× R$ ${denom}`).join(', ') || 'valor exato'
  const fmt = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const reason = changeCents > 0
    ? `TROCO NECESSÁRIO — Terminal FuncionarIA. Venda ${checkout.codigo}. Compra ${fmt(totalCents)}. Cliente informou ${fmt(tenderedCents)} (${notesText}). Levar ${fmt(changeCents)} de troco. Cliente aguardando.`
    : `PAGAMENTO EM DINHEIRO — Terminal FuncionarIA. Venda ${checkout.codigo}. Total ${fmt(totalCents)}. Cliente informou valor exato. Cliente aguardando.`

  const channels: string[] = []
  const tasks: Promise<void>[] = []
  if (config.notificar_email !== false && email) {
    tasks.push(fetch(`${NOTIFY_URL}/enviar-email-google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ company_id: company.id, to: email, subject: changeCents > 0 ? '💵 Troco necessário — FuncionarIA' : '💵 Pagamento em dinheiro — FuncionarIA', body: `Olá ${name},\n\n${reason}\n\n---\nEnviado pela FuncionarIA` }),
    }).then(async r => {
      const b = await r.json().catch(() => ({}))
      if (r.ok && b?.success === true) channels.push('e-mail')
    }).catch(() => undefined) as Promise<void>)
  }

  // WhatsApp é best-effort: se a janela/um template compatível não permitir o envio,
  // o e-mail/SMS continuam sendo os canais de garantia.
  if (phone) {
    tasks.push(fetch(`${NOTIFY_URL}/enviar-whatsapp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ to: phone, message: reason }),
    }).then(async r => {
      const b = await r.json().catch(() => ({}))
      if (r.ok && b?.success) {
        channels.push('WhatsApp')
        await supabase.rpc('funcionaria_consume_usage', {
          p_company_id: company.id, p_usage_key: 'whatsapp_message', p_units: 1,
          p_source: 'cash_manager_alert', p_channel: 'whatsapp',
          p_idempotency_key: `cash-wa:${checkout.id}`,
          p_metadata: { checkout_id: checkout.id, code: checkout.codigo },
        }).catch(() => null)
      }
    }).catch(() => undefined) as Promise<void>)
  }

  if (config.notificar_sms === true && phone) {
    tasks.push(fetch(`${NOTIFY_URL}/send-sms-gerente`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ company_id: company.id, number: phone, gerente_nome: name, motivo: reason, usage_idempotency_key: `cash-sms:${checkout.id}` }),
    }).then(async r => {
      const b = await r.json().catch(() => ({}))
      if (r.ok && b?.success === true) channels.push('SMS')
    }).catch(() => undefined) as Promise<void>)
  }
  await Promise.allSettled(tasks)
  return { channels, reason }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const user = await userFrom(req)
  if (!user) return json({ error: 'unauthorized' }, 401)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const action = String(body.action || 'status')
    const codigo = code(body.codigo)
    if (codigo.length !== 8) return json({ error: 'invalid_code' }, 400)
    const { data: checkout } = await supabase.from('funcionaria_checkouts').select('*').eq('codigo', codigo).maybeSingle()
    if (!checkout) return json({ error: 'checkout_not_found' }, 404)
    const company = await allowed(supabase, user.id, checkout.company_id)
    if (!company) return json({ error: 'forbidden' }, 403)
    if (!await hasSkill(supabase, company.id)) return json({ error: 'skill_not_active' }, 403)
    const { data: pedido } = await supabase.from('pedidos').select('id,total,status').eq('id', checkout.pedido_id).maybeSingle()
    if (!pedido) return json({ error: 'pedido_not_found' }, 404)
    if (checkout.status === 'aguardando_pagamento' && checkout.expires_at && new Date(checkout.expires_at).getTime() <= Date.now()) {
      await supabase.from('funcionaria_checkouts').update({ status: 'expirado', updated_at: new Date().toISOString() }).eq('id', checkout.id).in('status', ['aguardando_pagamento','em_pagamento','aguardando_dinheiro','aguardando_troco'])
      await supabase.from('pedidos').update({ status: 'cancelado', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', pedido.id).in('status', ['aberto','aguardando_pagamento'])
      return json({ error: 'checkout_expired' }, 410)
    }

    if (action === 'status') {
      return json({ success: true, status: checkout.status, tendered_cents: checkout.cash_tendered_cents, change_cents: checkout.cash_change_cents, receipt_token: checkout.status === 'pago' ? checkout.receipt_token : null })
    }

    if (action === 'request') {
      if (['pago','cancelado','expirado'].includes(checkout.status)) return json({ error: `checkout_${checkout.status}` }, 409)
      if (checkout.status !== 'aguardando_pagamento') return json({ error: 'payment_in_progress' }, 409)
      if (checkout.card_provider || checkout.card_reference_id || checkout.pix_transaction_id) return json({ error: 'payment_in_progress' }, 409)
      const totalCents = Math.round(Number(pedido.total) * 100)
      const exact = body.exact === true
      const parsed = parseBanknotes(body.banknotes)
      const tenderedCents = exact ? totalCents : parsed.cents
      if (tenderedCents < totalCents) return json({ error: 'cash_below_total', total_cents: totalCents, tendered_cents: tenderedCents }, 400)
      const changeCents = tenderedCents - totalCents
      const status = changeCents > 0 ? 'aguardando_troco' : 'aguardando_dinheiro'
      const { data: locked } = await supabase.from('funcionaria_checkouts').update({
        status,
        metodo_pagamento: 'dinheiro',
        cash_tendered_cents: tenderedCents,
        cash_change_cents: changeCents,
        cash_banknotes: exact ? {} : parsed.clean,
        cash_requested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', checkout.id).eq('status', 'aguardando_pagamento').is('pix_transaction_id', null).is('card_provider', null).is('cash_requested_at', null).select('id').maybeSingle()
      if (!locked) return json({ error: 'payment_in_progress' }, 409)
      const notice = await notify(supabase, company, checkout, totalCents, tenderedCents, changeCents, exact ? {} : parsed.clean)
      return json({
        success: true,
        status,
        total_cents: totalCents,
        tendered_cents: tenderedCents,
        change_cents: changeCents,
        banknotes: exact ? {} : parsed.clean,
        notified: notice.channels.length > 0,
        notified_channels: notice.channels,
        notification_warning: notice.channels.length ? null : 'manager_notification_failed',
      })
    }

    if (action === 'cancel_request') {
      if (!['aguardando_dinheiro','aguardando_troco'].includes(checkout.status)) return json({ error: 'cash_not_waiting' }, 409)
      await supabase.from('funcionaria_checkouts').update({
        status: 'aguardando_pagamento', metodo_pagamento: null, cash_tendered_cents: null, cash_change_cents: null,
        cash_banknotes: {}, cash_requested_at: null, updated_at: new Date().toISOString(),
      }).eq('id', checkout.id)
      return json({ success: true, status: 'aguardando_pagamento' })
    }

    return json({ error: 'invalid_action' }, 400)
  } catch (error) {
    console.error('[funcionaria-cash]', error)
    return json({ error: error instanceof Error ? error.message : 'internal_error' }, 500)
  }
})
