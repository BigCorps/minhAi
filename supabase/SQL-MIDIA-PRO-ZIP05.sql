-- Midia.Pro — ZIP 05 / Financeiro + Proof-of-Play
-- Aplicar SOMENTE depois dos SQLs ZIP01, ZIP02, ZIP03 e ZIP04.
--
-- Esta etapa:
--   • registra proof-of-play validado por ocorrência e por device pareado;
--   • remunera somente exibições efetivamente comprovadas;
--   • fotografa 80/20 para vendas originadas no QR da própria tela e 50/50
--     para vendas diretas/rede;
--   • separa receita bruta, custo do provedor, líquido, parceiro e BigCorps;
--   • mantém carteira do publisher com pendente/disponível/em saque/repassado;
--   • cria ledger auditável e saque manual via PIX, no padrão do ConviteIA;
--   • deixa funções de conclusão/estorno de saque prontas para o Admin do ZIP06.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Custo do provedor. Hoje a infraestrutura PIX pode deixar esse valor em zero;
-- se houver custo por transação, o backend/admin pode gravá-lo ANTES da primeira
-- exibição. O settlement fotografa o valor para vendas antigas nunca mudarem.
-- ─────────────────────────────────────────────────────────────────────────────
alter table midia.campaign_payments
  add column if not exists provider_fee_cents integer not null default 0
    check (provider_fee_cents >= 0 and provider_fee_cents <= amount_cents);

-- ─────────────────────────────────────────────────────────────────────────────
-- Carteira do parceiro
-- pending = participação já contratada, ainda dependente de proof-of-play.
-- available = proof-of-play confirmado e liberado para saque.
-- withdrawal_pending = valor reservado por um pedido de saque em andamento.
-- withdrawn = total efetivamente repassado.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.publisher_wallets (
  publisher_id uuid primary key references midia.publishers(id) on delete cascade,
  pending_cents bigint not null default 0 check (pending_cents >= 0),
  available_cents bigint not null default 0 check (available_cents >= 0),
  withdrawal_pending_cents bigint not null default 0 check (withdrawal_pending_cents >= 0),
  withdrawn_cents bigint not null default 0 check (withdrawn_cents >= 0),
  total_earned_cents bigint not null default 0 check (total_earned_cents >= 0),
  updated_at timestamptz not null default now()
);

