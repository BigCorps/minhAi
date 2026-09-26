-- =============================================================================
-- Midia.Pro — INSTALAÇÃO FINAL CONSOLIDADA — ZIPs 01 a 06
-- Gerado em 26/09/2026
-- Base: BigCorps/minhAi @ d5e4df26283da19b345795313a086bfda547d5de
--
-- Use este arquivo quando NENHUM dos SQLs Midia.Pro tiver sido aplicado ainda.
-- Ele executa as seis fases, na ordem correta. Cada fase mantém sua própria
-- transação BEGIN/COMMIT para facilitar diagnóstico no Supabase SQL Editor.
-- Não execute este arquivo e depois os seis arquivos individuais novamente.
-- =============================================================================


-- =============================================================================
-- INÍCIO DA FASE ZIP01
-- =============================================================================

-- Midia.Pro — ZIP 01 / Fundação
-- Aplicar UMA vez no MESMO projeto Supabase da minhAi.
--
-- Objetivos desta etapa:
--   • schema privado `midia` (não exposto diretamente ao browser);
--   • proprietário, locais, telas e dispositivos futuros;
--   • catálogo comercial das telas;
--   • slugs reservados;
--   • bucket privado para as próximas etapas de mídia.
--
-- Esta migration NÃO cria cobranças, campanhas, saldo nem repasses ainda.
-- Essas partes entram em migrations próprias nos ZIPs seguintes.
--
-- APÓS EXECUTAR: adicione `midia` aos Exposed schemas da Data API no
-- Dashboard do Supabase. O schema continua privado porque anon/authenticated
-- ficam sem USAGE/policies; a API server-side usa service_role.

begin;

create schema if not exists midia;

-- O browser nunca acessa o schema Midia.Pro diretamente. As rotas Next.js
-- validam a sessão e usam service_role server-side, como já fazemos em outros
-- módulos sensíveis do monorepo.
revoke all on schema midia from public;
revoke all on schema midia from anon;
revoke all on schema midia from authenticated;
grant usage on schema midia to service_role;

