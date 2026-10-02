-- PixWiki V2 Gate 6 — validação read-only
-- Execute DEPOIS da migration do Gate 6.

-- 1) Funções esperadas
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'pixwiki_v2_dashboard_snapshot',
    'pixwiki_v2_update_notification_settings',
    'pixwiki_report_receipts',
    'pixwiki_list_my_companies'
  )
order by p.proname;

-- Esperado: 4 linhas.

-- 2) RPCs de dashboard NÃO podem ser anônimas
select
  has_function_privilege('anon','public.pixwiki_v2_dashboard_snapshot(uuid)','execute') as anon_dashboard_execute,
  has_function_privilege('authenticated','public.pixwiki_v2_dashboard_snapshot(uuid)','execute') as auth_dashboard_execute,
  has_function_privilege('anon','public.pixwiki_v2_update_notification_settings(uuid,text,boolean,boolean,text,boolean)','execute') as anon_settings_execute,
  has_function_privilege('authenticated','public.pixwiki_v2_update_notification_settings(uuid,text,boolean,boolean,text,boolean)','execute') as auth_settings_execute;

-- Esperado:
-- anon_dashboard_execute=false
-- auth_dashboard_execute=true
-- anon_settings_execute=false
-- auth_settings_execute=true

-- 3) Configuração de notificações: cliente só lê; alterações passam pelo RPC.
select
  has_table_privilege('authenticated','public.pixwiki_notification_settings','select') as auth_select,
  has_table_privilege('authenticated','public.pixwiki_notification_settings','insert') as auth_insert,
  has_table_privilege('authenticated','public.pixwiki_notification_settings','update') as auth_update,
  has_table_privilege('authenticated','public.pixwiki_notification_settings','delete') as auth_delete;

-- Esperado: select=true; insert/update/delete=false.

-- 4) Relatório deixou de depender do feature gate legado e aceita as origens V2.
select
  position('pixwiki_has_feature_for_user' in pg_get_functiondef(p.oid)) = 0 as legacy_feature_gate_removed,
  position('''checkout''' in pg_get_functiondef(p.oid)) > 0 as checkout_source_supported,
  position('''api''' in pg_get_functiondef(p.oid)) > 0 as api_source_supported
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='pixwiki_report_receipts';

-- Esperado: true / true / true.

-- 5) Catálogo V2 usado pela barra de franquia.
select plan,name,monthly_price_cents,annual_price_cents,included_automations,overage_price_cents,is_active
from public.pixwiki_v2_plan_catalog
order by rank;

-- Esperado:
-- free  100     overage 79
-- link  1000    overage 49
-- pro   10000   overage 29
-- vip   100000  overage 19

-- 6) Nenhuma assinatura/cobrança é migrada por este Gate.
-- Esta consulta é apenas informativa; não deve haver alteração causada pelo Gate 6.
select plan,status,allow_overage,complimentary,count(*) as accounts
from public.pixwiki_v2_billing_accounts
group by plan,status,allow_overage,complimentary
order by plan,status;

-- 7) Função de uso continua service_role-only para gravação.
select
  has_function_privilege('anon','public.pixwiki_v2_record_usage(uuid,uuid,uuid,text,text,integer,integer,boolean,timestamptz,jsonb)','execute') as anon_record_usage,
  has_function_privilege('authenticated','public.pixwiki_v2_record_usage(uuid,uuid,uuid,text,text,integer,integer,boolean,timestamptz,jsonb)','execute') as auth_record_usage,
  has_function_privilege('service_role','public.pixwiki_v2_record_usage(uuid,uuid,uuid,text,text,integer,integer,boolean,timestamptz,jsonb)','execute') as service_record_usage;

-- Esperado: false / false / true.
