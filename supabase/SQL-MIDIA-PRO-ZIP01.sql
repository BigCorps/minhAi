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
