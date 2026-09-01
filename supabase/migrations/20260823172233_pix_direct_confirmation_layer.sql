-- Fonte de verdade do motor Pix direto compartilhado.
-- Esta versão já consta no histórico do Supabase de produção; o arquivo é
-- incluído no repositório para manter GitHub e banco sincronizados.

create table if not exists public.pix_payment_preferences (
  company_id uuid not null references public.companies(id) on delete cascade,
  product text not null check (product in ('pixwiki','minhai','funcionaria')),
  mode text not null check (mode in ('free','mercadopago')),
  merchant_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, product)
);

create table if not exists public.pix_direct_intents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  product text not null check (product in ('pixwiki','minhai','funcionaria')),
  product_reference text,
  connection_scope text not null,
  original_amount_cents integer not null check (original_amount_cents > 0),
  discount_cents smallint not null default 0 check (discount_cents between 0 and 10),
  expected_amount_cents integer not null check (expected_amount_cents > 0),
  pix_key text not null,
  pix_key_type text,
  txid text not null unique,
  status text not null default 'pending' check (status in ('pending','confirmed','expired','cancelled')),
  provider_payment_id text,
  matched_receipt_id uuid references public.mp_received_payments(id) on delete set null,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pix_transactions add column if not exists direct_intent_id uuid references public.pix_direct_intents(id) on delete set null;
alter table public.pix_transactions add column if not exists original_amount_cents integer;
alter table public.pix_transactions add column if not exists discount_cents smallint;
alter table public.pix_transactions add column if not exists destination_pix_key varchar;
alter table public.pix_transactions add column if not exists destination_pix_key_type varchar;

create unique index if not exists pix_direct_intents_pending_amount_uidx
  on public.pix_direct_intents(connection_scope, expected_amount_cents)
  where status='pending';
create index if not exists pix_direct_intents_pending_expiry_idx
  on public.pix_direct_intents(connection_scope, expires_at)
  where status='pending';
create index if not exists pix_direct_intents_company_created_idx
  on public.pix_direct_intents(company_id, created_at desc);
create unique index if not exists pix_direct_intents_provider_payment_uidx
  on public.pix_direct_intents(provider_payment_id)
  where provider_payment_id is not null;
create index if not exists pix_transactions_direct_intent_idx
  on public.pix_transactions(direct_intent_id)
  where direct_intent_id is not null;

alter table public.pix_direct_intents enable row level security;
alter table public.pix_payment_preferences enable row level security;

-- A tabela de intenções nunca é operada diretamente pelo navegador.
revoke all on public.pix_direct_intents from anon, authenticated;
grant select,insert,update,delete on public.pix_direct_intents to service_role;

