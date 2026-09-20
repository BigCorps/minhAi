-- ConviteIA — WhatsApp do Evento + correção estrutural Família → Membros → RSVP
-- 2026-09-18
--
-- Este SQL é idempotente e NÃO interpreta nomes de famílias existentes.
-- Não recria famílias, não altera familia.id, não altera qr_token e não cria
-- membros automaticamente a partir de textos como "Thais e Bruno".
--
-- Acompanhantes extras novos começam em 0 para registros existentes.
-- max_acompanhantes é preservado somente por compatibilidade/legado.

-- ---------------------------------------------------------------------------
-- 1) Central de Convidados: separar membros cadastrados de extras do RSVP
-- ---------------------------------------------------------------------------

alter table conviteria.convidado_familias
  add column if not exists extras_permitidos integer not null default 0;

alter table conviteria.convidados_lista
  add column if not exists rsvp_extra boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'convidado_familias_extras_permitidos_check'
      and conrelid = 'conviteria.convidado_familias'::regclass
  ) then
    alter table conviteria.convidado_familias
      add constraint convidado_familias_extras_permitidos_check
      check (extras_permitidos between 0 and 50);
  end if;
end $$;

create index if not exists convidados_lista_familia_extra_idx
  on conviteria.convidados_lista(evento_id, familia_id, rsvp_extra);

comment on column conviteria.convidado_familias.extras_permitidos is
  'Quantidade de acompanhantes adicionais sem cadastro prévio que o convidado pode informar no RSVP. Não inclui os membros do grupo.';

comment on column conviteria.convidados_lista.rsvp_extra is
  'True quando a pessoa foi materializada pela confirmação como acompanhante extra. False para membro previamente cadastrado.';

comment on column conviteria.convidado_familias.max_acompanhantes is
  'Campo legado preservado por compatibilidade. O fluxo atual usa extras_permitidos e membros reais em convidados_lista.';

-- ---------------------------------------------------------------------------
-- 2) WhatsApp do Evento — R$ 19,90 / até 600 mensagens / 2 rodadas
-- ---------------------------------------------------------------------------

create table if not exists conviteria.evento_whatsapp_config (
  evento_id uuid primary key references conviteria.eventos(id) on delete cascade,
  status text not null default 'nao_contratado'
    check (status in ('nao_contratado','aguardando_pagamento','ativo')),
  preco_centavos integer not null default 1990 check (preco_centavos = 1990),
  limite_mensagens integer not null default 600 check (limite_mensagens = 600),
  lembrete_modo text null check (lembrete_modo in ('2_meses','1_mes','15_dias')),
  segundo_programado_em timestamptz null,
  primeiro_disparo_em timestamptz null,
  segundo_disparo_em timestamptz null,
  consentimento_declarado_em timestamptz null,
  pix_transaction_id uuid null,
  pix_txid text null,
  comprado_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conviteria.evento_whatsapp_envios (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references conviteria.eventos(id) on delete cascade,
  familia_id uuid null references conviteria.convidado_familias(id) on delete set null,
  convidado_lista_id uuid null references conviteria.convidados_lista(id) on delete set null,
  telefone_normalizado text not null,
  rodada smallint not null check (rodada in (1,2)),
  status text not null default 'reservado'
    check (status in ('reservado','enviado','falhou')),
  template_nome text not null,
  tentativas smallint not null default 1 check (tentativas between 1 and 3),
  wamid text null,
  erro text null,
  reservado_em timestamptz null,
  enviado_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evento_id, rodada, telefone_normalizado)
);

create index if not exists evento_whatsapp_config_status_idx
  on conviteria.evento_whatsapp_config(status, segundo_programado_em);
create index if not exists evento_whatsapp_envios_evento_idx
  on conviteria.evento_whatsapp_envios(evento_id, rodada, status);
create index if not exists evento_whatsapp_envios_wamid_idx
  on conviteria.evento_whatsapp_envios(wamid)
  where wamid is not null;

create or replace function conviteria.whatsapp_enforce_limit()
returns trigger
language plpgsql
as $$
declare
  usados integer;
begin
  if new.status not in ('reservado','enviado') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.evento_id::text, 0));

  select count(*) into usados
  from conviteria.evento_whatsapp_envios e
  where e.evento_id = new.evento_id
    and e.status in ('reservado','enviado')
    and e.id <> new.id;

  if usados >= 600 then
    raise exception 'limite_whatsapp_evento_atingido';
  end if;
  return new;
end;
$$;

drop trigger if exists evento_whatsapp_envios_limit on conviteria.evento_whatsapp_envios;
create trigger evento_whatsapp_envios_limit
before insert or update of status on conviteria.evento_whatsapp_envios
for each row execute function conviteria.whatsapp_enforce_limit();

create or replace function conviteria.whatsapp_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists evento_whatsapp_config_touch on conviteria.evento_whatsapp_config;
create trigger evento_whatsapp_config_touch
before update on conviteria.evento_whatsapp_config
for each row execute function conviteria.whatsapp_touch_updated_at();

drop trigger if exists evento_whatsapp_envios_touch on conviteria.evento_whatsapp_envios;
create trigger evento_whatsapp_envios_touch
before update on conviteria.evento_whatsapp_envios
for each row execute function conviteria.whatsapp_touch_updated_at();

alter table conviteria.evento_whatsapp_config enable row level security;
alter table conviteria.evento_whatsapp_envios enable row level security;

drop policy if exists evento_whatsapp_config_owner_all on conviteria.evento_whatsapp_config;
create policy evento_whatsapp_config_owner_all
on conviteria.evento_whatsapp_config
for all
using (conviteria.e_dono(evento_id))
with check (conviteria.e_dono(evento_id));

drop policy if exists evento_whatsapp_envios_owner_all on conviteria.evento_whatsapp_envios;
create policy evento_whatsapp_envios_owner_all
on conviteria.evento_whatsapp_envios
for all
using (conviteria.e_dono(evento_id))
with check (conviteria.e_dono(evento_id));

comment on table conviteria.evento_whatsapp_config is
  'Adicional WhatsApp do Evento do ConviteIA: compra, franquia e agendamento das duas rodadas.';
comment on table conviteria.evento_whatsapp_envios is
  'Log/deduplicação por evento, rodada e telefone. A lista/RSVP continua sendo a fonte única de convidados.';
