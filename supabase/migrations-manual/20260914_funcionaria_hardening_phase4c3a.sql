-- minhAi / FuncionarIA — Hardening Fase 4C3A
--
-- Reduz EXECUTE público de RPCs de crédito/uso que já não precisam ser
-- executados diretamente por anon/authenticated.
--
-- NÃO altera:
--   - register_function_usage (ainda possui consumidores browser legados);
--   - get_is_paid_plan (ainda possui consumidor runtime);
--   - cobrar_credito_se_suficiente;
--   - app_register_function_usage_secure;
--   - tabelas, RLS ou dados.
--
-- Contrato após esta fase:
--   service_role only:
--     funcionaria_check_usage
--     expire_plans
--     cobrar_creditos_videochamada
--     initialize_user_credits (o trigger auth.users continua funcionando)
--
--   authenticated + service_role:
--     funcionaria_get_credit_state
--     funcionaria_save_usage_settings

begin;

do $$
declare
  v_trigger_count integer;
  v_register_overloads integer;
begin
  -- Guard: funções alvo devem existir exatamente com as assinaturas esperadas.
  if to_regprocedure('public.funcionaria_check_usage(uuid,text,numeric)') is null then
    raise exception '4C3A abortada: funcionaria_check_usage(uuid,text,numeric) ausente';
  end if;

  if to_regprocedure('public.funcionaria_get_credit_state(uuid)') is null then
    raise exception '4C3A abortada: funcionaria_get_credit_state(uuid) ausente';
  end if;

  if to_regprocedure('public.funcionaria_save_usage_settings(uuid,boolean,boolean)') is null then
    raise exception '4C3A abortada: funcionaria_save_usage_settings(uuid,boolean,boolean) ausente';
  end if;

  if to_regprocedure('public.expire_plans()') is null then
    raise exception '4C3A abortada: expire_plans() ausente';
  end if;

  if to_regprocedure('public.cobrar_creditos_videochamada()') is null then
    raise exception '4C3A abortada: cobrar_creditos_videochamada() ausente';
  end if;

  if to_regprocedure('public.initialize_user_credits()') is null then
    raise exception '4C3A abortada: initialize_user_credits() ausente';
  end if;

  -- Guard: initialize_user_credits precisa continuar ligado ao trigger auth.users.
  select count(*)
    into v_trigger_count
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace tn on tn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace pn on pn.oid = p.pronamespace
  where not t.tgisinternal
    and tn.nspname = 'auth'
    and c.relname = 'users'
    and t.tgname = 'on_user_created'
    and pn.nspname = 'public'
    and p.proname = 'initialize_user_credits';

  if v_trigger_count <> 1 then
    raise exception
      '4C3A abortada: trigger on_user_created -> initialize_user_credits inesperado (count=%)',
      v_trigger_count;
  end if;

  -- Guard: os dois wrappers legados de register_function_usage devem continuar
  -- presentes. Esta migration não toca neles.
  select count(*)
    into v_register_overloads
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'register_function_usage'
    and pg_get_function_identity_arguments(p.oid) in (
      'p_company_id uuid, p_function_key character varying, p_credits_consumed integer',
      'p_company_id uuid, p_function_key character varying, p_credits_consumed integer, p_metadata jsonb'
    );

  if v_register_overloads <> 2 then
    raise exception
      '4C3A abortada: overloads de register_function_usage inesperados (count=%)',
      v_register_overloads;
  end if;

  -- Guard: consume já deve estar fechado a anon/auth e service-role disponível.
  if has_function_privilege(
       'anon',
       'public.funcionaria_consume_usage(uuid,text,numeric,text,text,text,jsonb)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.funcionaria_consume_usage(uuid,text,numeric,text,text,text,jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.funcionaria_consume_usage(uuid,text,numeric,text,text,text,jsonb)',
       'EXECUTE'
     ) then
    raise exception '4C3A abortada: contrato de funcionaria_consume_usage divergiu do esperado';
  end if;
end
$$;

-- A) RPCs usados somente por backend/service role.
revoke execute on function public.funcionaria_check_usage(uuid,text,numeric)
  from public, anon, authenticated;
grant execute on function public.funcionaria_check_usage(uuid,text,numeric)
  to service_role;

revoke execute on function public.expire_plans()
  from public, anon, authenticated;
grant execute on function public.expire_plans()
  to service_role;

revoke execute on function public.cobrar_creditos_videochamada()
  from public, anon, authenticated;
grant execute on function public.cobrar_creditos_videochamada()
  to service_role;

-- Trigger function: o trigger em auth.users não depende de EXECUTE concedido
-- a anon/authenticated. Removemos apenas a invocação direta via RPC.
revoke execute on function public.initialize_user_credits()
  from public, anon, authenticated;
grant execute on function public.initialize_user_credits()
  to service_role;

-- B) RPCs do painel de créditos: o browser autenticado ainda precisa deles,
-- mas anon não precisa e não deve poder consultar/alterar estado da conta.
revoke execute on function public.funcionaria_get_credit_state(uuid)
  from public, anon, authenticated;
grant execute on function public.funcionaria_get_credit_state(uuid)
  to authenticated, service_role;

revoke execute on function public.funcionaria_save_usage_settings(uuid,boolean,boolean)
  from public, anon, authenticated;
grant execute on function public.funcionaria_save_usage_settings(uuid,boolean,boolean)
  to authenticated, service_role;

commit;

with targets as (
  select
    p.oid,
    p.proname as name,
    pg_get_function_identity_arguments(p.oid) as args,
    p.prosecdef as security_definer,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'funcionaria_check_usage',
      'funcionaria_get_credit_state',
      'funcionaria_save_usage_settings',
      'funcionaria_consume_usage',
      'expire_plans',
      'cobrar_creditos_videochamada',
      'initialize_user_credits',
      'register_function_usage',
      'app_register_function_usage_secure',
      'get_is_paid_plan',
      'cobrar_credito_se_suficiente'
    )
),
trigger_state as (
  select
    tn.nspname as table_schema,
    c.relname as table_name,
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    pn.nspname as function_schema,
    p.proname as function_name,
    pg_get_triggerdef(t.oid, true) as definition
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace tn on tn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace pn on pn.oid = p.pronamespace
  where not t.tgisinternal
    and tn.nspname = 'auth'
    and c.relname = 'users'
    and t.tgname = 'on_user_created'
    and pn.nspname = 'public'
    and p.proname = 'initialize_user_credits'
)
select jsonb_pretty(
  jsonb_build_object(
    'rpc_contracts', (
      select jsonb_agg(
        jsonb_build_object(
          'name', name,
          'args', args,
          'anon', anon,
          'authenticated', authenticated,
          'service_role', service_role,
          'security_definer', security_definer
        )
        order by name, args
      )
      from targets
    ),
    'initialize_user_credits_trigger', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'table_schema', table_schema,
            'table_name', table_name,
            'trigger_name', trigger_name,
            'enabled', enabled,
            'function_schema', function_schema,
            'function_name', function_name,
            'definition', definition
          )
        ),
        '[]'::jsonb
      )
      from trigger_state
    ),
    'user_credits_contract', jsonb_build_object(
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
      )
    )
  )
) as phase4c3a_result;
