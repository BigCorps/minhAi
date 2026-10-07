-- FuncionarIA — Fase 7G
-- Plano mensal / recebimento direto com fallback automático para commission.
--
-- O preço comercial do plano mensal NÃO é congelado aqui.
-- O catálogo nasce inativo e sem preço; ativação exige configuração explícita.
--
-- Garantias:
-- - monthly_direct só é efetivo com entitlement pago/grace válido;
-- - exige ao menos um integrador direto compatível configurado;
-- - se entitlement/configuração deixar de ser válida, NOVOS pagamentos caem em commission;
-- - pagamentos diretos já iniciados podem concluir sem gerar comissão BigCorps;
-- - venda direta não credita company_balance e não cria comissão de 5%;
-- - pedidos guardam snapshot do modo efetivo;
-- - pagamento em andamento nunca muda de trilho.

alter table public.funcionaria_checkouts
  drop constraint if exists funcionaria_checkouts_pix_payment_mode_check;
alter table public.funcionaria_checkouts
  add constraint funcionaria_checkouts_pix_payment_mode_check
  check (pix_payment_mode in ('free','mercadopago','commission','monthly_direct'));

create table if not exists public.funcionaria_storefront_plan_catalog (
  plan_key text primary key,
  name text not null,
  monthly_price_cents integer,
  is_active boolean not null default false,
  currency text not null default 'BRL',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funcionaria_storefront_plan_key_check check (plan_key='monthly_direct'),
  constraint funcionaria_storefront_plan_price_check
    check (monthly_price_cents is null or monthly_price_cents > 0),
  constraint funcionaria_storefront_plan_currency_check check (currency='BRL')
);

insert into public.funcionaria_storefront_plan_catalog (
  plan_key,name,monthly_price_cents,is_active,metadata
) values (
  'monthly_direct','Loja sem comissão',null,false,
  jsonb_build_object(
    'description','Recebimento direto na conta própria, sem comissão BigCorps de 5%.',
    'price_requires_explicit_configuration',true
  )
)
on conflict (plan_key) do nothing;

alter table public.funcionaria_storefront_plan_catalog enable row level security;
revoke all on table public.funcionaria_storefront_plan_catalog from public, anon, authenticated;
grant select,insert,update,delete on table public.funcionaria_storefront_plan_catalog to service_role;

alter table public.funcionaria_subscriptions
  add column if not exists current_storefront_mode text not null default 'commission',
  add column if not exists next_storefront_mode text not null default 'commission',
  add column if not exists storefront_monthly_price_cents_snapshot integer not null default 0;

alter table public.funcionaria_subscriptions
  drop constraint if exists funcionaria_subscriptions_current_storefront_mode_check;
alter table public.funcionaria_subscriptions
  add constraint funcionaria_subscriptions_current_storefront_mode_check
  check (current_storefront_mode in ('commission','monthly_direct'));

alter table public.funcionaria_subscriptions
  drop constraint if exists funcionaria_subscriptions_next_storefront_mode_check;
alter table public.funcionaria_subscriptions
  add constraint funcionaria_subscriptions_next_storefront_mode_check
  check (next_storefront_mode in ('commission','monthly_direct'));

alter table public.funcionaria_subscriptions
  drop constraint if exists funcionaria_subscriptions_storefront_price_check;
alter table public.funcionaria_subscriptions
  add constraint funcionaria_subscriptions_storefront_price_check
  check (storefront_monthly_price_cents_snapshot >= 0);

alter table public.funcionaria_invoices
  add column if not exists desired_storefront_mode text not null default 'commission',
  add column if not exists activation_storefront_mode text,
  add column if not exists storefront_monthly_cents integer not null default 0,
  add column if not exists storefront_monthly_price_cents_snapshot integer not null default 0;

alter table public.funcionaria_invoices
  drop constraint if exists funcionaria_invoices_desired_storefront_mode_check;
alter table public.funcionaria_invoices
  add constraint funcionaria_invoices_desired_storefront_mode_check
  check (desired_storefront_mode in ('commission','monthly_direct'));

alter table public.funcionaria_invoices
  drop constraint if exists funcionaria_invoices_activation_storefront_mode_check;
