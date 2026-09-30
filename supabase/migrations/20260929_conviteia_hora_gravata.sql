-- ConviteIA — Hora da Gravata
-- Implementação consolidada do adicional: configuração, contribuições, processamento
-- idempotente, Realtime do telão, resumo financeiro e disparo Utility via WhatsApp.

create table if not exists conviteria.evento_gravata_config (
  evento_id uuid primary key
    references conviteria.eventos(id) on delete cascade,

  status text not null default 'nao_contratado'
    check (status in ('nao_contratado', 'aguardando_pagamento', 'ativo')),

  preco_centavos integer not null default 1990
    check (preco_centavos = 1990),

  nome_acao text not null default 'Hora da Gravata'
    check (char_length(btrim(nome_acao)) between 1 and 80),

  texto_publico text
    check (texto_publico is null or char_length(texto_publico) <= 500),

  valores_sugeridos_centavos integer[] not null
    default array[1000, 2000, 5000, 10000]::integer[]
    check (cardinality(valores_sugeridos_centavos) between 1 and 6),

  meta_centavos bigint
    check (meta_centavos is null or meta_centavos > 0),

  mostrar_total boolean not null default true,
  mostrar_valor_individual boolean not null default false,
  permitir_anonimo boolean not null default false,

  arrecadacao_aberta boolean not null default false,
  aberta_em timestamptz,
  encerrada_em timestamptz,

  whatsapp_programado_em timestamptz,
  whatsapp_disparo_em timestamptz,
  whatsapp_template_nome text not null default 'conviteia_atividade_evento',
  whatsapp_erro text,

  pix_transaction_id uuid,
  pix_txid text,
  comprado_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint evento_gravata_config_pix_transaction_unique unique (pix_transaction_id),
  constraint evento_gravata_config_pix_txid_unique unique (pix_txid)
);

comment on table conviteria.evento_gravata_config is
  'Adicional Hora da Gravata do ConviteIA. Nome comercial editável por evento; controla compra, experiência ao vivo e disparo opcional via WhatsApp já contratado.';

comment on column conviteria.evento_gravata_config.whatsapp_programado_em is
  'Horário escolhido pelo anfitrião para o aviso da atividade. O backend deve validar que pertence ao dia do evento e que WhatsApp do Evento está ativo.';

create index if not exists evento_gravata_config_status_idx
  on conviteria.evento_gravata_config(status);

create index if not exists evento_gravata_config_whatsapp_programado_idx
  on conviteria.evento_gravata_config(whatsapp_programado_em)
  where status = 'ativo'
    and whatsapp_programado_em is not null
    and whatsapp_disparo_em is null;

alter table conviteria.evento_gravata_config enable row level security;


create table if not exists conviteria.evento_gravata_contribuicoes (
  id uuid primary key default gen_random_uuid(),

  evento_id uuid not null
    references conviteria.eventos(id) on delete cascade,

  familia_id uuid
    references conviteria.convidado_familias(id) on delete set null,

  convidado_lista_id uuid
    references conviteria.convidados_lista(id) on delete set null,

  origem text not null default 'link'
    check (origem in ('qr', 'whatsapp', 'memorias', 'link')),

  nome text
    check (nome is null or char_length(btrim(nome)) between 1 and 100),

  anonimo boolean not null default false,

  valor_centavos bigint not null
    check (valor_centavos > 0),

  taxa_centavos bigint not null default 0
    check (taxa_centavos >= 0),

  liquido_centavos bigint not null
    check (
      liquido_centavos > 0
      and liquido_centavos = valor_centavos - taxa_centavos
    ),

  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'expirado', 'estornado')),

  pix_transaction_id uuid,
  txid text,

  ip_hash text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  pago_em timestamptz,

  constraint evento_gravata_contrib_pix_transaction_unique unique (pix_transaction_id),
  constraint evento_gravata_contrib_txid_unique unique (txid)
);

comment on table conviteria.evento_gravata_contribuicoes is
  'Contribuições financeiras da Hora da Gravata. Separadas de evento_memorias para não misturar retenção/moderação de mídia com histórico financeiro.';

create index if not exists evento_gravata_contrib_evento_status_created_idx
  on conviteria.evento_gravata_contribuicoes(evento_id, status, created_at desc);

create index if not exists evento_gravata_contrib_evento_pago_idx
  on conviteria.evento_gravata_contribuicoes(evento_id, pago_em desc)
  where status = 'pago';

create index if not exists evento_gravata_contrib_ip_created_idx
  on conviteria.evento_gravata_contribuicoes(evento_id, ip_hash, created_at desc)
  where ip_hash is not null;

alter table conviteria.evento_gravata_contribuicoes enable row level security;


