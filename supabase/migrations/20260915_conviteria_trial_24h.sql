-- ConviteIA — trial real de 24 horas
-- Base de código: 61195c9d7c48ea38cc7b4c1eab0b4bd282c90bdd
--
-- Regras:
--   * uma utilização por conta;
--   * publicado_em continua significando SOMENTE publicação definitiva/paga;
--   * dados gerados no trial recebem teste_id para limpeza seletiva;
--   * Memórias em trial usa status "teste" e a mesma reserva atômica existente.

begin;

create table if not exists conviteria.evento_testes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid unique references conviteria.eventos(id) on delete set null,
  conta_id uuid not null unique references conviteria.contas(id) on delete cascade,
  iniciado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  convertido_em timestamptz null,
  limpo_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evento_testes_periodo_chk check (expira_em > iniciado_em)
);

alter table conviteria.evento_testes enable row level security;

create index if not exists evento_testes_expiracao_idx
  on conviteria.evento_testes (expira_em)
  where convertido_em is null;

create index if not exists evento_testes_limpeza_idx
  on conviteria.evento_testes (expira_em, limpo_em)
  where convertido_em is null and limpo_em is null;

alter table conviteria.convidados
  add column if not exists teste_id uuid null
  references conviteria.evento_testes(id) on delete set null;

alter table conviteria.recados
  add column if not exists teste_id uuid null
  references conviteria.evento_testes(id) on delete set null;

alter table conviteria.evento_memorias
  add column if not exists teste_id uuid null
  references conviteria.evento_testes(id) on delete set null;

create index if not exists convidados_teste_id_idx
  on conviteria.convidados (teste_id)
  where teste_id is not null;

create index if not exists recados_teste_id_idx
  on conviteria.recados (teste_id)
  where teste_id is not null;

create index if not exists evento_memorias_teste_id_idx
  on conviteria.evento_memorias (teste_id)
  where teste_id is not null;

-- O status "teste" é intencionalmente separado de "ativo": nunca equivale a compra.
alter table conviteria.evento_memorias_config
  drop constraint if exists evento_memorias_config_status_check;

alter table conviteria.evento_memorias_config
  add constraint evento_memorias_config_status_check
  check (status in ('nao_contratado','aguardando_pagamento','teste','ativo','expirado'));

-- Mantém a assinatura da RPC validada em produção. A única mudança de regra é
-- aceitar o pacote limitado de trial além do pacote comprado.
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
)
returns text
language plpgsql
security definer
set search_path to 'pg_catalog', 'conviteria'
as $function$
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
     or (
       v_cfg.status not in ('ativo', 'teste')
       and not (
         v_cfg.status = 'aguardando_pagamento'
         and exists (
           select 1
           from conviteria.evento_testes t
           join conviteria.eventos e on e.id = t.evento_id
           where t.evento_id = p_evento_id
             and t.convertido_em is null
             and least(
               t.expira_em,
               coalesce(e.data_evento - interval '24 hours', t.expira_em)
             ) > now()
         )
       )
     )
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
$function$;

commit;
