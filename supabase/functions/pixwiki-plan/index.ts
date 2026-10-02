import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BIGCORPS_PIX_KEY = Deno.env.get('BIGCORPS_PIX_KEY') ?? ''
const BIGCORPS_PIX_KEY_TYPE = Deno.env.get('BIGCORPS_PIX_KEY_TYPE') ?? 'random'
const BANCO_INTER_API_KEY = Deno.env.get('BANCO_INTER_API_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pixwiki-internal-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: cors }) }
function dateOnly(value: Date) { return value.toISOString().slice(0, 10) }
function addMonths(date: Date, months: number) { const d = new Date(date); d.setUTCMonth(d.getUTCMonth() + months); return d }
function addYears(date: Date, years: number) { const d = new Date(date); d.setUTCFullYear(d.getUTCFullYear() + years); return d }

async function billingSecret(admin: any) {
  const { data } = await admin.from('pixwiki_internal_secrets').select('secret').eq('key', 'billing_cron').maybeSingle()
  return String(data?.secret ?? '')
}

async function resolveUser(admin: any, req: Request, body: any) {
  const internal = req.headers.get('x-pixwiki-internal-key') ?? ''
  const secret = await billingSecret(admin)
  if (internal && secret && internal === secret && body?.test_user_id) return { userId: String(body.test_user_id), internal: true }
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return { userId: data.user.id, internal: false }
}

async function ownsPixWiki(admin:any,userId:string){
  const { data }=await admin.from('companies').select('id').eq('user_id',userId).eq('segment_key','pix_wiki').eq('is_active',true).limit(1).maybeSingle()
  return !!data
}

async function ensureAccount(admin: any, userId: string) {
  await admin.from('pixwiki_v2_billing_accounts').upsert({ user_id: userId, plan: 'free', status: 'active', billing_interval: 'monthly' }, { onConflict: 'user_id', ignoreDuplicates: true })
  const { data, error } = await admin.from('pixwiki_v2_billing_accounts').select('*').eq('user_id', userId).maybeSingle()
  if (error || !data) throw new Error('billing_account_unavailable')
  return data
}

async function findBillingCompany(admin: any) {
  const { data, error } = await admin.from('companies').select('id,name,user_id,email_contato')
    .eq('name', 'Gerente BigCorps').eq('email_contato', 'contato@bigcorps.com.br').limit(1).maybeSingle()
  if (error || !data) throw new Error('billing_company_not_found')
  return data
}

async function invoicePayload(admin: any, invoice: any) {
  if (!invoice) return null
  let tx: any = null
  if (invoice.pix_transaction_id) {
    const { data } = await admin.from('pix_transactions').select('id,txid,pix_code,status,expires_at,qr_code_url,confirmed_at')
      .eq('id', invoice.pix_transaction_id).maybeSingle()
    tx = data
  }
  return {
    id: invoice.id,
    invoice_type: invoice.invoice_type || 'base',
    target_plan: invoice.target_plan,
    billing_interval: invoice.billing_interval,
    status: invoice.status,
    amount_cents: Number(invoice.amount_cents || 0),
    base_price_cents: Number(invoice.base_price_cents || 0),
    overage_units: Number(invoice.overage_units || 0),
    overage_price_cents: Number(invoice.overage_price_cents || 0),
    protected_plan: invoice.protected_plan || null,
    protected_total_cents: invoice.protected_total_cents == null ? null : Number(invoice.protected_total_cents),
    convenience_credit_cents: Number(invoice.convenience_credit_cents || 0),
    credit_applied_cents: Number(invoice.credit_applied_cents || 0),
    usage_period_start: invoice.usage_period_start,
    usage_period_end: invoice.usage_period_end,
    due_at: invoice.due_at,
    grace_until: invoice.grace_until,
    expires_at: tx?.expires_at ?? invoice.expires_at,
    transaction_id: invoice.pix_transaction_id,
    txid: tx?.txid ?? invoice.txid ?? null,
    pix_code: tx?.pix_code ?? null,
    qr_code_url: tx?.qr_code_url ?? null,
    charge_status: tx?.status ?? null,
    paid_at: invoice.paid_at,
    processed_at: invoice.processed_at,
  }
}

async function currentStatus(admin: any, userId: string) {
  const account = await ensureAccount(admin, userId)
  const monthStart = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).slice(0, 8) + '01'
  const [catalogRes, invoicesRes, usageRes] = await Promise.all([
    admin.from('pixwiki_v2_plan_catalog').select('plan,name,rank,monthly_price_cents,annual_price_cents,included_automations,overage_price_cents,features,is_active').eq('is_active', true).order('rank'),
    admin.from('pixwiki_invoices').select('*').eq('user_id', userId).in('status', ['pending','paid']).order('created_at', { ascending: false }).limit(12),
    admin.from('pixwiki_v2_usage_periods').select('period_start,period_end,used_units,convenience_credit_cents,settlement_status,protected_plan,protected_total_cents,billed_amount_cents').eq('user_id', userId).eq('period_start', monthStart).maybeSingle(),
  ])
  const invoices = []
  for (const row of invoicesRes.data ?? []) invoices.push(await invoicePayload(admin, row))
  return {
    can_manage_billing: await ownsPixWiki(admin,userId),
    billing: {
      plan: account.plan,
      billing_interval: account.billing_interval,
      status: account.status,
      allow_overage: account.allow_overage,
      spending_limit_cents: account.spending_limit_cents,
      complimentary: account.complimentary,
      current_period_start: account.current_period_start,
      current_period_end: account.current_period_end,
      grace_until: account.grace_until,
      cancel_at_period_end: account.cancel_at_period_end,
      credit_balance_cents: Number(account.credit_balance_cents || 0),
      payment_method: account.payment_method || 'pix',
    },
    plans: catalogRes.data ?? [],
    usage: usageRes.data ?? null,
    open_invoices: invoices.filter((x:any) => x?.status === 'pending'),
    recent_invoices: invoices,
  }
}

