-- =============================================================================
-- PixWiki V2 — Gate 8
-- Billing V2: mensal/anual, excedente, menor faixa automática e migração VIP
--
-- PRÉ-REQUISITOS: Gates 1 a 7 aplicados nesta ordem.
--
-- PRINCÍPIOS
-- - pixwiki_v2_billing_accounts passa a ser a fonte de verdade financeira.
-- - Catálogo legado é mantido como espelho de compatibilidade.
-- - Base de plano é pré-paga; excedente fecha por mês-calendário (São Paulo).
-- - A proteção de preço usa a menor faixa mensal para o volume realizado.
-- - Plano anual dá desconto apenas na base; os degraus de excedente continuam
--   usando os preços mensais de referência.
-- - Recebimento, histórico, dashboard e Push NUNCA são bloqueados por billing.
-- - Contas/assinaturas existentes no momento desta migration viram VIP cortesia.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Catálogo legado vira espelho V2 para compatibilidade com rotinas antigas.
-- -----------------------------------------------------------------------------
alter table public.pixwiki_plan_catalog
  drop constraint if exists pixwiki_plan_catalog_plan_check;
alter table public.pixwiki_plan_catalog
  add constraint pixwiki_plan_catalog_plan_check
  check (plan in ('free','link','pro','vip'));

-- O catálogo legado usa ranks 0/1/2 e o V2 usa 1/2/3/4.
-- Como rank é UNIQUE, atualizar free->1 colidiria com o antigo link->1
-- antes do próximo UPSERT. Movemos temporariamente os ranks existentes para
-- uma faixa segura e, na sequência, o UPSERT aplica os ranks V2 definitivos.
-- A migration inteira roda dentro desta transação, então o estado temporário
-- nunca fica visível após COMMIT e a operação continua idempotente em reexecuções.
update public.pixwiki_plan_catalog
set rank = rank + 10000
where plan in ('free','link','pro','vip');

insert into public.pixwiki_plan_catalog(plan,name,price_cents,rank,features,is_active,updated_at)
select
  c.plan,c.name,c.monthly_price_cents,c.rank,
  c.features || jsonb_build_object(
    'subdomain',true,'multi_company',true,'api',true,'reports',true,
    'push',true,'email',true,'whatsapp',true,'webhooks',true,
    'max_companies',null
  ),
  c.is_active,now()
from public.pixwiki_v2_plan_catalog c
on conflict(plan) do update set
  name=excluded.name,
  price_cents=excluded.price_cents,
  rank=excluded.rank,
  features=excluded.features,
  is_active=excluded.is_active,
  updated_at=now();

-- -----------------------------------------------------------------------------
-- 2) Billing account V2 ganha estado de renovação, carência e créditos.
-- -----------------------------------------------------------------------------
alter table public.pixwiki_v2_billing_accounts
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists grace_until date,
  add column if not exists credit_balance_cents integer not null default 0,
  add column if not exists last_paid_invoice_id uuid,
  add column if not exists payment_method text not null default 'pix';

alter table public.pixwiki_v2_billing_accounts
  drop constraint if exists pixwiki_v2_billing_credit_nonnegative;
alter table public.pixwiki_v2_billing_accounts
  add constraint pixwiki_v2_billing_credit_nonnegative
  check (credit_balance_cents >= 0);

alter table public.pixwiki_v2_billing_accounts
  drop constraint if exists pixwiki_v2_billing_payment_method_check;
alter table public.pixwiki_v2_billing_accounts
  add constraint pixwiki_v2_billing_payment_method_check
  check (payment_method in ('pix'));

-- -----------------------------------------------------------------------------
-- 3) Fatura V2 reutiliza pixwiki_invoices, sem quebrar IDs/histórico atuais.
-- -----------------------------------------------------------------------------
alter table public.pixwiki_invoices
  drop constraint if exists pixwiki_invoices_target_plan_check;
alter table public.pixwiki_invoices
  add constraint pixwiki_invoices_target_plan_check
  check (target_plan in ('free','link','pro','vip'));

-- O catálogo legado agora contém VIP, portanto o FK existente continua válido.

alter table public.pixwiki_invoices
  drop constraint if exists pixwiki_invoices_amount_cents_check;
alter table public.pixwiki_invoices
  add constraint pixwiki_invoices_amount_cents_check check (amount_cents >= 0);

