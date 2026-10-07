-- FuncionarIA — Fase 7F.2
-- Cartao InfinitePay na conta BigCorps para storefront em modo commission.
--
-- Regras:
-- - checkout/callback/webhook nunca sao prova de pagamento;
-- - evidencia autoritativa vem de payment_check e fica persistida nesta base;
-- - settlement continua idempotente por pedido/provider_reference;
-- - comissao BigCorps = 5% da mercadoria;
-- - taxa/sobretaxa InfinitePay do comprador fica separada da comissao;
-- - provider_fee_cents = 0 neste modo, pois a liberacao exige evidencia de repasse ao comprador.

begin;

-- Corrige a base 7F.1 antes da primeira venda storefront real.
alter table public.funcionaria_checkouts
  drop constraint if exists funcionaria_checkouts_origem_check;
alter table public.funcionaria_checkouts
  add constraint funcionaria_checkouts_origem_check
  check (origem in ('vendedor','autoatendimento','integracao','storefront'));

alter table public.funcionaria_checkouts
  drop constraint if exists funcionaria_checkouts_metodo_pagamento_check;
alter table public.funcionaria_checkouts
  add constraint funcionaria_checkouts_metodo_pagamento_check
  check (metodo_pagamento is null or metodo_pagamento in ('pix','nfc','tef','dinheiro','cartao'));

create table if not exists public.funcionaria_storefront_card_payments (
  id uuid primary key default gen_random_uuid(),
  checkout_id uuid not null references public.funcionaria_checkouts(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  provider text not null default 'infinitepay_bigcorps'
    check (provider = 'infinitepay_bigcorps'),
  order_nsu text not null,
  expected_amount_cents integer not null check (expected_amount_cents > 0),
  status text not null default 'pending'
    check (status in ('pending','signaled','paid','reconciliation_required','failed')),
  transaction_nsu text,
  invoice_slug text,
  receipt_url text,
  capture_method text,
  installments integer,
  provider_amount_cents integer,
  provider_paid_amount_cents integer,
  provider_fee_cents integer,
  provider_surcharge_cents integer,
  checkout_url text,
  signaled_at timestamptz,
  verified_at timestamptz,
  paid_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkout_id),
  unique (order_nsu),
  unique (transaction_nsu),
  constraint funcionaria_storefront_card_amounts_check
    check (
      (provider_amount_cents is null or provider_amount_cents >= 0)
      and (provider_paid_amount_cents is null or provider_paid_amount_cents >= 0)
      and (provider_fee_cents is null or provider_fee_cents >= 0)
      and (provider_surcharge_cents is null or provider_surcharge_cents >= 0)
    ),
  constraint funcionaria_storefront_card_installments_check
    check (installments is null or installments between 1 and 12)
);

create table if not exists public.funcionaria_storefront_card_fee_rates (
  installments integer primary key check (installments between 1 and 12),
  fee_bps integer not null check (fee_bps between 0 and 5000),
  source text not null,
  effective_from date not null,
  updated_at timestamptz not null default now()
);

alter table public.funcionaria_storefront_card_fee_rates enable row level security;
revoke all on table public.funcionaria_storefront_card_fee_rates from public, anon, authenticated;
grant select, insert, update, delete on table public.funcionaria_storefront_card_fee_rates to service_role;

insert into public.funcionaria_storefront_card_fee_rates
  (installments,fee_bps,source,effective_from)
values
  (1,420,'infinitepay_public_1d',date '2026-07-16'),
  (2,609,'infinitepay_public_1d',date '2026-07-16'),
  (3,701,'infinitepay_public_1d',date '2026-07-16'),
  (4,791,'infinitepay_public_1d',date '2026-07-16'),
  (5,880,'infinitepay_public_1d',date '2026-07-16'),
  (6,967,'infinitepay_public_1d',date '2026-07-16'),
  (7,1259,'infinitepay_public_1d',date '2026-07-16'),
  (8,1342,'infinitepay_public_1d',date '2026-07-16'),
  (9,1425,'infinitepay_public_1d',date '2026-07-16'),
  (10,1506,'infinitepay_public_1d',date '2026-07-16'),
  (11,1587,'infinitepay_public_1d',date '2026-07-16'),
  (12,1666,'infinitepay_public_1d',date '2026-07-16')
on conflict (installments) do update
set fee_bps=excluded.fee_bps,
    source=excluded.source,
    effective_from=excluded.effective_from,
    updated_at=now();

create index if not exists funcionaria_storefront_card_status_idx
  on public.funcionaria_storefront_card_payments(status, created_at);

