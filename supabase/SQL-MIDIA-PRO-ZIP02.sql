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
