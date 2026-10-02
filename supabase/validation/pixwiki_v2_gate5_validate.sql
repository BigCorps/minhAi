-- PixWiki V2 Gate 5 — validação somente leitura

-- 1) Colunas novas do onboarding
select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public'
  and table_name='pixwiki_v2_onboarding_state'
  and column_name in ('onboarding_version','channels_configured_at','first_receipt_test_started_at','first_receipt_id','exploration_skipped_at')
order by column_name;

-- Esperado: 5 linhas.

-- 2) RPCs do Gate 5
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'pixwiki_v2_onboarding_begin',
    'pixwiki_v2_onboarding_get',
    'pixwiki_v2_onboarding_mark_mp_connected',
    'pixwiki_v2_onboarding_save_pix_key',
    'pixwiki_v2_onboarding_save_setup',
    'pixwiki_v2_onboarding_mark_push',
    'pixwiki_v2_onboarding_start_receipt_test',
    'pixwiki_v2_onboarding_detect_first_receipt',
    'pixwiki_v2_onboarding_mark_test',
    'pixwiki_v2_onboarding_save_estimate',
    'pixwiki_v2_onboarding_finish'
  )
order by p.proname;

-- Esperado: 11 linhas.

-- 3) O front não deve escrever diretamente no estado; somente ler.
select grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name='pixwiki_v2_onboarding_state'
  and grantee in ('anon','authenticated','service_role')
order by grantee,privilege_type;

-- authenticated: SELECT. service_role: privilégios administrativos.
-- anon: nenhum acesso.

-- 4) Trigger de score
select trigger_name,event_manipulation,action_timing
from information_schema.triggers
where event_object_schema='public'
  and event_object_table='pixwiki_v2_onboarding_state'
  and trigger_name='trg_pixwiki_v2_onboarding_score';

-- Esperado: INSERT e UPDATE (duas linhas no information_schema).

-- 5) Verificar se as funções sensíveis não estão executáveis por anon/PUBLIC.
select p.proname,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and (p.proname like 'pixwiki_v2_onboarding_%' or p.proname='pixwiki_v2_assert_company_owner')
order by p.proname;

-- Esperado para RPCs de usuário: anon_execute=false, authenticated_execute=true.

-- 6) Catálogo/quote exigidos pelo onboarding ainda disponíveis
select plan,name,monthly_price_cents,annual_price_cents,included_automations,overage_price_cents
from public.pixwiki_v2_plan_catalog
where is_active=true
order by rank;

-- Esperado: free, link, pro, vip.
