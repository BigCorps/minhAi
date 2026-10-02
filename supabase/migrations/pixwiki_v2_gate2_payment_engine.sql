-- =============================================================================
-- PixWiki V2 — Gate 2
-- Motor universal de Pix Link / Checkout / API + fila dos 11 slots
--
-- PRÉ-REQUISITO
-- - Aplicar primeiro: pixwiki_v2_gate1_foundation.sql
--
-- OBJETIVO
-- - Criar uma entidade única de Checkout para Pix Link, Checkout e API.
-- - Não reservar valor ao abrir o carrinho; o slot só é reservado no "Pagar com Pix".
-- - Quando os 11 valores (exato até -R$0,10) estiverem ocupados, manter fila justa.
-- - QR temporário: 120 s por padrão; sessão de Checkout pode durar bem mais.
-- - Registrar 1 automação apenas após pagamento realmente confirmado.
-- - Manter o Pix Link legado desligado deste motor até o Gate 3.
--
-- IMPORTANTE
-- - Este gate NÃO substitui a landing/onboarding/dashboard.
-- - Este gate NÃO altera pixwiki_plan_catalog / pixwiki_subscriptions legados.
-- - Este gate NÃO ativa o novo Pix Link público; a flag nasce false.
-- =============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Configuração de runtime V2
-- ----------------------------------------------------------------------------
create table if not exists public.pixwiki_v2_runtime_config (
  id boolean primary key default true check (id is true),
  pix_link_v2_enabled boolean not null default false,
  checkout_api_enabled boolean not null default true,
  checkout_owner_enabled boolean not null default true,
  checkout_public_prepare_enabled boolean not null default true,
  slot_ttl_seconds integer not null default 120 check (slot_ttl_seconds between 60 and 600),
  queue_max_wait_seconds integer not null default 300 check (queue_max_wait_seconds between 30 and 1800),
  default_session_ttl_seconds integer not null default 86400 check (default_session_ttl_seconds between 300 and 604800),
  updated_at timestamptz not null default now()
);

insert into public.pixwiki_v2_runtime_config(id)
values(true)
on conflict(id) do nothing;

alter table public.pixwiki_v2_runtime_config enable row level security;
revoke all on public.pixwiki_v2_runtime_config from public, anon, authenticated;
grant all on public.pixwiki_v2_runtime_config to service_role;

-- ----------------------------------------------------------------------------
-- 2) Sessão canônica de pagamento
-- ----------------------------------------------------------------------------
create table if not exists public.pixwiki_v2_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  origin text not null,
  status text not null default 'created',

  amount_cents integer not null check (amount_cents > 0),
  expected_amount_cents integer check (expected_amount_cents is null or expected_amount_cents > 0),
  discount_cents smallint not null default 0 check (discount_cents between 0 and 10),
  convenience_credit_cents smallint not null default 0 check (convenience_credit_cents between 0 and 10),

  description text,
  external_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  metadata jsonb not null default '{}'::jsonb,
  success_url text,

  api_key_id uuid references public.pixwiki_api_keys(id) on delete set null,
  api_idempotency_key text,
  is_test boolean not null default false,

  queue_scope text,
  queue_started_at timestamptz,
  slot_acquired_at timestamptz,
  payment_expires_at timestamptz,

  direct_intent_id uuid references public.pix_direct_intents(id) on delete set null,
  transaction_id uuid references public.pix_transactions(id) on delete set null,
  receipt_id uuid references public.mp_received_payments(id) on delete set null,
  provider_payment_id text,
  pix_txid text,
  last_reconcile_at timestamptz,
  reconcile_attempts integer not null default 0 check (reconcile_attempts >= 0),

  paid_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pixwiki_v2_checkout_origin_check
    check (origin in ('pix_link','checkout','api')),
  constraint pixwiki_v2_checkout_status_check
    check (status in (
      'created','queued','slot_reserved','payment_ready','paid',
      'cancelled','expired','failed'
    )),
  constraint pixwiki_v2_checkout_public_token_check
    check (public_token ~ '^chk_[A-Za-z0-9_-]{24,100}$'),
  constraint pixwiki_v2_checkout_description_check
    check (description is null or char_length(description) <= 255),
  constraint pixwiki_v2_checkout_external_id_check
    check (external_id is null or char_length(external_id) <= 200),
  constraint pixwiki_v2_checkout_idempotency_check
    check (api_idempotency_key is null or char_length(api_idempotency_key) between 8 and 200),
  constraint pixwiki_v2_checkout_expiry_check
    check (expires_at > created_at - interval '5 seconds')
);

