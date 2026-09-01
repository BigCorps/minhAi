import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BANCO_INTER_API_KEY = Deno.env.get('BANCO_INTER_API_KEY') ?? ''

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers })
}

function cleanKeys(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return [...new Set(input.map(String).map(v => v.trim()).filter(Boolean))].sort()
}

function sameKeys(a: unknown, b: unknown) {
  const aa = cleanKeys(a)
  const bb = cleanKeys(b)
  return aa.length === bb.length && aa.every((value, index) => value === bb[index])
}

function diff(a: string[], b: string[]) {
  const bs = new Set(b)
  return a.filter(v => !bs.has(v))
}

function union(a: string[], b: string[]) {
  return [...new Set([...a, ...b])].sort()
}

async function getUser(req: Request, supabase: any) {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return null
  const { data, error } = await supabase.auth.getUser(jwt)
  return error ? null : data.user || null
}

async function hasAccess(supabase: any, userId: string, companyId: string) {
  const { data: company } = await supabase
    .from('companies')
    .select('id,user_id,name,slug')
    .eq('id', companyId)
    .maybeSingle()
  if (!company) return null
  if (company.user_id === userId) return company
  const { data: admin } = await supabase
    .from('company_admins')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle()
  return admin && ['owner', 'manager'].includes(String(admin.role)) ? company : null
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
  return data
}

async function quote(supabase: any, keys: string[]) {
  const { data, error } = await supabase.rpc('funcionaria_quote_skills', { p_skill_keys: keys })
  if (error) throw error
  return data || { skill_count: 0, subtotal_cents: 0, discount_percent: 0, discount_cents: 0, total_cents: 0, items: [] }
}

async function ensureSub(supabase: any, companyId: string) {
  const { data, error } = await supabase.rpc('funcionaria_ensure_subscription', { p_company_id: companyId })
  if (error) throw error
  return data
}

async function generatePix(amountCents: number, label: string, pixKey: string) {
  if (!BANCO_INTER_API_KEY || !pixKey) throw new Error('billing_pix_not_configured')
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
    console.error('[funcionaria-billing] Inter create:', data)
    throw new Error('billing_pix_create_failed')
  }
  return data
}

async function checkInter(txid: string) {
  const response = await fetch(`https://inter.btsolucao.com.br/get.php?txid=${encodeURIComponent(txid)}`, {
    headers: { Authorization: `Bearer ${BANCO_INTER_API_KEY}`, Accept: 'application/json' },
  })
  const raw = await response.json().catch(() => ({}))
  if (!response.ok) return { paid: false, raw }
  const data = raw?.data || raw
  const status = String(data?.status || '').toUpperCase()
  const paid = ['CONCLUIDA', 'PAGO', 'REALIZADO', 'CONCLUIDO'].includes(status)
  const amount = Number(data?.valor ?? data?.amount?.original ?? 0)
  return { paid, amount, paidAt: data?.datapagamento || data?.horario || data?.paid_at || new Date().toISOString(), raw }
}

async function pendingPayment(supabase: any, invoice: any) {
  if (!invoice?.pix_transaction_id) return null
  const { data: tx } = await supabase
    .from('pix_transactions')
    .select('id,pix_code,qr_code_url,amount_cents,status,expires_at,txid')
    .eq('id', invoice.pix_transaction_id)
    .maybeSingle()
  if (!tx || tx.status !== 'pending') return null
  return {
    invoice_id: invoice.id,
    amount_cents: Number(invoice.amount_cents || tx.amount_cents || 0),
    pix_code: tx.pix_code,
    qr_code_url: tx.qr_code_url,
    txid: invoice.txid || tx.txid,
    expires_at: invoice.expires_at || tx.expires_at,
    prorated: invoice.prorated === true,
    desired_skill_keys: cleanKeys(invoice.desired_skill_keys),
  }
}

