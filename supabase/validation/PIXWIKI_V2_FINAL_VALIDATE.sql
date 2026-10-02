-- PixWiki V2 — validação final READ-ONLY dos Gates 1 → 10
-- Não altera dados. Rode somente depois de aplicar as 10 migrations.

-- A) Tabelas V2 essenciais.
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'pixwiki_v2_plan_catalog',
    'pixwiki_v2_billing_accounts',
    'pixwiki_v2_usage_periods',
    'pixwiki_v2_usage_events',
    'pixwiki_v2_onboarding_state',
    'pixwiki_v2_runtime_config',
    'pixwiki_v2_checkout_sessions',
    'pixwiki_v2_team_invites'
  )
order by table_name;

-- B) Catálogo comercial final.
select plan,name,rank,monthly_price_cents,annual_price_cents,
       included_automations,overage_price_cents,is_active
from public.pixwiki_v2_plan_catalog
order by rank;

-- C) Runtime do motor.
select * from public.pixwiki_v2_runtime_config;

-- D) Funções/RPCs principais dos Gates.
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'pixwiki_v2_record_usage',
    'pixwiki_v2_quote_monthly_usage',
    'pixwiki_v2_my_usage_summary',
    'pixwiki_v2_automation_allowance',
    'pixwiki_v2_enqueue_checkout',
    'pixwiki_v2_acquire_checkout_slot',
    'pixwiki_v2_checkout_reconcile_acquire',
    'pixwiki_v2_cancel_checkout',
    'pixwiki_v2_api_receipts_internal',
    'pixwiki_v2_api_summary_internal',
    'pixwiki_v2_onboarding_get',
    'pixwiki_v2_dashboard_snapshot',
    'pixwiki_v2_update_notification_settings',
    'pixwiki_v2_my_access_context',
    'pixwiki_v2_cashier_snapshot',
    'pixwiki_v2_monthly_settlement_quote',
    'admin_pixwiki_v2_leads_page'
  )
order by p.proname;

-- E) Papel cashier deve existir no constraint.
select conname,pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.company_admins'::regclass
  and conname='company_admins_role_check';

-- F) View final precisa ser security_invoker e sem leitura direta de cliente.
select c.relname,c.reloptions
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='pixwiki_receipts';

select grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='pixwiki_receipts'
  and grantee in ('anon','authenticated','service_role')
order by grantee,privilege_type;

-- G) Índices finais críticos.
select indexname
from pg_indexes
where schemaname='public'
  and indexname in (
    'pix_direct_intents_matched_receipt_idx',
    'pix_direct_intents_user_idx',
    'pixwiki_invoices_target_plan_idx',
    'pixwiki_payment_settings_mp_connection_idx',
    'pixwiki_subscriptions_last_invoice_idx',
    'pixwiki_subscriptions_plan_idx',
    'pixwiki_sync_state_company_idx',
    'pixwiki_sync_state_user_idx',
    'pixwiki_webhook_events_company_idx'
  )
order by indexname;

-- H) Cálculos de troca de faixa conhecidos. Não grava nada.
select * from public.pixwiki_v2_quote_monthly_usage(721);
select * from public.pixwiki_v2_quote_monthly_usage(5919);
select * from public.pixwiki_v2_quote_monthly_usage(65518);

-- I) Estado operacional resumido (somente contagens).
select
  (select count(*) from public.pixwiki_v2_billing_accounts) as billing_accounts,
  (select count(*) from public.pixwiki_v2_checkout_sessions) as checkout_sessions,
  (select count(*) from public.pixwiki_v2_usage_events) as usage_events,
  (select count(*) from public.pixwiki_v2_team_invites) as team_invites;
