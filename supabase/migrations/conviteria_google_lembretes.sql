-- ConviteIA — Google 3
-- Lembretes automáticos: 30 dias, 7 dias e 1 dia antes do evento.
--
-- Dependências:
--   1) conviteria_google_conexao.sql
--   2) conviteria_google_envios.sql
--
-- A lista de presença continua sendo a tabela conviteria.convidados.
-- Os lembretes são apenas uma fila derivada dela.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Calcula 09:00 de São Paulo no dia do lembrete.
-- Ex.: evento em 10/11 às 19h -> lembrete 1d em 09/11 às 09h.
-- ---------------------------------------------------------------------------
create or replace function conviteria.data_lembrete_google(
  p_data_evento timestamptz,
  p_dias_antes integer
)
returns timestamptz
language sql
immutable
set search_path = conviteria, public
as $$
  select (
    (
      (p_data_evento at time zone 'America/Sao_Paulo')::date
      - p_dias_antes
    )::date
    + time '09:00'
  ) at time zone 'America/Sao_Paulo';
$$;

-- ---------------------------------------------------------------------------
-- Sincroniza a fila de um convidado.
--
-- Regras:
-- • só agenda para RSVP positivo com e-mail;
-- • lembretes cujo horário já passou viram "ignorado";
-- • um lembrete já enviado nunca é reenviado;
-- • se a data do evento mudar, itens ainda não enviados são reagendados;
-- • se o evento for movido para mais longe, um item antes "ignorado" pode
--   voltar a "agendado";
-- • exclusão do RSVP remove os logs/fila por ON DELETE CASCADE.
-- ---------------------------------------------------------------------------
create or replace function conviteria.sincronizar_lembretes_google(
  p_convidado_id uuid
)
returns void
language plpgsql
security definer
set search_path = conviteria, public
as $$
declare
  v_convidado conviteria.convidados%rowtype;
  v_data_evento timestamptz;
  v_tipo text;
  v_dias integer;
  v_quando timestamptz;
  v_status text;
  v_key text;
begin
  select *
    into v_convidado
  from conviteria.convidados
  where id = p_convidado_id;

  if not found then
    return;
  end if;

  select data_evento
    into v_data_evento
  from conviteria.eventos
  where id = v_convidado.evento_id;

  -- Sem RSVP positivo/e-mail/data válida: qualquer lembrete não enviado
  -- deixa de ser elegível.
  if
    v_convidado.comparecera is distinct from true
    or nullif(trim(coalesce(v_convidado.email, '')), '') is null
    or v_data_evento is null
    or v_data_evento <= now()
  then
    update conviteria.google_envios
       set status = 'ignorado',
           ultimo_erro = null
     where convidado_id = p_convidado_id
       and tipo in ('lembrete_30d', 'lembrete_7d', 'lembrete_1d')
       and status <> 'enviado';

    return;
  end if;

  for v_tipo, v_dias in
    select *
    from (
      values
        ('lembrete_30d'::text, 30),
        ('lembrete_7d'::text, 7),
        ('lembrete_1d'::text, 1)
    ) as x(tipo, dias)
  loop
    v_quando := conviteria.data_lembrete_google(v_data_evento, v_dias);
    v_status := case when v_quando > now() then 'agendado' else 'ignorado' end;
    v_key := v_tipo || ':' || p_convidado_id::text;

    insert into conviteria.google_envios (
      evento_id,
      convidado_id,
      tipo,
      idempotency_key,
      to_email,
      status,
      agendado_para,
      tentativas,
      ultimo_erro
    )
    values (
      v_convidado.evento_id,
      p_convidado_id,
      v_tipo,
      v_key,
      lower(trim(v_convidado.email)),
      v_status,
      v_quando,
      0,
      null
    )
    on conflict (idempotency_key)
    do update set
      evento_id = excluded.evento_id,
      convidado_id = excluded.convidado_id,
      to_email = excluded.to_email,
      agendado_para = excluded.agendado_para,
      status = case
        -- O mesmo marco não deve ser reenviado depois de entregue.
        when conviteria.google_envios.status = 'enviado'
          then 'enviado'
        else excluded.status
      end,
      ultimo_erro = case
        when conviteria.google_envios.status = 'enviado'
          then conviteria.google_envios.ultimo_erro
        else null
      end,
      updated_at = now();
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RSVP criado ou alterado -> sincroniza os três lembretes.
-- ---------------------------------------------------------------------------
create or replace function conviteria.trg_sincronizar_lembretes_convidado()
returns trigger
language plpgsql
security definer
set search_path = conviteria, public
as $$
begin
  perform conviteria.sincronizar_lembretes_google(new.id);
  return new;
