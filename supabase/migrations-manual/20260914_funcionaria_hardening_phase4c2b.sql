-- minhAi / FuncionarIA — Hardening Fase 4C2B
-- Fecha o acesso direto restante a public.user_credits:
--   anon: sem SELECT/INSERT/UPDATE/DELETE
--   authenticated: somente SELECT da própria linha
--   service_role: acesso completo
--
-- Pré-requisitos:
--   - Fase 4C1 aplicada no banco;
--   - commit 4C2A publicado em produção;
--   - CreditsCard já usa /api/credits/ensure;
--   - VoiceAssistant público já usa /api/public/company-plan-state.
--
-- NÃO altera register_function_usage nesta etapa.

begin;

do $$
declare
  v_rls boolean;
  v_unsafe text;
  v_public_read_qual text;
  v_insert_check text;
begin
  if to_regclass('public.user_credits') is null then
    raise exception '4C2B abortada: public.user_credits não existe';
  end if;

  select c.relrowsecurity
    into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'user_credits';

  if coalesce(v_rls, false) is not true then
    raise exception '4C2B abortada: RLS de user_credits não está ativo';
  end if;

  -- 4C1 deve estar aplicada.
  if has_table_privilege('anon', 'public.user_credits', 'UPDATE')
     or has_table_privilege('authenticated', 'public.user_credits', 'UPDATE')
     or has_table_privilege('anon', 'public.user_credits', 'DELETE')
     or has_table_privilege('authenticated', 'public.user_credits', 'DELETE') then
    raise exception '4C2B abortada: 4C1 não está integralmente aplicada';
  end if;

  -- Confirma o contrato legado que estamos substituindo.
  select qual
    into v_public_read_qual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'user_credits'
    and policyname = 'Allow public read on user_credits'
    and cmd = 'SELECT';

  if coalesce(btrim(v_public_read_qual), '') <> 'true' then
    raise exception
      '4C2B abortada: policy pública de leitura ausente ou inesperada: %',
      coalesce(v_public_read_qual, '<null>');
  end if;

  select with_check
    into v_insert_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'user_credits'
    and policyname = 'Users can insert own credits'
    and cmd = 'INSERT';

  if v_insert_check is null
     or (
       v_insert_check not ilike '%auth.uid()%user_id%'
       and v_insert_check not ilike '%user_id%auth.uid()%'
     ) then
    raise exception
      '4C2B abortada: policy INSERT esperada não encontrada/inesperada: %',
      coalesce(v_insert_check, '<null>');
  end if;

  -- Defense in depth: não revoga grants se existir função SECURITY INVOKER
  -- pública/autenticada dependente de user_credits.
  select string_agg(
           format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
           E'\n'
         )
    into v_unsafe
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and not p.prosecdef
    and pg_get_functiondef(p.oid) ilike '%user_credits%'
    and (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      or has_function_privilege('authenticated', p.oid, 'EXECUTE')
    );

  if v_unsafe is not null then
    raise exception
      '4C2B abortada: função SECURITY INVOKER exposta depende de user_credits:%',
      E'\n' || v_unsafe;
  end if;
end
$$;

-- SELECT: remove leitura global e mantém somente o próprio usuário autenticado.
drop policy if exists "Allow public read on user_credits"
  on public.user_credits;

drop policy if exists "Users can view own credits"
  on public.user_credits;

drop policy if exists "Authenticated users can view own credits"
  on public.user_credits;

create policy "Authenticated users can view own credits"
  on public.user_credits
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT: bootstrap já foi migrado para endpoint server-side.
drop policy if exists "Users can insert own credits"
  on public.user_credits;

-- Limpa grants herdados de PUBLIC antes de reatribuir o mínimo necessário.
revoke select, insert on table public.user_credits from public;
revoke select, insert on table public.user_credits from anon;
revoke select, insert on table public.user_credits from authenticated;

grant select on table public.user_credits to authenticated;
grant select, insert on table public.user_credits to service_role;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'user_credits', jsonb_build_object(
      'rls_enabled', (
        select c.relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'user_credits'
      ),
      'anon', jsonb_build_object(
        'select', has_table_privilege('anon', 'public.user_credits', 'SELECT'),
        'insert', has_table_privilege('anon', 'public.user_credits', 'INSERT'),
        'update', has_table_privilege('anon', 'public.user_credits', 'UPDATE'),
        'delete', has_table_privilege('anon', 'public.user_credits', 'DELETE')
      ),
      'authenticated', jsonb_build_object(
        'select', has_table_privilege('authenticated', 'public.user_credits', 'SELECT'),
        'insert', has_table_privilege('authenticated', 'public.user_credits', 'INSERT'),
        'update', has_table_privilege('authenticated', 'public.user_credits', 'UPDATE'),
        'delete', has_table_privilege('authenticated', 'public.user_credits', 'DELETE')
      ),
      'service_role', jsonb_build_object(
        'select', has_table_privilege('service_role', 'public.user_credits', 'SELECT'),
        'insert', has_table_privilege('service_role', 'public.user_credits', 'INSERT'),
        'update', has_table_privilege('service_role', 'public.user_credits', 'UPDATE'),
        'delete', has_table_privilege('service_role', 'public.user_credits', 'DELETE')
      ),
      'policies', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'name', policyname,
              'cmd', cmd,
              'roles', roles,
              'qual', qual,
              'with_check', with_check
            )
            order by policyname
          ),
          '[]'::jsonb
        )
        from pg_policies
        where schemaname = 'public'
          and tablename = 'user_credits'
      )
    ),
    'register_function_usage_unchanged', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'args', pg_get_function_identity_arguments(p.oid),
            'anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
            'authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
            'service_role', has_function_privilege('service_role', p.oid, 'EXECUTE'),
            'security_definer', p.prosecdef
          )
          order by pg_get_function_identity_arguments(p.oid)
        ),
        '[]'::jsonb
      )
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'register_function_usage'
    ),
    'credit_contract_functions', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', p.proname,
            'args', pg_get_function_identity_arguments(p.oid),
            'anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
            'authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
            'service_role', has_function_privilege('service_role', p.oid, 'EXECUTE'),
            'security_definer', p.prosecdef
          )
          order by p.proname, pg_get_function_identity_arguments(p.oid)
        ),
        '[]'::jsonb
      )
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'app_register_function_usage_secure',
          'cobrar_credito_se_suficiente',
          'funcionaria_check_usage',
          'funcionaria_consume_usage',
          'funcionaria_get_credit_state',
          'initialize_user_credits'
        )
    )
  )
) as phase4c2b_result;
