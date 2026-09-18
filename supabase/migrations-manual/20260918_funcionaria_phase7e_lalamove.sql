-- FuncionarIA — Fase 7E: Lalamove hardening + delivery storefront
-- Base de código esperada: a4a6172d3f13741fae413d7ddc07289800f1fd96
--
-- Objetivos:
-- 1) cotação pública server-authoritative;
-- 2) markup comercial padrão continua na Edge (50%);
-- 3) despacho só depois de pedido pago;
-- 4) impedir despacho duplicado;
-- 5) webhook idempotente/ordenado;
-- 6) remover telefone/coordenadas placeholder;
-- 7) registrar estados de cotação/despacho para reconciliação.

begin;

alter table public.companies
  add column if not exists delivery_pickup_phone text;

-- Reaproveita o telefone comercial para quem já usava entrega antes desta fase.
update public.companies
set delivery_pickup_phone = telefone_fixo
where delivery_enabled = true
  and coalesce(trim(delivery_pickup_phone), '') = ''
  and coalesce(trim(telefone_fixo), '') <> '';

alter table public.pedidos
  add column if not exists lalamove_quotation_id text,
  add column if not exists lalamove_quote_expires_at timestamptz,
  add column if not exists delivery_quote_request_id uuid,
  add column if not exists delivery_dispatch_request_id uuid,
  add column if not exists delivery_dispatch_state text not null default 'not_requested',
  add column if not exists delivery_dispatch_attempted_at timestamptz,
  add column if not exists delivery_last_error text,
  add column if not exists delivery_last_webhook_at timestamptz,
  add column if not exists delivery_last_webhook_event_id text,
  add column if not exists delivery_fee_reserved_cents integer,
  add column if not exists delivery_fee_reserved_at timestamptz,
  add column if not exists delivery_fee_refunded_at timestamptz,
  add column if not exists delivery_who_pays_snapshot text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pedidos'::regclass
      and conname = 'pedidos_delivery_dispatch_state_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_delivery_dispatch_state_check
      check (delivery_dispatch_state in (
        'not_requested','ready','creating','created','failed','uncertain'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pedidos'::regclass
      and conname = 'pedidos_delivery_who_pays_snapshot_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_delivery_who_pays_snapshot_check
      check (delivery_who_pays_snapshot is null or delivery_who_pays_snapshot in ('cliente','empresa'));
  end if;
end
$$;

update public.pedidos
set delivery_dispatch_state = case
  when lalamove_order_id is not null then 'created'
  when delivery_requested = true then 'ready'
  else 'not_requested'
end
where delivery_dispatch_state = 'not_requested';

update public.pedidos p
set delivery_who_pays_snapshot = case when c.delivery_who_pays = 'empresa' then 'empresa' else 'cliente' end
from public.companies c
where c.id = p.company_id
  and p.delivery_requested = true
  and p.delivery_who_pays_snapshot is null;

create unique index if not exists pedidos_lalamove_order_id_uidx
  on public.pedidos(lalamove_order_id)
  where lalamove_order_id is not null;

create table if not exists public.lalamove_webhook_events (
  event_id text primary key,
  lalamove_order_id text,
  event_type text not null,
  event_timestamp_ms bigint,
  received_at timestamptz not null default now()
);

alter table public.lalamove_webhook_events enable row level security;
revoke all on table public.lalamove_webhook_events from public, anon, authenticated;
grant all on table public.lalamove_webhook_events to service_role;

-- Reserva um despacho de modo atômico.
-- Se uma tentativa ficou "creating" sem resposta por mais de 3 minutos, ela vira
-- "uncertain". Não repetimos às cegas porque o provedor pode ter criado a entrega.
create or replace function public.funcionaria_prepare_lalamove_dispatch(
  p_pedido_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_pedido public.pedidos%rowtype;
  v_request_id uuid;
begin
  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'pedido_not_found');
  end if;

  if v_pedido.lalamove_order_id is not null then
    return jsonb_build_object(
      'success', true,
      'already_created', true,
      'order_id', v_pedido.lalamove_order_id,
      'share_link', v_pedido.delivery_share_link
    );
  end if;

  if v_pedido.delivery_requested is distinct from true then
    return jsonb_build_object('success', false, 'error', 'delivery_not_requested');
  end if;

  if v_pedido.status not in ('pago','entregue') then
    return jsonb_build_object(
      'success', false,
      'error', 'payment_not_confirmed',
      'status', v_pedido.status
    );
  end if;

  if v_pedido.delivery_dispatch_state = 'uncertain' then
    return jsonb_build_object('success', false, 'error', 'dispatch_uncertain');
  end if;

  if v_pedido.delivery_dispatch_state = 'creating' then
    if v_pedido.delivery_dispatch_attempted_at is not null
       and v_pedido.delivery_dispatch_attempted_at < now() - interval '3 minutes' then
      update public.pedidos
      set delivery_dispatch_state = 'uncertain',
          delivery_last_error = 'provider_response_unknown',
          updated_at = now()
      where id = p_pedido_id;

      return jsonb_build_object('success', false, 'error', 'dispatch_uncertain');
    end if;

    return jsonb_build_object(
      'success', false,
      'error', 'dispatch_in_progress',
      'request_id', v_pedido.delivery_dispatch_request_id
    );
  end if;

  v_request_id := gen_random_uuid();

  update public.pedidos
  set delivery_dispatch_state = 'creating',
      delivery_dispatch_request_id = v_request_id,
      delivery_dispatch_attempted_at = now(),
      delivery_last_error = null,
      updated_at = now()
  where id = p_pedido_id;

  return jsonb_build_object(
    'success', true,
    'already_created', false,
    'request_id', v_request_id
  );
end;
$function$;

revoke all on function public.funcionaria_prepare_lalamove_dispatch(uuid)
  from public, anon, authenticated;
grant execute on function public.funcionaria_prepare_lalamove_dispatch(uuid)
  to service_role;

-- Reserva o valor do frete uma única vez quando a empresa é quem paga.
create or replace function public.funcionaria_reserve_delivery_fee(
  p_pedido_id uuid,
  p_amount_cents integer,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_pedido public.pedidos%rowtype;
  v_balance integer;
  v_after integer;
  v_user_id uuid;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_delivery_amount');
  end if;

  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'pedido_not_found');
  end if;

  if v_pedido.delivery_fee_reserved_at is not null
     and v_pedido.delivery_fee_refunded_at is null then
    return jsonb_build_object(
      'success', true,
      'already_reserved', true,
      'amount_cents', v_pedido.delivery_fee_reserved_cents
    );
  end if;

  select available_balance_cents, user_id
    into v_balance, v_user_id
  from public.company_balance
  where company_id = v_pedido.company_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'empresa_sem_saldo_cadastrado');
  end if;

  if v_balance < p_amount_cents then
    return jsonb_build_object(
      'success', false,
      'error', 'saldo_insuficiente',
      'available', v_balance,
      'required', p_amount_cents
    );
  end if;

  v_after := v_balance - p_amount_cents;

  update public.company_balance
  set available_balance_cents = v_after,
      updated_at = now()
  where company_id = v_pedido.company_id;

  insert into public.balance_transactions (
    company_id, user_id, transaction_type, amount_cents,
    balance_before_cents, balance_after_cents, description, metadata
  ) values (
    v_pedido.company_id,
    v_user_id,
    'delivery_fee',
    -p_amount_cents,
    v_balance,
    v_after,
    'Frete Lalamove — pedido ' || left(p_pedido_id::text, 8),
    jsonb_build_object(
      'pedido_id', p_pedido_id,
      'request_id', p_request_id,
      'phase', 'reserve'
    )
  );

  update public.pedidos
  set delivery_fee_reserved_cents = p_amount_cents,
      delivery_fee_reserved_at = now(),
      delivery_fee_refunded_at = null,
      updated_at = now()
  where id = p_pedido_id;

  return jsonb_build_object(
    'success', true,
    'already_reserved', false,
    'amount_cents', p_amount_cents,
    'balance_after', v_after
  );
end;
$function$;

revoke all on function public.funcionaria_reserve_delivery_fee(uuid,integer,uuid)
  from public, anon, authenticated;
grant execute on function public.funcionaria_reserve_delivery_fee(uuid,integer,uuid)
  to service_role;

create or replace function public.funcionaria_refund_delivery_fee(
  p_pedido_id uuid,
  p_reason text default 'lalamove_dispatch_failed'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_pedido public.pedidos%rowtype;
  v_balance integer;
  v_after integer;
  v_user_id uuid;
  v_amount integer;
begin
  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'pedido_not_found');
  end if;

  if v_pedido.delivery_fee_reserved_at is null
     or v_pedido.delivery_fee_refunded_at is not null then
    return jsonb_build_object('success', true, 'already_refunded', true);
  end if;

  v_amount := coalesce(v_pedido.delivery_fee_reserved_cents, 0);
  if v_amount <= 0 then
    return jsonb_build_object('success', true, 'already_refunded', true);
  end if;

  select available_balance_cents, user_id
    into v_balance, v_user_id
  from public.company_balance
  where company_id = v_pedido.company_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'empresa_sem_saldo_cadastrado');
  end if;

  v_after := v_balance + v_amount;

  update public.company_balance
  set available_balance_cents = v_after,
      updated_at = now()
  where company_id = v_pedido.company_id;

  insert into public.balance_transactions (
    company_id, user_id, transaction_type, amount_cents,
    balance_before_cents, balance_after_cents, description, metadata
  ) values (
    v_pedido.company_id,
    v_user_id,
    'refund',
    v_amount,
    v_balance,
    v_after,
    'Estorno frete Lalamove — pedido ' || left(p_pedido_id::text, 8),
    jsonb_build_object(
      'pedido_id', p_pedido_id,
      'reason', coalesce(p_reason, 'lalamove_dispatch_failed'),
      'phase', 'refund'
    )
  );

  update public.pedidos
  set delivery_fee_refunded_at = now(),
      updated_at = now()
  where id = p_pedido_id;

  return jsonb_build_object(
    'success', true,
    'already_refunded', false,
    'amount_cents', v_amount,
    'balance_after', v_after
  );
end;
$function$;

revoke all on function public.funcionaria_refund_delivery_fee(uuid,text)
  from public, anon, authenticated;
grant execute on function public.funcionaria_refund_delivery_fee(uuid,text)
  to service_role;

commit;
