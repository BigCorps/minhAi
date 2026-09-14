-- minhAi / FuncionarIA — Hardening Fase 4D3
--
-- Objetivo:
-- 1) fechar EXECUTE público direto da trigger function SECURITY DEFINER
--    public.pixwiki_confirm_link_from_received_payment();
-- 2) fechar privilégios de escrita supérfluos de anon/authenticated na tabela
--    que dispara a trigger: public.mp_received_payments;
-- 3) preservar SELECT e o fluxo backend/service_role;
-- 4) preservar a trigger e o corpo funcional.
--
-- Preflight confirmado:
-- - exatamente 1 trigger chama a função;
-- - trigger: trg_pixwiki_confirm_link_from_received_payment;
-- - tabela fonte: public.mp_received_payments;
-- - RLS habilitado;
-- - não existem policies INSERT/UPDATE/DELETE nessa tabela;
-- - não há chamadas runtime diretas da trigger function;
-- - dashboard usa a tabela para leitura/realtime;
-- - DML funcional rastreado ocorre em Edge Functions/server-side.

begin;

do $$
declare
  v_fn regprocedure := to_regprocedure('public.pixwiki_confirm_link_from_received_payment()');
  v_table regclass := to_regclass('public.mp_received_payments');
  v_trigger_count integer;
  v_write_policy_count integer;
  v_secdef boolean;
begin
  if v_fn is null then
    raise exception '4D3 abortada: trigger function não existe';
  end if;

  if v_table is null then
    raise exception '4D3 abortada: public.mp_received_payments não existe';
  end if;

  select p.prosecdef
    into v_secdef
  from pg_proc p
  where p.oid = v_fn;

  if v_secdef is distinct from true then
    raise exception '4D3 abortada: function deixou de ser SECURITY DEFINER';
  end if;

  select count(*)
    into v_trigger_count
  from pg_trigger t
  where not t.tgisinternal
    and t.tgfoid = v_fn
    and t.tgrelid = v_table
    and t.tgname = 'trg_pixwiki_confirm_link_from_received_payment';

  if v_trigger_count <> 1 then
    raise exception
      '4D3 abortada: trigger esperada não encontrada exatamente uma vez (% encontrada(s))',
      v_trigger_count;
  end if;

  select count(*)
    into v_write_policy_count
  from pg_policy
  where polrelid = v_table
    and polcmd in ('a','w','d');

  if v_write_policy_count <> 0 then
    raise exception
      '4D3 abortada: existem % policies de escrita em mp_received_payments',
      v_write_policy_count;
  end if;

  if not has_table_privilege('service_role', v_table, 'SELECT')
     or not has_table_privilege('service_role', v_table, 'INSERT')
     or not has_table_privilege('service_role', v_table, 'UPDATE')
     or not has_table_privilege('service_role', v_table, 'DELETE') then
    raise exception '4D3 abortada: service_role sem contrato DML esperado';
  end if;

  if not has_table_privilege('authenticated', v_table, 'SELECT') then
    raise exception '4D3 abortada: SELECT autenticado divergiu do esperado';
  end if;
end
$$;

-- Fecha chamada direta da trigger function.
revoke execute
on function public.pixwiki_confirm_link_from_received_payment()
from public, anon, authenticated;

grant execute
on function public.pixwiki_confirm_link_from_received_payment()
to service_role;

-- Defesa em profundidade: grants DML/DDL-like existiam, embora RLS já
-- bloqueasse escrita por falta de policies. Removemos os grants supérfluos.
revoke insert, update, delete, truncate, trigger, references
on table public.mp_received_payments
from public, anon, authenticated;

-- Preserva leitura já existente. RLS continua decidindo quem enxerga linhas.
grant select on table public.mp_received_payments
to anon, authenticated;

-- Preserva backend privilegiado.
grant select, insert, update, delete, truncate, trigger, references
on table public.mp_received_payments
to service_role;

do $$
declare
  v_fn regprocedure := 'public.pixwiki_confirm_link_from_received_payment()'::regprocedure;
  v_table regclass := 'public.mp_received_payments'::regclass;
  v_trigger_count integer;
  v_write_policy_count integer;
