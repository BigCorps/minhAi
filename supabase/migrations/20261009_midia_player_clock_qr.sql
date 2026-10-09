-- Midia.Pro: relógio, QR do anúncio e preferências visuais do player.

alter table midia.screens
  add column if not exists player_clock_size text not null default 'medium',
  add column if not exists player_qr_size text not null default 'medium';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'screens_player_clock_size_check'
      and conrelid = 'midia.screens'::regclass
  ) then
    alter table midia.screens
      add constraint screens_player_clock_size_check
      check (player_clock_size in ('small','medium','large'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'screens_player_qr_size_check'
      and conrelid = 'midia.screens'::regclass
  ) then
    alter table midia.screens
      add constraint screens_player_qr_size_check
      check (player_qr_size in ('small','medium','large'));
  end if;
end;
$$;

alter table midia.creatives
  add column if not exists destination_url text;

alter table midia.house_creatives
  add column if not exists destination_url text;

alter table midia.campaigns
  add column if not exists destination_url text;

create or replace function midia.set_screen_player_settings(
  p_screen_id uuid,
  p_publisher_id uuid,
  p_rotation smallint default null,
  p_clock_size text default null,
  p_qr_size text default null
)
returns table (
  rotation_degrees smallint,
  player_clock_size text,
  player_qr_size text,
  playlist_version bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, midia
as $$
declare
  v_rotation smallint;
  v_clock text;
  v_qr text;
  v_version bigint;
begin
  if p_rotation is not null and p_rotation not in (0, 90, 270) then
    raise exception 'invalid_rotation';
  end if;
  if p_clock_size is not null and p_clock_size not in ('small','medium','large') then
    raise exception 'invalid_clock_size';
  end if;
  if p_qr_size is not null and p_qr_size not in ('small','medium','large') then
    raise exception 'invalid_qr_size';
  end if;

  update midia.screens as s
     set rotation_degrees = coalesce(p_rotation, s.rotation_degrees),
         player_clock_size = coalesce(p_clock_size, s.player_clock_size),
         player_qr_size = coalesce(p_qr_size, s.player_qr_size),
         playlist_version = s.playlist_version + 1,
         updated_at = now()
   where s.id = p_screen_id
     and s.publisher_id = p_publisher_id
   returning s.rotation_degrees, s.player_clock_size, s.player_qr_size, s.playlist_version
        into v_rotation, v_clock, v_qr, v_version;

  if not found then
    return;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'screen_id', p_screen_id,
      'playlist_version', v_version,
      'acao', 'player_settings'
    ),
    'playlist',
    'midia-screen:' || p_screen_id::text,
    false
  );

  return query select v_rotation, v_clock, v_qr, v_version;
end;
$$;

revoke all on function midia.set_screen_player_settings(uuid, uuid, smallint, text, text)
  from public, anon, authenticated;

grant execute on function midia.set_screen_player_settings(uuid, uuid, smallint, text, text)
  to service_role;
