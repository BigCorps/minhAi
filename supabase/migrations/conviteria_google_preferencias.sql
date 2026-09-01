-- ConviteIA — Google 4
-- Preferências de comunicação por convite/evento.
--
-- Ficam separadas de google_conexoes para sobreviver a desconectar/reconectar
-- a conta Google.

create table if not exists conviteria.google_preferencias (
  evento_id uuid primary key
    references conviteria.eventos(id) on delete cascade,

  enviar_confirmacao boolean not null default true,
  lembrete_30d boolean not null default true,
  lembrete_7d boolean not null default true,
  lembrete_1d boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conviteria.google_preferencias enable row level security;

revoke all on table conviteria.google_preferencias from anon, authenticated;
grant all on table conviteria.google_preferencias to service_role;

create or replace function conviteria.google_preferencias_touch_updated_at()
returns trigger
language plpgsql
set search_path = conviteria, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_google_preferencias_updated_at
  on conviteria.google_preferencias;

create trigger trg_google_preferencias_updated_at
before update on conviteria.google_preferencias
for each row
execute function conviteria.google_preferencias_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Substitui a função do ZIP 3 para também respeitar preferências.
-- Se ainda não existe linha de preferências, o padrão é tudo ligado.
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

  v_pref_30d boolean := true;
  v_pref_7d boolean := true;
  v_pref_1d boolean := true;

  v_tipo text;
  v_dias integer;
  v_habilitado boolean;
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

  select
    coalesce(lembrete_30d, true),
    coalesce(lembrete_7d, true),
    coalesce(lembrete_1d, true)
  into
    v_pref_30d,
    v_pref_7d,
    v_pref_1d
  from conviteria.google_preferencias
  where evento_id = v_convidado.evento_id;

  -- SELECT sem linha deixa as variáveis nulas; volta aos defaults.
  v_pref_30d := coalesce(v_pref_30d, true);
  v_pref_7d := coalesce(v_pref_7d, true);
  v_pref_1d := coalesce(v_pref_1d, true);

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

  for v_tipo, v_dias, v_habilitado in
    select *
    from (
      values
        ('lembrete_30d'::text, 30, v_pref_30d),
        ('lembrete_7d'::text, 7, v_pref_7d),
        ('lembrete_1d'::text, 1, v_pref_1d)
    ) as x(tipo, dias, habilitado)
  loop
    v_quando := conviteria.data_lembrete_google(v_data_evento, v_dias);

    v_status := case
      when not v_habilitado then 'ignorado'
      when v_quando > now() then 'agendado'
      else 'ignorado'
    end;

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
-- Alterar preferências reage imediatamente sobre a fila já existente.
-- ---------------------------------------------------------------------------
create or replace function conviteria.trg_reagendar_preferencias_google()
returns trigger
language plpgsql
security definer
set search_path = conviteria, public
as $$
declare
  v_id uuid;
begin
  for v_id in
    select id
    from conviteria.convidados
    where evento_id = new.evento_id
      and comparecera = true
  loop
    perform conviteria.sincronizar_lembretes_google(v_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_conviteia_google_preferencias
  on conviteria.google_preferencias;

create trigger trg_conviteia_google_preferencias
after insert or update of lembrete_30d, lembrete_7d, lembrete_1d
on conviteria.google_preferencias
for each row
execute function conviteria.trg_reagendar_preferencias_google();

comment on table conviteria.google_preferencias is
  'Preferências de confirmação e lembretes Google de cada evento ConviteIA.';
