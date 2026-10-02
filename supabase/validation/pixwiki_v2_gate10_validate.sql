-- PixWiki V2 — Gate 10 — validação read-only

-- A) View final: security_invoker e sem leitura direta de anon/authenticated.
select
  c.relname,
  c.reloptions,
  has_table_privilege('anon','public.pixwiki_receipts','select') as anon_can_select,
  has_table_privilege('authenticated','public.pixwiki_receipts','select') as authenticated_can_select,
  has_table_privilege('service_role','public.pixwiki_receipts','select') as service_can_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='pixwiki_receipts';

-- Esperado: reloptions contém security_invoker=true; anon/auth false; service true.

-- B) Helpers server-only não podem ser chamados pelo cliente.
select
  has_function_privilege('anon','public.pixwiki_can_serve_subdomain(text)','execute') as anon_can_serve,
  has_function_privilege('authenticated','public.pixwiki_can_serve_subdomain(text)','execute') as auth_can_serve,
  has_function_privilege('service_role','public.pixwiki_can_serve_subdomain(text)','execute') as service_can_serve,
  has_function_privilege('anon','public.pixwiki_effective_plan_for_user(uuid)','execute') as anon_effective_plan,
  has_function_privilege('authenticated','public.pixwiki_effective_plan_for_user(uuid)','execute') as auth_effective_plan;

-- Esperado: false, false, true, false, false.

-- C) RPCs legítimas do usuário continuam autenticadas.
select
  has_function_privilege('authenticated','public.pixwiki_list_my_companies()','execute') as list_companies,
  has_function_privilege('authenticated','public.pixwiki_register_push_subscription(uuid,text,text,text)','execute') as register_push,
  has_function_privilege('authenticated','public.pixwiki_report_receipts(uuid,text,date,date)','execute') as reports,
  has_function_privilege('anon','public.pixwiki_list_my_companies()','execute') as anon_list_companies;

-- Esperado: true, true, true, false.

-- D) Search path fixo da normalização de slug.
select p.proname, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='pixwiki_normalize_slug';

-- E) Índices finais.
select indexname
from pg_indexes
where schemaname='public'
  and indexname in (
    'pix_direct_intents_matched_receipt_idx','pix_direct_intents_user_idx',
    'pixwiki_invoices_target_plan_idx','pixwiki_payment_settings_mp_connection_idx',
    'pixwiki_subscriptions_last_invoice_idx','pixwiki_subscriptions_plan_idx',
    'pixwiki_sync_state_company_idx','pixwiki_sync_state_user_idx',
    'pixwiki_webhook_events_company_idx'
  )
order by indexname;

-- F) Não deve haver grants diretos da view para cliente.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='pixwiki_receipts'
order by grantee, privilege_type;