-- Marca uma contribuição como paga e credita o saldo em uma única transação.
-- O SELECT ... FOR UPDATE + status='pendente' tornam a operação idempotente:
-- reentregas do webhook retornam false e nunca creditam o saldo duas vezes.
create or replace function conviteria.processar_contribuicao_gravata(
  p_contribuicao_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, conviteria
as $$
declare
  v_evento_id uuid;
  v_liquido bigint;
begin
  select evento_id, liquido_centavos
    into v_evento_id, v_liquido
  from conviteria.evento_gravata_contribuicoes
  where id = p_contribuicao_id
    and status = 'pendente'
  for update;

  if not found then
    return false;
  end if;

  if v_liquido <= 0 then
    raise exception 'contribuicao_sem_liquido';
  end if;

  update conviteria.evento_gravata_contribuicoes
     set status = 'pago',
         pago_em = coalesce(pago_em, now()),
         updated_at = now()
   where id = p_contribuicao_id
     and status = 'pendente';

  if not found then
    return false;
  end if;

  perform conviteria.creditar_saldo_evento(v_evento_id, v_liquido);

  return true;
end;
$$;

revoke all on function conviteria.processar_contribuicao_gravata(uuid)
  from public, anon, authenticated;
grant execute on function conviteria.processar_contribuicao_gravata(uuid)
  to service_role;


-- O Broadcast público carrega SOMENTE um sinal de atualização.
-- Nome, valor, txid e demais dados permanecem fora do canal.
create or replace function conviteria.broadcast_evento_gravata()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, realtime, conviteria
as $$
begin
  if new.status = 'pago'
     and old.status is distinct from new.status then
    perform realtime.send(
      jsonb_build_object(
        'evento_id', new.evento_id,
        'acao', 'pago'
      ),
      'contribuicao',
      'convite-memorias:' || new.evento_id::text,
      false
    );
  end if;

  return null;
end;
$$;

revoke all on function conviteria.broadcast_evento_gravata()
  from public, anon, authenticated;

drop trigger if exists evento_gravata_broadcast_trg
  on conviteria.evento_gravata_contribuicoes;

create trigger evento_gravata_broadcast_trg
after update of status
on conviteria.evento_gravata_contribuicoes
for each row
execute function conviteria.broadcast_evento_gravata();

-- Resumo agregado usado no Financeiro e no telão. Evita somar linhas no cliente
-- e continua correto mesmo com milhares de contribuições.
create or replace function conviteria.resumo_hora_gravata_evento(
  p_evento_id uuid
)
returns table (
  quantidade bigint,
  bruto_centavos bigint,
  taxa_centavos bigint,
  liquido_centavos bigint
)
language sql
security definer
set search_path = pg_catalog, conviteria
as $$
  select
    count(*)::bigint as quantidade,
    coalesce(sum(valor_centavos), 0)::bigint as bruto_centavos,
    coalesce(sum(taxa_centavos), 0)::bigint as taxa_centavos,
    coalesce(sum(liquido_centavos), 0)::bigint as liquido_centavos
  from conviteria.evento_gravata_contribuicoes
  where evento_id = p_evento_id
    and status = 'pago';
$$;

revoke all on function conviteria.resumo_hora_gravata_evento(uuid)
  from public, anon, authenticated;
grant execute on function conviteria.resumo_hora_gravata_evento(uuid)
  to service_role;

-- WhatsApp exclusivo da Hora da Gravata. Fica separado das duas rodadas de RSVP
-- e não consome/substitui os registros de evento_whatsapp_envios.
create table if not exists conviteria.evento_gravata_whatsapp_envios (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references conviteria.eventos(id) on delete cascade,
  familia_id uuid references conviteria.convidado_familias(id) on delete set null,
  convidado_lista_id uuid references conviteria.convidados_lista(id) on delete set null,
  nome_destinatario text not null,
  telefone_normalizado text not null,
  link_token uuid not null default gen_random_uuid(),
  status text not null default 'pendente'
    check (status in ('pendente','reservado','enviado','falhou','cancelado')),
  template_nome text not null default 'conviteia_atividade_evento',
  tentativas integer not null default 0 check (tentativas between 0 and 3),
  wamid text,
  reservado_em timestamptz,
  enviado_em timestamptz,
  erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evento_gravata_whatsapp_evento_telefone_unique unique (evento_id, telefone_normalizado),
  constraint evento_gravata_whatsapp_link_token_unique unique (link_token)
);

alter table conviteria.evento_gravata_whatsapp_envios enable row level security;

create index if not exists evento_gravata_whatsapp_status_idx
  on conviteria.evento_gravata_whatsapp_envios(evento_id, status, created_at);

create index if not exists evento_gravata_whatsapp_link_idx
  on conviteria.evento_gravata_whatsapp_envios(link_token);

comment on table conviteria.evento_gravata_whatsapp_envios is
  'Disparo Utility da Hora da Gravata. Campanha independente das duas rodadas de RSVP do WhatsApp do Evento.';

comment on column conviteria.evento_gravata_whatsapp_envios.link_token is
  'Token opaco usado no botão do template aprovado para redirecionar à experiência pública sem expor nome, telefone ou IDs na URL.';
