-- =============================================================================
-- PixWiki V2 — Gate 1
-- Fundação, segurança, papéis e medição de uso
--
-- OBJETIVO
-- - Criar a infraestrutura V2 em paralelo à PixWiki atual.
-- - NÃO trocar ainda o catálogo/assinaturas legadas em produção.
-- - NÃO liberar Checkout/API V2 ainda.
-- - NÃO alterar o fluxo financeiro atual.
--
-- Compatível com reaplicação (idempotente sempre que possível).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Catálogo V2 isolado do catálogo legado
-- -----------------------------------------------------------------------------
create table if not exists public.pixwiki_v2_plan_catalog (
  plan text primary key,
  name text not null,
  rank smallint not null unique,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  annual_price_cents integer check (annual_price_cents is null or annual_price_cents >= 0),
  included_automations integer not null check (included_automations >= 0),
  overage_price_cents integer not null check (overage_price_cents >= 0),
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pixwiki_v2_plan_catalog_plan_check
    check (plan in ('free','link','pro','vip'))
);

insert into public.pixwiki_v2_plan_catalog (
  plan,name,rank,monthly_price_cents,annual_price_cents,
  included_automations,overage_price_cents,features,is_active,updated_at
) values
  ('free','PIX GRÁTIS',1,0,null,100,79,
   '{"dashboard":true,"push":true,"email":true,"whatsapp":true,"pix_link":true,"checkout":true,"api":true,"webhooks":true,"reports":true,"team":true}'::jsonb,true,now()),
  ('link','PIX LINK',2,49000,490000,1000,49,
   '{"dashboard":true,"push":true,"email":true,"whatsapp":true,"pix_link":true,"checkout":true,"api":true,"webhooks":true,"reports":true,"team":true}'::jsonb,true,now()),
  ('pro','PIX PRO',3,290000,2900000,10000,29,
   '{"dashboard":true,"push":true,"email":true,"whatsapp":true,"pix_link":true,"checkout":true,"api":true,"webhooks":true,"reports":true,"team":true}'::jsonb,true,now()),
  ('vip','PIX VIP',4,1900000,19000000,100000,19,
   '{"dashboard":true,"push":true,"email":true,"whatsapp":true,"pix_link":true,"checkout":true,"api":true,"webhooks":true,"reports":true,"team":true}'::jsonb,true,now())
on conflict (plan) do update set
  name=excluded.name,
  rank=excluded.rank,
  monthly_price_cents=excluded.monthly_price_cents,
  annual_price_cents=excluded.annual_price_cents,
  included_automations=excluded.included_automations,
  overage_price_cents=excluded.overage_price_cents,
  features=excluded.features,
  is_active=excluded.is_active,
  updated_at=now();

alter table public.pixwiki_v2_plan_catalog enable row level security;

drop policy if exists pixwiki_v2_plan_catalog_public_read on public.pixwiki_v2_plan_catalog;
create policy pixwiki_v2_plan_catalog_public_read
  on public.pixwiki_v2_plan_catalog
  for select
  to anon, authenticated
  using (is_active is true);

grant select on public.pixwiki_v2_plan_catalog to anon, authenticated;
grant all on public.pixwiki_v2_plan_catalog to service_role;

-- -----------------------------------------------------------------------------
-- 2) Conta de billing V2 (ainda não substitui pixwiki_subscriptions)
-- -----------------------------------------------------------------------------
create table if not exists public.pixwiki_v2_billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' references public.pixwiki_v2_plan_catalog(plan),
  billing_interval text not null default 'monthly',
  status text not null default 'active',
  allow_overage boolean not null default false,
  spending_limit_cents integer check (spending_limit_cents is null or spending_limit_cents >= 0),
  complimentary boolean not null default false,
  current_period_start date,
  current_period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pixwiki_v2_billing_interval_check check (billing_interval in ('monthly','annual')),
  constraint pixwiki_v2_billing_status_check check (status in ('active','grace','paused','cancelled'))
);

alter table public.pixwiki_v2_billing_accounts enable row level security;

drop policy if exists pixwiki_v2_billing_accounts_read_own on public.pixwiki_v2_billing_accounts;
create policy pixwiki_v2_billing_accounts_read_own
  on public.pixwiki_v2_billing_accounts
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.pixwiki_v2_billing_accounts to authenticated;
grant all on public.pixwiki_v2_billing_accounts to service_role;

