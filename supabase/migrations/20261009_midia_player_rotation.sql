-- Midia.Pro: rotação independente do player (TV/Chromecast/painéis)
-- Mantém orientation/aspect_ratio da mídia separados da rotação física do dispositivo.

alter table midia.screens
  add column if not exists rotation_degrees smallint not null default 0
  check (rotation_degrees in (0, 90, 270));

create or replace function midia.set_screen_rotation(
  p_screen_id uuid,
  p_publisher_id uuid,
  p_rotation smallint
)
returns table (
  rotation_degrees smallint,
  playlist_version bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, midia
as $$
declare
  v_rotation smallint;
  v_version bigint;
begin
  if p_rotation not in (0, 90, 270) then
    raise exception 'invalid_rotation';
  end if;

  update midia.screens as s
     set rotation_degrees = p_rotation,
         playlist_version = s.playlist_version + 1,
         updated_at = now()
   where s.id = p_screen_id
     and s.publisher_id = p_publisher_id
   returning s.rotation_degrees, s.playlist_version
        into v_rotation, v_version;

  if not found then
    return;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'screen_id', p_screen_id,
      'playlist_version', v_version,
      'acao', 'rotation'
    ),
    'playlist',
    'midia-screen:' || p_screen_id::text,
    false
  );

  return query select v_rotation, v_version;
end;
$$;

revoke all on function midia.set_screen_rotation(uuid, uuid, smallint)
  from public, anon, authenticated;

grant execute on function midia.set_screen_rotation(uuid, uuid, smallint)
  to service_role;
