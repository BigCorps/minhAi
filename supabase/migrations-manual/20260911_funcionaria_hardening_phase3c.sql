-- ============================================================
-- minhAi / FuncionarIA — HARDENING FASE 3C
-- Data: 2026-09-11
--
-- PRÉ-REQUISITO OBRIGATÓRIO:
--   1) R3C + R3B recovery aplicada
--   2) node scripts/verify-funcionaria-r3c.mjs = PASS
--   3) npm run build = sucesso
--   4) commit/push
--   5) deployment Vercel = READY
--
-- Fecha para authenticated o segundo lote de campos sensíveis.
-- ============================================================

begin;

do $$
declare
  v_table_select boolean;
  v_existing integer;
begin
  v_table_select := has_table_privilege(
    'authenticated',
    'public.companies',
    'SELECT'
  );

  if v_table_select then
    raise exception
      'Preflight R3C falhou: authenticated ainda possui SELECT da tabela inteira. R3B precisa estar aplicada.';
  end if;

  select count(*)
    into v_existing
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'companies'
    and column_name = any(array[
      'fullscreen_password',
      'tuya_access_token',
      'tuya_refresh_token',
      'tuya_token_expires_at',
      'brasilnfe_token',
      'nfe_csc_identificador',
      'nfe_csc_codigo',
      'printnode_api_key'
    ]);

  if v_existing <> 8 then
    raise exception
      'Preflight R3C falhou: esperava 8 colunas do lote R3C e encontrei %',
      v_existing;
  end if;

  revoke select (
    fullscreen_password,
    tuya_access_token,
    tuya_refresh_token,
    tuya_token_expires_at,
    brasilnfe_token,
    nfe_csc_identificador,
    nfe_csc_codigo,
    printnode_api_key
  ) on public.companies from authenticated;

  -- Defesa adicional/idempotente para o papel anônimo.
  revoke select (
    fullscreen_password,
    tuya_access_token,
    tuya_refresh_token,
    tuya_token_expires_at,
    brasilnfe_token,
    nfe_csc_identificador,
    nfe_csc_codigo,
    printnode_api_key
  ) on public.companies from anon;
end $$;

commit;

select jsonb_build_object(
  'authenticated_table_select',
    has_table_privilege('authenticated', 'public.companies', 'SELECT'),

  'authenticated_r3c_sensitive_select',
    jsonb_build_object(
      'fullscreen_password',
        has_column_privilege('authenticated', 'public.companies', 'fullscreen_password', 'SELECT'),
      'tuya_access_token',
        has_column_privilege('authenticated', 'public.companies', 'tuya_access_token', 'SELECT'),
      'tuya_refresh_token',
        has_column_privilege('authenticated', 'public.companies', 'tuya_refresh_token', 'SELECT'),
      'tuya_token_expires_at',
        has_column_privilege('authenticated', 'public.companies', 'tuya_token_expires_at', 'SELECT'),
      'brasilnfe_token',
        has_column_privilege('authenticated', 'public.companies', 'brasilnfe_token', 'SELECT'),
      'nfe_csc_identificador',
        has_column_privilege('authenticated', 'public.companies', 'nfe_csc_identificador', 'SELECT'),
      'nfe_csc_codigo',
        has_column_privilege('authenticated', 'public.companies', 'nfe_csc_codigo', 'SELECT'),
      'printnode_api_key',
        has_column_privilege('authenticated', 'public.companies', 'printnode_api_key', 'SELECT')
    ),

  'anon_r3c_sensitive_select',
    jsonb_build_object(
      'fullscreen_password',
        has_column_privilege('anon', 'public.companies', 'fullscreen_password', 'SELECT'),
      'tuya_access_token',
        has_column_privilege('anon', 'public.companies', 'tuya_access_token', 'SELECT'),
      'tuya_refresh_token',
        has_column_privilege('anon', 'public.companies', 'tuya_refresh_token', 'SELECT'),
      'tuya_token_expires_at',
        has_column_privilege('anon', 'public.companies', 'tuya_token_expires_at', 'SELECT'),
      'brasilnfe_token',
        has_column_privilege('anon', 'public.companies', 'brasilnfe_token', 'SELECT'),
      'nfe_csc_identificador',
        has_column_privilege('anon', 'public.companies', 'nfe_csc_identificador', 'SELECT'),
      'nfe_csc_codigo',
        has_column_privilege('anon', 'public.companies', 'nfe_csc_codigo', 'SELECT'),
      'printnode_api_key',
        has_column_privilege('anon', 'public.companies', 'printnode_api_key', 'SELECT')
    ),

  'service_role_r3c_sensitive_select',
    jsonb_build_object(
      'fullscreen_password',
        has_column_privilege('service_role', 'public.companies', 'fullscreen_password', 'SELECT'),
      'tuya_access_token',
        has_column_privilege('service_role', 'public.companies', 'tuya_access_token', 'SELECT'),
      'tuya_refresh_token',
        has_column_privilege('service_role', 'public.companies', 'tuya_refresh_token', 'SELECT'),
      'tuya_token_expires_at',
        has_column_privilege('service_role', 'public.companies', 'tuya_token_expires_at', 'SELECT'),
      'brasilnfe_token',
        has_column_privilege('service_role', 'public.companies', 'brasilnfe_token', 'SELECT'),
      'nfe_csc_identificador',
        has_column_privilege('service_role', 'public.companies', 'nfe_csc_identificador', 'SELECT'),
      'nfe_csc_codigo',
        has_column_privilege('service_role', 'public.companies', 'nfe_csc_codigo', 'SELECT'),
      'printnode_api_key',
        has_column_privilege('service_role', 'public.companies', 'printnode_api_key', 'SELECT')
    ),

  'remaining_authenticated_secret_like_columns',
    coalesce((
      select jsonb_agg(c.column_name order by c.ordinal_position)
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'companies'
        and (
          c.column_name ilike '%token%'
          or c.column_name ilike '%password%'
          or c.column_name ilike '%secret%'
          or c.column_name ilike '%api_key%'
          or c.column_name ilike '%csc%'
        )
        and has_column_privilege(
          'authenticated',
          'public.companies',
          c.column_name,
          'SELECT'
        )
    ), '[]'::jsonb),

  'authenticated_safe_columns',
    jsonb_build_object(
      'id', has_column_privilege('authenticated', 'public.companies', 'id', 'SELECT'),
      'name', has_column_privilege('authenticated', 'public.companies', 'name', 'SELECT'),
      'slug', has_column_privilege('authenticated', 'public.companies', 'slug', 'SELECT'),
      'user_id', has_column_privilege('authenticated', 'public.companies', 'user_id', 'SELECT'),
      'assistant_type', has_column_privilege('authenticated', 'public.companies', 'assistant_type', 'SELECT'),
      'nfe_ativo', has_column_privilege('authenticated', 'public.companies', 'nfe_ativo', 'SELECT'),
      'nfe_plano', has_column_privilege('authenticated', 'public.companies', 'nfe_plano', 'SELECT'),
      'printnode_computer_id', has_column_privilege('authenticated', 'public.companies', 'printnode_computer_id', 'SELECT')
    )
) as phase3c_summary;
