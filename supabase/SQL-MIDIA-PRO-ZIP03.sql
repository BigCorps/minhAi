-- Midia.Pro — ZIP 03 / Anuncie nesta tela
-- Aplicar SOMENTE depois de SQL-MIDIA-PRO-ZIP01.sql e SQL-MIDIA-PRO-ZIP02.sql.
--
-- Esta etapa cria:
--   • catálogo oficial de publicidade;
--   • configuração comercial por tela;
--   • orçamento de campanha com preço calculado no servidor;
--   • reserva preliminar de inventário por 30 minutos;
--   • rascunho de campanha e criativo publicitário privado;
--   • base para o checkout do ZIP 04.
--
-- Nenhum pagamento é processado nesta migration.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Catálogo de publicidade
-- Preços-base são por tela Standard, peça de 30 s. O preço final aplica a
-- duração (30/45/60 s) e o price_factor da tela, ambos fotografados no quote.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.ad_product_catalog (
  product_key text primary key,
  name text not null,
  description text not null,
  base_price_cents integer not null check (base_price_cents > 0),
  schedule_kind text not null
    check (schedule_kind in ('flexible_once','date_once','window_once','recurring_fixed','recurring_interval')),
  campaign_days integer not null default 1 check (campaign_days between 1 and 90),
  occurrences_per_day numeric(8,3) null check (occurrences_per_day is null or occurrences_per_day > 0),
  interval_minutes integer null check (interval_minutes is null or interval_minutes between 5 and 1440),
  window_minutes integer null check (window_minutes is null or window_minutes between 15 and 1440),
  requires_date boolean not null default false,
  requires_time boolean not null default false,
  flexible_within_days integer null check (flexible_within_days is null or flexible_within_days between 1 and 90),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into midia.ad_product_catalog (
  product_key, name, description, base_price_cents, schedule_kind,
  campaign_days, occurrences_per_day, interval_minutes, window_minutes,
  requires_date, requires_time, flexible_within_days, sort_order
) values
  ('experiment', 'Experimente', '1 exibição em algum momento nos próximos 30 dias.', 490, 'flexible_once', 30, null, null, null, false, false, 30, 10),
  ('day_once', 'Dia Certo', '1 exibição no dia escolhido, em horário disponível.', 790, 'date_once', 1, null, null, null, true, false, null, 20),
  ('hour_once', 'Hora Certa', '1 exibição no dia escolhido dentro de uma janela de 1 hora.', 1490, 'window_once', 1, null, null, 60, true, true, null, 30),
  ('moment_once', 'Momento Marcado', '1 exibição dentro de uma janela de 15 minutos.', 2490, 'window_once', 1, null, null, 15, true, true, null, 40),
  ('daily', 'Presença Diária', '1 exibição por dia durante 30 dias.', 5990, 'recurring_fixed', 30, 1, null, null, true, false, null, 50),
  ('daily_timed', 'Diário Agendado', '1 exibição por dia durante 30 dias no horário escolhido.', 11990, 'recurring_fixed', 30, 1, null, 60, true, true, null, 60),
  ('reinforcement', 'Reforço', '4 exibições por dia durante 30 dias.', 14990, 'recurring_fixed', 30, 4, null, null, true, false, null, 70),
  ('hourly', 'Hora em Hora', '1 exibição a cada hora ativa da tela durante 30 dias.', 29990, 'recurring_interval', 30, null, 60, null, true, false, null, 80),
  ('high_frequency', 'Alta Frequência', '1 exibição a cada 30 minutos durante 30 dias.', 49990, 'recurring_interval', 30, null, 30, null, true, false, null, 90),
  ('intensive', 'Intensivo', '1 exibição a cada 15 minutos durante 30 dias.', 89990, 'recurring_interval', 30, null, 15, null, true, false, null, 100),
  ('dominant', 'Dominante', '1 exibição a cada 5 minutos durante 30 dias.', 199000, 'recurring_interval', 30, null, 5, null, true, false, null, 110)
on conflict (product_key) do update set
  name = excluded.name,
  description = excluded.description,
  base_price_cents = excluded.base_price_cents,
  schedule_kind = excluded.schedule_kind,
  campaign_days = excluded.campaign_days,
  occurrences_per_day = excluded.occurrences_per_day,
  interval_minutes = excluded.interval_minutes,
  window_minutes = excluded.window_minutes,
  requires_date = excluded.requires_date,
  requires_time = excluded.requires_time,
  flexible_within_days = excluded.flexible_within_days,
  active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Configuração comercial da tela
-- `active_minutes_per_day` começa em 12 h/dia. Nos ZIPs seguintes o dono poderá
-- cadastrar horário real de funcionamento sem alterar o modelo de inventário.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.screen_ad_settings (
  screen_id uuid primary key references midia.screens(id) on delete cascade,
  accepting_ads boolean not null default true,
  active_minutes_per_day integer not null default 720
    check (active_minutes_per_day between 60 and 1440),
  min_notice_minutes integer not null default 30
    check (min_notice_minutes between 0 and 10080),
  booking_horizon_days integer not null default 90
    check (booking_horizon_days between 1 and 365),
  premium_windows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into midia.screen_ad_settings (screen_id, accepting_ads)
select id, commercial_mode in ('partner','hybrid')
from midia.screens
on conflict (screen_id) do nothing;

create or replace function midia.sync_screen_ad_settings()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
begin
  insert into midia.screen_ad_settings(screen_id, accepting_ads)
  values (new.id, new.commercial_mode in ('partner','hybrid'))
  on conflict (screen_id) do update
     set accepting_ads = (new.commercial_mode in ('partner','hybrid')),
         updated_at = now();
  return new;
end;
$$;

revoke all on function midia.sync_screen_ad_settings() from public, anon, authenticated;
grant execute on function midia.sync_screen_ad_settings() to service_role;

drop trigger if exists screens_sync_ad_settings_trg on midia.screens;
create trigger screens_sync_ad_settings_trg
after insert or update of commercial_mode on midia.screens
for each row execute function midia.sync_screen_ad_settings();

-- ─────────────────────────────────────────────────────────────────────────────
-- Campanhas e criativos de anunciantes
-- PII fica somente no schema privado midia. Nenhum dado abaixo é exposto pelo
-- PostgREST a anon/authenticated.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.campaigns (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references midia.screens(id) on delete restrict,
  publisher_id uuid not null references midia.publishers(id) on delete restrict,
  origin_screen_id uuid not null references midia.screens(id) on delete restrict,
  product_key text not null references midia.ad_product_catalog(product_key),
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text null,
  duration_seconds integer not null check (duration_seconds in (30,45,60)),
  schedule_date date null,
  schedule_time time null,
  start_date date null,
  end_date date null,
  schedule_config jsonb not null default '{}'::jsonb,
  base_price_cents integer not null check (base_price_cents > 0),
  duration_multiplier numeric(8,4) not null check (duration_multiplier > 0),
  screen_factor_snapshot numeric(8,2) not null check (screen_factor_snapshot > 0),
  total_price_cents integer not null check (total_price_cents > 0),
  estimated_occurrences integer not null check (estimated_occurrences > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  origin_kind text not null default 'screen_qr' check (origin_kind in ('screen_qr','direct','network')),
  edit_token_hash text not null unique,
  ip_hash text not null,
  status text not null default 'draft'
    check (status in (
      'draft','awaiting_payment','payment_pending','paid','under_review','approved',
      'rejected','scheduled','running','completed','cancelled','expired'
    )),
  quote_expires_at timestamptz not null,
  accepted_content_terms_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(buyer_name) between 2 and 100),
  check (char_length(buyer_email) between 5 and 254),
  check (buyer_phone is null or char_length(buyer_phone) between 8 and 30),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists midia_campaigns_screen_status_idx
  on midia.campaigns(screen_id, status, created_at desc);
create index if not exists midia_campaigns_publisher_status_idx
  on midia.campaigns(publisher_id, status, created_at desc);
create index if not exists midia_campaigns_quote_expiry_idx
  on midia.campaigns(quote_expires_at)
  where status in ('draft','awaiting_payment','payment_pending');

create table if not exists midia.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references midia.campaigns(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  source text not null default 'upload' check (source in ('upload','card_builder')),
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  duration_seconds numeric(8,3) null check (duration_seconds is null or duration_seconds between 0 and 61),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  status text not null default 'uploading'
    check (status in ('uploading','ready','failed','replaced','deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(file_name) between 1 and 180),
  check (height > width)
);

create index if not exists midia_ad_creatives_campaign_idx
  on midia.ad_creatives(campaign_id, status, created_at desc);

-- Reserva temporária do inventário enquanto o anunciante monta/paga a campanha.
-- O ZIP 04 converterá a reserva em inventário contratado quando o PIX confirmar.
create table if not exists midia.campaign_inventory_holds (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references midia.campaigns(id) on delete cascade,
  screen_id uuid not null references midia.screens(id) on delete cascade,
  reserved_from date not null,
  reserved_until date not null,
  requested_seconds_per_day numeric(12,3) not null check (requested_seconds_per_day > 0),
  capacity_seconds_per_day numeric(12,3) not null check (capacity_seconds_per_day > 0),
  status text not null default 'pending' check (status in ('pending','converted','released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reserved_until >= reserved_from)
);

create index if not exists midia_campaign_holds_screen_dates_idx
  on midia.campaign_inventory_holds(screen_id, reserved_from, reserved_until, status);
create index if not exists midia_campaign_holds_expiry_idx
  on midia.campaign_inventory_holds(expires_at)
  where status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- Cálculo oficial de preço e disponibilidade
-- Centralizar no banco evita preço diferente entre página pública e checkout.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.calculate_campaign_quote(
  p_screen_id uuid,
  p_product_key text,
  p_duration_seconds integer,
  p_schedule_date date default null,
  p_schedule_time time default null,
  p_start_date date default null
)
returns table (
  product_name text,
  base_price_cents integer,
  duration_multiplier numeric,
  screen_factor numeric,
  total_price_cents integer,
  reserved_from date,
  reserved_until date,
  estimated_occurrences integer,
  requested_seconds_per_day numeric,
  capacity_seconds_per_day numeric,
  currently_reserved_seconds_per_day numeric
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  v_product midia.ad_product_catalog%rowtype;
  v_screen midia.screens%rowtype;
  v_settings midia.screen_ad_settings%rowtype;
  v_publisher_status text;
  v_timezone text;
  v_local_now timestamp;
  v_local_date date;
  v_from date;
  v_until date;
  v_occurrences_per_day numeric;
  v_estimated integer;
  v_daily_seconds numeric;
  v_capacity numeric;
  v_reserved numeric;
  v_duration_multiplier numeric;
  v_total integer;
begin
  if p_duration_seconds not in (30,45,60) then
    raise exception 'invalid_duration';
  end if;

  -- PL/pgSQL não permite misturar uma variável composta (%rowtype) com
  -- escalares no mesmo SELECT ... INTO. Carregamos a tela primeiro e, em
  -- seguida, os dois valores relacionados.
  select s.*
    into v_screen
  from midia.screens s
  where s.id = p_screen_id;

  if not found then
    raise exception 'screen_unavailable';
  end if;

  select p.status, l.timezone
    into v_publisher_status, v_timezone
  from midia.publishers p
  join midia.locations l on l.id = v_screen.location_id
  where p.id = v_screen.publisher_id;

  if not found
     or v_publisher_status <> 'active'
     or v_screen.status <> 'active'
     or v_screen.commercial_mode not in ('partner','hybrid')
     or v_screen.network_inventory_percent <= 0
     or v_screen.billing_status not in ('not_required','active') then
    raise exception 'screen_unavailable';
  end if;

  select * into v_settings
  from midia.screen_ad_settings
  where screen_id = p_screen_id;

  if not found or not v_settings.accepting_ads then
    raise exception 'screen_unavailable';
  end if;

  select * into v_product
  from midia.ad_product_catalog
  where product_key = p_product_key and active = true;

  if not found then raise exception 'invalid_product'; end if;

  v_local_now := timezone(coalesce(v_timezone, 'America/Sao_Paulo'), now());
  v_local_date := v_local_now::date;

  if v_product.schedule_kind = 'flexible_once' then
    v_from := v_local_date;
    v_until := v_local_date + (coalesce(v_product.flexible_within_days, 30) - 1);
    v_occurrences_per_day := 1.0 / greatest(1, coalesce(v_product.flexible_within_days, 30));
    v_estimated := 1;

  elsif v_product.schedule_kind in ('date_once','window_once') then
    if p_schedule_date is null then raise exception 'date_required'; end if;
    if p_schedule_date < v_local_date
       or p_schedule_date > v_local_date + v_settings.booking_horizon_days then
      raise exception 'date_out_of_range';
    end if;
    if v_product.requires_time and p_schedule_time is null then
      raise exception 'time_required';
    end if;
    if v_product.requires_time
       and (p_schedule_date + p_schedule_time) < (v_local_now + make_interval(mins => v_settings.min_notice_minutes)) then
      raise exception 'time_too_soon';
    end if;
    v_from := p_schedule_date;
    v_until := p_schedule_date;
    v_occurrences_per_day := 1;
    v_estimated := 1;

  elsif v_product.schedule_kind in ('recurring_fixed','recurring_interval') then
    if p_start_date is null then raise exception 'date_required'; end if;
    if p_start_date < v_local_date
       or p_start_date > v_local_date + v_settings.booking_horizon_days then
      raise exception 'date_out_of_range';
    end if;
    if v_product.requires_time and p_schedule_time is null then
      raise exception 'time_required';
    end if;
    if v_product.requires_time
       and p_start_date = v_local_date
       and (p_start_date + p_schedule_time) < (v_local_now + make_interval(mins => v_settings.min_notice_minutes)) then
      raise exception 'time_too_soon';
    end if;
    v_from := p_start_date;
    v_until := p_start_date + (v_product.campaign_days - 1);

    if v_product.schedule_kind = 'recurring_fixed' then
      v_occurrences_per_day := coalesce(v_product.occurrences_per_day, 1);
    else
      v_occurrences_per_day := greatest(1, floor(v_settings.active_minutes_per_day::numeric / v_product.interval_minutes));
    end if;
    v_estimated := greatest(1, round(v_occurrences_per_day * v_product.campaign_days)::integer);
  else
    raise exception 'invalid_product';
  end if;

  v_daily_seconds := greatest(1::numeric, v_occurrences_per_day * p_duration_seconds);
  v_capacity := (v_settings.active_minutes_per_day * 60.0) * (v_screen.network_inventory_percent / 100.0);

  select coalesce(max(day_total), 0)
    into v_reserved
  from (
    select d::date as day,
           coalesce(sum(h.requested_seconds_per_day), 0) as day_total
    from generate_series(v_from::timestamp, v_until::timestamp, interval '1 day') d
    left join midia.campaign_inventory_holds h
      on h.screen_id = p_screen_id
     and d::date between h.reserved_from and h.reserved_until
     and (
       h.status = 'converted'
       or (h.status = 'pending' and h.expires_at > now())
     )
    group by d::date
  ) q;

  if v_reserved + v_daily_seconds > v_capacity then
    raise exception 'inventory_unavailable';
  end if;

  v_duration_multiplier := case p_duration_seconds when 30 then 1.0 when 45 then 1.5 else 2.0 end;
  v_total := round(v_product.base_price_cents * v_duration_multiplier * v_screen.price_factor)::integer;

  return query select
    v_product.name,
    v_product.base_price_cents,
    v_duration_multiplier,
    v_screen.price_factor,
    v_total,
    v_from,
    v_until,
    v_estimated,
    v_daily_seconds,
    v_capacity,
    v_reserved;
end;
$$;

revoke all on function midia.calculate_campaign_quote(uuid,text,integer,date,time,date)
  from public, anon, authenticated;
grant execute on function midia.calculate_campaign_quote(uuid,text,integer,date,time,date)
  to service_role;

-- Reserva atômica: duas pessoas tentando comprar o último pedaço do mesmo
-- inventário passam pela mesma trava de `screens ... for update`.
create or replace function midia.reserve_campaign_draft(
  p_screen_id uuid,
  p_product_key text,
  p_duration_seconds integer,
  p_schedule_date date,
  p_schedule_time time,
  p_start_date date,
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text,
  p_edit_token_hash text,
  p_ip_hash text,
  p_accepted_content_terms boolean
)
returns table (
  campaign_id uuid,
  quote_expires_at timestamptz,
  total_price_cents integer,
  estimated_occurrences integer,
  reserved_from date,
  reserved_until date
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  v_publisher_id uuid;
  v_quote record;
  v_campaign_id uuid;
  v_expires timestamptz := now() + interval '30 minutes';
begin
  if not p_accepted_content_terms then raise exception 'content_terms_required'; end if;
  if char_length(trim(coalesce(p_buyer_name,''))) < 2 then raise exception 'invalid_buyer_name'; end if;
  if char_length(trim(coalesce(p_buyer_email,''))) < 5 then raise exception 'invalid_buyer_email'; end if;

  -- Serializa reservas da mesma tela.
  select publisher_id into v_publisher_id
  from midia.screens
  where id = p_screen_id
  for update;
  if not found then raise exception 'screen_unavailable'; end if;

  select * into v_quote
  from midia.calculate_campaign_quote(
    p_screen_id, p_product_key, p_duration_seconds,
    p_schedule_date, p_schedule_time, p_start_date
  );

  insert into midia.campaigns (
    screen_id, publisher_id, origin_screen_id, product_key,
    buyer_name, buyer_email, buyer_phone, duration_seconds,
    schedule_date, schedule_time, start_date, end_date, schedule_config,
    base_price_cents, duration_multiplier, screen_factor_snapshot,
    total_price_cents, estimated_occurrences, edit_token_hash, ip_hash,
    status, quote_expires_at, accepted_content_terms_at
  ) values (
    p_screen_id, v_publisher_id, p_screen_id, p_product_key,
    trim(p_buyer_name), lower(trim(p_buyer_email)), nullif(trim(coalesce(p_buyer_phone,'')),''), p_duration_seconds,
    p_schedule_date, p_schedule_time, v_quote.reserved_from, v_quote.reserved_until,
    jsonb_build_object(
      'schedule_date', p_schedule_date,
      'schedule_time', p_schedule_time,
      'start_date', p_start_date,
      'reserved_from', v_quote.reserved_from,
      'reserved_until', v_quote.reserved_until
    ),
    v_quote.base_price_cents, v_quote.duration_multiplier, v_quote.screen_factor,
    v_quote.total_price_cents, v_quote.estimated_occurrences,
    p_edit_token_hash, p_ip_hash, 'draft', v_expires, now()
  ) returning id into v_campaign_id;

  insert into midia.campaign_inventory_holds (
    campaign_id, screen_id, reserved_from, reserved_until,
    requested_seconds_per_day, capacity_seconds_per_day, status, expires_at
  ) values (
    v_campaign_id, p_screen_id, v_quote.reserved_from, v_quote.reserved_until,
    v_quote.requested_seconds_per_day, v_quote.capacity_seconds_per_day,
    'pending', v_expires
  );

  return query select
    v_campaign_id, v_expires, v_quote.total_price_cents,
    v_quote.estimated_occurrences, v_quote.reserved_from, v_quote.reserved_until;
end;
$$;

revoke all on function midia.reserve_campaign_draft(uuid,text,integer,date,time,date,text,text,text,text,text,boolean)
  from public, anon, authenticated;
grant execute on function midia.reserve_campaign_draft(uuid,text,integer,date,time,date,text,text,text,text,text,boolean)
  to service_role;

-- updated_at
drop trigger if exists ad_product_catalog_touch_updated_at on midia.ad_product_catalog;
create trigger ad_product_catalog_touch_updated_at
before update on midia.ad_product_catalog
for each row execute function midia.touch_updated_at();

drop trigger if exists screen_ad_settings_touch_updated_at on midia.screen_ad_settings;
create trigger screen_ad_settings_touch_updated_at
before update on midia.screen_ad_settings
for each row execute function midia.touch_updated_at();

drop trigger if exists campaigns_touch_updated_at on midia.campaigns;
create trigger campaigns_touch_updated_at
before update on midia.campaigns
for each row execute function midia.touch_updated_at();

drop trigger if exists ad_creatives_touch_updated_at on midia.ad_creatives;
create trigger ad_creatives_touch_updated_at
before update on midia.ad_creatives
for each row execute function midia.touch_updated_at();

drop trigger if exists campaign_holds_touch_updated_at on midia.campaign_inventory_holds;
create trigger campaign_holds_touch_updated_at
before update on midia.campaign_inventory_holds
for each row execute function midia.touch_updated_at();

-- RLS + privilégios: continua server-only.
alter table midia.ad_product_catalog enable row level security;
alter table midia.screen_ad_settings enable row level security;
alter table midia.campaigns enable row level security;
alter table midia.ad_creatives enable row level security;
alter table midia.campaign_inventory_holds enable row level security;

revoke all on midia.ad_product_catalog from public, anon, authenticated;
revoke all on midia.screen_ad_settings from public, anon, authenticated;
revoke all on midia.campaigns from public, anon, authenticated;
revoke all on midia.ad_creatives from public, anon, authenticated;
revoke all on midia.campaign_inventory_holds from public, anon, authenticated;

grant all on midia.ad_product_catalog to service_role;
grant all on midia.screen_ad_settings to service_role;
grant all on midia.campaigns to service_role;
grant all on midia.ad_creatives to service_role;
grant all on midia.campaign_inventory_holds to service_role;

commit;

-- Conferência sugerida (somente leitura):
-- select product_key,name,base_price_cents,schedule_kind from midia.ad_product_catalog order by sort_order;
-- select table_name from information_schema.tables where table_schema='midia' order by table_name;
