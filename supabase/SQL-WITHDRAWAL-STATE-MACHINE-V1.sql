-- Withdrawal state machine v1
-- Source of truth for the production migration. Do not execute manually outside
-- the controlled release gate.
--
-- Guarantees:
--   reserve (atomic DB) -> external PIX -> finalize OR release (delta based)
--   per-user serialization + idempotency key
--   no snapshot rollback
--   browser clients cannot mutate/truncate financial balances

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  idempotency_key uuid not null,
  requested_amount_cents integer not null check (requested_amount_cents >= 100),
  fee_cents integer not null check (fee_cents >= 0),
  commission_cents integer not null check (commission_cents >= 0),
  net_amount_cents integer not null check (net_amount_cents > 0),
  pix_key text not null,
  pix_key_type text,
  primary_company_id uuid,
  status text not null default 'reserved'
    check (status in ('reserved','sending','processing','transferred','released','reconciliation_required')),
  provider_txid text,
  provider_status text,
  error_code text,
  error_detail text,
  pix_transaction_id uuid references public.pix_transactions(id) on delete set null,
  provider_started_at timestamptz,
  provider_recorded_at timestamptz,
  reconciliation_required_at timestamptz,
  finalized_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint withdrawal_requests_amount_breakdown_check
    check (net_amount_cents = requested_amount_cents - fee_cents - commission_cents),
  constraint withdrawal_requests_user_idempotency_key unique (user_id, idempotency_key)
);

create unique index if not exists withdrawal_requests_provider_txid_key
  on public.withdrawal_requests(provider_txid)
  where provider_txid is not null;

create index if not exists idx_withdrawal_requests_user_created
  on public.withdrawal_requests(user_id, created_at desc);

create index if not exists idx_withdrawal_requests_status
  on public.withdrawal_requests(status, created_at);

drop trigger if exists update_withdrawal_requests_updated_at on public.withdrawal_requests;
create trigger update_withdrawal_requests_updated_at
before update on public.withdrawal_requests
for each row execute function public.update_updated_at_column();

alter table public.withdrawal_requests enable row level security;
drop policy if exists withdrawal_requests_select_own on public.withdrawal_requests;
create policy withdrawal_requests_select_own
  on public.withdrawal_requests for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.withdrawal_requests from anon, authenticated;
grant select on table public.withdrawal_requests to authenticated;
grant select, insert, update, delete on table public.withdrawal_requests to service_role;

create table if not exists public.withdrawal_allocations (
  withdrawal_id uuid not null references public.withdrawal_requests(id) on delete cascade,
  company_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  balance_before_cents integer not null check (balance_before_cents >= 0),
  balance_after_reserve_cents integer not null check (balance_after_reserve_cents >= 0),
  created_at timestamptz not null default now(),
  primary key (withdrawal_id, company_id),
  constraint withdrawal_allocations_math_check
    check (balance_after_reserve_cents = balance_before_cents - amount_cents)
);

alter table public.withdrawal_allocations enable row level security;
revoke all on table public.withdrawal_allocations from anon, authenticated;
grant select, insert, update, delete on table public.withdrawal_allocations to service_role;

alter table public.balance_transactions
  add column if not exists withdrawal_id uuid references public.withdrawal_requests(id) on delete set null;

create unique index if not exists ux_balance_transactions_withdrawal_company
  on public.balance_transactions(withdrawal_id, company_id)
  where withdrawal_id is not null and transaction_type = 'withdrawal';

alter table public.commission_pending
  add column if not exists reserved_withdrawal_id uuid references public.withdrawal_requests(id) on delete set null,
  add column if not exists reserved_at timestamptz;

alter table public.commission_pending
  drop constraint if exists commission_pending_status_check;
