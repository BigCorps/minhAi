create table if not exists public.pixwiki_fast_watch_state (
  company_id uuid primary key references public.companies(id) on delete cascade,
  user_id uuid not null,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_new_count integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.pixwiki_fast_watch_state enable row level security;

create or replace function public.pixwiki_fast_watch_acquire(
  p_company_id uuid,
  p_user_id uuid,
  p_min_interval_ms integer default 1800
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_started timestamptz;
  v_interval interval;
begin
  if p_company_id is null or p_user_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.user_id = p_user_id
      and c.segment_key = 'pix_wiki'
      and c.is_active = true
  ) then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('pixwiki-fast-watch:' || p_company_id::text, 0));

  select s.last_started_at
    into v_last_started
  from public.pixwiki_fast_watch_state s
  where s.company_id = p_company_id;

  v_interval := make_interval(
    secs => greatest(500, least(coalesce(p_min_interval_ms, 1800), 10000))::double precision / 1000.0
  );

  if v_last_started is not null and v_last_started > now() - v_interval then
    return false;
  end if;

  insert into public.pixwiki_fast_watch_state (
    company_id, user_id, last_started_at, updated_at
  ) values (
    p_company_id, p_user_id, now(), now()
  )
  on conflict (company_id) do update
    set user_id = excluded.user_id,
        last_started_at = excluded.last_started_at,
        updated_at = excluded.updated_at;

  return true;
end;
$$;

revoke all on function public.pixwiki_fast_watch_acquire(uuid, uuid, integer) from public;
grant execute on function public.pixwiki_fast_watch_acquire(uuid, uuid, integer) to service_role;
