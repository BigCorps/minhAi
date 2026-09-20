-- ConviteIA — responsáveis externos de check-in
-- Acesso mínimo: o usuário autenticado por magic link só pode usar as rotas de check-in.
-- As demais rotas da Gestão continuam exigindo que o usuário seja o dono do evento.

begin;

create table if not exists conviteria.checkin_acessos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references conviteria.eventos(id) on delete cascade,
  email text not null,
  user_id uuid,
  ativo boolean not null default true,
  criado_por uuid not null,
  convite_enviado_em timestamptz,
  ultimo_acesso_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkin_acessos_email_chk
    check (char_length(email) between 5 and 180 and email = lower(email)),
  constraint checkin_acessos_evento_email_uniq unique (evento_id, email)
);

create index if not exists checkin_acessos_evento_ativo_idx
  on conviteria.checkin_acessos(evento_id, ativo);

create index if not exists checkin_acessos_user_idx
  on conviteria.checkin_acessos(user_id)
  where user_id is not null;

alter table conviteria.checkin_acessos enable row level security;

revoke all on table conviteria.checkin_acessos from anon, authenticated;
grant all on table conviteria.checkin_acessos to service_role;

commit;
