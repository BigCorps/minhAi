-- PixWiki V2 — Gate 8 validation (read-only)
-- Execute AFTER Gate 8 migration/functions are deployed.

-- 1) Catálogo V2 final.
select plan,name,monthly_price_cents,annual_price_cents,included_automations,overage_price_cents,is_active
from public.pixwiki_v2_plan_catalog
order by rank;

-- 2) Espelho legado deve ter os mesmos 4 planos/preços mensais.
select plan,name,price_cents,rank,is_active
from public.pixwiki_plan_catalog
where plan in ('free','link','pro','vip')
order by rank;

-- 3) Billing accounts: após a migration, as assinaturas que já existiam devem estar VIP cortesia.
select plan,status,billing_interval,allow_overage,complimentary,count(*)::int as accounts
from public.pixwiki_v2_billing_accounts
group by plan,status,billing_interval,allow_overage,complimentary
order by plan,status;

-- 4) Conferir espelho legado das assinaturas existentes.
select plan,status,count(*)::int as subscriptions
from public.pixwiki_subscriptions
group by plan,status
order by plan,status;

-- 5) Colunas V2 adicionadas à fatura.
select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='pixwiki_invoices'
  and column_name in (
    'invoice_type','billing_interval','usage_period_start','usage_period_end',
    'base_price_cents','overage_units','overage_price_cents','protected_plan',
    'protected_total_cents','convenience_credit_cents','credit_applied_cents',
    'due_at','grace_until'
  )
order by column_name;

-- 6) Settlement do uso.
select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='pixwiki_v2_usage_periods'
  and column_name in (
    'settlement_status','protected_plan','protected_total_cents','overage_invoice_id',
    'billed_amount_cents','convenience_credit_applied_cents',
    'convenience_credit_carried_cents','settled_at'
  )
order by column_name;

-- 7) Funções críticas e seus grants devem existir.
select p.proname,pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'pixwiki_v2_monthly_settlement_quote',
  'pixwiki_v2_set_billing_preferences',
  'pixwiki_v2_automation_allowance',
  'pixwiki_v2_apply_paid_invoice',
  'pixwiki_v2_settle_zero_usage_period',
  'pixwiki_v2_mark_usage_period_invoiced'
)
order by p.proname;

-- 8) Teste matemático da proteção de faixa.
-- 721 unidades: FREE = 490,59 e LINK = 490,00 -> LINK deve ser melhor.
select * from public.pixwiki_v2_quote_monthly_usage(721);
-- 5.919 unidades: LINK = 2.900,31 e PRO = 2.900,00 -> PRO deve ser melhor.
select * from public.pixwiki_v2_quote_monthly_usage(5919);
-- 65.518 unidades: PRO = 19.000,22 e VIP = 19.000,00 -> VIP deve ser melhor.
select * from public.pixwiki_v2_quote_monthly_usage(65518);

-- 9) Faturas abertas e status de carência (não altera nada).
select invoice_type,status,target_plan,billing_interval,amount_cents,
       usage_period_start,due_at,grace_until,created_at
from public.pixwiki_invoices
where status='pending'
order by created_at desc
limit 30;

-- 10) Períodos de uso fechados/abertos.
select settlement_status,count(*)::int as periods,
       coalesce(sum(billed_amount_cents),0)::bigint as billed_cents
from public.pixwiki_v2_usage_periods
group by settlement_status
order by settlement_status;
