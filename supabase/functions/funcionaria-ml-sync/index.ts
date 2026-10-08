import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * FuncionarIA 7I: reconciliação incremental, ML -> catálogo único.
 * Apenas produtos importados pelo 7H + sync_enabled=true.
 * Nunca publica alterações no ML e nunca cria produtos.
 */
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const MAX_BATCH = 5
const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
}
const respond = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:HEADERS})
const cleanId = (raw:unknown) => {
  const id = String(raw || '').trim().toUpperCase()
  return /^[A-Z]{2,5}\d{5,24}$/.test(id) ? id : ''
}
const value = (raw:unknown,max=500) => String(raw || '').trim().slice(0,max)
const unique = <T>(rows:T[]) => [...new Set(rows)]

async function mlGet(url:string,token:string) {
  // URLs construídas apenas internamente. Não aceita URL arbitrária do usuário.
  const res = await fetch(url,{
    headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},
    signal:AbortSignal.timeout(12000),
  })
  if(res.status===429)throw new Error('ml_rate_limited')
  if(res.status===401 || res.status===403)throw new Error('ml_auth_required')
  if(!res.ok)throw new Error('ml_api_unavailable')
  return await res.json()
}
async function accessToken(companyId:string){
  const res=await fetch(`${SUPABASE_URL}/functions/v1/ml-refresh-token`,{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${SERVICE_ROLE}`},
    body:JSON.stringify({company_id:companyId}),
    signal:AbortSignal.timeout(12000),
  })
  const data=await res.json().catch(()=>({}))
  if(!res.ok || !data?.access_token)throw new Error('ml_reconnect_required')
  return String(data.access_token)
}
async function companyConnection(admin:any,companyId:string){
  const {data,error}=await admin.from('ml_connections')
    .select('company_id,seller_id,is_active').eq('company_id',companyId)
    .eq('is_active',true).maybeSingle()
  if(error)throw new Error('ml_connection_lookup_failed')
  return data || null
}
async function userFromRequest(req:Request,admin:any){
  const jwt=(req.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim()
  if(!jwt || jwt===SERVICE_ROLE)return null
  const {data,error}=await admin.auth.getUser(jwt)
  return error?null:data.user || null
}
async function canAccess(admin:any,userId:string,companyId:string){
  const {data:company}=await admin.from('companies').select('id,user_id').eq('id',companyId).maybeSingle()
  if(!company)return false
  if(company.user_id===userId)return true
  const {data:member}=await admin.from('company_admins').select('company_id')
    .eq('company_id',companyId).eq('user_id',userId).maybeSingle()
  return !!member
}
async function sha256(data:unknown){
  const raw=new TextEncoder().encode(JSON.stringify(data))
  const digest=await crypto.subtle.digest('SHA-256',raw)
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')
}
async function mlItems(token:string,itemIds:string[]){
  if(!itemIds.length)return []
  const url=new URL('https://api.mercadolibre.com/items/bulk')
  url.searchParams.set('ids',itemIds.join(','))
  const rows=await mlGet(url.toString(),token)
  if(!Array.isArray(rows))throw new Error('ml_bulk_invalid')
  return rows.filter((r:any)=>Number(r?.status_code)===200 && r?.body)
    .map((r:any)=>r.body)
}
async function strictPrice(token:string,itemId:string){
  const prices=await mlGet(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/prices`,token)
  const options=Array.isArray(prices?.prices)?prices.prices:[]
  const standard=options.find((p:any)=>p?.type==='standard' &&
    (!Array.isArray(p?.conditions?.context_restrictions) || !p.conditions.context_restrictions.length))
  if(!standard)throw new Error('ml_standard_price_missing')
  const amount=Number(standard.amount)
  if(!Number.isFinite(amount) || amount<=0)throw new Error('ml_invalid_price')
  return amount
}
function upIds(item:any){
  const variations=Array.isArray(item?.variations)?item.variations:[]
  const ids=variations.map((v:any)=>value(v?.user_product_id,80)).filter(Boolean)
  const root=value(item?.user_product_id,80)
  return unique(ids.length?ids:(root?[root]:[]))
}
async function exactStock(token:string,item:any){
  const ids=upIds(item)
  // Quantidades de /items e variations são referenciais. Não usá-las como saldo exato.
  if(!ids.length || ids.length>12)return {source:'unknown',quantity:null}
  let total=0
  for(const id of ids){
    const data=await mlGet(`https://api.mercadolibre.com/user-products/${encodeURIComponent(id)}/stock`,token)
    if(!Array.isArray(data?.locations) || data.locations.length===0)return {source:'unknown',quantity:null}
    for(const place of data.locations){
      const qty=Number(place?.quantity)
      if(!Number.isFinite(qty) || qty<0)return {source:'unknown',quantity:null}
      total+=qty
    }
  }
  return {source:'user_product',quantity:total}
}
function variations(item:any){
  return (Array.isArray(item?.variations)?item.variations:[]).slice(0,50).map((v:any)=>({
    id:value(v?.id,80),
    price:Number.isFinite(Number(v?.price))?Number(v.price):null,
    user_product_id:value(v?.user_product_id,80) || null,
    attributes:(Array.isArray(v?.attribute_combinations)?v.attribute_combinations:[])
      .slice(0,12).map((a:any)=>({id:value(a?.id,80),value_id:value(a?.value_id,120),value_name:value(a?.value_name,160)})),
  }))
}
async function hydrate(token:string,item:any){
  const itemId=cleanId(item?.id)
  const title=value(item?.title,240)
  if(!itemId || !title)throw new Error('ml_item_invalid')
  const [price,stock]=await Promise.all([
    strictPrice(token,itemId),
    exactStock(token,item).catch(()=>({source:'unknown',quantity:null})),
  ])
  const state=value(item?.status,80)
  if(!state || !['active','paused','closed','inactive','under_review'].includes(state))throw new Error('ml_status_unrecognized')
  const image=value(item?.pictures?.[0]?.secure_url || item?.thumbnail,1200)
  const product:Record<string,unknown>={
    nome:title,
    preco_venda:price,
    is_active:state==='active',
    ml_status:state,
  }
  if(image)product.imagem_url=image
  if(stock.source==='user_product' && stock.quantity!==null)product.estoque_atual=stock.quantity
  const summary=variations(item)
  const sync={
    ml_sync_hash:await sha256({itemId,product,variations:summary}),
    ml_stock_source:stock.source,
    ml_user_product_id:value(item?.user_product_id,80),
    ml_variations:summary,
    ml_status:state,
  }
  return {product,sync}
}
function safeError(err:unknown){
  const reason=err instanceof Error?err.message:'internal_error'
  const supported=new Set([
    'ml_rate_limited','ml_auth_required','ml_api_unavailable','ml_reconnect_required',
    'ml_standard_price_missing','ml_invalid_price','ml_item_invalid',
    'ml_bulk_invalid','ml_connection_required','ml_seller_mismatch',
    'ml_item_not_found','ml_connection_lookup_failed','ml_sync_rpc_failed',
    'ml_status_unrecognized','ml_variations_changed',
  ])
  return supported.has(reason)?reason:'ml_sync_failed'
}
async function recordFailure(admin:any,row:any,reason:string){
  const attempts=Math.min(20,Math.max(0,Number(row.sync_attempts || 0))+1)
  const delayMinutes=reason==='ml_variations_changed'?1440:reason==='ml_rate_limited'?60:Math.min(1440,5*Math.pow(2,Math.min(attempts,8)))
  await admin.from('funcionaria_ml_product_sync').update({
    sync_last_state:reason==='ml_variations_changed'?'variants_review':'error',
    sync_attempts:attempts,
    sync_next_at:new Date(Date.now()+delayMinutes*60000).toISOString(),
    sync_last_checked_at:new Date().toISOString(),
    last_error:reason,
  }).eq('id',row.id).eq('company_id',row.company_id)
}
async function syncRows(admin:any,rows:any[]){
  const results:any[]=[]
  const groups=new Map<string,any[]>()
  for(const row of rows){
    if(!groups.has(row.company_id))groups.set(row.company_id,[])
    groups.get(row.company_id)!.push(row)
  }
  for(const [companyId,group] of groups){
    try{
      const conn=await companyConnection(admin,companyId)
      if(!conn)throw new Error('ml_connection_required')
      const token=await accessToken(companyId)
      const ids=group.map(r=>cleanId(r.ml_item_id)).filter(Boolean)
      const items=await mlItems(token,ids)
      const indexed=new Map(items.map((item:any)=>[cleanId(item?.id),item]))
      for(const row of group){
        const itemId=cleanId(row.ml_item_id)
        try{
          const item=indexed.get(itemId)
          if(!item)throw new Error('ml_item_not_found')
          if(String(item.seller_id || '')!==String(conn.seller_id))throw new Error('ml_seller_mismatch')
          const normalized=await hydrate(token,item)
          const previous=Array.isArray(row.ml_variations)?row.ml_variations:[]
          const current=normalized.sync.ml_variations as any[]
          // Diferenças em variações/preços exigem revisão, sem reescrever opções locais.
          const canonical=(arr:any[])=>JSON.stringify(arr.map((v:any)=>({
            id:String(v?.id || ''),
            price:Number.isFinite(Number(v?.price))?Number(v.price):null,
            attributes:(Array.isArray(v?.attributes)?v.attributes:v?.attribute_combinations || [])
              .map((a:any)=>({id:String(a?.id || ''),value_id:String(a?.value_id || ''),value_name:String(a?.value_name || '')}))
              .sort((a:any,b:any)=>a.id.localeCompare(b.id)),
          })).sort((a:any,b:any)=>a.id.localeCompare(b.id)))
          const optionsChanged=canonical(previous)!==canonical(current)
          const previousPrice=Number(row.sync_last_applied?.preco_venda)
          const priceChanged=previousPrice>0 && previousPrice!==Number(normalized.product.preco_venda)
          if((previous.length > 0 || current.length > 0) && (optionsChanged || priceChanged))throw new Error('ml_variations_changed')
          const {data,error}=await admin.rpc('funcionaria_apply_ml_sync',{
            p_company_id:companyId,p_ml_item_id:itemId,
            p_product:normalized.product,p_sync:normalized.sync,
          })
          if(error)throw new Error('ml_sync_rpc_failed')
          results.push({item_id:itemId,status:value(data?.status,50),fields:data?.fields || []})
        }catch(error){
          const reason=safeError(error)
          await recordFailure(admin,row,reason)
          results.push({item_id:itemId,status:'error',reason})
        }
      }
    }catch(error){
      const reason=safeError(error)
      for(const row of group){
        await recordFailure(admin,row,reason)
        results.push({item_id:row.ml_item_id,status:'error',reason})
      }
    }
  }
  return results
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:HEADERS})
  if(req.method!=='POST')return respond({error:'method_not_allowed'},405)
  if(!SUPABASE_URL || !SERVICE_ROLE)return respond({error:'service_unavailable'},503)
  const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}})
  try{
    const body=await req.json().catch(()=>({})) as Record<string,any>
    const action=value(body.action,40)
    const token=(req.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim()
    const isService=token===SERVICE_ROLE

    if(action==='due'){
      if(!isService)return respond({error:'forbidden'},403)
      const {data,error}=await admin.from('funcionaria_ml_product_sync')
        .select('id,company_id,ml_item_id,sync_attempts,ml_variations,sync_last_applied')
        .eq('sync_enabled',true).eq('sync_source','mercadolivre')
        .lte('sync_next_at',new Date().toISOString())
        .order('sync_next_at',{ascending:true}).limit(MAX_BATCH)
      if(error)throw new Error('ml_sync_queue_failed')
      return respond({success:true,results:await syncRows(admin,data || [])})
    }

    const user=await userFromRequest(req,admin)
    if(!user)return respond({error:'unauthorized'},401)
    const companyId=value(body.company_id,80)
    if(!/^[0-9a-fA-F-]{36}$/.test(companyId))return respond({error:'company_id_required'},400)
    if(!await canAccess(admin,user.id,companyId))return respond({error:'forbidden'},403)

    if(action==='status'){
      const {data,error}=await admin.from('funcionaria_ml_product_sync')
        .select('ml_item_id,product_id,sync_source,sync_enabled,sync_last_state,sync_last_checked_at,sync_next_at,sync_attempts,sync_conflicts,last_error,ml_stock_source')
        .eq('company_id',companyId).order('updated_at',{ascending:false}).limit(250)
      if(error)throw new Error('ml_sync_status_failed')
      return respond({success:true,items:data || []})
    }
    if(action==='configure'){
      const id=cleanId(body.item_id)
      if(!id || typeof body.enabled!=='boolean')return respond({error:'invalid_config'},400)
      const {data,error}=await admin.from('funcionaria_ml_product_sync')
        .update({sync_enabled:body.enabled,sync_next_at:new Date().toISOString(),sync_attempts:0})
        .eq('company_id',companyId).eq('ml_item_id',id).eq('sync_source','mercadolivre')
        .select('ml_item_id,sync_enabled').maybeSingle()
      if(error)throw new Error('ml_sync_config_failed')
      if(!data)return respond({error:'not_imported_or_direction_blocked'},409)
      return respond({success:true,item:data})
    }
    if(action==='run'){
      const ids=unique((Array.isArray(body.item_ids)?body.item_ids:[]).map(cleanId).filter(Boolean))
      if(!ids.length || ids.length>MAX_BATCH)return respond({error:'max_5_item_ids'},400)
      const {data,error}=await admin.from('funcionaria_ml_product_sync')
        .select('id,company_id,ml_item_id,sync_attempts,ml_variations,sync_last_applied')
        .eq('company_id',companyId).eq('sync_source','mercadolivre')
        .eq('sync_enabled',true).in('ml_item_id',ids)
      if(error)throw new Error('ml_sync_list_failed')
      if((data || []).length!==ids.length)return respond({error:'some_items_not_enabled'},409)
      return respond({success:true,results:await syncRows(admin,data || [])})
    }
    return respond({error:'invalid_action'},400)
  }catch(error){
    console.error('[funcionaria-ml-sync]',safeError(error))
    return respond({error:safeError(error)},500)
  }
})
