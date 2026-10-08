import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import './test-funcionaria-7k-scenarios.mjs';

// Read-only contract tests against the real SQL/Edge/route source.
// These are structural checks, NOT live provider transactions.
const read = file => readFileSync(resolve(process.cwd(),file),'utf8');
const f1 = read('supabase/migrations-manual/20260918_funcionaria_phase7f1_pix_ledger.sql');
const f2 = read('supabase/SQL-FUNCIONARIA-PHASE7F2-INFINITEPAY-CARD.sql');
const g = read('supabase/SQL-FUNCIONARIA-PHASE7G-MONTHLY-DIRECT.sql');
const e = read('supabase/migrations-manual/20260918_funcionaria_phase7e_lalamove.sql');
const legacy = read('supabase/functions/funcionaria-storefront-payments/index.ts');
const direct = read('supabase/functions/funcionaria-storefront-payments-v2/index.ts');
const pix = read('supabase/functions/funcionaria-pix/index.ts');
const lalamove = read('supabase/functions/lalamove-delivery/index.ts');
const order = read('app/api/funcionaria/public-order/route.ts');
const api = read('app/api/funcionaria/storefront-payment/route.ts');
const callback = read('app/api/funcionaria/storefront-infinitepay/return/route.ts');

function section(sql,name){
  const start=sql.toLowerCase().indexOf('create or replace function public.'+name.toLowerCase()+'(');
  assert.ok(start>=0, `function absent: ${name}`);
  const remaining=sql.slice(start);
  const ending=remaining.toLowerCase().indexOf('$function$;');
  assert.ok(ending>=0, `function delimiter absent: ${name}`);
  return remaining.slice(0,ending+'$function$;'.length);
}
function required(source,patterns,name) {
  for(const [pattern,description] of patterns){
    assert.match(source,pattern,`${name}: ${description}`);
  }
}
// 7F.1 is a historic definition; 7F.2 REPLACES it in production.
const commission=section(f2,'funcionaria_settle_storefront_commission');
const historicalCommission=section(f1,'funcionaria_settle_storefront_commission');
assert.ok(historicalCommission.includes("'duplicate',true"),'7F.1 historical baseline missing');
const duplicateStart=commission.indexOf('if found then');
const duplicateEnd=commission.indexOf('select * into v_checkout',duplicateStart);
assert.ok(duplicateStart>=0 && duplicateEnd>duplicateStart,'7F.2 duplicate branch absent');
const duplicateBranch=commission.slice(duplicateStart,duplicateEnd);
for(const evidence of ['v_existing.provider <> p_provider',
  'v_existing.provider_reference <> trim(p_provider_reference)',
  "raise exception 'settlement_evidence_conflict'",
  "'duplicate',true"])assert.ok(duplicateBranch.includes(evidence),
   '7F.2 must reject mismatched settlement evidence: '+evidence);
assert.ok(duplicateBranch.indexOf('settlement_evidence_conflict') <
          duplicateBranch.indexOf("'duplicate',true"),
  'conflicting evidence must be rejected before duplicate=true');
const directSettle=section(g,'funcionaria_settle_storefront_direct');
const mode=section(g,'funcionaria_storefront_guard_payment_mode');
const delivery=section(e,'funcionaria_prepare_lalamove_dispatch');
const refund=section(e,'funcionaria_refund_delivery_fee');
required(commission,[
  [/\bfor update\b/i,'lock order before side effects'],
  [/if found then[\s\S]*?'duplicate',true/i,'retry returns duplicate'],
  [/storefront_not_commission_mode/i,'commission snapshot required'],
  [/invalid_commission_bps/i,'fixed 500 basis points'],
  [/v_commission\s*:=\s*round\(v_merch\s*\*\s*v_bps\s*\/\s*10000\.0\)/i,'commission on merchandise'],
  [/storefront_total_breakdown_mismatch/i,'total breakdown checked'],
  [/provider_fee_exceeds_merchandise/i,'provider fee bounded'],
  [/negative_merchant_net/i,'non-negative net'],
  [/company_balance[\s\S]*?balance_transactions[\s\S]*?commission_pending/i,'ledger and commission journal'],
  [/baixar_estoque_pedido\(v_pedido.id\)/i,'stock decrement downstream'],
], '7F.2 authoritative 5 percent commission');
required(f2,[
  [/v_card.provider_amount_cents <> v_gross/i,'card provider evidence must match gross'],
  [/card_provider_fee_evidence_mismatch/i,'provider fee documented'],
  [/provider_fee_source/i,'fee origin tracked separately from commission'],
  [/status='paid'/i,'card must be confirmed'],
], '7F.2 provider card evidence');
required(directSettle,[
  [/\bfor update\b/i,'row locks'],
  [/direct_settlement_evidence_conflict/i,'conflicting replay fails'],
  [/'duplicate',true/i,'identical replay acknowledged'],
  [/storefront_not_monthly_direct/i,'payment mode snapshot preserved'],
  [/confirmed_direct_pix_not_found/i,'PIX confirmed on provider'],
  [/direct_pix_checkout_evidence_mismatch/i,'PIX bound to checkout'],
  [/confirmed_direct_card_not_found/i,'verified card state required'],
  [/direct_card_checkout_evidence_mismatch/i,'card bound to checkout'],
  [/baixar_estoque_pedido\(v_pedido.id\)/i,'stock marked once'],
], 'monthly direct');
assert.doesNotMatch(directSettle,/\b(company_balance|balance_transactions|commission_pending)\b/i,
  'monthly direct must not create BigCorps commission or add seller balance');
