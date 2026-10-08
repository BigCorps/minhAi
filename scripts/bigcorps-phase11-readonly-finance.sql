-- Auditoria BigCorps/Fase11: READ ONLY, nunca migration.
-- Somente SELECTs agregados; não executar RPCs financeiros.
with accounts as (
 select
 (select count(*) from public.company_balance) as company_wallets,
 (select count(*) from public.company_balance where available_balance_cents<0 or total_received_cents<0 or total_transferred_cents<0) as negative_wallets,
 (select count(*) from public.user_credits) as credit_wallets,
 (select count(*) from public.user_credits where available_credits<0 or total_used<0) as negative_credits,
 (select count(*) from public.user_credits where total_used>total_purchased+20) as credit_origin_review,
 (select count(*) from public.withdrawal_requests) as new_withdrawals
), ledger as (
 select
 count(*) filter(where balance_before_cents is not null and balance_after_cents is not null and balance_after_cents<>balance_before_cents+amount_cents) as nonadditive_entries,
 count(*) filter(where transaction_type='withdrawal' and amount_cents>0 and balance_before_cents=0 and balance_after_cents=0) as old_withdrawals_zero_snapshots,
 count(*) filter(where transaction_type='pix_received' and amount_cents>0 and balance_before_cents=0 and balance_after_cents=0) as old_pix_zero_snapshots
 from public.balance_transactions
), credit as (
 select
 (select count(*) from public.credit_transactions where amount=0 and transaction_type='usage') as free_usage_entries,
 (select count(*) from public.credit_transactions where balance_after<0) as negative_credit_ledger,
 (select count(*) from public.funcionaria_usage_rates where is_active and credits_per_unit<0) as negative_active_rates,
 (select count(*) from public.funcionaria_usage_events where credits_consumed<0 or units<0) as negative_usage,
 (select count(*) from (select idempotency_key from public.funcionaria_usage_events where idempotency_key is not null group by idempotency_key having count(*)>1) v) as duplicated_usage_key
), settlements as (
 select
 (select count(*) from public.funcionaria_checkouts) as checkouts,
 (select count(*) from public.funcionaria_invoices) as invoices,
 (select count(*) from public.funcionaria_storefront_settlements) as commission_settlements,
 (select count(*) from public.funcionaria_storefront_direct_settlements) as direct_settlements,
 (select count(*) from public.funcionaria_storefront_settlements where commission_bps<>500 or commission_cents<>round(merchandise_cents*commission_bps/10000.0)) as commission_mismatches,
 (select count(*) from public.funcionaria_storefront_settlements c join public.funcionaria_storefront_direct_settlements d using (pedido_id)) as mixed_mode_orders,
 (select count(*) from public.funcionaria_invoices where amount_cents<0 or subtotal_cents<0 or discount_cents<0) as negative_invoices
), security as (
 select
 (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('company_balance','balance_transactions','withdrawal_requests','funcionaria_invoices','funcionaria_storefront_settlements') and not c.relrowsecurity) as finance_tables_without_rls,
 (select count(*) from pg_policies where schemaname='public' and tablename in ('company_balance','balance_transactions','withdrawal_requests','funcionaria_invoices') and cmd in ('INSERT','UPDATE','DELETE','ALL')) as client_financial_write_policies
)
select jsonb_build_object('audit','bigcorps_phase11','read_only',true,'at',now(),
 'accounts',to_jsonb(a),'ledger',to_jsonb(l),'credits',to_jsonb(c),
 'funcionaria',to_jsonb(s),'rls',to_jsonb(r),
 'live_payment_coverage',case when s.commission_settlements+s.direct_settlements=0 then 'not_exercised' else 'historical_records_only' end
) as audit
from accounts a cross join ledger l cross join credit c cross join settlements s cross join security r;