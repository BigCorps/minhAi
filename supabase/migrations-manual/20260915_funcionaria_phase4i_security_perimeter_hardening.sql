-- FuncionarIA / minhAi — Fase 4I consolidada
-- Read-side + perímetro crítico. Executar SOMENTE após código 4I estar em produção.
-- Base esperada: commit 0fbdd8f7d12c005319719121f756d73bb53f2752 ou descendente contendo a 4I.

begin;

-- ---------------------------------------------------------------------------
-- 1) PEDIDOS: nenhum SELECT anônimo direto na tabela base.
--    Clientes passam por /api/orders/read; membros autenticados continuam
--    enxergando somente empresas às quais têm acesso.
-- ---------------------------------------------------------------------------
revoke select on table public.pedidos from anon;
revoke select on table public.pedido_itens from anon;

drop policy if exists anon_read_own_pedido on public.pedidos;
drop policy if exists public_select_by_company on public.pedidos;
drop policy if exists anon_select_pedido_itens on public.pedido_itens;
drop policy if exists public_select_by_pedido on public.pedido_itens;
drop policy if exists public_select_by_company on public.pedido_itens;
drop policy if exists auth_select_company_pedidos on public.pedidos;

create policy pedidos_select_company_members
on public.pedidos for select to authenticated
using (public.app_can_access_company(company_id));

create policy pedido_itens_select_company_members
on public.pedido_itens for select to authenticated
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_itens.pedido_id
      and public.app_can_access_company(p.company_id)
  )
);

-- ---------------------------------------------------------------------------
-- 2) PRODUTOS: público só recebe colunas de catálogo e somente ativos.
--    Custos, dados ML e campos internos deixam de ser selecionáveis por anon.
-- ---------------------------------------------------------------------------
revoke select on table public.produtos_venda from anon;
grant select (
  id, company_id, ingrediente_id, ficha_id, nome, descricao, categoria,
  imagem_url, ean, preco_venda, unidade, estoque_atual, estoque_minimo,
  controla_estoque, is_active, is_favorito, display_order, created_at,
  updated_at, marca
) on table public.produtos_venda to anon;

drop policy if exists public_select_by_company on public.produtos_venda;
drop policy if exists anon_read_produtos_venda on public.produtos_venda;
drop policy if exists produtos_venda_public_active on public.produtos_venda;
drop policy if exists produtos_venda_authenticated_read on public.produtos_venda;

create policy produtos_venda_public_active
on public.produtos_venda for select to anon
using (
  is_active = true
  and exists (select 1 from public.companies c where c.id = company_id and c.is_active = true)
);

create policy produtos_venda_authenticated_read
on public.produtos_venda for select to authenticated
using (
  is_active = true
  or public.app_can_access_company(company_id)
);

-- ---------------------------------------------------------------------------
-- 3) PERFIS: remove leitura pública de hash/PIN/endereço/coordenadas/metadata.
--    Anon só pode ver contato de responsável ativo; membros autenticados
--    continuam com leitura completa, mas apenas da própria empresa.
-- ---------------------------------------------------------------------------
revoke select on table public.company_profiles from anon;
grant select (id, company_id, tipo, nome, email, telefone, is_active)
  on table public.company_profiles to anon;

drop policy if exists company_profiles_public_read_active on public.company_profiles;
drop policy if exists public_read_active_profiles on public.company_profiles;
drop policy if exists public_select_by_company on public.company_profiles;
drop policy if exists company_profiles_members_read on public.company_profiles;
drop policy if exists company_profiles_public_manager_contact on public.company_profiles;

create policy company_profiles_public_manager_contact
on public.company_profiles for select to anon
using (
  is_active = true
  and tipo in ('gerente','administrador')
  and exists (select 1 from public.companies c where c.id = company_id and c.is_active = true)
);

create policy company_profiles_members_read
on public.company_profiles for select to authenticated
using (public.app_can_access_company(company_id));

