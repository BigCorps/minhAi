import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BIGCORPS_PIX_KEY = Deno.env.get('BIGCORPS_PIX_KEY') ?? ''
const BIGCORPS_PIX_KEY_TYPE = Deno.env.get('BIGCORPS_PIX_KEY_TYPE') ?? 'random'
const BANCO_INTER_API_KEY = Deno.env.get('BANCO_INTER_API_KEY') ?? ''
const headers = { 'Content-Type': 'application/json' }

function dateOnly(value: Date) { return value.toISOString().slice(0,10) }
function addDays(value: Date, days: number) { const d=new Date(value); d.setUTCDate(d.getUTCDate()+days); return d }
function addMonths(value: Date, months: number) { const d=new Date(value); d.setUTCMonth(d.getUTCMonth()+months); return d }
function addYears(value: Date, years: number) { const d=new Date(value); d.setUTCFullYear(d.getUTCFullYear()+years); return d }

async function getSecret(admin:any) {
  const { data } = await admin.from('pixwiki_internal_secrets').select('secret').eq('key','billing_cron').maybeSingle()
  return String(data?.secret || '')
}

async function findBillingCompany(admin:any) {
  const { data,error } = await admin.from('companies').select('id,name,user_id,email_contato')
    .eq('name','Gerente BigCorps').eq('email_contato','contato@bigcorps.com.br').limit(1).maybeSingle()
  if (error || !data) throw new Error('billing_company_not_found')
  return data
}

