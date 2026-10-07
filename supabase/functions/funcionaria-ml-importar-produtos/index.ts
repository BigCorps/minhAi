import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL=Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const BATCH=10

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Content-Type':'application/json',
  'Cache-Control':'no-store',
}

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{status,headers:corsHeaders})
}
function cleanId(value:unknown){
  const id=String(value || '').trim().toUpperCase()
  return /^[A-Z]{2,5}\d{5,24}$/.test(id) ? id : ''
}
function uniq<T>(values:T[]){return [...new Set(values)]}
function asNumber(value:unknown,fallback=0){
  const n=Number(value)
  return Number.isFinite(n)?n:fallback
}
function text(value:unknown,max=10000){return String(value || '').trim().slice(0,max)}

async function userFromRequest(req:Request,admin:any){
  const jwt=(req.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim()
  if(!jwt)return null
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
async function connection(admin:any,companyId:string){
  const {data,error}=await admin.from('ml_connections')
    .select('id,company_id,seller_id,seller_nickname,is_active')
    .eq('company_id',companyId).eq('is_active',true).maybeSingle()
  if(error)throw error
  return data || null
}
async function accessToken(companyId:string){
  const response=await fetch(`${SUPABASE_URL}/functions/v1/ml-refresh-token`,{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${SERVICE_ROLE}`},
    body:JSON.stringify({company_id:companyId}),
    signal:AbortSignal.timeout(12000),
  })
  const data=await response.json().catch(()=>({}))
  if(!response.ok || !data?.access_token)throw new Error('ml_reconnect_required')
  return String(data.access_token)
}
async function mlFetch(url:string,token:string){
  return await fetch(url,{
    headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},
    signal:AbortSignal.timeout(12000),
  })
}
async function listIds(token:string,sellerId:string,offset:number,limit:number){
  const url=new URL(`https://api.mercadolibre.com/users/${encodeURIComponent(sellerId)}/items/search`)
  url.searchParams.set('offset',String(offset))
  url.searchParams.set('limit',String(Math.max(1,Math.min(100,limit))))
  const response=await mlFetch(url.toString(),token)
  const data=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error('ml_items_list_failed')
  return {
    ids:Array.isArray(data?.results)?data.results.map(cleanId).filter(Boolean):[],
    total:Number(data?.paging?.total || 0),
    offset:Number(data?.paging?.offset || offset),
    limit:Number(data?.paging?.limit || limit),
  }
}
async function scanIds(token:string,sellerId:string,scrollId?:string){
  const url=new URL(`https://api.mercadolibre.com/users/${encodeURIComponent(sellerId)}/items/search`)
  url.searchParams.set('search_type','scan')
  url.searchParams.set('limit',String(BATCH))
  if(scrollId)url.searchParams.set('scroll_id',scrollId)
  const response=await mlFetch(url.toString(),token)
  const data=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error('ml_items_scan_failed')
  return {
    ids:Array.isArray(data?.results)?data.results.map(cleanId).filter(Boolean):[],
    scrollId:text(data?.scroll_id,4000) || null,
  }
}
async function bulkItems(token:string,ids:string[]){
  if(!ids.length)return []
  const url=new URL('https://api.mercadolibre.com/items/bulk')
  url.searchParams.set('ids',ids.join(','))
  const response=await mlFetch(url.toString(),token)
  const data=await response.json().catch(()=>[])
  if(!response.ok || !Array.isArray(data))throw new Error('ml_items_bulk_failed')
  return data
    .filter((entry:any)=>Number(entry?.status_code)===200 && entry?.body)
    .map((entry:any)=>entry.body)
}
async function description(token:string,itemId:string){
  try{
    const response=await mlFetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/description`,token)
    if(!response.ok)return ''
    const data=await response.json().catch(()=>({}))
    return text(data?.plain_text,20000)
  }catch{return ''}
}
async function currentPrice(token:string,itemId:string,fallback:unknown){
  try{
    const response=await mlFetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/prices`,token)
    if(response.ok){
      const data=await response.json().catch(()=>({}))
      const prices=Array.isArray(data?.prices)?data.prices:[]
      const standard=prices.find((p:any)=>
        p?.type==='standard' &&
        (!Array.isArray(p?.conditions?.context_restrictions) || p.conditions.context_restrictions.length===0)
      ) || prices.find((p:any)=>p?.type==='standard')
      const amount=Number(standard?.amount)
      if(Number.isFinite(amount) && amount>=0)return amount
    }
  }catch{}
  return Math.max(0,asNumber(fallback,0))
}
const categoryCache=new Map<string,string>()
async function categoryName(token:string,categoryId:string){
  if(!categoryId)return 'Mercado Livre'
  if(categoryCache.has(categoryId))return categoryCache.get(categoryId)!
  try{
    const response=await mlFetch(`https://api.mercadolibre.com/categories/${encodeURIComponent(categoryId)}`,token)
    const data=await response.json().catch(()=>({}))
    const name=text(data?.name,160) || categoryId
    categoryCache.set(categoryId,name)
    return name
  }catch{
    return categoryId
  }
}
function userProductIds(item:any){
  const variations=Array.isArray(item?.variations)?item.variations:[]
  const variationIds=variations.map((v:any)=>text(v?.user_product_id,80)).filter(Boolean)
  if(variationIds.length)return uniq(variationIds)
  const root=text(item?.user_product_id,80)
  return root?[root]:[]
}
async function exactStock(token:string,item:any){
  const ids=userProductIds(item)
  if(ids.length && ids.length<=12){
    try{
      let total=0
      for(const id of ids){
        const response=await mlFetch(`https://api.mercadolibre.com/user-products/${encodeURIComponent(id)}/stock`,token)
        if(!response.ok)throw new Error('user_product_stock_failed')
        const data=await response.json().catch(()=>({}))
        const locations=Array.isArray(data?.locations)?data.locations:[]
        total += locations.reduce((sum:number,row:any)=>sum+Math.max(0,asNumber(row?.quantity,0)),0)
      }
      return {quantity:total,source:'user_product'}
    }catch{}
  }
  const variations=Array.isArray(item?.variations)?item.variations:[]
  if(variations.length){
    return {
      quantity:variations.reduce((sum:number,v:any)=>sum+Math.max(0,asNumber(v?.available_quantity,0)),0),
      source:'variation_referential',
    }
  }
  return {quantity:Math.max(0,asNumber(item?.available_quantity,0)),source:'item_referential'}
}
function attrValue(item:any,ids:string[]){
  const attrs=Array.isArray(item?.attributes)?item.attributes:[]
  for(const id of ids){
    const hit=attrs.find((a:any)=>String(a?.id || '').toUpperCase()===id)
    const value=text(hit?.value_name || hit?.value_struct?.name,120)
    if(value)return value
  }
  return null
}
async function sha256(value:unknown){
  const bytes=new TextEncoder().encode(JSON.stringify(value))
  const hash=await crypto.subtle.digest('SHA-256',bytes)
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')
}
function normalizedVariations(item:any){
  return (Array.isArray(item?.variations)?item.variations:[]).map((v:any)=>({
    id:String(v?.id || ''),
    price:Number.isFinite(Number(v?.price))?Number(v.price):null,
    available_quantity:Number.isFinite(Number(v?.available_quantity))?Number(v.available_quantity):null,
    user_product_id:text(v?.user_product_id,80) || null,
    picture_ids:Array.isArray(v?.picture_ids)?v.picture_ids.map(String).slice(0,20):[],
    attribute_combinations:(Array.isArray(v?.attribute_combinations)?v.attribute_combinations:[]).map((a:any)=>({
      id:text(a?.id,80),name:text(a?.name,120),
      value_id:text(a?.value_id,120) || null,value_name:text(a?.value_name,160),
    })),
  }))
}
async function clearMlOptions(admin:any,syncId:string){
  const {data:links}=await admin.from('funcionaria_ml_option_links').select('group_id').eq('sync_id',syncId)
  const groupIds=uniq((links || []).map((x:any)=>String(x.group_id)).filter(Boolean))
  if(groupIds.length){
    const {error}=await admin.from('produto_opcoes_grupos').delete().in('id',groupIds)
    if(error)throw error
  }
}
function simpleVariation(item:any,basePrice:number){
  const variations=Array.isArray(item?.variations)?item.variations:[]
  if(variations.length<2)return null
  const combinations=variations.map((v:any)=>Array.isArray(v?.attribute_combinations)?v.attribute_combinations:[])
  if(combinations.some((c:any[])=>c.length!==1))return null
  const attrId=text(combinations[0]?.[0]?.id,80)
  const attrName=text(combinations[0]?.[0]?.name,120)
  if(!attrId || !attrName || combinations.some((c:any[])=>text(c[0]?.id,80)!==attrId))return null
  const rows=variations.map((v:any,i:number)=>{
    const a=combinations[i][0]
    const name=text(a?.value_name,160)
    const price=Number(v?.price)
    const delta=Number.isFinite(price)?price-basePrice:0
    return {
      variationId:String(v?.id || ''),
      valueId:text(a?.value_id,120) || null,
      name,
      delta,
    }
  })
  if(rows.some((r:any)=>!r.variationId || !r.name || r.delta<0))return null
  if(new Set(rows.map((r:any)=>r.name.toLowerCase())).size!==rows.length)return null
  return {attrId,attrName,rows}
}
async function syncOptions(admin:any,sync:any,product:any,item:any,basePrice:number){
  await clearMlOptions(admin,sync.id)
  const mapped=simpleVariation(item,basePrice)
  if(!mapped)return {mapped:false,count:0}

  const {data:group,error:groupError}=await admin.from('produto_opcoes_grupos').insert({
    produto_id:product.id,company_id:product.company_id,nome:mapped.attrName,
    obrigatorio:true,min_escolhas:1,max_escolhas:1,display_order:0,
    descricao:'Importado do Mercado Livre',
  }).select('id').single()
  if(groupError || !group)throw groupError || new Error('option_group_create_failed')

  let count=0
  for(let i=0;i<mapped.rows.length;i++){
    const row=mapped.rows[i]
    const {data:option,error}=await admin.from('produto_opcoes_itens').insert({
      grupo_id:group.id,nome:row.name,preco_adicional:row.delta,
      disponivel:true,display_order:i,
    }).select('id').single()
    if(error || !option)throw error || new Error('option_item_create_failed')
    const {error:linkError}=await admin.from('funcionaria_ml_option_links').insert({
      sync_id:sync.id,group_id:group.id,option_id:option.id,
      ml_attribute_id:mapped.attrId,ml_value_id:row.valueId,ml_variation_id:row.variationId,
    })
    if(linkError)throw linkError
    count++
  }
  return {mapped:true,count}
}
async function hydrate(token:string,item:any){
  const itemId=cleanId(item?.id)
  const categoryId=text(item?.category_id,80)
  const [desc,price,category,stock]=await Promise.all([
    description(token,itemId),
    currentPrice(token,itemId,item?.price),
    categoryName(token,categoryId),
    exactStock(token,item),
  ])
  const variations=normalizedVariations(item)
  const attributes=(Array.isArray(item?.attributes)?item.attributes:[]).map((a:any)=>({
    id:text(a?.id,80),name:text(a?.name,120),
    value_id:text(a?.value_id,120) || null,
    value_name:text(a?.value_name || a?.value_struct?.name,200),
  })).slice(0,80)
  const payload={
    itemId,title:text(item?.title,240),description:desc,category,categoryId,
    listingType:text(item?.listing_type_id,80) || 'free',
    status:text(item?.status,80) || 'unknown',
    permalink:text(item?.permalink,1000) || null,
    image:text(item?.pictures?.[0]?.secure_url || item?.thumbnail,1200) || null,
    price,stock:stock.quantity,stockSource:stock.source,
    userProductId:text(item?.user_product_id,80) || null,
    ean:attrValue(item,['GTIN','EAN','UPC']),
    brand:attrValue(item,['BRAND']),
    variations,attributes,
  }
  return {...payload,hash:await sha256(payload)}
}
async function importOne(admin:any,token:string,companyId:string,sellerId:string,item:any){
  const itemId=cleanId(item?.id)
  if(!itemId)return {item_id:String(item?.id || ''),status:'invalid'}
  if(String(item?.seller_id || '')!==String(sellerId)){
    return {item_id:itemId,status:'seller_mismatch'}
  }

  const [{data:existingProduct},{data:existingSync}]=await Promise.all([
    admin.from('produtos_venda').select('id,company_id,nome,ml_item_id')
      .eq('company_id',companyId).eq('ml_item_id',itemId).maybeSingle(),
    admin.from('funcionaria_ml_product_sync').select('*')
      .eq('company_id',companyId).eq('ml_item_id',itemId).maybeSingle(),
  ])

  if(existingProduct && !existingSync){
    return {item_id:itemId,status:'linked_local',product_id:existingProduct.id}
  }

  const normalized=await hydrate(token,item)
  if(!normalized.title || normalized.price<0)return {item_id:itemId,status:'invalid_data'}

  const productPayload:any={
    company_id:companyId,
    nome:normalized.title,
    descricao:normalized.description || null,
    categoria:normalized.category || null,
    imagem_url:normalized.image,
    ean:normalized.ean,
    marca:normalized.brand,
    preco_venda:normalized.price,
    unidade:'un',
    estoque_atual:normalized.stock,
    controla_estoque:true,
    is_active:normalized.status==='active',
    ml_item_id:itemId,
    ml_category_id:normalized.categoryId || null,
    ml_listing_type:normalized.listingType,
    ml_status:normalized.status,
    updated_at:new Date().toISOString(),
  }

  let product=existingProduct
  let productStatus='updated'
  if(existingSync && existingSync.ml_sync_hash===normalized.hash && existingProduct){
    productStatus='unchanged'
  }else if(existingProduct){
    const {data,error}=await admin.from('produtos_venda').update(productPayload)
      .eq('id',existingProduct.id).eq('company_id',companyId).select('id,company_id').single()
    if(error)throw error
    product=data
  }else{
    const {data,error}=await admin.from('produtos_venda').insert(productPayload)
      .select('id,company_id').single()
    if(error){
      if(String(error.code)==='23505'){
        const {data:raceProduct}=await admin.from('produtos_venda').select('id,company_id')
          .eq('company_id',companyId).eq('ml_item_id',itemId).maybeSingle()
        const {data:raceSync}=await admin.from('funcionaria_ml_product_sync').select('id')
          .eq('company_id',companyId).eq('ml_item_id',itemId).maybeSingle()
        if(raceProduct && !raceSync)return {item_id:itemId,status:'linked_local',product_id:raceProduct.id}
      }
      throw error
    }
    product=data
    productStatus='imported'
  }
  if(!product?.id)throw new Error('product_upsert_failed')

  const now=new Date().toISOString()
  const {data:sync,error:syncError}=await admin.from('funcionaria_ml_product_sync').upsert({
    company_id:companyId,product_id:product.id,ml_item_id:itemId,
    source:'mercadolivre',sync_source:'mercadolivre',
    ml_last_synced_at:now,ml_sync_hash:normalized.hash,
    ml_permalink:normalized.permalink,ml_user_product_id:normalized.userProductId,
    ml_stock_source:normalized.stockSource,ml_variations:normalized.variations,
    ml_attributes:normalized.attributes,ml_status:normalized.status,last_error:null,
    updated_at:now,
  },{onConflict:'product_id'}).select('*').single()
  if(syncError || !sync)throw syncError || new Error('sync_metadata_failed')

  let options={mapped:false,count:0}
  if(productStatus!=='unchanged')options=await syncOptions(admin,sync,product,item,normalized.price)

  return {
    item_id:itemId,status:productStatus,product_id:product.id,
    stock_source:normalized.stockSource,options_mapped:options.mapped,
    options_count:options.count,
  }
}
async function importIds(admin:any,token:string,companyId:string,sellerId:string,rawIds:unknown[]){
  const ids=uniq(rawIds.map(cleanId).filter(Boolean)).slice(0,BATCH)
  if(!ids.length)return []
  const items=await bulkItems(token,ids)
  const results=[]
  for(const item of items){
    try{results.push(await importOne(admin,token,companyId,sellerId,item))}
    catch(error){
      console.error('[funcionaria-ml-import] item',item?.id,error)
      results.push({item_id:String(item?.id || ''),status:'error'})
    }
  }
  return results
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return json({error:'method_not_allowed'},405)
  if(!SUPABASE_URL || !SERVICE_ROLE)return json({error:'service_unavailable'},503)

  const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}})
  const user=await userFromRequest(req,admin)
  if(!user)return json({error:'unauthorized'},401)

  try{
    const body=await req.json().catch(()=>({})) as Record<string,any>
    const companyId=text(body.company_id,80)
    const action=String(body.action || '')
    if(!companyId)return json({error:'company_id_required'},400)
    if(!await canAccess(admin,user.id,companyId))return json({error:'forbidden'},403)

    const conn=await connection(admin,companyId)
    if(!conn)return json({error:'ml_connection_required'},409)
    const token=await accessToken(companyId)
    const sellerId=String(conn.seller_id)

    if(action==='list'){
      const offset=Math.max(0,Math.floor(asNumber(body.offset,0)))
      const limit=Math.max(1,Math.min(100,Math.floor(asNumber(body.limit,50))))
      const page=await listIds(token,sellerId,offset,limit)
      const items=await bulkItems(token,page.ids)
      const ids=items.map((item:any)=>cleanId(item?.id)).filter(Boolean)

      const [{data:products},{data:syncRows}]=await Promise.all([
        ids.length?admin.from('produtos_venda').select('id,ml_item_id,nome')
          .eq('company_id',companyId).in('ml_item_id',ids):Promise.resolve({data:[]}),
        ids.length?admin.from('funcionaria_ml_product_sync').select('product_id,ml_item_id,ml_last_synced_at')
          .eq('company_id',companyId).in('ml_item_id',ids):Promise.resolve({data:[]}),
      ])
      const productMap=new Map((products || []).map((p:any)=>[String(p.ml_item_id),p]))
      const syncMap=new Map((syncRows || []).map((s:any)=>[String(s.ml_item_id),s]))

      return json({
        success:true,total:page.total,offset:page.offset,limit:page.limit,
        next_offset:page.offset+page.limit<page.total?page.offset+page.limit:null,
        items:items.map((item:any)=>{
          const id=cleanId(item?.id)
          const product=productMap.get(id),sync=syncMap.get(id)
          return {
            id,title:text(item?.title,240),status:text(item?.status,80),
            thumbnail:text(item?.thumbnail,1200) || null,
            imported:!!sync,linked_local:!!product && !sync,
            product_id:product?.id || null,last_synced_at:sync?.ml_last_synced_at || null,
          }
        }),
      })
    }

    if(action==='import'){
      const raw=Array.isArray(body.item_ids)?body.item_ids:[]
      const ids=uniq(raw.map(cleanId).filter(Boolean))
      if(!ids.length)return json({error:'item_ids_required'},400)
      if(ids.length>BATCH)return json({error:'max_10_items_per_batch'},400)
      const results=await importIds(admin,token,companyId,sellerId,ids)
      return json({success:true,results})
    }

    if(action==='import_all'){
      const scrollId=text(body.scroll_id,4000) || undefined
      const page=await scanIds(token,sellerId,scrollId)
      if(!page.ids.length)return json({success:true,done:true,results:[],next_scroll_id:null})
      const results=await importIds(admin,token,companyId,sellerId,page.ids)
      return json({
        success:true,done:false,results,
        next_scroll_id:page.scrollId,
        batch_count:page.ids.length,
      })
    }

    return json({error:'invalid_action'},400)
  }catch(error){
    console.error('[funcionaria-ml-import]',error)
    const message=error instanceof Error?error.message:'internal_error'
    const status=message==='ml_reconnect_required'?401:500
    return json({error:message},status)
  }
})