create index if not exists funcionaria_storefront_card_pedido_idx
  on public.funcionaria_storefront_card_payments(pedido_id);

drop trigger if exists update_funcionaria_storefront_card_payments_updated_at
  on public.funcionaria_storefront_card_payments;
create trigger update_funcionaria_storefront_card_payments_updated_at
before update on public.funcionaria_storefront_card_payments
for each row execute function public.update_updated_at_column();

alter table public.funcionaria_storefront_card_payments enable row level security;
revoke all on table public.funcionaria_storefront_card_payments from public, anon, authenticated;
grant select, insert, update, delete on table public.funcionaria_storefront_card_payments to service_role;

alter table public.funcionaria_storefront_settlements
  add column if not exists provider_paid_amount_cents integer not null default 0,
  add column if not exists provider_surcharge_cents integer not null default 0;

create or replace function public.funcionaria_prepare_storefront_card(
  p_checkout_id uuid,
  p_expected_amount_cents integer,
  p_checkout_url text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_checkout public.funcionaria_checkouts%rowtype;
  v_pedido public.pedidos%rowtype;
  v_payment public.funcionaria_storefront_card_payments%rowtype;
  v_order_nsu text;
  v_expected integer;
begin
  if p_checkout_id is null
     or p_expected_amount_cents is null
     or p_expected_amount_cents <= 0
     or nullif(trim(coalesce(p_checkout_url,'')),'') is null then
    raise exception 'invalid_card_request';
  end if;

  select * into v_checkout
  from public.funcionaria_checkouts
  where id=p_checkout_id and origem='storefront'
  for update;

  if not found then raise exception 'storefront_checkout_not_found'; end if;
  if v_checkout.status='pago' then
    return jsonb_build_object('checkout_id',v_checkout.id,'pedido_id',v_checkout.pedido_id,'status','paid','receipt_token',v_checkout.receipt_token);
  end if;
  if v_checkout.status in ('cancelado','expirado') then raise exception 'checkout_not_payable'; end if;
  if v_checkout.expires_at <= now() then
    update public.funcionaria_checkouts set status='expirado',updated_at=now() where id=v_checkout.id;
    raise exception 'checkout_expired';
  end if;
  if v_checkout.pix_transaction_id is not null or v_checkout.cash_requested_at is not null then
    raise exception 'payment_in_progress';
  end if;
  if v_checkout.card_provider is not null and v_checkout.card_provider <> 'infinitepay_bigcorps' then
    raise exception 'payment_in_progress';
  end if;

  select * into v_pedido
  from public.pedidos
  where id=v_checkout.pedido_id and company_id=v_checkout.company_id
  for update;

  if not found then raise exception 'pedido_not_found'; end if;
  if v_pedido.status='pago' then
    update public.funcionaria_checkouts
       set status='pago',completed_at=coalesce(completed_at,now()),updated_at=now()
     where id=v_checkout.id;
    return jsonb_build_object('checkout_id',v_checkout.id,'pedido_id',v_pedido.id,'status','paid','receipt_token',v_checkout.receipt_token);
  end if;
  if v_pedido.status not in ('aberto','aguardando_pagamento') then raise exception 'pedido_not_payable'; end if;
  if coalesce(v_pedido.storefront_payment_mode_snapshot,'commission') <> 'commission'
     or coalesce(v_pedido.storefront_commission_bps_snapshot,500) <> 500 then
    raise exception 'storefront_not_commission_mode';
  end if;

  v_expected := round(coalesce(v_pedido.total,0)*100)::integer;
  if v_expected <= 0 or v_expected <> p_expected_amount_cents then
    raise exception 'card_expected_amount_mismatch';
  end if;

  v_order_nsu := 'funcionaria-storefront-'||v_checkout.id::text;

  select * into v_payment
  from public.funcionaria_storefront_card_payments
  where checkout_id=v_checkout.id
  for update;

  if found then
    if v_payment.order_nsu <> v_order_nsu
       or v_payment.expected_amount_cents <> v_expected
       or v_payment.company_id <> v_checkout.company_id
       or v_payment.pedido_id <> v_checkout.pedido_id then
      raise exception 'card_session_conflict';
    end if;
    if v_payment.status='reconciliation_required' then
      raise exception 'card_reconciliation_required';
    end if;
    if v_payment.status='failed' then
      raise exception 'card_session_failed';
    end if;
    update public.funcionaria_storefront_card_payments
       set checkout_url=p_checkout_url,updated_at=now()
     where id=v_payment.id
     returning * into v_payment;
  else
    insert into public.funcionaria_storefront_card_payments (
      checkout_id,company_id,pedido_id,provider,order_nsu,
      expected_amount_cents,status,checkout_url
    ) values (
      v_checkout.id,v_checkout.company_id,v_checkout.pedido_id,
      'infinitepay_bigcorps',v_order_nsu,v_expected,'pending',p_checkout_url
    )
    returning * into v_payment;
  end if;

  update public.funcionaria_checkouts
     set status='em_pagamento',
         metodo_pagamento='cartao',
         card_provider='infinitepay_bigcorps',
         card_reference_id=v_order_nsu,
         metadata=coalesce(metadata,'{}'::jsonb) ||
           jsonb_build_object('storefront_card_provider','infinitepay_bigcorps'),
         updated_at=now()
   where id=v_checkout.id;

  return jsonb_build_object(
    'checkout_id',v_checkout.id,'pedido_id',v_checkout.pedido_id,'company_id',v_checkout.company_id,
    'status',v_payment.status,'order_nsu',v_payment.order_nsu,'checkout_url',v_payment.checkout_url,
    'expected_amount_cents',v_payment.expected_amount_cents,'transaction_nsu',v_payment.transaction_nsu,
    'invoice_slug',v_payment.invoice_slug,
    'receipt_token',case when v_payment.status='paid' then v_checkout.receipt_token else null end
  );
end;
$function$;

revoke all on function public.funcionaria_prepare_storefront_card(uuid,integer,text)
  from public, anon, authenticated;
grant execute on function public.funcionaria_prepare_storefront_card(uuid,integer,text)
  to service_role;


do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.funcionaria_storefront_settlements'::regclass
      and conname='funcionaria_storefront_settlements_provider_amounts_check'
  ) then
    alter table public.funcionaria_storefront_settlements
      add constraint funcionaria_storefront_settlements_provider_amounts_check
      check (
        provider_paid_amount_cents >= 0
        and provider_surcharge_cents >= 0
      );
  end if;
