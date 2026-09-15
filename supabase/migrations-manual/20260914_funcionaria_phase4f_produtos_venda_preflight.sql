-- FuncionarIA / minhAi — Fase 4F
-- PRE-FLIGHT SOMENTE LEITURA para o futuro hardening DML de public.produtos_venda.
-- NÃO altera grants, policies, triggers, funções ou dados.
-- Motivo do gate: a Edge Function live `ml-publicar-produto` não está versionada no repo
-- e precisa ser verificada antes de remover DML de anon/authenticated no banco.

WITH tbl AS (
  SELECT c.oid, c.relrowsecurity, c.relforcerowsecurity, c.reltuples
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'produtos_venda' AND c.relkind IN ('r', 'p')
),
policies AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', policyname,
    'roles', roles,
    'command', lower(cmd),
    'using', qual,
    'with_check', with_check
  ) ORDER BY policyname), '[]'::jsonb) AS value
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'produtos_venda'
),
triggers AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', t.tgname,
    'enabled', t.tgenabled,
    'function_schema', pn.nspname,
    'function_name', p.proname
  ) ORDER BY t.tgname), '[]'::jsonb) AS value
  FROM pg_trigger t
  JOIN tbl ON tbl.oid = t.tgrelid
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_namespace pn ON pn.oid = p.pronamespace
  WHERE NOT t.tgisinternal
),
functions_touching AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'name', p.proname,
    'identity_args', pg_get_function_identity_arguments(p.oid),
    'security_definer', p.prosecdef
  ) ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::jsonb) AS value
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f', 'p')
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND pg_get_functiondef(p.oid) ILIKE '%produtos_venda%'
),
grants AS (
  SELECT CASE WHEN EXISTS (SELECT 1 FROM tbl) THEN jsonb_build_object(
    'anon', jsonb_build_object(
      'select', has_table_privilege('anon', 'public.produtos_venda', 'SELECT'),
      'insert', has_table_privilege('anon', 'public.produtos_venda', 'INSERT'),
      'update', has_table_privilege('anon', 'public.produtos_venda', 'UPDATE'),
      'delete', has_table_privilege('anon', 'public.produtos_venda', 'DELETE')
    ),
    'authenticated', jsonb_build_object(
      'select', has_table_privilege('authenticated', 'public.produtos_venda', 'SELECT'),
      'insert', has_table_privilege('authenticated', 'public.produtos_venda', 'INSERT'),
      'update', has_table_privilege('authenticated', 'public.produtos_venda', 'UPDATE'),
      'delete', has_table_privilege('authenticated', 'public.produtos_venda', 'DELETE')
    ),
    'service_role', jsonb_build_object(
      'select', has_table_privilege('service_role', 'public.produtos_venda', 'SELECT'),
      'insert', has_table_privilege('service_role', 'public.produtos_venda', 'INSERT'),
      'update', has_table_privilege('service_role', 'public.produtos_venda', 'UPDATE'),
      'delete', has_table_privilege('service_role', 'public.produtos_venda', 'DELETE')
    )
  ) ELSE '{}'::jsonb END AS value
)
SELECT jsonb_build_object(
  'table_exists', EXISTS (SELECT 1 FROM tbl),
  'rls_enabled', COALESCE((SELECT relrowsecurity FROM tbl LIMIT 1), false),
  'rls_forced', COALESCE((SELECT relforcerowsecurity FROM tbl LIMIT 1), false),
  'estimated_row_count', (SELECT reltuples::bigint FROM tbl LIMIT 1),
  'grants', (SELECT value FROM grants),
  'policies', (SELECT value FROM policies),
  'triggers', (SELECT value FROM triggers),
  'database_functions_touching_table', (SELECT value FROM functions_touching),
  'external_runtime_gate', jsonb_build_object(
    'edge_function', 'ml-publicar-produto',
    'repo_source_found', false,
    'required_before_dml_revoke', 'verify live Edge Function uses service_role or migrate its write path'
  )
) AS phase4f_produtos_venda_preflight;