alter table public.funcionaria_invoices
  add constraint funcionaria_invoices_activation_storefront_mode_check
  check (activation_storefront_mode is null or activation_storefront_mode in ('commission','monthly_direct'));

alter table public.funcionaria_invoices
  drop constraint if exists funcionaria_invoices_storefront_amounts_check;
alter table public.funcionaria_invoices
  add constraint funcionaria_invoices_storefront_amounts_check
  check (storefront_monthly_cents >= 0 and storefront_monthly_price_cents_snapshot >= 0);

create table if not exists public.funcionaria_storefront_direct_card_payments (
  id uuid primary key default gen_random_uuid(),
  checkout_id uuid not null references public.funcionaria_checkouts(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  order_nsu text not null,
  provider_handle text not null,
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
  checkout_url text not null,
  signaled_at timestamptz,
  verified_at timestamptz,
  paid_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkout_id),
  unique (order_nsu),
  unique (transaction_nsu),
  constraint funcionaria_storefront_direct_card_installments_check
    check (installments is null or installments between 1 and 12)
);

create index if not exists funcionaria_storefront_direct_card_status_idx
  on public.funcionaria_storefront_direct_card_payments(status,created_at);

drop trigger if exists update_funcionaria_storefront_direct_card_updated_at
  on public.funcionaria_storefront_direct_card_payments;
create trigger update_funcionaria_storefront_direct_card_updated_at
before update on public.funcionaria_storefront_direct_card_payments
for each row execute function public.update_updated_at_column();

alter table public.funcionaria_storefront_direct_card_payments enable row level security;
revoke all on table public.funcionaria_storefront_direct_card_payments from public, anon, authenticated;
grant select,insert,update,delete on table public.funcionaria_storefront_direct_card_payments to service_role;

create table if not exists public.funcionaria_storefront_direct_settlements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  checkout_id uuid not null references public.funcionaria_checkouts(id) on delete cascade,
  payment_method text not null check (payment_method in ('pix','cartao')),
  provider text not null check (provider in ('mercadopago_direct','infinitepay_direct')),
  provider_reference text not null,
  payment_transaction_id uuid references public.pix_transactions(id) on delete set null,
  gross_cents integer not null check (gross_cents > 0),
  paid_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (pedido_id),
  unique (checkout_id),
  unique (provider,provider_reference)
);

alter table public.funcionaria_storefront_direct_settlements enable row level security;
revoke all on table public.funcionaria_storefront_direct_settlements from public, anon, authenticated;
grant select,insert,update,delete on table public.funcionaria_storefront_direct_settlements to service_role;