async function makeBankCharge(admin:any, invoice:any) {
  if (!BIGCORPS_PIX_KEY || !BANCO_INTER_API_KEY) throw new Error('billing_not_configured')
  if (Number(invoice.amount_cents||0)<=0) return invoice
  const billing = await findBillingCompany(admin)
  if (invoice.pix_transaction_id) await admin.from('pix_transactions').update({status:'expired'}).eq('id',invoice.pix_transaction_id).eq('status','pending')

  const transactionId=crypto.randomUUID()
  const expiresAt=new Date(Date.now()+30*60*1000)
  const display = invoice.invoice_type==='overage' ? `PixWiki - Excedente ${invoice.usage_period_start}` : `PixWiki - Renovação ${String(invoice.target_plan||'').toUpperCase()}`
  const { error:txError } = await admin.from('pix_transactions').insert({
    id:transactionId,company_id:billing.id,user_id:invoice.user_id,amount_cents:invoice.amount_cents,
    destination_pix_key:BIGCORPS_PIX_KEY,destination_pix_key_type:BIGCORPS_PIX_KEY_TYPE,
    status:'pending',expires_at:expiresAt.toISOString(),requested_by_voice:false,pix_code:'pending',
    purpose:'pixwiki_subscription',notes:`${display} · fatura ${invoice.id}`,payment_provider:'bigcorps',
    origem:invoice.invoice_type==='overage'?'pixwiki_overage':'pixwiki_subscription',referencia_id:invoice.id,
  })
  if (txError) throw new Error(`transaction_create_failed:${txError.message}`)

  const response=await fetch('https://inter.btsolucao.com.br/cob.php',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${BANCO_INTER_API_KEY}`},
    body:JSON.stringify({amount:{original:(Number(invoice.amount_cents)/100).toFixed(2)},expiresIn:1800,displayText:display.slice(0,140),modalidadeAlteracao:0,chave:BIGCORPS_PIX_KEY}),
  })
  const data=await response.json().catch(()=>({}))
  if (!response.ok || !data?.txid || !data?.pixCopiaECola) {
    await admin.from('pix_transactions').update({status:'cancelled'}).eq('id',transactionId).eq('status','pending')
    throw new Error('bank_charge_failed')
  }
  const logo='https://minhai.app/brands/pix/web-app-manifest-512x512.png'
  const qrCodeUrl=`https://minhai.app/api/qrcode?size=400&data=${encodeURIComponent(data.pixCopiaECola)}&company_id=${billing.id}&color=%23000080&logo_url=${encodeURIComponent(logo)}`
  await admin.from('pix_transactions').update({txid:String(data.txid),pix_code:data.pixCopiaECola,qr_code_url:qrCodeUrl}).eq('id',transactionId)
  await admin.from('pixwiki_invoices').update({pix_transaction_id:transactionId,txid:String(data.txid),expires_at:expiresAt.toISOString(),updated_at:new Date().toISOString()}).eq('id',invoice.id)
  const { data:updated }=await admin.from('pixwiki_invoices').select('*').eq('id',invoice.id).single()
  return updated
}

async function checkBankInvoice(admin:any, invoice:any) {
  if (invoice.status!=='pending' || !invoice.txid || !invoice.pix_transaction_id || !BANCO_INTER_API_KEY) return false
  const response=await fetch(`https://inter.btsolucao.com.br/get.php?txid=${encodeURIComponent(invoice.txid)}`,{headers:{Authorization:`Bearer ${BANCO_INTER_API_KEY}`}})
  if (!response.ok) return false
  const api=await response.json().catch(()=>({}))
  const bank=api?.data || api
  const status=String(bank?.status||'').toUpperCase()
  if (!['PAGO','REALIZADO','CONCLUIDA'].includes(status)) return false
  const paidAt=bank?.datapagamento || new Date().toISOString()
  await admin.from('pix_transactions').update({status:'confirmed',confirmed_at:paidAt}).eq('id',invoice.pix_transaction_id).eq('status','pending')
  await admin.from('pixwiki_invoices').update({status:'paid',paid_at:paidAt,updated_at:new Date().toISOString()}).eq('id',invoice.id).eq('status','pending')
  const { error }=await admin.rpc('pixwiki_v2_apply_paid_invoice',{p_invoice_id:invoice.id})
  if (error) throw error
  return true
}

async function closeUsagePeriod(admin:any, period:any) {
  if (period.settlement_status!=='open') return { kind:'skip' }
  const { data:qData,error:qError }=await admin.rpc('pixwiki_v2_monthly_settlement_quote',{p_user_id:period.user_id,p_period_start:period.period_start})
  if (qError) throw qError
  const q=Array.isArray(qData)?qData[0]:qData
  if (!q) throw new Error('settlement_quote_missing')

  const net=Number(q.net_overage_due_cents||0)
  const carried=Number(q.convenience_credit_carried_cents||0)
  const applied=Number(q.convenience_credit_applied_cents||0)
  if (net<=0) {
    const { error }=await admin.rpc('pixwiki_v2_settle_zero_usage_period',{
      p_user_id:period.user_id,p_period_start:period.period_start,p_protected_plan:q.protected_plan,
      p_protected_total_cents:Number(q.protected_total_cents||0),p_credit_applied_cents:applied,p_credit_carried_cents:carried,
    })
    if (error) throw error
    return { kind:'settled_zero', amount:0 }
  }

  let { data:invoice }=await admin.from('pixwiki_invoices').select('*')
    .eq('user_id',period.user_id).eq('invoice_type','overage').eq('usage_period_start',period.period_start).maybeSingle()

  if (!invoice) {
    const dueAt=new Date(`${period.period_end}T03:00:00Z`)
    const graceUntil=addDays(dueAt,7)
    const insert=await admin.from('pixwiki_invoices').insert({
      user_id:period.user_id,target_plan:q.current_plan,status:'pending',amount_cents:net,
      invoice_type:'overage',billing_interval:q.billing_interval,usage_period_start:period.period_start,usage_period_end:period.period_end,
      base_price_cents:Number(q.current_monthly_base_cents||0),overage_units:Number(q.current_overage_units||0),
      overage_price_cents:Number(q.current_overage_price_cents||0),protected_plan:q.protected_plan,
      protected_total_cents:Number(q.protected_total_cents||0),convenience_credit_cents:Number(q.convenience_credit_cents||0),
      credit_applied_cents:applied,due_at:dueAt.toISOString(),grace_until:graceUntil.toISOString(),
      metadata:{source:'pixwiki-v2-close',kind:'overage',used_units:Number(q.used_units||0),current_total_cents:Number(q.current_total_cents||0)},
    }).select('*').single()
    if (insert.error || !insert.data) throw new Error(`overage_invoice_create_failed:${insert.error?.message||''}`)
    invoice=insert.data
  }

  const { error:markError }=await admin.rpc('pixwiki_v2_mark_usage_period_invoiced',{
    p_user_id:period.user_id,p_period_start:period.period_start,p_invoice_id:invoice.id,p_protected_plan:q.protected_plan,
    p_protected_total_cents:Number(q.protected_total_cents||0),p_billed_amount_cents:net,
    p_credit_applied_cents:applied,p_credit_carried_cents:carried,
  })
  if (markError) throw markError

  if (!invoice.pix_transaction_id || !invoice.expires_at || new Date(invoice.expires_at).getTime()<=Date.now()) {
    try { invoice=await makeBankCharge(admin,invoice) } catch (e) { /* obrigação persiste; usuário pode regenerar */ }
  }
  return { kind:'invoiced', amount:net, invoice_id:invoice.id }
}

async function ensureRenewal(admin:any, account:any) {
  if (account.plan==='free' || account.complimentary===true || !account.current_period_end) return {kind:'skip'}
  const today=dateOnly(new Date())
  const periodEnd=String(account.current_period_end)
  const endDate=new Date(`${periodEnd}T12:00:00Z`)
  const reminderStart=dateOnly(addDays(endDate,-3))

  if (account.cancel_at_period_end===true && periodEnd<=today) {
    await admin.from('pixwiki_v2_billing_accounts').update({status:'cancelled',plan:'free',billing_interval:'monthly',current_period_start:null,current_period_end:null,grace_until:null,updated_at:new Date().toISOString()}).eq('user_id',account.user_id)
    await admin.from('pixwiki_subscriptions').update({status:'expired',cancel_at_period_end:false,updated_at:new Date().toISOString()}).eq('user_id',account.user_id)
    return {kind:'cancelled'}
  }
  if (account.cancel_at_period_end===true || today<reminderStart) return {kind:'skip'}

  let { data:invoice }=await admin.from('pixwiki_invoices').select('*').eq('user_id',account.user_id).eq('invoice_type','base').eq('status','pending').maybeSingle()
  if (!invoice) {
    const { data:plan }=await admin.from('pixwiki_v2_plan_catalog').select('plan,name,monthly_price_cents,annual_price_cents').eq('plan',account.plan).maybeSingle()
    if (!plan) throw new Error('renewal_plan_missing')
    const base=account.billing_interval==='annual'?Number(plan.annual_price_cents||0):Number(plan.monthly_price_cents||0)
    const credit=Math.min(Number(account.credit_balance_cents||0),base)
    const amount=Math.max(base-credit,0)
    const nextEnd=dateOnly(account.billing_interval==='annual'?addYears(endDate,1):addMonths(endDate,1))
    const dueAt=new Date(`${periodEnd}T03:00:00Z`)
    const graceUntil=addDays(dueAt,7)
    const insert=await admin.from('pixwiki_invoices').insert({
      user_id:account.user_id,target_plan:account.plan,status:amount===0?'paid':'pending',amount_cents:amount,
      invoice_type:'base',billing_interval:account.billing_interval,base_price_cents:base,credit_applied_cents:credit,
      period_start:periodEnd,period_end:nextEnd,due_at:dueAt.toISOString(),grace_until:graceUntil.toISOString(),
      paid_at:amount===0?new Date().toISOString():null,
      metadata:{source:'pixwiki-v2-renewal',kind:'renewal',credit_applied_cents:credit},
    }).select('*').single()
    if (insert.error || !insert.data) throw new Error(`renewal_invoice_create_failed:${insert.error?.message||''}`)
    invoice=insert.data
    if (amount===0) {
      const { error }=await admin.rpc('pixwiki_v2_apply_paid_invoice',{p_invoice_id:invoice.id})
      if (error) throw error
      return {kind:'renewed_credit',invoice_id:invoice.id}
    }
  }

  if (!invoice.pix_transaction_id || !invoice.expires_at || new Date(invoice.expires_at).getTime()<=Date.now()) {
    try { invoice=await makeBankCharge(admin,invoice) } catch (e) { /* mantém obrigação */ }
  }

  if (periodEnd<=today) {
    const graceDate=dateOnly(addDays(endDate,7))
    await admin.from('pixwiki_v2_billing_accounts').update({
      status:today>graceDate?'paused':'grace',grace_until:graceDate,updated_at:new Date().toISOString(),
    }).eq('user_id',account.user_id)
  }
  return {kind:'renewal_pending',invoice_id:invoice.id}
}

Deno.serve(async(req:Request)=>{
  if(req.method!=='POST') return new Response(JSON.stringify({error:'method_not_allowed'}),{status:405,headers})
  const admin=createClient(SUPABASE_URL,SERVICE_ROLE)
  const expected=await getSecret(admin)
  if(!expected || req.headers.get('x-pixwiki-internal-key')!==expected) return new Response(JSON.stringify({error:'not_found'}),{status:404,headers})

  const result:any={ok:true,checked_invoices:0,paid_invoices:0,closed_periods:0,overage_invoices:0,renewals:0,paused:0,errors:[]}
  try {
    const { data:pending,error:pendingError }=await admin.from('pixwiki_invoices').select('*').eq('status','pending').order('created_at',{ascending:true}).limit(150)
    if(pendingError) throw pendingError
    for(const invoice of pending||[]) {
      result.checked_invoices++
      try {
        if(await checkBankInvoice(admin,invoice)) result.paid_invoices++
        else if(invoice.expires_at && new Date(invoice.expires_at).getTime()<=Date.now() && invoice.pix_transaction_id) {
          await admin.from('pix_transactions').update({status:'expired'}).eq('id',invoice.pix_transaction_id).eq('status','pending')
        }
      } catch(e) { result.errors.push(`invoice:${invoice.id}:${e instanceof Error?e.message:String(e)}`.slice(0,320)) }
    }

    const today=dateOnly(new Date())
    const { data:periods,error:periodError }=await admin.from('pixwiki_v2_usage_periods').select('id,user_id,period_start,period_end,settlement_status').eq('settlement_status','open').lte('period_end',today).order('period_end',{ascending:true}).limit(100)
    if(periodError) throw periodError
    for(const period of periods||[]) {
      try {
        const x=await closeUsagePeriod(admin,period)
        if(x.kind!=='skip') result.closed_periods++
        if(x.kind==='invoiced') result.overage_invoices++
      } catch(e) { result.errors.push(`period:${period.user_id}:${period.period_start}:${e instanceof Error?e.message:String(e)}`.slice(0,320)) }
    }

    const { data:accounts,error:accountError }=await admin.from('pixwiki_v2_billing_accounts').select('*').in('status',['active','grace','paused']).order('updated_at',{ascending:true}).limit(500)
    if(accountError) throw accountError
    for(const account of accounts||[]) {
      try {
        const x=await ensureRenewal(admin,account)
        if(x.kind?.startsWith('renew')) result.renewals++

        const { data:overdue }=await admin.from('pixwiki_invoices').select('id').eq('user_id',account.user_id).eq('status','pending').not('grace_until','is',null).lt('grace_until',new Date().toISOString()).limit(1).maybeSingle()
        if(overdue && account.complimentary!==true) {
          await admin.from('pixwiki_v2_billing_accounts').update({status:'paused',updated_at:new Date().toISOString()}).eq('user_id',account.user_id)
          result.paused++
        }
      } catch(e) { result.errors.push(`account:${account.user_id}:${e instanceof Error?e.message:String(e)}`.slice(0,320)) }
    }

    return new Response(JSON.stringify({...result,errors:result.errors.slice(0,20)}),{headers})
  } catch(e) {
    const message=e instanceof Error?e.message:'internal_error'
    console.error('[pixwiki-reconcile-subscriptions-v2]',message)
    return new Response(JSON.stringify({ok:false,error:message,...result}),{status:500,headers})
  }
})
