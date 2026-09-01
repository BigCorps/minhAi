-- ConviteIA — carrinho de presentes
-- Um checkout = um PIX; cada item continua sendo uma linha em presente_pagamentos.

create table if not exists conviteria.presente_checkouts (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references conviteria.eventos(id) on delete cascade,
  pix_transaction_id uuid,
  txid text unique,
  total_centavos integer not null check (total_centavos > 0),
  taxa_centavos integer not null default 0 check (taxa_centavos >= 0),
  liquido_centavos integer not null check (liquido_centavos > 0),
  pagador_nome text,
  mensagem text,
  ip_hash text,
  status text not null default 'pendente'
    check (status in ('pendente','pago','expirado','estornado')),
  created_at timestamptz not null default now(),
  pago_em timestamptz
);

alter table conviteria.presente_checkouts enable row level security;

alter table conviteria.presente_pagamentos
  add column if not exists checkout_id uuid
    references conviteria.presente_checkouts(id) on delete set null;

create index if not exists presente_checkouts_evento_created_idx
  on conviteria.presente_checkouts(evento_id, created_at desc);

create index if not exists presente_checkouts_ip_created_idx
  on conviteria.presente_checkouts(ip_hash, created_at desc);

create index if not exists presente_pagamentos_checkout_idx
  on conviteria.presente_pagamentos(checkout_id);

-- Processa um carrinho inteiro dentro de UMA transação Postgres.
-- A trava/status do checkout torna a operação idempotente.
create or replace function conviteria.processar_checkout_presente(
  p_checkout_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = conviteria, public
as $$
declare
  v_evento_id uuid;
  v_liquido bigint;
  v_item record;
begin
  select evento_id
    into v_evento_id
  from conviteria.presente_checkouts
  where id = p_checkout_id
    and status = 'pendente'
  for update;

  if not found then
    return false;
  end if;

  update conviteria.presente_checkouts
     set status = 'pago',
         pago_em = now()
   where id = p_checkout_id
     and status = 'pendente';

  update conviteria.presente_pagamentos
     set status = 'pago',
         pago_em = now()
   where checkout_id = p_checkout_id
     and status = 'pendente';

  select coalesce(sum(liquido_centavos), 0)
    into v_liquido
  from conviteria.presente_pagamentos
  where checkout_id = p_checkout_id
    and status = 'pago';

  if v_liquido <= 0 then
    raise exception 'checkout_sem_itens';
  end if;

  perform conviteria.creditar_saldo_evento(v_evento_id, v_liquido);

  for v_item in
    select presente_id
    from conviteria.presente_pagamentos
    where checkout_id = p_checkout_id
      and status = 'pago'
      and presente_id is not null
  loop
    perform conviteria.incrementar_cota(v_item.presente_id);
  end loop;

  return true;
end;
$$;

revoke all on function conviteria.processar_checkout_presente(uuid)
  from public, anon, authenticated;
grant execute on function conviteria.processar_checkout_presente(uuid)
  to service_role;
