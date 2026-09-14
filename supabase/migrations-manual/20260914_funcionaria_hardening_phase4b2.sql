-- minhAi / FuncionarIA — Hardening Fase 4B2
-- Escopo mínimo: remover UPDATE/DELETE diretos de credit_transactions.
--
-- 4B1 já aplicada:
--   anon INSERT          = false
--   authenticated INSERT = false
--   service_role INSERT  = true
--   public INSERT policy = removida
--
-- Esta etapa NÃO toca SELECT e NÃO toca:
-- user_credits, pix_transactions, pedidos, pedido_itens,
-- register_function_usage ou frontend.

begin;

do $$
declare
  v_rls boolean;
  v_public_insert boolean;
begin
  if to_regclass('public.credit_transactions') is null then
    raise exception '4B2 abortada: public.credit_transactions não existe';
  end if;

  select c.relrowsecurity
    into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'credit_transactions';

  if coalesce(v_rls, false) is not true then
    raise exception '4B2 abortada: RLS de credit_transactions não está ativo';
  end if;

  if has_table_privilege('anon', 'public.credit_transactions', 'INSERT')
     or has_table_privilege('authenticated', 'public.credit_transactions', 'INSERT') then
    raise exception '4B2 abortada: 4B1 não está aplicada; INSERT ainda está aberto';
  end if;

  select exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_transactions'
      and policyname = 'Public insert credit transactions'
  ) into v_public_insert;

  if v_public_insert then
    raise exception '4B2 abortada: policy pública de INSERT ainda existe';
  end if;
end
$$;

-- Defense in depth.
-- Hoje não há policies de UPDATE/DELETE para clientes, portanto o RLS já
-- bloqueia essas operações. A revogação remove também o grant de tabela.
revoke update, delete on table public.credit_transactions from public;
revoke update, delete on table public.credit_transactions from anon;
revoke update, delete on table public.credit_transactions from authenticated;

-- Backends internos permanecem completos.
grant update, delete on table public.credit_transactions to service_role;

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
          and tablename = 'credit_transactions'
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
) as phase4b2_result;
