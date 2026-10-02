-- PixWiki V2 Gate 4 — validação SOMENTE LEITURA

-- 1) Colunas versionadas do Webhook.
select column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public'
  and table_name='pixwiki_webhook_events'
  and column_name in ('api_version','checkout_id','external_id','origin')
order by column_name;

-- Esperado: 4 linhas.

-- 2) Índices adicionados.
select tablename,indexname,indexdef
from pg_indexes
where schemaname='public'
  and indexname in (
    'pixwiki_v2_checkout_receipt_idx',
    'pixwiki_v2_checkout_company_external_idx',
    'pixwiki_webhook_events_checkout_idx',
    'pixwiki_webhook_events_external_idx'
  )
order by indexname;

-- Esperado: 4 linhas.


-- 2.1) Logs da API com correlação/versionamento.
select column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public'
  and table_name='pixwiki_api_request_logs'
  and column_name in ('request_id','api_version')
order by column_name;

-- Esperado: 2 linhas.

-- 3) RPCs internas da API V2.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'pixwiki_v2_api_receipts_internal',
    'pixwiki_v2_api_summary_internal'
  )
order by p.proname;

-- Esperado: 2 linhas, security_definer=true.

-- 4) RPCs internas não podem ser chamadas por anon/authenticated.
select
  p.proname,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'pixwiki_v2_api_receipts_internal',
    'pixwiki_v2_api_summary_internal'
  )
order by p.proname;

-- Esperado em ambas:
-- anon_execute=false
-- authenticated_execute=false
-- service_role_execute=true

-- 5) Objetos internos de Webhook não expostos diretamente ao Data API do usuário.
select
  has_table_privilege('anon','public.pixwiki_api_keys','SELECT') as anon_api_keys_select,
  has_table_privilege('authenticated','public.pixwiki_api_keys','SELECT') as authenticated_api_keys_select,
  has_table_privilege('anon','public.pixwiki_webhooks','SELECT') as anon_webhooks_select,
  has_table_privilege('authenticated','public.pixwiki_webhooks','SELECT') as authenticated_webhooks_select,
  has_table_privilege('anon','public.pixwiki_webhook_events','SELECT') as anon_events_select,
  has_table_privilege('authenticated','public.pixwiki_webhook_events','SELECT') as authenticated_events_select,
  has_table_privilege('anon','public.pixwiki_webhook_secrets','SELECT') as anon_secrets_select,
  has_table_privilege('authenticated','public.pixwiki_webhook_secrets','SELECT') as authenticated_secrets_select;

-- Esperado: tudo false.

-- 6) Distribuição das versões armazenadas (eventos antigos ficam legacy-v1).
select api_version,count(*) as events
from public.pixwiki_webhook_events
group by api_version
order by api_version;

-- 7) Integridade: contexto de checkout, quando presente, precisa apontar para sessão válida.
select count(*) as orphan_checkout_context
from public.pixwiki_webhook_events e
left join public.pixwiki_v2_checkout_sessions s on s.id=e.checkout_id
where e.checkout_id is not null and s.id is null;

-- Esperado: 0.

-- 8) As tabelas V2 continuam com RLS ativo.
select c.relname,c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('pixwiki_v2_checkout_sessions','pixwiki_webhook_events','pixwiki_webhook_deliveries','pixwiki_webhook_secrets')
order by c.relname;

-- Esperado: relrowsecurity=true para todas.