alter table public.pixwiki_invoices
  add column if not exists invoice_type text not null default 'base',
  add column if not exists billing_interval text,
  add column if not exists usage_period_start date,
  add column if not exists usage_period_end date,
  add column if not exists base_price_cents integer not null default 0,
  add column if not exists overage_units integer not null default 0,
  add column if not exists overage_price_cents integer not null default 0,
  add column if not exists protected_plan text,
  add column if not exists protected_total_cents integer,
  add column if not exists convenience_credit_cents integer not null default 0,
  add column if not exists credit_applied_cents integer not null default 0,
  add column if not exists due_at timestamptz,
  add column if not exists grace_until timestamptz;

alter table public.pixwiki_invoices
  drop constraint if exists pixwiki_invoices_type_check;
alter table public.pixwiki_invoices
  add constraint pixwiki_invoices_type_check
  check (invoice_type in ('base','overage'));

alter table public.pixwiki_invoices
  drop constraint if exists pixwiki_invoices_billing_interval_check;
alter table public.pixwiki_invoices
  add constraint pixwiki_invoices_billing_interval_check
  check (billing_interval is null or billing_interval in ('monthly','annual'));

alter table public.pixwiki_invoices
  drop constraint if exists pixwiki_invoices_v2_nonnegative_check;
alter table public.pixwiki_invoices
  add constraint pixwiki_invoices_v2_nonnegative_check check (
    base_price_cents >= 0 and overage_units >= 0 and overage_price_cents >= 0
    and convenience_credit_cents >= 0 and credit_applied_cents >= 0
    and (protected_total_cents is null or protected_total_cents >= 0)
  );

create unique index if not exists pixwiki_v2_one_pending_base_invoice
  on public.pixwiki_invoices(user_id)
  where invoice_type='base' and status='pending';

create unique index if not exists pixwiki_v2_one_overage_invoice_per_period
  on public.pixwiki_invoices(user_id,usage_period_start)
  where invoice_type='overage' and usage_period_start is not null;

create index if not exists pixwiki_v2_invoices_open_idx
  on public.pixwiki_invoices(user_id,status,created_at desc);

-- -----------------------------------------------------------------------------
-- 4) Período mensal passa a guardar settlement auditável.
-- -----------------------------------------------------------------------------
alter table public.pixwiki_v2_usage_periods
  add column if not exists settlement_status text not null default 'open',
  add column if not exists protected_plan text,
  add column if not exists protected_total_cents integer,
  add column if not exists overage_invoice_id uuid,
  add column if not exists billed_amount_cents integer,
  add column if not exists convenience_credit_applied_cents integer not null default 0,
  add column if not exists convenience_credit_carried_cents integer not null default 0,
  add column if not exists settled_at timestamptz;

alter table public.pixwiki_v2_usage_periods
  drop constraint if exists pixwiki_v2_usage_settlement_status_check;
alter table public.pixwiki_v2_usage_periods
  add constraint pixwiki_v2_usage_settlement_status_check
  check (settlement_status in ('open','invoiced','settled'));

alter table public.pixwiki_v2_usage_periods
  drop constraint if exists pixwiki_v2_usage_settlement_nonnegative_check;
alter table public.pixwiki_v2_usage_periods
  add constraint pixwiki_v2_usage_settlement_nonnegative_check check (
    (protected_total_cents is null or protected_total_cents >= 0)
    and (billed_amount_cents is null or billed_amount_cents >= 0)
    and convenience_credit_applied_cents >= 0
    and convenience_credit_carried_cents >= 0
  );

