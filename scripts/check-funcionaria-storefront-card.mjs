import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const fail = message => { console.error('[funcionaria-storefront-card]', message); process.exitCode = 1 }

const sql = read('supabase/SQL-FUNCIONARIA-PHASE7F2-INFINITEPAY-CARD.sql')
const edge = read('supabase/functions/funcionaria-storefront-payments/index.ts')
const api = read('app/api/funcionaria/storefront-payment/route.ts')
const returned = read('app/api/funcionaria/storefront-infinitepay/return/route.ts')
const panel = read('components/funcionaria/public/FuncionarIAStorefrontPaymentPanel.tsx')

for (const required of [
  "origem in ('vendedor','autoatendimento','integracao','storefront')",
  "metodo_pagamento is null or metodo_pagamento in ('pix','nfc','tef','dinheiro','cartao')",
  'funcionaria_storefront_card_payments',
  'funcionaria_prepare_storefront_card',
  "provider='infinitepay_bigcorps'",
  "status='paid'",
  'v_card.provider_amount_cents <> v_gross',
  "coalesce(v_card.capture_method,'') <> 'credit_card'",
  "coalesce(v_card.provider_paid_amount_cents,0) <= v_card.provider_amount_cents",
  "card_provider_fee_evidence_mismatch",
  "funcionaria_storefront_card_fee_rates",
  "v_method := 'cartao'",
]) if (!sql.includes(required)) fail('SQL missing card settlement invariant: ' + required)

for (const forbidden of [
  'grant execute on function public.funcionaria_settle_storefront_commission(\n  uuid,uuid,text,text,uuid,integer,timestamptz\n) to authenticated',
  'grant execute on function public.funcionaria_prepare_storefront_card(uuid,integer,text)\n  to authenticated',
]) if (sql.includes(forbidden)) fail('financial RPC exposed to browser role')

for (const required of [
  "const INFINITEPAY_HANDLE = 'bigcorps'",
  "const INFINITEPAY_BRIDGE_URL = 'https://checkout.bigcorps.com.br/redirect.html'",
  "const INFINITEPAY_PAYMENT_CHECK_URL = 'https://api.checkout.infinitepay.io/payment_check'",
  "return `funcionaria-storefront-${checkoutId}`",
  "payment_method: 'credit'",
  "app: 'funcionaria'",
  "action === 'signal_infinitepay'",
  "action === 'confirm_card'",
  "action === 'status'",
  "captureMethod !== 'credit_card'",
  'amount !== Number(payment.expected_amount_cents)',
  'paidAmount <= amount',
  "p_provider: 'infinitepay_bigcorps'",
  'p_provider_fee_cents: Number(payment.provider_fee_cents || 0)',
]) if (!edge.includes(required)) fail('Edge missing InfinitePay safety control: ' + required)

if (edge.includes('/api/verificar-por-ordem')) fail('legacy KV verifier must not be payment evidence')
if ((edge.match(/api\.checkout\.infinitepay\.io\/payment_check/g) || []).length !== 1) {
  fail('there must be exactly one authoritative InfinitePay payment_check endpoint')
}
if (!edge.includes("if (checkout.card_provider || checkout.cash_requested_at)")) {
  fail('PIX must fail before generation when another payment method owns the checkout')
}

for (const required of [
  "internalServiceHeaders",
  "'create_card'",
  "'status'",
]) if (!api.includes(required)) fail('Next storefront boundary missing: ' + required)
if (api.includes('SUPABASE_SERVICE_ROLE_KEY')) fail('Next storefront boundary must use central server-key strategy')

for (const required of [
  "action: 'signal_infinitepay'",
  "action: 'confirm_card'",
  'transaction_nsu',
  'order_nsu',
]) if (!returned.includes(required)) fail('return route missing trigger/verification behavior: ' + required)
if (returned.includes('funcionaria_settle_storefront_commission')) fail('return route must not settle directly')

for (const required of [
  "'create_card'",
  '<CreditCard',
  'checkout.bigcorps.com.br',
  'can_reopen',
]) if (!panel.includes(required)) fail('storefront UI missing card behavior: ' + required)

console.log('FuncionarIA 7F.2: InfinitePay evidence + 5% settlement guardrails PASS')