-- Preferências são visíveis apenas aos membros da empresa. A alteração normal
-- de produção deve ser feita pela RPC pix_payment_mode_set.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pix_payment_preferences' and policyname='pix_payment_preferences_select') then
    create policy pix_payment_preferences_select on public.pix_payment_preferences for select to authenticated
      using (
        exists (select 1 from public.companies c where c.id=company_id and c.user_id=auth.uid())
        or exists (select 1 from public.company_admins ca where ca.company_id=company_id and ca.user_id=auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pix_payment_preferences' and policyname='pix_payment_preferences_write') then
    create policy pix_payment_preferences_write on public.pix_payment_preferences for all to authenticated
      using (
        exists (select 1 from public.companies c where c.id=company_id and c.user_id=auth.uid())
        or exists (select 1 from public.company_admins ca where ca.company_id=company_id and ca.user_id=auth.uid() and ca.role in ('owner','manager'))
      )
      with check (
        exists (select 1 from public.companies c where c.id=company_id and c.user_id=auth.uid())
        or exists (select 1 from public.company_admins ca where ca.company_id=company_id and ca.user_id=auth.uid() and ca.role in ('owner','manager'))
      );
  end if;
end $$;

create or replace function public.pix_direct_reserve_intent(
  p_company_id uuid,
  p_user_id uuid,
  p_product text,
  p_product_reference text,
  p_original_amount_cents integer,
  p_connection_scope text,
  p_pix_key text,
  p_pix_key_type text,
  p_txid text,
  p_expires_seconds integer default 1800,
  p_metadata jsonb default '{}'::jsonb
)
returns public.pix_direct_intents
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  v_discount integer; v_expected integer; v_row public.pix_direct_intents;
  v_expires_seconds integer; v_scope text := p_connection_scope; v_mp_user_id text;
begin
  if p_company_id is null or p_product not in ('pixwiki','minhai','funcionaria')
     or coalesce(trim(p_connection_scope),'')='' or coalesce(trim(p_pix_key),'')=''
     or coalesce(trim(p_txid),'')='' or p_original_amount_cents is null or p_original_amount_cents<=0 then
    raise exception 'invalid_direct_pix_intent';
  end if;

  -- A colisão pertence à conta recebedora, não ao produto. Se PixWiki,
  -- minhAi e FuncionarIA apontarem para o mesmo MP, eles compartilham slots.
  if p_product='pixwiki' then
    select pc.mp_user_id into v_mp_user_id
      from public.pixwiki_payment_settings ps
      join public.pixwiki_mp_connections pc on pc.id=ps.mp_connection_id
     where ps.company_id=p_company_id and pc.is_active=true limit 1;
  else
    select mc.mp_user_id into v_mp_user_id
      from public.companies c
      join public.mp_connections mc on mc.user_id=c.user_id and mc.is_active=true
     where c.id=p_company_id
     order by mc.updated_at desc nulls last, mc.created_at desc nulls last limit 1;
  end if;
  if coalesce(trim(v_mp_user_id),'')<>'' then v_scope := 'mpuser:'||trim(v_mp_user_id); end if;

  v_expires_seconds := greatest(60,least(coalesce(p_expires_seconds,1800),1800));
  perform pg_advisory_xact_lock(hashtextextended(v_scope,0));
  update public.pix_direct_intents set status='expired',updated_at=now()
   where connection_scope=v_scope and status='pending' and expires_at<=now();

  for v_discount in 0..10 loop
    v_expected := p_original_amount_cents-v_discount;
    if v_expected<=0 then continue; end if;
    if not exists(select 1 from public.pix_direct_intents i where i.connection_scope=v_scope and i.status='pending' and i.expected_amount_cents=v_expected) then
      insert into public.pix_direct_intents(
        company_id,user_id,product,product_reference,connection_scope,
        original_amount_cents,discount_cents,expected_amount_cents,
        pix_key,pix_key_type,txid,expires_at,metadata
      ) values (
        p_company_id,p_user_id,p_product,nullif(p_product_reference,''),v_scope,
        p_original_amount_cents,v_discount,v_expected,
        trim(p_pix_key),nullif(trim(coalesce(p_pix_key_type,'')),''),trim(p_txid),
        now()+make_interval(secs=>v_expires_seconds),coalesce(p_metadata,'{}'::jsonb)
      ) returning * into v_row;
      return v_row;
    end if;
  end loop;
  raise exception 'pix_direct_slots_unavailable';
end;
$$;

create or replace function public.pix_direct_claim_provider_payment(
  p_intent_id uuid,
  p_provider_payment_id text,
  p_paid_at timestamptz,
  p_receipt_id uuid default null,
  p_finalize_transaction boolean default true
)
returns public.pix_direct_intents
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_row public.pix_direct_intents; v_paid_at timestamptz:=coalesce(p_paid_at,now());
begin
  select * into v_row from public.pix_direct_intents where id=p_intent_id for update;
  if not found then raise exception 'direct_intent_not_found'; end if;
  if v_row.status='confirmed' then
    if v_row.provider_payment_id is distinct from p_provider_payment_id then raise exception 'direct_intent_already_confirmed'; end if;
    return v_row;
  end if;
  if v_row.status<>'pending' then raise exception 'direct_intent_not_pending'; end if;
  if v_paid_at<v_row.created_at-interval '10 seconds' or v_paid_at>v_row.expires_at then raise exception 'direct_payment_outside_window'; end if;
  if exists(select 1 from public.pix_direct_intents i where i.provider_payment_id=p_provider_payment_id and i.id<>p_intent_id) then raise exception 'provider_payment_already_claimed'; end if;
  update public.pix_direct_intents set status='confirmed',provider_payment_id=p_provider_payment_id,matched_receipt_id=coalesce(p_receipt_id,matched_receipt_id),confirmed_at=v_paid_at,updated_at=now() where id=p_intent_id returning * into v_row;
  if p_finalize_transaction then
    update public.pix_transactions set status='confirmed',confirmed_at=coalesce(confirmed_at,v_paid_at),updated_at=now() where direct_intent_id=p_intent_id and status='pending';
  end if;
  return v_row;
end;
$$;

create or replace function public.pix_direct_match_receipt(p_receipt_id uuid)
returns table(matched boolean,intent_id uuid,transaction_id uuid,product text,original_amount_cents integer,expected_amount_cents integer,discount_cents smallint)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_receipt public.mp_received_payments; v_intent public.pix_direct_intents; v_paid_at timestamptz; v_mp_user_id text;
begin
  select * into v_receipt from public.mp_received_payments where id=p_receipt_id;
  if not found then return query select false,null::uuid,null::uuid,null::text,null::integer,null::integer,null::smallint; return; end if;
  select pc.mp_user_id into v_mp_user_id from public.pixwiki_mp_connections pc where pc.id=v_receipt.mp_connection_id;
  if coalesce(v_mp_user_id,'')='' then return query select false,null::uuid,null::uuid,null::text,null::integer,null::integer,null::smallint; return; end if;
  v_paid_at:=coalesce(v_receipt.date_approved,v_receipt.date_created,v_receipt.created_at);
  select i.* into v_intent from public.pix_direct_intents i
   where i.connection_scope='mpuser:'||v_mp_user_id and i.status='pending'
     and i.expected_amount_cents=v_receipt.amount_cents
     and v_paid_at>=i.created_at-interval '10 seconds' and v_paid_at<=i.expires_at
   order by i.created_at asc limit 1 for update skip locked;
  if not found then return query select false,null::uuid,null::uuid,null::text,null::integer,null::integer,null::smallint; return; end if;
  perform public.pix_direct_claim_provider_payment(v_intent.id,v_receipt.mp_payment_id,v_paid_at,v_receipt.id,true);
  return query select true,v_intent.id,t.id,v_intent.product,v_intent.original_amount_cents,v_intent.expected_amount_cents,v_intent.discount_cents from public.pix_transactions t where t.direct_intent_id=v_intent.id order by t.created_at desc limit 1;
  if not found then return query select true,v_intent.id,null::uuid,v_intent.product,v_intent.original_amount_cents,v_intent.expected_amount_cents,v_intent.discount_cents; end if;
end;
$$;

create or replace function public.pix_direct_receipt_match_trigger()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if new.status='approved' and new.source='pix_key' then
    begin perform public.pix_direct_match_receipt(new.id);
    exception when others then raise warning 'pix_direct_match_receipt falhou para receipt %: %',new.id,sqlerrm; end;
  end if;
  return new;
end;
$$;

drop trigger if exists pix_direct_match_on_mp_receipt on public.mp_received_payments;
create trigger pix_direct_match_on_mp_receipt after insert or update of amount_cents,date_approved,mp_connection_id,status,source on public.mp_received_payments for each row execute function public.pix_direct_receipt_match_trigger();

revoke all on function public.pix_direct_reserve_intent(uuid,uuid,text,text,integer,text,text,text,text,integer,jsonb) from public,anon,authenticated;
revoke all on function public.pix_direct_match_receipt(uuid) from public,anon,authenticated;
revoke all on function public.pix_direct_claim_provider_payment(uuid,text,timestamptz,uuid,boolean) from public,anon,authenticated;
grant execute on function public.pix_direct_reserve_intent(uuid,uuid,text,text,integer,text,text,text,text,integer,jsonb) to service_role;
grant execute on function public.pix_direct_match_receipt(uuid) to service_role;
grant execute on function public.pix_direct_claim_provider_payment(uuid,text,timestamptz,uuid,boolean) to service_role;
