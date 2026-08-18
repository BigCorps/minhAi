-- ============================================================================
-- ConviteIA — presentes por cartão / InfinitePay
-- FINAL CONSOLIDADO
--
-- ADITIVO:
--   - não altera Edge Functions InfinitePay da minhAi;
--   - não altera public.companies;
--   - não altera o fluxo PIX existente;
--   - reutiliza processar_checkout_presente() e evento_saldo existentes.
--
-- Taxa comercial de processamento:
--   1x  =  4,99%
--   2x  =  7,09%
--   3x  =  8,01%
--   4x  =  8,91%
--   5x  =  9,80%
--   6x  = 10,67%
--
-- taxa_centavos continua sendo o 1% da ConviteIA.
-- taxa_processamento_centavos é InfinitePay + margem BigCorps.
-- ============================================================================

alter table conviteria.presente_checkouts
  add column if not exists metodo_pagamento text not null default 'pix',
  add column if not exists valor_presentes_centavos integer,
  add column if not exists valor_cobrado_centavos integer,
  add column if not exists taxa_processamento_centavos integer not null default 0,
  add column if not exists taxa_processamento_bps integer not null default 0,
  add column if not exists taxa_processamento_responsavel text,
  add column if not exists parcelas integer,
  add column if not exists pagador_telefone text,
  add column if not exists infinitepay_order_nsu text,
  add column if not exists infinitepay_slug text,
  add column if not exists infinitepay_transaction_nsu text,
  add column if not exists infinitepay_receipt_url text,
  add column if not exists infinitepay_capture_method text,
  add column if not exists infinitepay_paid_amount_centavos integer,
  add column if not exists checkout_url text;

-- Backfill dos checkouts PIX já existentes.
update conviteria.presente_checkouts
set
  valor_presentes_centavos =
    coalesce(valor_presentes_centavos, total_centavos),
  valor_cobrado_centavos =
    coalesce(valor_cobrado_centavos, total_centavos)
where
  valor_presentes_centavos is null
  or valor_cobrado_centavos is null;

