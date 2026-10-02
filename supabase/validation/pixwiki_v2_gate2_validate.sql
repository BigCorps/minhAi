-- =============================================================================
-- PixWiki V2 — Gate 2 — validação READ-ONLY
-- Execute APÓS Gate 1 + Gate 2.
-- Nenhum comando abaixo altera dados.
-- =============================================================================

-- 1) Estruturas esperadas
select
  to_regclass('public.pixwiki_v2_plan_catalog') is not null as gate1_plan_catalog_ok,
  to_regclass('public.pixwiki_v2_usage_events') is not null as gate1_usage_ok,
  to_regclass('public.pixwiki_v2_checkout_sessions') is not null as checkout_sessions_ok,
  to_regclass('public.pixwiki_v2_runtime_config') is not null as runtime_config_ok;

-- 2) Runtime: novo Pix Link deve continuar DESLIGADO até o Gate 3.
select
  pix_link_v2_enabled,
  checkout_api_enabled,
  checkout_owner_enabled,
  checkout_public_prepare_enabled,
  slot_ttl_seconds,
  queue_max_wait_seconds,
  default_session_ttl_seconds
from public.pixwiki_v2_runtime_config
where id=true;

-- Esperado:
-- pix_link_v2_enabled = false
-- checkout_api_enabled = true
-- checkout_owner_enabled = true
-- checkout_public_prepare_enabled = true

-- 3) RLS e exposição da tabela de Checkout
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', 'public.pixwiki_v2_checkout_sessions', 'select') as anon_select,
  has_table_privilege('authenticated', 'public.pixwiki_v2_checkout_sessions', 'select') as authenticated_select,
  has_table_privilege('authenticated', 'public.pixwiki_v2_checkout_sessions', 'insert') as authenticated_insert,
  has_table_privilege('authenticated', 'public.pixwiki_v2_checkout_sessions', 'update') as authenticated_update,
  has_table_privilege('authenticated', 'public.pixwiki_v2_checkout_sessions', 'delete') as authenticated_delete
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='pixwiki_v2_checkout_sessions';

-- Esperado:
-- rls_enabled=true
-- anon_select=false
-- authenticated_select=true
-- authenticated_insert/update/delete=false

-- 4) Funções internas do motor não podem ser executadas por anon/authenticated.
select
  p.proname,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'pixwiki_v2_automation_allowance',
    'pixwiki_v2_enqueue_checkout',
    'pixwiki_v2_acquire_checkout_slot',
    'pixwiki_v2_checkout_reconcile_acquire',
    'pixwiki_v2_cancel_checkout',
    'pixwiki_v2_expire_stale_checkouts'
  )
order by p.proname;

-- Esperado para todas: anon=false, authenticated=false, service=true

-- 5) Triggers de confirmação/receipt
select
  tgname,
  tgrelid::regclass::text as table_name,
  tgenabled
from pg_trigger
where not tgisinternal
  and tgname in (
    'trg_pixwiki_v2_direct_intent_confirmed',
    'trg_pixwiki_v2_attach_receipt'
  )
order by tgname;

-- 6) Índices críticos para fila/idempotência
select tablename,indexname,indexdef
from pg_indexes
where schemaname='public'
  and indexname in (
    'pixwiki_v2_checkout_api_idempotency_uidx',
    'pixwiki_v2_checkout_queue_idx',
    'pixwiki_v2_checkout_direct_intent_idx',
    'pixwiki_v2_transaction_direct_intent_uidx'
  )
order by indexname;

-- 7) Não deve haver duplicação histórica de transaction por direct_intent.
select direct_intent_id,count(*) as duplicates
from public.pix_transactions
where direct_intent_id is not null
  and origem in ('pixwiki_v2_pix_link','pixwiki_v2_checkout','pixwiki_v2_api')
group by direct_intent_id
having count(*)>1;
-- Esperado: 0 linhas.

-- 8) O Gate 2 não deve modificar o catálogo legado.
select plan,name,price_cents,is_active
from public.pixwiki_plan_catalog
order by rank;

-- 9) O Gate 2 nasce sem sessões V2 em banco; após testes esse número pode aumentar.
select status,origin,count(*)
from public.pixwiki_v2_checkout_sessions
group by status,origin
order by origin,status;

-- 10) Dependências essenciais existentes no motor atual.
select
  to_regprocedure('public.pix_direct_reserve_intent(uuid,uuid,text,text,integer,text,text,text,text,integer,jsonb)') is not null as reserve_intent_ok,
  to_regprocedure('public.pix_direct_claim_provider_payment(uuid,text,timestamptz,uuid,boolean)') is not null as claim_payment_ok,
  to_regclass('public.pixwiki_payment_settings') is not null as payment_settings_ok,
  to_regclass('public.pixwiki_mp_connections') is not null as mp_connections_ok;
