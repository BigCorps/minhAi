-- ConviteIA — Google 1
-- Conexão Google isolada por convite/evento.
-- Os tokens ficam somente no schema conviteria, acessados por service_role.

create table if not exists conviteria.google_conexoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique
    references conviteria.eventos(id) on delete cascade,

  google_email text not null,
  google_user_id text,

  access_token text not null,
  refresh_token text not null,
  token_type text,
  scopes text[] not null default '{}'::text[],
  expires_at timestamptz not null,

  is_active boolean not null default true,
  last_token_refresh timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conviteria.google_oauth_states (
  id uuid primary key default gen_random_uuid(),

  -- Nunca guardamos o state OAuth em claro.
  state_hash text not null unique,

  evento_id uuid not null
    references conviteria.eventos(id) on delete cascade,

  user_id uuid not null
    references auth.users(id) on delete cascade,

  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists google_conexoes_evento_idx
  on conviteria.google_conexoes(evento_id);

create index if not exists google_oauth_states_evento_usuario_idx
  on conviteria.google_oauth_states(evento_id, user_id);

create index if not exists google_oauth_states_expira_idx
  on conviteria.google_oauth_states(expires_at);

alter table conviteria.google_conexoes enable row level security;
alter table conviteria.google_oauth_states enable row level security;

-- Nenhum acesso direto de anon/authenticated.
-- O navegador consulta somente as rotas seguras da ConviteIA.
revoke all on table conviteria.google_conexoes from anon, authenticated;
revoke all on table conviteria.google_oauth_states from anon, authenticated;

grant all on table conviteria.google_conexoes to service_role;
grant all on table conviteria.google_oauth_states to service_role;

create or replace function conviteria.google_conexoes_touch_updated_at()
returns trigger
language plpgsql
set search_path = conviteria, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_google_conexoes_updated_at
  on conviteria.google_conexoes;

create trigger trg_google_conexoes_updated_at
before update on conviteria.google_conexoes
for each row
execute function conviteria.google_conexoes_touch_updated_at();

comment on table conviteria.google_conexoes is
  'Conta Google conectada especificamente a um evento ConviteIA.';

comment on table conviteria.google_oauth_states is
  'States OAuth temporários, de uso único, para proteger a conexão Google da ConviteIA.';
