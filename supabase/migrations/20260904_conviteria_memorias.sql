-- ConviteIA — Memórias do Evento
-- Execute UMA vez no projeto minhAi antes de publicar o frontend deste ZIP.
-- A migration é aditiva: não altera dados atuais de convites, presentes ou mensalidades.

begin;

create table if not exists conviteria.evento_memorias_config (
  evento_id uuid primary key references conviteria.eventos(id) on delete cascade,
  status text not null default 'nao_contratado'
    check (status in ('nao_contratado','aguardando_pagamento','ativo','expirado')),
  aprovacao_manual boolean not null default false,
  limite_fotos integer not null default 300 check (limite_fotos > 0),
  limite_videos integer not null default 30 check (limite_videos >= 0),
  limite_bytes bigint not null default 314572800 check (limite_bytes > 0),
  video_max_segundos integer not null default 30 check (video_max_segundos > 0),
  video_max_bytes bigint not null default 8388608 check (video_max_bytes > 0),
  compra_valor_centavos integer not null default 1990 check (compra_valor_centavos >= 0),
  pix_transaction_id uuid null,
  pix_txid text null,
  comprado_em timestamptz null,
  expira_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evento_memorias_config_status_expira_idx
  on conviteria.evento_memorias_config(status, expira_em);
create unique index if not exists evento_memorias_config_pix_transaction_idx
  on conviteria.evento_memorias_config(pix_transaction_id)
  where pix_transaction_id is not null;
create unique index if not exists evento_memorias_config_pix_txid_idx
  on conviteria.evento_memorias_config(pix_txid)
  where pix_txid is not null;

create table if not exists conviteria.evento_memorias (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references conviteria.eventos(id) on delete cascade,
  tipo text not null check (tipo in ('foto','video')),
  storage_path text not null unique,
  mime_type text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0),
  duracao_segundos numeric(8,2) null check (duracao_segundos is null or duracao_segundos >= 0),
  largura integer null check (largura is null or largura > 0),
  altura integer null check (altura is null or altura > 0),
  nome_convidado text null,
  status text not null default 'reservado'
    check (status in ('reservado','pendente','aprovado','oculto','excluido')),
  ip_hash text null,
  reserva_expira_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evento_memorias_evento_status_created_idx
  on conviteria.evento_memorias(evento_id, status, created_at);
create index if not exists evento_memorias_reserva_idx
  on conviteria.evento_memorias(status, reserva_expira_em)
  where status = 'reservado';
create index if not exists evento_memorias_ip_idx
  on conviteria.evento_memorias(evento_id, ip_hash, created_at)
  where ip_hash is not null;

alter table conviteria.evento_memorias_config enable row level security;
alter table conviteria.evento_memorias enable row level security;
-- Sem policies públicas de propósito. O schema conviteria continua acessado pelo
-- backend service-role; convidados recebem somente URLs assinadas e broadcasts.

-- Reserva atômica de quota. Vários convidados podem enviar ao mesmo tempo no
-- evento; o FOR UPDATE serializa somente as reservas DESTE evento e impede duas
-- requisições concorrentes de ambas enxergarem o mesmo espaço livre.
create or replace function conviteria.reservar_evento_memoria(
  p_id uuid,
  p_evento_id uuid,
  p_tipo text,
  p_storage_path text,
  p_mime_type text,
  p_tamanho_bytes bigint,
  p_duracao_segundos numeric,
  p_largura integer,
  p_altura integer,
  p_nome_convidado text,
  p_ip_hash text,
  p_reserva_expira_em timestamptz
) returns text
language plpgsql
security definer
set search_path = pg_catalog, conviteria
as $$
declare
  v_cfg conviteria.evento_memorias_config%rowtype;
  v_fotos integer := 0;
  v_videos integer := 0;
  v_bytes bigint := 0;
begin
  select * into v_cfg
  from conviteria.evento_memorias_config
  where evento_id = p_evento_id
  for update;

  if not found
     or v_cfg.status <> 'ativo'
     or (v_cfg.expira_em is not null and v_cfg.expira_em <= now()) then
    return 'pacote_inativo';
  end if;

  select
    count(*) filter (where tipo = 'foto')::integer,
    count(*) filter (where tipo = 'video')::integer,
    coalesce(sum(tamanho_bytes), 0)::bigint
  into v_fotos, v_videos, v_bytes
  from conviteria.evento_memorias
  where evento_id = p_evento_id
    and status <> 'excluido'
    and (
      status <> 'reservado'
      or reserva_expira_em is null
      or reserva_expira_em > now()
    );

  if p_tipo = 'foto' and v_fotos >= v_cfg.limite_fotos then
    return 'limite_fotos';
  end if;
  if p_tipo = 'video' and v_videos >= v_cfg.limite_videos then
    return 'limite_videos';
  end if;
  if v_bytes + p_tamanho_bytes > v_cfg.limite_bytes then
    return 'limite_bytes';
  end if;

  insert into conviteria.evento_memorias (
    id, evento_id, tipo, storage_path, mime_type, tamanho_bytes,
    duracao_segundos, largura, altura, nome_convidado, status, ip_hash,
    reserva_expira_em
  ) values (
    p_id, p_evento_id, p_tipo, p_storage_path, p_mime_type, p_tamanho_bytes,
    p_duracao_segundos, p_largura, p_altura, p_nome_convidado, 'reservado',
    p_ip_hash, p_reserva_expira_em
  );

  return 'ok';
exception
  when unique_violation then return 'conflito';
end;
$$;

revoke all on function conviteria.reservar_evento_memoria(
  uuid, uuid, text, text, text, bigint, numeric, integer, integer, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function conviteria.reservar_evento_memoria(
  uuid, uuid, text, text, text, bigint, numeric, integer, integer, text, text, timestamptz
) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'conviteria-memorias',
  'conviteria-memorias',
  false,
  8388608,
  array[
    'image/jpeg','image/png','image/webp','image/heic','image/heif',
    'video/mp4','video/quicktime','video/webm'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Broadcast público contém SOMENTE sinal de atualização; mídia continua privada.
create or replace function conviteria.broadcast_evento_memoria()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, conviteria
as $$
declare
  v_evento_id uuid;
  v_status text;
  v_emitir boolean := false;
begin
  if tg_op = 'DELETE' then
    v_evento_id := old.evento_id;
    v_status := old.status;
    v_emitir := old.status = 'aprovado';
  elsif tg_op = 'INSERT' then
    v_evento_id := new.evento_id;
    v_status := new.status;
    v_emitir := new.status = 'aprovado';
  else
    v_evento_id := new.evento_id;
    v_status := new.status;
    v_emitir := (new.status is distinct from old.status)
      and (new.status = 'aprovado' or old.status = 'aprovado');
  end if;

  if v_emitir then
    perform realtime.send(
      jsonb_build_object(
        'evento_id', v_evento_id,
        'acao', lower(tg_op),
        'status', v_status
      ),
      'memoria',
      'convite-memorias:' || v_evento_id::text,
      false
    );
  end if;

  return null;
end;
$$;

drop trigger if exists evento_memorias_broadcast_trg on conviteria.evento_memorias;
create trigger evento_memorias_broadcast_trg
after insert or update or delete on conviteria.evento_memorias
for each row execute function conviteria.broadcast_evento_memoria();


-- Visão somente para conferência administrativa via SQL/MCP. Não recebe GRANT
-- público e não participa do fluxo do convidado.
create or replace view conviteria.v_evento_memorias_resumo as
select
  c.evento_id,
  e.slug,
  c.status,
  c.aprovacao_manual,
  c.comprado_em,
  c.expira_em,
  count(m.id) filter (where m.status <> 'excluido') as arquivos,
  count(m.id) filter (where m.tipo = 'foto' and m.status <> 'excluido') as fotos,
  count(m.id) filter (where m.tipo = 'video' and m.status <> 'excluido') as videos,
  coalesce(sum(m.tamanho_bytes) filter (where m.status <> 'excluido'), 0)::bigint as bytes_armazenados
from conviteria.evento_memorias_config c
join conviteria.eventos e on e.id = c.evento_id
left join conviteria.evento_memorias m on m.evento_id = c.evento_id
group by c.evento_id, e.slug, c.status, c.aprovacao_manual, c.comprado_em, c.expira_em;

commit;