create or replace function public.funcionaria_storefront_entitlement(p_company_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_company public.companies%rowtype;
  v_settings public.funcionaria_company_settings%rowtype;
  v_sub public.funcionaria_subscriptions%rowtype;
  v_plan public.funcionaria_storefront_plan_catalog%rowtype;
  v_direct_pix boolean := false;
  v_direct_card boolean := false;
  v_entitlement_until timestamptz;
  v_valid boolean := false;
  v_effective text := 'commission';
  v_reason text := null;
begin
  select * into v_company from public.companies where id=p_company_id;
  if not found then raise exception 'company_not_found'; end if;

  select * into v_settings
  from public.funcionaria_company_settings where company_id=p_company_id;

  select * into v_sub
  from public.funcionaria_subscriptions where company_id=p_company_id;

  select * into v_plan
  from public.funcionaria_storefront_plan_catalog where plan_key='monthly_direct';

  v_direct_pix := exists(
    select 1 from public.mp_connections m
    where m.user_id=v_company.user_id and m.is_active=true
  );
  v_direct_card := nullif(trim(coalesce(v_company.infinitepay_handle,'')),'') is not null;

  if v_sub.id is not null then
    v_entitlement_until := coalesce(v_sub.grace_until,v_sub.current_period_end);
    v_valid :=
      v_sub.current_storefront_mode='monthly_direct'
      and v_sub.status in ('active','past_due')
      and v_entitlement_until is not null
      and v_entitlement_until > now();
  end if;

  if v_valid and (v_direct_pix or v_direct_card) then
    v_effective := 'monthly_direct';
  else
    v_effective := 'commission';
    if coalesce(v_settings.storefront_payment_mode,'commission')='monthly_direct'
       or coalesce(v_sub.current_storefront_mode,'commission')='monthly_direct' then
      v_reason := case
        when not v_valid then 'monthly_entitlement_inactive'
        when not (v_direct_pix or v_direct_card) then 'direct_payment_not_configured'
        else 'fallback_commission'
      end;
    end if;
  end if;

  return jsonb_build_object(
    'company_id',p_company_id,
    'requested_mode',coalesce(v_settings.storefront_payment_mode,'commission'),
    'current_mode',coalesce(v_sub.current_storefront_mode,'commission'),
    'next_mode',coalesce(v_sub.next_storefront_mode,'commission'),
    'effective_mode',v_effective,
    'subscription_status',coalesce(v_sub.status,'free'),
    'current_period_end',v_sub.current_period_end,
    'grace_until',v_sub.grace_until,
    'entitlement_until',v_entitlement_until,
    'fallback_reason',v_reason,
    'direct_pix_configured',v_direct_pix,
    'direct_card_configured',v_direct_card,
    'plan_available',coalesce(v_plan.is_active,false) and coalesce(v_plan.monthly_price_cents,0)>0,
    'monthly_price_cents',v_plan.monthly_price_cents,
    'monthly_price_snapshot_cents',coalesce(v_sub.storefront_monthly_price_cents_snapshot,0)
  );
end;
$function$;

create or replace function public.funcionaria_storefront_compare_30d(p_company_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_sales integer := 0;
  v_merch bigint := 0;
  v_estimated bigint := 0;
  v_actual bigint := 0;
  v_price integer;
begin
  select count(*)::integer,
         coalesce(sum(greatest(0,round((coalesce(p.subtotal,0)-coalesce(p.desconto,0))*100)::integer)),0)::bigint
    into v_sales,v_merch
  from public.pedidos p
  where p.company_id=p_company_id
    and p.status='pago'
    and p.paid_at >= now()-interval '30 days'
    and p.storefront_payment_mode_snapshot in ('commission','monthly_direct');

  v_estimated := round(v_merch*0.05)::bigint;

  select coalesce(sum(s.commission_cents),0)::bigint
    into v_actual
  from public.funcionaria_storefront_settlements s
  where s.company_id=p_company_id
    and s.paid_at >= now()-interval '30 days';

  select monthly_price_cents into v_price
  from public.funcionaria_storefront_plan_catalog
  where plan_key='monthly_direct' and is_active=true;

  return jsonb_build_object(
    'window_days',30,
    'sales_count',v_sales,
    'merchandise_cents',v_merch,
    'estimated_commission_5pct_cents',v_estimated,
    'actual_commission_cents',v_actual,
    'monthly_price_cents',v_price,
    'estimated_savings_cents',case when v_price is null then null else v_estimated-v_price end,
    'break_even_merchandise_cents',case when v_price is null then null else v_price*20 end
  );
end;
$function$;

create or replace function public.funcionaria_storefront_guard_payment_mode(p_checkout_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_checkout public.funcionaria_checkouts%rowtype;
  v_pedido public.pedidos%rowtype;
  v_ent jsonb;
  v_started boolean;
begin
  select * into v_checkout
  from public.funcionaria_checkouts
  where id=p_checkout_id and origem='storefront'
  for update;
  if not found then raise exception 'storefront_checkout_not_found'; end if;

  select * into v_pedido
  from public.pedidos
  where id=v_checkout.pedido_id and company_id=v_checkout.company_id
  for update;
  if not found then raise exception 'pedido_not_found'; end if;

  v_started :=
    v_checkout.status<>'aguardando_pagamento'
    or v_checkout.pix_transaction_id is not null
    or v_checkout.card_provider is not null
    or v_checkout.cash_requested_at is not null;

  v_ent := public.funcionaria_storefront_entitlement(v_checkout.company_id);

  if coalesce(v_pedido.storefront_payment_mode_snapshot,'commission')='monthly_direct'
     and not v_started
     and coalesce(v_ent->>'effective_mode','commission')<>'monthly_direct' then
    update public.pedidos
       set storefront_payment_mode_snapshot='commission',
           storefront_commission_bps_snapshot=500,
           updated_at=now()
     where id=v_pedido.id;
    v_pedido.storefront_payment_mode_snapshot := 'commission';
    v_pedido.storefront_commission_bps_snapshot := 500;
  end if;

  return v_ent || jsonb_build_object(
    'checkout_id',v_checkout.id,
    'pedido_id',v_pedido.id,
    'payment_mode',coalesce(v_pedido.storefront_payment_mode_snapshot,'commission'),
    'commission_bps',coalesce(v_pedido.storefront_commission_bps_snapshot,500),
    'payment_started',v_started
  );
end;
$function$;

create or replace function public.funcionaria_prepare_storefront_direct_pix(p_checkout_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_checkout public.funcionaria_checkouts%rowtype;
  v_pedido public.pedidos%rowtype;
  v_ent jsonb;
  v_amount integer;
begin
  select * into v_checkout
  from public.funcionaria_checkouts
  where id=p_checkout_id and origem='storefront'
  for update;
  if not found then raise exception 'storefront_checkout_not_found'; end if;

  select * into v_pedido
  from public.pedidos
  where id=v_checkout.pedido_id and company_id=v_checkout.company_id
  for update;
  if not found then raise exception 'pedido_not_found'; end if;

  if v_checkout.status='pago' then
    return jsonb_build_object('status','paid','checkout_id',v_checkout.id,'receipt_token',v_checkout.receipt_token);
  end if;
  if v_checkout.status in ('cancelado','expirado') then raise exception 'checkout_not_payable'; end if;

  if v_checkout.status='em_pagamento'
     and v_checkout.metodo_pagamento='pix'
     and v_checkout.pix_payment_mode='monthly_direct' then
    return jsonb_build_object(
      'status','prepared','checkout_id',v_checkout.id,'pedido_id',v_pedido.id,
      'company_id',v_checkout.company_id,'expected_amount_cents',round(v_pedido.total*100)::integer,
      'duplicate',true
    );
  end if;

  if v_checkout.status<>'aguardando_pagamento'
     or v_checkout.pix_transaction_id is not null
     or v_checkout.card_provider is not null
     or v_checkout.cash_requested_at is not null then
    raise exception 'payment_in_progress';
  end if;

  if coalesce(v_pedido.storefront_payment_mode_snapshot,'commission')<>'monthly_direct' then
    raise exception 'storefront_not_monthly_direct';
  end if;

  v_ent := public.funcionaria_storefront_entitlement(v_checkout.company_id);
  if coalesce(v_ent->>'effective_mode','commission')<>'monthly_direct'
     or coalesce((v_ent->>'direct_pix_configured')::boolean,false)=false then
    raise exception 'direct_pix_not_available';
  end if;

  v_amount := round(coalesce(v_pedido.total,0)*100)::integer;
  if v_amount<=0 then raise exception 'invalid_order_total'; end if;

  update public.funcionaria_checkouts
     set status='em_pagamento',
         metodo_pagamento='pix',
         pix_payment_mode='monthly_direct',
         updated_at=now()
   where id=v_checkout.id;

  return jsonb_build_object(
    'status','prepared','checkout_id',v_checkout.id,'pedido_id',v_pedido.id,
    'company_id',v_checkout.company_id,'expected_amount_cents',v_amount,'duplicate',false
  );
end;
$function$;

create or replace function public.funcionaria_attach_storefront_direct_pix(
  p_checkout_id uuid,
  p_transaction_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_checkout public.funcionaria_checkouts%rowtype;
  v_tx public.pix_transactions%rowtype;
begin
  select * into v_checkout
  from public.funcionaria_checkouts
  where id=p_checkout_id and origem='storefront'
  for update;
  if not found then raise exception 'storefront_checkout_not_found'; end if;

  select * into v_tx
  from public.pix_transactions
  where id=p_transaction_id
    and company_id=v_checkout.company_id
    and pedido_id=v_checkout.pedido_id
    and origem='funcionaria_storefront_monthly_direct'
    and payment_provider='mercadopago'
  for update;
  if not found then raise exception 'direct_pix_transaction_not_found'; end if;

  if v_checkout.pix_transaction_id is not null
     and v_checkout.pix_transaction_id<>v_tx.id then
    raise exception 'direct_pix_transaction_conflict';
  end if;

  update public.funcionaria_checkouts
     set pix_transaction_id=v_tx.id,updated_at=now()
   where id=v_checkout.id;

  return jsonb_build_object('checkout_id',v_checkout.id,'transaction_id',v_tx.id);
end;
$function$;

create or replace function public.funcionaria_prepare_storefront_direct_card(
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
  v_company public.companies%rowtype;
  v_payment public.funcionaria_storefront_direct_card_payments%rowtype;
  v_ent jsonb;
  v_handle text;
  v_order text;
  v_expected integer;
begin
  select * into v_checkout
  from public.funcionaria_checkouts
  where id=p_checkout_id and origem='storefront'
  for update;
  if not found then raise exception 'storefront_checkout_not_found'; end if;

  select * into v_pedido
  from public.pedidos
  where id=v_checkout.pedido_id and company_id=v_checkout.company_id
  for update;
  if not found then raise exception 'pedido_not_found'; end if;

  select * into v_company from public.companies where id=v_checkout.company_id;
  v_handle := replace(trim(coalesce(v_company.infinitepay_handle,'')),'$','');
  if v_handle='' then raise exception 'direct_card_not_configured'; end if;

  if v_checkout.status='pago' then
    return jsonb_build_object('status','paid','checkout_id',v_checkout.id,'receipt_token',v_checkout.receipt_token);
  end if;
  if v_checkout.status in ('cancelado','expirado') then raise exception 'checkout_not_payable'; end if;

  if v_checkout.pix_transaction_id is not null or v_checkout.cash_requested_at is not null then
    raise exception 'payment_in_progress';
  end if;
  if v_checkout.card_provider is not null
     and v_checkout.card_provider<>'infinitepay_direct' then
    raise exception 'payment_in_progress';
  end if;

  if coalesce(v_pedido.storefront_payment_mode_snapshot,'commission')<>'monthly_direct' then
    raise exception 'storefront_not_monthly_direct';
  end if;

  v_ent := public.funcionaria_storefront_entitlement(v_checkout.company_id);
  if coalesce(v_ent->>'effective_mode','commission')<>'monthly_direct'
     or coalesce((v_ent->>'direct_card_configured')::boolean,false)=false then
    raise exception 'direct_card_not_available';
  end if;

  v_expected := round(coalesce(v_pedido.total,0)*100)::integer;
  if v_expected<=0 or v_expected<>p_expected_amount_cents then
    raise exception 'card_expected_amount_mismatch';
  end if;

  v_order := 'funcionaria-direct-'||v_checkout.id::text;

  select * into v_payment
  from public.funcionaria_storefront_direct_card_payments
  where checkout_id=v_checkout.id
  for update;

  if found then
    if v_payment.order_nsu<>v_order
       or v_payment.expected_amount_cents<>v_expected
       or v_payment.provider_handle<>v_handle then
      raise exception 'direct_card_session_conflict';
    end if;
    if v_payment.status='reconciliation_required' then
      raise exception 'direct_card_reconciliation_required';
    end if;
    update public.funcionaria_storefront_direct_card_payments
       set checkout_url=p_checkout_url,updated_at=now()
     where id=v_payment.id
     returning * into v_payment;
  else
    insert into public.funcionaria_storefront_direct_card_payments (
      checkout_id,company_id,pedido_id,order_nsu,provider_handle,
      expected_amount_cents,status,checkout_url
    ) values (
      v_checkout.id,v_checkout.company_id,v_checkout.pedido_id,v_order,v_handle,
      v_expected,'pending',p_checkout_url
    )
    returning * into v_payment;
  end if;

  update public.funcionaria_checkouts
     set status='em_pagamento',
         metodo_pagamento='cartao',
         card_provider='infinitepay_direct',
         card_reference_id=v_order,
         updated_at=now()
   where id=v_checkout.id;

  return jsonb_build_object(
    'status',v_payment.status,'checkout_id',v_checkout.id,'pedido_id',v_checkout.pedido_id,
    'order_nsu',v_payment.order_nsu,'checkout_url',v_payment.checkout_url,
    'expected_amount_cents',v_payment.expected_amount_cents,
    'transaction_nsu',v_payment.transaction_nsu,'receipt_token',null
  );
end;
$function$;

create or replace function public.funcionaria_settle_storefront_direct(
  p_checkout_id uuid,
  p_method text,
  p_provider text,
  p_provider_reference text,
  p_payment_transaction_id uuid default null,
  p_paid_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_checkout public.funcionaria_checkouts%rowtype;
  v_pedido public.pedidos%rowtype;
  v_existing public.funcionaria_storefront_direct_settlements%rowtype;
  v_tx public.pix_transactions%rowtype;
  v_card public.funcionaria_storefront_direct_card_payments%rowtype;
  v_paid timestamptz:=coalesce(p_paid_at,now());
  v_gross integer;
  v_id uuid;
begin
  if p_method not in ('pix','cartao') then raise exception 'invalid_direct_payment_method'; end if;
  if p_provider not in ('mercadopago_direct','infinitepay_direct') then raise exception 'invalid_direct_provider'; end if;
  if nullif(trim(coalesce(p_provider_reference,'')),'') is null then raise exception 'provider_reference_required'; end if;

  select * into v_checkout
  from public.funcionaria_checkouts
  where id=p_checkout_id and origem='storefront'
  for update;
  if not found then raise exception 'storefront_checkout_not_found'; end if;

  select * into v_pedido
  from public.pedidos
  where id=v_checkout.pedido_id and company_id=v_checkout.company_id
  for update;
  if not found then raise exception 'pedido_not_found'; end if;

  select * into v_existing
  from public.funcionaria_storefront_direct_settlements
  where pedido_id=v_pedido.id;
  if found then
    if v_existing.provider<>p_provider
       or v_existing.provider_reference<>trim(p_provider_reference) then
      raise exception 'direct_settlement_evidence_conflict';
    end if;
    return jsonb_build_object(
      'success',true,'duplicate',true,'settlement_id',v_existing.id,
      'pedido_id',v_pedido.id,'receipt_token',v_checkout.receipt_token
    );
  end if;

  if coalesce(v_pedido.storefront_payment_mode_snapshot,'commission')<>'monthly_direct' then
    raise exception 'storefront_not_monthly_direct';
  end if;

  v_gross := round(coalesce(v_pedido.total,0)*100)::integer;
  if v_gross<=0 then raise exception 'invalid_order_total'; end if;

  if p_provider='mercadopago_direct' then
    if p_method<>'pix' or p_payment_transaction_id is null then
      raise exception 'direct_pix_evidence_required';
    end if;
    select * into v_tx
    from public.pix_transactions
    where id=p_payment_transaction_id
      and company_id=v_checkout.company_id
      and pedido_id=v_pedido.id
      and origem='funcionaria_storefront_monthly_direct'
      and payment_provider='mercadopago'
      and status='confirmed'
      and amount_cents=v_gross
    for update;
    if not found then raise exception 'confirmed_direct_pix_not_found'; end if;
  else
    if p_method<>'cartao' or p_payment_transaction_id is not null then
      raise exception 'direct_card_evidence_required';
    end if;
    select * into v_card
    from public.funcionaria_storefront_direct_card_payments
    where checkout_id=v_checkout.id
      and pedido_id=v_pedido.id
      and company_id=v_checkout.company_id
      and transaction_nsu=trim(p_provider_reference)
      and status='paid'
      and provider_amount_cents=v_gross
      and capture_method='credit_card'
    for update;
    if not found then raise exception 'confirmed_direct_card_not_found'; end if;
  end if;

  insert into public.funcionaria_storefront_direct_settlements (
    company_id,pedido_id,checkout_id,payment_method,provider,provider_reference,
    payment_transaction_id,gross_cents,paid_at
  ) values (
    v_checkout.company_id,v_pedido.id,v_checkout.id,p_method,p_provider,trim(p_provider_reference),
    p_payment_transaction_id,v_gross,v_paid
  ) returning id into v_id;

  if v_pedido.status in ('aberto','aguardando_pagamento') then
    update public.pedidos
       set status='pago',
           metodo_pagamento=p_method,
           paid_at=coalesce(paid_at,v_paid),
           updated_at=now()
     where id=v_pedido.id;
    perform public.baixar_estoque_pedido(v_pedido.id);
  elsif v_pedido.status<>'pago' then
    raise exception 'pedido_not_settleable';
  end if;

  update public.funcionaria_checkouts
     set status='pago',
         metodo_pagamento=p_method,
         completed_at=coalesce(completed_at,v_paid),
         updated_at=now()
   where id=v_checkout.id;

  return jsonb_build_object(
    'success',true,'duplicate',false,'settlement_id',v_id,'pedido_id',v_pedido.id,
    'gross_cents',v_gross,'receipt_token',v_checkout.receipt_token
  );
end;
$function$;

create or replace function public.funcionaria_apply_storefront_plan_invoice(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_inv public.funcionaria_invoices%rowtype;
  v_sub public.funcionaria_subscriptions%rowtype;
  v_current text;
  v_next text;
  v_snapshot integer;
begin
  select * into v_inv
  from public.funcionaria_invoices
  where id=p_invoice_id
  for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if v_inv.status<>'paid' or v_inv.processed_at is null then
    raise exception 'invoice_not_processed';
  end if;

  select * into v_sub
  from public.funcionaria_subscriptions
  where company_id=v_inv.company_id
  for update;
  if not found then raise exception 'subscription_not_found'; end if;

  v_next := coalesce(v_inv.desired_storefront_mode,'commission');

  if v_inv.invoice_type='change'
     and v_sub.current_period_end is not null
     and v_sub.current_period_end>now() then
    v_current := coalesce(v_inv.activation_storefront_mode,v_sub.current_storefront_mode,'commission');
  else
    v_current := v_next;
  end if;

  v_snapshot := case
    when v_current='monthly_direct' then
      greatest(
        coalesce(v_inv.storefront_monthly_price_cents_snapshot,0),
        coalesce(v_sub.storefront_monthly_price_cents_snapshot,0)
      )
    else 0
  end;

  update public.funcionaria_subscriptions
     set current_storefront_mode=v_current,
         next_storefront_mode=v_next,
         storefront_monthly_price_cents_snapshot=v_snapshot,
         cancel_at_period_end=(
           cardinality(coalesce(next_skill_keys,'{}'::text[]))=0
           and v_next='commission'
         ),
         updated_at=now()
   where company_id=v_inv.company_id;

  update public.funcionaria_company_settings
     set storefront_payment_mode=v_next,
         storefront_commission_bps=case when v_next='monthly_direct' then 0 else 500 end,
         updated_at=now()
   where company_id=v_inv.company_id;

  return jsonb_build_object(
    'ok',true,'current_storefront_mode',v_current,'next_storefront_mode',v_next,
    'storefront_monthly_price_cents_snapshot',v_snapshot
  );
end;
$function$;

revoke all on function public.funcionaria_storefront_entitlement(uuid) from public,anon,authenticated;
revoke all on function public.funcionaria_storefront_compare_30d(uuid) from public,anon,authenticated;
revoke all on function public.funcionaria_storefront_guard_payment_mode(uuid) from public,anon,authenticated;
revoke all on function public.funcionaria_prepare_storefront_direct_pix(uuid) from public,anon,authenticated;
revoke all on function public.funcionaria_attach_storefront_direct_pix(uuid,uuid) from public,anon,authenticated;
revoke all on function public.funcionaria_prepare_storefront_direct_card(uuid,integer,text) from public,anon,authenticated;
revoke all on function public.funcionaria_settle_storefront_direct(uuid,text,text,text,uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.funcionaria_apply_storefront_plan_invoice(uuid) from public,anon,authenticated;

grant execute on function public.funcionaria_storefront_entitlement(uuid) to service_role;
grant execute on function public.funcionaria_storefront_compare_30d(uuid) to service_role;
grant execute on function public.funcionaria_storefront_guard_payment_mode(uuid) to service_role;
grant execute on function public.funcionaria_prepare_storefront_direct_pix(uuid) to service_role;
grant execute on function public.funcionaria_attach_storefront_direct_pix(uuid,uuid) to service_role;
grant execute on function public.funcionaria_prepare_storefront_direct_card(uuid,integer,text) to service_role;
grant execute on function public.funcionaria_settle_storefront_direct(uuid,text,text,text,uuid,timestamptz) to service_role;
grant execute on function public.funcionaria_apply_storefront_plan_invoice(uuid) to service_role;
