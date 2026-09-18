-- FuncionarIA — Fase 7F.1
-- Checkout público em modo commission + PIX Inter BigCorps + ledger 5%.
-- Base esperada: cb3c262e4f4348ce8642d50b0eab7d9acbadf51a
--
-- Esta migration NÃO ativa monthly_direct e NÃO altera a cobrança de habilidades.
-- Comissão de loja = 5% (500 bps) sobre mercadoria confirmada.
-- Frete Lalamove e taxa do provedor ficam em linhas separadas.

begin;

alter table public.funcionaria_company_settings
  add column if not exists storefront_payment_mode text not null default 'commission',
  add column if not exists storefront_commission_bps integer not null default 500;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.funcionaria_company_settings'::regclass
      and conname='funcionaria_company_settings_storefront_payment_mode_check'
  ) then
    alter table public.funcionaria_company_settings
      add constraint funcionaria_company_settings_storefront_payment_mode_check
      check (storefront_payment_mode in ('commission','monthly_direct'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.funcionaria_company_settings'::regclass
      and conname='funcionaria_company_settings_storefront_commission_bps_check'
  ) then
    alter table public.funcionaria_company_settings
      add constraint funcionaria_company_settings_storefront_commission_bps_check
      check (storefront_commission_bps between 0 and 10000);
  end if;
end
$$;

-- 7G ainda não existe: toda loja atual permanece no modo gratuito/commission.
update public.funcionaria_company_settings
   set storefront_payment_mode='commission',
       storefront_commission_bps=500,
       updated_at=now()
 where storefront_payment_mode is distinct from 'commission'
    or storefront_commission_bps is distinct from 500;

alter table public.pedidos
  add column if not exists storefront_payment_mode_snapshot text,
  add column if not exists storefront_commission_bps_snapshot integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.pedidos'::regclass
      and conname='pedidos_storefront_payment_mode_snapshot_check'
  ) then
    alter table public.pedidos
      add constraint pedidos_storefront_payment_mode_snapshot_check
      check (
        storefront_payment_mode_snapshot is null
        or storefront_payment_mode_snapshot in ('commission','monthly_direct')
      );
  end if;
end
$$;

create table if not exists public.funcionaria_storefront_settlements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  checkout_id uuid references public.funcionaria_checkouts(id) on delete set null,
  payment_mode text not null,
  provider text not null,
  provider_reference text not null,
  payment_transaction_id uuid references public.pix_transactions(id) on delete set null,
  gross_received_cents integer not null,
  merchandise_cents integer not null,
  delivery_charged_cents integer not null default 0,
  delivery_provider_cost_cents integer not null default 0,
  provider_fee_cents integer not null default 0,
  commission_bps integer not null,
  commission_cents integer not null,
  merchant_net_cents integer not null,
  bigcorps_margin_cents integer not null,
  status text not null default 'settled',
  paid_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (pedido_id),
  unique (provider, provider_reference)
);

alter table public.funcionaria_storefront_settlements enable row level security;
revoke all on table public.funcionaria_storefront_settlements from public, anon, authenticated;
grant all on table public.funcionaria_storefront_settlements to service_role;