begin
  if has_function_privilege('anon', v_fn, 'EXECUTE')
     or has_function_privilege('authenticated', v_fn, 'EXECUTE') then
    raise exception '4D3 falhou: anon/authenticated ainda podem EXECUTE a function';
  end if;

  if not has_function_privilege('service_role', v_fn, 'EXECUTE') then
    raise exception '4D3 falhou: service_role perdeu EXECUTE da function';
  end if;

  if has_table_privilege('anon', v_table, 'INSERT')
     or has_table_privilege('anon', v_table, 'UPDATE')
     or has_table_privilege('anon', v_table, 'DELETE')
     or has_table_privilege('anon', v_table, 'TRUNCATE')
     or has_table_privilege('anon', v_table, 'TRIGGER')
     or has_table_privilege('anon', v_table, 'REFERENCES') then
    raise exception '4D3 falhou: anon ainda possui escrita/estrutura em mp_received_payments';
  end if;

  if has_table_privilege('authenticated', v_table, 'INSERT')
     or has_table_privilege('authenticated', v_table, 'UPDATE')
     or has_table_privilege('authenticated', v_table, 'DELETE')
     or has_table_privilege('authenticated', v_table, 'TRUNCATE')
     or has_table_privilege('authenticated', v_table, 'TRIGGER')
     or has_table_privilege('authenticated', v_table, 'REFERENCES') then
    raise exception '4D3 falhou: authenticated ainda possui escrita/estrutura em mp_received_payments';
  end if;

  if not has_table_privilege('authenticated', v_table, 'SELECT') then
    raise exception '4D3 falhou: SELECT autenticado foi removido';
  end if;

  if not has_table_privilege('service_role', v_table, 'SELECT')
     or not has_table_privilege('service_role', v_table, 'INSERT')
     or not has_table_privilege('service_role', v_table, 'UPDATE')
     or not has_table_privilege('service_role', v_table, 'DELETE') then
    raise exception '4D3 falhou: contrato service_role foi alterado';
  end if;

  select count(*)
    into v_trigger_count
  from pg_trigger t
  where not t.tgisinternal
    and t.tgfoid = v_fn
    and t.tgrelid = v_table
    and t.tgname = 'trg_pixwiki_confirm_link_from_received_payment'
    and t.tgenabled <> 'D';

  if v_trigger_count <> 1 then
    raise exception '4D3 falhou: trigger esperada não permaneceu ativa';
  end if;

  select count(*)
    into v_write_policy_count
  from pg_policy
  where polrelid = v_table
    and polcmd in ('a','w','d');

  if v_write_policy_count <> 0 then
    raise exception '4D3 falhou: surgiu policy de escrita em mp_received_payments';
  end if;
end
$$;

commit;

with fn as (
  select
    p.oid,
    jsonb_build_object(
      'name',p.proname,
      'security_definer',p.prosecdef,
      'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
      'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
      'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')
    ) as value
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='pixwiki_confirm_link_from_received_payment'
    and pg_get_function_identity_arguments(p.oid)=''
),
tbl as (
  select jsonb_build_object(
    'anon',jsonb_build_object(
      'select',has_table_privilege('anon','public.mp_received_payments','SELECT'),
      'insert',has_table_privilege('anon','public.mp_received_payments','INSERT'),
      'update',has_table_privilege('anon','public.mp_received_payments','UPDATE'),
      'delete',has_table_privilege('anon','public.mp_received_payments','DELETE'),
      'truncate',has_table_privilege('anon','public.mp_received_payments','TRUNCATE'),
      'trigger',has_table_privilege('anon','public.mp_received_payments','TRIGGER'),
      'references',has_table_privilege('anon','public.mp_received_payments','REFERENCES')
    ),
    'authenticated',jsonb_build_object(
      'select',has_table_privilege('authenticated','public.mp_received_payments','SELECT'),
      'insert',has_table_privilege('authenticated','public.mp_received_payments','INSERT'),
      'update',has_table_privilege('authenticated','public.mp_received_payments','UPDATE'),
      'delete',has_table_privilege('authenticated','public.mp_received_payments','DELETE'),
      'truncate',has_table_privilege('authenticated','public.mp_received_payments','TRUNCATE'),
      'trigger',has_table_privilege('authenticated','public.mp_received_payments','TRIGGER'),
      'references',has_table_privilege('authenticated','public.mp_received_payments','REFERENCES')
    ),
    'service_role',jsonb_build_object(
      'select',has_table_privilege('service_role','public.mp_received_payments','SELECT'),
      'insert',has_table_privilege('service_role','public.mp_received_payments','INSERT'),
      'update',has_table_privilege('service_role','public.mp_received_payments','UPDATE'),
      'delete',has_table_privilege('service_role','public.mp_received_payments','DELETE')
    )
  ) as value
),
trg as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name',t.tgname,
      'enabled',t.tgenabled,
      'definition',pg_get_triggerdef(t.oid,true)
    )
  ),'[]'::jsonb) as value
  from pg_trigger t
  where not t.tgisinternal
    and t.tgfoid=(select oid from fn)
)
select jsonb_pretty(jsonb_build_object(
  'function',(select value from fn),
  'source_table_contract',(select value from tbl),
  'triggers',(select value from trg),
  'expected',jsonb_build_object(
    'function','anon/authenticated execute=false, service=true',
    'source_table','anon/authenticated SELECT only, service DML preserved',
    'trigger','preserved and enabled'
  )
)) as phase4d3_result;
