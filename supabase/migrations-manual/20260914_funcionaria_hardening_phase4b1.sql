-- minhAi / FuncionarIA — Hardening Fase 4B1
-- Escopo mínimo: bloquear INSERT direto em public.credit_transactions.
-- NÃO altera user_credits, pix_transactions, pedidos, pedido_itens
-- nem register_function_usage.
--
-- Base funcional validada:
--   2c01ab1be9210aa9fa1eaaacaf0f2df16ee8896f
--
-- Segurança:
--   - aborta se RLS não estiver ativo;
--   - aborta se existir função SECURITY INVOKER acessível por anon/authenticated
--     que dependa de credit_transactions;
--   - preserva service_role;
--   - preserva SELECT autenticado para o histórico de créditos.

begin;

do $$
declare
  v_rls boolean;
  v_unsafe text;
begin
  if to_regclass('public.credit_transactions') is null then
    raise exception '4B1 abortada: public.credit_transactions não existe';
  end if;

  select c.relrowsecurity
    into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'credit_transactions';

  if coalesce(v_rls, false) is not true then
    raise exception '4B1 abortada: RLS de public.credit_transactions não está ativo';
  end if;

  -- Se uma função SECURITY INVOKER exposta a anon/authenticated depender
  -- de INSERT em credit_transactions, revogar INSERT da tabela poderia quebrá-la.
  -- Nesse caso paramos antes de qualquer alteração.
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
    and pg_get_functiondef(p.oid) ilike '%credit_transactions%'
    and (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      or has_function_privilege('authenticated', p.oid, 'EXECUTE')
    );

  if v_unsafe is not null then
    raise exception
      '4B1 abortada: função SECURITY INVOKER exposta depende de credit_transactions:%',
      E'\n' || v_unsafe;
  end if;
end
$$;

-- Remove a policy que hoje permite qualquer INSERT.
drop policy if exists "Public insert credit transactions"
  on public.credit_transactions;

-- Remove acesso direto de clientes.
-- PUBLIC é incluído para eliminar eventual grant herdado por todos os roles.
revoke insert on table public.credit_transactions from public;
revoke insert on table public.credit_transactions from anon;
revoke insert on table public.credit_transactions from authenticated;

-- Backends/Edge Functions continuam autorizados.
grant insert on table public.credit_transactions to service_role;

commit;

-- Pós-check automático da própria migration.
select jsonb_pretty(
  jsonb_build_object(
    'rls_enabled', (
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'credit_transactions'
    ),
    'insert_privileges', jsonb_build_object(
      'anon', has_table_privilege('anon', 'public.credit_transactions', 'INSERT'),
      'authenticated', has_table_privilege('authenticated', 'public.credit_transactions', 'INSERT'),
      'service_role', has_table_privilege('service_role', 'public.credit_transactions', 'INSERT')
    ),
    'select_privileges', jsonb_build_object(
      'anon', has_table_privilege('anon', 'public.credit_transactions', 'SELECT'),
      'authenticated', has_table_privilege('authenticated', 'public.credit_transactions', 'SELECT'),
      'service_role', has_table_privilege('service_role', 'public.credit_transactions', 'SELECT')
    ),
    'public_insert_policy_exists', exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'credit_transactions'
        and policyname = 'Public insert credit transactions'
    ),
    'legacy_register_function_usage_execute', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'args', pg_get_function_identity_arguments(p.oid),
            'security_definer', p.prosecdef,
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
) as phase4b1_result;
