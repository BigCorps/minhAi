-- minhAi / FuncionarIA — Hardening Fase 4B3
-- Escopo mínimo: retirar SELECT de anon em public.credit_transactions
-- e limitar a policy de leitura ao role authenticated.
--
-- Pré-requisitos:
--   4B1: INSERT fechado para anon/authenticated
--   4B2: UPDATE/DELETE fechados para anon/authenticated
--
-- Mantém:
--   authenticated SELECT = true (histórico próprio via RLS)
--   service_role SELECT/INSERT/UPDATE/DELETE = true
--
-- NÃO toca:
--   user_credits, pix_transactions, pedidos, pedido_itens,
--   register_function_usage ou frontend.

begin;

do $$
declare
  v_rls boolean;
  v_select_policy_count integer;
  v_select_policy_qual text;
begin
  if to_regclass('public.credit_transactions') is null then
    raise exception '4B3 abortada: public.credit_transactions não existe';
  end if;

  select c.relrowsecurity
    into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'credit_transactions';

  if coalesce(v_rls, false) is not true then
    raise exception '4B3 abortada: RLS de credit_transactions não está ativo';
  end if;

  if has_table_privilege('anon', 'public.credit_transactions', 'INSERT')
     or has_table_privilege('authenticated', 'public.credit_transactions', 'INSERT')
     or has_table_privilege('anon', 'public.credit_transactions', 'UPDATE')
     or has_table_privilege('authenticated', 'public.credit_transactions', 'UPDATE')
     or has_table_privilege('anon', 'public.credit_transactions', 'DELETE')
     or has_table_privilege('authenticated', 'public.credit_transactions', 'DELETE') then
    raise exception '4B3 abortada: 4B1/4B2 não estão integralmente aplicadas';
  end if;

  select count(*), max(qual)
    into v_select_policy_count, v_select_policy_qual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'credit_transactions'
    and cmd = 'SELECT';

  if v_select_policy_count <> 1 then
    raise exception
      '4B3 abortada: esperado exatamente 1 SELECT policy em credit_transactions, encontrado %',
      v_select_policy_count;
  end if;

  if coalesce(v_select_policy_qual, '') not ilike '%user_id%auth.uid()%'
     and coalesce(v_select_policy_qual, '') not ilike '%auth.uid()%user_id%' then
    raise exception
      '4B3 abortada: SELECT policy atual não parece restringir user_id = auth.uid(): %',
      v_select_policy_qual;
  end if;
end
$$;

-- Remove a policy antiga que estava atribuída ao pseudo-role PUBLIC.
drop policy if exists "Users can view own credit transactions"
  on public.credit_transactions;

-- Recria o mesmo contrato de leitura, mas explicitamente para authenticated.
drop policy if exists "Authenticated users can view own credit transactions"
  on public.credit_transactions;

create policy "Authenticated users can view own credit transactions"
  on public.credit_transactions
  for select
  to authenticated
  using (user_id = auth.uid());

-- Elimina SELECT herdado de PUBLIC/anon e reatribui explicitamente.
revoke select on table public.credit_transactions from public;
revoke select on table public.credit_transactions from anon;
revoke select on table public.credit_transactions from authenticated;

grant select on table public.credit_transactions to authenticated;
grant select on table public.credit_transactions to service_role;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'credit_transactions', jsonb_build_object(
      'anon', jsonb_build_object(
        'select', has_table_privilege('anon', 'public.credit_transactions', 'SELECT'),
        'insert', has_table_privilege('anon', 'public.credit_transactions', 'INSERT'),
        'update', has_table_privilege('anon', 'public.credit_transactions', 'UPDATE'),
        'delete', has_table_privilege('anon', 'public.credit_transactions', 'DELETE')
      ),
      'authenticated', jsonb_build_object(
        'select', has_table_privilege('authenticated', 'public.credit_transactions', 'SELECT'),
        'insert', has_table_privilege('authenticated', 'public.credit_transactions', 'INSERT'),
        'update', has_table_privilege('authenticated', 'public.credit_transactions', 'UPDATE'),
        'delete', has_table_privilege('authenticated', 'public.credit_transactions', 'DELETE')
      ),
      'service_role', jsonb_build_object(
        'select', has_table_privilege('service_role', 'public.credit_transactions', 'SELECT'),
        'insert', has_table_privilege('service_role', 'public.credit_transactions', 'INSERT'),
        'update', has_table_privilege('service_role', 'public.credit_transactions', 'UPDATE'),
        'delete', has_table_privilege('service_role', 'public.credit_transactions', 'DELETE')
      ),
      'select_policies', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'name', policyname,
              'roles', roles,
              'qual', qual
            )
            order by policyname
          ),
          '[]'::jsonb
        )
        from pg_policies
        where schemaname = 'public'
          and tablename = 'credit_transactions'
          and cmd = 'SELECT'
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
) as phase4b3_result;