create table if not exists public.funcionaria_storefront_ledger (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.funcionaria_storefront_settlements(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  entry_type text not null,
  amount_cents integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (settlement_id, entry_type)
);

alter table public.funcionaria_storefront_ledger enable row level security;
revoke all on table public.funcionaria_storefront_ledger from public, anon, authenticated;
grant all on table public.funcionaria_storefront_ledger to service_role;

create unique index if not exists commission_pending_funcionaria_storefront_pedido_uidx
  on public.commission_pending(pedido_id, metodo)
  where pedido_id is not null and metodo='funcionaria_storefront_5pct';

-- Um checkout storefront por pedido. A rota pública é idempotente por pedido.
create unique index if not exists funcionaria_checkouts_storefront_pedido_uidx
  on public.funcionaria_checkouts(pedido_id)
  where origem='storefront';

create or replace function public.funcionaria_prepare_storefront_checkout(
  p_pedido_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_pedido public.pedidos%rowtype;
  v_checkout public.funcionaria_checkouts%rowtype;
  v_settings public.funcionaria_company_settings%rowtype;
  v_code text;
  v_mode text;
  v_bps integer;
begin
  select * into v_pedido
  from public.pedidos
  where id=p_pedido_id
  for update;

  if not found then
    raise exception 'pedido_not_found';
  end if;

  if v_pedido.status in ('cancelado','entregue') then
    raise exception 'pedido_not_payable';
  end if;

  select * into v_settings
  from public.funcionaria_company_settings
  where company_id=v_pedido.company_id;

  if not found then
    raise exception 'funcionaria_settings_not_found';
  end if;

  v_mode := coalesce(v_pedido.storefront_payment_mode_snapshot, v_settings.storefront_payment_mode, 'commission');
  v_bps := coalesce(v_pedido.storefront_commission_bps_snapshot, v_settings.storefront_commission_bps, 500);

  if v_mode <> 'commission' then
    raise exception 'storefront_payment_mode_not_supported_yet';
  end if;

  if v_bps <> 500 then
    raise exception 'invalid_commission_bps';
  end if;

  if v_pedido.storefront_payment_mode_snapshot is null
     or v_pedido.storefront_commission_bps_snapshot is null then
    update public.pedidos
       set storefront_payment_mode_snapshot=v_mode,
           storefront_commission_bps_snapshot=v_bps,
           updated_at=now()
     where id=v_pedido.id;
  end if;

  select * into v_checkout
  from public.funcionaria_checkouts
  where pedido_id=v_pedido.id
    and origem='storefront'
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'checkout_id',v_checkout.id,
      'pedido_id',v_checkout.pedido_id,
      'company_id',v_checkout.company_id,
      'codigo',v_checkout.codigo,
      'status',v_checkout.status,
      'expires_at',v_checkout.expires_at,
      'receipt_token',v_checkout.receipt_token,
      'payment_mode',v_mode,
      'commission_bps',v_bps
    );
  end if;

  v_code := public.funcionaria_gerar_codigo();

  insert into public.funcionaria_checkouts (
    company_id,pedido_id,codigo,status,origem,created_by,expires_at,metadata
  ) values (
    v_pedido.company_id,
    v_pedido.id,
    v_code,
    case when v_pedido.status='pago' then 'pago' else 'aguardando_pagamento' end,
    'storefront',
    null,
    now()+interval '30 minutes',
    jsonb_build_object(
      'storefront_payment_mode',v_mode,
      'commission_bps',v_bps
    )
  )
  returning * into v_checkout;

  return jsonb_build_object(
    'checkout_id',v_checkout.id,
    'pedido_id',v_checkout.pedido_id,
    'company_id',v_checkout.company_id,
    'codigo',v_checkout.codigo,
    'status',v_checkout.status,
    'expires_at',v_checkout.expires_at,
    'receipt_token',v_checkout.receipt_token,
    'payment_mode',v_mode,
    'commission_bps',v_bps
  );
end;
$function$;

revoke all on function public.funcionaria_prepare_storefront_checkout(uuid)
  from public, anon, authenticated;
grant execute on function public.funcionaria_prepare_storefront_checkout(uuid)
  to service_role;

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
  v_company_user uuid;
  v_balance public.company_balance%rowtype;
  v_settlement_id uuid;
  v_paid timestamptz:=coalesce(p_paid_at,now());
  v_gross integer;
  v_merch integer;
  v_delivery_charged integer;
  v_delivery_cost integer;
  v_provider_fee integer:=greatest(0,coalesce(p_provider_fee_cents,0));
  v_bps integer;
  v_commission integer;
  v_merchant_net integer;
  v_margin integer;
begin
  select * into v_pedido
  from public.pedidos
  where id=p_pedido_id
  for update;

  if not found then raise exception 'pedido_not_found'; end if;

  select * into v_existing
  from public.funcionaria_storefront_settlements
  where pedido_id=p_pedido_id;

  if found then
    return jsonb_build_object(
      'success',true,
      'duplicate',true,
      'settlement_id',v_existing.id,
      'pedido_id',v_existing.pedido_id,
      'merchant_net_cents',v_existing.merchant_net_cents,
      'commission_cents',v_existing.commission_cents,
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

  if p_provider='inter_bigcorps' then
    if p_payment_transaction_id is null then raise exception 'payment_transaction_required'; end if;
    select * into v_tx
    from public.pix_transactions
    where id=p_payment_transaction_id
      and pedido_id=p_pedido_id
      and status='confirmed'
      and payment_provider='bigcorps'
      and origem='funcionaria_storefront_commission'
    for update;
    if not found then raise exception 'confirmed_payment_evidence_not_found'; end if;
  end if;

  if nullif(trim(coalesce(p_provider_reference,'')),'') is null then
    raise exception 'provider_reference_required';
  end if;

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

  if v_provider_fee > v_merch then
    raise exception 'provider_fee_exceeds_merchandise';
  end if;

  v_commission := round(v_merch*v_bps/10000.0)::integer;
  v_merchant_net := v_merch-v_commission-v_provider_fee;
  if v_merchant_net < 0 then raise exception 'negative_merchant_net'; end if;

  -- BigCorps retém a comissão e a margem do frete. Taxa do meio de pagamento
  -- é separada e debitada do líquido do lojista.
  v_margin := v_commission + greatest(0,v_delivery_charged-v_delivery_cost);

  insert into public.funcionaria_storefront_settlements (
    company_id,pedido_id,checkout_id,payment_mode,provider,provider_reference,
    payment_transaction_id,gross_received_cents,merchandise_cents,
    delivery_charged_cents,delivery_provider_cost_cents,provider_fee_cents,
    commission_bps,commission_cents,merchant_net_cents,bigcorps_margin_cents,
    status,paid_at
  ) values (
    v_pedido.company_id,v_pedido.id,v_checkout.id,'commission',p_provider,
    trim(p_provider_reference),p_payment_transaction_id,v_gross,v_merch,
    v_delivery_charged,v_delivery_cost,v_provider_fee,v_bps,v_commission,
    v_merchant_net,v_margin,'settled',v_paid
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
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'gross_received',v_gross,'{}'),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'merchandise',v_merch,'{}'),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'delivery_customer_charge',v_delivery_charged,'{}'),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'delivery_provider_cost',-v_delivery_cost,'{}'),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'payment_provider_fee',-v_provider_fee,'{}'),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'bigcorps_commission',-v_commission,jsonb_build_object('bps',v_bps)),
    (v_settlement_id,v_pedido.company_id,v_pedido.id,'merchant_net',v_merchant_net,'{}');

  if v_pedido.status in ('aberto','aguardando_pagamento') then
    update public.pedidos
       set status='pago',
           metodo_pagamento=case when p_provider='inter_bigcorps' then 'pix' else 'nfc' end,
           paid_at=coalesce(paid_at,v_paid),
           updated_at=now()
     where id=v_pedido.id;
    perform public.baixar_estoque_pedido(v_pedido.id);
  elsif v_pedido.status<>'pago' then
    raise exception 'pedido_not_settleable';
  end if;

  update public.funcionaria_checkouts
     set status='pago',
         metodo_pagamento=case when p_provider='inter_bigcorps' then 'pix' else 'nfc' end,
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