required(mode,[
  [/payment_started/i,'mode records started payment'],
  [/storefront_payment_mode_snapshot/i,'uses stored effective mode'],
  [/not v_started/i,'fallback only before provider start'],
  [/storefront_commission_bps_snapshot=500/i,'commission fallback snapshot'],
], 'payment mode guard');
required(delivery,[
  [/payment_not_confirmed/i,'no dispatch before payment'],
  [/delivery_dispatch_state = 'uncertain'/i,'uncertain provider result cannot be retried'],
  [/dispatch_in_progress/i,'concurrent worker is blocked'],
  [/lalamove_order_id is not null/i,'provider order deduplication'],
  [/\bfor update\b/i,'serializes dispatch attempt'],
], 'delivery');
required(refund,[
  [/delivery_fee_refunded_at is not null/i,'refund idempotence'],
  [/delivery_fee_reserved_at is null/i,'only refundable reservation'],
  [/\bfor update\b/i,'serialized refund'],
  [/transaction_type, amount_cents/i,'ledger entry for refund'],
], 'refund');
required(pix,[
  [/pix_direct_not_cancelable/i,'non-revocable BR code blocks cancellation'],
  [/already_paid/i,'confirmed PIX not cancelled'],
  [/pix_cancel_failed/i,'provider cancel fail closed'],
  [/status\s*===\s*'approved'/i,'paid after cancellation attempt handled'],
], 'PIX cancellation');
required(direct,[
  [/status!=='approved'/i,'check provider approval'],
  [/paid_amount_mismatch/i,'PIX paid amount verified'],
  [/capture!=='credit_card'/i,'card capture method verified'],
  [/amount!==Number\(payment.expected_amount_cents\)/i,'card amount verified'],
  [/payment_check/i,'authoritative InfinitePay verifier'],
  [/funcionaria_settle_storefront_direct/i,'direct route uses its own ledger'],
], 'direct payment Edge');
required(legacy,[
  [/card_reconciliation_required/i,'commission card anomalous evidence reconciliation'],
  [/funcionaria_settle_storefront_commission/i,'commission settlement invokes protected RPC'],
], 'commission Edge');
required(order,[
  [/public_order_idempotency_key/i,'order request deduplication key'],
  [/pedidoError\?\.code\s*===\s*'23505'/i,'concurrent duplicate retry'],
  [/insufficient_stock/i,'inventory validation'],
  [/storefront_payment_mode_snapshot/i,'payment mode snapshot on order'],
  [/delivery_quote_mismatch/i,'signed delivery quote validated'],
], 'public order');
required(api,[
  [/funcionaria-storefront-payments-v2/i,'requests routed through v2'],
], 'checkout route');
required(callback,[
  [/funcionaria-storefront-payments-v2/i,'card callback routed through v2'],
], 'payment callback');
required(lalamove,[
  [/dispatch_uncertain/i,'unknown provider response not blindly retried'],
  [/funcionaria_refund_delivery_fee/i,'known failed dispatch refunds once'],
  [/delivery_dispatch_request_id/i,'provider request guard'],
], 'delivery Edge');

// Proof of unique constraints for exact once at database level.
const requiredUnique=[
  [/create unique index if not exists\s+funcionaria_checkouts_storefront_pedido_uidx/i,f1,'storefront checkout per order'],
  [/create unique index if not exists\s+commission_pending_funcionaria_storefront_pedido_uidx/i,f1,'commission per order'],
  [/unique\s*\(pedido_id\)/i,g,'direct settlement per order'],
];
for(const [pattern,sql,description] of requiredUnique){
  assert.match(sql,pattern,`missing unique constraint: ${description}`);
}
console.log('FuncionarIA 7K: SQL and Edge financial / cancellation / stock / delivery contracts PASS');
console.log('FuncionarIA 7L: 7F.2 authoritative settlement evidence mismatch gate PASS');