-- FK é adicionada de forma idempotente.
do $$
begin
  if not exists(
    select 1 from pg_constraint
    where conname='pixwiki_v2_usage_periods_overage_invoice_id_fkey'
      and conrelid='public.pixwiki_v2_usage_periods'::regclass
  ) then
    alter table public.pixwiki_v2_usage_periods
      add constraint pixwiki_v2_usage_periods_overage_invoice_id_fkey
      foreign key(overage_invoice_id) references public.pixwiki_invoices(id) on delete set null;
  end if;
  if not exists(
    select 1 from pg_constraint
    where conname='pixwiki_v2_billing_last_paid_invoice_id_fkey'
      and conrelid='public.pixwiki_v2_billing_accounts'::regclass
  ) then
    alter table public.pixwiki_v2_billing_accounts
      add constraint pixwiki_v2_billing_last_paid_invoice_id_fkey
      foreign key(last_paid_invoice_id) references public.pixwiki_invoices(id) on delete set null;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5) Quote real do fechamento mensal, com proteção da menor faixa.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_monthly_settlement_quote(
  p_user_id uuid,
  p_period_start date
)
returns table(
  user_id uuid,
  period_start date,
  period_end date,
  current_plan text,
  billing_interval text,
  complimentary boolean,
  used_units integer,
  included_automations integer,
  current_monthly_base_cents integer,
  current_overage_units integer,
  current_overage_price_cents integer,
  current_total_cents bigint,
  protected_plan text,
  protected_total_cents bigint,
  gross_overage_due_cents bigint,
  convenience_credit_cents integer,
  convenience_credit_applied_cents bigint,
  convenience_credit_carried_cents bigint,
  net_overage_due_cents bigint
)
language plpgsql
stable
security definer
set search_path='public','pg_temp'
as $$
declare
  v_plan text := 'free';
  v_interval text := 'monthly';
  v_complimentary boolean := false;
  v_used integer := 0;
  v_credit integer := 0;
  v_included integer := 100;
  v_base integer := 0;
  v_rate integer := 79;
  v_current_overage integer := 0;
  v_current_total bigint := 0;
  v_best_plan text := 'free';
  v_best_total bigint := 0;
  v_protected bigint := 0;
  v_gross bigint := 0;
  v_credit_applied bigint := 0;
  v_credit_carried bigint := 0;
  v_net bigint := 0;
  v_end date;
begin
  if p_user_id is null or p_period_start is null then raise exception 'invalid_settlement_period'; end if;
  v_end := (p_period_start + interval '1 month')::date;

  select coalesce(b.plan,'free'),coalesce(b.billing_interval,'monthly'),coalesce(b.complimentary,false)
    into v_plan,v_interval,v_complimentary
  from (select 1) x
  left join public.pixwiki_v2_billing_accounts b on b.user_id=p_user_id;

  select c.included_automations,c.monthly_price_cents,c.overage_price_cents
    into v_included,v_base,v_rate
  from public.pixwiki_v2_plan_catalog c
  where c.plan=v_plan and c.is_active=true;
  if v_included is null then
    v_plan := 'free';
    select c.included_automations,c.monthly_price_cents,c.overage_price_cents
      into v_included,v_base,v_rate
    from public.pixwiki_v2_plan_catalog c where c.plan='free';
  end if;

  select coalesce(u.used_units,0),coalesce(u.convenience_credit_cents,0)
    into v_used,v_credit
  from public.pixwiki_v2_usage_periods u
  where u.user_id=p_user_id and u.period_start=p_period_start;
  v_used := coalesce(v_used,0);
  v_credit := coalesce(v_credit,0);

  v_current_overage := greatest(v_used-v_included,0);
  v_current_total := v_base::bigint + v_current_overage::bigint*v_rate::bigint;

  select q.plan,q.total_price_cents
    into v_best_plan,v_best_total
  from public.pixwiki_v2_quote_monthly_usage(v_used) q
  where q.is_best_price=true
  order by q.total_price_cents,q.plan
  limit 1;

  v_best_plan := coalesce(v_best_plan,v_plan);
  v_best_total := coalesce(v_best_total,v_current_total);
  v_protected := least(v_current_total,v_best_total);

  -- A base do plano já foi paga previamente. No anual, usa-se a base mensal
  -- de referência para os degraus; o desconto anual permanece só na base.
  v_gross := greatest(v_protected-v_base::bigint,0);
  if v_complimentary then v_gross := 0; end if;

  v_credit_applied := least(v_credit::bigint,v_gross);
  v_credit_carried := greatest(v_credit::bigint-v_credit_applied,0);
  v_net := greatest(v_gross-v_credit_applied,0);

  return query select
    p_user_id,p_period_start,v_end,v_plan,v_interval,v_complimentary,
    v_used,v_included,v_base,v_current_overage,v_rate,v_current_total,
    v_best_plan,v_protected,v_gross,v_credit,v_credit_applied,v_credit_carried,v_net;
end;
$$;

revoke all on function public.pixwiki_v2_monthly_settlement_quote(uuid,date) from public,anon,authenticated;
grant execute on function public.pixwiki_v2_monthly_settlement_quote(uuid,date) to service_role;

