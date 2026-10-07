import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const read=file=>fs.readFileSync(path.join(root,file),'utf8')
const fail=message=>{console.error('[funcionaria-ml-import]',message);process.exitCode=1}

const sql=read('supabase/SQL-FUNCIONARIA-PHASE7H-ML-IMPORT.sql')
const edge=read('supabase/functions/funcionaria-ml-importar-produtos/index.ts')
const panel=read('components/funcionaria/channels/FuncionarIAMercadoLivrePanel.tsx')

for(const required of [
  'ux_produtos_venda_company_ml_item',
  'funcionaria_ml_product_sync',
  'funcionaria_ml_option_links',
  'funcionaria_import_ml_product_upsert',
  'pg_advisory_xact_lock',
  'security invoker',
  "sync_source in ('mercadolivre','local','bidirectional')",
  'revoke all on table public.funcionaria_ml_product_sync from public,anon,authenticated',
  'revoke all on table public.funcionaria_ml_option_links from public,anon,authenticated',
  "check (source='mercadolivre')",
  "'mercadolivre','mercadolivre'",
  'revoke all on function public.funcionaria_import_ml_product_upsert(uuid,text,jsonb,jsonb)',
]) if(!sql.includes(required)) fail('SQL invariant missing: '+required)

for(const forbidden of [
  'alter table public.produtos_venda add column',
  'access_token text',
  'refresh_token text',
]) if(sql.toLowerCase().includes(forbidden.toLowerCase())) fail('public catalog must not receive internal ML sync/secrets: '+forbidden)

for(const required of [
  'https://api.mercadolibre.com/items/bulk',
  '/prices',
  '/user-products/',
  '/stock',
  "status:'linked_local'",
  "const BATCH=10",
  "search_type','scan'",
  "funcionaria_ml_option_links",
  "ml_sync_hash",
  "seller_id",
  "normalized.price<=0",
]) if(!edge.includes(required)) fail('Edge invariant missing: '+required)

if(edge.includes('https://api.mercadolibre.com/items?ids=')) fail('deprecated /items?ids= multiget is forbidden')
if(edge.includes("select('access_token")) fail('browser-facing importer must not return/read tokens directly')
if(!edge.includes("String(item?.seller_id || '')!==String(sellerId)")) fail('seller ownership check missing')
if(!edge.includes("admin.rpc('funcionaria_import_ml_product_upsert'")) fail('atomic ML product+sync RPC missing')
if(!edge.includes("last_error:'option_sync_failed'")) fail('option-sync recovery marker missing')
if(!edge.includes("status:'linked_local'")) fail('local linked product preservation missing')

for(const required of [
  "'funcionaria-ml-importar-produtos'",
  "action: 'list'",
  "action: 'import'",
  "action: 'import_all'",
  'Importar selecionados',
  'Importar todos',
  'JÁ VINCULADO',
  "ml_scan_stalled",
  "ml_import_safety_limit",
]) if(!panel.includes(required)) fail('ML panel invariant missing: '+required)

if(!process.exitCode) console.log('FuncionarIA 7H: ML bulk import + idempotency + internal sync metadata PASS')