create unique index if not exists pixwiki_v2_checkout_api_idempotency_uidx
  on public.pixwiki_v2_checkout_sessions(user_id,api_idempotency_key)
  where api_idempotency_key is not null;

create index if not exists pixwiki_v2_checkout_company_created_idx
  on public.pixwiki_v2_checkout_sessions(company_id,created_at desc);

create index if not exists pixwiki_v2_checkout_user_created_idx
  on public.pixwiki_v2_checkout_sessions(user_id,created_at desc);

create index if not exists pixwiki_v2_checkout_queue_idx
  on public.pixwiki_v2_checkout_sessions(queue_scope,amount_cents,queue_started_at,id)
  where status='queued';

create index if not exists pixwiki_v2_checkout_direct_intent_idx
  on public.pixwiki_v2_checkout_sessions(direct_intent_id)
  where direct_intent_id is not null;

create index if not exists pixwiki_v2_checkout_provider_payment_idx
  on public.pixwiki_v2_checkout_sessions(provider_payment_id)
  where provider_payment_id is not null;

-- Impede que retries paralelos do motor criem duas transações para o mesmo intent V2.
create unique index if not exists pixwiki_v2_transaction_direct_intent_uidx
  on public.pix_transactions(direct_intent_id)
  where direct_intent_id is not null
    and origem in ('pixwiki_v2_pix_link','pixwiki_v2_checkout','pixwiki_v2_api');

alter table public.pixwiki_v2_checkout_sessions enable row level security;

-- Proprietário e manager podem ver sessões da empresa. Cashier deliberadamente não.
drop policy if exists pixwiki_v2_checkout_sessions_select_managers on public.pixwiki_v2_checkout_sessions;
create policy pixwiki_v2_checkout_sessions_select_managers
  on public.pixwiki_v2_checkout_sessions
  for select
  to authenticated
  using (
    exists(
      select 1
      from public.companies c
      where c.id=pixwiki_v2_checkout_sessions.company_id
        and c.segment_key='pix_wiki'
        and (
          c.user_id=(select auth.uid())
          or exists(
            select 1
            from public.company_admins ca
            where ca.company_id=c.id
              and ca.user_id=(select auth.uid())
              and ca.role in ('owner','manager')
          )
        )
    )
  );

-- Escrita é apenas pelo backend V2 / service_role.
grant select on public.pixwiki_v2_checkout_sessions to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.pixwiki_v2_checkout_sessions from anon, authenticated;
grant all on public.pixwiki_v2_checkout_sessions to service_role;