-- ---------------------------------------------------------------------------
-- 4) PROFILE SESSIONS: tokens são credenciais; somente backend service_role.
-- ---------------------------------------------------------------------------
revoke all privileges on table public.profile_sessions from anon, authenticated;
grant select, insert, update, delete on table public.profile_sessions to service_role;

drop policy if exists profile_sessions_owner on public.profile_sessions;
drop policy if exists public_insert_by_company on public.profile_sessions;
drop policy if exists public_select_by_company on public.profile_sessions;
drop policy if exists profile_sessions_service_role on public.profile_sessions;

create policy profile_sessions_service_role
on public.profile_sessions for all to service_role
using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 5) ASSISTANT SESSIONS: histórico/contexto deixa de ser enumerável/tamperável.
--    Navegador usa /api/assistant/session, com acesso exato id+company.
-- ---------------------------------------------------------------------------
revoke all privileges on table public.assistant_sessions from anon, authenticated;
grant select, insert, update, delete on table public.assistant_sessions to service_role;

drop policy if exists "Public manage assistant sessions" on public.assistant_sessions;
drop policy if exists "Public update assistant sessions" on public.assistant_sessions;
drop policy if exists public_insert_by_company on public.assistant_sessions;
drop policy if exists public_select_by_company on public.assistant_sessions;
drop policy if exists public_update_by_company on public.assistant_sessions;
drop policy if exists assistant_sessions_service_role on public.assistant_sessions;

create policy assistant_sessions_service_role
on public.assistant_sessions for all to service_role
using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 6) FUNCTION SETTINGS: público só recebe colunas necessárias à experiência.
-- ---------------------------------------------------------------------------
revoke select on table public.company_function_settings from anon;
grant select (company_id, function_key, is_enabled, custom_name, custom_description, config)
  on table public.company_function_settings to anon;

drop policy if exists "Public read function settings" on public.company_function_settings;
drop policy if exists public_select_by_company on public.company_function_settings;
drop policy if exists company_function_settings_public_read on public.company_function_settings;
drop policy if exists company_function_settings_members_read on public.company_function_settings;

create policy company_function_settings_public_read
on public.company_function_settings for select to anon
using (
  exists (select 1 from public.companies c where c.id = company_id and c.is_active = true)
);

create policy company_function_settings_members_read
on public.company_function_settings for select to authenticated
using (
  public.app_can_access_company(company_id)
  or exists (select 1 from public.companies c where c.id = company_id and c.is_active = true)
);

-- ---------------------------------------------------------------------------
-- 7) FAQ: remove SELECT irrestrito e policy antiga de UPDATE anônimo.
-- ---------------------------------------------------------------------------
revoke select on table public.faq_entries from anon;
grant select (id, company_id, question, answer, variations, category, is_active, function_key, function_params)
  on table public.faq_entries to anon;
revoke update on table public.faq_entries from anon;

drop policy if exists "Public read faq entries" on public.faq_entries;
drop policy if exists "Public read faqs" on public.faq_entries;
drop policy if exists public_select_by_company on public.faq_entries;
drop policy if exists faq_entries_public_read_active on public.faq_entries;
drop policy if exists faq_entries_members_read on public.faq_entries;
drop policy if exists faq_entries_public_usage_update on public.faq_entries;

create policy faq_entries_public_read_active
on public.faq_entries for select to anon
using (
  is_active = true
  and exists (select 1 from public.companies c where c.id = company_id and c.is_active = true)
);

create policy faq_entries_members_read
on public.faq_entries for select to authenticated
using (
  public.app_can_access_company(company_id)
  or (
    is_active = true
    and exists (select 1 from public.companies c where c.id = company_id and c.is_active = true)
  )
);