insert into midia.publisher_wallets(publisher_id)
select id from midia.publishers
on conflict (publisher_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Settlement imutável por campanha/tela deste MVP.
-- Quando no futuro uma campanha puder comprar várias telas, este mesmo padrão
-- migra naturalmente para um settlement por placement/tela.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.campaign_settlements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references midia.campaigns(id) on delete cascade,
  publisher_id uuid not null references midia.publishers(id) on delete restrict,
  screen_id uuid not null references midia.screens(id) on delete restrict,
  origin_kind text not null check (origin_kind in ('screen_qr','direct','network')),
  gross_cents bigint not null check (gross_cents > 0),
  provider_fee_cents bigint not null default 0 check (provider_fee_cents >= 0),
  net_cents bigint not null check (net_cents >= 0),
  publisher_share_bps integer not null check (publisher_share_bps between 0 and 10000),
  publisher_total_cents bigint not null check (publisher_total_cents >= 0),
  bigcorps_total_cents bigint not null check (bigcorps_total_cents >= 0),
  total_occurrences integer not null check (total_occurrences > 0),
  delivered_occurrences integer not null default 0 check (delivered_occurrences >= 0),
  publisher_earned_cents bigint not null default 0 check (publisher_earned_cents >= 0),
  bigcorps_earned_cents bigint not null default 0 check (bigcorps_earned_cents >= 0),
  status text not null default 'pending' check (status in ('pending','earning','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provider_fee_cents <= gross_cents),
  check (net_cents = gross_cents - provider_fee_cents),
  check (publisher_total_cents + bigcorps_total_cents = net_cents),
  check (delivered_occurrences <= total_occurrences),
  check (publisher_earned_cents <= publisher_total_cents),
  check (bigcorps_earned_cents <= bigcorps_total_cents)
);

create index if not exists midia_campaign_settlements_publisher_idx
  on midia.campaign_settlements(publisher_id, status, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Proof-of-play aceito. Uma ocorrência pode ser remunerada uma única vez e um
-- client_event_id não pode ser reaproveitado em outra ocorrência.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.play_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  occurrence_id uuid not null unique references midia.campaign_occurrences(id) on delete restrict,
  campaign_id uuid not null references midia.campaigns(id) on delete restrict,
  screen_id uuid not null references midia.screens(id) on delete restrict,
  device_id uuid not null references midia.devices(id) on delete restrict,
  client_started_at timestamptz not null,
  client_ended_at timestamptz not null,
  played_ms integer not null check (played_ms > 0),
  display_seconds integer not null check (display_seconds in (30,45,60)),
  offline_at_completion boolean not null default false,
  app_version text null,
  ip_hash text null,
  publisher_earned_cents bigint not null default 0 check (publisher_earned_cents >= 0),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (client_ended_at >= client_started_at)
);

create index if not exists midia_play_events_campaign_idx
  on midia.play_events(campaign_id, received_at desc);
create index if not exists midia_play_events_screen_idx
  on midia.play_events(screen_id, received_at desc);
create index if not exists midia_play_events_device_idx
  on midia.play_events(device_id, received_at desc);

alter table midia.campaign_occurrences
  add column if not exists proof_event_id uuid null references midia.play_events(id) on delete set null,
  add column if not exists proof_validated_at timestamptz null,
  add column if not exists publisher_earned_cents bigint not null default 0 check (publisher_earned_cents >= 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ledger de parceiro. Os deltas mostram exatamente como a carteira mudou.
-- Uma chave idempotente impede duplicação em reentregas.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.publisher_ledger (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references midia.publishers(id) on delete restrict,
  campaign_id uuid null references midia.campaigns(id) on delete set null,
  occurrence_id uuid null references midia.campaign_occurrences(id) on delete set null,
  withdrawal_id uuid null,
  entry_key text not null unique,
  entry_type text not null check (entry_type in (
    'campaign_pending','play_earned','withdrawal_requested','withdrawal_completed',
    'withdrawal_reversed','campaign_reversed','adjustment'
  )),
  pending_delta_cents bigint not null default 0,
  available_delta_cents bigint not null default 0,
  withdrawal_delta_cents bigint not null default 0,
  withdrawn_delta_cents bigint not null default 0,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists midia_publisher_ledger_publisher_idx
  on midia.publisher_ledger(publisher_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Perfil de repasse e solicitações de saque.
-- O documento fica somente no schema privado e nunca é devolvido completo pelo
-- dashboard. Saque mínimo inicial: R$ 50,00.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.payout_profiles (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null unique references midia.publishers(id) on delete cascade,
  full_name text not null,
  document_type text not null check (document_type in ('cpf','cnpj')),
  document_digits text not null,
  email text not null,
  pix_key text not null,
  pix_key_type text not null check (pix_key_type in ('cpf','cnpj','email','phone','random')),
  verified boolean not null default false,
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(full_name) between 5 and 140),
  check ((document_type='cpf' and char_length(document_digits)=11) or (document_type='cnpj' and char_length(document_digits)=14)),
  check (char_length(email) between 5 and 254),
  check (char_length(pix_key) between 3 and 180)
);

create table if not exists midia.withdrawals (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references midia.publishers(id) on delete restrict,
  payout_profile_id uuid not null references midia.payout_profiles(id) on delete restrict,
  amount_cents bigint not null check (amount_cents >= 5000),
  status text not null default 'pending' check (status in ('pending','processing','paid','rejected','cancelled')),
  error text null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz null,
  completed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists midia_withdrawals_publisher_idx
  on midia.withdrawals(publisher_id, requested_at desc);
create unique index if not exists midia_withdrawals_one_open_uidx
  on midia.withdrawals(publisher_id)
  where status in ('pending','processing');

-- FK do ledger só pode ser criada depois de withdrawals existir.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname='publisher_ledger_withdrawal_fk'
       and conrelid='midia.publisher_ledger'::regclass
  ) then
    alter table midia.publisher_ledger
      add constraint publisher_ledger_withdrawal_fk
      foreign key (withdrawal_id) references midia.withdrawals(id) on delete set null;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Snapshot financeiro ao aprovar a campanha.
-- screen_qr = venda originada no ponto do parceiro => 80% publisher.
-- direct/network = venda captada pela Midia.Pro => 50% publisher.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.ensure_campaign_settlement(p_campaign_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
declare
  c midia.campaigns%rowtype;
  p midia.campaign_payments%rowtype;
  v_existing uuid;
  v_count integer;
  v_fee bigint;
  v_net bigint;
  v_share integer;
  v_publisher bigint;
  v_bigcorps bigint;
  v_id uuid;
begin
  select id into v_existing from midia.campaign_settlements where campaign_id=p_campaign_id;
  if v_existing is not null then return v_existing; end if;

  select * into c from midia.campaigns where id=p_campaign_id for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if c.paid_at is null then raise exception 'campaign_not_paid'; end if;

  select * into p
    from midia.campaign_payments
   where campaign_id=c.id and status='confirmed'
   order by confirmed_at desc nulls last, created_at desc
   limit 1;
  if not found then raise exception 'campaign_payment_not_confirmed'; end if;
  if p.amount_cents::bigint <> c.total_price_cents::bigint then
    raise exception 'campaign_payment_amount_mismatch';
  end if;

  select count(*)::integer into v_count
    from midia.campaign_occurrences
   where campaign_id=c.id and status <> 'cancelled';
  if coalesce(v_count,0) <= 0 then raise exception 'campaign_occurrences_missing'; end if;

  v_fee := greatest(0, least(p.amount_cents, coalesce(p.provider_fee_cents,0)));
  v_net := greatest(0, p.amount_cents::bigint - v_fee);
  v_share := case when c.origin_kind='screen_qr' then 8000 else 5000 end;
  v_publisher := floor(v_net * v_share / 10000.0)::bigint;
  v_bigcorps := v_net - v_publisher;

  insert into midia.publisher_wallets(publisher_id)
  values (c.publisher_id)
  on conflict (publisher_id) do nothing;

  insert into midia.campaign_settlements(
    campaign_id,publisher_id,screen_id,origin_kind,gross_cents,provider_fee_cents,
    net_cents,publisher_share_bps,publisher_total_cents,bigcorps_total_cents,
    total_occurrences
  ) values (
    c.id,c.publisher_id,c.screen_id,c.origin_kind,p.amount_cents,v_fee,
    v_net,v_share,v_publisher,v_bigcorps,v_count
  )
  on conflict (campaign_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from midia.campaign_settlements where campaign_id=c.id;
    return v_id;
  end if;

  update midia.publisher_wallets
     set pending_cents = pending_cents + v_publisher,
         updated_at = now()
   where publisher_id=c.publisher_id;

  insert into midia.publisher_ledger(
    publisher_id,campaign_id,entry_key,entry_type,pending_delta_cents,
    description,metadata
  ) values (
    c.publisher_id,c.id,'campaign:'||c.id::text||':pending','campaign_pending',v_publisher,
    'Participação contratada aguardando proof-of-play',
    jsonb_build_object('origin_kind',c.origin_kind,'share_bps',v_share,'gross_cents',p.amount_cents,'provider_fee_cents',v_fee,'occurrences',v_count)
  ) on conflict (entry_key) do nothing;

  return v_id;
end;
$$;

revoke all on function midia.ensure_campaign_settlement(uuid) from public, anon, authenticated;
grant execute on function midia.ensure_campaign_settlement(uuid) to service_role;

-- Substitui a função do ZIP04 apenas para acrescentar o snapshot financeiro
-- depois que a agenda concreta tiver sido gerada.
create or replace function midia.review_campaign(
  p_campaign_id uuid,
  p_publisher_id uuid,
  p_reviewer_user_id uuid,
  p_action text,
  p_reason text default null
)
returns table (
  campaign_status text,
  occurrence_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  c midia.campaigns%rowtype;
  v_count integer := 0;
begin
  select * into c
    from midia.campaigns
   where id = p_campaign_id
     and publisher_id = p_publisher_id
   for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if c.paid_at is null then raise exception 'campaign_not_paid'; end if;

  if p_action = 'reject' then
    if c.status <> 'under_review' then raise exception 'campaign_not_under_review'; end if;
    if char_length(trim(coalesce(p_reason,''))) < 5 then raise exception 'rejection_reason_required'; end if;
    update midia.campaigns
       set status = 'rejected',
           rejection_reason = left(trim(p_reason),500),
           reviewed_at = now(),
           reviewed_by_user_id = p_reviewer_user_id,
           updated_at = now()
     where id = c.id;
    return query select 'rejected'::text, 0;
    return;
  end if;

  if p_action <> 'approve' then raise exception 'invalid_review_action'; end if;
  if c.status <> 'under_review' then raise exception 'campaign_not_under_review'; end if;

  v_count := midia.generate_campaign_occurrences(c.id);
  perform midia.ensure_campaign_settlement(c.id);

  update midia.campaigns
     set status = 'scheduled',
         rejection_reason = null,
         reviewed_at = now(),
         reviewed_by_user_id = p_reviewer_user_id,
         approved_at = now(),
         updated_at = now()
   where id = c.id;

  perform midia.notify_screen_playlist(c.screen_id, 'campaign_approved');
  return query select 'scheduled'::text, v_count;
end;
$$;

revoke all on function midia.review_campaign(uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function midia.review_campaign(uuid,uuid,uuid,text,text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Proof-of-play transacional.
-- A assinatura HMAC do manifesto é validada na API Next.js. Esta função valida
-- novamente device/tela/janela/duração e movimenta settlement + wallet de forma
-- atômica. Reentrega da mesma ocorrência nunca gera receita duas vezes.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.record_play_event(
  p_occurrence_id uuid,
  p_device_id uuid,
  p_client_event_id uuid,
  p_client_started_at timestamptz,
  p_client_ended_at timestamptz,
  p_played_ms integer,
  p_offline boolean,
  p_app_version text,
  p_ip_hash text
)
returns table (
  play_event_id uuid,
  already_processed boolean,
  publisher_earned_cents bigint,
  wallet_available_cents bigint,
  wallet_pending_cents bigint,
  campaign_status text
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  o midia.campaign_occurrences%rowtype;
  d midia.devices%rowtype;
  s midia.campaign_settlements%rowtype;
  v_event_id uuid;
  v_existing_earned bigint;
  v_min_ms integer;
  v_max_ms integer;
  v_new_delivered integer;
  v_target_publisher bigint;
  v_target_bigcorps bigint;
  v_delta_publisher bigint;
  v_wallet_available bigint;
  v_wallet_pending bigint;
  v_campaign_status text;
begin
  select * into o from midia.campaign_occurrences where id=p_occurrence_id for update;
  if not found then raise exception 'occurrence_not_found'; end if;

  select * into d from midia.devices where id=p_device_id and revoked_at is null and paired_at is not null;
  if not found or d.screen_id <> o.screen_id then raise exception 'device_screen_mismatch'; end if;

  if o.status='played' and o.proof_event_id is not null then
    select publisher_earned_cents into v_existing_earned from midia.play_events where id=o.proof_event_id;
    select available_cents,pending_cents into v_wallet_available,v_wallet_pending
      from midia.publisher_wallets w
      join midia.campaigns c on c.publisher_id=w.publisher_id
     where c.id=o.campaign_id;
    select status into v_campaign_status from midia.campaigns where id=o.campaign_id;
    return query select o.proof_event_id,true,coalesce(v_existing_earned,0),coalesce(v_wallet_available,0),coalesce(v_wallet_pending,0),v_campaign_status;
    return;
  end if;

  if o.status <> 'scheduled' then raise exception 'occurrence_not_scheduled'; end if;
  if p_client_started_at is null or p_client_ended_at is null or p_client_ended_at < p_client_started_at then
    raise exception 'invalid_client_timing';
  end if;

  -- 80% da duração contratada precisa ter sido efetivamente percorrida.
  -- O teto evita eventos absurdos/corrompidos e ainda tolera timer de fallback.
  v_min_ms := greatest(1000, floor(o.display_seconds * 1000 * 0.80)::integer);
  v_max_ms := (o.display_seconds + 120) * 1000;
  if p_played_ms < v_min_ms or p_played_ms > v_max_ms then raise exception 'invalid_play_duration'; end if;

  -- Tolerância de relógio/dispositivo: 15 min antes e depois da janela.
  if p_client_started_at < o.planned_at - interval '15 minutes'
     or p_client_started_at > o.window_end_at + interval '15 minutes' then
    raise exception 'play_outside_window';
  end if;

  perform midia.ensure_campaign_settlement(o.campaign_id);
  select * into s from midia.campaign_settlements where campaign_id=o.campaign_id for update;
  if not found or s.status='cancelled' then raise exception 'settlement_unavailable'; end if;

  -- Idempotência por client_event_id também cobre reenvio offline do navegador.
  select id,publisher_earned_cents into v_event_id,v_existing_earned
    from midia.play_events where client_event_id=p_client_event_id;
  if found then
    select available_cents,pending_cents into v_wallet_available,v_wallet_pending
      from midia.publisher_wallets where publisher_id=s.publisher_id;
    select status into v_campaign_status from midia.campaigns where id=o.campaign_id;
    return query select v_event_id,true,coalesce(v_existing_earned,0),coalesce(v_wallet_available,0),coalesce(v_wallet_pending,0),v_campaign_status;
    return;
  end if;

  v_new_delivered := s.delivered_occurrences + 1;
  if v_new_delivered > s.total_occurrences then raise exception 'settlement_overdelivery'; end if;

  -- O cálculo cumulativo absorve centavos de arredondamento. Na última exibição
  -- entregue, publisher_earned_cents chega exatamente ao total fotografado.
  v_target_publisher := floor(s.publisher_total_cents * v_new_delivered / s.total_occurrences::numeric)::bigint;
  v_target_bigcorps := floor(s.bigcorps_total_cents * v_new_delivered / s.total_occurrences::numeric)::bigint;
  v_delta_publisher := greatest(0, v_target_publisher - s.publisher_earned_cents);

  insert into midia.play_events(
    client_event_id,occurrence_id,campaign_id,screen_id,device_id,
    client_started_at,client_ended_at,played_ms,display_seconds,
    offline_at_completion,app_version,ip_hash,publisher_earned_cents
  ) values (
    p_client_event_id,o.id,o.campaign_id,o.screen_id,d.id,
    p_client_started_at,p_client_ended_at,p_played_ms,o.display_seconds,
    coalesce(p_offline,false),left(coalesce(p_app_version,''),40),left(coalesce(p_ip_hash,''),64),v_delta_publisher
  ) returning id into v_event_id;

  update midia.campaign_occurrences
     set status='played',
         played_at=p_client_ended_at,
         proof_event_id=v_event_id,
         proof_validated_at=now(),
         publisher_earned_cents=v_delta_publisher,
         updated_at=now()
   where id=o.id;

  update midia.campaign_settlements
     set delivered_occurrences=v_new_delivered,
         publisher_earned_cents=v_target_publisher,
         bigcorps_earned_cents=v_target_bigcorps,
         status=case when v_new_delivered>=total_occurrences then 'completed' else 'earning' end,
         updated_at=now()
   where id=s.id;

  insert into midia.publisher_wallets(publisher_id)
  values (s.publisher_id)
  on conflict (publisher_id) do nothing;

  update midia.publisher_wallets
     set pending_cents=pending_cents-v_delta_publisher,
         available_cents=available_cents+v_delta_publisher,
         total_earned_cents=total_earned_cents+v_delta_publisher,
         updated_at=now()
   where publisher_id=s.publisher_id
   returning available_cents,pending_cents into v_wallet_available,v_wallet_pending;

  insert into midia.publisher_ledger(
    publisher_id,campaign_id,occurrence_id,entry_key,entry_type,
    pending_delta_cents,available_delta_cents,description,metadata
  ) values (
    s.publisher_id,o.campaign_id,o.id,'occurrence:'||o.id::text||':earned','play_earned',
    -v_delta_publisher,v_delta_publisher,'Exibição comprovada e liberada para saque',
    jsonb_build_object('play_event_id',v_event_id,'display_seconds',o.display_seconds,'offline',coalesce(p_offline,false))
  ) on conflict (entry_key) do nothing;

  update midia.campaigns
     set status=case when v_new_delivered>=s.total_occurrences then 'completed' else 'running' end,
         updated_at=now()
   where id=o.campaign_id
     and status in ('scheduled','running','completed')
   returning status into v_campaign_status;

  return query select v_event_id,false,v_delta_publisher,v_wallet_available,v_wallet_pending,coalesce(v_campaign_status,'running');
end;
$$;

revoke all on function midia.record_play_event(uuid,uuid,uuid,timestamptz,timestamptz,integer,boolean,text,text) from public, anon, authenticated;
grant execute on function midia.record_play_event(uuid,uuid,uuid,timestamptz,timestamptz,integer,boolean,text,text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Saque manual: reserva o saldo disponível imediatamente para impedir duas
-- solicitações concorrentes. O PIX é realizado operacionalmente e o ZIP06 terá
-- a tela Admin para concluir/rejeitar a solicitação.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.request_publisher_withdrawal(
  p_publisher_id uuid,
  p_payout_profile_id uuid,
  p_amount_cents bigint
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  w midia.publisher_wallets%rowtype;
  v_id uuid;
begin
  if p_amount_cents < 5000 then raise exception 'withdrawal_below_minimum'; end if;
  if not exists (
    select 1 from midia.payout_profiles
     where id=p_payout_profile_id and publisher_id=p_publisher_id
  ) then raise exception 'payout_profile_invalid'; end if;
  if exists (
    select 1 from midia.withdrawals
     where publisher_id=p_publisher_id and status in ('pending','processing')
  ) then raise exception 'withdrawal_already_open'; end if;

  insert into midia.publisher_wallets(publisher_id) values (p_publisher_id)
  on conflict (publisher_id) do nothing;

  select * into w from midia.publisher_wallets where publisher_id=p_publisher_id for update;
  if w.available_cents < p_amount_cents then raise exception 'withdrawal_insufficient_balance'; end if;

  insert into midia.withdrawals(publisher_id,payout_profile_id,amount_cents,status)
  values (p_publisher_id,p_payout_profile_id,p_amount_cents,'pending')
  returning id into v_id;

  update midia.publisher_wallets
     set available_cents=available_cents-p_amount_cents,
         withdrawal_pending_cents=withdrawal_pending_cents+p_amount_cents,
         updated_at=now()
   where publisher_id=p_publisher_id;

  insert into midia.publisher_ledger(
    publisher_id,withdrawal_id,entry_key,entry_type,available_delta_cents,
    withdrawal_delta_cents,description
  ) values (
    p_publisher_id,v_id,'withdrawal:'||v_id::text||':requested','withdrawal_requested',
    -p_amount_cents,p_amount_cents,'Saque PIX solicitado'
  );

  return v_id;
end;
$$;

revoke all on function midia.request_publisher_withdrawal(uuid,uuid,bigint) from public, anon, authenticated;
grant execute on function midia.request_publisher_withdrawal(uuid,uuid,bigint) to service_role;

create or replace function midia.set_withdrawal_status(
  p_withdrawal_id uuid,
  p_status text,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  x midia.withdrawals%rowtype;
begin
  if p_status not in ('processing','paid','rejected','cancelled') then raise exception 'withdrawal_status_invalid'; end if;
  select * into x from midia.withdrawals where id=p_withdrawal_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  if x.status in ('paid','rejected','cancelled') then return x.status; end if;

  if p_status='processing' then
    update midia.withdrawals set status='processing',processed_at=coalesce(processed_at,now()),error=null,updated_at=now() where id=x.id;
    return 'processing';
  end if;

  if p_status='paid' then
    update midia.publisher_wallets
       set withdrawal_pending_cents=withdrawal_pending_cents-x.amount_cents,
           withdrawn_cents=withdrawn_cents+x.amount_cents,
           updated_at=now()
     where publisher_id=x.publisher_id;
    update midia.withdrawals
       set status='paid',processed_at=coalesce(processed_at,now()),completed_at=now(),error=null,updated_at=now()
     where id=x.id;
    insert into midia.publisher_ledger(
      publisher_id,withdrawal_id,entry_key,entry_type,withdrawal_delta_cents,withdrawn_delta_cents,description
    ) values (
      x.publisher_id,x.id,'withdrawal:'||x.id::text||':paid','withdrawal_completed',-x.amount_cents,x.amount_cents,'Saque PIX concluído'
    ) on conflict (entry_key) do nothing;
    return 'paid';
  end if;

  -- Rejeição/cancelamento devolve o valor reservado para disponível.
  update midia.publisher_wallets
     set withdrawal_pending_cents=withdrawal_pending_cents-x.amount_cents,
         available_cents=available_cents+x.amount_cents,
         updated_at=now()
   where publisher_id=x.publisher_id;
  update midia.withdrawals
     set status=p_status,processed_at=coalesce(processed_at,now()),completed_at=now(),error=left(nullif(trim(coalesce(p_error,'')),''),500),updated_at=now()
   where id=x.id;
  insert into midia.publisher_ledger(
    publisher_id,withdrawal_id,entry_key,entry_type,available_delta_cents,withdrawal_delta_cents,description,metadata
  ) values (
    x.publisher_id,x.id,'withdrawal:'||x.id::text||':reversed','withdrawal_reversed',x.amount_cents,-x.amount_cents,'Saque devolvido ao saldo disponível',jsonb_build_object('status',p_status,'error',p_error)
  ) on conflict (entry_key) do nothing;
  return p_status;
end;
$$;

revoke all on function midia.set_withdrawal_status(uuid,text,text) from public, anon, authenticated;
grant execute on function midia.set_withdrawal_status(uuid,text,text) to service_role;

-- updated_at
drop trigger if exists publisher_wallets_touch_updated_at on midia.publisher_wallets;
create trigger publisher_wallets_touch_updated_at before update on midia.publisher_wallets
for each row execute function midia.touch_updated_at();

drop trigger if exists campaign_settlements_touch_updated_at on midia.campaign_settlements;
create trigger campaign_settlements_touch_updated_at before update on midia.campaign_settlements
for each row execute function midia.touch_updated_at();

drop trigger if exists payout_profiles_touch_updated_at on midia.payout_profiles;
create trigger payout_profiles_touch_updated_at before update on midia.payout_profiles
for each row execute function midia.touch_updated_at();

drop trigger if exists withdrawals_touch_updated_at on midia.withdrawals;
create trigger withdrawals_touch_updated_at before update on midia.withdrawals
for each row execute function midia.touch_updated_at();

-- Segurança: tudo server-only.
alter table midia.publisher_wallets enable row level security;
alter table midia.campaign_settlements enable row level security;
alter table midia.play_events enable row level security;
alter table midia.publisher_ledger enable row level security;
alter table midia.payout_profiles enable row level security;
alter table midia.withdrawals enable row level security;

revoke all on midia.publisher_wallets from public, anon, authenticated;
revoke all on midia.campaign_settlements from public, anon, authenticated;
revoke all on midia.play_events from public, anon, authenticated;
revoke all on midia.publisher_ledger from public, anon, authenticated;
revoke all on midia.payout_profiles from public, anon, authenticated;
revoke all on midia.withdrawals from public, anon, authenticated;

grant all on midia.publisher_wallets to service_role;
grant all on midia.campaign_settlements to service_role;
grant all on midia.play_events to service_role;
grant all on midia.publisher_ledger to service_role;
grant all on midia.payout_profiles to service_role;
grant all on midia.withdrawals to service_role;

-- Backfill seguro caso ZIP04 tenha sido testado antes de este SQL ser aplicado.
do $$
declare r record;
begin
  for r in
    select c.id
      from midia.campaigns c
     where c.paid_at is not null
       and c.status in ('scheduled','running','completed')
       and exists (select 1 from midia.campaign_occurrences o where o.campaign_id=c.id and o.status<>'cancelled')
  loop
    begin
      perform midia.ensure_campaign_settlement(r.id);
    exception when others then
      raise warning 'Midia.Pro ZIP05 backfill settlement %: %', r.id, sqlerrm;
    end;
  end loop;
end $$;

commit;