-- ----------------------------------------------------------------------------
-- 3) Regra de disponibilidade de automação
-- ----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_automation_allowance(p_user_id uuid)
returns table(
  allowed boolean,
  reason text,
  plan text,
  used_units integer,
  included_automations integer,
  remaining_included integer,
  allow_overage boolean,
  spending_limit_cents integer,
  estimated_overage_cents bigint
)
language plpgsql
stable
security definer
set search_path='public','pg_temp'
as $$
declare
  v_plan text := 'free';
  v_status text := 'active';
  v_overage boolean := false;
  v_limit integer;
  v_complimentary boolean := false;
  v_used integer := 0;
  v_included integer := 100;
  v_overage_price integer := 79;
  v_overage_units integer := 0;
  v_estimated bigint := 0;
  v_start date := date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_user_id is null then
    return query select false,'invalid_user',null::text,0,0,0,false,null::integer,0::bigint;
    return;
  end if;

  select
    coalesce(b.plan,'free'),
    coalesce(b.status,'active'),
    coalesce(b.allow_overage,false),
    b.spending_limit_cents,
    coalesce(b.complimentary,false)
  into v_plan,v_status,v_overage,v_limit,v_complimentary
  from (select 1) x
  left join public.pixwiki_v2_billing_accounts b on b.user_id=p_user_id;

  select c.included_automations,c.overage_price_cents
    into v_included,v_overage_price
  from public.pixwiki_v2_plan_catalog c
  where c.plan=v_plan and c.is_active=true;

  if v_included is null then
    v_plan := 'free';
    select c.included_automations,c.overage_price_cents
      into v_included,v_overage_price
    from public.pixwiki_v2_plan_catalog c where c.plan='free';
  end if;

  select coalesce(u.used_units,0)
    into v_used
  from public.pixwiki_v2_usage_periods u
  where u.user_id=p_user_id and u.period_start=v_start;
  v_used := coalesce(v_used,0);

  v_overage_units := greatest((v_used + 1)-v_included,0);
  v_estimated := v_overage_units::bigint * coalesce(v_overage_price,0)::bigint;

  if v_complimentary then
    return query select true,'complimentary',v_plan,v_used,v_included,
      greatest(v_included-v_used,0),true,v_limit,v_estimated;
    return;
  end if;

  if v_status in ('paused','cancelled') then
    return query select false,'billing_inactive',v_plan,v_used,v_included,
      greatest(v_included-v_used,0),v_overage,v_limit,v_estimated;
    return;
  end if;

  if v_used < v_included then
    return query select true,'included',v_plan,v_used,v_included,
      greatest(v_included-v_used,0),v_overage,v_limit,v_estimated;
    return;
  end if;

  if not v_overage then
    return query select false,'quota_exhausted',v_plan,v_used,v_included,0,false,v_limit,v_estimated;
    return;
  end if;

  if v_limit is not null and v_estimated > v_limit then
    return query select false,'spending_limit_reached',v_plan,v_used,v_included,0,true,v_limit,v_estimated;
    return;
  end if;

  return query select true,'overage',v_plan,v_used,v_included,0,true,v_limit,v_estimated;
end;
$$;

