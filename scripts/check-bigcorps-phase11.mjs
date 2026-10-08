import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const sql=read('scripts/bigcorps-phase11-readonly-finance.sql').toLowerCase();
for(const marker of ['read only','from public.company_balance','from public.user_credits','from public.funcionaria_storefront_settlements','from public.funcionaria_storefront_direct_settlements','from pg_policies'])assert.ok(sql.includes(marker),'read-only SQL missing: '+marker);
// Explicitly ban DML, DDL and RPC use. Comments are not executable.
const executable=sql.split('\n').filter(x=>!x.trimStart().startsWith('--')).join('\n');
assert.doesNotMatch(executable,/\b(insert\s+into|update\s+[a-z_]|delete\s+from|alter\s+table|create\s+|drop\s+|truncate\s+|grant\s+|revoke\s+|call\s+)\b/,'read-only SQL must not mutate');
const usage=read('supabase/migrations-manual/20260916_funcionaria_phase5_credits_ai_channels.sql');
for(const m of ['funcionaria_consume_usage','insufficient_credits','for update','credits_per_unit'])assert.ok(usage.includes(m),'usage credit invariant: '+m);
const consult=read('supabase/migrations-manual/20260916_funcionaria_phase6_idempotency_zero_cost.sql');
for(const m of ['funcionaria_consulta_operations','idempotency_key','payment_transaction_id'])assert.ok(consult.includes(m),'paid lookup invariant: '+m);
const k=read('scripts/check-funcionaria-7k.mjs');
for(const m of ['settlement_evidence_conflict','storefront_not_monthly_direct'])assert.ok(k.includes(m),'settlement invariant: '+m);
const withdrawal=read('scripts/check-withdrawal-boundary.mjs');
for(const m of ['withdrawal_reserve_v1','withdrawal_release_v1'])assert.ok(withdrawal.includes(m),'withdrawal invariant: '+m);
const pkg=JSON.parse(read('package.json'));assert.ok(pkg.scripts.prebuild.includes('npm run check:bigcorps-11'));
console.log('BigCorps Phase 11: credits + settlement + withdrawals, read-only finance contracts PASS');