alter table public.commission_pending
  add constraint commission_pending_status_check
  check (status in ('pendente','reservado','descontado','cancelado'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.company_balance'::regclass
      and conname = 'company_balance_available_nonnegative'
  ) then
    alter table public.company_balance
      add constraint company_balance_available_nonnegative
      check (available_balance_cents >= 0);
  end if;
end $$;

-- Close direct financial mutation surfaces.
drop policy if exists "Users can manage own company balance" on public.company_balance;

revoke all privileges on table public.company_balance from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.company_balance from authenticated;
grant select on table public.company_balance to authenticated;

revoke all privileges on table public.balance_transactions from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.balance_transactions from authenticated;
grant select on table public.balance_transactions to authenticated;

revoke all privileges on table public.user_balance from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.user_balance from authenticated;
grant select on table public.user_balance to authenticated;

revoke all privileges on table public.commission_pending from anon;
revoke update, delete, truncate, references, trigger
  on table public.commission_pending from authenticated;
grant select, insert on table public.commission_pending to authenticated;

create or replace function public.withdrawal_reserve_v1(
  p_user_id uuid,
  p_amount_cents integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_existing public.withdrawal_requests%rowtype;
  v_id uuid := gen_random_uuid();
  v_total_available bigint := 0;
  v_remaining integer;
  v_fee integer;
  v_commission integer := 0;
  v_net integer;
  v_pix_key text;
  v_pix_key_type text;
  v_primary_company uuid;
  v_company_ids uuid[] := '{}'::uuid[];
  v_commission_ids uuid[] := '{}'::uuid[];
  v_balance record;
  v_commission_row record;
  v_debit integer;
begin
  if p_user_id is null or p_idempotency_key is null then
    raise exception 'invalid_request';
  end if;
  if p_amount_cents is null or p_amount_cents < 100 then
    raise exception 'invalid_amount';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('withdrawal-user:' || p_user_id::text, 0)
  );

  select * into v_existing
  from public.withdrawal_requests
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.requested_amount_cents <> p_amount_cents then
      raise exception 'idempotency_conflict';
    end if;
    return jsonb_build_object(
      'withdrawal_id', v_existing.id,
      'status', v_existing.status,
      'requested_amount_cents', v_existing.requested_amount_cents,
      'fee_cents', v_existing.fee_cents,
      'commission_cents', v_existing.commission_cents,
      'net_amount_cents', v_existing.net_amount_cents,
      'provider_txid', v_existing.provider_txid,
      'duplicate', true
    );
  end if;

  -- Lock and snapshot the exact balance row IDs participating in this request.
  -- Later statements only use this locked set, so a concurrently-created company
  -- balance cannot enter the reservation after the total was calculated.
  for v_balance in
    select company_id, available_balance_cents
    from public.company_balance
    where user_id = p_user_id
    order by company_id
    for update
  loop
    v_company_ids := array_append(v_company_ids, v_balance.company_id);
    v_total_available := v_total_available + v_balance.available_balance_cents;
  end loop;

  if v_total_available < p_amount_cents then
    raise exception 'insufficient_balance';
  end if;

  select nullif(trim(withdrawal_pix_key), ''), withdrawal_pix_key_type
  into v_pix_key, v_pix_key_type
  from public.user_profiles
  where user_id = p_user_id
  limit 1;

  if v_pix_key is null then
    raise exception 'withdrawal_pix_key_required';
  end if;

  -- Lock and snapshot the exact pending commissions included in this withdrawal.
  for v_commission_row in
    select cp.id, cp.valor_comissao
    from public.commission_pending cp
    join public.companies c on c.id = cp.company_id
    where c.user_id = p_user_id
      and cp.status = 'pendente'
    order by cp.id
    for update of cp
  loop
    v_commission_ids := array_append(v_commission_ids, v_commission_row.id);
    v_commission := v_commission
      + round(coalesce(v_commission_row.valor_comissao, 0) * 100)::integer;
  end loop;

  v_fee := p_amount_cents / 100;
  v_net := p_amount_cents - v_fee - v_commission;
  if v_net <= 0 then
    raise exception 'withdrawal_net_nonpositive';
  end if;

  insert into public.withdrawal_requests (
    id, user_id, idempotency_key,
    requested_amount_cents, fee_cents, commission_cents, net_amount_cents,
    pix_key, pix_key_type, status
  ) values (
    v_id, p_user_id, p_idempotency_key,
    p_amount_cents, v_fee, v_commission, v_net,
    v_pix_key, v_pix_key_type, 'reserved'
  );

  if cardinality(v_commission_ids) > 0 then
    update public.commission_pending cp
       set status = 'reservado',
           reserved_withdrawal_id = v_id,
           reserved_at = now(),
           descontado_at = null
     where cp.id = any(v_commission_ids)
       and cp.status = 'pendente';
  end if;

  v_remaining := p_amount_cents;
  for v_balance in
    select company_id, available_balance_cents
    from public.company_balance
    where user_id = p_user_id
      and company_id = any(v_company_ids)
      and available_balance_cents > 0
    order by available_balance_cents desc, company_id
  loop
    exit when v_remaining <= 0;
    v_debit := least(v_remaining, v_balance.available_balance_cents);
    if v_debit <= 0 then
      continue;
    end if;

    update public.company_balance
       set available_balance_cents = available_balance_cents - v_debit,
           last_transaction_at = now(),
           updated_at = now()
     where company_id = v_balance.company_id
       and user_id = p_user_id;

    if not found then
      raise exception 'balance_reservation_failed';
    end if;

    insert into public.withdrawal_allocations (
      withdrawal_id, company_id, amount_cents,
      balance_before_cents, balance_after_reserve_cents
    ) values (
      v_id, v_balance.company_id, v_debit,
      v_balance.available_balance_cents,
      v_balance.available_balance_cents - v_debit
    );

    if v_primary_company is null then
      v_primary_company := v_balance.company_id;
    end if;
    v_remaining := v_remaining - v_debit;
  end loop;

  if v_remaining <> 0 or v_primary_company is null then
    raise exception 'balance_reservation_failed';
  end if;

  update public.withdrawal_requests
     set primary_company_id = v_primary_company
   where id = v_id;

  return jsonb_build_object(
    'withdrawal_id', v_id,
    'status', 'reserved',
    'requested_amount_cents', p_amount_cents,
    'fee_cents', v_fee,
    'commission_cents', v_commission,
    'net_amount_cents', v_net,
    'duplicate', false
  );
end;
$$;

create or replace function public.withdrawal_claim_send_v1(
  p_withdrawal_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_req public.withdrawal_requests%rowtype;
begin
  if p_withdrawal_id is null or p_user_id is null then
    raise exception 'invalid_request';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('withdrawal-user:' || p_user_id::text, 0)
  );

  select * into v_req
  from public.withdrawal_requests
  where id = p_withdrawal_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'withdrawal_not_found';
  end if;

  if v_req.status = 'reserved' then
    update public.withdrawal_requests
       set status = 'sending',
           provider_status = 'SENDING',
           provider_started_at = now(),
           error_code = null,
           error_detail = null
     where id = v_req.id;

    return jsonb_build_object(
      'withdrawal_id', v_req.id,
      'status', 'sending',
      'send', true,
      'net_amount_cents', v_req.net_amount_cents,
      'pix_key', v_req.pix_key,
      'pix_key_type', v_req.pix_key_type
    );
  end if;

  return jsonb_build_object(
    'withdrawal_id', v_req.id,
    'status', v_req.status,
    'send', false,
    'provider_txid', v_req.provider_txid
  );
end;
$$;

create or replace function public.withdrawal_record_provider_v1(
  p_withdrawal_id uuid,
  p_user_id uuid,
  p_provider_txid text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_req public.withdrawal_requests%rowtype;
  v_txid text := nullif(trim(coalesce(p_provider_txid, '')), '');
begin
  if p_withdrawal_id is null or p_user_id is null or v_txid is null
     or length(v_txid) > 255 then
    raise exception 'invalid_provider_txid';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('withdrawal-user:' || p_user_id::text, 0)
  );

  select * into v_req
  from public.withdrawal_requests
  where id = p_withdrawal_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'withdrawal_not_found';
  end if;

  if v_req.status in ('processing','transferred') then
    if v_req.provider_txid is distinct from v_txid then
      raise exception 'provider_txid_conflict';
    end if;
    return jsonb_build_object(
      'withdrawal_id', v_req.id,
      'status', v_req.status,
      'provider_txid', v_req.provider_txid,
      'duplicate', true
    );
  end if;

  if v_req.status not in ('sending','reconciliation_required') then
    raise exception 'invalid_withdrawal_state';
  end if;

  update public.withdrawal_requests
     set status = 'processing',
         provider_txid = v_txid,
         provider_status = 'SUBMITTED',
         provider_recorded_at = now(),
         reconciliation_required_at = null,
         error_code = null,
         error_detail = null
   where id = v_req.id;

  return jsonb_build_object(
    'withdrawal_id', v_req.id,
    'status', 'processing',
    'provider_txid', v_txid,
    'duplicate', false
  );
end;
$$;

create or replace function public.withdrawal_mark_reconciliation_v1(
  p_withdrawal_id uuid,
  p_user_id uuid,
  p_error_code text,
  p_error_detail text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_req public.withdrawal_requests%rowtype;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('withdrawal-user:' || p_user_id::text, 0)
  );

  select * into v_req
  from public.withdrawal_requests
  where id = p_withdrawal_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'withdrawal_not_found';
  end if;

  if v_req.status = 'sending' and v_req.provider_txid is null then
    update public.withdrawal_requests
       set status = 'reconciliation_required',
           provider_status = 'UNKNOWN',
           reconciliation_required_at = now(),
           error_code = left(coalesce(p_error_code, 'provider_ambiguous'), 120),
           error_detail = left(coalesce(p_error_detail, ''), 500)
     where id = v_req.id;
    v_req.status := 'reconciliation_required';
  end if;

  return jsonb_build_object(
    'withdrawal_id', v_req.id,
    'status', v_req.status,
    'provider_txid', v_req.provider_txid
  );
end;
$$;

create or replace function public.withdrawal_finalize_v1(
  p_withdrawal_id uuid,
  p_user_id uuid,
  p_provider_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_req public.withdrawal_requests%rowtype;
  v_alloc record;
  v_pix_id uuid;
begin
  if p_withdrawal_id is null or p_user_id is null then
    raise exception 'invalid_request';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('withdrawal-user:' || p_user_id::text, 0)
  );

  select * into v_req
  from public.withdrawal_requests
  where id = p_withdrawal_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'withdrawal_not_found';
  end if;

  if v_req.status = 'transferred' then
    return jsonb_build_object(
      'withdrawal_id', v_req.id,
      'status', 'transferred',
      'pix_transaction_id', v_req.pix_transaction_id,
      'duplicate', true
    );
  end if;

  if v_req.status <> 'processing' or v_req.provider_txid is null then
    raise exception 'invalid_withdrawal_state';
  end if;

  perform 1
  from public.company_balance cb
  join public.withdrawal_allocations wa on wa.company_id = cb.company_id
  where wa.withdrawal_id = v_req.id
  order by cb.company_id
  for update of cb;

  v_pix_id := v_req.pix_transaction_id;
  if v_pix_id is null then
    insert into public.pix_transactions (
      company_id, user_id, txid, pix_code, amount_cents,
      destination_pix_key, destination_pix_key_type,
      status, requested_by_voice, notes,
      purpose, payment_provider, origem, referencia_id,
      transferred_at, updated_at
    ) values (
      v_req.primary_company_id, v_req.user_id, v_req.provider_txid, '',
      v_req.requested_amount_cents,
      v_req.pix_key,
      case
        when v_req.pix_key_type in ('cpf','cnpj','email','phone','random')
          then v_req.pix_key_type
        else 'random'
      end,
      'transferred', false,
      'Saque consolidado - Taxa: R$ ' ||
        to_char(v_req.fee_cents / 100.0, 'FM999999990.00') ||
        ' - Comissões: R$ ' ||
        to_char(v_req.commission_cents / 100.0, 'FM999999990.00') ||
        ' - Líquido: R$ ' ||
        to_char(v_req.net_amount_cents / 100.0, 'FM999999990.00'),
      'payment', 'bigcorps', 'withdrawal', v_req.id::text,
      now(), now()
    )
    returning id into v_pix_id;

    update public.withdrawal_requests
       set pix_transaction_id = v_pix_id
     where id = v_req.id;
  end if;

  for v_alloc in
    select *
    from public.withdrawal_allocations
    where withdrawal_id = v_req.id
    order by company_id
  loop
    update public.company_balance
       set total_transferred_cents = total_transferred_cents + v_alloc.amount_cents,
           last_transaction_at = now(),
           updated_at = now()
     where company_id = v_alloc.company_id
       and user_id = v_req.user_id;

    if not found then
      raise exception 'allocation_balance_missing';
    end if;

    insert into public.balance_transactions (
      company_id, user_id, pix_transaction_id, withdrawal_id,
      transaction_type, amount_cents,
      balance_before_cents, balance_after_cents,
      description, metadata
    ) values (
      v_alloc.company_id, v_req.user_id, v_pix_id, v_req.id,
      'withdrawal', v_alloc.amount_cents,
      v_alloc.balance_before_cents, v_alloc.balance_after_reserve_cents,
      'Saque parcial via PIX - R$ ' ||
        to_char(v_alloc.amount_cents / 100.0, 'FM999999990.00'),
      jsonb_build_object(
        'withdrawal_id', v_req.id,
        'total_withdrawal_cents', v_req.requested_amount_cents,
        'fee_cents', v_req.fee_cents,
        'commission_cents', v_req.commission_cents,
        'net_amount_cents', v_req.net_amount_cents,
        'provider_txid', v_req.provider_txid
      )
    );
  end loop;

  update public.commission_pending
     set status = 'descontado',
         descontado_at = now(),
         reserved_withdrawal_id = null,
         reserved_at = null
   where reserved_withdrawal_id = v_req.id
     and status = 'reservado';

  update public.withdrawal_requests
     set status = 'transferred',
         provider_status = left(coalesce(p_provider_status, 'TRANSFERRED'), 120),
         finalized_at = now(),
         error_code = null,
         error_detail = null
   where id = v_req.id;

  return jsonb_build_object(
    'withdrawal_id', v_req.id,
    'status', 'transferred',
    'pix_transaction_id', v_pix_id,
    'provider_txid', v_req.provider_txid,
    'duplicate', false
  );
end;
$$;

create or replace function public.withdrawal_release_v1(
  p_withdrawal_id uuid,
  p_user_id uuid,
  p_error_code text default null,
  p_error_detail text default null,
  p_provider_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_req public.withdrawal_requests%rowtype;
  v_alloc record;
begin
  if p_withdrawal_id is null or p_user_id is null then
    raise exception 'invalid_request';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('withdrawal-user:' || p_user_id::text, 0)
  );

  select * into v_req
  from public.withdrawal_requests
  where id = p_withdrawal_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'withdrawal_not_found';
  end if;

  if v_req.status = 'released' then
    return jsonb_build_object(
      'withdrawal_id', v_req.id,
      'status', 'released',
      'duplicate', true
    );
  end if;

  if v_req.status = 'transferred' then
    raise exception 'withdrawal_already_transferred';
  end if;

  if v_req.status not in ('reserved','sending','processing','reconciliation_required') then
    raise exception 'invalid_withdrawal_state';
  end if;

  perform 1
  from public.company_balance cb
  join public.withdrawal_allocations wa on wa.company_id = cb.company_id
  where wa.withdrawal_id = v_req.id
  order by cb.company_id
  for update of cb;

  for v_alloc in
    select *
    from public.withdrawal_allocations
    where withdrawal_id = v_req.id
    order by company_id
  loop
    update public.company_balance
       set available_balance_cents = available_balance_cents + v_alloc.amount_cents,
           last_transaction_at = now(),
           updated_at = now()
     where company_id = v_alloc.company_id
       and user_id = v_req.user_id;

    if not found then
      raise exception 'allocation_balance_missing';
    end if;
  end loop;

  update public.commission_pending
     set status = 'pendente',
         descontado_at = null,
         reserved_withdrawal_id = null,
         reserved_at = null
   where reserved_withdrawal_id = v_req.id
     and status = 'reservado';

  update public.withdrawal_requests
     set status = 'released',
         provider_status = left(coalesce(p_provider_status, provider_status, 'RELEASED'), 120),
         released_at = now(),
         error_code = left(coalesce(p_error_code, 'withdrawal_released'), 120),
         error_detail = left(coalesce(p_error_detail, ''), 500)
   where id = v_req.id;

  return jsonb_build_object(
    'withdrawal_id', v_req.id,
    'status', 'released',
    'provider_txid', v_req.provider_txid,
    'duplicate', false
  );
end;
$$;

-- These RPCs are server-only. Browser callers authenticate at the Edge boundary.
revoke all on function public.withdrawal_reserve_v1(uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.withdrawal_claim_send_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.withdrawal_record_provider_v1(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.withdrawal_mark_reconciliation_v1(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.withdrawal_finalize_v1(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.withdrawal_release_v1(uuid, uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.withdrawal_reserve_v1(uuid, integer, uuid) to service_role;
grant execute on function public.withdrawal_claim_send_v1(uuid, uuid) to service_role;
grant execute on function public.withdrawal_record_provider_v1(uuid, uuid, text) to service_role;
grant execute on function public.withdrawal_mark_reconciliation_v1(uuid, uuid, text, text) to service_role;
grant execute on function public.withdrawal_finalize_v1(uuid, uuid, text) to service_role;
grant execute on function public.withdrawal_release_v1(uuid, uuid, text, text, text) to service_role;

-- Legacy RPC remains service-role-only but is no longer part of the application path.
revoke all on function public.withdraw_from_user_balance(uuid, integer) from public, anon, authenticated;
grant execute on function public.withdraw_from_user_balance(uuid, integer) to service_role;