end;
$$;

drop trigger if exists trg_conviteia_google_lembretes_convidado
  on conviteria.convidados;

create trigger trg_conviteia_google_lembretes_convidado
after insert or update of comparecera, email, evento_id
on conviteria.convidados
for each row
execute function conviteria.trg_sincronizar_lembretes_convidado();

-- ---------------------------------------------------------------------------
-- Data do evento alterada -> reagenda todos os convidados ainda confirmados.
-- ---------------------------------------------------------------------------
create or replace function conviteria.trg_reagendar_lembretes_evento()
returns trigger
language plpgsql
security definer
set search_path = conviteria, public
as $$
declare
  v_id uuid;
begin
  if new.data_evento is not distinct from old.data_evento then
    return new;
  end if;

  for v_id in
    select id
    from conviteria.convidados
    where evento_id = new.id
      and comparecera = true
  loop
    perform conviteria.sincronizar_lembretes_google(v_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_conviteia_google_reagendar_evento
  on conviteria.eventos;

create trigger trg_conviteia_google_reagendar_evento
after update of data_evento
on conviteria.eventos
for each row
execute function conviteria.trg_reagendar_lembretes_evento();

-- ---------------------------------------------------------------------------
-- Backfill: quem já confirmou antes desta migration também recebe a fila,
-- desde que ainda existam lembretes futuros.
-- ---------------------------------------------------------------------------
do $$
declare
  v_id uuid;
begin
  for v_id in
    select c.id
    from conviteria.convidados c
    join conviteria.eventos e on e.id = c.evento_id
    where c.comparecera = true
      and nullif(trim(coalesce(c.email, '')), '') is not null
      and e.data_evento is not null
      and e.data_evento > now()
  loop
    perform conviteria.sincronizar_lembretes_google(v_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper do cron.
--
-- O projeto minhAi já utiliza app.supabase_url/app.service_role_key nos jobs.
-- Há também fallback para o secret "project_url" do Vault, já usado por jobs
-- atuais do projeto.
-- ---------------------------------------------------------------------------
create or replace function conviteria.chamar_worker_google_lembretes()
returns bigint
language plpgsql
security definer
set search_path = conviteria, public, vault, net
as $$
declare
  v_url text;
  v_service_role text;
  v_request_id bigint;
begin
  select decrypted_secret
    into v_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  v_url := coalesce(
    nullif(trim(v_url), ''),
    nullif(trim(current_setting('app.supabase_url', true)), '')
  );

  v_service_role := nullif(
    trim(current_setting('app.service_role_key', true)),
    ''
  );

  if v_url is null or v_service_role is null then
    raise warning
      'ConviteIA Google: project_url ou app.service_role_key não configurado; worker não chamado.';
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/conviteia-google-lembretes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role,
      'apikey', v_service_role
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  )
  into v_request_id;

  return v_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Job horário. Lembretes são marcados para 09:00 de São Paulo e enviados
-- no primeiro ciclo após esse horário.
-- ---------------------------------------------------------------------------
do $$
declare
  v_jobid bigint;
begin
  select jobid
    into v_jobid
  from cron.job
  where jobname = 'conviteia-google-lembretes'
  limit 1;

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;

  perform cron.schedule(
    'conviteia-google-lembretes',
    '17 * * * *',
    $cron$
      select conviteria.chamar_worker_google_lembretes();
    $cron$
  );
end;
$$;

comment on function conviteria.sincronizar_lembretes_google(uuid) is
  'Cria/reagenda os lembretes 30d, 7d e 1d de um RSVP confirmado.';

comment on function conviteria.chamar_worker_google_lembretes() is
  'Dispara a Edge Function que processa lembretes Google vencidos.';
