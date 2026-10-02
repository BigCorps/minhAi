-- PixWiki V2 Gate 1 — validação READ-ONLY
-- Este arquivo não altera dados.

-- 1) Catálogo V2 esperado: 4 planos.
select plan,name,rank,monthly_price_cents,annual_price_cents,
       included_automations,overage_price_cents,is_active
from public.pixwiki_v2_plan_catalog
order by rank;

-- 2) Estruturas V2 criadas.
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'pixwiki_v2_plan_catalog',
    'pixwiki_v2_billing_accounts',
    'pixwiki_v2_usage_periods',
    'pixwiki_v2_usage_events',
    'pixwiki_v2_onboarding_state'
  )
order by table_name;

-- 3) Papel cashier deve ser aceito pelo constraint.
select conname,pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.company_admins'::regclass
  and conname='company_admins_role_check';

-- 4) Compatibilidade da view neste Gate. security_invoker é propositalmente adiado ao Gate 10.
select c.relname,c.reloptions
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='pixwiki_receipts';

-- 5) Funções V2 esperadas.
select p.proname,pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'pixwiki_v2_record_usage',
    'pixwiki_v2_quote_monthly_usage',
    'pixwiki_v2_my_usage_summary',
    'pixwiki_company_access_role',
    'pixwiki_cashier_recent_receipts',
    'pixwiki_register_push_subscription'
  )
order by p.proname;

-- 6) Teste apenas de cálculo: NÃO grava nada.
select * from public.pixwiki_v2_quote_monthly_usage(100);
select * from public.pixwiki_v2_quote_monthly_usage(721);
select * from public.pixwiki_v2_quote_monthly_usage(5919);
select * from public.pixwiki_v2_quote_monthly_usage(65518);

-- 7) Nenhuma conta V2 precisa existir ainda; zero é válido neste Gate.
select count(*) as billing_accounts_v2 from public.pixwiki_v2_billing_accounts;
select count(*) as usage_events_v2 from public.pixwiki_v2_usage_events;

-- 8) O catálogo legado continua existindo e não é modificado por este Gate.
select plan,name,price_cents,rank,is_active
from public.pixwiki_plan_catalog
order by rank;
