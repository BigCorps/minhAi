-- minhAi / FuncionarIA — Hardening Fase 4C1
-- Escopo mínimo: remover UPDATE e DELETE diretos de public.user_credits.
--
-- Motivo:
--   - o frontend auditado não possui nenhum UPDATE/DELETE direto nessa tabela;
--   - a policy atual "Users can update own credits" permite ao usuário
--     autenticado alterar a própria linha, incluindo available_credits;
--   - funções legítimas de cobrança são SECURITY DEFINER / service_role.
--
-- NÃO toca nesta etapa:
--   SELECT (ainda há consumidor público legado);
--   INSERT (CreditsCard ainda faz bootstrap direto de 20 créditos);
--   register_function_usage;
--   initialize_user_credits;
--   frontend.

begin;

do $$
declare
  v_rls boolean;
  v_update_policy_qual text;
  v_unsafe text;
begin
  if to_regclass('public.user_credits') is null then
    raise exception '4C1 abortada: public.user_credits não existe';
  end if;

  select c.relrowsecurity
    into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'user_credits';

  if coalesce(v_rls, false) is not true then
    raise exception '4C1 abortada: RLS de user_credits não está ativo';
  end if;

  select qual
    into v_update_policy_qual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'user_credits'
    and policyname = 'Users can update own credits'
    and cmd = 'UPDATE';

  if v_update_policy_qual is null then
    raise exception '4C1 abortada: policy esperada "Users can update own credits" não encontrada';
  end if;

  if v_update_policy_qual not ilike '%auth.uid()%user_id%'
     and v_update_policy_qual not ilike '%user_id%auth.uid()%' then
    raise exception
      '4C1 abortada: policy UPDATE tem contrato inesperado: %',
      v_update_policy_qual;
  end if;

  -- Se existir função SECURITY INVOKER exposta que dependa de user_credits,
  -- a revogação de grants poderia quebrá-la. Abortamos antes de mudar algo.
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
      '4C1 abortada: função SECURITY INVOKER exposta depende de user_credits:%',
      E'\n' || v_unsafe;
  end if;
end
$$;

-- Remove a capacidade explícita de o usuário alterar o próprio saldo/plano.
drop policy if exists "Users can update own credits"
  on public.user_credits;

-- Remove grants diretos de escrita destrutiva.
revoke update, delete on table public.user_credits from public;
revoke update, delete on table public.user_credits from anon;
revoke update, delete on table public.user_credits from authenticated;

-- Backends internos continuam podendo atualizar saldo/plano.
grant update, delete on table public.user_credits to service_role;

commit;

-- Pós-check automático.
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
            'service_role', has_function_privilege('service_role', p.oid, 'EXECUTE')
          )
          order by pg_get_function_identity_arguments(p.oid)
        ),
        '[]'::jsonb
      )
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'register_function_usage'
    )
  )
) as phase4c1_result;
