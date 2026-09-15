-- FuncionarIA / minhAi — Fase 4F
-- Hardening de EXECUTE: public.get_is_paid_plan(...)
-- Pré-requisito: /api/qrcode já deve usar createAdminClient/service_role.
-- Seguro para reexecução. Se a função não existir, aborta a transação.

BEGIN;

DO $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      pg_get_functiondef(p.oid) AS function_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_is_paid_plan'
      AND p.prokind = 'f'
  LOOP
    v_count := v_count + 1;

    -- Falha fechada se a função depender do usuário JWT atual. Nesse caso,
    -- trocar anon -> service_role poderia mudar a semântica e exige revisão manual.
    IF r.function_def ~* '(auth\.(uid|role)\s*\(|request\.jwt|current_user|session_user)' THEN
      RAISE EXCEPTION 'get_is_paid_plan(%) depende de contexto de autenticação; hardening abortado para revisão', r.identity_args;
    END IF;

    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC',
      r.schema_name, r.function_name, r.identity_args
    );
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',
      r.schema_name, r.function_name, r.identity_args
    );
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated',
      r.schema_name, r.function_name, r.identity_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      r.schema_name, r.function_name, r.identity_args
    );
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'public.get_is_paid_plan não foi encontrada; nenhuma permissão foi alterada';
  END IF;
END $$;

-- Falha fechada: anon/auth não podem continuar herdando EXECUTE, inclusive via PUBLIC.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_is_paid_plan'
      AND p.prokind = 'f'
  LOOP
    IF has_function_privilege('anon', r.oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon ainda possui EXECUTE em get_is_paid_plan(%)', r.identity_args;
    END IF;
    IF has_function_privilege('authenticated', r.oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated ainda possui EXECUTE em get_is_paid_plan(%)', r.identity_args;
    END IF;
    IF NOT has_function_privilege('service_role', r.oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role perdeu EXECUTE em get_is_paid_plan(%)', r.identity_args;
    END IF;
  END LOOP;
END $$;

COMMIT;

SELECT jsonb_build_object(
  'functions', COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'signature', format('%I.%I(%s)', schema_name, function_name, identity_args),
        'anon_execute', anon_execute,
        'authenticated_execute', authenticated_execute,
        'service_role_execute', service_role_execute,
        'security_definer', security_definer
      ) ORDER BY identity_args
    ),
    '[]'::jsonb
  ),
  'expected', jsonb_build_object(
    'anon', 'EXECUTE false',
    'authenticated', 'EXECUTE false',
    'service_role', 'EXECUTE true',
    'consumer', '/api/qrcode server-side service_role'
  )
) AS phase4f_get_is_paid_plan_hardening_result
FROM (
  SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_args,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute,
    p.prosecdef AS security_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_is_paid_plan'
    AND p.prokind = 'f'
) s;