end
$$;

create or replace function public.funcionaria_settle_storefront_commission(
  p_pedido_id uuid,
  p_checkout_id uuid,
  p_provider text,
  p_provider_reference text,
  p_payment_transaction_id uuid default null,
  p_provider_fee_cents integer default 0,
  p_paid_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_pedido public.pedidos%rowtype;
  v_checkout public.funcionaria_checkouts%rowtype;
  v_existing public.funcionaria_storefront_settlements%rowtype;
  v_tx public.pix_transactions%rowtype;
  v_card public.funcionaria_storefront_card_payments%rowtype;
  v_company_user uuid;
  v_balance public.company_balance%rowtype;
  v_settlement_id uuid;
  v_paid timestamptz:=coalesce(p_paid_at,now());
  v_gross integer;
  v_merch integer;
  v_delivery_charged integer;
  v_delivery_cost integer;
  v_provider_fee integer:=greatest(0,coalesce(p_provider_fee_cents,0));
  v_provider_paid integer:=0;
  v_provider_surcharge integer:=0;
  v_bps integer;
  v_commission integer;
  v_merchant_net integer;
  v_margin integer;
  v_method text;
begin
  if nullif(trim(coalesce(p_provider_reference,'')),'') is null then
    raise exception 'provider_reference_required';
  end if;

  select * into v_pedido
  from public.pedidos
  where id=p_pedido_id
  for update;

  if not found then raise exception 'pedido_not_found'; end if;

  select * into v_existing
  from public.funcionaria_storefront_settlements
  where pedido_id=p_pedido_id;

  if found then
    if v_existing.provider <> p_provider
       or v_existing.provider_reference <> trim(p_provider_reference) then
      raise exception 'settlement_evidence_conflict';
    end if;

    return jsonb_build_object(
      'success',true,
      'duplicate',true,
      'settlement_id',v_existing.id,
      'pedido_id',v_existing.pedido_id,
      'merchant_net_cents',v_existing.merchant_net_cents,
      'commission_cents',v_existing.commission_cents,
      'provider_paid_amount_cents',v_existing.provider_paid_amount_cents,
      'provider_surcharge_cents',v_existing.provider_surcharge_cents,
      'receipt_token',(
        select receipt_token from public.funcionaria_checkouts where id=v_existing.checkout_id
      )
    );
  end if;

  select * into v_checkout
  from public.funcionaria_checkouts
  where id=p_checkout_id
    and pedido_id=p_pedido_id
    and company_id=v_pedido.company_id
    and origem='storefront'
  for update;

  if not found then raise exception 'storefront_checkout_not_found'; end if;
  if v_checkout.status in ('cancelado','expirado') then raise exception 'checkout_not_payable'; end if;

  if coalesce(v_pedido.storefront_payment_mode_snapshot,'commission') <> 'commission' then
    raise exception 'storefront_not_commission_mode';
  end if;

  v_bps := coalesce(v_pedido.storefront_commission_bps_snapshot,500);
  if v_bps <> 500 then raise exception 'invalid_commission_bps'; end if;

  v_gross := round(coalesce(v_pedido.total,0)*100)::integer;
  v_merch := greatest(0,round((coalesce(v_pedido.subtotal,0)-coalesce(v_pedido.desconto,0))*100)::integer);
  v_delivery_charged := case
    when v_pedido.delivery_requested=true
     and v_pedido.delivery_who_pays_snapshot='cliente'
      then greatest(0,coalesce(v_pedido.delivery_fee_cents,0))
    else 0
  end;
  v_delivery_cost := case
    when v_pedido.delivery_requested=true
      then greatest(0,coalesce(v_pedido.delivery_fee_original_cents,0))
    else 0
  end;

  if abs(v_gross-(v_merch+v_delivery_charged)) > 1 then
    raise exception 'storefront_total_breakdown_mismatch';
  end if;

  if p_provider='inter_bigcorps' then
    if p_payment_transaction_id is null then raise exception 'payment_transaction_required'; end if;

    select * into v_tx
    from public.pix_transactions
    where id=p_payment_transaction_id
      and pedido_id=p_pedido_id
      and status='confirmed'
      and payment_provider='bigcorps'
      and origem='funcionaria_storefront_commission'
      and amount_cents=v_gross
    for update;

    if not found then raise exception 'confirmed_payment_evidence_not_found'; end if;

    v_method := 'pix';
  elsif p_provider='infinitepay_bigcorps' then
    if p_payment_transaction_id is not null then
      raise exception 'card_payment_transaction_must_be_null';
    end if;
    select * into v_card
    from public.funcionaria_storefront_card_payments
    where checkout_id=p_checkout_id
      and pedido_id=p_pedido_id
      and company_id=v_pedido.company_id
      and provider='infinitepay_bigcorps'
      and transaction_nsu=trim(p_provider_reference)
      and status='paid'
    for update;

    if not found then raise exception 'confirmed_card_evidence_not_found'; end if;
    if v_card.expected_amount_cents <> v_gross
       or v_card.provider_amount_cents <> v_gross then
      raise exception 'card_amount_mismatch';
    end if;
    if coalesce(v_card.capture_method,'') <> 'credit_card' then
      raise exception 'invalid_card_capture_method';
    end if;
    if coalesce(v_card.installments,0) < 1 or v_card.installments > 12 then
      raise exception 'invalid_card_installments';
    end if;
    if coalesce(v_card.provider_paid_amount_cents,0) < v_card.provider_amount_cents then
      raise exception 'card_paid_amount_invalid';
    end if;
    if coalesce(v_card.provider_fee_cents,-1) <> v_provider_fee then
      raise exception 'card_provider_fee_evidence_mismatch';
    end if;

    v_provider_paid := v_card.provider_paid_amount_cents;
    v_provider_surcharge := greatest(0,v_card.provider_paid_amount_cents-v_card.provider_amount_cents);
    v_method := 'cartao';
  else
    raise exception 'unsupported_storefront_provider';
  end if;

  if v_provider_fee > v_merch then
    raise exception 'provider_fee_exceeds_merchandise';
  end if;

  v_commission := round(v_merch*v_bps/10000.0)::integer;
  v_merchant_net := v_merch-v_commission-v_provider_fee;
  if v_merchant_net < 0 then raise exception 'negative_merchant_net'; end if;

  -- A sobretaxa InfinitePay paga pelo comprador nao entra na comissao nem
  -- no saldo do lojista. BigCorps mantem apenas os 5% + margem do frete.
  v_margin := v_commission + greatest(0,v_delivery_charged-v_delivery_cost);

  insert into public.funcionaria_storefront_settlements (
    company_id,pedido_id,checkout_id,payment_mode,provider,provider_reference,
    payment_transaction_id,gross_received_cents,merchandise_cents,
    delivery_charged_cents,delivery_provider_cost_cents,provider_fee_cents,
    provider_paid_amount_cents,provider_surcharge_cents,
    commission_bps,commission_cents,merchant_net_cents,bigcorps_margin_cents,
    status,paid_at
  ) values (
    v_pedido.company_id,v_pedido.id,v_checkout.id,'commission',p_provider,
    trim(p_provider_reference),p_payment_transaction_id,v_gross,v_merch,
    v_delivery_charged,v_delivery_cost,v_provider_fee,
    v_provider_paid,v_provider_surcharge,
    v_bps,v_commission,v_merchant_net,v_margin,'settled',v_paid
  )
  returning id into v_settlement_id;

  select user_id into v_company_user
  from public.companies
  where id=v_pedido.company_id;

  insert into public.company_balance (
    company_id,user_id,available_balance_cents,total_received_cents,
    total_transferred_cents,last_transaction_at,created_at,updated_at
  ) values (
    v_pedido.company_id,v_company_user,v_merchant_net,v_merchant_net,0,
    v_paid,now(),now()
  )
  on conflict (company_id) do update
    set user_id=coalesce(public.company_balance.user_id,excluded.user_id),
        available_balance_cents=public.company_balance.available_balance_cents+excluded.available_balance_cents,
        total_received_cents=public.company_balance.total_received_cents+excluded.total_received_cents,
        last_transaction_at=v_paid,
        updated_at=now();

  select * into v_balance
  from public.company_balance
  where company_id=v_pedido.company_id;

  insert into public.balance_transactions (
    company_id,user_id,transaction_type,amount_cents,balance_before_cents,
    balance_after_cents,description,metadata
  ) values (
    v_pedido.company_id,
    v_company_user,
    'storefront_sale_net',
    v_merchant_net,
    v_balance.available_balance_cents-v_merchant_net,
    v_balance.available_balance_cents,
    'Venda FuncionarIA — pedido '||left(v_pedido.id::text,8),
    jsonb_build_object(
      'settlement_id',v_settlement_id,
      'pedido_id',v_pedido.id,
      'provider',p_provider,
      'gross_received_cents',v_gross,
      'provider_paid_amount_cents',v_provider_paid,
      'provider_surcharge_cents',v_provider_surcharge,
      'merchandise_cents',v_merch,
      'delivery_charged_cents',v_delivery_charged,
      'provider_fee_cents',v_provider_fee,
      'commission_cents',v_commission
    )
  );

  insert into public.commission_pending (
    company_id,pedido_id,metodo,valor_venda,valor_comissao,status,created_at,descontado_at
  ) values (
    v_pedido.company_id,
    v_pedido.id,
    'funcionaria_storefront_5pct',
    v_merch/100.0,
    v_commission/100.0,
    'descontado',
    now(),
    v_paid
  )
  on conflict (pedido_id,metodo)
  where pedido_id is not null and metodo='funcionaria_storefront_5pct'
  do nothing;

  insert into public.funcionaria_storefront_ledger
    (settlement_id,company_id,pedido_id,entry_type,amount_cents,metadata)
  values
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'gross_received',v_gross,
      jsonb_build_object('provider_paid_amount_cents',v_provider_paid,'provider_surcharge_cents',v_provider_surcharge)),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'merchandise',v_merch,'{}'),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'delivery_customer_charge',v_delivery_charged,'{}'),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'delivery_provider_cost',-v_delivery_cost,'{}'),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'payment_provider_fee',-v_provider_fee,'{}'),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'bigcorps_commission',-v_commission,jsonb_build_object('bps',v_bps)),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'merchant_net',v_merchant_net,'{}');

  if v_pedido.status in ('aberto','aguardando_pagamento') then
    update public.pedidos
       set status='pago',
           metodo_pagamento=v_method,
           paid_at=coalesce(paid_at,v_paid),
           updated_at=now()
     where id=v_pedido.id;
    perform public.baixar_estoque_pedido(v_pedido.id);
  elsif v_pedido.status<>'pago' then
    raise exception 'pedido_not_settleable';
  end if;

  update public.funcionaria_checkouts
     set status='pago',
         metodo_pagamento=v_method,
         pix_transaction_id=case when p_provider='inter_bigcorps' then p_payment_transaction_id else pix_transaction_id end,
         completed_at=coalesce(completed_at,v_paid),
         updated_at=now()
   where id=v_checkout.id;

  return jsonb_build_object(
    'success',true,
    'duplicate',false,
    'settlement_id',v_settlement_id,
    'pedido_id',v_pedido.id,
    'gross_received_cents',v_gross,
    'provider_paid_amount_cents',v_provider_paid,
    'provider_surcharge_cents',v_provider_surcharge,
    'merchant_net_cents',v_merchant_net,
    'commission_cents',v_commission,
    'commission_bps',v_bps,
    'receipt_token',v_checkout.receipt_token
  );
end;
$function$;

revoke all on function public.funcionaria_settle_storefront_commission(
  uuid,uuid,text,text,uuid,integer,timestamptz
) from public, anon, authenticated;
grant execute on function public.funcionaria_settle_storefront_commission(
  uuid,uuid,text,text,uuid,integer,timestamptz
) to service_role;

commit;