async function cancelPendingBase(admin: any, userId: string) {
  const { data: old } = await admin.from('pixwiki_invoices').select('id,pix_transaction_id').eq('user_id', userId).eq('invoice_type','base').eq('status','pending').maybeSingle()
  if (!old) return
  await admin.from('pixwiki_invoices').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', old.id).eq('status','pending')
  if (old.pix_transaction_id) await admin.from('pix_transactions').update({ status: 'cancelled' }).eq('id', old.pix_transaction_id).eq('status','pending')
}

async function makeBankCharge(admin: any, invoice: any) {
  if (!BIGCORPS_PIX_KEY || !BANCO_INTER_API_KEY) throw new Error('billing_not_configured')
  if (Number(invoice.amount_cents || 0) <= 0) throw new Error('zero_invoice_does_not_need_charge')
  const billing = await findBillingCompany(admin)

  if (invoice.pix_transaction_id) {
    await admin.from('pix_transactions').update({ status: 'expired' }).eq('id', invoice.pix_transaction_id).eq('status', 'pending')
  }

  const transactionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  const purposeText = invoice.invoice_type === 'overage' ? 'Excedente PixWiki' : `Plano ${String(invoice.target_plan || '').toUpperCase()}`
  const { error: txError } = await admin.from('pix_transactions').insert({
    id: transactionId,
    company_id: billing.id,
    user_id: invoice.user_id,
    amount_cents: invoice.amount_cents,
    destination_pix_key: BIGCORPS_PIX_KEY,
    destination_pix_key_type: BIGCORPS_PIX_KEY_TYPE,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
    requested_by_voice: false,
    pix_code: 'pending',
    purpose: 'pixwiki_subscription',
    notes: `${purposeText} · fatura ${invoice.id}`,
    payment_provider: 'bigcorps',
    origem: invoice.invoice_type === 'overage' ? 'pixwiki_overage' : 'pixwiki_subscription',
    referencia_id: invoice.id,
  })
  if (txError) throw new Error(`transaction_create_failed:${txError.message}`)

  const response = await fetch('https://inter.btsolucao.com.br/cob.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BANCO_INTER_API_KEY}` },
    body: JSON.stringify({
      amount: { original: (Number(invoice.amount_cents) / 100).toFixed(2) },
      expiresIn: 1800,
      displayText: purposeText.slice(0, 140),
      modalidadeAlteracao: 0,
      chave: BIGCORPS_PIX_KEY,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.txid || !data?.pixCopiaECola) {
    await admin.from('pix_transactions').update({ status: 'cancelled' }).eq('id', transactionId).eq('status','pending')
    throw new Error('bank_charge_failed')
  }

  const logo = 'https://minhai.app/brands/pix/web-app-manifest-512x512.png'
  const qrCodeUrl = `https://minhai.app/api/qrcode?size=400&data=${encodeURIComponent(data.pixCopiaECola)}&company_id=${billing.id}&color=%23000080&logo_url=${encodeURIComponent(logo)}`
  await admin.from('pix_transactions').update({ txid: String(data.txid), pix_code: data.pixCopiaECola, qr_code_url: qrCodeUrl }).eq('id', transactionId)
  await admin.from('pixwiki_invoices').update({
    status: 'pending', pix_transaction_id: transactionId, txid: String(data.txid), expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', invoice.id)
  const { data: updated } = await admin.from('pixwiki_invoices').select('*').eq('id', invoice.id).single()
  return updated
}

async function createBaseInvoice(admin: any, userId: string, targetPlan: string, interval: string) {
  if (!['link','pro','vip'].includes(targetPlan)) throw new Error('invalid_plan')
  if (!['monthly','annual'].includes(interval)) throw new Error('invalid_billing_interval')
  const account = await ensureAccount(admin, userId)
  if (account.complimentary === true) throw new Error('complimentary_account')

  const { data: plans } = await admin.from('pixwiki_v2_plan_catalog').select('plan,rank,monthly_price_cents,annual_price_cents,name').eq('is_active',true)
  const target = (plans || []).find((p:any) => p.plan === targetPlan)
  const current = (plans || []).find((p:any) => p.plan === account.plan)
  if (!target) throw new Error('plan_unavailable')
  if (current && Number(current.rank) > Number(target.rank) && account.current_period_end && String(account.current_period_end) > dateOnly(new Date())) {
    throw new Error('downgrade_requires_period_end')
  }

  const { data: existing } = await admin.from('pixwiki_invoices').select('*').eq('user_id',userId).eq('invoice_type','base').eq('status','pending').maybeSingle()
  if (existing && existing.target_plan === targetPlan && existing.billing_interval === interval) {
    if (Number(existing.amount_cents || 0) === 0 || (existing.expires_at && new Date(existing.expires_at).getTime() > Date.now())) return existing
    return await makeBankCharge(admin, existing)
  }
  if (existing) await cancelPendingBase(admin, userId)

  const basePrice = interval === 'annual' ? Number(target.annual_price_cents || 0) : Number(target.monthly_price_cents || 0)
  if (basePrice <= 0) throw new Error('plan_unavailable')
  const creditApplied = Math.min(Number(account.credit_balance_cents || 0), basePrice)
  const amount = Math.max(basePrice - creditApplied, 0)
  const now = new Date()
  let periodStart: string | null = null, periodEnd: string | null = null
  if (account.plan === targetPlan && account.billing_interval === interval && account.current_period_end && String(account.current_period_end) > dateOnly(now)) {
    periodStart = String(account.current_period_end)
    const start = new Date(`${periodStart}T12:00:00Z`)
    periodEnd = dateOnly(interval === 'annual' ? addYears(start,1) : addMonths(start,1))
  }

  const { data: invoice, error } = await admin.from('pixwiki_invoices').insert({
    user_id:userId,target_plan:targetPlan,status:amount===0?'paid':'pending',amount_cents:amount,
    invoice_type:'base',billing_interval:interval,base_price_cents:basePrice,credit_applied_cents:creditApplied,
    period_start:periodStart,period_end:periodEnd,due_at:now.toISOString(),
    metadata:{source:'pixwiki-v2-billing',plan_name:target.name,kind:'base',credit_applied_cents:creditApplied},
    paid_at:amount===0?now.toISOString():null,
  }).select('*').single()
  if (error || !invoice) throw new Error(`invoice_create_failed:${error?.message || ''}`)

  if (amount === 0) {
    const { error: applyError } = await admin.rpc('pixwiki_v2_apply_paid_invoice',{p_invoice_id:invoice.id})
    if (applyError) throw new Error(`apply_invoice_failed:${applyError.message}`)
    const { data: done } = await admin.from('pixwiki_invoices').select('*').eq('id',invoice.id).single()
    return done
  }
  return await makeBankCharge(admin, invoice)
}

async function reconcileInvoice(admin: any, userId: string, invoiceId: string) {
  const { data: invoice } = await admin.from('pixwiki_invoices').select('*').eq('id',invoiceId).eq('user_id',userId).maybeSingle()
  if (!invoice) throw new Error('invoice_not_found')
  if (invoice.processed_at) return { paid:true,invoice:await invoicePayload(admin,invoice) }
  if (invoice.status === 'paid') {
    const { error } = await admin.rpc('pixwiki_v2_apply_paid_invoice',{p_invoice_id:invoice.id})
    if (error) throw error
    const { data: applied } = await admin.from('pixwiki_invoices').select('*').eq('id',invoice.id).single()
    return { paid:true,invoice:await invoicePayload(admin,applied) }
  }
  if (invoice.status !== 'pending' || !invoice.txid || !invoice.pix_transaction_id) return { paid:false,invoice:await invoicePayload(admin,invoice) }
  if (!BANCO_INTER_API_KEY) throw new Error('billing_not_configured')

  const response = await fetch(`https://inter.btsolucao.com.br/get.php?txid=${encodeURIComponent(invoice.txid)}`, { headers:{Authorization:`Bearer ${BANCO_INTER_API_KEY}`} })
  if (!response.ok) return { paid:false,bank_unavailable:true,invoice:await invoicePayload(admin,invoice) }
  const api = await response.json().catch(()=>({}))
  const bank = api?.data || api
  const status = String(bank?.status || '').toUpperCase()
  if (!['PAGO','REALIZADO','CONCLUIDA'].includes(status)) return { paid:false,bank_status:status||'PENDENTE',invoice:await invoicePayload(admin,invoice) }

  const paidAt = bank?.datapagamento || new Date().toISOString()
  await admin.from('pix_transactions').update({status:'confirmed',confirmed_at:paidAt}).eq('id',invoice.pix_transaction_id).eq('status','pending')
  await admin.from('pixwiki_invoices').update({status:'paid',paid_at:paidAt,updated_at:new Date().toISOString()}).eq('id',invoice.id).eq('status','pending')
  const { error: applyError } = await admin.rpc('pixwiki_v2_apply_paid_invoice',{p_invoice_id:invoice.id})
  if (applyError) throw new Error(`apply_invoice_failed:${applyError.message}`)
  const { data: done } = await admin.from('pixwiki_invoices').select('*').eq('id',invoice.id).single()
  return { paid:true,invoice:await invoicePayload(admin,done) }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors})
  const admin = createClient(SUPABASE_URL,SERVICE_ROLE)
  try {
    const body = req.method === 'POST' ? await req.json().catch(()=>({})) : {}
    const auth = await resolveUser(admin,req,body)
    if (!auth) return json({error:'unauthorized'},401)
    const userId = auth.userId
    if (req.method === 'GET') return json({ok:true,...await currentStatus(admin,userId)})
    if (req.method !== 'POST') return json({error:'method_not_allowed'},405)

    const action = String(body?.action || 'status')
    if (action === 'status') return json({ok:true,...await currentStatus(admin,userId)})
    if (action === 'preview') {
      const units = Math.max(0,Math.floor(Number(body?.units || 0)))
      const { data,error } = await admin.rpc('pixwiki_v2_quote_monthly_usage',{p_units:units})
      if (error) throw error
      return json({ok:true,units,quotes:data||[]})
    }
    if (!(await ownsPixWiki(admin,userId))) return json({error:'billing_owner_required'},403)
    if (action === 'create_invoice') {
      try {
        const invoice = await createBaseInvoice(admin,userId,String(body?.plan||''),String(body?.billing_interval||'monthly'))
        return json({ok:true,invoice:await invoicePayload(admin,invoice),...await currentStatus(admin,userId)})
      } catch (e) {
        const m = e instanceof Error ? e.message : 'invoice_error'
        if (['invalid_plan','invalid_billing_interval','plan_unavailable'].includes(m)) return json({error:m},400)
        if (['downgrade_requires_period_end','complimentary_account'].includes(m)) return json({error:m},409)
        throw e
      }
    }
    if (action === 'check_invoice') {
      const id = String(body?.invoice_id||'')
      if (!id) return json({error:'invoice_id_required'},400)
      return json({ok:true,...await reconcileInvoice(admin,userId,id),...await currentStatus(admin,userId)})
    }
    if (action === 'refresh_invoice') {
      const id = String(body?.invoice_id||'')
      const { data:invoice } = await admin.from('pixwiki_invoices').select('*').eq('id',id).eq('user_id',userId).eq('status','pending').maybeSingle()
      if (!invoice) return json({error:'invoice_not_found'},404)
      const refreshed = await makeBankCharge(admin,invoice)
      return json({ok:true,invoice:await invoicePayload(admin,refreshed),...await currentStatus(admin,userId)})
    }
    if (action === 'preferences') {
      const limit = body?.spending_limit_cents == null || body?.spending_limit_cents === '' ? null : Math.max(0,Math.floor(Number(body.spending_limit_cents)))
      const { data,error } = await admin.rpc('pixwiki_v2_set_billing_preferences',{p_allow_overage:body?.allow_overage===true,p_spending_limit_cents:limit})
      if (error) throw error
      return json({ok:true,preferences:data,...await currentStatus(admin,userId)})
    }
    if (action === 'cancel_at_period_end') {
      const account = await ensureAccount(admin,userId)
      if (account.complimentary) return json({error:'complimentary_account'},409)
      await admin.from('pixwiki_v2_billing_accounts').update({cancel_at_period_end:true,updated_at:new Date().toISOString()}).eq('user_id',userId)
      await admin.from('pixwiki_subscriptions').update({cancel_at_period_end:true,updated_at:new Date().toISOString()}).eq('user_id',userId)
      return json({ok:true,...await currentStatus(admin,userId)})
    }
    if (action === 'resume') {
      await admin.from('pixwiki_v2_billing_accounts').update({cancel_at_period_end:false,updated_at:new Date().toISOString()}).eq('user_id',userId)
      await admin.from('pixwiki_subscriptions').update({cancel_at_period_end:false,updated_at:new Date().toISOString()}).eq('user_id',userId)
      return json({ok:true,...await currentStatus(admin,userId)})
    }
    return json({error:'invalid_action'},400)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'internal_error'
    console.error('[pixwiki-plan-v2]',message)
    return json({error:message},500)
  }
})