-- -----------------------------------------------------------------------------
-- 3) Períodos e ledger idempotente de uso
-- -----------------------------------------------------------------------------
create table if not exists public.pixwiki_v2_usage_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  used_units integer not null default 0 check (used_units >= 0),
  convenience_credit_cents integer not null default 0 check (convenience_credit_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,period_start),
  constraint pixwiki_v2_usage_period_range_check check (period_end > period_start)
);

create index if not exists pixwiki_v2_usage_periods_user_time_idx
  on public.pixwiki_v2_usage_periods(user_id,period_start desc);

alter table public.pixwiki_v2_usage_periods enable row level security;

drop policy if exists pixwiki_v2_usage_periods_read_own on public.pixwiki_v2_usage_periods;
create policy pixwiki_v2_usage_periods_read_own
  on public.pixwiki_v2_usage_periods
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.pixwiki_v2_usage_periods to authenticated;
grant all on public.pixwiki_v2_usage_periods to service_role;

create table if not exists public.pixwiki_v2_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  receipt_id uuid references public.mp_received_payments(id) on delete set null,
  origin text not null,
  event_type text not null default 'automation',
  units integer not null default 1 check (units > 0 and units <= 100000),
  convenience_credit_cents integer not null default 0 check (convenience_credit_cents between 0 and 10),
  is_test boolean not null default false,
  idempotency_key text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(idempotency_key),
  constraint pixwiki_v2_usage_origin_check check (origin in ('pix_key','pix_link','checkout','api')),
  constraint pixwiki_v2_usage_event_type_check check (event_type in ('automation'))
);

create index if not exists pixwiki_v2_usage_events_user_time_idx
  on public.pixwiki_v2_usage_events(user_id,occurred_at desc);
create index if not exists pixwiki_v2_usage_events_company_time_idx
  on public.pixwiki_v2_usage_events(company_id,occurred_at desc)
  where company_id is not null;
create index if not exists pixwiki_v2_usage_events_receipt_idx
  on public.pixwiki_v2_usage_events(receipt_id)
  where receipt_id is not null;

alter table public.pixwiki_v2_usage_events enable row level security;

drop policy if exists pixwiki_v2_usage_events_read_own on public.pixwiki_v2_usage_events;
create policy pixwiki_v2_usage_events_read_own
  on public.pixwiki_v2_usage_events
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.pixwiki_v2_usage_events to authenticated;
grant all on public.pixwiki_v2_usage_events to service_role;

