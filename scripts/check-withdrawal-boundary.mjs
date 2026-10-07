import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const fail = message => { console.error('[withdrawal-boundary]', message); process.exitCode = 1 }

const sql = read('supabase/SQL-WITHDRAWAL-STATE-MACHINE-V1.sql')
const edge = read('supabase/functions/request-withdrawal/index.ts')
const page = read('app/dashboard/saldo/page.tsx')

for (const fn of [
  'withdrawal_reserve_v1',
  'withdrawal_claim_send_v1',
  'withdrawal_record_provider_v1',
  'withdrawal_mark_reconciliation_v1',
  'withdrawal_finalize_v1',
  'withdrawal_release_v1',
]) {
  if (!sql.includes('function public.' + fn)) fail('missing state-machine RPC: ' + fn)
  if (!sql.includes('grant execute on function public.' + fn)) fail('missing service_role grant: ' + fn)
}

for (const required of [
  "pg_advisory_xact_lock",
  "for update",
  "available_balance_cents = available_balance_cents - v_debit",
  "available_balance_cents = available_balance_cents + v_alloc.amount_cents",
  "total_transferred_cents = total_transferred_cents + v_alloc.amount_cents",
  "drop policy if exists \"Users can manage own company balance\"",
  "revoke all privileges on table public.company_balance from anon",
  "revoke insert, update, delete, truncate, references, trigger",
  "status in ('reserved','sending','processing','transferred','released','reconciliation_required')",
]) {
  if (!sql.toLowerCase().includes(required.toLowerCase())) fail('SQL missing safety invariant: ' + required)
}

for (const forbidden of [
  'available_balance_cents = v_alloc.balance_before_cents',
  'available_balance_cents = v_balance.available_balance_cents',
]) {
  if (sql.includes(forbidden)) fail('snapshot rollback is forbidden: ' + forbidden)
}

for (const forbidden of [
  ".from('company_balance')",
  ".from('balance_transactions')",
  ".from('commission_pending')",
  'setTimeout(',
  'body: { amount, userId }',
]) {
  if (edge.includes(forbidden)) fail('Edge bypasses state machine: ' + forbidden)
}

for (const required of [
  "admin.rpc('withdrawal_reserve_v1'",
  "admin.rpc('withdrawal_claim_send_v1'",
  "admin.rpc('withdrawal_record_provider_v1'",
  "admin.rpc('withdrawal_mark_reconciliation_v1'",
  "admin.rpc('withdrawal_finalize_v1'",
  "admin.rpc('withdrawal_release_v1'",
  "https://inter.btsolucao.com.br/pay.php",
  "https://inter.btsolucao.com.br/getpay.php",
  "AbortSignal.timeout",
]) {
  if (!edge.includes(required)) fail('Edge missing state-machine/provider control: ' + required)
}

if ((edge.match(/pay\.php/g) || []).length !== 2) {
  // One match is pay.php and one is getpay.php; any extra direct payout site is suspicious.
  fail('unexpected number of Inter payout endpoints')
}
if ((edge.match(/https:\/\/inter\.btsolucao\.com\.br\/pay\.php/g) || []).length !== 1) {
  fail('there must be exactly one external payout send site')
}

for (const required of [
  'crypto.randomUUID()',
  'idempotency_key',
  "action: 'check'",
  'amount_cents',
  'withdrawalAttemptRef',
  'parseWithdrawalCents',
]) {
  if (!page.includes(required)) fail('dashboard missing idempotency/polling control: ' + required)
}
if (page.includes("body: { amount, userId }")) fail('dashboard must not send client-selected userId to withdrawal Edge')

console.log('Withdrawal boundary: reserve/send/finalize-release + idempotency guardrails PASS')