revoke all on function public.pixwiki_v2_automation_allowance(uuid) from public, anon, authenticated;
grant execute on function public.pixwiki_v2_automation_allowance(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 4) Fila: entrar sem reservar slot
-- ----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_enqueue_checkout(p_checkout_id uuid)
returns table(
  checkout_id uuid,
  state text,
  queue_position integer,
  queue_scope text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_session public.pixwiki_v2_checkout_sessions;
  v_connection_id uuid;
  v_mp_user_id text;
  v_scope text;
  v_position integer;
begin
  select * into v_session
  from public.pixwiki_v2_checkout_sessions
  where id=p_checkout_id
  for update;

  if not found then raise exception 'checkout_not_found'; end if;

  if v_session.status in ('paid','cancelled','expired','failed') then
    return query select v_session.id,v_session.status,0,v_session.queue_scope,v_session.expires_at;
    return;
  end if;

  if v_session.expires_at <= now() then
    update public.pixwiki_v2_checkout_sessions
      set status='expired',updated_at=now()
    where id=v_session.id;
    return query select v_session.id,'expired',0,v_session.queue_scope,v_session.expires_at;
    return;
  end if;

  if v_session.status in ('slot_reserved','payment_ready') then
    return query select v_session.id,v_session.status,0,v_session.queue_scope,v_session.expires_at;
    return;
  end if;

  select ps.mp_connection_id,pc.mp_user_id
    into v_connection_id,v_mp_user_id
  from public.pixwiki_payment_settings ps
  join public.pixwiki_mp_connections pc on pc.id=ps.mp_connection_id
  where ps.company_id=v_session.company_id
    and ps.user_id=v_session.user_id
    and pc.company_id=v_session.company_id
    and pc.user_id=v_session.user_id
    and pc.is_active=true
  limit 1;

  if v_connection_id is null then raise exception 'mp_connection_required'; end if;

  if coalesce(trim(v_mp_user_id),'')<>'' then
    v_scope := 'mpuser:'||trim(v_mp_user_id);
  else
    v_scope := 'pixwiki:'||v_connection_id::text;
  end if;

  if v_session.queue_started_at is null or v_session.status='created' then
    update public.pixwiki_v2_checkout_sessions
      set status='queued',
          queue_scope=v_scope,
          queue_started_at=coalesce(queue_started_at,now()),
          updated_at=now()
    where id=v_session.id
    returning * into v_session;
  elsif v_session.queue_scope is distinct from v_scope then
    -- Conta MP trocada antes do QR: reinicia a fila no escopo correto.
    update public.pixwiki_v2_checkout_sessions
      set status='queued',queue_scope=v_scope,queue_started_at=now(),updated_at=now()
    where id=v_session.id
    returning * into v_session;
  end if;

  select 1 + count(*)::integer into v_position
  from public.pixwiki_v2_checkout_sessions q
  where q.queue_scope=v_session.queue_scope
    and q.amount_cents=v_session.amount_cents
    and q.status='queued'
    and q.expires_at>now()
    and (q.queue_started_at,q.id) < (v_session.queue_started_at,v_session.id);

  return query select v_session.id,'queued',coalesce(v_position,1),v_session.queue_scope,v_session.expires_at;
end;
$$;

revoke all on function public.pixwiki_v2_enqueue_checkout(uuid) from public, anon, authenticated;
grant execute on function public.pixwiki_v2_enqueue_checkout(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 5) Fila: adquirir um dos 11 slots apenas quando for a vez do Checkout
-- ----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_acquire_checkout_slot(p_checkout_id uuid)
returns table(
  checkout_id uuid,
  state text,
  queue_position integer,
  direct_intent_id uuid,
  txid text,
  original_amount_cents integer,
  expected_amount_cents integer,
  discount_cents smallint,
  pix_key text,
  pix_key_type text,
  merchant_name text,
  merchant_city text,
  payment_expires_at timestamptz
)
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_session public.pixwiki_v2_checkout_sessions;
  v_intent public.pix_direct_intents;
  v_position integer;
  v_slot_ttl integer := 120;
  v_pix_key text;
  v_pix_key_type text;
  v_company_name text;
  v_city text := 'SAO PAULO';
  v_txid text;
  v_lock_key text;
begin
  perform public.pixwiki_v2_enqueue_checkout(p_checkout_id);

  select * into v_session
  from public.pixwiki_v2_checkout_sessions
  where id=p_checkout_id
  for update;

  if not found then raise exception 'checkout_not_found'; end if;

  if v_session.status='paid' then
    return query select v_session.id,'paid',0,v_session.direct_intent_id,v_session.pix_txid,
      v_session.amount_cents,v_session.expected_amount_cents,v_session.discount_cents,
      null::text,null::text,null::text,null::text,v_session.payment_expires_at;
    return;
  end if;

  if v_session.status in ('cancelled','expired','failed') then
    return query select v_session.id,v_session.status,0,v_session.direct_intent_id,v_session.pix_txid,
      v_session.amount_cents,v_session.expected_amount_cents,v_session.discount_cents,
      null::text,null::text,null::text,null::text,v_session.payment_expires_at;
    return;
  end if;

  -- Reaproveita uma reserva ainda válida após retry da Edge Function.
  if v_session.direct_intent_id is not null then
    select * into v_intent
      from public.pix_direct_intents i
     where i.id=v_session.direct_intent_id;

    if found and v_intent.status='confirmed' then
      return query select v_session.id,'paid',0,v_intent.id,v_intent.txid,
        v_session.amount_cents,v_intent.expected_amount_cents,v_intent.discount_cents,
        null::text,null::text,null::text,null::text,v_intent.expires_at;
      return;
    end if;

    if found and v_intent.status='pending' and v_intent.expires_at>now() then
      select ps.pix_key,ps.pix_key_type,c.name,
             coalesce(nullif(pp.merchant_city,''),'SAO PAULO')
        into v_pix_key,v_pix_key_type,v_company_name,v_city
      from public.pixwiki_payment_settings ps
      join public.companies c on c.id=ps.company_id
      left join public.pix_payment_preferences pp
        on pp.company_id=ps.company_id and pp.product='pixwiki'
      where ps.company_id=v_session.company_id and ps.user_id=v_session.user_id
      limit 1;

      return query select v_session.id,v_session.status,0,v_intent.id,v_intent.txid,
        v_session.amount_cents,v_intent.expected_amount_cents,v_intent.discount_cents,
        v_pix_key,v_pix_key_type,v_company_name,v_city,v_intent.expires_at;
      return;
    end if;

    -- Reserva antiga terminou sem pagamento. Expira os objetos antigos antes
    -- de recolocar o Checkout no final da fila, evitando transação pendente órfã.
    if found and v_intent.status='pending' and v_intent.expires_at<=now() then
      update public.pix_direct_intents
        set status='expired',updated_at=now()
      where id=v_intent.id and status='pending';
    end if;

    if v_session.transaction_id is not null then
      update public.pix_transactions
        set status='expired',updated_at=now()
      where id=v_session.transaction_id and status='pending';
    end if;

    update public.pixwiki_v2_checkout_sessions
      set status='queued',direct_intent_id=null,transaction_id=null,
          expected_amount_cents=null,discount_cents=0,convenience_credit_cents=0,
          pix_txid=null,slot_acquired_at=null,payment_expires_at=null,
          queue_started_at=now(),updated_at=now()
    where id=v_session.id
    returning * into v_session;
  end if;

  if v_session.status<>'queued' then
    raise exception 'checkout_not_queued';
  end if;

  -- Serializa apenas quem disputa o MESMO valor na MESMA conta MP.
  v_lock_key := coalesce(v_session.queue_scope,'')||':'||v_session.amount_cents::text;
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key,0));

  update public.pixwiki_v2_checkout_sessions
     set status='expired',updated_at=now()
   where status='queued' and expires_at<=now();

  select 1 + count(*)::integer into v_position
  from public.pixwiki_v2_checkout_sessions q
  where q.queue_scope=v_session.queue_scope
    and q.amount_cents=v_session.amount_cents
    and q.status='queued'
    and q.expires_at>now()
    and (q.queue_started_at,q.id) < (v_session.queue_started_at,v_session.id);

  if coalesce(v_position,1)>1 then
    return query select v_session.id,'queued',v_position,null::uuid,null::text,
      v_session.amount_cents,null::integer,0::smallint,
      null::text,null::text,null::text,null::text,null::timestamptz;
    return;
  end if;

  select r.slot_ttl_seconds into v_slot_ttl
  from public.pixwiki_v2_runtime_config r where r.id=true;
  v_slot_ttl := greatest(60,least(coalesce(v_slot_ttl,120),600));

  select ps.pix_key,ps.pix_key_type,c.name,
         coalesce(nullif(pp.merchant_city,''),'SAO PAULO')
    into v_pix_key,v_pix_key_type,v_company_name,v_city
  from public.pixwiki_payment_settings ps
  join public.companies c on c.id=ps.company_id
  left join public.pix_payment_preferences pp
    on pp.company_id=ps.company_id and pp.product='pixwiki'
  where ps.company_id=v_session.company_id
    and ps.user_id=v_session.user_id
  limit 1;

  if coalesce(trim(v_pix_key),'')='' then raise exception 'pix_key_required'; end if;

  v_txid := 'PW'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));

  begin
    select * into v_intent
    from public.pix_direct_reserve_intent(
      v_session.company_id,
      v_session.user_id,
      'pixwiki',
      v_session.id::text,
      v_session.amount_cents,
      v_session.queue_scope,
      v_pix_key,
      v_pix_key_type,
      v_txid,
      v_slot_ttl,
      jsonb_build_object(
        'source','pixwiki_v2',
        'v2_checkout_id',v_session.id,
        'origin',v_session.origin,
        'external_id',v_session.external_id
      )
    );
  exception when others then
    if sqlerrm like '%pix_direct_slots_unavailable%' then
      return query select v_session.id,'queued',1,null::uuid,null::text,
        v_session.amount_cents,null::integer,0::smallint,
        null::text,null::text,null::text,null::text,null::timestamptz;
      return;
    end if;
    raise;
  end;

  update public.pixwiki_v2_checkout_sessions
    set status='slot_reserved',
        direct_intent_id=v_intent.id,
        pix_txid=v_intent.txid,
        expected_amount_cents=v_intent.expected_amount_cents,
        discount_cents=v_intent.discount_cents,
        convenience_credit_cents=v_intent.discount_cents,
        slot_acquired_at=now(),
        payment_expires_at=v_intent.expires_at,
        updated_at=now()
  where id=v_session.id;

  return query select v_session.id,'slot_reserved',0,v_intent.id,v_intent.txid,
    v_session.amount_cents,v_intent.expected_amount_cents,v_intent.discount_cents,
    v_pix_key,v_pix_key_type,v_company_name,v_city,v_intent.expires_at;