-- Registra uso somente quando a automação realmente aconteceu.
-- O chamador futuro (Gate 2+) fornece uma idempotency_key estável.
create or replace function public.pixwiki_v2_record_usage(
  p_user_id uuid,
  p_company_id uuid,
  p_receipt_id uuid,
  p_origin text,
  p_idempotency_key text,
  p_units integer default 1,
  p_convenience_credit_cents integer default 0,
  p_is_test boolean default false,
  p_occurred_at timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns table(
  inserted boolean,
  usage_event_id uuid,
  period_start date,
  used_units integer,
  convenience_credit_cents integer
)
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_event_id uuid;
  v_period_start date;
  v_period_end date;
  v_units integer := greatest(1,least(coalesce(p_units,1),100000));
  v_credit integer := greatest(0,least(coalesce(p_convenience_credit_cents,0),10));
  v_period public.pixwiki_v2_usage_periods;
begin
  if p_user_id is null or coalesce(trim(p_idempotency_key),'')='' then
    raise exception 'invalid_usage_event';
  end if;
  if p_origin not in ('pix_key','pix_link','checkout','api') then
    raise exception 'invalid_usage_origin';
  end if;

  v_period_start := date_trunc('month', coalesce(p_occurred_at,now()) at time zone 'America/Sao_Paulo')::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  insert into public.pixwiki_v2_usage_events(
    user_id,company_id,receipt_id,origin,event_type,units,
    convenience_credit_cents,is_test,idempotency_key,occurred_at,metadata
  ) values (
    p_user_id,p_company_id,p_receipt_id,p_origin,'automation',v_units,
    v_credit,coalesce(p_is_test,false),trim(p_idempotency_key),coalesce(p_occurred_at,now()),coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select e.id into v_event_id
      from public.pixwiki_v2_usage_events e
     where e.idempotency_key=trim(p_idempotency_key);

    select p.* into v_period
      from public.pixwiki_v2_usage_periods p
     where p.user_id=p_user_id and p.period_start=v_period_start;

    return query select false,v_event_id,v_period_start,
      coalesce(v_period.used_units,0),coalesce(v_period.convenience_credit_cents,0);
    return;
  end if;

  -- Testes do onboarding/API não consomem franquia nem geram crédito.
  if coalesce(p_is_test,false) is false then
    insert into public.pixwiki_v2_usage_periods(
      user_id,period_start,period_end,used_units,convenience_credit_cents,updated_at
    ) values (
      p_user_id,v_period_start,v_period_end,v_units,v_credit,now()
    )
    on conflict (user_id,period_start) do update set
      used_units=public.pixwiki_v2_usage_periods.used_units + excluded.used_units,
      convenience_credit_cents=public.pixwiki_v2_usage_periods.convenience_credit_cents + excluded.convenience_credit_cents,
      period_end=excluded.period_end,
      updated_at=now();
  else
    insert into public.pixwiki_v2_usage_periods(user_id,period_start,period_end)
    values(p_user_id,v_period_start,v_period_end)
    on conflict(user_id,period_start) do nothing;
  end if;

  select p.* into v_period
    from public.pixwiki_v2_usage_periods p
   where p.user_id=p_user_id and p.period_start=v_period_start;

  return query select true,v_event_id,v_period_start,
    coalesce(v_period.used_units,0),coalesce(v_period.convenience_credit_cents,0);
end;
$$;

revoke all on function public.pixwiki_v2_record_usage(uuid,uuid,uuid,text,text,integer,integer,boolean,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.pixwiki_v2_record_usage(uuid,uuid,uuid,text,text,integer,integer,boolean,timestamptz,jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- 4) Cotação da faixa mensal mais econômica (somente cálculo; não cobra nada)
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_quote_monthly_usage(p_units integer)
returns table(
  plan text,
  plan_name text,
  included_automations integer,
  base_price_cents integer,
  overage_units integer,
  overage_price_cents integer,
  total_price_cents bigint,
  is_best_price boolean
)
language sql
stable
security invoker
set search_path='public','pg_temp'
as $$
  with q as (
    select
      c.plan,
      c.name as plan_name,
      c.included_automations,
      c.monthly_price_cents as base_price_cents,
      greatest(coalesce(p_units,0)-c.included_automations,0) as overage_units,
      c.overage_price_cents,
      (
        c.monthly_price_cents::bigint
        + greatest(coalesce(p_units,0)-c.included_automations,0)::bigint*c.overage_price_cents::bigint
      ) as total_price_cents,
      c.rank
    from public.pixwiki_v2_plan_catalog c
    where c.is_active is true
  ), ranked as (
    select q.*, min(total_price_cents) over () as best_total
    from q
  )
  select plan,plan_name,included_automations,base_price_cents,overage_units,
         overage_price_cents,total_price_cents,(total_price_cents=best_total)
  from ranked
  order by rank;
$$;

grant execute on function public.pixwiki_v2_quote_monthly_usage(integer) to anon, authenticated;

-- Resumo seguro do próprio usuário para a futura barra de uso.
create or replace function public.pixwiki_v2_my_usage_summary()
returns table(
  plan text,
  billing_interval text,
  status text,
  allow_overage boolean,
  spending_limit_cents integer,
  complimentary boolean,
  period_start date,
  period_end date,
  used_units integer,
  included_automations integer,
  overage_units integer,
  overage_price_cents integer,
  convenience_credit_cents integer
)
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_start date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  return query
  with account as (
    select
      coalesce(b.plan,'free') as plan,
      coalesce(b.billing_interval,'monthly') as billing_interval,
      coalesce(b.status,'active') as status,
      coalesce(b.allow_overage,false) as allow_overage,
      b.spending_limit_cents,
      coalesce(b.complimentary,false) as complimentary
    from (select 1) x
    left join public.pixwiki_v2_billing_accounts b on b.user_id=v_uid
  )
  select
    a.plan,a.billing_interval,a.status,a.allow_overage,a.spending_limit_cents,a.complimentary,
    v_start,
    (v_start+interval '1 month')::date,
    coalesce(u.used_units,0),
    c.included_automations,
    greatest(coalesce(u.used_units,0)-c.included_automations,0),
    c.overage_price_cents,
    coalesce(u.convenience_credit_cents,0)
  from account a
  join public.pixwiki_v2_plan_catalog c on c.plan=a.plan
  left join public.pixwiki_v2_usage_periods u on u.user_id=v_uid and u.period_start=v_start;
end;
$$;

revoke all on function public.pixwiki_v2_my_usage_summary() from public, anon;
grant execute on function public.pixwiki_v2_my_usage_summary() to authenticated;

-- -----------------------------------------------------------------------------
-- 5) Estado de onboarding/funil (estrutura; UI vem em gate posterior)
-- -----------------------------------------------------------------------------
create table if not exists public.pixwiki_v2_onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  account_created_at timestamptz,
  mp_connected_at timestamptz,
  pix_key_configured_at timestamptz,
  push_enabled_at timestamptz,
  email_enabled_at timestamptz,
  whatsapp_enabled_at timestamptz,
  first_receipt_at timestamptz,
  link_tested_at timestamptz,
  checkout_tested_at timestamptz,
  api_tested_at timestamptz,
  webhook_tested_at timestamptz,
  pricing_viewed_at timestamptz,
  estimated_monthly_pix integer check (estimated_monthly_pix is null or estimated_monthly_pix >= 0),
  estimated_ticket_cents integer check (estimated_ticket_cents is null or estimated_ticket_cents >= 0),
  current_fee_type text check (current_fee_type is null or current_fee_type in ('percent','fixed','free','unknown')),
  current_fee_value numeric(12,4),
  estimated_current_cost_cents bigint,
  estimated_pixwiki_cost_cents bigint,
  estimated_savings_cents bigint,
  interested_plan text check (interested_plan is null or interested_plan in ('free','link','pro','vip')),
  last_step text,
  lead_score integer not null default 0 check (lead_score >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pixwiki_v2_onboarding_state enable row level security;

drop policy if exists pixwiki_v2_onboarding_state_select_own on public.pixwiki_v2_onboarding_state;
create policy pixwiki_v2_onboarding_state_select_own
  on public.pixwiki_v2_onboarding_state for select to authenticated
  using (user_id=auth.uid());

drop policy if exists pixwiki_v2_onboarding_state_insert_own on public.pixwiki_v2_onboarding_state;
create policy pixwiki_v2_onboarding_state_insert_own
  on public.pixwiki_v2_onboarding_state for insert to authenticated
  with check (user_id=auth.uid());

drop policy if exists pixwiki_v2_onboarding_state_update_own on public.pixwiki_v2_onboarding_state;
create policy pixwiki_v2_onboarding_state_update_own
  on public.pixwiki_v2_onboarding_state for update to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());

grant select,insert,update on public.pixwiki_v2_onboarding_state to authenticated;
grant all on public.pixwiki_v2_onboarding_state to service_role;

-- -----------------------------------------------------------------------------
-- 6) Papéis: adiciona cashier sem quebrar owner/manager/viewer atuais
-- -----------------------------------------------------------------------------
alter table public.company_admins drop constraint if exists company_admins_role_check;
alter table public.company_admins add constraint company_admins_role_check
  check (role in ('owner','manager','viewer','cashier'));

-- Resolve o papel do usuário atual sem expor dados da empresa.
create or replace function public.pixwiki_company_access_role(p_company_id uuid)
returns text
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null or p_company_id is null then return null; end if;

  if exists(
    select 1 from public.companies c
    where c.id=p_company_id and c.user_id=v_uid and c.segment_key='pix_wiki'
  ) then
    return 'owner';
  end if;

  select ca.role into v_role
    from public.company_admins ca
    join public.companies c on c.id=ca.company_id
   where ca.company_id=p_company_id
     and ca.user_id=v_uid
     and c.segment_key='pix_wiki'
   limit 1;

  return v_role;
end;
$$;

revoke all on function public.pixwiki_company_access_role(uuid) from public, anon;
grant execute on function public.pixwiki_company_access_role(uuid) to authenticated;

-- RPC mínimo para a futura tela Caixa.
-- Deliberadamente NÃO retorna ID Mercado Pago, metadata, payer, chave ou tokens.
create or replace function public.pixwiki_cashier_recent_receipts(
  p_company_id uuid,
  p_since timestamptz default (now()-interval '1 hour'),
  p_limit integer default 100
)
returns table(
  receipt_id uuid,
  amount_cents integer,
  source text,
  received_at timestamptz
)
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_role text;
  v_limit integer := greatest(1,least(coalesce(p_limit,100),500));
begin
  v_role := public.pixwiki_company_access_role(p_company_id);
  if v_role is null or v_role not in ('owner','manager','cashier') then
    raise exception 'company_not_allowed';
  end if;

  return query
  select r.id,r.amount_cents,r.source,
         coalesce(r.date_approved,r.date_created,r.created_at)
    from public.mp_received_payments r
   where r.company_id=p_company_id
     and r.status='approved'
     and coalesce(r.date_approved,r.date_created,r.created_at) >= coalesce(p_since,now()-interval '1 hour')
   order by coalesce(r.date_approved,r.date_created,r.created_at) desc
   limit v_limit;
end;
$$;

revoke all on function public.pixwiki_cashier_recent_receipts(uuid,timestamptz,integer) from public, anon;
grant execute on function public.pixwiki_cashier_recent_receipts(uuid,timestamptz,integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 7) Push por empresa para owner/manager/cashier
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_register_push_subscription(
  p_company_id uuid,
  p_subscription_id text,
  p_onesignal_id text default null,
  p_user_agent text default null
)
returns boolean
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_subscription_id is null or length(trim(p_subscription_id)) < 8 then
    raise exception 'invalid_subscription_id';
  end if;

  v_role := public.pixwiki_company_access_role(p_company_id);
  if v_role is null or v_role not in ('owner','manager','cashier') then
    raise exception 'company_not_found';
  end if;

  insert into public.pixwiki_push_subscriptions(
    user_id,company_id,subscription_id,onesignal_id,is_active,user_agent,last_seen_at,updated_at
  ) values(
    v_uid,p_company_id,trim(p_subscription_id),nullif(trim(coalesce(p_onesignal_id,'')),''),
    true,nullif(p_user_agent,''),now(),now()
  )
  on conflict(subscription_id) do update set
    user_id=excluded.user_id,
    company_id=excluded.company_id,
    onesignal_id=excluded.onesignal_id,
    is_active=true,
    user_agent=excluded.user_agent,
    last_seen_at=now(),
    updated_at=now();

  return true;
end;
$$;

revoke all on function public.pixwiki_register_push_subscription(uuid,text,text,text) from public, anon;
grant execute on function public.pixwiki_register_push_subscription(uuid,text,text,text) to authenticated;

-- -----------------------------------------------------------------------------
-- 8) RLS: gestores podem consultar recebimentos; cashier usa somente RPC mínimo
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view own MP received payments" on public.mp_received_payments;
drop policy if exists pixwiki_received_payments_owner_manager_select on public.mp_received_payments;
create policy pixwiki_received_payments_owner_manager_select
  on public.mp_received_payments
  for select
  to authenticated
  using (
    exists(
      select 1 from public.companies c
      where c.id=mp_received_payments.company_id
        and c.segment_key='pix_wiki'
        and (
          c.user_id=auth.uid()
          or exists(
            select 1 from public.company_admins ca
            where ca.company_id=c.id
              and ca.user_id=auth.uid()
              and ca.role in ('owner','manager')
          )
        )
    )
  );

