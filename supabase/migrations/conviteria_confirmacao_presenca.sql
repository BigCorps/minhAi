alter table conviteria.convidados
  add column if not exists email text,
  add column if not exists email_normalizado text
    generated always as (lower(trim(email))) stored,
  add column if not exists acompanhantes jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists convidados_evento_email_uidx
  on conviteria.convidados(evento_id, email_normalizado)
  where email_normalizado is not null;

create index if not exists convidados_evento_created_idx
  on conviteria.convidados(evento_id, created_at desc);

comment on column conviteria.convidados.email is
  'E-mail principal da familia; futuro destinatario de confirmacoes e lembretes Gmail.';

comment on column conviteria.convidados.acompanhantes is
  'Array JSON com nomes das demais pessoas da familia que irao ao evento.';