end;
$$;

revoke all on function public.pixwiki_v2_acquire_checkout_slot(uuid) from public, anon, authenticated;
grant execute on function public.pixwiki_v2_acquire_checkout_slot(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 6) Throttle atômico da reconciliação pública
-- ----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_checkout_reconcile_acquire(
  p_checkout_id uuid,
  p_min_interval_ms integer default 1800
)
returns boolean
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_min integer := greatest(500,least(coalesce(p_min_interval_ms,1800),10000));
  v_updated uuid;
begin
  update public.pixwiki_v2_checkout_sessions
     set last_reconcile_at=now(),
         reconcile_attempts=reconcile_attempts+1,
         updated_at=now()
   where id=p_checkout_id
     and status in ('slot_reserved','payment_ready')
     and (last_reconcile_at is null or last_reconcile_at <= now() - make_interval(secs => v_min::double precision/1000.0))
   returning id into v_updated;

  return v_updated is not null;
end;
$$;

revoke all on function public.pixwiki_v2_checkout_reconcile_acquire(uuid,integer) from public, anon, authenticated;
grant execute on function public.pixwiki_v2_checkout_reconcile_acquire(uuid,integer) to service_role;

-- ----------------------------------------------------------------------------
-- 7) Cancelamento interno idempotente
-- ----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_cancel_checkout(
  p_checkout_id uuid,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_session public.pixwiki_v2_checkout_sessions;
begin
  select * into v_session
  from public.pixwiki_v2_checkout_sessions
  where id=p_checkout_id
  for update;

  if not found then return false; end if;
  if p_user_id is not null and v_session.user_id<>p_user_id then return false; end if;
  if v_session.status='paid' then return false; end if;
  if v_session.status in ('cancelled','expired') then return true; end if;

  update public.pixwiki_v2_checkout_sessions
    set status='cancelled',cancelled_at=coalesce(cancelled_at,now()),updated_at=now()
  where id=v_session.id;

  if v_session.direct_intent_id is not null then
    update public.pix_direct_intents
      set status='cancelled',updated_at=now()
    where id=v_session.direct_intent_id and status='pending';
  end if;

  if v_session.transaction_id is not null then
    update public.pix_transactions
      set status='cancelled',cancelled_at=coalesce(cancelled_at,now()),updated_at=now()
    where id=v_session.transaction_id and status='pending';
  end if;

  return true;
end;
$$;

revoke all on function public.pixwiki_v2_cancel_checkout(uuid,uuid) from public, anon, authenticated;
grant execute on function public.pixwiki_v2_cancel_checkout(uuid,uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 8) Confirmação: intent confirmado -> Checkout pago -> 1 uso idempotente
-- ----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_on_direct_intent_confirmed()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_checkout_id uuid;
  v_session public.pixwiki_v2_checkout_sessions;
  v_transaction_id uuid;
begin
  if new.product<>'pixwiki' or new.status<>'confirmed' then return new; end if;
  if old.status='confirmed' then return new; end if;

  begin
    v_checkout_id := nullif(new.metadata->>'v2_checkout_id','')::uuid;
  exception when others then
    v_checkout_id := null;
  end;

  if v_checkout_id is null then return new; end if;

  select * into v_session
  from public.pixwiki_v2_checkout_sessions
  where id=v_checkout_id
  for update;

  if not found then return new; end if;

  select p.id into v_transaction_id
  from public.pix_transactions p
  where p.direct_intent_id=new.id
  order by p.created_at desc
  limit 1;

  begin
    update public.pixwiki_v2_checkout_sessions
      set status='paid',
          provider_payment_id=new.provider_payment_id,
          receipt_id=coalesce(new.matched_receipt_id,receipt_id),
          transaction_id=coalesce(v_transaction_id,transaction_id),
          paid_at=coalesce(new.confirmed_at,paid_at,now()),
          updated_at=now()
    where id=v_checkout_id;
  exception when others then
    raise warning 'PixWiki V2: falha ao marcar checkout % como pago: %',v_checkout_id,sqlerrm;
  end;

  begin
    perform public.pixwiki_v2_record_usage(
      v_session.user_id,
      v_session.company_id,
      new.matched_receipt_id,
      v_session.origin,
      'pixwiki:v2:checkout:'||v_checkout_id::text,
      1,
      coalesce(v_session.discount_cents,0),
      v_session.is_test,
      coalesce(new.confirmed_at,now()),
      jsonb_build_object(
        'checkout_id',v_checkout_id,
        'external_id',v_session.external_id,
        'origin',v_session.origin
      )
    );
  exception when others then
    raise warning 'PixWiki V2: falha ao registrar uso do checkout %: %',v_checkout_id,sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function public.pixwiki_v2_on_direct_intent_confirmed() from public, anon, authenticated;
grant execute on function public.pixwiki_v2_on_direct_intent_confirmed() to service_role;

drop trigger if exists trg_pixwiki_v2_direct_intent_confirmed on public.pix_direct_intents;
create trigger trg_pixwiki_v2_direct_intent_confirmed
after update of status,provider_payment_id,matched_receipt_id,confirmed_at
on public.pix_direct_intents
for each row
when (new.status='confirmed')
execute function public.pixwiki_v2_on_direct_intent_confirmed();

-- Se o receipt chegar depois da reconciliação, anexa sem cobrar novamente.
create or replace function public.pixwiki_v2_attach_receipt_to_checkout()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_checkout_id uuid;
begin
  if new.mp_payment_id is null then return new; end if;

  select s.id into v_checkout_id
  from public.pixwiki_v2_checkout_sessions s
  where s.provider_payment_id=new.mp_payment_id
    and s.company_id=new.company_id
  order by s.created_at desc
  limit 1;

  if v_checkout_id is null then return new; end if;

  begin
    update public.pixwiki_v2_checkout_sessions
      set receipt_id=new.id,updated_at=now()
    where id=v_checkout_id and receipt_id is distinct from new.id;

    update public.pixwiki_v2_usage_events
      set receipt_id=new.id
    where idempotency_key='pixwiki:v2:checkout:'||v_checkout_id::text
      and receipt_id is null;
  exception when others then
    raise warning 'PixWiki V2: falha ao anexar receipt % ao checkout %: %',new.id,v_checkout_id,sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function public.pixwiki_v2_attach_receipt_to_checkout() from public, anon, authenticated;
grant execute on function public.pixwiki_v2_attach_receipt_to_checkout() to service_role;

drop trigger if exists trg_pixwiki_v2_attach_receipt on public.mp_received_payments;
create trigger trg_pixwiki_v2_attach_receipt
after insert or update of mp_payment_id,status
on public.mp_received_payments
for each row
when (new.status='approved' and new.mp_payment_id is not null)
execute function public.pixwiki_v2_attach_receipt_to_checkout();

-- ----------------------------------------------------------------------------
-- 9) Limpeza lógica de sessões antigas (chamada futura por cron/edge)
-- ----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_expire_stale_checkouts(p_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_count integer := 0;
begin
  with candidates as (
    select id,direct_intent_id,transaction_id
    from public.pixwiki_v2_checkout_sessions
    where status in ('created','queued','slot_reserved','payment_ready')
      and expires_at<=now()
    order by expires_at asc
    limit greatest(1,least(coalesce(p_limit,500),5000))
    for update skip locked
  ), upd as (
    update public.pixwiki_v2_checkout_sessions s
       set status='expired',updated_at=now()
      from candidates c
     where s.id=c.id
     returning s.id,s.direct_intent_id,s.transaction_id
  )
  select count(*) into v_count from upd;

  update public.pix_direct_intents i
     set status='expired',updated_at=now()
   where i.status='pending'
     and exists(
       select 1 from public.pixwiki_v2_checkout_sessions s
       where s.direct_intent_id=i.id and s.status='expired'
     );

  update public.pix_transactions p
     set status='expired',updated_at=now()
   where p.status='pending'
     and exists(
       select 1 from public.pixwiki_v2_checkout_sessions s
       where s.transaction_id=p.id and s.status='expired'
     );

  return v_count;
end;
$$;

revoke all on function public.pixwiki_v2_expire_stale_checkouts(integer) from public, anon, authenticated;
grant execute on function public.pixwiki_v2_expire_stale_checkouts(integer) to service_role;

commit;

notify pgrst, 'reload schema';
