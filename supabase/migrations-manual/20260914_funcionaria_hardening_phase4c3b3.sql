-- minhAi / FuncionarIA — Hardening Fase 4C3B3
--
-- Etapa final da migração de register_function_usage.
--
-- PRÉ-REQUISITOS:
--   1) código 4C3B2 publicado em produção;
--   2) zero chamadas runtime diretas aos wrappers legados;
--   3) endpoints register-public e register-authenticated validados em produção.
--
-- Esta migration:
--   - revoga EXECUTE de PUBLIC/anon/authenticated nos dois overloads legados;
--   - preserva EXECUTE apenas para service_role;
--   - não altera definição, preços, catálogo, dados ou entitlements;
--   - não altera app_register_function_usage_secure.

begin;

do $$
declare
  v3 regprocedure;
  v4 regprocedure;
  v_core regprocedure;
begin
  v3 := to_regprocedure(
    'public.register_function_usage(uuid,character varying,integer)'
  );
  v4 := to_regprocedure(
    'public.register_function_usage(uuid,character varying,integer,jsonb)'
  );
  v_core := to_regprocedure(
    'public.app_register_function_usage_secure(uuid,text,integer,jsonb)'
  );

  if v3 is null then
    raise exception '4C3B3 abortada: overload register_function_usage/3 ausente';
  end if;

  if v4 is null then
    raise exception '4C3B3 abortada: overload register_function_usage/4 ausente';
  end if;

  if v_core is null then
    raise exception '4C3B3 abortada: app_register_function_usage_secure ausente';
  end if;

  -- Estado esperado antes do corte: wrappers ainda públicos por compatibilidade.
  if not has_function_privilege('anon', v3, 'EXECUTE')
     or not has_function_privilege('authenticated', v3, 'EXECUTE')
     or not has_function_privilege('service_role', v3, 'EXECUTE') then
    raise exception '4C3B3 abortada: grants inesperados em register_function_usage/3';
  end if;

  if not has_function_privilege('anon', v4, 'EXECUTE')
     or not has_function_privilege('authenticated', v4, 'EXECUTE')
     or not has_function_privilege('service_role', v4, 'EXECUTE') then
    raise exception '4C3B3 abortada: grants inesperados em register_function_usage/4';
  end if;

  -- O núcleo seguro já deve estar fechado ao browser.
  if has_function_privilege('anon', v_core, 'EXECUTE')
     or has_function_privilege('authenticated', v_core, 'EXECUTE')
     or not has_function_privilege('service_role', v_core, 'EXECUTE') then
    raise exception '4C3B3 abortada: contrato do núcleo seguro divergiu do esperado';
  end if;
end
$$;

revoke execute on function
  public.register_function_usage(uuid, character varying, integer)
from public, anon, authenticated;

grant execute on function
  public.register_function_usage(uuid, character varying, integer)
to service_role;

revoke execute on function
  public.register_function_usage(uuid, character varying, integer, jsonb)
from public, anon, authenticated;

grant execute on function
  public.register_function_usage(uuid, character varying, integer, jsonb)
to service_role;

commit;

with contracts as (
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
      'register_function_usage',
      'app_register_function_usage_secure'
    )
)
select jsonb_pretty(
  jsonb_build_object(
    'register_usage_contracts', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', name,
            'args', args,
            'security_definer', security_definer,
            'anon', anon,
            'authenticated', authenticated,
            'service_role', service_role
          )
          order by name, args
        ),
        '[]'::jsonb
      )
      from contracts
    ),
    'expected', jsonb_build_object(
      'register_function_usage_3',
        'anon=false authenticated=false service_role=true',
      'register_function_usage_4',
        'anon=false authenticated=false service_role=true',
      'app_register_function_usage_secure',
        'anon=false authenticated=false service_role=true'
    )
  )
) as phase4c3b3_result;
