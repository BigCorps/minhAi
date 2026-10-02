-- PixWiki V2 Gate 3 — validação read-only

-- 1) Flags públicas do V2 devem estar ligadas.
select
  pix_link_v2_enabled,
  checkout_api_enabled,
  checkout_owner_enabled,
  checkout_public_prepare_enabled,
  slot_ttl_seconds,
  queue_max_wait_seconds
from public.pixwiki_v2_runtime_config
where id=true;

-- Esperado: pix_link_v2_enabled=true e checkout_public_prepare_enabled=true.

-- 2) Função de subdomínio deve existir com a assinatura esperada.
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='pixwiki_can_serve_subdomain';

-- 3) Grants: função pública somente de leitura booleana.
select
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema='public'
  and routine_name='pixwiki_can_serve_subdomain'
order by grantee,privilege_type;

-- 4) Confirma que sessões V2 continuam protegidas por RLS.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname='pixwiki_v2_checkout_sessions';

-- 5) Não deve existir grant de INSERT/UPDATE/DELETE para anon/authenticated.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name='pixwiki_v2_checkout_sessions'
  and grantee in ('anon','authenticated')
order by grantee,privilege_type;