-- ---------------------------------------------------------------------------
-- 8) GOOGLE ACCOUNTS: OAuth access_token/refresh_token nunca mais no browser.
--    Mantém apenas status/identidade não-secreta usados pela UI.
-- ---------------------------------------------------------------------------
revoke select on table public.google_accounts from anon, authenticated;
grant select (
  id, company_id, google_email, google_user_id, scopes, is_active,
  expires_at, last_token_refresh, created_at, updated_at,
  gbp_location_name, gbp_account_name, gbp_last_sync, place_id
) on table public.google_accounts to anon, authenticated;
revoke insert, update, delete on table public.google_accounts from anon;

drop policy if exists "Public read google accounts" on public.google_accounts;
drop policy if exists google_accounts_public_status on public.google_accounts;
drop policy if exists google_accounts_members_read on public.google_accounts;

create policy google_accounts_public_status
on public.google_accounts for select to anon
using (
  is_active = true
  and exists (select 1 from public.companies c where c.id = company_id and c.is_active = true)
);

create policy google_accounts_members_read
on public.google_accounts for select to authenticated
using (
  public.app_can_access_company(company_id)
  or (
    is_active = true
    and exists (select 1 from public.companies c where c.id = company_id and c.is_active = true)
  )
);

-- ---------------------------------------------------------------------------
-- 9) FINANCEIRO CRÍTICO: remove escrita direta do ledger/saldo pelo cliente.
--    Não muda lógica de créditos; apenas fecha superfícies de integridade óbvias.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on table public.balance_transactions from anon, authenticated;
revoke select on table public.balance_transactions from anon;
drop policy if exists "Public insert balance transactions" on public.balance_transactions;

revoke insert, update, delete on table public.user_balance from anon, authenticated;
revoke select on table public.user_balance from anon;
drop policy if exists "Users can manage own user balance" on public.user_balance;
drop policy if exists user_balance_select_own on public.user_balance;
create policy user_balance_select_own
on public.user_balance for select to authenticated
using (user_id = auth.uid());

-- Trigger functions não precisam ser executáveis via RPC.
revoke execute on function public.update_user_balance() from public, anon, authenticated;
grant execute on function public.update_user_balance() to service_role;

-- ---------------------------------------------------------------------------
-- 10) RPC SECURITY DEFINER: reduz EXECUTE ao papel realmente necessário.
-- ---------------------------------------------------------------------------
-- RPCs autenticadas: o corpo já valida auth.uid/empresa; anon não precisa EXECUTE.
revoke execute on function public.funcionaria_cancelar_checkout(text) from public, anon;
revoke execute on function public.funcionaria_confirm_cash(text) from public, anon;
revoke execute on function public.funcionaria_criar_checkout(uuid,jsonb,text,text) from public, anon;
revoke execute on function public.funcionaria_resolver_checkout(text) from public, anon;
revoke execute on function public.funcionaria_save_channel_settings(uuid,text,boolean,boolean) from public, anon;
revoke execute on function public.funcionaria_save_visual(uuid,text,text,text,text,text,text,text,text,text,text,text) from public, anon;
revoke execute on function public.funcionaria_request_terminal(uuid,integer,text,text) from public, anon;
revoke execute on function public.funcionaria_receivables(uuid,integer) from public, anon;

grant execute on function public.funcionaria_cancelar_checkout(text) to authenticated, service_role;
grant execute on function public.funcionaria_confirm_cash(text) to authenticated, service_role;
grant execute on function public.funcionaria_criar_checkout(uuid,jsonb,text,text) to authenticated, service_role;
grant execute on function public.funcionaria_resolver_checkout(text) to authenticated, service_role;
grant execute on function public.funcionaria_save_channel_settings(uuid,text,boolean,boolean) to authenticated, service_role;
grant execute on function public.funcionaria_save_visual(uuid,text,text,text,text,text,text,text,text,text,text,text) to authenticated, service_role;
grant execute on function public.funcionaria_request_terminal(uuid,integer,text,text) to authenticated, service_role;
grant execute on function public.funcionaria_receivables(uuid,integer) to authenticated, service_role;

