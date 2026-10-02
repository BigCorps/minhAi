-- =============================================================================
-- PixWiki V2 — Gate 5
-- Onboarding de ativação real
-- Depende dos Gates 1, 2, 3 e 4.
--
-- Objetivos:
-- - tornar o onboarding verificável pelo banco (não apenas por eventos do front);
-- - conduzir criação -> MP -> chave -> canais -> primeiro Pix real -> exploração;
-- - manter lead score determinístico e resistente a marcações arbitrárias do cliente;
-- - NÃO alterar cobrança/assinatura ativa neste gate.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Campos específicos do teste real e da versão do onboarding
-- -----------------------------------------------------------------------------
alter table public.pixwiki_v2_onboarding_state
  add column if not exists onboarding_version smallint not null default 2,
  add column if not exists first_receipt_test_started_at timestamptz,
  add column if not exists channels_configured_at timestamptz,
  add column if not exists first_receipt_id uuid references public.mp_received_payments(id) on delete set null,
  add column if not exists exploration_skipped_at timestamptz;

create index if not exists pixwiki_v2_onboarding_company_idx
  on public.pixwiki_v2_onboarding_state(company_id);

-- -----------------------------------------------------------------------------
-- 2) Score calculado pelo servidor
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_compute_lead_score(p_state public.pixwiki_v2_onboarding_state)
returns integer
language plpgsql
immutable
set search_path='public','pg_temp'
as $$
declare
  v_score integer := 0;
begin
  if p_state.account_created_at is not null then v_score := v_score + 5; end if;
  if p_state.mp_connected_at is not null then v_score := v_score + 15; end if;
  if p_state.pix_key_configured_at is not null then v_score := v_score + 10; end if;
  if p_state.first_receipt_at is not null then v_score := v_score + 20; end if;
  if p_state.push_enabled_at is not null then v_score := v_score + 5; end if;
  if p_state.email_enabled_at is not null then v_score := v_score + 5; end if;
  if p_state.whatsapp_enabled_at is not null then v_score := v_score + 10; end if;
  if p_state.link_tested_at is not null then v_score := v_score + 10; end if;
  if p_state.checkout_tested_at is not null then v_score := v_score + 15; end if;
  if p_state.api_tested_at is not null then v_score := v_score + 20; end if;
  if p_state.webhook_tested_at is not null then v_score := v_score + 20; end if;
  if coalesce(p_state.estimated_monthly_pix,0) >= 10000 then v_score := v_score + 30; end if;
  if p_state.pricing_viewed_at is not null then v_score := v_score + 5; end if;
  if p_state.interested_plan in ('link','pro','vip') then v_score := v_score + 10; end if;
  return greatest(v_score,0);
end;
$$;

revoke all on function public.pixwiki_v2_compute_lead_score(public.pixwiki_v2_onboarding_state) from public, anon, authenticated;
grant execute on function public.pixwiki_v2_compute_lead_score(public.pixwiki_v2_onboarding_state) to service_role;

create or replace function public.pixwiki_v2_onboarding_score_trigger()
returns trigger
language plpgsql
set search_path='public','pg_temp'
as $$
begin
  new.lead_score := public.pixwiki_v2_compute_lead_score(new);
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_score_trigger() from public, anon, authenticated;
grant execute on function public.pixwiki_v2_onboarding_score_trigger() to service_role;

drop trigger if exists trg_pixwiki_v2_onboarding_score on public.pixwiki_v2_onboarding_state;
create trigger trg_pixwiki_v2_onboarding_score
before insert or update on public.pixwiki_v2_onboarding_state
for each row execute function public.pixwiki_v2_onboarding_score_trigger();

-- O front deixa de escrever diretamente no estado comercial. A leitura continua
-- permitida ao próprio usuário, mas alterações passam pelas RPCs abaixo.
revoke insert,update on public.pixwiki_v2_onboarding_state from authenticated;

