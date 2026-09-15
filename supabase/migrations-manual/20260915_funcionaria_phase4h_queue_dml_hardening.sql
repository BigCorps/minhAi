-- FuncionarIA Phase 4H — queue DML hardening
-- RUN ONLY AFTER:
-- 1) 4H code verifier/build PASS
-- 2) 4H server contract SQL applied successfully
-- 3) 4H code committed/pushed/deployed
--
-- Keeps public SELECT + Realtime, removes browser INSERT/UPDATE/DELETE.

begin;

-- Safety gates: server-only RPCs must already exist and be restricted.
do $$
begin
  if to_regprocedure('public.queue_generate_ticket_server(uuid)') is null then
    raise exception '4H hardening blocked: queue_generate_ticket_server missing';
  end if;
  if to_regprocedure('public.queue_call_next_server(uuid,uuid)') is null then
    raise exception '4H hardening blocked: queue_call_next_server missing';
  end if;

  if has_function_privilege('anon', 'public.queue_generate_ticket_server(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.queue_generate_ticket_server(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.queue_generate_ticket_server(uuid)', 'EXECUTE') then
    raise exception '4H hardening blocked: unsafe queue_generate_ticket_server grants';
  end if;

  if has_function_privilege('anon', 'public.queue_call_next_server(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.queue_call_next_server(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.queue_call_next_server(uuid,uuid)', 'EXECUTE') then
    raise exception '4H hardening blocked: unsafe queue_call_next_server grants';
  end if;
end $$;

-- Remove direct browser DML. Revoke PUBLIC too so inherited grants cannot reopen it.
revoke insert, update, delete on table public.fila_senhas from public, anon, authenticated;
revoke insert, update, delete on table public.fila_configs from public, anon, authenticated;

-- Preserve the public read contract required by queue pages and Postgres Realtime.
grant select on table public.fila_senhas to anon, authenticated;
grant select on table public.fila_configs to anon, authenticated;

-- Preserve full server-side operational access.
grant select, insert, update, delete on table public.fila_senhas to service_role;
grant select, insert, update, delete on table public.fila_configs to service_role;

-- Remove every non-SELECT policy on both queue tables. This intentionally catches
-- old duplicate/temp policies as well as the currently known names.
do $$
declare
  r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('fila_senhas', 'fila_configs')
      and cmd <> 'SELECT'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Final safety validation. Any failure rolls the transaction back.
do $$
declare
  v_non_select_policies integer;
  v_realtime_senhas boolean;
  v_realtime_configs boolean;
begin
  if not has_table_privilege('anon', 'public.fila_senhas', 'SELECT')
     or not has_table_privilege('authenticated', 'public.fila_senhas', 'SELECT') then
    raise exception '4H hardening failed: fila_senhas SELECT contract lost';
  end if;
  if has_table_privilege('anon', 'public.fila_senhas', 'INSERT')
     or has_table_privilege('anon', 'public.fila_senhas', 'UPDATE')
     or has_table_privilege('anon', 'public.fila_senhas', 'DELETE')
     or has_table_privilege('authenticated', 'public.fila_senhas', 'INSERT')
     or has_table_privilege('authenticated', 'public.fila_senhas', 'UPDATE')
     or has_table_privilege('authenticated', 'public.fila_senhas', 'DELETE') then
    raise exception '4H hardening failed: fila_senhas browser DML still granted';
  end if;

  if not has_table_privilege('anon', 'public.fila_configs', 'SELECT')
     or not has_table_privilege('authenticated', 'public.fila_configs', 'SELECT') then
    raise exception '4H hardening failed: fila_configs SELECT contract lost';
  end if;
  if has_table_privilege('anon', 'public.fila_configs', 'INSERT')
     or has_table_privilege('anon', 'public.fila_configs', 'UPDATE')
     or has_table_privilege('anon', 'public.fila_configs', 'DELETE')
     or has_table_privilege('authenticated', 'public.fila_configs', 'INSERT')
     or has_table_privilege('authenticated', 'public.fila_configs', 'UPDATE')
     or has_table_privilege('authenticated', 'public.fila_configs', 'DELETE') then
    raise exception '4H hardening failed: fila_configs browser DML still granted';
  end if;

  if not has_table_privilege('service_role', 'public.fila_senhas', 'SELECT')
     or not has_table_privilege('service_role', 'public.fila_senhas', 'INSERT')
     or not has_table_privilege('service_role', 'public.fila_senhas', 'UPDATE')
     or not has_table_privilege('service_role', 'public.fila_senhas', 'DELETE') then
    raise exception '4H hardening failed: fila_senhas service_role CRUD lost';
  end if;
  if not has_table_privilege('service_role', 'public.fila_configs', 'SELECT')
     or not has_table_privilege('service_role', 'public.fila_configs', 'INSERT')
     or not has_table_privilege('service_role', 'public.fila_configs', 'UPDATE')
     or not has_table_privilege('service_role', 'public.fila_configs', 'DELETE') then
    raise exception '4H hardening failed: fila_configs service_role CRUD lost';
  end if;

  select count(*) into v_non_select_policies
  from pg_policies
  where schemaname = 'public'
    and tablename in ('fila_senhas', 'fila_configs')
    and cmd <> 'SELECT';
  if v_non_select_policies <> 0 then
    raise exception '4H hardening failed: non-SELECT queue policies remain';
  end if;

  select exists(
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fila_senhas'
  ) into v_realtime_senhas;
  select exists(
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fila_configs'
  ) into v_realtime_configs;

  if not v_realtime_senhas or not v_realtime_configs then
    raise exception '4H hardening failed: Realtime publication contract lost';
  end if;
