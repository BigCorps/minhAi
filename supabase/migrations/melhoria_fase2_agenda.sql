-- ============================================================================
-- MelhorIA — Fase 2: consultas, exames e Google Agenda
--
-- Rode DEPOIS de melhoria_fase0_fase1.sql. Idempotente.
-- Reaproveita o segredo já criado em melhoria.segredos_internos.
--
-- DEPOIS DE RODAR, veja o BLOCO 6: tem dois passos no painel.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 1 — Conexão com o Google
-- ════════════════════════════════════════════════════════════════════════════
-- Espelha conviteria.google_conexoes / google_oauth_states.
--
-- Por que tabela própria e não public.google_accounts: aquela é ligada a
-- company_id e carrega campos de Google Business que não têm uso aqui. O
-- ConviteIA tomou a mesma decisão e construiu as suas dentro do próprio schema.
--
-- O CLIENT ID do Google é COMPARTILHADO com o resto do ecossistema — a tela de
-- consentimento mostra a identidade minhAi para todas as marcas, e o
-- redirect_uri fica no domínio do Supabase. Ou seja: melhoria.org não entra na
-- configuração do OAuth, e não há verificação nova a fazer. Os escopos
-- calendar e calendar.events já estão concedidos e ativos em produção.

create table if not exists melhoria.google_conexoes (
  id                 uuid primary key default gen_random_uuid(),
  perfil_id          uuid not null unique
                       references melhoria.perfis(id) on delete cascade,

  google_email       text,
  google_user_id     text,

  access_token       text,
  refresh_token      text,
  token_type         text default 'Bearer',
  scopes             text[],
  expires_at         timestamptz,

  -- Calendário onde os eventos são criados. 'primary' é o padrão do Google.
  calendar_id        text not null default 'primary',

  -- Espelhar remédio na agenda vem DESLIGADO. Quatro doses diárias poluem a
  -- agenda a ponto de esconder o resto, e gravar o nome do medicamento no
  -- Google exporta dado de saúde do art. 11 para fora do nosso banco.
  espelhar_remedios  boolean not null default false,
  -- Quando espelhar, o título vai neutro ("Hora do remédio") e o nome do
  -- medicamento fica só na descrição.
  titulo_neutro      boolean not null default true,
  espelhar_agenda    boolean not null default true,

  is_active          boolean not null default true,
  last_token_refresh timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_melhoria_google_conexoes_ativas
  on melhoria.google_conexoes(perfil_id) where is_active;


create table if not exists melhoria.google_oauth_states (
  id          uuid primary key default gen_random_uuid(),
  -- Guardamos o SHA-256, nunca o state em claro: vazamento de banco não pode
  -- entregar um state válido. Mesmo cuidado do ConviteIA.
  state_hash  text not null unique,
  perfil_id   uuid not null references melhoria.perfis(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null default (now() + interval '10 minutes'),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_melhoria_oauth_states_expira
  on melhoria.google_oauth_states(expires_at) where used_at is null;


-- Fila de sincronização. O app NÃO fala com a API do Google direto: ele
-- enfileira e uma edge function processa. Motivo: se o Google estiver fora do
-- ar ou o token expirado, o cadastro da consulta não pode falhar por causa
-- disso. Salvar a consulta é o que importa; espelhar na agenda é acessório.
create table if not exists melhoria.google_fila (
  id             bigserial primary key,
  perfil_id      uuid not null references melhoria.perfis(id) on delete cascade,
  acao           text not null check (acao in ('criar','atualizar','apagar')),
  origem         text not null check (origem in ('agendamento','dose')),
  origem_id      uuid not null,
  google_event_id text,
  tentativas     int not null default 0,
  ultimo_erro    text,
  status         text not null default 'pendente'
                   check (status in ('pendente','ok','erro','desistiu')),
  criado_em      timestamptz not null default now(),
  processado_em  timestamptz
);

create index if not exists idx_melhoria_google_fila_pendente
  on melhoria.google_fila(criado_em) where status = 'pendente';


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 2 — Alertas escalonados de consulta e exame
-- ════════════════════════════════════════════════════════════════════════════
-- Gera 7d, 1d, 3h, 1h e o alerta de preparo (jejum). Roda por trigger no
-- INSERT/UPDATE do agendamento — não por cron, porque o alerta de 7 dias
-- precisa existir no instante em que a consulta é marcada.

create or replace function melhoria.gerar_alertas_agendamento(p_agendamento_id uuid)
returns int
language plpgsql
security definer
set search_path to 'melhoria, public'
as $$
declare
  v_ag       record;
  v_criados  int := 0;
  v_preparo  timestamptz;
begin
  select * into v_ag from melhoria.agendamentos where id = p_agendamento_id;
  if not found or v_ag.status in ('cancelado','realizado','faltou') then
    -- Cancelou ou já foi: os alertas pendentes deixam de fazer sentido.
    update melhoria.agenda_alertas
       set status = 'cancelado'
     where agendamento_id = p_agendamento_id and status = 'pendente';
    return 0;
  end if;

  -- Recria a grade do zero: se a data mudou, os alertas antigos estão errados.
  delete from melhoria.agenda_alertas
   where agendamento_id = p_agendamento_id and status = 'pendente';

  insert into melhoria.agenda_alertas (agendamento_id, disparar_em, tipo)
  select p_agendamento_id, x.quando, x.tipo
    from (values
      (v_ag.data_hora - interval '7 days',  '7d'),
      (v_ag.data_hora - interval '1 day',   '1d'),
      (v_ag.data_hora - interval '3 hours', '3h'),
      (v_ag.data_hora - interval '1 hour',  '1h')
    ) as x(quando, tipo)
   where x.quando > now()          -- não agenda alerta no passado
  on conflict (agendamento_id, tipo) do nothing;

  get diagnostics v_criados = row_count;

  -- Alerta de jejum: dispara na hora em que a pessoa precisa PARAR de comer,
  -- não na hora do exame. É a diferença entre o aviso servir para algo e ser
  -- apenas uma informação a mais.
  if v_ag.jejum_horas is not null and v_ag.jejum_horas > 0 then
    v_preparo := v_ag.data_hora - (v_ag.jejum_horas || ' hours')::interval;

    if v_preparo > now() then
      insert into melhoria.agenda_alertas (agendamento_id, disparar_em, tipo)
      values (p_agendamento_id, v_preparo, 'preparo')
      on conflict (agendamento_id, tipo) do nothing;
      v_criados := v_criados + 1;
    end if;
  end if;

  return v_criados;
end;
$$;

grant execute on function melhoria.gerar_alertas_agendamento(uuid) to authenticated, service_role;


create or replace function melhoria.tg_agendamento_alertas()
returns trigger
language plpgsql
security definer
set search_path to 'melhoria, public'
as $$
begin
  perform melhoria.gerar_alertas_agendamento(new.id);

  -- Enfileira o espelho na agenda do Google, se houver conexão ativa que
  -- queira agenda. A fila é o que impede o Google fora do ar de derrubar o
  -- cadastro da consulta.
  if exists (
    select 1 from melhoria.google_conexoes g
     where g.perfil_id = new.perfil_id and g.is_active and g.espelhar_agenda
  ) then
    insert into melhoria.google_fila (perfil_id, acao, origem, origem_id, google_event_id)
    values (
      new.perfil_id,
      case
        when tg_op = 'INSERT'                 then 'criar'
        when new.status = 'cancelado'         then 'apagar'
        else 'atualizar'
      end,
      'agendamento', new.id, new.google_event_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_melhoria_agendamento_alertas on melhoria.agendamentos;
create trigger trg_melhoria_agendamento_alertas
  after insert or update of data_hora, jejum_horas, status on melhoria.agendamentos
  for each row execute function melhoria.tg_agendamento_alertas();


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 3 — Espelho de remédio no Google (opt-in)
-- ════════════════════════════════════════════════════════════════════════════
-- UM evento recorrente por grade de dose, com RRULE — não um evento por dose
-- por dia.
--
-- O LembreteRemediosDisplay da minhAi faz o contrário: laço aninhado que cria
-- um evento por dose por dia. Para 3 doses em 90 dias são 270 chamadas
-- sequenciais à API do Google, com o modal travado; um erro no meio aborta e
-- deixa ~140 eventos órfãos; e o event_id é descartado, então não há como
-- editar nem apagar depois. Se o médico mudar a dose, os 270 ficam lá.
--
-- Aqui: 1 evento, 1 event_id guardado, editar e cancelar em uma chamada.

create or replace function melhoria.montar_rrule(
  p_dias_semana int[],
  p_data_fim    date
)
returns text
language plpgsql
immutable
as $$
declare
  v_dias    text;
  v_ate     text := '';
  -- RFC 5545: dias da semana em duas letras, domingo = SU
  v_mapa    text[] := array['SU','MO','TU','WE','TH','FR','SA'];
  v_lista   text[] := '{}';
  d         int;
begin
  if p_data_fim is not null then
    -- UNTIL em UTC, formato básico. Sem o Z o Google recusa a regra.
    v_ate := ';UNTIL=' || to_char(
      (p_data_fim + time '23:59') at time zone 'America/Sao_Paulo',
      'YYYYMMDD"T"HH24MISS"Z"'
    );
  end if;

  if array_length(p_dias_semana, 1) = 7 then
    return 'RRULE:FREQ=DAILY' || v_ate;
  end if;

  foreach d in array p_dias_semana loop
    v_lista := v_lista || v_mapa[d + 1];
  end loop;

  v_dias := array_to_string(v_lista, ',');
  return 'RRULE:FREQ=WEEKLY;BYDAY=' || v_dias || v_ate;
end;
$$;

grant execute on function melhoria.montar_rrule(int[], date) to authenticated, service_role;


create or replace function melhoria.tg_dose_google()
returns trigger
language plpgsql
security definer
set search_path to 'melhoria, public'
as $$
declare v_perfil uuid;
begin
  select m.perfil_id into v_perfil
    from melhoria.medicamentos m where m.id = new.medicamento_id;

  -- Só enfileira se o espelho de REMÉDIO estiver ligado. Ele é opt-in
  -- separado do espelho de agenda, e vem desligado.
  if exists (
    select 1 from melhoria.google_conexoes g
     where g.perfil_id = v_perfil and g.is_active and g.espelhar_remedios
  ) then
    insert into melhoria.google_fila (perfil_id, acao, origem, origem_id, google_event_id)
    values (
      v_perfil,
      case when tg_op = 'INSERT' then 'criar'
           when not new.ativo    then 'apagar'
           else 'atualizar' end,
      'dose', new.id, new.google_event_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_melhoria_dose_google on melhoria.doses;
create trigger trg_melhoria_dose_google
  after insert or update of horario, dias_semana, ativo on melhoria.doses
  for each row execute function melhoria.tg_dose_google();


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 4 — RLS
-- ════════════════════════════════════════════════════════════════════════════

alter table melhoria.google_conexoes     enable row level security;
alter table melhoria.google_oauth_states enable row level security;
alter table melhoria.google_fila         enable row level security;

-- google_conexoes: o usuário vê e edita as PREFERÊNCIAS, mas os tokens nunca
-- devem chegar ao navegador. A view abaixo é o que o app consulta.
drop policy if exists google_conexoes_select on melhoria.google_conexoes;
create policy google_conexoes_select on melhoria.google_conexoes
  for select to authenticated using (melhoria.pode_ver_perfil(perfil_id));

drop policy if exists google_conexoes_update on melhoria.google_conexoes;
create policy google_conexoes_update on melhoria.google_conexoes
  for update to authenticated
  using (melhoria.pode_editar_perfil(perfil_id))
  with check (melhoria.pode_editar_perfil(perfil_id));

-- Coluna a coluna: sem isto, um SELECT * traz access_token e refresh_token
-- para o navegador. RLS controla LINHAS, não colunas — é preciso revogar.
revoke select on melhoria.google_conexoes from authenticated;
grant select (
  id, perfil_id, google_email, calendar_id,
  espelhar_remedios, titulo_neutro, espelhar_agenda,
  is_active, created_at, updated_at
) on melhoria.google_conexoes to authenticated;
grant update (espelhar_remedios, titulo_neutro, espelhar_agenda, calendar_id, is_active)
  on melhoria.google_conexoes to authenticated;

-- states e fila: só service_role. RLS ligada e sem policy = ninguém lê.
revoke all on melhoria.google_oauth_states from anon, authenticated;
revoke all on melhoria.google_fila         from anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 5 — Cron
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare j text;
begin
  foreach j in array array[
    'melhoria-agenda-alertas','melhoria-google-sync','melhoria-limpar-oauth-states'
  ]
  loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;


-- Alertas de consulta e exame, a cada minuto
select cron.schedule(
  'melhoria-agenda-alertas', '* * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/melhoria-agenda-alertas',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-melhoria-secret',
        (select segredo from melhoria.segredos_internos where chave = 'cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cron$
);

-- Sincronização com o Google, a cada 2 minutos. Não precisa ser a cada minuto:
-- espelho de agenda não é urgente, e o push já garante o aviso.
select cron.schedule(
  'melhoria-google-sync', '*/2 * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/melhoria-google-evento',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-melhoria-secret',
        (select segredo from melhoria.segredos_internos where chave = 'cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cron$
);

-- Higiene: state de OAuth vencido não serve para nada
select cron.schedule(
  'melhoria-limpar-oauth-states', '40 3 * * *',
  $cron$
    delete from melhoria.google_oauth_states
     where expires_at < now() - interval '1 day';
  $cron$
);


-- ════════════════════════════════════════════════════════════════════════════
-- BLOCO 6 — DEPOIS DE RODAR
-- ════════════════════════════════════════════════════════════════════════════
--
-- 6.1  Publique as quatro edge functions:
--        supabase functions deploy melhoria-google-auth-url
--        supabase functions deploy melhoria-google-auth-callback --no-verify-jwt
--        supabase functions deploy melhoria-google-evento        --no-verify-jwt
--        supabase functions deploy melhoria-agenda-alertas       --no-verify-jwt
--
--      Só a auth-url exige JWT: ela é chamada pelo usuário logado. As outras
--      três são chamadas pelo Google ou pelo cron, que não têm JWT.
--
-- 6.2  Variáveis das edge functions:
--        MELHORIA_CRON_SECRET      (o mesmo da Fase 0)
--        GOOGLE_OAUTH_CLIENT_ID    (já existe — COMPARTILHADO com o ConviteIA)
--        GOOGLE_OAUTH_CLIENT_SECRET(já existe)
--        ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY (já existem)
--
-- 6.3  Google Cloud Console → Credentials → o mesmo OAuth Client do ConviteIA
--      → Authorized redirect URIs → acrescente:
--
--        https://qyonozbroekuqlotqcbm.supabase.co/functions/v1/melhoria-google-auth-callback
--
--      É só acrescentar um URI a um cliente que já existe. NÃO reabre
--      verificação: o domínio é o mesmo (supabase.co), e os escopos calendar e
--      calendar.events já estão concedidos.


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_tabelas int; v_jobs int;
begin
  select count(*) into v_tabelas
    from information_schema.tables
   where table_schema = 'melhoria'
     and table_name in ('google_conexoes','google_oauth_states','google_fila');

  select count(*) into v_jobs from cron.job where jobname like 'melhoria-%';

  raise notice '─────────────────────────────────────────────';
  raise notice '  MelhorIA — Fase 2 aplicada';
  raise notice '  tabelas do Google : %  (esperado 3)', v_tabelas;
  raise notice '  cron jobs melhoria: %  (esperado 7)', v_jobs;
  raise notice '  RRULE diária      : %', melhoria.montar_rrule('{0,1,2,3,4,5,6}', null);
  raise notice '  RRULE seg/qua/sex : %', melhoria.montar_rrule('{1,3,5}', null);
  raise notice '';
  raise notice '  >>> Falta o BLOCO 6.3: redirect URI no Google Console <<<';
  raise notice '─────────────────────────────────────────────';
end $$;
