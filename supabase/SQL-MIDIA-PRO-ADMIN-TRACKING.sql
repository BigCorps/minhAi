-- =============================================================================
-- Admin minhAi — tracking de produtos dedicados
-- Midia.Pro + DesafIA
--
-- Mantém as tabelas/funções centrais de telemetria aptas a reconhecer os dois
-- produtos. Este arquivo substitui a versão anterior que conhecia apenas Midia.Pro.
-- A atualização já foi aplicada no Supabase de produção em 30/09/2026.
-- =============================================================================

begin;

alter table public.platform_user_app_stats
  drop constraint if exists platform_user_app_stats_app_key_check;
alter table public.platform_user_app_stats
  add constraint platform_user_app_stats_app_key_check
  check (app_key = any (array[
    'minhai','minia','artefinal','pixwiki','consultatec','conviteia',
    'melhoria','funcionaria','midia','desafia'
  ]::text[]));

alter table public.platform_user_app_daily
  drop constraint if exists platform_user_app_daily_app_key_check;
alter table public.platform_user_app_daily
  add constraint platform_user_app_daily_app_key_check
  check (app_key = any (array[
    'minhai','minia','artefinal','pixwiki','consultatec','conviteia',
    'melhoria','funcionaria','midia','desafia'
  ]::text[]));

alter table public.platform_user_login_events
  drop constraint if exists platform_user_login_events_app_key_check;
alter table public.platform_user_login_events
  add constraint platform_user_login_events_app_key_check
  check (app_key = any (array[
    'minhai','minia','artefinal','pixwiki','consultatec','conviteia',
    'melhoria','funcionaria','midia','desafia'
  ]::text[]));

alter table public.platform_cost_events
  drop constraint if exists platform_cost_events_app_key_check;
alter table public.platform_cost_events
  add constraint platform_cost_events_app_key_check
  check (
    app_key is null or app_key = any (array[
      'minhai','minia','artefinal','pixwiki','consultatec','conviteia',
      'melhoria','funcionaria','midia','desafia'
    ]::text[])
  );

alter table public.platform_cost_profiles
  drop constraint if exists platform_cost_profiles_app_key_check;
alter table public.platform_cost_profiles
  add constraint platform_cost_profiles_app_key_check
  check (
    app_key is null or app_key = any (array[
      'minhai','minia','artefinal','pixwiki','consultatec','conviteia',
      'melhoria','funcionaria','midia','desafia'
    ]::text[])
  );

-- As três funções abaixo validam app_key internamente. Fazemos patch da definição
-- atual para não duplicar centenas de linhas e para preservar futuras correções.
do $$
declare
  v_signature text;
  v_definition text;
  v_patched text;
  v_occurrences integer;
begin
  foreach v_signature in array array[
    'public.record_platform_activity(uuid,text,text,text,text,integer,timestamptz)',
    'public.admin_platform_users_page(text,text,text,integer,integer,text)',
    'public.record_platform_cost_event(text,text,text,uuid,uuid,bigint,bigint,numeric,text,text,timestamptz,jsonb)'
  ] loop
    select pg_get_functiondef(v_signature::regprocedure::oid)
      into v_definition;

    if v_definition is null then
      raise exception 'Função necessária não encontrada: %', v_signature;
    end if;

    if v_definition like '%''desafia''%' then
      continue;
    end if;

    if v_definition like '%''midia''%' then
      v_occurrences :=
        (length(v_definition) - length(replace(v_definition, '''midia''', '')))
        / length('''midia''');
      if v_occurrences <> 1 then
        raise exception 'Definição inesperada em %: esperada 1 ocorrência de midia, encontrada %',
          v_signature, v_occurrences;
      end if;
      v_patched := replace(v_definition, '''midia''', '''midia'',''desafia''');
    else
      v_occurrences :=
        (length(v_definition) - length(replace(v_definition, '''funcionaria''', '')))
        / length('''funcionaria''');
      if v_occurrences <> 1 then
        raise exception 'Definição inesperada em %: esperada 1 ocorrência de funcionaria, encontrada %',
          v_signature, v_occurrences;
      end if;
      v_patched := replace(
        v_definition,
        '''funcionaria''',
        '''funcionaria'',''midia'',''desafia'''
      );
    end if;

    execute v_patched;
  end loop;
end
$$;

