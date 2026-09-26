-- Midia.Pro — integração com o Admin BigCorps / tracker de plataforma
-- Seguro para reaplicação. Não cria usuários nem altera dados financeiros.
-- Objetivos:
--   1) aceitar app_key = 'midia' nas tabelas de atividade/custos;
--   2) permitir que o tracker registre Midia.Pro;
--   3) fazer o filtro de usuários do Admin reconhecer Midia.Pro.
-- O card do Midia.Pro no dashboard geral é acrescentado pela rota Next.js deste patch,
-- porque a função antiga usa pares (app_key, ordem) e não deve ser alterada por replace textual.

begin;

alter table public.platform_user_app_stats
  drop constraint if exists platform_user_app_stats_app_key_check;
alter table public.platform_user_app_stats
  add constraint platform_user_app_stats_app_key_check
  check (app_key = any (array[
    'minhai','minia','artefinal','pixwiki','consultatec','conviteia','melhoria','funcionaria','midia'
  ]::text[]));

alter table public.platform_user_app_daily
  drop constraint if exists platform_user_app_daily_app_key_check;
alter table public.platform_user_app_daily
  add constraint platform_user_app_daily_app_key_check
  check (app_key = any (array[
    'minhai','minia','artefinal','pixwiki','consultatec','conviteia','melhoria','funcionaria','midia'
  ]::text[]));

alter table public.platform_user_login_events
  drop constraint if exists platform_user_login_events_app_key_check;
alter table public.platform_user_login_events
  add constraint platform_user_login_events_app_key_check
  check (app_key = any (array[
    'minhai','minia','artefinal','pixwiki','consultatec','conviteia','melhoria','funcionaria','midia'
  ]::text[]));

alter table public.platform_cost_events
  drop constraint if exists platform_cost_events_app_key_check;
alter table public.platform_cost_events
  add constraint platform_cost_events_app_key_check
  check (
    app_key is null or app_key = any (array[
      'minhai','minia','artefinal','pixwiki','consultatec','conviteia','melhoria','funcionaria','midia'
    ]::text[])
  );

alter table public.platform_cost_profiles
  drop constraint if exists platform_cost_profiles_app_key_check;
alter table public.platform_cost_profiles
  add constraint platform_cost_profiles_app_key_check
  check (
    app_key is null or app_key = any (array[
      'minhai','minia','artefinal','pixwiki','consultatec','conviteia','melhoria','funcionaria','midia'
    ]::text[])
  );

-- As funções abaixo já existem em produção. Em vez de copiar versões antigas,
-- preservamos exatamente a definição atual e acrescentamos apenas 'midia' à
-- lista que hoje termina em 'funcionaria'. Na auditoria de 26/09/2026 cada
-- função possui uma única ocorrência desse literal, portanto a troca é precisa.
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

    if v_definition like '%''midia''%' then
      continue;
    end if;

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
      '''funcionaria'',''midia'''
    );

    execute v_patched;
  end loop;
end
$$;

commit;

notify pgrst, 'reload schema';
