-- ============================================================
-- minhAi / FuncionarIA — HARDENING FASE 3B
-- Data: 2026-09-11
--
-- Pré-requisito:
--   frontend R3B publicado e Vercel READY.
--
-- Objetivo:
--   remover o SELECT global de public.companies do papel
--   authenticated e conceder somente colunas que NÃO pertencem
--   ao primeiro lote sensível já migrado na R3A.
--
-- IMPORTANTE:
--   Nesta fase deliberadamente NÃO bloqueamos ainda para
--   authenticated os segredos Brasil NFE / PrintNode / Tuya.
--   As telas privadas legadas desses módulos serão migradas na
--   fase seguinte, sem quebrar Fiscal e Impressão.
-- ============================================================

begin;

do $$
declare
  v_columns text;
  v_existing integer;
begin
  select count(*)
    into v_existing
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'companies'
    and column_name = any(array[
      'mp_access_token',
      'mp_terminal_id',
      'receiving_pix_key',
      'receiving_pix_key_type',
      'wifi_network_password'
    ]);

  if v_existing <> 5 then
    raise exception 'Preflight R3B falhou: esperava 5 colunas sensíveis e encontrei %', v_existing;
  end if;

  -- O grant de tabela inteira é a causa do bypass observado na R3A.
  revoke select on table public.companies from authenticated;

  -- Limpa grants de coluna prévios para o primeiro lote sensível.
  revoke select (
    mp_access_token,
    mp_terminal_id,
    receiving_pix_key,
    receiving_pix_key_type,
    wifi_network_password
  ) on public.companies from authenticated;

  -- Reconstitui o acesso de leitura do authenticated em nível de coluna,
  -- preservando TODAS as colunas atuais exceto as cinco acima.
  select string_agg(format('%I', column_name), ', ' order by ordinal_position)
    into v_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'companies'
    and column_name <> all(array[
      'mp_access_token',
      'mp_terminal_id',
      'receiving_pix_key',
      'receiving_pix_key_type',
      'wifi_network_password'
    ]);

  if coalesce(v_columns, '') = '' then
    raise exception 'Preflight R3B falhou: lista de colunas seguras vazia';
  end if;

  execute format(
    'grant select (%s) on table public.companies to authenticated',
    v_columns
  );
end $$;

commit;

-- ============================================================
-- RESULTADO ÚNICO PARA CONFERÊNCIA
-- ============================================================

select jsonb_build_object(
  'authenticated_table_select',
    has_table_privilege('authenticated', 'public.companies', 'SELECT'),

  'authenticated_r3b_sensitive_select',
    jsonb_build_object(
      'mp_access_token',
        has_column_privilege('authenticated', 'public.companies', 'mp_access_token', 'SELECT'),
      'mp_terminal_id',
        has_column_privilege('authenticated', 'public.companies', 'mp_terminal_id', 'SELECT'),
      'receiving_pix_key',
        has_column_privilege('authenticated', 'public.companies', 'receiving_pix_key', 'SELECT'),
      'receiving_pix_key_type',
        has_column_privilege('authenticated', 'public.companies', 'receiving_pix_key_type', 'SELECT'),
      'wifi_network_password',
        has_column_privilege('authenticated', 'public.companies', 'wifi_network_password', 'SELECT')
    ),

  'authenticated_safe_columns',
    jsonb_build_object(
      'id', has_column_privilege('authenticated', 'public.companies', 'id', 'SELECT'),
      'name', has_column_privilege('authenticated', 'public.companies', 'name', 'SELECT'),
      'slug', has_column_privilege('authenticated', 'public.companies', 'slug', 'SELECT'),
      'user_id', has_column_privilege('authenticated', 'public.companies', 'user_id', 'SELECT'),
      'assistant_type', has_column_privilege('authenticated', 'public.companies', 'assistant_type', 'SELECT')
    ),

  'authenticated_r3b_sensitive_update',
    jsonb_build_object(
      'mp_access_token',
        has_column_privilege('authenticated', 'public.companies', 'mp_access_token', 'UPDATE'),
      'mp_terminal_id',
        has_column_privilege('authenticated', 'public.companies', 'mp_terminal_id', 'UPDATE'),
      'receiving_pix_key',
        has_column_privilege('authenticated', 'public.companies', 'receiving_pix_key', 'UPDATE'),
      'receiving_pix_key_type',
        has_column_privilege('authenticated', 'public.companies', 'receiving_pix_key_type', 'UPDATE'),
      'wifi_network_password',
        has_column_privilege('authenticated', 'public.companies', 'wifi_network_password', 'UPDATE')
    ),

  'service_role_sensitive_select',
    jsonb_build_object(
      'mp_access_token',
        has_column_privilege('service_role', 'public.companies', 'mp_access_token', 'SELECT'),
      'receiving_pix_key',
        has_column_privilege('service_role', 'public.companies', 'receiving_pix_key', 'SELECT'),
      'wifi_network_password',
        has_column_privilege('service_role', 'public.companies', 'wifi_network_password', 'SELECT')
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

  'companies_select_policies',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'policyname', policyname,
          'roles', roles,
          'cmd', cmd,
          'qual', qual
        )
        order by policyname
      )
      from pg_policies
      where schemaname = 'public'
        and tablename = 'companies'
        and cmd = 'SELECT'
    ), '[]'::jsonb)
) as phase3b_summary;