-- Midia.Pro: cadastro/telas existentes contam como evidência histórica.
with src as (
  select
    p.user_id,
    min(p.created_at) as first_seen,
    greatest(
      max(p.created_at), max(p.updated_at), max(s.created_at),
      max(s.updated_at), max(s.last_seen_at)
    ) as last_seen
  from midia.publishers p
  left join midia.screens s on s.publisher_id = p.id
  where p.user_id is not null
  group by p.user_id
)
insert into public.platform_user_app_stats (
  user_id, app_key, first_seen_at, last_seen_at,
  historical_first_seen_at, historical_last_seen_at,
  last_path, last_host, has_historical_activity, created_at, updated_at
)
select
  user_id, 'midia', first_seen, coalesce(last_seen,first_seen),
  first_seen, coalesce(last_seen,first_seen),
  '/midia/dashboard', 'midia.pro', true, now(), now()
from src
on conflict (user_id,app_key) do update set
  first_seen_at = least(public.platform_user_app_stats.first_seen_at, excluded.first_seen_at),
  last_seen_at = greatest(public.platform_user_app_stats.last_seen_at, excluded.last_seen_at),
  historical_first_seen_at = least(public.platform_user_app_stats.historical_first_seen_at, excluded.historical_first_seen_at),
  historical_last_seen_at = greatest(public.platform_user_app_stats.historical_last_seen_at, excluded.historical_last_seen_at),
  last_path = coalesce(public.platform_user_app_stats.last_path, excluded.last_path),
  last_host = coalesce(public.platform_user_app_stats.last_host, excluded.last_host),
  has_historical_activity = true,
  updated_at = now();

-- DesafIA: responsáveis/famílias existentes contam como evidência histórica.
with member_src as (
  select
    fm.user_id,
    fm.family_id,
    fm.created_at,
    b.last_billing,
    d.last_decision
  from desafia.family_members fm
  left join lateral (
    select max(bi.updated_at) as last_billing
    from desafia.billing_invoices bi
    where bi.family_id=fm.family_id
  ) b on true
  left join lateral (
    select max(ml.decided_at) as last_decision
    from desafia.mission_logs ml
    where ml.decided_by=fm.user_id
  ) d on true
  where fm.user_id is not null
),
src as (
  select
    user_id,
    min(created_at) as first_seen,
    max(greatest(created_at,last_billing,last_decision)) as last_seen
  from member_src
  group by user_id
)
insert into public.platform_user_app_stats (
  user_id, app_key, first_seen_at, last_seen_at,
  historical_first_seen_at, historical_last_seen_at,
  last_path, last_host, has_historical_activity, created_at, updated_at
)
select
  user_id, 'desafia', first_seen, coalesce(last_seen,first_seen),
  first_seen, coalesce(last_seen,first_seen),
  '/pais/', 'desafia.app', true, now(), now()
from src
on conflict (user_id,app_key) do update set
  first_seen_at = least(public.platform_user_app_stats.first_seen_at, excluded.first_seen_at),
  last_seen_at = greatest(public.platform_user_app_stats.last_seen_at, excluded.last_seen_at),
  historical_first_seen_at = least(public.platform_user_app_stats.historical_first_seen_at, excluded.historical_first_seen_at),
  historical_last_seen_at = greatest(public.platform_user_app_stats.historical_last_seen_at, excluded.historical_last_seen_at),
  last_path = coalesce(public.platform_user_app_stats.last_path, excluded.last_path),
  last_host = coalesce(public.platform_user_app_stats.last_host, excluded.last_host),
  has_historical_activity = true,
  updated_at = now();

-- Um dia histórico é suficiente para os filtros/dias ativos sem inventar pageviews.
with src as (
  select user_id,app_key,last_seen_at
  from public.platform_user_app_stats
  where app_key in ('midia','desafia')
    and has_historical_activity is true
    and last_seen_at is not null
)
insert into public.platform_user_app_daily (
  user_id,app_key,activity_date,first_seen_at,last_seen_at,
  historical_first_seen_at,historical_last_seen_at,
  has_historical_activity,created_at,updated_at
)
select
  user_id,app_key,(last_seen_at at time zone 'America/Sao_Paulo')::date,
  last_seen_at,last_seen_at,last_seen_at,last_seen_at,true,now(),now()
from src
on conflict (user_id,app_key,activity_date) do update set
  historical_first_seen_at = least(public.platform_user_app_daily.historical_first_seen_at, excluded.historical_first_seen_at),
  historical_last_seen_at = greatest(public.platform_user_app_daily.historical_last_seen_at, excluded.historical_last_seen_at),
  first_seen_at = least(public.platform_user_app_daily.first_seen_at, excluded.first_seen_at),
  last_seen_at = greatest(public.platform_user_app_daily.last_seen_at, excluded.last_seen_at),
  has_historical_activity = true,
  updated_at = now();

commit;

notify pgrst, 'reload schema';