alter table conviteria.presente_pagamentos
  add column if not exists taxa_processamento_centavos integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'presente_checkouts_metodo_pagamento_chk'
      and conrelid = 'conviteria.presente_checkouts'::regclass
  ) then
    alter table conviteria.presente_checkouts
      add constraint presente_checkouts_metodo_pagamento_chk
      check (metodo_pagamento in ('pix','cartao'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'presente_checkouts_taxa_resp_chk'
      and conrelid = 'conviteria.presente_checkouts'::regclass
  ) then
    alter table conviteria.presente_checkouts
      add constraint presente_checkouts_taxa_resp_chk
      check (
        taxa_processamento_responsavel is null
        or taxa_processamento_responsavel in ('anfitriao','convidado')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'presente_checkouts_parcelas_chk'
      and conrelid = 'conviteria.presente_checkouts'::regclass
  ) then
    alter table conviteria.presente_checkouts
      add constraint presente_checkouts_parcelas_chk
      check (
        parcelas is null
        or parcelas between 1 and 6
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'presente_checkouts_taxa_processamento_nonnegative_chk'
      and conrelid = 'conviteria.presente_checkouts'::regclass
  ) then
    alter table conviteria.presente_checkouts
      add constraint presente_checkouts_taxa_processamento_nonnegative_chk
      check (
        taxa_processamento_centavos >= 0
        and taxa_processamento_bps >= 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'presente_pagamentos_taxa_processamento_nonnegative_chk'
      and conrelid = 'conviteria.presente_pagamentos'::regclass
  ) then
    alter table conviteria.presente_pagamentos
      add constraint presente_pagamentos_taxa_processamento_nonnegative_chk
      check (taxa_processamento_centavos >= 0);
  end if;
end;
$$;

create unique index if not exists
  presente_checkouts_infinitepay_order_nsu_uidx
on conviteria.presente_checkouts(infinitepay_order_nsu)
where infinitepay_order_nsu is not null;

create unique index if not exists
  presente_checkouts_infinitepay_transaction_nsu_uidx
on conviteria.presente_checkouts(infinitepay_transaction_nsu)
where infinitepay_transaction_nsu is not null;

create table if not exists conviteria.pagamento_cartao_config (
  evento_id uuid primary key
    references conviteria.eventos(id)
    on delete cascade,

  ativo boolean not null default true,

  taxa_responsavel text not null default 'anfitriao'
    check (taxa_responsavel in ('anfitriao','convidado')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conviteria.pagamento_cartao_config
  enable row level security;

revoke all
  on table conviteria.pagamento_cartao_config
  from anon, authenticated;

grant all
  on table conviteria.pagamento_cartao_config
  to service_role;

create or replace function conviteria.pagamento_cartao_config_touch()
returns trigger
language plpgsql
set search_path = conviteria, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pagamento_cartao_config_touch
  on conviteria.pagamento_cartao_config;

create trigger trg_pagamento_cartao_config_touch
before update
on conviteria.pagamento_cartao_config
for each row
execute function conviteria.pagamento_cartao_config_touch();

-- --------------------------------------------------------------------------
-- Sincroniza a escolha feita no wizard.
--
-- A preferência fica dentro de:
--   eventos.config.secoes[tipo=presentes].config.cartaoAtivo
--   eventos.config.secoes[tipo=presentes].config.taxaCartaoResponsavel
--
-- Só sincroniza quando pelo menos uma dessas chaves existe. Assim eventos
-- antigos que nunca passaram pelo novo wizard continuam usando o padrão sem
-- sobrescrever uma configuração feita diretamente no painel.
-- --------------------------------------------------------------------------
create or replace function conviteria.sincronizar_cartao_evento()
returns trigger
language plpgsql
security definer
set search_path = conviteria, public
as $$
declare
  v_secao jsonb;
  v_cfg jsonb;
  v_ativo boolean;
  v_responsavel text;
begin
  select x
    into v_secao
  from jsonb_array_elements(
    coalesce(new.config -> 'secoes', '[]'::jsonb)
  ) as x
  where x ->> 'tipo' = 'presentes'
  limit 1;

  if v_secao is null then
    return new;
  end if;

  v_cfg := coalesce(v_secao -> 'config', '{}'::jsonb);

  if not (
    v_cfg ? 'cartaoAtivo'
    or v_cfg ? 'taxaCartaoResponsavel'
  ) then
    return new;
  end if;

  v_ativo :=
    coalesce(v_cfg ->> 'cartaoAtivo', 'sim') <> 'nao';

  v_responsavel :=
    case
      when v_cfg ->> 'taxaCartaoResponsavel' = 'convidado'
        then 'convidado'
      else 'anfitriao'
    end;

  insert into conviteria.pagamento_cartao_config (
    evento_id,
    ativo,
    taxa_responsavel
  )
  values (
    new.id,
    v_ativo,
    v_responsavel
  )
  on conflict (evento_id)
  do update set
    ativo = excluded.ativo,
    taxa_responsavel = excluded.taxa_responsavel,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_eventos_sincronizar_cartao
  on conviteria.eventos;

create trigger trg_eventos_sincronizar_cartao
after insert or update of config
on conviteria.eventos
for each row
execute function conviteria.sincronizar_cartao_evento();

-- Backfill somente de eventos que já tenham as novas chaves no JSON.
update conviteria.eventos
set config = config
where exists (
  select 1
  from jsonb_array_elements(
    coalesce(config -> 'secoes', '[]'::jsonb)
  ) as x
  where
    x ->> 'tipo' = 'presentes'
    and (
      coalesce(x -> 'config', '{}'::jsonb) ? 'cartaoAtivo'
      or coalesce(x -> 'config', '{}'::jsonb) ? 'taxaCartaoResponsavel'
    )
);

comment on table conviteria.pagamento_cartao_config is
  'Configuração de cartão InfinitePay por evento da ConviteIA.';

comment on column conviteria.presente_checkouts.taxa_processamento_centavos is
  'Taxa comercial de processamento do cartão (InfinitePay + BigCorps).';

comment on column conviteria.presente_checkouts.taxa_centavos is
  'Taxa da plataforma ConviteIA (1%), separada da taxa de processamento do cartão.';
