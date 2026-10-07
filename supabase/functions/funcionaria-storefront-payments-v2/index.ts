import { isInternalServiceRequest } from '../_shared/internal-service-auth.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL=Deno.env.get('SUPABASE_URL') || ''
const LEGACY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ML_APP_ID=Deno.env.get('ML_APP_ID') || ''
const ML_APP_SECRET=Deno.env.get('ML_APP_SECRET') || ''
const V1_URL=`${SUPABASE_URL}/functions/v1/funcionaria-storefront-payments`
const BRIDGE='https://checkout.bigcorps.com.br/redirect.html'
const PAYMENT_CHECK='https://api.checkout.infinitepay.io/payment_check'
const RETURN_URL='https://funcionaria.net/api/funcionaria/storefront-infinitepay/return'

function secretKey() {
  try {
    const parsed=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || 'null')
    if (parsed && typeof parsed==='object' && !Array.isArray(parsed)) {
      const preferred=typeof parsed.default==='string'?parsed.default:''
      if (preferred.startsWith('sb_secret_')) return preferred
      const any=Object.values(parsed).find(v=>typeof v==='string' && v.startsWith('sb_secret_'))
      if (typeof any==='string') return any
    }
  } catch {}
  return LEGACY
}
const ADMIN_KEY=secretKey()
const headers={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Content-Type':'application/json','Cache-Control':'no-store',
}
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers})}
function internalHeaders(){
  if (ADMIN_KEY.startsWith('sb_secret_')) return {'Content-Type':'application/json',apikey:ADMIN_KEY}
  return {'Content-Type':'application/json',Authorization:`Bearer ${ADMIN_KEY}`,apikey:ADMIN_KEY}
}
async function delegate(body:Record<string,unknown>) {
  const response=await fetch(V1_URL,{
    method:'POST',headers:internalHeaders(),body:JSON.stringify(body),signal:AbortSignal.timeout(15000),
  })
  const data=await response.json().catch(()=>({}))
  return json(data,response.status)
}
async function load(supabase:any,checkoutId:string) {
  const { data:checkout }=await supabase.from('funcionaria_checkouts').select('*')
    .eq('id',checkoutId).eq('origem','storefront').maybeSingle()
  if (!checkout) return null
  const { data:pedido }=await supabase.from('pedidos')
    .select('id,company_id,subtotal,desconto,total,status,delivery_requested,storefront_payment_mode_snapshot')
    .eq('id',checkout.pedido_id).eq('company_id',checkout.company_id).maybeSingle()
  if (!pedido) return null
  const { data:company }=await supabase.from('companies')
    .select('id,user_id,name,slug,infinitepay_handle,delivery_auto_dispatch')
    .eq('id',checkout.company_id).maybeSingle()
  if (!company) return null
  return {checkout,pedido,company}
}
async function guard(supabase:any,checkoutId:string) {
  const { data,error }=await supabase.rpc('funcionaria_storefront_guard_payment_mode',{p_checkout_id:checkoutId})
  if (error) throw error
  return data || {}
}
async function dispatchIfNeeded(supabase:any,pedido:any,company:any) {
  if (pedido?.delivery_requested!==true) return null
  if (company?.delivery_auto_dispatch!==true) return {ok:true,skipped:'auto_dispatch_disabled'}
  try {
    const response=await fetch(`${SUPABASE_URL}/functions/v1/lalamove-delivery`,{
      method:'POST',headers:internalHeaders(),
      body:JSON.stringify({action:'order',company_id:pedido.company_id,pedido_id:pedido.id}),
    })
    return {ok:response.ok,data:await response.json().catch(()=>({}))}
  } catch { return {ok:false,data:{error:'dispatch_request_failed'}} }
}
async function getMp(supabase:any,userId:string) {
  const { data }=await supabase.from('mp_connections')
    .select('id,user_id,access_token,refresh_token,expires_at,granted_scope,is_active')
    .eq('user_id',userId).eq('is_active',true).order('updated_at',{ascending:false})
    .limit(1).maybeSingle()
  return data || null
}
async function validMpToken(supabase:any,connection:any) {
  const expires=new Date(connection.expires_at).getTime()
  if (Number.isFinite(expires) && expires>Date.now()+5*60_000) return connection.access_token
  if (!connection.refresh_token || !ML_APP_ID || !ML_APP_SECRET) return connection.access_token
  const response=await fetch('https://api.mercadopago.com/oauth/token',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      client_id:ML_APP_ID,client_secret:ML_APP_SECRET,grant_type:'refresh_token',
      refresh_token:connection.refresh_token,
    }),
  })
  const data=await response.json().catch(()=>({}))
  if (!response.ok || !data?.access_token) return connection.access_token
  await supabase.from('mp_connections').update({
    access_token:data.access_token,refresh_token:data.refresh_token ?? connection.refresh_token,
    expires_at:new Date(Date.now()+Number(data.expires_in ?? 15552000)*1000).toISOString(),
    granted_scope:data.scope ?? connection.granted_scope ?? null,updated_at:new Date().toISOString(),
  }).eq('id',connection.id)
  return data.access_token
}
function pixPayload(tx:any,checkout:any) {
  return {
    success:true,status:checkout.status==='pago'?'paid':String(tx?.status || 'pending'),
    payment_method:'pix',payment_mode:'monthly_direct',checkout_id:checkout.id,
    transaction_id:tx?.id || null,pix_code:tx?.pix_code || null,qr_code_url:tx?.qr_code_url || null,
    amount_cents:Number(tx?.amount_cents || 0),expires_at:tx?.expires_at || checkout.expires_at,
    receipt_token:checkout.status==='pago'?checkout.receipt_token:null,
  }
}
async function settleDirect(supabase:any,loaded:any,method:'pix'|'cartao',provider:string,reference:string,txId?:string|null,paidAt?:string) {
  const { data:settlement,error }=await supabase.rpc('funcionaria_settle_storefront_direct',{
    p_checkout_id:loaded.checkout.id,p_method:method,p_provider:provider,
    p_provider_reference:reference,p_payment_transaction_id:txId || null,
    p_paid_at:paidAt || new Date().toISOString(),
  })
  if (error) throw error
  const dispatch=await dispatchIfNeeded(supabase,loaded.pedido,loaded.company)
  return {settlement,dispatch}
}
async function existingDirectPix(supabase:any,checkout:any) {
  if (checkout?.pix_transaction_id) {
    const { data }=await supabase.from('pix_transactions').select('*')
      .eq('id',checkout.pix_transaction_id)
      .eq('origem','funcionaria_storefront_monthly_direct')
      .maybeSingle()
    if (data) return data
  }
  const { data }=await supabase.from('pix_transactions').select('*')
    .eq('company_id',checkout.company_id)
    .eq('pedido_id',checkout.pedido_id)
    .eq('origem','funcionaria_storefront_monthly_direct')
    .order('created_at',{ascending:false})
    .limit(1)
    .maybeSingle()
  return data || null
}
async function createDirectPix(supabase:any,checkoutId:string) {
  const loaded=await load(supabase,checkoutId)
  if (!loaded) return json({error:'checkout_not_found'},404)
  if (loaded.checkout.status==='pago' || loaded.pedido.status==='pago') {
    return json({success:true,status:'paid',payment_mode:'monthly_direct',receipt_token:loaded.checkout.receipt_token})
  }

  const { data:prepared,error:prepErr }=await supabase.rpc(
    'funcionaria_prepare_storefront_direct_pix',{p_checkout_id:checkoutId},
  )
  if (prepErr) {
    const m=String(prepErr.message || '')
    const code=['direct_pix_not_available','payment_in_progress','checkout_not_payable','storefront_not_monthly_direct']
      .find(x=>m.includes(x))
    if (code) return json({error:code},409)
    throw prepErr
  }

  const existing=await existingDirectPix(supabase,loaded.checkout)
  if (existing && loaded.checkout.pix_transaction_id!==existing.id) {
    const { error:attachExistingError }=await supabase.rpc('funcionaria_attach_storefront_direct_pix',{
      p_checkout_id:loaded.checkout.id,p_transaction_id:existing.id,
    })
    if (attachExistingError) throw attachExistingError
    loaded.checkout.pix_transaction_id=existing.id
  }
  if (existing?.status==='pending') return json(pixPayload(existing,loaded.checkout))
  if (existing?.status==='confirmed') {
    const settled=await settleDirect(
      supabase,loaded,'pix','mercadopago_direct',String(existing.txid || existing.id),
      existing.id,existing.confirmed_at,
    )
    return json({...pixPayload(existing,{...loaded.checkout,status:'pago'}),...settled})
  }

  const mp=await getMp(supabase,loaded.company.user_id)
  if (!mp) return json({error:'direct_pix_not_available'},409)
  const token=await validMpToken(supabase,mp)
  const amount=Number(prepared.expected_amount_cents || Math.round(Number(loaded.pedido.total)*100))
  const expiration=new Date(Math.min(
    loaded.checkout.expires_at?new Date(loaded.checkout.expires_at).getTime():Date.now()+30*60_000,
    Date.now()+30*60_000,
  )).toISOString()

  const response=await fetch('https://api.mercadopago.com/v1/payments',{
    method:'POST',
    headers:{
      Authorization:`Bearer ${token}`,'Content-Type':'application/json',
      'X-Idempotency-Key':`funcionaria-storefront-direct-pix-${loaded.checkout.id}`,
    },
    body:JSON.stringify({
      transaction_amount:amount/100,
      description:`FuncionarIA - ${loaded.company.name}`.slice(0,255),
      payment_method_id:'pix',
      payer:{email:`funcionaria+${loaded.checkout.company_id}@minhai.app`},
      date_of_expiration:expiration,
      external_reference:`funcionaria-storefront:${loaded.checkout.id}`,
      metadata:{product:'funcionaria_storefront',checkout_id:loaded.checkout.id,pedido_id:loaded.pedido.id},
    }),
    signal:AbortSignal.timeout(15000),
  })
  const mpData=await response.json().catch(()=>({}))
  if (!response.ok || !mpData?.id) return json({error:'direct_pix_create_failed'},502)

  const pixCode=String(mpData?.point_of_interaction?.transaction_data?.qr_code || '')
  if (!pixCode) return json({error:'direct_pix_code_missing'},502)
  const qr=`https://www.minhai.app/api/qrcode?size=400&data=${encodeURIComponent(pixCode)}&color=%236D28D9`

  const { data:tx,error:txErr }=await supabase.from('pix_transactions').insert({
    company_id:loaded.checkout.company_id,user_id:loaded.company.user_id,pedido_id:loaded.pedido.id,
    txid:String(mpData.id),pix_code:pixCode,qr_code_url:qr,amount_cents:amount,
    original_amount_cents:amount,discount_cents:0,status:'pending',expires_at:expiration,
    requested_by_voice:false,purpose:'payment',payment_provider:'mercadopago',
    origem:'funcionaria_storefront_monthly_direct',referencia_id:loaded.checkout.id,
    notes:`FuncionarIA storefront direto ${loaded.checkout.codigo}`,
  }).select('*').single()
  if (txErr || !tx) throw txErr || new Error('direct_pix_transaction_create_failed')

  const { error:attachErr }=await supabase.rpc('funcionaria_attach_storefront_direct_pix',{
    p_checkout_id:loaded.checkout.id,p_transaction_id:tx.id,
  })
  if (attachErr) throw attachErr

  return json(pixPayload(tx,{...loaded.checkout,status:'em_pagamento'}))
}
async function checkDirectPix(supabase:any,loaded:any,tx:any) {
  if (!tx) return json({
    success:true,status:'not_started',payment_mode:'monthly_direct',
    capabilities:{pix:true,card:Boolean(loaded.company.infinitepay_handle)},
  })
  if (tx.status==='confirmed') {
    const settled=await settleDirect(
      supabase,loaded,'pix','mercadopago_direct',String(tx.txid || tx.id),tx.id,tx.confirmed_at,
    )
    return json({...pixPayload(tx,{...loaded.checkout,status:'pago'}),...settled})
  }
  if (tx.status!=='pending') return json({...pixPayload(tx,loaded.checkout),status:tx.status})

  const mp=await getMp(supabase,loaded.company.user_id)
  if (!mp) return json({error:'direct_pix_reconciliation_unavailable'},409)
  const token=await validMpToken(supabase,mp)
  const response=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(tx.txid))}`,{
    headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000),
  })
  const data=await response.json().catch(()=>({}))
  const status=String(data?.status || '').toLowerCase()
  if (status!=='approved') {
    if (['cancelled','canceled','rejected','expired'].includes(status)) {
      await supabase.from('pix_transactions').update({
        status:status==='expired'?'expired':'cancelled',updated_at:new Date().toISOString(),
      }).eq('id',tx.id).eq('status','pending')
    }
    return json(pixPayload(tx,loaded.checkout))
  }

  const paidCents=Math.round(Number(data?.transaction_amount || 0)*100)
  if (paidCents!==Number(tx.amount_cents)) return json({error:'paid_amount_mismatch'},409)
  const paidAt=data?.date_approved || data?.date_created || new Date().toISOString()
  const { data:confirmed }=await supabase.from('pix_transactions').update({
    status:'confirmed',confirmed_at:paidAt,updated_at:new Date().toISOString(),
  }).eq('id',tx.id).eq('status','pending').select('*').maybeSingle()
  const effective=confirmed || {...tx,status:'confirmed',confirmed_at:paidAt}
  const settled=await settleDirect(
    supabase,loaded,'pix','mercadopago_direct',String(effective.txid || effective.id),
    effective.id,paidAt,
  )
  return json({...pixPayload(effective,{...loaded.checkout,status:'pago'}),...settled})
}

function directOrder(checkoutId:string){return `funcionaria-direct-${checkoutId}`}
function directCardUrl(loaded:any,amount:number) {
  const handle=String(loaded.company.infinitepay_handle || '').replace(/^\$/,'').trim()
  const params=new URLSearchParams({
    valor_centavos:String(amount),order_id:directOrder(loaded.checkout.id),handle,
    payment_method:'credit',app:'funcionaria',result_url:RETURN_URL,
  })
  return `${BRIDGE}?${params.toString()}`
}
async function directCardByOrder(supabase:any,orderNsu:string) {
  const { data:payment,error }=await supabase.from('funcionaria_storefront_direct_card_payments')
    .select('*').eq('order_nsu',orderNsu).maybeSingle()
  if (error) throw error
  if (!payment) return null
  const loaded=await load(supabase,String(payment.checkout_id))
  return loaded ? {payment,loaded} : null
}
function cardPayload(payment:any,checkout:any) {
  return {
    success:true,status:checkout?.status==='pago'||payment?.status==='paid'?'paid':String(payment?.status || 'pending'),
    payment_method:'card',payment_mode:'monthly_direct',provider:'infinitepay_direct',
    checkout_id:checkout?.id || payment?.checkout_id || null,order_nsu:payment?.order_nsu || null,
    checkout_url:payment?.checkout_url || null,amount_cents:Number(payment?.expected_amount_cents || 0),
    can_reopen:payment?.status==='pending' && !payment?.transaction_nsu,
    receipt_token:checkout?.status==='pago'||payment?.status==='paid'?checkout?.receipt_token || null:null,
  }
}
async function createDirectCard(supabase:any,checkoutId:string) {
  const loaded=await load(supabase,checkoutId)
  if (!loaded) return json({error:'checkout_not_found'},404)
  if (!String(loaded.company.infinitepay_handle || '').trim()) return json({error:'direct_card_not_available'},409)
  const amount=Math.round(Number(loaded.pedido.total || 0)*100)
  const url=directCardUrl(loaded,amount)
  const { data,error }=await supabase.rpc('funcionaria_prepare_storefront_direct_card',{
    p_checkout_id:checkoutId,p_expected_amount_cents:amount,p_checkout_url:url,
  })
  if (error) {
    const m=String(error.message || '')
    const code=['direct_card_not_available','direct_card_not_configured','payment_in_progress',
      'checkout_not_payable','direct_card_reconciliation_required','storefront_not_monthly_direct']
      .find(x=>m.includes(x))
    if (code) return json({error:code},409)
    throw error
  }
  if (data?.status==='paid') return json({success:true,status:'paid',payment_mode:'monthly_direct',receipt_token:data.receipt_token})
  return json({
    success:true,status:String(data?.status || 'pending'),payment_method:'card',payment_mode:'monthly_direct',
    provider:'infinitepay_direct',checkout_id:checkoutId,order_nsu:data?.order_nsu || directOrder(checkoutId),
    checkout_url:data?.checkout_url || url,amount_cents:amount,
    can_reopen:String(data?.status || 'pending')==='pending' && !data?.transaction_nsu,
  })
}
async function signalDirectCard(supabase:any,orderNsu:string,transactionNsu:string,slug:string,receiptUrl:string) {
  if (!/^funcionaria-direct-[0-9a-f-]{36}$/i.test(orderNsu)) return json({error:'invalid_order_nsu'},400)
  if (!transactionNsu || !slug) return json({error:'invalid_provider_identifiers'},400)
  const found=await directCardByOrder(supabase,orderNsu)
  if (!found) return json({error:'card_payment_not_found'},404)
  const {payment,loaded}=found
  if (payment.status==='paid') return json({...cardPayload(payment,loaded.checkout),company_slug:loaded.company.slug})
  if (payment.status==='reconciliation_required') return json({error:'direct_card_reconciliation_required',company_slug:loaded.company.slug},409)
  if (payment.transaction_nsu && payment.transaction_nsu!==transactionNsu) {
    await supabase.from('funcionaria_storefront_direct_card_payments')
      .update({status:'reconciliation_required',error_code:'transaction_nsu_conflict'})
      .eq('id',payment.id)
    return json({error:'provider_reference_conflict',company_slug:loaded.company.slug},409)
  }
  const { data:updated,error }=await supabase.from('funcionaria_storefront_direct_card_payments').update({
    status:'signaled',transaction_nsu:transactionNsu,invoice_slug:slug,
    receipt_url:String(receiptUrl || '').slice(0,1000) || null,signaled_at:new Date().toISOString(),error_code:null,
  }).eq('id',payment.id).in('status',['pending','signaled']).select('*').maybeSingle()
  if (error || !updated) throw error || new Error('card_signal_failed')
  return json({...cardPayload(updated,loaded.checkout),company_slug:loaded.company.slug})
}
async function confirmDirectCard(supabase:any,orderNsu:string) {
  const found=await directCardByOrder(supabase,orderNsu)
  if (!found) return json({error:'card_payment_not_found'},404)
  let {payment,loaded}=found
  if (loaded.checkout.status==='pago' || loaded.pedido.status==='pago') {
    return json({...cardPayload({...payment,status:'paid'},{...loaded.checkout,status:'pago'}),company_slug:loaded.company.slug})
  }
  if (payment.status==='reconciliation_required') {
    return json({error:payment.error_code || 'direct_card_reconciliation_required',company_slug:loaded.company.slug},409)
  }
  if (payment.status==='paid') {
    const settled=await settleDirect(
      supabase,loaded,'cartao','infinitepay_direct',String(payment.transaction_nsu),null,payment.paid_at,
    )
    return json({...cardPayload(payment,{...loaded.checkout,status:'pago'}),...settled,company_slug:loaded.company.slug})
  }
  if (!payment.transaction_nsu || !payment.invoice_slug) {
    return json({...cardPayload(payment,loaded.checkout),company_slug:loaded.company.slug})
  }

  const response=await fetch(PAYMENT_CHECK,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      handle:payment.provider_handle,order_nsu:payment.order_nsu,
      transaction_nsu:payment.transaction_nsu,slug:payment.invoice_slug,
    }),
    signal:AbortSignal.timeout(7000),
  })
  const data=await response.json().catch(()=>null)
  if (!response.ok || !data?.success || data?.paid!==true) {
    return json({...cardPayload(payment,loaded.checkout),company_slug:loaded.company.slug})
  }
  const amount=Number(data.amount),paidAmount=Number(data.paid_amount ?? data.amount)
  const installments=Number(data.installments || 1),capture=String(data.capture_method || '')
  let reason=''
  if (!Number.isInteger(amount) || amount!==Number(payment.expected_amount_cents)) reason='amount_mismatch'
  else if (capture!=='credit_card') reason='capture_method_mismatch'
  else if (!Number.isInteger(installments) || installments<1 || installments>12) reason='installments_invalid'
  else if (!Number.isFinite(paidAmount) || paidAmount<amount) reason='paid_amount_invalid'
  if (reason) {
    await supabase.from('funcionaria_storefront_direct_card_payments')
      .update({status:'reconciliation_required',error_code:reason}).eq('id',payment.id)
    return json({error:reason,status:'reconciliation_required',company_slug:loaded.company.slug},409)
  }

  const paidAt=new Date().toISOString()
  const { data:marked,error }=await supabase.from('funcionaria_storefront_direct_card_payments').update({
    status:'paid',capture_method:capture,installments,provider_amount_cents:amount,
    provider_paid_amount_cents:Math.round(paidAmount),verified_at:paidAt,paid_at:paidAt,error_code:null,
  }).eq('id',payment.id).in('status',['pending','signaled']).select('*').maybeSingle()
  if (error) throw error
  payment=marked || {...payment,status:'paid',capture_method:capture,installments,provider_amount_cents:amount,paid_at:paidAt}
  const settled=await settleDirect(
    supabase,loaded,'cartao','infinitepay_direct',String(payment.transaction_nsu),null,paidAt,
  )
  return json({...cardPayload(payment,{...loaded.checkout,status:'pago'}),...settled,company_slug:loaded.company.slug})
}

Deno.serve(async(req:Request)=>{
  if (req.method==='OPTIONS') return new Response('ok',{headers})
  if (req.method!=='POST') return json({error:'method_not_allowed'},405)
  if (!SUPABASE_URL || !ADMIN_KEY) return json({error:'service_unavailable'},503)
  if (!isInternalServiceRequest(req)) return json({error:'unauthorized'},401)
  const supabase=createClient(SUPABASE_URL,ADMIN_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
  const body=await req.json().catch(()=>({})) as Record<string,any>
  const action=String(body.action || '')

  try {
    if (action==='signal_infinitepay' || action==='confirm_card') {
      const orderNsu=String(body.order_nsu || '')
      if (orderNsu.startsWith('funcionaria-storefront-')) return await delegate(body)
      if (action==='signal_infinitepay') {
        return await signalDirectCard(
          supabase,orderNsu,String(body.transaction_nsu || ''),String(body.slug || ''),String(body.receipt_url || ''),
        )
      }
      return await confirmDirectCard(supabase,orderNsu)
    }

    const checkoutId=String(body.checkout_id || '')
    if (!checkoutId) return json({error:'checkout_id_required'},400)
    const mode=await guard(supabase,checkoutId)
    if (mode?.payment_mode!=='monthly_direct') return await delegate(body)

    const loaded=await load(supabase,checkoutId)
    if (!loaded) return json({error:'checkout_not_found'},404)

    if (action==='create_pix') {
      if (mode?.direct_pix_configured!==true) return json({error:'payment_method_not_configured'},409)
      return await createDirectPix(supabase,checkoutId)
    }
    if (action==='create_card') {
      if (mode?.direct_card_configured!==true) return json({error:'payment_method_not_configured'},409)
      return await createDirectCard(supabase,checkoutId)
    }
    if (action==='status') {
      if (loaded.checkout.status==='pago' || loaded.pedido.status==='pago') {
        return json({
          success:true,status:'paid',payment_mode:'monthly_direct',checkout_id,
          receipt_token:loaded.checkout.receipt_token,
          capabilities:{pix:mode?.direct_pix_configured===true,card:mode?.direct_card_configured===true},
        })
      }
      const card=await directCardByOrder(supabase,directOrder(checkoutId))
      if (card) return await confirmDirectCard(supabase,directOrder(checkoutId))
      const tx=await existingDirectPix(supabase,loaded.checkout)
      if (tx) return await checkDirectPix(supabase,loaded,tx)
      return json({
        success:true,status:'not_started',payment_mode:'monthly_direct',checkout_id,
        capabilities:{pix:mode?.direct_pix_configured===true,card:mode?.direct_card_configured===true},
      })
    }
    return json({error:'invalid_action'},400)
  } catch(error) {
    console.error('[funcionaria-storefront-payments-v2]',error)
    return json({error:error instanceof Error?error.message:'internal_error'},500)
  }
})