-- Workers/mutadores internos: service_role somente.
revoke execute on function public.funcionaria_ensure_subscription(uuid) from public, anon, authenticated;
revoke execute on function public.funcionaria_expire_due_subscriptions() from public, anon, authenticated;
revoke execute on function public.initialize_company_functions(uuid) from public, anon, authenticated;
revoke execute on function public.initialize_company_profile_permissions() from public, anon, authenticated;
revoke execute on function public.initialize_company_profile_permissions(uuid) from public, anon, authenticated;
revoke execute on function public.get_user_total_balance(uuid) from public, anon, authenticated;

grant execute on function public.funcionaria_ensure_subscription(uuid) to service_role;
grant execute on function public.funcionaria_expire_due_subscriptions() to service_role;
grant execute on function public.initialize_company_functions(uuid) to service_role;
grant execute on function public.initialize_company_profile_permissions() to service_role;
grant execute on function public.initialize_company_profile_permissions(uuid) to service_role;
grant execute on function public.get_user_total_balance(uuid) to service_role;

-- Onboarding status continua disponível ao dashboard, mas somente para empresa acessível.
create or replace function public.get_company_onboarding_status(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_has_functions boolean;
  v_has_config boolean;
  v_has_google boolean;
  v_has_meta boolean;
  v_has_products boolean;
  v_has_users boolean;
  v_has_notes boolean;
begin
  if not public.app_can_access_company(p_company_id) then
    raise exception 'forbidden';
  end if;

  select exists (
    select 1 from public.company_function_settings
    where company_id = p_company_id and is_enabled = true
  ) into v_has_functions;

  select exists (
    select 1 from public.companies
    where id = p_company_id
      and (brand_description is not null or business_address is not null or business_hours is not null)
  ) into v_has_config;

  select exists (
    select 1 from public.google_accounts
    where company_id = p_company_id and is_active = true
  ) into v_has_google;

  select exists (
    select 1 from public.meta_connections where company_id = p_company_id
  ) into v_has_meta;

  select exists (
    select 1 from public.produtos_venda where company_id = p_company_id
  ) into v_has_products;

  select exists (
    select 1 from public.company_profiles where company_id = p_company_id
  ) into v_has_users;

  select exists (
    select 1 from public.notas where company_id = p_company_id
  ) into v_has_notes;

  v_result := jsonb_build_object(
    'criar_assistente', true,
    'definir_funcoes', v_has_functions,
    'configuracao', v_has_config,
    'servicos_google', v_has_google,
    'servicos_meta', v_has_meta,
    'cadastro_produtos', v_has_products,
    'cadastro_usuario', v_has_users,
    'nota', v_has_notes
  );
  return v_result;
end;
$$;

revoke execute on function public.get_company_onboarding_status(uuid) from public, anon;
grant execute on function public.get_company_onboarding_status(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Assertions. Qualquer regressão faz a transação falhar.
-- ---------------------------------------------------------------------------
do $$
begin
  if has_table_privilege('anon','public.pedidos','SELECT') then
    raise exception '4I: anon ainda tem SELECT em pedidos';
  end if;
  if has_table_privilege('anon','public.pedido_itens','SELECT') then
    raise exception '4I: anon ainda tem SELECT em pedido_itens';
  end if;
  if has_table_privilege('anon','public.profile_sessions','SELECT')
     or has_table_privilege('anon','public.profile_sessions','INSERT') then
    raise exception '4I: profile_sessions ainda exposta a anon';
  end if;
  if has_table_privilege('anon','public.assistant_sessions','SELECT')
     or has_table_privilege('anon','public.assistant_sessions','UPDATE') then
    raise exception '4I: assistant_sessions ainda exposta a anon';
  end if;
  if has_column_privilege('anon','public.company_profiles','senha_hash','SELECT')
     or has_column_privilege('anon','public.company_profiles','pin','SELECT') then
    raise exception '4I: hash/PIN de company_profiles ainda selecionável por anon';
  end if;
  if has_column_privilege('anon','public.google_accounts','access_token','SELECT')
     or has_column_privilege('authenticated','public.google_accounts','access_token','SELECT')
     or has_column_privilege('authenticated','public.google_accounts','refresh_token','SELECT') then
    raise exception '4I: tokens Google ainda selecionáveis por browser';
  end if;
  if has_table_privilege('anon','public.balance_transactions','INSERT')
     or has_table_privilege('authenticated','public.balance_transactions','INSERT') then
    raise exception '4I: balance_transactions ainda aceita INSERT browser';
  end if;
  if has_table_privilege('authenticated','public.user_balance','UPDATE')
     or has_table_privilege('authenticated','public.user_balance','INSERT') then
    raise exception '4I: user_balance ainda aceita escrita direta';
  end if;
  if has_function_privilege('anon','public.funcionaria_ensure_subscription(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.funcionaria_ensure_subscription(uuid)','EXECUTE') then
    raise exception '4I: ensure_subscription ainda aberta';
  end if;
  if has_function_privilege('anon','public.get_company_onboarding_status(uuid)','EXECUTE') then
    raise exception '4I: onboarding status ainda executável por anon';
  end if;
end $$;

commit;

-- Resultado resumido para conferência.
select jsonb_build_object(
  'phase','4I',
  'pedidos', jsonb_build_object(
    'anon_select', has_table_privilege('anon','public.pedidos','SELECT'),
    'auth_select', has_table_privilege('authenticated','public.pedidos','SELECT')
  ),
  'profile_sessions', jsonb_build_object(
    'anon_select', has_table_privilege('anon','public.profile_sessions','SELECT'),
    'auth_select', has_table_privilege('authenticated','public.profile_sessions','SELECT'),
    'service_select', has_table_privilege('service_role','public.profile_sessions','SELECT')
  ),
  'assistant_sessions', jsonb_build_object(
    'anon_select', has_table_privilege('anon','public.assistant_sessions','SELECT'),
    'anon_update', has_table_privilege('anon','public.assistant_sessions','UPDATE'),
    'service_update', has_table_privilege('service_role','public.assistant_sessions','UPDATE')
  ),
  'company_profiles', jsonb_build_object(
    'anon_hash_select', has_column_privilege('anon','public.company_profiles','senha_hash','SELECT'),
    'anon_pin_select', has_column_privilege('anon','public.company_profiles','pin','SELECT'),
    'anon_name_select', has_column_privilege('anon','public.company_profiles','nome','SELECT')
  ),
  'google_accounts', jsonb_build_object(
    'anon_access_token_select', has_column_privilege('anon','public.google_accounts','access_token','SELECT'),
    'auth_access_token_select', has_column_privilege('authenticated','public.google_accounts','access_token','SELECT'),
    'auth_google_email_select', has_column_privilege('authenticated','public.google_accounts','google_email','SELECT')
  ),
  'financial_integrity', jsonb_build_object(
    'anon_balance_tx_insert', has_table_privilege('anon','public.balance_transactions','INSERT'),
    'auth_balance_tx_insert', has_table_privilege('authenticated','public.balance_transactions','INSERT'),
    'auth_user_balance_update', has_table_privilege('authenticated','public.user_balance','UPDATE')
  ),
  'rpc', jsonb_build_object(
    'ensure_sub_anon', has_function_privilege('anon','public.funcionaria_ensure_subscription(uuid)','EXECUTE'),
    'ensure_sub_auth', has_function_privilege('authenticated','public.funcionaria_ensure_subscription(uuid)','EXECUTE'),
    'onboarding_anon', has_function_privilege('anon','public.get_company_onboarding_status(uuid)','EXECUTE'),
    'onboarding_auth', has_function_privilege('authenticated','public.get_company_onboarding_status(uuid)','EXECUTE')
  )
) as phase4i_security_perimeter_result;
