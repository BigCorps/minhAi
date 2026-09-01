-- ConviteIA — Google 2
-- Histórico e idempotência dos e-mails enviados pela conta Google do evento.
-- A mesma tabela será reutilizada no ZIP 3 para os lembretes automáticos.

create table if not exists conviteria.google_envios (
  id uuid primary key default gen_random_uuid(),

  evento_id uuid not null
    references conviteria.eventos(id) on delete cascade,

  convidado_id uuid
    references conviteria.convidados(id) on delete cascade,

  tipo text not null,
  idempotency_key text not null unique,

  to_email text,
  status text not null default 'processando',
  google_message_id text,

  agendado_para timestamptz,
  enviado_em timestamptz,
  tentativas integer not null default 0,
  ultimo_erro text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint google_envios_tipo_check
    check (
      tipo in (
        'confirmacao',
        'lembrete_30d',
        'lembrete_7d',
        'lembrete_1d'
      )
    ),

  constraint google_envios_status_check
    check (
      status in (
        'processando',
        'agendado',
        'enviado',
        'falhou',
        'ignorado'
      )
    )
);

create index if not exists google_envios_evento_idx
  on conviteria.google_envios(evento_id, created_at desc);

create index if not exists google_envios_convidado_idx
  on conviteria.google_envios(convidado_id, created_at desc);

create index if not exists google_envios_agendados_idx
  on conviteria.google_envios(status, agendado_para)
  where status = 'agendado';

alter table conviteria.google_envios enable row level security;

revoke all on table conviteria.google_envios from anon, authenticated;
grant all on table conviteria.google_envios to service_role;

create or replace function conviteria.google_envios_touch_updated_at()
returns trigger
language plpgsql
set search_path = conviteria, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_google_envios_updated_at
  on conviteria.google_envios;

create trigger trg_google_envios_updated_at
before update on conviteria.google_envios
for each row
execute function conviteria.google_envios_touch_updated_at();

comment on table conviteria.google_envios is
  'Histórico de confirmações e lembretes enviados pelo Google conectado a cada evento ConviteIA.';