create or replace function midia.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, midia
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function midia.touch_updated_at() from public, anon, authenticated;
grant execute on function midia.touch_updated_at() to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Catálogo comercial de uso da tela
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.screen_plan_catalog (
  plan_key text primary key,
  name text not null,
  description text not null,
  monthly_price_cents integer not null default 0 check (monthly_price_cents >= 0),
  commercial_mode text not null
    check (commercial_mode in ('partner','private','hybrid')),
  default_network_inventory_percent numeric(5,2) not null default 0
    check (default_network_inventory_percent between 0 and 80),
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into midia.screen_plan_catalog (
  plan_key, name, description, monthly_price_cents, commercial_mode,
  default_network_inventory_percent, features, sort_order
) values
  (
    'partner_free',
    'Parceiro Midia.Pro',
    'Use suas próprias mídias sem mensalidade e disponibilize parte da programação para anúncios da rede.',
    0,
    'partner',
    20,
    '{"own_media":true,"network_ads":true,"advanced_scheduling":false,"storage_tier":"standard"}'::jsonb,
    10
  ),
  (
    'private_basic',
    'Uso Próprio',
    '100% da programação é do proprietário. A Midia.Pro não insere anúncios da rede.',
    1990,
    'private',
    0,
    '{"own_media":true,"network_ads":false,"advanced_scheduling":false,"storage_tier":"standard"}'::jsonb,
    20
  ),
  (
    'private_pro',
    'Uso Próprio Pro',
    'Uso privado com recursos avançados de programação e maior franquia operacional.',
    3990,
    'private',
    0,
    '{"own_media":true,"network_ads":false,"advanced_scheduling":true,"storage_tier":"pro"}'::jsonb,
    30
  ),
  (
    'partner_pro',
    'Parceiro + Pro',
    'Participa da rede Midia.Pro e também recebe recursos avançados de programação.',
    1990,
    'partner',
    20,
    '{"own_media":true,"network_ads":true,"advanced_scheduling":true,"storage_tier":"pro"}'::jsonb,
    40
  )
on conflict (plan_key) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  commercial_mode = excluded.commercial_mode,
  default_network_inventory_percent = excluded.default_network_inventory_percent,
  features = excluded.features,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Slugs
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.reserved_slugs (
  slug text primary key,
  reason text null,
  created_at timestamptz not null default now(),
  check (slug = lower(slug)),
  check (slug ~ '^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$' or slug ~ '^[a-z0-9]{1,2}$')
);

insert into midia.reserved_slugs (slug, reason)
select slug, 'reservado pela plataforma'
from unnest(array[
  'www','app','api','admin','painel','dashboard','login','entrar','cadastro',
  'conta','suporte','ajuda','status','cdn','assets','static','files','pay',
  'pagar','pagamento','financeiro','saque','anunciar','anuncie','publicidade',
  'ads','midia','midiapro','bigcorps','termos','privacidade','aviso','exclusao',
  'robots','sitemap','null','undefined','test','teste','demo','dev','staging',
  'beta','mcp'
]::text[]) as slug
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Proprietários / parceiros
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.publishers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  account_type text not null default 'company'
    check (account_type in ('person','company')),
  status text not null default 'active'
    check (status in ('active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(display_name) between 2 and 100),
  check (char_length(slug) between 3 and 40),
  check (slug = lower(slug)),
  check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

create index if not exists midia_publishers_status_idx
  on midia.publishers(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Locais físicos
-- Endereço detalhado é opcional e nunca será exibido automaticamente ao público.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.locations (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references midia.publishers(id) on delete cascade,
  name text not null,
  venue_type text not null default 'store'
    check (venue_type in (
      'store','restaurant','gym','clinic','office','residential_elevator',
      'commercial_elevator','vehicle','outdoor','other'
    )),
  city text null,
  state text null,
  address_line text null,
  postal_code text null,
  latitude numeric(9,6) null check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) null check (longitude is null or longitude between -180 and 180),
  timezone text not null default 'America/Sao_Paulo',
  opening_hours jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(name) between 2 and 120)
);

create index if not exists midia_locations_publisher_idx
  on midia.locations(publisher_id, active, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Telas
-- `inventory_class` e `price_factor` ficam sob controle da plataforma: o dono
-- informa o tipo físico, mas não se auto-classifica como Premium/LED comercial.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.screens (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references midia.publishers(id) on delete cascade,
  location_id uuid not null references midia.locations(id) on delete cascade,
  public_code text not null unique,
  name text not null,
  screen_type text not null default 'tv'
    check (screen_type in ('tv','tablet','led_panel','projector','other')),
  orientation text not null default 'portrait'
    check (orientation in ('portrait','landscape')),
  aspect_ratio text not null default '9:16',
  plan_key text not null default 'partner_free'
    references midia.screen_plan_catalog(plan_key),
  commercial_mode text not null default 'partner'
    check (commercial_mode in ('partner','private','hybrid')),
  network_inventory_percent numeric(5,2) not null default 20
    check (network_inventory_percent between 0 and 80),
  billing_status text not null default 'not_required'
    check (billing_status in ('not_required','pending_payment','active','past_due','cancelled')),
  inventory_class text not null default 'standard'
    check (inventory_class in ('standard','movement','premium','led')),
  price_factor numeric(8,2) not null default 1.00 check (price_factor > 0),
  status text not null default 'draft'
    check (status in ('draft','active','paused','suspended','archived')),
  playlist_version bigint not null default 1 check (playlist_version > 0),
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(name) between 2 and 120),
  check (public_code ~ '^[A-Z0-9]{8,16}$'),
  check (
    (commercial_mode = 'private' and network_inventory_percent = 0)
    or (commercial_mode in ('partner','hybrid') and network_inventory_percent > 0)
  )
);

create index if not exists midia_screens_publisher_idx
  on midia.screens(publisher_id, status, created_at);
create index if not exists midia_screens_location_idx
  on midia.screens(location_id, status);
create index if not exists midia_screens_last_seen_idx
  on midia.screens(last_seen_at desc)
  where status = 'active';

-- Pareamento do player entra no ZIP 02. A tabela já nasce pronta para que não
-- precisemos remodelar `screens` quando o player chegar.
create table if not exists midia.devices (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references midia.screens(id) on delete cascade,
  device_name text null,
  device_token_hash text null unique,
  pairing_code_hash text null unique,
  pairing_expires_at timestamptz null,
  paired_at timestamptz null,
  revoked_at timestamptz null,
  app_version text null,
  last_seen_at timestamptz null,
  last_playlist_version bigint null,
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists midia_devices_screen_idx
  on midia.devices(screen_id, revoked_at, last_seen_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Updated_at
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists screen_plan_catalog_touch_updated_at on midia.screen_plan_catalog;
create trigger screen_plan_catalog_touch_updated_at
before update on midia.screen_plan_catalog
for each row execute function midia.touch_updated_at();

drop trigger if exists publishers_touch_updated_at on midia.publishers;
create trigger publishers_touch_updated_at
before update on midia.publishers
for each row execute function midia.touch_updated_at();

drop trigger if exists locations_touch_updated_at on midia.locations;
create trigger locations_touch_updated_at
before update on midia.locations
for each row execute function midia.touch_updated_at();

drop trigger if exists screens_touch_updated_at on midia.screens;
create trigger screens_touch_updated_at
before update on midia.screens
for each row execute function midia.touch_updated_at();

drop trigger if exists devices_touch_updated_at on midia.devices;
create trigger devices_touch_updated_at
before update on midia.devices
for each row execute function midia.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS + privilégios
-- Sem policies para anon/authenticated de propósito. O schema é server-only.
-- ─────────────────────────────────────────────────────────────────────────────
alter table midia.screen_plan_catalog enable row level security;
alter table midia.reserved_slugs enable row level security;
alter table midia.publishers enable row level security;
alter table midia.locations enable row level security;
alter table midia.screens enable row level security;
alter table midia.devices enable row level security;

revoke all on all tables in schema midia from public, anon, authenticated;
revoke all on all sequences in schema midia from public, anon, authenticated;

grant all on all tables in schema midia to service_role;
grant all on all sequences in schema midia to service_role;

alter default privileges in schema midia
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema midia
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema midia
  grant all on tables to service_role;
alter default privileges in schema midia
  grant all on sequences to service_role;

-- Bucket privado reservado às peças e assets da rede. O ZIP 02 adicionará o
-- fluxo de upload/download/cache. Nenhuma policy pública é criada aqui.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'midia-assets',
  'midia-assets',
  false,
  52428800,
  array[
    'image/jpeg','image/png','image/webp',
    'video/mp4','video/webm','video/quicktime'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;

-- Conferência sugerida após aplicar (somente leitura):
-- select table_name from information_schema.tables
-- where table_schema='midia' order by table_name;
--
-- select plan_key, monthly_price_cents, commercial_mode,
--        default_network_inventory_percent
-- from midia.screen_plan_catalog
-- order by sort_order;

-- =============================================================================
-- FIM DA FASE ZIP01
-- =============================================================================

-- =============================================================================
-- INÍCIO DA FASE ZIP02
-- =============================================================================

-- Midia.Pro — ZIP 02 / Player, pareamento e mídia própria
-- Aplicar SOMENTE depois do SQL-MIDIA-PRO-ZIP01.sql.
-- Migration aditiva e idempotente para a base da etapa 02.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Criativos privados
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.creatives (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references midia.publishers(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  duration_seconds numeric(8,3) null check (duration_seconds is null or duration_seconds between 0 and 61),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  status text not null default 'uploading'
    check (status in ('uploading','ready','failed','deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(file_name) between 1 and 180),
  check (height > width)
);

create index if not exists midia_creatives_publisher_status_idx
  on midia.creatives(publisher_id, status, created_at desc);

-- Playlist própria da tela. Campanhas pagas dos ZIPs seguintes poderão ser
-- agregadas pelo endpoint de manifesto sem mudar o contrato do player.
create table if not exists midia.screen_playlist_items (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references midia.screens(id) on delete cascade,
  creative_id uuid not null references midia.creatives(id) on delete cascade,
  source text not null default 'own' check (source in ('own','house','network')),
  display_seconds integer not null default 30 check (display_seconds between 30 and 60),
  sort_order integer not null default 10,
  active boolean not null default true,
  valid_from timestamptz null,
  valid_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (screen_id, creative_id),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create index if not exists midia_playlist_screen_active_idx
  on midia.screen_playlist_items(screen_id, active, sort_order, created_at);
create index if not exists midia_playlist_creative_idx
  on midia.screen_playlist_items(creative_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Um único player pareado ativo por tela
-- Códigos ainda não usados não entram neste índice.
-- ─────────────────────────────────────────────────────────────────────────────
create unique index if not exists midia_devices_one_active_per_screen_uidx
  on midia.devices(screen_id)
  where revoked_at is null and paired_at is not null;

create index if not exists midia_devices_pairing_expiry_idx
  on midia.devices(pairing_expires_at)
  where revoked_at is null and paired_at is null and pairing_code_hash is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Pareamento atômico
-- O route handler usa service_role. Nem anon nem authenticated executam RPC.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.claim_device_pairing(
  p_pairing_code_hash text,
  p_device_token_hash text,
  p_device_name text,
  p_app_version text,
  p_publisher_slug text
)
returns table (
  device_id uuid,
  screen_id uuid,
  screen_name text,
  playlist_version bigint,
  can_play boolean
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  v_device_id uuid;
  v_screen_id uuid;
  v_screen_name text;
  v_playlist_version bigint;
  v_billing_status text;
  v_screen_status text;
  v_publisher_status text;
begin
  select d.id, d.screen_id, s.name, s.playlist_version,
         s.billing_status, s.status, p.status
    into v_device_id, v_screen_id, v_screen_name, v_playlist_version,
         v_billing_status, v_screen_status, v_publisher_status
  from midia.devices d
  join midia.screens s on s.id = d.screen_id
  join midia.publishers p on p.id = s.publisher_id
  where d.pairing_code_hash = p_pairing_code_hash
    and d.revoked_at is null
    and d.paired_at is null
    and d.pairing_expires_at > now()
    and p.slug = lower(trim(p_publisher_slug))
  for update of d;

  if not found or v_publisher_status <> 'active' then
    return;
  end if;

  -- Só derruba o player anterior quando o novo conclui de fato o pareamento.
  update midia.devices
     set revoked_at = now(), updated_at = now()
   where screen_id = v_screen_id
     and id <> v_device_id
     and revoked_at is null
     and paired_at is not null;

  update midia.devices
     set device_token_hash = p_device_token_hash,
         pairing_code_hash = null,
         pairing_expires_at = null,
         paired_at = now(),
         revoked_at = null,
         device_name = nullif(trim(coalesce(p_device_name,'')),''),
         app_version = nullif(trim(coalesce(p_app_version,'')),''),
         last_seen_at = now(),
         last_playlist_version = v_playlist_version,
         updated_at = now()
   where id = v_device_id;

  if v_billing_status in ('not_required','active') and v_screen_status = 'draft' then
    update midia.screens
       set status = 'active', last_seen_at = now(), updated_at = now()
     where id = v_screen_id;
    v_screen_status := 'active';
  else
    update midia.screens set last_seen_at = now(), updated_at = now() where id = v_screen_id;
  end if;

  return query
  select
    v_device_id,
    v_screen_id,
    v_screen_name,
    v_playlist_version,
    (v_publisher_status = 'active'
      and v_screen_status in ('active','draft')
      and v_billing_status in ('not_required','active'));
end;
$$;

revoke all on function midia.claim_device_pairing(text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function midia.claim_device_pairing(text,text,text,text,text)
  to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Versionamento + Realtime Broadcast
-- A mensagem não contém URL nem conteúdo privado, só avisa que o manifesto
-- mudou. O player então busca a nova versão pela API autenticada.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.bump_screen_playlist_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, midia
as $$
declare
  v_screen_id uuid;
  v_version bigint;
begin
  v_screen_id := case when tg_op = 'DELETE' then old.screen_id else new.screen_id end;

  update midia.screens
     set playlist_version = playlist_version + 1,
         updated_at = now()
   where id = v_screen_id
   returning playlist_version into v_version;

  if v_version is not null then
    perform realtime.send(
      jsonb_build_object(
        'screen_id', v_screen_id,
        'playlist_version', v_version,
        'acao', lower(tg_op)
      ),
      'playlist',
      'midia-screen:' || v_screen_id::text,
      false
    );
  end if;

  return null;
end;
$$;

revoke all on function midia.bump_screen_playlist_version()
  from public, anon, authenticated;
grant execute on function midia.bump_screen_playlist_version()
  to service_role;

drop trigger if exists screen_playlist_version_trg on midia.screen_playlist_items;
create trigger screen_playlist_version_trg
after insert or update or delete on midia.screen_playlist_items
for each row execute function midia.bump_screen_playlist_version();

-- updated_at
drop trigger if exists creatives_touch_updated_at on midia.creatives;
create trigger creatives_touch_updated_at
before update on midia.creatives
for each row execute function midia.touch_updated_at();

drop trigger if exists screen_playlist_items_touch_updated_at on midia.screen_playlist_items;
create trigger screen_playlist_items_touch_updated_at
before update on midia.screen_playlist_items
for each row execute function midia.touch_updated_at();

-- RLS + privilégios: continua server-only.
alter table midia.creatives enable row level security;
alter table midia.screen_playlist_items enable row level security;

revoke all on midia.creatives from public, anon, authenticated;
revoke all on midia.screen_playlist_items from public, anon, authenticated;
grant all on midia.creatives to service_role;
grant all on midia.screen_playlist_items to service_role;

commit;

-- Conferência sugerida (somente leitura):
-- select table_name from information_schema.tables
-- where table_schema='midia' order by table_name;
--
-- select indexname from pg_indexes
-- where schemaname='midia' and tablename in ('devices','creatives','screen_playlist_items')
-- order by indexname;

-- =============================================================================
-- FIM DA FASE ZIP02
-- =============================================================================

-- =============================================================================
-- INÍCIO DA FASE ZIP03
-- =============================================================================

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

-- =============================================================================
-- FIM DA FASE ZIP03
-- =============================================================================

-- =============================================================================
-- INÍCIO DA FASE ZIP04
-- =============================================================================

-- Midia.Pro — ZIP 04 / Pagamento + Programação
-- Aplicar SOMENTE depois dos SQLs ZIP01, ZIP02 e ZIP03.
--
-- Esta etapa:
--   • aceita purpose=midia_campaign em pix_transactions;
--   • registra tentativas de PIX sem split (valor fica na BigCorps);
--   • converte o hold temporário em inventário contratado após confirmação;
--   • envia a campanha paga para revisão do dono da tela;
--   • gera ocorrências agendadas após aprovação;
--   • avisa o player por playlist_version + Realtime Broadcast.
--
-- Financeiro do parceiro (50/50 ou 80/20, saldo e saque) entra no ZIP 05.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- PIX compartilhado BigCorps
-- Midia.Pro usa um purpose próprio para que confirmar-pix-assistente NÃO
-- credite company_balance da empresa-plataforma.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pix_transactions
  drop constraint if exists pix_transactions_purpose_check;

alter table public.pix_transactions
  add constraint pix_transactions_purpose_check
  check (purpose = any (array[
    'payment'::text,
    'consulta_fee'::text,
    'print_fee'::text,
    'conviteria_presente'::text,
    'conviteria_convite'::text,
    'conviteria_mensalidade'::text,
    'pixwiki_subscription'::text,
    'midia_campaign'::text
  ]));

-- ─────────────────────────────────────────────────────────────────────────────
-- Horário operacional real da tela
-- O ZIP03 já usa active_minutes_per_day no cálculo de inventário. Aqui ele
-- passa a ser derivado do horário de abertura/fechamento, mantendo o cálculo
-- e a agenda apontando para a mesma verdade.
-- ─────────────────────────────────────────────────────────────────────────────
alter table midia.screen_ad_settings
  add column if not exists active_start_time time not null default '08:00',
  add column if not exists active_end_time time not null default '20:00';

update midia.screen_ad_settings
   set active_minutes_per_day = greatest(
     60,
     floor(extract(epoch from (active_end_time - active_start_time)) / 60)::integer
   )
 where active_end_time > active_start_time;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'screen_ad_settings_active_window_chk'
       and conrelid = 'midia.screen_ad_settings'::regclass
  ) then
    alter table midia.screen_ad_settings
      add constraint screen_ad_settings_active_window_chk
      check (active_end_time > active_start_time);
  end if;
end $$;

create or replace function midia.sync_screen_active_minutes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
begin
  if new.active_end_time <= new.active_start_time then
    raise exception 'invalid_active_window';
  end if;
  new.active_minutes_per_day := greatest(
    60,
    floor(extract(epoch from (new.active_end_time - new.active_start_time)) / 60)::integer
  );
  return new;
end;
$$;

revoke all on function midia.sync_screen_active_minutes() from public, anon, authenticated;
grant execute on function midia.sync_screen_active_minutes() to service_role;

drop trigger if exists screen_ad_settings_sync_active_minutes_trg on midia.screen_ad_settings;
create trigger screen_ad_settings_sync_active_minutes_trg
before insert or update of active_start_time, active_end_time on midia.screen_ad_settings
for each row execute function midia.sync_screen_active_minutes();

-- ─────────────────────────────────────────────────────────────────────────────
-- Estado financeiro/revisão na própria campanha
-- ─────────────────────────────────────────────────────────────────────────────
alter table midia.campaigns
  add column if not exists paid_at timestamptz null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists reviewed_by_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz null,
  add column if not exists rejection_reason text null;

-- Uma campanha pode ter mais de um PIX gerado (ex.: primeiro expirou), mas
-- apenas uma transação confirmada será aceita pelo finalizador.
create table if not exists midia.campaign_payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references midia.campaigns(id) on delete cascade,
  pix_transaction_id uuid not null unique references public.pix_transactions(id) on delete restrict,
  provider text not null default 'bigcorps',
  txid text null,
  pix_code text not null,
  qr_code_url text null,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending'
    check (status in ('pending','confirmed','expired','cancelled','failed')),
  expires_at timestamptz not null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists midia_campaign_payments_campaign_idx
  on midia.campaign_payments(campaign_id, created_at desc);
create unique index if not exists midia_campaign_payments_one_confirmed_uidx
  on midia.campaign_payments(campaign_id)
  where status = 'confirmed';

-- ─────────────────────────────────────────────────────────────────────────────
-- Ocorrências contratadas
-- São a agenda concreta que o player recebe. O ZIP05 adicionará proof-of-play.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.campaign_occurrences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references midia.campaigns(id) on delete cascade,
  screen_id uuid not null references midia.screens(id) on delete cascade,
  creative_id uuid not null references midia.ad_creatives(id) on delete restrict,
  planned_at timestamptz not null,
  window_end_at timestamptz not null,
  display_seconds integer not null check (display_seconds in (30,45,60)),
  status text not null default 'scheduled'
    check (status in ('scheduled','played','missed','cancelled')),
  played_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, planned_at),
  check (window_end_at > planned_at)
);

create index if not exists midia_campaign_occurrences_screen_due_idx
  on midia.campaign_occurrences(screen_id, status, planned_at, window_end_at);
create index if not exists midia_campaign_occurrences_campaign_idx
  on midia.campaign_occurrences(campaign_id, status, planned_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper único para versionar + avisar o player.
-- Reaproveitado tanto pela playlist própria quanto pela aprovação de campanha.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.notify_screen_playlist(
  p_screen_id uuid,
  p_action text default 'refresh'
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, midia
as $$
declare
  v_version bigint;
begin
  update midia.screens
     set playlist_version = playlist_version + 1,
         updated_at = now()
   where id = p_screen_id
   returning playlist_version into v_version;

  if v_version is not null then
    perform realtime.send(
      jsonb_build_object(
        'screen_id', p_screen_id,
        'playlist_version', v_version,
        'acao', coalesce(nullif(trim(p_action),''),'refresh')
      ),
      'playlist',
      'midia-screen:' || p_screen_id::text,
      false
    );
  end if;

  return v_version;
end;
$$;

revoke all on function midia.notify_screen_playlist(uuid,text) from public, anon, authenticated;
grant execute on function midia.notify_screen_playlist(uuid,text) to service_role;

create or replace function midia.bump_screen_playlist_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, midia
as $$
declare
  v_screen_id uuid;
begin
  v_screen_id := case when tg_op = 'DELETE' then old.screen_id else new.screen_id end;
  perform midia.notify_screen_playlist(v_screen_id, lower(tg_op));
  return null;
end;
$$;

revoke all on function midia.bump_screen_playlist_version() from public, anon, authenticated;
grant execute on function midia.bump_screen_playlist_version() to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Confirmação idempotente da campanha após o PIX virar `confirmed`.
-- O valor vem do banco e precisa bater exatamente com o preço fotografado.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.finalize_campaign_payment(p_pix_transaction_id uuid)
returns table (
  campaign_id uuid,
  campaign_status text,
  already_processed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
declare
  v_tx public.pix_transactions%rowtype;
  v_payment midia.campaign_payments%rowtype;
  v_campaign midia.campaigns%rowtype;
  v_campaign_id uuid;
  v_was_processed boolean := false;
begin
  select * into v_tx
    from public.pix_transactions
   where id = p_pix_transaction_id
   for update;

  if not found or v_tx.purpose <> 'midia_campaign' then
    raise exception 'midia_payment_not_found';
  end if;
  if v_tx.status <> 'confirmed' then
    raise exception 'midia_payment_not_confirmed';
  end if;

  select * into v_payment
    from midia.campaign_payments
   where pix_transaction_id = p_pix_transaction_id
   for update;

  if found then
    v_campaign_id := v_payment.campaign_id;
  else
    begin
      v_campaign_id := v_tx.referencia_id::uuid;
    exception when others then
      raise exception 'midia_campaign_reference_invalid';
    end;

    insert into midia.campaign_payments (
      campaign_id, pix_transaction_id, provider, txid, pix_code, qr_code_url,
      amount_cents, status, expires_at, confirmed_at
    ) values (
      v_campaign_id, v_tx.id, coalesce(v_tx.payment_provider,'bigcorps'), v_tx.txid,
      coalesce(v_tx.pix_code,''), null, v_tx.amount_cents, 'confirmed',
      coalesce(v_tx.expires_at, now()), now()
    )
    returning * into v_payment;
  end if;

  select * into v_campaign
    from midia.campaigns
   where id = v_campaign_id
   for update;

  if not found then raise exception 'midia_campaign_not_found'; end if;
  if v_tx.amount_cents <> v_campaign.total_price_cents
     or v_payment.amount_cents <> v_campaign.total_price_cents then
    raise exception 'midia_payment_amount_mismatch';
  end if;

  v_was_processed := v_campaign.paid_at is not null;

  update midia.campaign_payments
     set status = 'confirmed',
         confirmed_at = coalesce(confirmed_at, now()),
         updated_at = now()
   where id = v_payment.id;

  update midia.campaign_inventory_holds
     set status = 'converted',
         expires_at = greatest(expires_at, now()),
         updated_at = now()
   where campaign_id = v_campaign.id
     and status in ('pending','converted');

  update midia.campaigns
     set paid_at = coalesce(paid_at, now()),
         status = case
           when status in ('scheduled','running','completed','approved','rejected','under_review') then status
           else 'under_review'
         end,
         quote_expires_at = greatest(quote_expires_at, now()),
         updated_at = now()
   where id = v_campaign.id
   returning status into v_campaign.status;

  return query select v_campaign.id, v_campaign.status, v_was_processed;
end;
$$;

revoke all on function midia.finalize_campaign_payment(uuid) from public, anon, authenticated;
grant execute on function midia.finalize_campaign_payment(uuid) to service_role;

-- O gatilho NÃO impede a confirmação bancária se houver um problema no módulo
-- Midia.Pro. A API de status também tenta finalizar novamente, deixando a falha
-- recuperável sem prender o PIX em pending.
create or replace function midia.on_pix_transaction_confirmed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
begin
  if new.purpose = 'midia_campaign'
     and new.status = 'confirmed'
     and old.status is distinct from 'confirmed' then
    begin
      perform midia.finalize_campaign_payment(new.id);
    exception when others then
      raise warning 'Midia.Pro: falha ao finalizar PIX %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

revoke all on function midia.on_pix_transaction_confirmed() from public, anon, authenticated;
grant execute on function midia.on_pix_transaction_confirmed() to service_role;

drop trigger if exists pix_transactions_midia_confirmed_trg on public.pix_transactions;
create trigger pix_transactions_midia_confirmed_trg
after update of status on public.pix_transactions
for each row execute function midia.on_pix_transaction_confirmed();

-- ─────────────────────────────────────────────────────────────────────────────
-- Gerador determinístico de agenda após aprovação.
-- Distribui campanhas flexíveis ao longo do horário ativo para reduzir colisão.
-- A janela é sempre explícita; o player não interrompe uma mídia já em curso.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.generate_campaign_occurrences(p_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  c midia.campaigns%rowtype;
  p midia.ad_product_catalog%rowtype;
  s midia.screen_ad_settings%rowtype;
  v_tz text;
  v_creative_id uuid;
  v_day date;
  v_last_day date;
  v_local_now timestamp;
  v_open timestamp;
  v_close timestamp;
  v_planned timestamp;
  v_window_end timestamp;
  v_active_minutes integer;
  v_hash bigint;
  v_offset integer;
  v_i integer;
  v_count integer := 0;
  v_occ integer;
  v_interval integer;
begin
  select * into c from midia.campaigns where id = p_campaign_id for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if c.paid_at is null then raise exception 'campaign_not_paid'; end if;

  select * into p from midia.ad_product_catalog where product_key = c.product_key and active = true;
  if not found then raise exception 'product_not_found'; end if;

  select * into s from midia.screen_ad_settings where screen_id = c.screen_id;
  if not found then raise exception 'screen_settings_not_found'; end if;

  select timezone into v_tz from midia.locations l
   join midia.screens sc on sc.location_id = l.id
   where sc.id = c.screen_id;
  v_tz := coalesce(v_tz,'America/Sao_Paulo');
  v_local_now := timezone(v_tz, now());
  v_active_minutes := greatest(1, floor(extract(epoch from (s.active_end_time - s.active_start_time))/60)::integer);
  v_hash := abs(hashtextextended(c.id::text, 0));

  select id into v_creative_id
    from midia.ad_creatives
   where campaign_id = c.id and status = 'ready'
   order by created_at desc
   limit 1;
  if v_creative_id is null then raise exception 'creative_not_ready'; end if;

  delete from midia.campaign_occurrences
   where campaign_id = c.id and status = 'scheduled';

  -- Experimente: o próximo espaço disponível a partir de ~5 minutos, dentro
  -- dos dias já reservados no quote.
  if p.schedule_kind = 'flexible_once' then
    v_day := greatest(c.start_date, v_local_now::date);
    if v_day is null then v_day := v_local_now::date; end if;
    v_last_day := coalesce(c.end_date, v_day);

    loop
      exit when v_day > v_last_day;
      v_open := v_day + s.active_start_time;
      v_close := v_day + s.active_end_time;
      v_planned := greatest(v_open + interval '5 minutes', v_local_now + interval '5 minutes');
      if v_planned < v_close then
        v_window_end := least(v_close, v_planned + interval '2 hours');
        insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
        values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds);
        v_count := 1;
        exit;
      end if;
      v_day := v_day + 1;
    end loop;

  elsif p.schedule_kind = 'date_once' then
    v_day := c.schedule_date;
    if v_day is null then raise exception 'schedule_date_required'; end if;
    v_open := v_day + s.active_start_time;
    v_close := v_day + s.active_end_time;
    v_offset := mod(v_hash, greatest(v_active_minutes - 5,1));
    v_planned := v_open + make_interval(mins => v_offset);
    if v_day = v_local_now::date and v_planned < v_local_now + interval '2 minutes' then
      v_planned := v_local_now + interval '2 minutes';
    end if;
    if v_planned < v_close then
      v_window_end := least(v_close, v_planned + interval '2 hours');
      insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
      values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds);
      v_count := 1;
    end if;

  elsif p.schedule_kind = 'window_once' then
    if c.schedule_date is null or c.schedule_time is null then raise exception 'schedule_window_required'; end if;
    v_open := c.schedule_date + c.schedule_time;
    v_window_end := v_open + make_interval(mins => coalesce(p.window_minutes,60));
    if v_window_end <= v_local_now then raise exception 'campaign_window_elapsed'; end if;
    v_offset := mod(v_hash, greatest(coalesce(p.window_minutes,60) - 2,1));
    v_planned := v_open + make_interval(mins => v_offset);
    if v_planned < v_local_now + interval '1 minute' then v_planned := v_local_now + interval '1 minute'; end if;
    if v_planned < v_window_end then
      insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
      values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds);
      v_count := 1;
    end if;

  elsif p.schedule_kind = 'recurring_fixed' then
    v_day := c.start_date;
    v_last_day := c.end_date;
    if v_day is null or v_last_day is null then raise exception 'campaign_dates_required'; end if;
    v_occ := greatest(1, coalesce(p.occurrences_per_day,1)::integer);

    while v_day <= v_last_day loop
      v_open := v_day + s.active_start_time;
      v_close := v_day + s.active_end_time;

      for v_i in 0..(v_occ - 1) loop
        if c.schedule_time is not null then
          v_planned := v_day + c.schedule_time;
          v_window_end := v_planned + make_interval(mins => coalesce(p.window_minutes,60));
        else
          -- centro de cada fatia do dia; campanhas diferentes recebem pequeno
          -- deslocamento determinístico sem sair da fatia.
          v_offset := floor((v_i + 0.5) * v_active_minutes / v_occ)::integer;
          v_offset := least(v_active_minutes - 1, greatest(0, v_offset + mod(v_hash, greatest(floor(v_active_minutes / v_occ / 3)::integer,1))));
          v_planned := v_open + make_interval(mins => v_offset);
          v_window_end := least(v_close, v_planned + interval '60 minutes');
        end if;

        if v_window_end > v_local_now and v_planned < v_close then
          if v_planned < v_local_now + interval '1 minute' then
            v_planned := v_local_now + interval '1 minute';
          end if;
          if v_planned < v_window_end and v_planned < v_close then
            insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
            values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds)
            on conflict (campaign_id,planned_at) do nothing;
            if found then v_count := v_count + 1; end if;
          end if;
        end if;
      end loop;
      v_day := v_day + 1;
    end loop;

  elsif p.schedule_kind = 'recurring_interval' then
    v_day := c.start_date;
    v_last_day := c.end_date;
    if v_day is null or v_last_day is null then raise exception 'campaign_dates_required'; end if;
    v_interval := greatest(5, coalesce(p.interval_minutes,60));

    while v_day <= v_last_day loop
      v_open := v_day + s.active_start_time;
      v_close := v_day + s.active_end_time;
      v_offset := mod(v_hash, v_interval);
      v_planned := v_open + make_interval(mins => v_offset);

      while v_planned < v_close loop
        v_window_end := least(v_close, v_planned + make_interval(mins => v_interval));
        if v_window_end > v_local_now then
          if v_planned < v_local_now + interval '1 minute' then
            v_planned := v_local_now + interval '1 minute';
          end if;
          if v_planned < v_window_end and v_planned < v_close then
            insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
            values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds)
            on conflict (campaign_id,planned_at) do nothing;
            if found then v_count := v_count + 1; end if;
          end if;
        end if;
        v_planned := v_planned + make_interval(mins => v_interval);
      end loop;
      v_day := v_day + 1;
    end loop;
  end if;

  if v_count <= 0 then raise exception 'campaign_window_elapsed'; end if;
  return v_count;
end;
$$;

revoke all on function midia.generate_campaign_occurrences(uuid) from public, anon, authenticated;
grant execute on function midia.generate_campaign_occurrences(uuid) to service_role;

create or replace function midia.review_campaign(
  p_campaign_id uuid,
  p_publisher_id uuid,
  p_reviewer_user_id uuid,
  p_action text,
  p_reason text default null
)
returns table (
  campaign_status text,
  occurrence_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  c midia.campaigns%rowtype;
  v_count integer := 0;
begin
  select * into c
    from midia.campaigns
   where id = p_campaign_id
     and publisher_id = p_publisher_id
   for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if c.paid_at is null then raise exception 'campaign_not_paid'; end if;

  if p_action = 'reject' then
    if c.status <> 'under_review' then raise exception 'campaign_not_under_review'; end if;
    if char_length(trim(coalesce(p_reason,''))) < 5 then raise exception 'rejection_reason_required'; end if;
    update midia.campaigns
       set status = 'rejected',
           rejection_reason = left(trim(p_reason),500),
           reviewed_at = now(),
           reviewed_by_user_id = p_reviewer_user_id,
           updated_at = now()
     where id = c.id;
    return query select 'rejected'::text, 0;
    return;
  end if;

  if p_action <> 'approve' then raise exception 'invalid_review_action'; end if;
  if c.status <> 'under_review' then raise exception 'campaign_not_under_review'; end if;

  v_count := midia.generate_campaign_occurrences(c.id);

  update midia.campaigns
     set status = 'scheduled',
         rejection_reason = null,
         reviewed_at = now(),
         reviewed_by_user_id = p_reviewer_user_id,
         approved_at = now(),
         updated_at = now()
   where id = c.id;

  perform midia.notify_screen_playlist(c.screen_id, 'campaign_approved');
  return query select 'scheduled'::text, v_count;
end;
$$;

revoke all on function midia.review_campaign(uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function midia.review_campaign(uuid,uuid,uuid,text,text) to service_role;

-- updated_at

drop trigger if exists campaign_payments_touch_updated_at on midia.campaign_payments;
create trigger campaign_payments_touch_updated_at
before update on midia.campaign_payments
for each row execute function midia.touch_updated_at();

drop trigger if exists campaign_occurrences_touch_updated_at on midia.campaign_occurrences;
create trigger campaign_occurrences_touch_updated_at
before update on midia.campaign_occurrences
for each row execute function midia.touch_updated_at();

-- Privado / server-only
alter table midia.campaign_payments enable row level security;
alter table midia.campaign_occurrences enable row level security;
revoke all on midia.campaign_payments from public, anon, authenticated;
revoke all on midia.campaign_occurrences from public, anon, authenticated;
grant all on midia.campaign_payments to service_role;
grant all on midia.campaign_occurrences to service_role;

commit;

-- =============================================================================
-- FIM DA FASE ZIP04
-- =============================================================================

-- =============================================================================
-- INÍCIO DA FASE ZIP05
-- =============================================================================

-- Midia.Pro — ZIP 05 / Financeiro + Proof-of-Play
-- Aplicar SOMENTE depois dos SQLs ZIP01, ZIP02, ZIP03 e ZIP04.
--
-- Esta etapa:
--   • registra proof-of-play validado por ocorrência e por device pareado;
--   • remunera somente exibições efetivamente comprovadas;
--   • fotografa 80/20 para vendas originadas no QR da própria tela e 50/50
--     para vendas diretas/rede;
--   • separa receita bruta, custo do provedor, líquido, parceiro e BigCorps;
--   • mantém carteira do publisher com pendente/disponível/em saque/repassado;
--   • cria ledger auditável e saque manual via PIX, no padrão do ConviteIA;
--   • deixa funções de conclusão/estorno de saque prontas para o Admin do ZIP06.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Custo do provedor. Hoje a infraestrutura PIX pode deixar esse valor em zero;
-- se houver custo por transação, o backend/admin pode gravá-lo ANTES da primeira
-- exibição. O settlement fotografa o valor para vendas antigas nunca mudarem.
-- ─────────────────────────────────────────────────────────────────────────────
alter table midia.campaign_payments
  add column if not exists provider_fee_cents integer not null default 0
    check (provider_fee_cents >= 0 and provider_fee_cents <= amount_cents);

-- ─────────────────────────────────────────────────────────────────────────────
-- Carteira do parceiro
-- pending = participação já contratada, ainda dependente de proof-of-play.
-- available = proof-of-play confirmado e liberado para saque.
-- withdrawal_pending = valor reservado por um pedido de saque em andamento.
-- withdrawn = total efetivamente repassado.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.publisher_wallets (
  publisher_id uuid primary key references midia.publishers(id) on delete cascade,
  pending_cents bigint not null default 0 check (pending_cents >= 0),
  available_cents bigint not null default 0 check (available_cents >= 0),
  withdrawal_pending_cents bigint not null default 0 check (withdrawal_pending_cents >= 0),
  withdrawn_cents bigint not null default 0 check (withdrawn_cents >= 0),
  total_earned_cents bigint not null default 0 check (total_earned_cents >= 0),
  updated_at timestamptz not null default now()
);

insert into midia.publisher_wallets(publisher_id)
select id from midia.publishers
on conflict (publisher_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Settlement imutável por campanha/tela deste MVP.
-- Quando no futuro uma campanha puder comprar várias telas, este mesmo padrão
-- migra naturalmente para um settlement por placement/tela.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.campaign_settlements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references midia.campaigns(id) on delete cascade,
  publisher_id uuid not null references midia.publishers(id) on delete restrict,
  screen_id uuid not null references midia.screens(id) on delete restrict,
  origin_kind text not null check (origin_kind in ('screen_qr','direct','network')),
  gross_cents bigint not null check (gross_cents > 0),
  provider_fee_cents bigint not null default 0 check (provider_fee_cents >= 0),
  net_cents bigint not null check (net_cents >= 0),
  publisher_share_bps integer not null check (publisher_share_bps between 0 and 10000),
  publisher_total_cents bigint not null check (publisher_total_cents >= 0),
  bigcorps_total_cents bigint not null check (bigcorps_total_cents >= 0),
  total_occurrences integer not null check (total_occurrences > 0),
  delivered_occurrences integer not null default 0 check (delivered_occurrences >= 0),
  publisher_earned_cents bigint not null default 0 check (publisher_earned_cents >= 0),
  bigcorps_earned_cents bigint not null default 0 check (bigcorps_earned_cents >= 0),
  status text not null default 'pending' check (status in ('pending','earning','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provider_fee_cents <= gross_cents),
  check (net_cents = gross_cents - provider_fee_cents),
  check (publisher_total_cents + bigcorps_total_cents = net_cents),
  check (delivered_occurrences <= total_occurrences),
  check (publisher_earned_cents <= publisher_total_cents),
  check (bigcorps_earned_cents <= bigcorps_total_cents)
);

create index if not exists midia_campaign_settlements_publisher_idx
  on midia.campaign_settlements(publisher_id, status, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Proof-of-play aceito. Uma ocorrência pode ser remunerada uma única vez e um
-- client_event_id não pode ser reaproveitado em outra ocorrência.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.play_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  occurrence_id uuid not null unique references midia.campaign_occurrences(id) on delete restrict,
  campaign_id uuid not null references midia.campaigns(id) on delete restrict,
  screen_id uuid not null references midia.screens(id) on delete restrict,
  device_id uuid not null references midia.devices(id) on delete restrict,
  client_started_at timestamptz not null,
  client_ended_at timestamptz not null,
  played_ms integer not null check (played_ms > 0),
  display_seconds integer not null check (display_seconds in (30,45,60)),
  offline_at_completion boolean not null default false,
  app_version text null,
  ip_hash text null,
  publisher_earned_cents bigint not null default 0 check (publisher_earned_cents >= 0),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (client_ended_at >= client_started_at)
);

create index if not exists midia_play_events_campaign_idx
  on midia.play_events(campaign_id, received_at desc);
create index if not exists midia_play_events_screen_idx
  on midia.play_events(screen_id, received_at desc);
create index if not exists midia_play_events_device_idx
  on midia.play_events(device_id, received_at desc);

alter table midia.campaign_occurrences
  add column if not exists proof_event_id uuid null references midia.play_events(id) on delete set null,
  add column if not exists proof_validated_at timestamptz null,
  add column if not exists publisher_earned_cents bigint not null default 0 check (publisher_earned_cents >= 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ledger de parceiro. Os deltas mostram exatamente como a carteira mudou.
-- Uma chave idempotente impede duplicação em reentregas.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.publisher_ledger (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references midia.publishers(id) on delete restrict,
  campaign_id uuid null references midia.campaigns(id) on delete set null,
  occurrence_id uuid null references midia.campaign_occurrences(id) on delete set null,
  withdrawal_id uuid null,
  entry_key text not null unique,
  entry_type text not null check (entry_type in (
    'campaign_pending','play_earned','withdrawal_requested','withdrawal_completed',
    'withdrawal_reversed','campaign_reversed','adjustment'
  )),
  pending_delta_cents bigint not null default 0,
  available_delta_cents bigint not null default 0,
  withdrawal_delta_cents bigint not null default 0,
  withdrawn_delta_cents bigint not null default 0,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists midia_publisher_ledger_publisher_idx
  on midia.publisher_ledger(publisher_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Perfil de repasse e solicitações de saque.
-- O documento fica somente no schema privado e nunca é devolvido completo pelo
-- dashboard. Saque mínimo inicial: R$ 50,00.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.payout_profiles (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null unique references midia.publishers(id) on delete cascade,
  full_name text not null,
  document_type text not null check (document_type in ('cpf','cnpj')),
  document_digits text not null,
  email text not null,
  pix_key text not null,
  pix_key_type text not null check (pix_key_type in ('cpf','cnpj','email','phone','random')),
  verified boolean not null default false,
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(full_name) between 5 and 140),
  check ((document_type='cpf' and char_length(document_digits)=11) or (document_type='cnpj' and char_length(document_digits)=14)),
  check (char_length(email) between 5 and 254),
  check (char_length(pix_key) between 3 and 180)
);

create table if not exists midia.withdrawals (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references midia.publishers(id) on delete restrict,
  payout_profile_id uuid not null references midia.payout_profiles(id) on delete restrict,
  amount_cents bigint not null check (amount_cents >= 5000),
  status text not null default 'pending' check (status in ('pending','processing','paid','rejected','cancelled')),
  error text null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz null,
  completed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists midia_withdrawals_publisher_idx
  on midia.withdrawals(publisher_id, requested_at desc);
create unique index if not exists midia_withdrawals_one_open_uidx
  on midia.withdrawals(publisher_id)
  where status in ('pending','processing');

-- FK do ledger só pode ser criada depois de withdrawals existir.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname='publisher_ledger_withdrawal_fk'
       and conrelid='midia.publisher_ledger'::regclass
  ) then
    alter table midia.publisher_ledger
      add constraint publisher_ledger_withdrawal_fk
      foreign key (withdrawal_id) references midia.withdrawals(id) on delete set null;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Snapshot financeiro ao aprovar a campanha.
-- screen_qr = venda originada no ponto do parceiro => 80% publisher.
-- direct/network = venda captada pela Midia.Pro => 50% publisher.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.ensure_campaign_settlement(p_campaign_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
declare
  c midia.campaigns%rowtype;
  p midia.campaign_payments%rowtype;
  v_existing uuid;
  v_count integer;
  v_fee bigint;
  v_net bigint;
  v_share integer;
  v_publisher bigint;
  v_bigcorps bigint;
  v_id uuid;
begin
  select id into v_existing from midia.campaign_settlements where campaign_id=p_campaign_id;
  if v_existing is not null then return v_existing; end if;

  select * into c from midia.campaigns where id=p_campaign_id for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if c.paid_at is null then raise exception 'campaign_not_paid'; end if;

  select * into p
    from midia.campaign_payments
   where campaign_id=c.id and status='confirmed'
   order by confirmed_at desc nulls last, created_at desc
   limit 1;
  if not found then raise exception 'campaign_payment_not_confirmed'; end if;
  if p.amount_cents::bigint <> c.total_price_cents::bigint then
    raise exception 'campaign_payment_amount_mismatch';
  end if;

  select count(*)::integer into v_count
    from midia.campaign_occurrences
   where campaign_id=c.id and status <> 'cancelled';
  if coalesce(v_count,0) <= 0 then raise exception 'campaign_occurrences_missing'; end if;

  v_fee := greatest(0, least(p.amount_cents, coalesce(p.provider_fee_cents,0)));
  v_net := greatest(0, p.amount_cents::bigint - v_fee);
  v_share := case when c.origin_kind='screen_qr' then 8000 else 5000 end;
  v_publisher := floor(v_net * v_share / 10000.0)::bigint;
  v_bigcorps := v_net - v_publisher;

  insert into midia.publisher_wallets(publisher_id)
  values (c.publisher_id)
  on conflict (publisher_id) do nothing;

  insert into midia.campaign_settlements(
    campaign_id,publisher_id,screen_id,origin_kind,gross_cents,provider_fee_cents,
    net_cents,publisher_share_bps,publisher_total_cents,bigcorps_total_cents,
    total_occurrences
  ) values (
    c.id,c.publisher_id,c.screen_id,c.origin_kind,p.amount_cents,v_fee,
    v_net,v_share,v_publisher,v_bigcorps,v_count
  )
  on conflict (campaign_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from midia.campaign_settlements where campaign_id=c.id;
    return v_id;
  end if;

  update midia.publisher_wallets
     set pending_cents = pending_cents + v_publisher,
         updated_at = now()
   where publisher_id=c.publisher_id;

  insert into midia.publisher_ledger(
    publisher_id,campaign_id,entry_key,entry_type,pending_delta_cents,
    description,metadata
  ) values (
    c.publisher_id,c.id,'campaign:'||c.id::text||':pending','campaign_pending',v_publisher,
    'Participação contratada aguardando proof-of-play',
    jsonb_build_object('origin_kind',c.origin_kind,'share_bps',v_share,'gross_cents',p.amount_cents,'provider_fee_cents',v_fee,'occurrences',v_count)
  ) on conflict (entry_key) do nothing;

  return v_id;
end;
$$;

revoke all on function midia.ensure_campaign_settlement(uuid) from public, anon, authenticated;
grant execute on function midia.ensure_campaign_settlement(uuid) to service_role;

-- Substitui a função do ZIP04 apenas para acrescentar o snapshot financeiro
-- depois que a agenda concreta tiver sido gerada.
create or replace function midia.review_campaign(
  p_campaign_id uuid,
  p_publisher_id uuid,
  p_reviewer_user_id uuid,
  p_action text,
  p_reason text default null
)
returns table (
  campaign_status text,
  occurrence_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  c midia.campaigns%rowtype;
  v_count integer := 0;
begin
  select * into c
    from midia.campaigns
   where id = p_campaign_id
     and publisher_id = p_publisher_id
   for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if c.paid_at is null then raise exception 'campaign_not_paid'; end if;

  if p_action = 'reject' then
    if c.status <> 'under_review' then raise exception 'campaign_not_under_review'; end if;
    if char_length(trim(coalesce(p_reason,''))) < 5 then raise exception 'rejection_reason_required'; end if;
    update midia.campaigns
       set status = 'rejected',
           rejection_reason = left(trim(p_reason),500),
           reviewed_at = now(),
           reviewed_by_user_id = p_reviewer_user_id,
           updated_at = now()
     where id = c.id;
    return query select 'rejected'::text, 0;
    return;
  end if;

  if p_action <> 'approve' then raise exception 'invalid_review_action'; end if;
  if c.status <> 'under_review' then raise exception 'campaign_not_under_review'; end if;

  v_count := midia.generate_campaign_occurrences(c.id);
  perform midia.ensure_campaign_settlement(c.id);

  update midia.campaigns
     set status = 'scheduled',
         rejection_reason = null,
         reviewed_at = now(),
         reviewed_by_user_id = p_reviewer_user_id,
         approved_at = now(),
         updated_at = now()
   where id = c.id;

  perform midia.notify_screen_playlist(c.screen_id, 'campaign_approved');
  return query select 'scheduled'::text, v_count;
end;
$$;

revoke all on function midia.review_campaign(uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function midia.review_campaign(uuid,uuid,uuid,text,text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Proof-of-play transacional.
-- A assinatura HMAC do manifesto é validada na API Next.js. Esta função valida
-- novamente device/tela/janela/duração e movimenta settlement + wallet de forma
-- atômica. Reentrega da mesma ocorrência nunca gera receita duas vezes.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.record_play_event(
  p_occurrence_id uuid,
  p_device_id uuid,
  p_client_event_id uuid,
  p_client_started_at timestamptz,
  p_client_ended_at timestamptz,
  p_played_ms integer,
  p_offline boolean,
  p_app_version text,
  p_ip_hash text
)
returns table (
  play_event_id uuid,
  already_processed boolean,
  publisher_earned_cents bigint,
  wallet_available_cents bigint,
  wallet_pending_cents bigint,
  campaign_status text
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  o midia.campaign_occurrences%rowtype;
  d midia.devices%rowtype;
  s midia.campaign_settlements%rowtype;
  v_event_id uuid;
  v_existing_earned bigint;
  v_min_ms integer;
  v_max_ms integer;
  v_new_delivered integer;
  v_target_publisher bigint;
  v_target_bigcorps bigint;
  v_delta_publisher bigint;
  v_wallet_available bigint;
  v_wallet_pending bigint;
  v_campaign_status text;
begin
  select * into o from midia.campaign_occurrences where id=p_occurrence_id for update;
  if not found then raise exception 'occurrence_not_found'; end if;

  select * into d from midia.devices where id=p_device_id and revoked_at is null and paired_at is not null;
  if not found or d.screen_id <> o.screen_id then raise exception 'device_screen_mismatch'; end if;

  if o.status='played' and o.proof_event_id is not null then
    select publisher_earned_cents into v_existing_earned from midia.play_events where id=o.proof_event_id;
    select available_cents,pending_cents into v_wallet_available,v_wallet_pending
      from midia.publisher_wallets w
      join midia.campaigns c on c.publisher_id=w.publisher_id
     where c.id=o.campaign_id;
    select status into v_campaign_status from midia.campaigns where id=o.campaign_id;
    return query select o.proof_event_id,true,coalesce(v_existing_earned,0),coalesce(v_wallet_available,0),coalesce(v_wallet_pending,0),v_campaign_status;
    return;
  end if;

  if o.status <> 'scheduled' then raise exception 'occurrence_not_scheduled'; end if;
  if p_client_started_at is null or p_client_ended_at is null or p_client_ended_at < p_client_started_at then
    raise exception 'invalid_client_timing';
  end if;

  -- 80% da duração contratada precisa ter sido efetivamente percorrida.
  -- O teto evita eventos absurdos/corrompidos e ainda tolera timer de fallback.
  v_min_ms := greatest(1000, floor(o.display_seconds * 1000 * 0.80)::integer);
  v_max_ms := (o.display_seconds + 120) * 1000;
  if p_played_ms < v_min_ms or p_played_ms > v_max_ms then raise exception 'invalid_play_duration'; end if;

  -- Tolerância de relógio/dispositivo: 15 min antes e depois da janela.
  if p_client_started_at < o.planned_at - interval '15 minutes'
     or p_client_started_at > o.window_end_at + interval '15 minutes' then
    raise exception 'play_outside_window';
  end if;

  perform midia.ensure_campaign_settlement(o.campaign_id);
  select * into s from midia.campaign_settlements where campaign_id=o.campaign_id for update;
  if not found or s.status='cancelled' then raise exception 'settlement_unavailable'; end if;

  -- Idempotência por client_event_id também cobre reenvio offline do navegador.
  select id,publisher_earned_cents into v_event_id,v_existing_earned
    from midia.play_events where client_event_id=p_client_event_id;
  if found then
    select available_cents,pending_cents into v_wallet_available,v_wallet_pending
      from midia.publisher_wallets where publisher_id=s.publisher_id;
    select status into v_campaign_status from midia.campaigns where id=o.campaign_id;
    return query select v_event_id,true,coalesce(v_existing_earned,0),coalesce(v_wallet_available,0),coalesce(v_wallet_pending,0),v_campaign_status;
    return;
  end if;

  v_new_delivered := s.delivered_occurrences + 1;
  if v_new_delivered > s.total_occurrences then raise exception 'settlement_overdelivery'; end if;

  -- O cálculo cumulativo absorve centavos de arredondamento. Na última exibição
  -- entregue, publisher_earned_cents chega exatamente ao total fotografado.
  v_target_publisher := floor(s.publisher_total_cents * v_new_delivered / s.total_occurrences::numeric)::bigint;
  v_target_bigcorps := floor(s.bigcorps_total_cents * v_new_delivered / s.total_occurrences::numeric)::bigint;
  v_delta_publisher := greatest(0, v_target_publisher - s.publisher_earned_cents);

  insert into midia.play_events(
    client_event_id,occurrence_id,campaign_id,screen_id,device_id,
    client_started_at,client_ended_at,played_ms,display_seconds,
    offline_at_completion,app_version,ip_hash,publisher_earned_cents
  ) values (
    p_client_event_id,o.id,o.campaign_id,o.screen_id,d.id,
    p_client_started_at,p_client_ended_at,p_played_ms,o.display_seconds,
    coalesce(p_offline,false),left(coalesce(p_app_version,''),40),left(coalesce(p_ip_hash,''),64),v_delta_publisher
  ) returning id into v_event_id;

  update midia.campaign_occurrences
     set status='played',
         played_at=p_client_ended_at,
         proof_event_id=v_event_id,
         proof_validated_at=now(),
         publisher_earned_cents=v_delta_publisher,
         updated_at=now()
   where id=o.id;

  update midia.campaign_settlements
     set delivered_occurrences=v_new_delivered,
         publisher_earned_cents=v_target_publisher,
         bigcorps_earned_cents=v_target_bigcorps,
         status=case when v_new_delivered>=total_occurrences then 'completed' else 'earning' end,
         updated_at=now()
   where id=s.id;

  insert into midia.publisher_wallets(publisher_id)
  values (s.publisher_id)
  on conflict (publisher_id) do nothing;

  update midia.publisher_wallets
     set pending_cents=pending_cents-v_delta_publisher,
         available_cents=available_cents+v_delta_publisher,
         total_earned_cents=total_earned_cents+v_delta_publisher,
         updated_at=now()
   where publisher_id=s.publisher_id
   returning available_cents,pending_cents into v_wallet_available,v_wallet_pending;

  insert into midia.publisher_ledger(
    publisher_id,campaign_id,occurrence_id,entry_key,entry_type,
    pending_delta_cents,available_delta_cents,description,metadata
  ) values (
    s.publisher_id,o.campaign_id,o.id,'occurrence:'||o.id::text||':earned','play_earned',
    -v_delta_publisher,v_delta_publisher,'Exibição comprovada e liberada para saque',
    jsonb_build_object('play_event_id',v_event_id,'display_seconds',o.display_seconds,'offline',coalesce(p_offline,false))
  ) on conflict (entry_key) do nothing;

  update midia.campaigns
     set status=case when v_new_delivered>=s.total_occurrences then 'completed' else 'running' end,
         updated_at=now()
   where id=o.campaign_id
     and status in ('scheduled','running','completed')
   returning status into v_campaign_status;

  return query select v_event_id,false,v_delta_publisher,v_wallet_available,v_wallet_pending,coalesce(v_campaign_status,'running');
end;
$$;

revoke all on function midia.record_play_event(uuid,uuid,uuid,timestamptz,timestamptz,integer,boolean,text,text) from public, anon, authenticated;
grant execute on function midia.record_play_event(uuid,uuid,uuid,timestamptz,timestamptz,integer,boolean,text,text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Saque manual: reserva o saldo disponível imediatamente para impedir duas
-- solicitações concorrentes. O PIX é realizado operacionalmente e o ZIP06 terá
-- a tela Admin para concluir/rejeitar a solicitação.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.request_publisher_withdrawal(
  p_publisher_id uuid,
  p_payout_profile_id uuid,
  p_amount_cents bigint
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  w midia.publisher_wallets%rowtype;
  v_id uuid;
begin
  if p_amount_cents < 5000 then raise exception 'withdrawal_below_minimum'; end if;
  if not exists (
    select 1 from midia.payout_profiles
     where id=p_payout_profile_id and publisher_id=p_publisher_id
  ) then raise exception 'payout_profile_invalid'; end if;
  if exists (
    select 1 from midia.withdrawals
     where publisher_id=p_publisher_id and status in ('pending','processing')
  ) then raise exception 'withdrawal_already_open'; end if;

  insert into midia.publisher_wallets(publisher_id) values (p_publisher_id)
  on conflict (publisher_id) do nothing;

  select * into w from midia.publisher_wallets where publisher_id=p_publisher_id for update;
  if w.available_cents < p_amount_cents then raise exception 'withdrawal_insufficient_balance'; end if;

  insert into midia.withdrawals(publisher_id,payout_profile_id,amount_cents,status)
  values (p_publisher_id,p_payout_profile_id,p_amount_cents,'pending')
  returning id into v_id;

  update midia.publisher_wallets
     set available_cents=available_cents-p_amount_cents,
         withdrawal_pending_cents=withdrawal_pending_cents+p_amount_cents,
         updated_at=now()
   where publisher_id=p_publisher_id;

  insert into midia.publisher_ledger(
    publisher_id,withdrawal_id,entry_key,entry_type,available_delta_cents,
    withdrawal_delta_cents,description
  ) values (
    p_publisher_id,v_id,'withdrawal:'||v_id::text||':requested','withdrawal_requested',
    -p_amount_cents,p_amount_cents,'Saque PIX solicitado'
  );

  return v_id;
end;
$$;

revoke all on function midia.request_publisher_withdrawal(uuid,uuid,bigint) from public, anon, authenticated;
grant execute on function midia.request_publisher_withdrawal(uuid,uuid,bigint) to service_role;

create or replace function midia.set_withdrawal_status(
  p_withdrawal_id uuid,
  p_status text,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  x midia.withdrawals%rowtype;
begin
  if p_status not in ('processing','paid','rejected','cancelled') then raise exception 'withdrawal_status_invalid'; end if;
  select * into x from midia.withdrawals where id=p_withdrawal_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  if x.status in ('paid','rejected','cancelled') then return x.status; end if;

  if p_status='processing' then
    update midia.withdrawals set status='processing',processed_at=coalesce(processed_at,now()),error=null,updated_at=now() where id=x.id;
    return 'processing';
  end if;

  if p_status='paid' then
    update midia.publisher_wallets
       set withdrawal_pending_cents=withdrawal_pending_cents-x.amount_cents,
           withdrawn_cents=withdrawn_cents+x.amount_cents,
           updated_at=now()
     where publisher_id=x.publisher_id;
    update midia.withdrawals
       set status='paid',processed_at=coalesce(processed_at,now()),completed_at=now(),error=null,updated_at=now()
     where id=x.id;
    insert into midia.publisher_ledger(
      publisher_id,withdrawal_id,entry_key,entry_type,withdrawal_delta_cents,withdrawn_delta_cents,description
    ) values (
      x.publisher_id,x.id,'withdrawal:'||x.id::text||':paid','withdrawal_completed',-x.amount_cents,x.amount_cents,'Saque PIX concluído'
    ) on conflict (entry_key) do nothing;
    return 'paid';
  end if;

  -- Rejeição/cancelamento devolve o valor reservado para disponível.
  update midia.publisher_wallets
     set withdrawal_pending_cents=withdrawal_pending_cents-x.amount_cents,
         available_cents=available_cents+x.amount_cents,
         updated_at=now()
   where publisher_id=x.publisher_id;
  update midia.withdrawals
     set status=p_status,processed_at=coalesce(processed_at,now()),completed_at=now(),error=left(nullif(trim(coalesce(p_error,'')),''),500),updated_at=now()
   where id=x.id;
  insert into midia.publisher_ledger(
    publisher_id,withdrawal_id,entry_key,entry_type,available_delta_cents,withdrawal_delta_cents,description,metadata
  ) values (
    x.publisher_id,x.id,'withdrawal:'||x.id::text||':reversed','withdrawal_reversed',x.amount_cents,-x.amount_cents,'Saque devolvido ao saldo disponível',jsonb_build_object('status',p_status,'error',p_error)
  ) on conflict (entry_key) do nothing;
  return p_status;
end;
$$;

revoke all on function midia.set_withdrawal_status(uuid,text,text) from public, anon, authenticated;
grant execute on function midia.set_withdrawal_status(uuid,text,text) to service_role;

-- updated_at
drop trigger if exists publisher_wallets_touch_updated_at on midia.publisher_wallets;
create trigger publisher_wallets_touch_updated_at before update on midia.publisher_wallets
for each row execute function midia.touch_updated_at();

drop trigger if exists campaign_settlements_touch_updated_at on midia.campaign_settlements;
create trigger campaign_settlements_touch_updated_at before update on midia.campaign_settlements
for each row execute function midia.touch_updated_at();

drop trigger if exists payout_profiles_touch_updated_at on midia.payout_profiles;
create trigger payout_profiles_touch_updated_at before update on midia.payout_profiles
for each row execute function midia.touch_updated_at();

drop trigger if exists withdrawals_touch_updated_at on midia.withdrawals;
create trigger withdrawals_touch_updated_at before update on midia.withdrawals
for each row execute function midia.touch_updated_at();

-- Segurança: tudo server-only.
alter table midia.publisher_wallets enable row level security;
alter table midia.campaign_settlements enable row level security;
alter table midia.play_events enable row level security;
alter table midia.publisher_ledger enable row level security;
alter table midia.payout_profiles enable row level security;
alter table midia.withdrawals enable row level security;

revoke all on midia.publisher_wallets from public, anon, authenticated;
revoke all on midia.campaign_settlements from public, anon, authenticated;
revoke all on midia.play_events from public, anon, authenticated;
revoke all on midia.publisher_ledger from public, anon, authenticated;
revoke all on midia.payout_profiles from public, anon, authenticated;
revoke all on midia.withdrawals from public, anon, authenticated;

grant all on midia.publisher_wallets to service_role;
grant all on midia.campaign_settlements to service_role;
grant all on midia.play_events to service_role;
grant all on midia.publisher_ledger to service_role;
grant all on midia.payout_profiles to service_role;
grant all on midia.withdrawals to service_role;

-- Backfill seguro caso ZIP04 tenha sido testado antes de este SQL ser aplicado.
do $$
declare r record;
begin
  for r in
    select c.id
      from midia.campaigns c
     where c.paid_at is not null
       and c.status in ('scheduled','running','completed')
       and exists (select 1 from midia.campaign_occurrences o where o.campaign_id=c.id and o.status<>'cancelled')
  loop
    begin
      perform midia.ensure_campaign_settlement(r.id);
    exception when others then
      raise warning 'Midia.Pro ZIP05 backfill settlement %: %', r.id, sqlerrm;
    end;
  end loop;
end $$;

commit;

-- =============================================================================
-- FIM DA FASE ZIP05
-- =============================================================================

-- =============================================================================
-- INÍCIO DA FASE ZIP06
-- =============================================================================

-- Midia.Pro — ZIP 06 / Lançamento + Rede + Administração
-- Aplicar SOMENTE depois dos SQLs ZIP01..ZIP05.
--
-- Esta etapa:
--   • cria campanhas institucionais/fillers administradas pela BigCorps;
--   • adiciona recuperação automática de ocorrências pagas não entregues;
--   • registra auditoria das ações administrativas do Midia.Pro;
--   • mantém toda a superfície financeira e administrativa server-only;
--   • não automatiza o PIX do saque: o Admin apenas muda o estado depois da
--     conferência/repasse operacional, igual ao modelo já usado no ConviteIA.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Mensalidade das telas de uso próprio / Pro.
-- Reaproveita a cobrança PIX retida já usada pelo Midia.Pro no ZIP04. O
-- `purpose` próprio impede crédito em company_balance e permite conciliação
-- independente da publicidade vendida na rede.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pix_transactions
  drop constraint if exists pix_transactions_purpose_check;

alter table public.pix_transactions
  add constraint pix_transactions_purpose_check
  check (purpose = any (array[
    'payment'::text,
    'consulta_fee'::text,
    'print_fee'::text,
    'conviteria_presente'::text,
    'conviteria_convite'::text,
    'conviteria_mensalidade'::text,
    'pixwiki_subscription'::text,
    'midia_campaign'::text,
    'midia_screen_plan'::text
  ]));

alter table midia.screens
  add column if not exists billing_current_period_start timestamptz null,
  add column if not exists billing_current_period_end timestamptz null,
  add column if not exists billing_last_payment_id uuid null;

create table if not exists midia.screen_plan_payments (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references midia.screens(id) on delete cascade,
  publisher_id uuid not null references midia.publishers(id) on delete cascade,
  plan_key text not null references midia.screen_plan_catalog(plan_key) on delete restrict,
  pix_transaction_id uuid null unique references public.pix_transactions(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  provider text null,
  txid text null,
  pix_code text null,
  qr_code_url text null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','expired','failed','cancelled')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  period_start timestamptz null,
  period_end timestamptz null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end > period_start)
);

create index if not exists midia_screen_plan_payments_screen_idx
  on midia.screen_plan_payments(screen_id, created_at desc);
create index if not exists midia_screen_plan_payments_status_idx
  on midia.screen_plan_payments(status, expires_at);
create unique index if not exists midia_screen_plan_one_pending_uidx
  on midia.screen_plan_payments(screen_id)
  where status='pending';

create or replace function midia.finalize_screen_plan_payment(p_pix_transaction_id uuid)
returns table (
  screen_id uuid,
  billing_status text,
  period_end timestamptz,
  already_processed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
declare
  v_tx public.pix_transactions%rowtype;
  v_payment midia.screen_plan_payments%rowtype;
  v_screen midia.screens%rowtype;
  v_plan midia.screen_plan_catalog%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_already boolean := false;
begin
  select * into v_tx
    from public.pix_transactions
   where id=p_pix_transaction_id
   for update;
  if not found or v_tx.purpose <> 'midia_screen_plan' then raise exception 'midia_screen_plan_payment_not_found'; end if;
  if v_tx.status <> 'confirmed' then raise exception 'midia_screen_plan_payment_not_confirmed'; end if;

  select * into v_payment
    from midia.screen_plan_payments
   where pix_transaction_id=p_pix_transaction_id
   for update;

  if not found then
    begin
      select * into v_payment
        from midia.screen_plan_payments
       where id=v_tx.referencia_id::uuid
       for update;
    exception when others then
      raise exception 'midia_screen_plan_reference_invalid';
    end;
    if not found then raise exception 'midia_screen_plan_payment_not_found'; end if;
    update midia.screen_plan_payments
       set pix_transaction_id=v_tx.id,
           provider=coalesce(provider,v_tx.payment_provider,'bigcorps'),
           txid=coalesce(txid,v_tx.txid),
           pix_code=coalesce(pix_code,v_tx.pix_code),
           updated_at=now()
     where id=v_payment.id
     returning * into v_payment;
  end if;

  select * into v_screen from midia.screens where id=v_payment.screen_id for update;
  if not found or v_screen.publisher_id <> v_payment.publisher_id then raise exception 'midia_screen_plan_screen_not_found'; end if;
  select * into v_plan from midia.screen_plan_catalog where plan_key=v_payment.plan_key;
  if not found or v_payment.amount_cents <= 0 then raise exception 'midia_screen_plan_invalid'; end if;
  if v_screen.plan_key <> v_payment.plan_key then raise exception 'midia_screen_plan_changed'; end if;
  -- O preço é fotografado quando o PIX é criado. Uma alteração futura no
  -- catálogo não invalida uma cobrança que já estava em andamento.
  if v_tx.amount_cents <> v_payment.amount_cents then
    raise exception 'midia_screen_plan_amount_mismatch';
  end if;

  v_already := v_payment.status='confirmed';
  if v_already then
    return query select v_screen.id,v_screen.billing_status,v_payment.period_end,true;
    return;
  end if;

  v_start := greatest(now(),coalesce(v_screen.billing_current_period_end,now()));
  v_end := v_start + interval '1 month';

  update midia.screen_plan_payments
     set status='confirmed',confirmed_at=coalesce(confirmed_at,now()),period_start=v_start,period_end=v_end,updated_at=now()
   where id=v_payment.id;

  update midia.screens
     set billing_status='active',
         billing_current_period_start=v_start,
         billing_current_period_end=v_end,
         billing_last_payment_id=v_payment.id,
         status=case when status='draft' then 'active' else status end,
         updated_at=now()
   where id=v_screen.id
   returning * into v_screen;

  perform midia.notify_screen_playlist(v_screen.id,'screen_plan_paid');
  return query select v_screen.id,v_screen.billing_status,v_end,false;
end;
$$;

revoke all on function midia.finalize_screen_plan_payment(uuid) from public, anon, authenticated;
grant execute on function midia.finalize_screen_plan_payment(uuid) to service_role;

-- Mantém o gatilho do ZIP04 e acrescenta a mensalidade da tela sem criar um
-- segundo trigger concorrente sobre a mesma transação.
create or replace function midia.on_pix_transaction_confirmed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
begin
  if new.status='confirmed' and old.status is distinct from 'confirmed' then
    if new.purpose='midia_campaign' then
      begin
        perform midia.finalize_campaign_payment(new.id);
      exception when others then
        raise warning 'Midia.Pro: falha ao finalizar campanha PIX %: %', new.id, sqlerrm;
      end;
    elsif new.purpose='midia_screen_plan' then
      begin
        perform midia.finalize_screen_plan_payment(new.id);
      exception when others then
        raise warning 'Midia.Pro: falha ao ativar plano PIX %: %', new.id, sqlerrm;
      end;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function midia.on_pix_transaction_confirmed() from public, anon, authenticated;
grant execute on function midia.on_pix_transaction_confirmed() to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Auditoria administrativa
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null,
  entity_type text not null,
  entity_id text null,
  before_data jsonb null,
  after_data jsonb null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (char_length(action) between 2 and 100),
  check (char_length(entity_type) between 2 and 80)
);

create index if not exists midia_admin_audit_created_idx
  on midia.admin_audit_log(created_at desc);
create index if not exists midia_admin_audit_entity_idx
  on midia.admin_audit_log(entity_type, entity_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Campanhas institucionais / fillers.
-- Não geram settlement, proof-of-play financeiro nem saldo de parceiro.
-- São usadas apenas dentro do inventário reservado à rede quando não existe
-- campanha paga vencendo naquele momento.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.house_creatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  advertiser_label text not null default 'Midia.Pro',
  kind text not null check (kind in ('image','video')),
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  duration_seconds numeric(8,3) null check (duration_seconds is null or duration_seconds between 0 and 61),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  display_seconds integer not null default 30 check (display_seconds in (30,45,60)),
  priority integer not null default 100 check (priority between 1 and 10000),
  status text not null default 'uploading' check (status in ('uploading','ready','paused','deleted','failed')),
  starts_at timestamptz null,
  ends_at timestamptz null,
  target_inventory_classes text[] not null default array['standard','movement','premium','led']::text[],
  target_venue_types text[] null,
  created_by_user_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(name) between 2 and 140),
  check (char_length(advertiser_label) between 2 and 100),
  check (char_length(file_name) between 1 and 180),
  check (height > width),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists midia_house_creatives_status_idx
  on midia.house_creatives(status, priority desc, created_at desc);

-- Sinal global para todos os players. Evita incrementar milhares de versões de
-- tela quando apenas o catálogo institucional muda.
create or replace function midia.notify_house_playlist(p_action text default 'refresh')
returns void
language plpgsql
security definer
set search_path = pg_catalog, realtime, midia
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'action', coalesce(nullif(trim(p_action),''),'refresh'),
      'changed_at', now()
    ),
    'playlist',
    'midia-house',
    false
  );
end;
$$;

revoke all on function midia.notify_house_playlist(text) from public, anon, authenticated;
grant execute on function midia.notify_house_playlist(text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Recuperação de proof-of-play perdido.
-- A ocorrência original vira `missed` e uma substituta é agendada. O settlement
-- continua com o total ORIGINAL, portanto uma reposição nunca aumenta a receita
-- de parceiro nem o valor cobrado do anunciante.
-- ─────────────────────────────────────────────────────────────────────────────
alter table midia.campaign_occurrences
  add column if not exists recovery_of_occurrence_id uuid null references midia.campaign_occurrences(id) on delete set null,
  add column if not exists recovery_attempt smallint not null default 0 check (recovery_attempt between 0 and 5),
  add column if not exists missed_at timestamptz null,
  add column if not exists missed_reason text null;

create index if not exists midia_campaign_occurrences_recovery_idx
  on midia.campaign_occurrences(screen_id, status, window_end_at, recovery_attempt);

-- Localiza um horário de reposição dentro do horário operacional da tela.
-- Procura no máximo 7 dias, em passos de 2 minutos, evitando outro `planned_at`
-- muito próximo na mesma tela. É manutenção de baixa frequência, não caminho
-- quente de reprodução.
create or replace function midia.find_recovery_slot(
  p_screen_id uuid,
  p_not_before timestamptz default now()
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  v_tz text;
  v_start time;
  v_end time;
  v_local_from timestamp;
  v_day date;
  v_open timestamp;
  v_close timestamp;
  v_candidate timestamp;
  v_candidate_utc timestamptz;
  v_d integer;
begin
  select coalesce(l.timezone,'America/Sao_Paulo'), s.active_start_time, s.active_end_time
    into v_tz, v_start, v_end
    from midia.screens sc
    join midia.locations l on l.id=sc.location_id
    join midia.screen_ad_settings s on s.screen_id=sc.id
   where sc.id=p_screen_id;
  if not found then return null; end if;

  v_local_from := timezone(v_tz, greatest(coalesce(p_not_before,now()), now()));

  for v_d in 0..7 loop
    v_day := v_local_from::date + v_d;
    v_open := v_day + v_start;
    v_close := v_day + v_end;
    v_candidate := greatest(v_open + interval '5 minutes',
                            case when v_d=0 then v_local_from + interval '5 minutes' else v_open + interval '5 minutes' end);
    v_candidate := date_trunc('minute', v_candidate) + interval '1 minute';

    while v_candidate < v_close - interval '3 minutes' loop
      v_candidate_utc := v_candidate at time zone v_tz;
      if not exists (
        select 1
          from midia.campaign_occurrences o
         where o.screen_id=p_screen_id
           and o.status='scheduled'
           and o.planned_at between v_candidate_utc - interval '90 seconds'
                                and v_candidate_utc + interval '90 seconds'
      ) then
        return v_candidate_utc;
      end if;
      v_candidate := v_candidate + interval '2 minutes';
    end loop;
  end loop;

  return null;
end;
$$;

revoke all on function midia.find_recovery_slot(uuid,timestamptz) from public, anon, authenticated;
grant execute on function midia.find_recovery_slot(uuid,timestamptz) to service_role;

create or replace function midia.recover_missed_occurrences(
  p_screen_id uuid default null,
  p_limit integer default 25
)
returns table (
  missed_marked integer,
  replacements_created integer
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  r record;
  s midia.campaign_settlements%rowtype;
  v_slot timestamptz;
  v_window_end timestamptz;
  v_tz text;
  v_active_end time;
  v_local_slot timestamp;
  v_close timestamptz;
  v_missed integer := 0;
  v_created integer := 0;
  v_limit integer := least(200, greatest(1, coalesce(p_limit,25)));
begin
  for r in
    select o.*
      from midia.campaign_occurrences o
      join midia.campaigns c on c.id=o.campaign_id
     where o.status='scheduled'
       and o.window_end_at < now() - interval '2 minutes'
       and (p_screen_id is null or o.screen_id=p_screen_id)
       and c.status in ('scheduled','running')
     order by o.window_end_at
     limit v_limit
     for update of o skip locked
  loop
    update midia.campaign_occurrences
       set status='missed',
           missed_at=coalesce(missed_at,now()),
           missed_reason=coalesce(missed_reason,'window_elapsed_without_proof'),
           updated_at=now()
     where id=r.id and status='scheduled';
    if not found then continue; end if;
    v_missed := v_missed + 1;

    select * into s from midia.campaign_settlements where campaign_id=r.campaign_id;
    if not found or s.status='cancelled' or s.delivered_occurrences >= s.total_occurrences then
      continue;
    end if;
    if coalesce(r.recovery_attempt,0) >= 3 then
      continue;
    end if;

    v_slot := midia.find_recovery_slot(r.screen_id, now());
    if v_slot is null then continue; end if;

    select coalesce(l.timezone,'America/Sao_Paulo'), sas.active_end_time
      into v_tz, v_active_end
      from midia.screens sc
      join midia.locations l on l.id=sc.location_id
      join midia.screen_ad_settings sas on sas.screen_id=sc.id
     where sc.id=r.screen_id;

    v_local_slot := timezone(v_tz, v_slot);
    v_close := ((v_local_slot::date + v_active_end) at time zone v_tz);
    v_window_end := least(v_close, v_slot + interval '60 minutes');
    if v_window_end <= v_slot + interval '2 minutes' then continue; end if;

    begin
      insert into midia.campaign_occurrences(
        campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds,
        status,recovery_of_occurrence_id,recovery_attempt
      ) values (
        r.campaign_id,r.screen_id,r.creative_id,v_slot,v_window_end,r.display_seconds,
        'scheduled',r.id,coalesce(r.recovery_attempt,0)+1
      );
      v_created := v_created + 1;
      perform midia.notify_screen_playlist(r.screen_id,'occurrence_recovered');
    exception when unique_violation then
      -- Outra sessão encontrou o mesmo slot; próxima execução tenta novamente.
      null;
    end;
  end loop;

  return query select v_missed,v_created;
end;
$$;

revoke all on function midia.recover_missed_occurrences(uuid,integer) from public, anon, authenticated;
grant execute on function midia.recover_missed_occurrences(uuid,integer) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers / updated_at / segurança
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists house_creatives_touch_updated_at on midia.house_creatives;
create trigger house_creatives_touch_updated_at
before update on midia.house_creatives
for each row execute function midia.touch_updated_at();

alter table midia.house_creatives enable row level security;
alter table midia.admin_audit_log enable row level security;

revoke all on midia.house_creatives from public, anon, authenticated;
revoke all on midia.admin_audit_log from public, anon, authenticated;
grant all on midia.house_creatives to service_role;
grant all on midia.admin_audit_log to service_role;


-- Mensalidades permanecem server-only.
drop trigger if exists screen_plan_payments_touch_updated_at on midia.screen_plan_payments;
create trigger screen_plan_payments_touch_updated_at
before update on midia.screen_plan_payments
for each row execute function midia.touch_updated_at();

alter table midia.screen_plan_payments enable row level security;
revoke all on midia.screen_plan_payments from public, anon, authenticated;
grant all on midia.screen_plan_payments to service_role;

commit;

-- =============================================================================
-- FIM DA FASE ZIP06
-- =============================================================================