-- -----------------------------------------------------------------------------
-- 6) Preferências de excedente: dono da conta apenas.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_set_billing_preferences(
  p_allow_overage boolean,
  p_spending_limit_cents integer default null
)
returns jsonb
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.pixwiki_v2_billing_accounts;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_spending_limit_cents is not null and p_spending_limit_cents < 0 then
    raise exception 'invalid_spending_limit';
  end if;

  insert into public.pixwiki_v2_billing_accounts(user_id,plan,billing_interval,status)
  values(v_uid,'free','monthly','active')
  on conflict(user_id) do nothing;

  update public.pixwiki_v2_billing_accounts
  set allow_overage=coalesce(p_allow_overage,false),
      spending_limit_cents=case when coalesce(p_allow_overage,false) then p_spending_limit_cents else null end,
      updated_at=now()
  where user_id=v_uid
  returning * into v_row;

  return jsonb_build_object(
    'plan',v_row.plan,'allow_overage',v_row.allow_overage,
    'spending_limit_cents',v_row.spending_limit_cents,'status',v_row.status,
    'credit_balance_cents',v_row.credit_balance_cents
  );
end;
$$;
revoke all on function public.pixwiki_v2_set_billing_preferences(boolean,integer) from public,anon;
grant execute on function public.pixwiki_v2_set_billing_preferences(boolean,integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 7) Allowance passa a considerar a proteção de preço no spending limit.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_automation_allowance(p_user_id uuid)
returns table(
  allowed boolean,
  reason text,
  plan text,
  used_units integer,
  included_automations integer,
  remaining_included integer,
  allow_overage boolean,
  spending_limit_cents integer,
  estimated_overage_cents bigint
)
language plpgsql
stable
security definer
set search_path='public','pg_temp'
as $$
declare
  v_plan text := 'free';
  v_status text := 'active';
  v_overage boolean := false;
  v_limit integer;
  v_complimentary boolean := false;
  v_used integer := 0;
  v_included integer := 100;
  v_start date := date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
  v_base integer := 0;
  v_current_total bigint := 0;
  v_best_total bigint := 0;
  v_estimated bigint := 0;
begin
  if p_user_id is null then
    return query select false,'invalid_user',null::text,0,0,0,false,null::integer,0::bigint;
    return;
  end if;

  select coalesce(b.plan,'free'),coalesce(b.status,'active'),coalesce(b.allow_overage,false),
         b.spending_limit_cents,coalesce(b.complimentary,false)
  into v_plan,v_status,v_overage,v_limit,v_complimentary
  from (select 1) x left join public.pixwiki_v2_billing_accounts b on b.user_id=p_user_id;

  select c.included_automations,c.monthly_price_cents
  into v_included,v_base
  from public.pixwiki_v2_plan_catalog c where c.plan=v_plan and c.is_active=true;
  if v_included is null then
    v_plan:='free';
    select c.included_automations,c.monthly_price_cents into v_included,v_base
    from public.pixwiki_v2_plan_catalog c where c.plan='free';
  end if;

  select coalesce(u.used_units,0) into v_used
  from public.pixwiki_v2_usage_periods u where u.user_id=p_user_id and u.period_start=v_start;
  v_used:=coalesce(v_used,0);

  if v_complimentary then
    return query select true,'complimentary',v_plan,v_used,v_included,greatest(v_included-v_used,0),true,v_limit,0::bigint;
    return;
  end if;

  if v_status in ('paused','cancelled') then
    return query select false,'billing_inactive',v_plan,v_used,v_included,greatest(v_included-v_used,0),v_overage,v_limit,0::bigint;
    return;
  end if;

  if v_used < v_included then
    return query select true,'included',v_plan,v_used,v_included,greatest(v_included-v_used,0),v_overage,v_limit,0::bigint;
    return;
  end if;

  if not v_overage then
    return query select false,'quota_exhausted',v_plan,v_used,v_included,0,false,v_limit,0::bigint;
    return;
  end if;

  -- Estima a responsabilidade do PRÓXIMO evento usando a menor faixa disponível.
  select q.total_price_cents into v_current_total
  from public.pixwiki_v2_quote_monthly_usage(v_used+1) q where q.plan=v_plan limit 1;
  select q.total_price_cents into v_best_total
  from public.pixwiki_v2_quote_monthly_usage(v_used+1) q
  where q.is_best_price=true order by q.total_price_cents,q.plan limit 1;
  v_estimated := greatest(least(coalesce(v_current_total,0),coalesce(v_best_total,v_current_total))-v_base::bigint,0);

  if v_limit is not null and v_estimated > v_limit then
    return query select false,'spending_limit_reached',v_plan,v_used,v_included,0,true,v_limit,v_estimated;
    return;
  end if;

  return query select true,'overage',v_plan,v_used,v_included,0,true,v_limit,v_estimated;