end $$;

commit;

select jsonb_build_object(
  'phase', '4H',
  'fila_senhas', jsonb_build_object(
    'anon', jsonb_build_object(
      'select', has_table_privilege('anon', 'public.fila_senhas', 'SELECT'),
      'insert', has_table_privilege('anon', 'public.fila_senhas', 'INSERT'),
      'update', has_table_privilege('anon', 'public.fila_senhas', 'UPDATE'),
      'delete', has_table_privilege('anon', 'public.fila_senhas', 'DELETE')
    ),
    'authenticated', jsonb_build_object(
      'select', has_table_privilege('authenticated', 'public.fila_senhas', 'SELECT'),
      'insert', has_table_privilege('authenticated', 'public.fila_senhas', 'INSERT'),
      'update', has_table_privilege('authenticated', 'public.fila_senhas', 'UPDATE'),
      'delete', has_table_privilege('authenticated', 'public.fila_senhas', 'DELETE')
    ),
    'service_role', jsonb_build_object(
      'select', has_table_privilege('service_role', 'public.fila_senhas', 'SELECT'),
      'insert', has_table_privilege('service_role', 'public.fila_senhas', 'INSERT'),
      'update', has_table_privilege('service_role', 'public.fila_senhas', 'UPDATE'),
      'delete', has_table_privilege('service_role', 'public.fila_senhas', 'DELETE')
    ),
    'realtime', exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='fila_senhas')
  ),
  'fila_configs', jsonb_build_object(
    'anon', jsonb_build_object(
      'select', has_table_privilege('anon', 'public.fila_configs', 'SELECT'),
      'insert', has_table_privilege('anon', 'public.fila_configs', 'INSERT'),
      'update', has_table_privilege('anon', 'public.fila_configs', 'UPDATE'),
      'delete', has_table_privilege('anon', 'public.fila_configs', 'DELETE')
    ),
    'authenticated', jsonb_build_object(
      'select', has_table_privilege('authenticated', 'public.fila_configs', 'SELECT'),
      'insert', has_table_privilege('authenticated', 'public.fila_configs', 'INSERT'),
      'update', has_table_privilege('authenticated', 'public.fila_configs', 'UPDATE'),
      'delete', has_table_privilege('authenticated', 'public.fila_configs', 'DELETE')
    ),
    'service_role', jsonb_build_object(
      'select', has_table_privilege('service_role', 'public.fila_configs', 'SELECT'),
      'insert', has_table_privilege('service_role', 'public.fila_configs', 'INSERT'),
      'update', has_table_privilege('service_role', 'public.fila_configs', 'UPDATE'),
      'delete', has_table_privilege('service_role', 'public.fila_configs', 'DELETE')
    ),
    'realtime', exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='fila_configs')
  ),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'command',cmd,'roles',roles) order by tablename, policyname), '[]'::jsonb)
    from pg_policies
    where schemaname='public' and tablename in ('fila_senhas','fila_configs')
  )
) as phase4h_queue_dml_hardening_result;