-- A view pixwiki_receipts ainda é usada por caminhos legados e por Edge Functions
-- com service_role. A migração para security_invoker será feita junto da substituição
-- da API/relatórios, evitando uma janela de incompatibilidade entre gates.

-- -----------------------------------------------------------------------------
-- 9) Hardening de RPCs exclusivamente internos
-- Não mexe em RPCs públicos necessários ao Pix Link atual.
-- -----------------------------------------------------------------------------
revoke all on function public.pix_direct_reserve_intent(uuid,uuid,text,text,integer,text,text,text,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.pix_direct_reserve_intent(uuid,uuid,text,text,integer,text,text,text,text,integer,jsonb) to service_role;

revoke all on function public.pix_direct_claim_provider_payment(uuid,text,timestamptz,uuid,boolean) from public, anon, authenticated;
grant execute on function public.pix_direct_claim_provider_payment(uuid,text,timestamptz,uuid,boolean) to service_role;

revoke all on function public.pix_direct_match_receipt(uuid) from public, anon, authenticated;
grant execute on function public.pix_direct_match_receipt(uuid) to service_role;

revoke all on function public.pixwiki_claim_receipt_notification(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.pixwiki_claim_receipt_notification(uuid,text,integer) to service_role;

revoke all on function public.pixwiki_release_receipt_notification_claim(uuid,text) from public, anon, authenticated;
grant execute on function public.pixwiki_release_receipt_notification_claim(uuid,text) to service_role;

revoke all on function public.pixwiki_api_summary_internal(uuid,uuid,text,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.pixwiki_api_summary_internal(uuid,uuid,text,timestamptz,timestamptz) to service_role;

revoke all on function public.pixwiki_fast_watch_acquire(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.pixwiki_fast_watch_acquire(uuid,uuid,integer) to service_role;

commit;

notify pgrst, 'reload schema';