async function cancelPendingInvoice(supabase: any, invoice: any, status = 'canceled') {
  if (!invoice) return
  await supabase.from('funcionaria_invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', invoice.id).eq('status', 'pending')
  if (invoice.pix_transaction_id) {
    await supabase.from('pix_transactions').update({ status: status === 'expired' ? 'expired' : 'cancelled', updated_at: new Date().toISOString() }).eq('id', invoice.pix_transaction_id).eq('status', 'pending')
  }
}

async function markScheduleOnly(supabase: any, companyId: string, current: string[], desired: string[]) {
  const now = new Date().toISOString()
  const desiredSet = new Set(desired)
  for (const key of current) {
    await supabase.from('funcionaria_company_skills').update({
      status: desiredSet.has(key) ? 'active' : 'cancel_pending',
      updated_at: now,
    }).eq('company_id', companyId).eq('skill_key', key)
  }
  for (const key of desired) {
    if (current.includes(key)) continue
    const { data: skill } = await supabase.from('funcionaria_skill_catalog').select('monthly_price_cents').eq('skill_key', key).maybeSingle()
    await supabase.from('funcionaria_company_skills').upsert({
      company_id: companyId,
      skill_key: key,
      status: 'selected',
      monthly_price_cents_snapshot: Number(skill?.monthly_price_cents || 0),
      source: 'subscription_change',
      canceled_at: null,
      updated_at: now,
    }, { onConflict: 'company_id,skill_key' })
  }
  await supabase.from('funcionaria_subscriptions').update({
    next_skill_keys: desired,
    cancel_at_period_end: desired.length === 0,
    updated_at: now,
  }).eq('company_id', companyId)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const user = await getUser(req, supabase)
  if (!user) return json({ error: 'unauthorized' }, 401)

  try {
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const action = String(body.action || 'status')
    const companyId = String(body.company_id || '')
    if (!companyId) return json({ error: 'company_id_required' }, 400)
    const company = await hasAccess(supabase, user.id, companyId)
    if (!company) return json({ error: 'forbidden' }, 403)

    const sub = await ensureSub(supabase, companyId)

    if (action === 'status') {
      const { data: invoice } = await supabase
        .from('funcionaria_invoices')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const currentQuote = await quote(supabase, sub?.current_skill_keys || [])
      const nextQuote = await quote(supabase, sub?.next_skill_keys || [])
      return json({
        success: true,
        subscription: sub,
        pending_invoice: invoice,
        pending_payment: await pendingPayment(supabase, invoice),
        current_quote: currentQuote,
        next_quote: nextQuote,
      })
    }

    if (action === 'quote') {
      const desired = cleanKeys(body.desired_skill_keys)
      return json({ success: true, quote: await quote(supabase, desired) })
    }

    if (action === 'cancel_invoice') {
      const invoiceId = String(body.invoice_id || '')
      if (!invoiceId) return json({ error: 'invoice_id_required' }, 400)
      const { data: invoice } = await supabase.from('funcionaria_invoices').select('*').eq('id', invoiceId).eq('company_id', companyId).maybeSingle()
      if (!invoice || invoice.status !== 'pending') return json({ error: 'invoice_not_cancelable' }, 409)
      await cancelPendingInvoice(supabase, invoice)
      return json({ success: true })
    }

    if (action === 'create') {
      const desiredRequested = cleanKeys(body.desired_skill_keys)
      const { data: allowedRows } = await supabase
        .from('funcionaria_skill_catalog')
        .select('skill_key')
        .in('skill_key', desiredRequested.length ? desiredRequested : ['__none__'])
        .eq('is_active', true)
        .eq('is_free', false)
      const allowed = new Set((allowedRows || []).map((r: any) => r.skill_key))
      const desired = desiredRequested.filter(k => allowed.has(k))

      const now = new Date()
      const current = cleanKeys(sub?.current_skill_keys || [])
      const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null
      const stillInPeriod = ['active', 'past_due'].includes(String(sub?.status)) && periodEnd && periodEnd.getTime() > now.getTime()
      const added = diff(desired, current)
      const removed = diff(current, desired)

      if (stillInPeriod && added.length === 0) {
        await markScheduleOnly(supabase, companyId, current, desired)
        return json({
          success: true,
          payment_required: false,
          scheduled: removed.length > 0,
          current_skill_keys: current,
          next_skill_keys: desired,
          period_end: sub.current_period_end,
        })
      }

      let invoiceType: 'initial' | 'change' | 'renewal' = 'initial'
      let activation = desired
      let deferredRemove: string[] = []
      let amountCents = 0
      let subtotalCents = 0
      let discountPercent = 0
      let discountCents = 0
      let prorated = false

      if (stillInPeriod) {
        invoiceType = 'change'
        activation = added
        deferredRemove = removed
        const baseQuote = await quote(supabase, current)
        const expandedQuote = await quote(supabase, union(current, added))
        const monthlyDelta = Math.max(0, Number(expandedQuote.total_cents || 0) - Number(baseQuote.total_cents || 0))
        const secondsRemaining = Math.max(0, periodEnd!.getTime() - now.getTime()) / 1000
        const factor = Math.min(1, secondsRemaining / (30 * 24 * 60 * 60))
        amountCents = Math.max(100, Math.round(monthlyDelta * factor))
        subtotalCents = Number(expandedQuote.subtotal_cents || 0)
        discountPercent = Number(expandedQuote.discount_percent || 0)
        discountCents = Number(expandedQuote.discount_cents || 0)
        prorated = true
      } else {
        invoiceType = current.length || String(sub?.status) === 'past_due' ? 'renewal' : 'initial'
        const desiredQuote = await quote(supabase, desired)
        amountCents = Number(desiredQuote.total_cents || 0)
        subtotalCents = Number(desiredQuote.subtotal_cents || 0)
        discountPercent = Number(desiredQuote.discount_percent || 0)
        discountCents = Number(desiredQuote.discount_cents || 0)
      }

      if (desired.length === 0) {
        await markScheduleOnly(supabase, companyId, current, [])
        return json({ success: true, payment_required: false, next_skill_keys: [], period_end: sub?.current_period_end || null })
      }
      if (amountCents <= 0) return json({ error: 'invalid_invoice_amount' }, 409)

      const nowIso = new Date().toISOString()
      const { data: staleInvoices } = await supabase.from('funcionaria_invoices').select('*')
        .eq('company_id', companyId).eq('status', 'pending').lt('expires_at', nowIso)
      for (const stale of staleInvoices || []) await cancelPendingInvoice(supabase, stale, 'expired')

      const { data: existing } = await supabase.from('funcionaria_invoices').select('*')
        .eq('company_id', companyId).eq('status', 'pending').gt('expires_at', nowIso)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (existing) {
        if (!sameKeys(existing.desired_skill_keys, desired)) {
          await cancelPendingInvoice(supabase, existing)
        } else {
          const payment = await pendingPayment(supabase, existing)
          if (payment) return json({ success: true, payment_required: true, duplicate: true, invoice: existing, ...payment })
          await cancelPendingInvoice(supabase, existing, 'failed')
        }
      }

      const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString()
      const { data: invoice, error: invErr } = await supabase.from('funcionaria_invoices').insert({
        company_id: companyId,
        user_id: company.user_id,
        invoice_type: invoiceType,
        desired_skill_keys: desired,
        activation_skill_keys: activation,
        deferred_remove_skill_keys: deferredRemove,
        amount_cents: amountCents,
        subtotal_cents: subtotalCents,
        discount_percent: discountPercent,
        discount_cents: discountCents,
        prorated,
        expires_at: expiresAt,
        metadata: { created_by: user.id, company_name: company.name },
      }).select('*').single()
      if (invErr || !invoice) throw invErr || new Error('invoice_create_failed')

      try {
        const billing = await billingCompany(supabase)
        const pixKey = String(billing.receiving_pix_key || '').trim()
        if (!pixKey) throw new Error('billing_pix_key_not_configured')
        const pix = await generatePix(amountCents, `FuncionarIA - habilidades - ${company.name}`, pixKey)
        const qrCodeUrl = pix.qrcode || `https://www.minhai.app/api/qrcode?size=400&data=${encodeURIComponent(pix.pixCopiaECola)}&color=%236D28D9`
        const { data: tx, error: txErr } = await supabase.from('pix_transactions').insert({
          company_id: billing.id,
          user_id: company.user_id,
          txid: String(pix.txid),
          pix_code: String(pix.pixCopiaECola),
          qr_code_url: qrCodeUrl,
          amount_cents: amountCents,
          destination_pix_key: pixKey,
          destination_pix_key_type: billing.receiving_pix_key_type || null,
          status: 'pending',
          expires_at: expiresAt,
          requested_by_voice: false,
          purpose: 'payment',
          payment_provider: 'bigcorps',
          origem: 'funcionaria_subscription',
          referencia_id: invoice.id,
          notes: `FuncionarIA ${invoiceType}: ${company.name}`,
        }).select('*').single()
        if (txErr || !tx) throw txErr || new Error('transaction_create_failed')
        await supabase.from('funcionaria_invoices').update({ pix_transaction_id: tx.id, txid: String(pix.txid), updated_at: new Date().toISOString() }).eq('id', invoice.id)

        return json({
          success: true,
          payment_required: true,
          invoice: { ...invoice, pix_transaction_id: tx.id, txid: String(pix.txid) },
          invoice_id: invoice.id,
          pix_code: tx.pix_code,
          qr_code_url: tx.qr_code_url,
          amount_cents: amountCents,
          expires_at: expiresAt,
          prorated,
        })
      } catch (error) {
        await supabase.from('funcionaria_invoices').update({ status: 'failed', updated_at: new Date().toISOString(), metadata: { ...(invoice.metadata || {}), error: error instanceof Error ? error.message : String(error) } }).eq('id', invoice.id)
        throw error
      }
    }

    if (action === 'check') {
      const invoiceId = String(body.invoice_id || '')
      if (!invoiceId) return json({ error: 'invoice_id_required' }, 400)
      const { data: invoice } = await supabase.from('funcionaria_invoices').select('*').eq('id', invoiceId).eq('company_id', companyId).maybeSingle()
      if (!invoice) return json({ error: 'invoice_not_found' }, 404)
      if (invoice.processed_at) return json({ success: true, status: 'paid', applied: true, period_end: invoice.period_end })
      if (invoice.status !== 'pending') return json({ success: false, status: invoice.status })
      if (invoice.expires_at && new Date(invoice.expires_at).getTime() <= Date.now()) {
        await cancelPendingInvoice(supabase, invoice, 'expired')
        return json({ success: false, status: 'expired' })
      }
      if (!invoice.txid || !invoice.pix_transaction_id) return json({ error: 'invoice_without_pix' }, 409)

      const result = await checkInter(String(invoice.txid))
      if (!result.paid) return json({ success: false, status: 'pending' })
      const expected = Number(invoice.amount_cents) / 100
      if (Number.isFinite(result.amount) && result.amount > 0 && Math.abs(result.amount - expected) > 0.01) {
        return json({ error: 'paid_amount_mismatch' }, 409)
      }
      const paidAt = new Date(result.paidAt || Date.now()).toISOString()
      await supabase.from('pix_transactions').update({ status: 'confirmed', confirmed_at: paidAt, updated_at: new Date().toISOString() }).eq('id', invoice.pix_transaction_id).eq('status', 'pending')
      const { data: applied, error: applyErr } = await supabase.rpc('funcionaria_apply_paid_invoice', { p_invoice_id: invoice.id })
      if (applyErr) throw applyErr
      return json({ success: true, status: 'paid', applied })
    }

    return json({ error: 'invalid_action' }, 400)
  } catch (error) {
    console.error('[funcionaria-billing]', error)
    return json({ error: error instanceof Error ? error.message : 'internal_error' }, 500)
  }
})