-- -----------------------------------------------------------------------------
-- 3) Helpers de autorização
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_assert_company_owner(p_company_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select c.user_id into v_owner
  from public.companies c
  where c.id=p_company_id
    and c.segment_key='pix_wiki'
    and c.is_active=true;

  if v_owner is null then raise exception 'company_not_found'; end if;
  if v_owner<>v_uid then raise exception 'company_not_allowed'; end if;
  return v_owner;
end;
$$;

revoke all on function public.pixwiki_v2_assert_company_owner(uuid) from public, anon;
grant execute on function public.pixwiki_v2_assert_company_owner(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4) Inicialização do funil
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_onboarding_begin(p_company_id uuid)
returns public.pixwiki_v2_onboarding_state
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.pixwiki_v2_onboarding_state;
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  insert into public.pixwiki_v2_billing_accounts(user_id,plan,status,billing_interval)
  values(v_uid,'free','active','monthly')
  on conflict(user_id) do nothing;

  insert into public.pixwiki_v2_onboarding_state(
    user_id,company_id,account_created_at,last_step,onboarding_version
  ) values(
    v_uid,p_company_id,now(),'account_created',2
  )
  on conflict(user_id) do update set
    company_id=excluded.company_id,
    account_created_at=coalesce(public.pixwiki_v2_onboarding_state.account_created_at,excluded.account_created_at),
    onboarding_version=2,
    last_step=case
      when public.pixwiki_v2_onboarding_state.completed_at is null
        then coalesce(public.pixwiki_v2_onboarding_state.last_step,'account_created')
      else public.pixwiki_v2_onboarding_state.last_step
    end,
    updated_at=now();

  -- Novas contas começam com Push habilitado como preferência, mas e-mail e
  -- WhatsApp só são ligados quando o usuário escolhe no onboarding.
  insert into public.pixwiki_notification_settings(
    company_id,user_id,email_enabled,push_enabled,whatsapp_enabled,updated_at
  ) values(p_company_id,v_uid,false,true,false,now())
  on conflict(company_id) do nothing;

  select * into v_state
  from public.pixwiki_v2_onboarding_state
  where user_id=v_uid;

  return v_state;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_begin(uuid) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_begin(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 5) Snapshot seguro do onboarding
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_onboarding_get(p_company_id uuid)
returns table(
  company_id uuid,
  company_name text,
  company_slug text,
  mp_connected boolean,
  pix_key text,
  pix_key_type text,
  notification_email text,
  notification_phone text,
  email_enabled boolean,
  push_enabled boolean,
  whatsapp_enabled boolean,
  push_device_count integer,
  account_created_at timestamptz,
  mp_connected_at timestamptz,
  pix_key_configured_at timestamptz,
  push_enabled_at timestamptz,
  email_enabled_at timestamptz,
  whatsapp_enabled_at timestamptz,
  channels_configured_at timestamptz,
  first_receipt_test_started_at timestamptz,
  first_receipt_at timestamptz,
  first_receipt_id uuid,
  link_tested_at timestamptz,
  checkout_tested_at timestamptz,
  api_tested_at timestamptz,
  webhook_tested_at timestamptz,
  pricing_viewed_at timestamptz,
  estimated_monthly_pix integer,
  estimated_ticket_cents integer,
  current_fee_type text,
  current_fee_value numeric,
  estimated_current_cost_cents bigint,
  estimated_pixwiki_cost_cents bigint,
  estimated_savings_cents bigint,
  interested_plan text,
  last_step text,
  lead_score integer,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  return query
  select
    c.id,
    c.name::text,
    c.slug::text,
    exists(
      select 1 from public.pixwiki_mp_connections mc
      where mc.company_id=c.id and mc.user_id=v_uid and mc.is_active=true
    ),
    ps.pix_key::text,
    ps.pix_key_type::text,
    ns.notification_email::text,
    ns.notification_phone::text,
    coalesce(ns.email_enabled,false),
    coalesce(ns.push_enabled,true),
    coalesce(ns.whatsapp_enabled,false),
    (
      select count(*)::integer
      from public.pixwiki_push_subscriptions p
      where p.company_id=c.id and p.is_active=true
    ),
    s.account_created_at,
    s.mp_connected_at,
    s.pix_key_configured_at,
    s.push_enabled_at,
    s.email_enabled_at,
    s.whatsapp_enabled_at,
    s.channels_configured_at,
    s.first_receipt_test_started_at,
    s.first_receipt_at,
    s.first_receipt_id,
    s.link_tested_at,
    s.checkout_tested_at,
    s.api_tested_at,
    s.webhook_tested_at,
    s.pricing_viewed_at,
    s.estimated_monthly_pix,
    s.estimated_ticket_cents,
    s.current_fee_type,
    s.current_fee_value,
    s.estimated_current_cost_cents,
    s.estimated_pixwiki_cost_cents,
    s.estimated_savings_cents,
    s.interested_plan,
    s.last_step,
    s.lead_score,
    s.completed_at
  from public.companies c
  join public.pixwiki_v2_onboarding_state s on s.user_id=v_uid and s.company_id=c.id
  left join public.pixwiki_payment_settings ps on ps.company_id=c.id
  left join public.pixwiki_notification_settings ns on ns.company_id=c.id
  where c.id=p_company_id;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_get(uuid) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_get(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) Marcação validada da conexão Mercado Pago
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_onboarding_mark_mp_connected(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  if not exists(
    select 1 from public.pixwiki_mp_connections mc
    where mc.company_id=p_company_id and mc.user_id=v_uid and mc.is_active=true
  ) then
    return false;
  end if;

  update public.pixwiki_v2_onboarding_state
  set mp_connected_at=coalesce(mp_connected_at,now()),last_step='mp_connected'
  where user_id=v_uid and company_id=p_company_id;

  return true;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_mark_mp_connected(uuid) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_mark_mp_connected(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 7) Chave Pix + canais escolhidos
-- -----------------------------------------------------------------------------

-- Salva somente a chave Pix. Os canais são escolhidos na etapa seguinte.
create or replace function public.pixwiki_v2_onboarding_save_pix_key(
  p_company_id uuid,
  p_pix_key text,
  p_pix_key_type text
)
returns boolean
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := trim(coalesce(p_pix_key,''));
  v_type text := lower(trim(coalesce(p_pix_key_type,'')));
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);
  if length(v_key)<5 then raise exception 'invalid_pix_key'; end if;
  if v_type not in ('cpf','cnpj','email','phone','random') then raise exception 'invalid_pix_key_type'; end if;

  insert into public.pixwiki_payment_settings(company_id,user_id,pix_key,pix_key_type,updated_at)
  values(p_company_id,v_uid,v_key,v_type,now())
  on conflict(company_id) do update set
    user_id=excluded.user_id,pix_key=excluded.pix_key,pix_key_type=excluded.pix_key_type,updated_at=now();

  insert into public.user_profiles(user_id,withdrawal_pix_key,withdrawal_pix_key_type)
  values(v_uid,v_key,v_type)
  on conflict(user_id) do update set
    withdrawal_pix_key=excluded.withdrawal_pix_key,
    withdrawal_pix_key_type=excluded.withdrawal_pix_key_type;

  update public.pixwiki_v2_onboarding_state
  set pix_key_configured_at=coalesce(pix_key_configured_at,now()),last_step='pix_key_configured'
  where user_id=v_uid and company_id=p_company_id;

  return true;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_save_pix_key(uuid,text,text) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_save_pix_key(uuid,text,text) to authenticated;

create or replace function public.pixwiki_v2_onboarding_save_setup(
  p_company_id uuid,
  p_pix_key text,
  p_pix_key_type text,
  p_email_enabled boolean,
  p_notification_email text,
  p_push_enabled boolean,
  p_whatsapp_enabled boolean,
  p_notification_phone text
)
returns boolean
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := trim(coalesce(p_pix_key,''));
  v_type text := lower(trim(coalesce(p_pix_key_type,'')));
  v_email text := nullif(lower(trim(coalesce(p_notification_email,''))), '');
  v_phone text := nullif(regexp_replace(coalesce(p_notification_phone,''),'[^0-9]','','g'),'');
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  if length(v_key)<5 then raise exception 'invalid_pix_key'; end if;
  if v_type not in ('cpf','cnpj','email','phone','random') then raise exception 'invalid_pix_key_type'; end if;
  if coalesce(p_email_enabled,false) and (v_email is null or position('@' in v_email)=0) then
    raise exception 'invalid_notification_email';
  end if;
  if coalesce(p_whatsapp_enabled,false) and (v_phone is null or length(v_phone)<10 or length(v_phone)>15) then
    raise exception 'invalid_notification_phone';
  end if;

  insert into public.pixwiki_payment_settings(
    company_id,user_id,pix_key,pix_key_type,updated_at
  ) values(
    p_company_id,v_uid,v_key,v_type,now()
  )
  on conflict(company_id) do update set
    user_id=excluded.user_id,
    pix_key=excluded.pix_key,
    pix_key_type=excluded.pix_key_type,
    updated_at=now();

  -- Espelho legado enquanto outras áreas ainda consultam user_profiles.
  insert into public.user_profiles(user_id,withdrawal_pix_key,withdrawal_pix_key_type)
  values(v_uid,v_key,v_type)
  on conflict(user_id) do update set
    withdrawal_pix_key=excluded.withdrawal_pix_key,
    withdrawal_pix_key_type=excluded.withdrawal_pix_key_type;

  insert into public.pixwiki_notification_settings(
    company_id,user_id,notification_email,notification_phone,
    email_enabled,push_enabled,whatsapp_enabled,updated_at
  ) values(
    p_company_id,v_uid,v_email,v_phone,
    coalesce(p_email_enabled,false),coalesce(p_push_enabled,false),coalesce(p_whatsapp_enabled,false),now()
  )
  on conflict(company_id) do update set
    user_id=excluded.user_id,
    notification_email=excluded.notification_email,
    notification_phone=excluded.notification_phone,
    email_enabled=excluded.email_enabled,
    push_enabled=excluded.push_enabled,
    whatsapp_enabled=excluded.whatsapp_enabled,
    updated_at=now();

  update public.companies
  set email_contato=coalesce(v_email,email_contato),
      whatsapp_number=coalesce(v_phone,whatsapp_number),
      updated_at=now()
  where id=p_company_id and user_id=v_uid;

  update public.pixwiki_v2_onboarding_state
  set pix_key_configured_at=coalesce(pix_key_configured_at,now()),
      email_enabled_at=case when coalesce(p_email_enabled,false) then coalesce(email_enabled_at,now()) else null end,
      whatsapp_enabled_at=case when coalesce(p_whatsapp_enabled,false) then coalesce(whatsapp_enabled_at,now()) else null end,
      channels_configured_at=coalesce(channels_configured_at,now()),
      last_step='channels_configured'
  where user_id=v_uid and company_id=p_company_id;

  return true;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_save_setup(uuid,text,text,boolean,text,boolean,boolean,text) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_save_setup(uuid,text,text,boolean,text,boolean,boolean,text) to authenticated;

-- Push só conta como ativado se houver assinatura real registrada no dispositivo.
create or replace function public.pixwiki_v2_onboarding_mark_push(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  if not exists(
    select 1 from public.pixwiki_push_subscriptions p
    where p.company_id=p_company_id and p.user_id=v_uid and p.is_active=true
  ) then return false; end if;

  update public.pixwiki_v2_onboarding_state
  set push_enabled_at=coalesce(push_enabled_at,now()),last_step='push_enabled'
  where user_id=v_uid and company_id=p_company_id;
  return true;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_mark_push(uuid) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_mark_push(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 8) Primeiro Pix real
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_onboarding_start_receipt_test(p_company_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  if not exists(
    select 1 from public.pixwiki_mp_connections mc
    where mc.company_id=p_company_id and mc.user_id=v_uid and mc.is_active=true
  ) then raise exception 'mp_connection_required'; end if;

  if not exists(
    select 1 from public.pixwiki_payment_settings ps
    where ps.company_id=p_company_id and ps.user_id=v_uid and nullif(trim(ps.pix_key),'') is not null
  ) then raise exception 'pix_key_required'; end if;

  update public.pixwiki_v2_onboarding_state
  set first_receipt_test_started_at=v_now,
      first_receipt_at=null,
      first_receipt_id=null,
      last_step='waiting_first_receipt'
  where user_id=v_uid and company_id=p_company_id;

  return v_now;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_start_receipt_test(uuid) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_start_receipt_test(uuid) to authenticated;

create or replace function public.pixwiki_v2_onboarding_detect_first_receipt(p_company_id uuid)
returns table(
  detected boolean,
  receipt_id uuid,
  amount_cents integer,
  source text,
  received_at timestamptz
)
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_started timestamptz;
  v_receipt public.mp_received_payments;
  v_received timestamptz;
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  select s.first_receipt_test_started_at into v_started
  from public.pixwiki_v2_onboarding_state s
  where s.user_id=v_uid and s.company_id=p_company_id;

  if v_started is null then
    return query select false,null::uuid,null::integer,null::text,null::timestamptz;
    return;
  end if;

  select r.* into v_receipt
  from public.mp_received_payments r
  where r.company_id=p_company_id
    and r.user_id=v_uid
    and r.status='approved'
    and coalesce(r.date_approved,r.date_created,r.created_at) >= v_started - interval '10 seconds'
  order by coalesce(r.date_approved,r.date_created,r.created_at) asc
  limit 1;

  if not found then
    return query select false,null::uuid,null::integer,null::text,null::timestamptz;
    return;
  end if;

  v_received := coalesce(v_receipt.date_approved,v_receipt.date_created,v_receipt.created_at);

  update public.pixwiki_v2_onboarding_state
  set first_receipt_at=coalesce(first_receipt_at,v_received),
      first_receipt_id=coalesce(first_receipt_id,v_receipt.id),
      last_step='first_receipt_detected'
  where user_id=v_uid and company_id=p_company_id;

  return query select true,v_receipt.id,v_receipt.amount_cents,v_receipt.source::text,v_received;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_detect_first_receipt(uuid) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_detect_first_receipt(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 9) Exploração opcional: valida os testes realmente criados
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_onboarding_mark_test(
  p_company_id uuid,
  p_kind text
)
returns boolean
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text := lower(trim(coalesce(p_kind,'')));
  v_exists boolean := false;
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  if v_kind='link' then
    select exists(
      select 1 from public.pixwiki_v2_checkout_sessions s
      where s.company_id=p_company_id and s.created_by_user_id=v_uid
        and s.origin='pix_link' and s.is_test=true
    ) into v_exists;
    if v_exists then
      update public.pixwiki_v2_onboarding_state set link_tested_at=coalesce(link_tested_at,now()),last_step='link_tested'
      where user_id=v_uid and company_id=p_company_id;
    end if;
  elsif v_kind='checkout' then
    select exists(
      select 1 from public.pixwiki_v2_checkout_sessions s
      where s.company_id=p_company_id and s.created_by_user_id=v_uid
        and s.origin='checkout' and s.is_test=true
    ) into v_exists;
    if v_exists then
      update public.pixwiki_v2_onboarding_state set checkout_tested_at=coalesce(checkout_tested_at,now()),last_step='checkout_tested'
      where user_id=v_uid and company_id=p_company_id;
    end if;
  elsif v_kind='api' then
    select exists(
      select 1 from public.pixwiki_v2_checkout_sessions s
      where s.company_id=p_company_id and s.origin='api' and s.is_test=true
    ) into v_exists;
    if v_exists then
      update public.pixwiki_v2_onboarding_state set api_tested_at=coalesce(api_tested_at,now()),last_step='api_tested'
      where user_id=v_uid and company_id=p_company_id;
    end if;
  else
    raise exception 'invalid_test_kind';
  end if;

  return v_exists;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_mark_test(uuid,text) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_mark_test(uuid,text) to authenticated;

-- -----------------------------------------------------------------------------
-- 10) Calculadora / interesse comercial
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_onboarding_save_estimate(
  p_company_id uuid,
  p_monthly_pix integer,
  p_ticket_cents integer,
  p_fee_type text,
  p_fee_value numeric,
  p_current_cost_cents bigint,
  p_pixwiki_cost_cents bigint,
  p_savings_cents bigint,
  p_interested_plan text default null
)
returns boolean
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_fee_type text := lower(trim(coalesce(p_fee_type,'unknown')));
  v_plan text := nullif(lower(trim(coalesce(p_interested_plan,''))),'');
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  if p_monthly_pix is null or p_monthly_pix<0 or p_monthly_pix>100000000 then raise exception 'invalid_monthly_pix'; end if;
  if p_ticket_cents is null or p_ticket_cents<0 or p_ticket_cents>1000000000 then raise exception 'invalid_ticket'; end if;
  if v_fee_type not in ('percent','fixed','free','unknown') then raise exception 'invalid_fee_type'; end if;
  if v_plan is not null and v_plan not in ('free','link','pro','vip') then raise exception 'invalid_plan'; end if;

  update public.pixwiki_v2_onboarding_state
  set estimated_monthly_pix=p_monthly_pix,
      estimated_ticket_cents=p_ticket_cents,
      current_fee_type=v_fee_type,
      current_fee_value=p_fee_value,
      estimated_current_cost_cents=greatest(coalesce(p_current_cost_cents,0),0),
      estimated_pixwiki_cost_cents=greatest(coalesce(p_pixwiki_cost_cents,0),0),
      estimated_savings_cents=coalesce(p_savings_cents,0),
      interested_plan=v_plan,
      pricing_viewed_at=coalesce(pricing_viewed_at,now()),
      last_step='pricing_viewed'
  where user_id=v_uid and company_id=p_company_id;

  return true;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_save_estimate(uuid,integer,integer,text,numeric,bigint,bigint,bigint,text) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_save_estimate(uuid,integer,integer,text,numeric,bigint,bigint,bigint,text) to authenticated;

-- -----------------------------------------------------------------------------
-- 11) Conclusão / pular exploração
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_onboarding_finish(
  p_company_id uuid,
  p_skip_exploration boolean default false
)
returns boolean
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.pixwiki_v2_onboarding_state;
begin
  perform public.pixwiki_v2_assert_company_owner(p_company_id);

  select * into v_state from public.pixwiki_v2_onboarding_state
  where user_id=v_uid and company_id=p_company_id;

  if v_state.first_receipt_at is null then raise exception 'first_receipt_required'; end if;

  update public.pixwiki_v2_onboarding_state
  set completed_at=coalesce(completed_at,now()),
      exploration_skipped_at=case when coalesce(p_skip_exploration,false) then coalesce(exploration_skipped_at,now()) else exploration_skipped_at end,
      last_step='completed'
  where user_id=v_uid and company_id=p_company_id;

  return true;
end;
$$;

revoke all on function public.pixwiki_v2_onboarding_finish(uuid,boolean) from public, anon;
grant execute on function public.pixwiki_v2_onboarding_finish(uuid,boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
