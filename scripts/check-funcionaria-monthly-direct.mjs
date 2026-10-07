import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const read=file=>fs.readFileSync(path.join(root,file),'utf8')
const fail=message=>{console.error('[funcionaria-monthly-direct]',message);process.exitCode=1}

const sql=read('supabase/SQL-FUNCIONARIA-PHASE7G-MONTHLY-DIRECT.sql')
const billing=read('supabase/functions/funcionaria-billing-v2/index.ts')
const payments=read('supabase/functions/funcionaria-storefront-payments-v2/index.ts')
const order=read('app/api/funcionaria/public-order/route.ts')
const route=read('app/api/funcionaria/storefront-payment/route.ts')
const returned=read('app/api/funcionaria/storefront-infinitepay/return/route.ts')
const panel=read('components/funcionaria/public/FuncionarIAStorefrontPaymentPanel.tsx')
const manager=read('components/funcionaria/management/FuncionarIAStorefrontPlanCard.tsx')
const skills=read('components/funcionaria/billing/FuncionarIASkillsManager.tsx')

for(const required of [
  "pix_payment_mode in ('free','mercadopago','commission','monthly_direct')",
  'funcionaria_storefront_plan_catalog',
  "monthly_price_cents,null,false",
  'current_storefront_mode',
  'next_storefront_mode',
  'desired_storefront_mode',
  'funcionaria_storefront_entitlement',
  'funcionaria_storefront_guard_payment_mode',
  'funcionaria_prepare_storefront_direct_pix',
  'funcionaria_prepare_storefront_direct_card',
  'funcionaria_settle_storefront_direct',
  'funcionaria_apply_storefront_plan_invoice',
  'funcionaria_storefront_compare_30d',
  'funcionaria_storefront_direct_settlements',
]) if(!sql.replace(/\s+/g,'').includes(required.replace(/\s+/g,''))) fail('SQL invariant missing: '+required)

if(sql.includes('company_balance') || sql.includes('commission_pending')) {
  fail('direct settlement must not credit BigCorps balance or create commission')
}
for(const fn of [
  'funcionaria_storefront_entitlement(uuid)',
  'funcionaria_storefront_compare_30d(uuid)',
  'funcionaria_storefront_guard_payment_mode(uuid)',
  'funcionaria_prepare_storefront_direct_pix(uuid)',
  'funcionaria_prepare_storefront_direct_card(uuid,integer,text)',
  'funcionaria_apply_storefront_plan_invoice(uuid)',
]) if(!sql.includes('revoke all on function public.'+fn)) fail('server-only RPC revoke missing: '+fn)

for(const required of [
  "desired_storefront_mode",
  "storefront_monthly_plan_unavailable",
  "storefront_direct_payment_not_configured",
  "funcionaria_apply_storefront_plan_invoice",
  "funcionaria_storefront_compare_30d",
  "funcionaria_storefront_entitlement",
]) if(!billing.includes(required)) fail('billing v2 missing: '+required)

for(const required of [
  "funcionaria-storefront-payments",
  "funcionaria_prepare_storefront_direct_pix",
  "funcionaria_prepare_storefront_direct_card",
  "funcionaria_settle_storefront_direct",
  "X-Idempotency-Key",
  "funcionaria-storefront-direct-pix-",
  "api.checkout.infinitepay.io/payment_check",
  "funcionaria-direct-",
  "payment_mode:'monthly_direct'",
]) if(!payments.includes(required)) fail('payment v2 missing: '+required)

if(payments.includes('funcionaria_settle_storefront_commission')) {
  fail('payment v2 direct path must not call commission settlement')
}
if(!order.includes("storefrontEntitlement?.effective_mode === 'monthly_direct'")) {
  fail('public order must snapshot server-authoritative effective mode')
}
if(!route.includes('funcionaria-storefront-payments-v2')) fail('public payment boundary not routed to v2')
if(!returned.includes('funcionaria-storefront-payments-v2')) fail('InfinitePay return not routed to v2')
if(!returned.includes('(?:storefront|direct)')) fail('InfinitePay return must allow direct order_nsu')
if(!skills.includes("'funcionaria-billing-v2'")) fail('skills manager must preserve storefront billing in v2')
for(const required of ['5% por venda','Mensal • sem 5%','Comparador • últimos 30 dias','Preço ainda não configurado']) {
  if(!manager.includes(required)) fail('storefront plan UI missing: '+required)
}
for(const required of ["payment?.payment_mode==='monthly_direct'","caps.pix===false","caps.card===false"]) {
  if(!panel.includes(required)) fail('public payment panel missing direct mode behavior: '+required)
}

if(!process.exitCode) console.log('FuncionarIA 7G: monthly_direct entitlement + direct payments + fallback PASS')
