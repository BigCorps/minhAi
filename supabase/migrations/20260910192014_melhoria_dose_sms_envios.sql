-- Controle idempotente de escalonamento SMS por dose + cuidador.
create table if not exists melhoria.dose_sms_envios (
  id uuid primary key default gen_random_uuid(),
  dose_evento_id uuid not null references melhoria.dose_eventos(id) on delete cascade,
  cuidador_id uuid not null references melhoria.cuidadores(id) on delete cascade,
  status text not null default 'pendente'
    check (status in ('pendente', 'enviado', 'sem_credito', 'falhou')),
  tentativas smallint not null default 0,
  ultimo_erro text,
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dose_evento_id, cuidador_id)
);

alter table melhoria.dose_sms_envios enable row level security;

create index if not exists dose_sms_envios_evento_status_idx
  on melhoria.dose_sms_envios (dose_evento_id, status);

-- Nenhuma policy para anon/authenticated: esta tabela é operacional e só é
-- manipulada pelos workers com service_role.
revoke all on table melhoria.dose_sms_envios from anon, authenticated;
grant all on table melhoria.dose_sms_envios to service_role;