end;
$$;
revoke all on function public.pixwiki_v2_automation_allowance(uuid) from public,anon,authenticated;
grant execute on function public.pixwiki_v2_automation_allowance(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 8) Aplicação idempotente de fatura paga.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_apply_paid_invoice(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_invoice public.pixwiki_invoices%rowtype;
  v_account public.pixwiki_v2_billing_accounts%rowtype;
  v_now timestamptz:=now();
  v_start date;
  v_end date;
  v_interval text;
begin
  select * into v_invoice from public.pixwiki_invoices where id=p_invoice_id for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if v_invoice.status<>'paid' then raise exception 'invoice_not_paid'; end if;
  if v_invoice.processed_at is not null then
    return jsonb_build_object('processed',false,'already_processed',true,'invoice_id',v_invoice.id);
  end if;

  insert into public.pixwiki_v2_billing_accounts(user_id,plan,billing_interval,status)
  values(v_invoice.user_id,'free','monthly','active') on conflict(user_id) do nothing;
  select * into v_account from public.pixwiki_v2_billing_accounts where user_id=v_invoice.user_id for update;

  if v_invoice.invoice_type='base' then
    v_interval:=coalesce(v_invoice.billing_interval,'monthly');
    v_start:=coalesce(v_invoice.period_start,
      case
        when v_account.plan=v_invoice.target_plan and v_account.billing_interval=v_interval
             and v_account.current_period_end is not null and v_account.current_period_end>current_date
          then v_account.current_period_end
        else current_date
      end);
    v_end:=coalesce(v_invoice.period_end,
      case when v_interval='annual' then (v_start+interval '1 year')::date else (v_start+interval '1 month')::date end);

    update public.pixwiki_v2_billing_accounts
    set plan=v_invoice.target_plan,
        billing_interval=v_interval,
        status='active',complimentary=false,
        current_period_start=v_start,current_period_end=v_end,
        grace_until=null,cancel_at_period_end=false,
        credit_balance_cents=greatest(credit_balance_cents-coalesce(v_invoice.credit_applied_cents,0),0),
        last_paid_invoice_id=v_invoice.id,updated_at=v_now
    where user_id=v_invoice.user_id;

    -- Espelho legado: mantém funções antigas funcionais durante a transição.
    insert into public.pixwiki_subscriptions(
      user_id,plan,status,current_period_start,current_period_end,cancel_at_period_end,last_paid_invoice_id,updated_at
    ) values(
      v_invoice.user_id,v_invoice.target_plan,'active',
      v_start::timestamp at time zone 'America/Sao_Paulo',
      v_end::timestamp at time zone 'America/Sao_Paulo',false,v_invoice.id,v_now
    )
    on conflict(user_id) do update set
      plan=excluded.plan,status='active',current_period_start=excluded.current_period_start,
      current_period_end=excluded.current_period_end,cancel_at_period_end=false,
      last_paid_invoice_id=excluded.last_paid_invoice_id,updated_at=v_now;
  else
    update public.pixwiki_v2_usage_periods
    set settlement_status='settled',billed_amount_cents=v_invoice.amount_cents,
        settled_at=v_now,updated_at=v_now
    where user_id=v_invoice.user_id and period_start=v_invoice.usage_period_start;

    -- Pagamento de dívida reativa a automação se a base ainda está válida.
    update public.pixwiki_v2_billing_accounts b
    set status=case
          when exists(
            select 1 from public.pixwiki_invoices i
            where i.user_id=v_invoice.user_id and i.id<>v_invoice.id and i.status='pending'
              and i.grace_until is not null and i.grace_until<v_now
          ) then 'paused'
          when b.complimentary then 'active'
          when b.plan='free' then 'active'
          when b.current_period_end is null or b.current_period_end>=current_date then 'active'
          else b.status
        end,
        grace_until=case
          when exists(
            select 1 from public.pixwiki_invoices i
            where i.user_id=v_invoice.user_id and i.id<>v_invoice.id and i.status='pending'
              and i.grace_until is not null and i.grace_until<v_now
          ) then b.grace_until else null end,
        last_paid_invoice_id=v_invoice.id,updated_at=v_now
    where b.user_id=v_invoice.user_id;
  end if;

  update public.pixwiki_invoices
  set processed_at=v_now,updated_at=v_now,
      period_start=coalesce(period_start,v_start),period_end=coalesce(period_end,v_end)
  where id=v_invoice.id;

  return jsonb_build_object(
    'processed',true,'invoice_id',v_invoice.id,'invoice_type',v_invoice.invoice_type,
    'target_plan',v_invoice.target_plan,'period_start',v_start,'period_end',v_end
  );
end;
$$;
revoke all on function public.pixwiki_v2_apply_paid_invoice(uuid) from public,anon,authenticated;
grant execute on function public.pixwiki_v2_apply_paid_invoice(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 9) Fechamento de período sem cobrança: grava proteção e carrega crédito.
--    Usado pelo cron quando não existe valor a faturar.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_settle_zero_usage_period(
  p_user_id uuid,
  p_period_start date,
  p_protected_plan text,
  p_protected_total_cents integer,
  p_credit_applied_cents integer,
  p_credit_carried_cents integer
)
returns boolean
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_changed integer;
begin
  update public.pixwiki_v2_usage_periods
  set settlement_status='settled',protected_plan=p_protected_plan,
      protected_total_cents=greatest(coalesce(p_protected_total_cents,0),0),
      billed_amount_cents=0,
      convenience_credit_applied_cents=greatest(coalesce(p_credit_applied_cents,0),0),
      convenience_credit_carried_cents=greatest(coalesce(p_credit_carried_cents,0),0),
      settled_at=now(),updated_at=now()
  where user_id=p_user_id and period_start=p_period_start and settlement_status='open';
  get diagnostics v_changed=row_count;

  if v_changed>0 and coalesce(p_credit_carried_cents,0)>0 then
    update public.pixwiki_v2_billing_accounts
    set credit_balance_cents=credit_balance_cents+greatest(p_credit_carried_cents,0),updated_at=now()
    where user_id=p_user_id;
  end if;
  return v_changed>0;
end;
$$;
revoke all on function public.pixwiki_v2_settle_zero_usage_period(uuid,date,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.pixwiki_v2_settle_zero_usage_period(uuid,date,text,integer,integer,integer) to service_role;

-- -----------------------------------------------------------------------------
-- 9b) Marca período como faturado e carrega crédito restante atomicamente.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_mark_usage_period_invoiced(
  p_user_id uuid,
  p_period_start date,
  p_invoice_id uuid,
  p_protected_plan text,
  p_protected_total_cents integer,
  p_billed_amount_cents integer,
  p_credit_applied_cents integer,
  p_credit_carried_cents integer
)
returns boolean
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_period public.pixwiki_v2_usage_periods%rowtype;
begin
  select * into v_period
  from public.pixwiki_v2_usage_periods
  where user_id=p_user_id and period_start=p_period_start
  for update;
  if not found then raise exception 'usage_period_not_found'; end if;

  if v_period.settlement_status<>'open' then
    return v_period.overage_invoice_id=p_invoice_id;
  end if;

  update public.pixwiki_v2_usage_periods
  set settlement_status='invoiced',protected_plan=p_protected_plan,
      protected_total_cents=greatest(coalesce(p_protected_total_cents,0),0),
      overage_invoice_id=p_invoice_id,billed_amount_cents=greatest(coalesce(p_billed_amount_cents,0),0),
      convenience_credit_applied_cents=greatest(coalesce(p_credit_applied_cents,0),0),
      convenience_credit_carried_cents=greatest(coalesce(p_credit_carried_cents,0),0),
      updated_at=now()
  where id=v_period.id;

  if coalesce(p_credit_carried_cents,0)>0 then
    update public.pixwiki_v2_billing_accounts
    set credit_balance_cents=credit_balance_cents+greatest(p_credit_carried_cents,0),updated_at=now()
    where user_id=p_user_id;
  end if;
  return true;
end;
$$;
revoke all on function public.pixwiki_v2_mark_usage_period_invoiced(uuid,date,uuid,text,integer,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.pixwiki_v2_mark_usage_period_invoiced(uuid,date,uuid,text,integer,integer,integer,integer) to service_role;

-- -----------------------------------------------------------------------------
-- 10) Compatibilidade: funções legadas consultam a conta V2 primeiro.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_effective_plan_for_user(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
  select coalesce(
    (select case when b.status='cancelled' then 'free' else b.plan end
       from public.pixwiki_v2_billing_accounts b where b.user_id=p_user_id),
    (select case
       when s.user_id is null or s.plan='free' or s.status<>'active' then 'free'
       when s.current_period_end is not null and s.current_period_end<=now() then 'free'
       else s.plan end
       from (select p_user_id wanted) x left join public.pixwiki_subscriptions s on s.user_id=x.wanted),
    'free'
  );
$$;

create or replace function public.pixwiki_entitlements_for_user(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare v_plan text; v_features jsonb;
begin
  v_plan:=public.pixwiki_effective_plan_for_user(p_user_id);
  select features into v_features from public.pixwiki_v2_plan_catalog where plan=v_plan;
  return jsonb_build_object('plan',v_plan,'features',coalesce(v_features,'{}'::jsonb));
end;
$$;

create or replace function public.pixwiki_has_feature_for_user(p_user_id uuid,p_feature text)
returns boolean
language sql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
  select case p_feature
    when 'subdomain' then coalesce((c.features->>'pix_link')::boolean,false)
    when 'multi_company' then true
    else coalesce((c.features->>p_feature)::boolean,false)
  end
  from public.pixwiki_v2_plan_catalog c
  where c.plan=public.pixwiki_effective_plan_for_user(p_user_id);
$$;

create or replace function public.pixwiki_company_allowed_for_plan(p_user_id uuid,p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
  select exists(
    select 1 from public.companies c
    where c.id=p_company_id and c.user_id=p_user_id
      and c.segment_key='pix_wiki' and c.is_active=true
  );
$$;

create or replace function public.pixwiki_my_entitlements()
returns table(
  plan text,plan_name text,price_cents integer,current_period_end timestamptz,
  cancel_at_period_end boolean,can_push boolean,can_email boolean,can_subdomain boolean,
  can_whatsapp boolean,can_multi_company boolean,can_api boolean,can_reports boolean,max_companies integer
)
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare v_uid uuid:=auth.uid(); v_plan text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  insert into public.pixwiki_v2_billing_accounts(user_id,plan,status,billing_interval)
  values(v_uid,'free','active','monthly') on conflict(user_id) do nothing;
  v_plan:=public.pixwiki_effective_plan_for_user(v_uid);
  return query
  select c.plan,c.name,c.monthly_price_cents,
    case when b.current_period_end is null then null else (b.current_period_end::timestamp at time zone 'America/Sao_Paulo') end,
    b.cancel_at_period_end,
    true,true,true,true,true,true,true,null::integer
  from public.pixwiki_v2_plan_catalog c
  join public.pixwiki_v2_billing_accounts b on b.user_id=v_uid
  where c.plan=v_plan;
end;
$$;

-- -----------------------------------------------------------------------------
-- 11) Migração única solicitada: TODAS as assinaturas existentes agora -> VIP
--     cortesia, sem expiração, para preservar o ambiente do proprietário.
-- -----------------------------------------------------------------------------
insert into public.pixwiki_v2_billing_accounts(
  user_id,plan,billing_interval,status,allow_overage,spending_limit_cents,
  complimentary,current_period_start,current_period_end,cancel_at_period_end,
  grace_until,updated_at
)
select
  s.user_id,'vip','monthly','active',true,null,true,
  current_date,null,false,null,now()
from public.pixwiki_subscriptions s
on conflict(user_id) do update set
  plan='vip',billing_interval='monthly',status='active',allow_overage=true,
  spending_limit_cents=null,complimentary=true,current_period_start=current_date,
  current_period_end=null,cancel_at_period_end=false,grace_until=null,updated_at=now();

update public.pixwiki_subscriptions
set plan='vip',status='active',
    current_period_start=coalesce(current_period_start,now()),
    current_period_end='2099-12-31 23:59:59+00'::timestamptz,
    cancel_at_period_end=false,updated_at=now();

-- -----------------------------------------------------------------------------
-- 12) Grants: billing sensível sempre por RPC/Edge.
-- -----------------------------------------------------------------------------
revoke insert,update,delete,truncate,references,trigger on public.pixwiki_v2_billing_accounts from anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.pixwiki_invoices from anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.pixwiki_v2_usage_periods from anon,authenticated;

grant select on public.pixwiki_v2_billing_accounts to authenticated;
grant select on public.pixwiki_invoices to authenticated;
grant select on public.pixwiki_v2_usage_periods to authenticated;

commit;
notify pgrst,'reload schema';
