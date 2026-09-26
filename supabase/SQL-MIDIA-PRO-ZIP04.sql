-- Midia.Pro — ZIP 04 / Pagamento + Programação
-- Aplicar SOMENTE depois dos SQLs ZIP01, ZIP02 e ZIP03.
--
-- Esta etapa:
--   • aceita purpose=midia_campaign em pix_transactions;
--   • registra tentativas de PIX sem split (valor fica na BigCorps);
--   • converte o hold temporário em inventário contratado após confirmação;
--   • envia a campanha paga para revisão do dono da tela;
--   • gera ocorrências agendadas após aprovação;
--   • avisa o player por playlist_version + Realtime Broadcast.
--
-- Financeiro do parceiro (50/50 ou 80/20, saldo e saque) entra no ZIP 05.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- PIX compartilhado BigCorps
-- Midia.Pro usa um purpose próprio para que confirmar-pix-assistente NÃO
-- credite company_balance da empresa-plataforma.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pix_transactions
  drop constraint if exists pix_transactions_purpose_check;

alter table public.pix_transactions
  add constraint pix_transactions_purpose_check
  check (purpose = any (array[
    'payment'::text,
    'consulta_fee'::text,
    'print_fee'::text,
    'conviteria_presente'::text,
    'conviteria_convite'::text,
    'conviteria_mensalidade'::text,
    'pixwiki_subscription'::text,
    'midia_campaign'::text
  ]));

-- ─────────────────────────────────────────────────────────────────────────────
-- Horário operacional real da tela
-- O ZIP03 já usa active_minutes_per_day no cálculo de inventário. Aqui ele
-- passa a ser derivado do horário de abertura/fechamento, mantendo o cálculo
-- e a agenda apontando para a mesma verdade.
-- ─────────────────────────────────────────────────────────────────────────────
alter table midia.screen_ad_settings
  add column if not exists active_start_time time not null default '08:00',
  add column if not exists active_end_time time not null default '20:00';

update midia.screen_ad_settings
   set active_minutes_per_day = greatest(
     60,
     floor(extract(epoch from (active_end_time - active_start_time)) / 60)::integer
   )
 where active_end_time > active_start_time;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'screen_ad_settings_active_window_chk'
       and conrelid = 'midia.screen_ad_settings'::regclass
  ) then
    alter table midia.screen_ad_settings
      add constraint screen_ad_settings_active_window_chk
      check (active_end_time > active_start_time);
  end if;
end $$;

create or replace function midia.sync_screen_active_minutes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
begin
  if new.active_end_time <= new.active_start_time then
    raise exception 'invalid_active_window';
  end if;
  new.active_minutes_per_day := greatest(
    60,
    floor(extract(epoch from (new.active_end_time - new.active_start_time)) / 60)::integer
  );
  return new;
end;
$$;

revoke all on function midia.sync_screen_active_minutes() from public, anon, authenticated;
grant execute on function midia.sync_screen_active_minutes() to service_role;

drop trigger if exists screen_ad_settings_sync_active_minutes_trg on midia.screen_ad_settings;
create trigger screen_ad_settings_sync_active_minutes_trg
before insert or update of active_start_time, active_end_time on midia.screen_ad_settings
for each row execute function midia.sync_screen_active_minutes();

-- ─────────────────────────────────────────────────────────────────────────────
-- Estado financeiro/revisão na própria campanha
-- ─────────────────────────────────────────────────────────────────────────────
alter table midia.campaigns
  add column if not exists paid_at timestamptz null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists reviewed_by_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz null,
  add column if not exists rejection_reason text null;

-- Uma campanha pode ter mais de um PIX gerado (ex.: primeiro expirou), mas
-- apenas uma transação confirmada será aceita pelo finalizador.
create table if not exists midia.campaign_payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references midia.campaigns(id) on delete cascade,
  pix_transaction_id uuid not null unique references public.pix_transactions(id) on delete restrict,
  provider text not null default 'bigcorps',
  txid text null,
  pix_code text not null,
  qr_code_url text null,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending'
    check (status in ('pending','confirmed','expired','cancelled','failed')),
  expires_at timestamptz not null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists midia_campaign_payments_campaign_idx
  on midia.campaign_payments(campaign_id, created_at desc);
create unique index if not exists midia_campaign_payments_one_confirmed_uidx
  on midia.campaign_payments(campaign_id)
  where status = 'confirmed';

-- ─────────────────────────────────────────────────────────────────────────────
-- Ocorrências contratadas
-- São a agenda concreta que o player recebe. O ZIP05 adicionará proof-of-play.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.campaign_occurrences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references midia.campaigns(id) on delete cascade,
  screen_id uuid not null references midia.screens(id) on delete cascade,
  creative_id uuid not null references midia.ad_creatives(id) on delete restrict,
  planned_at timestamptz not null,
  window_end_at timestamptz not null,
  display_seconds integer not null check (display_seconds in (30,45,60)),
  status text not null default 'scheduled'
    check (status in ('scheduled','played','missed','cancelled')),
  played_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, planned_at),
  check (window_end_at > planned_at)
);

create index if not exists midia_campaign_occurrences_screen_due_idx
  on midia.campaign_occurrences(screen_id, status, planned_at, window_end_at);
create index if not exists midia_campaign_occurrences_campaign_idx
  on midia.campaign_occurrences(campaign_id, status, planned_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper único para versionar + avisar o player.
-- Reaproveitado tanto pela playlist própria quanto pela aprovação de campanha.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.notify_screen_playlist(
  p_screen_id uuid,
  p_action text default 'refresh'
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, midia
as $$
declare
  v_version bigint;
begin
  update midia.screens
     set playlist_version = playlist_version + 1,
         updated_at = now()
   where id = p_screen_id
   returning playlist_version into v_version;

  if v_version is not null then
    perform realtime.send(
      jsonb_build_object(
        'screen_id', p_screen_id,
        'playlist_version', v_version,
        'acao', coalesce(nullif(trim(p_action),''),'refresh')
      ),
      'playlist',
      'midia-screen:' || p_screen_id::text,
      false
    );
  end if;

  return v_version;
end;
$$;

revoke all on function midia.notify_screen_playlist(uuid,text) from public, anon, authenticated;
grant execute on function midia.notify_screen_playlist(uuid,text) to service_role;

create or replace function midia.bump_screen_playlist_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, realtime, midia
as $$
declare
  v_screen_id uuid;
begin
  v_screen_id := case when tg_op = 'DELETE' then old.screen_id else new.screen_id end;
  perform midia.notify_screen_playlist(v_screen_id, lower(tg_op));
  return null;
end;
$$;

revoke all on function midia.bump_screen_playlist_version() from public, anon, authenticated;
grant execute on function midia.bump_screen_playlist_version() to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Confirmação idempotente da campanha após o PIX virar `confirmed`.
-- O valor vem do banco e precisa bater exatamente com o preço fotografado.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.finalize_campaign_payment(p_pix_transaction_id uuid)
returns table (
  campaign_id uuid,
  campaign_status text,
  already_processed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
declare
  v_tx public.pix_transactions%rowtype;
  v_payment midia.campaign_payments%rowtype;
  v_campaign midia.campaigns%rowtype;
  v_campaign_id uuid;
  v_was_processed boolean := false;
begin
  select * into v_tx
    from public.pix_transactions
   where id = p_pix_transaction_id
   for update;

  if not found or v_tx.purpose <> 'midia_campaign' then
    raise exception 'midia_payment_not_found';
  end if;
  if v_tx.status <> 'confirmed' then
    raise exception 'midia_payment_not_confirmed';
  end if;

  select * into v_payment
    from midia.campaign_payments
   where pix_transaction_id = p_pix_transaction_id
   for update;

  if found then
    v_campaign_id := v_payment.campaign_id;
  else
    begin
      v_campaign_id := v_tx.referencia_id::uuid;
    exception when others then
      raise exception 'midia_campaign_reference_invalid';
    end;

    insert into midia.campaign_payments (
      campaign_id, pix_transaction_id, provider, txid, pix_code, qr_code_url,
      amount_cents, status, expires_at, confirmed_at
    ) values (
      v_campaign_id, v_tx.id, coalesce(v_tx.payment_provider,'bigcorps'), v_tx.txid,
      coalesce(v_tx.pix_code,''), null, v_tx.amount_cents, 'confirmed',
      coalesce(v_tx.expires_at, now()), now()
    )
    returning * into v_payment;
  end if;

  select * into v_campaign
    from midia.campaigns
   where id = v_campaign_id
   for update;

  if not found then raise exception 'midia_campaign_not_found'; end if;
  if v_tx.amount_cents <> v_campaign.total_price_cents
     or v_payment.amount_cents <> v_campaign.total_price_cents then
    raise exception 'midia_payment_amount_mismatch';
  end if;

  v_was_processed := v_campaign.paid_at is not null;

  update midia.campaign_payments
     set status = 'confirmed',
         confirmed_at = coalesce(confirmed_at, now()),
         updated_at = now()
   where id = v_payment.id;

  update midia.campaign_inventory_holds
     set status = 'converted',
         expires_at = greatest(expires_at, now()),
         updated_at = now()
   where campaign_id = v_campaign.id
     and status in ('pending','converted');

  update midia.campaigns
     set paid_at = coalesce(paid_at, now()),
         status = case
           when status in ('scheduled','running','completed','approved','rejected','under_review') then status
           else 'under_review'
         end,
         quote_expires_at = greatest(quote_expires_at, now()),
         updated_at = now()
   where id = v_campaign.id
   returning status into v_campaign.status;

  return query select v_campaign.id, v_campaign.status, v_was_processed;
end;
$$;

revoke all on function midia.finalize_campaign_payment(uuid) from public, anon, authenticated;
grant execute on function midia.finalize_campaign_payment(uuid) to service_role;

-- O gatilho NÃO impede a confirmação bancária se houver um problema no módulo
-- Midia.Pro. A API de status também tenta finalizar novamente, deixando a falha
-- recuperável sem prender o PIX em pending.
create or replace function midia.on_pix_transaction_confirmed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
begin
  if new.purpose = 'midia_campaign'
     and new.status = 'confirmed'
     and old.status is distinct from 'confirmed' then
    begin
      perform midia.finalize_campaign_payment(new.id);
    exception when others then
      raise warning 'Midia.Pro: falha ao finalizar PIX %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

revoke all on function midia.on_pix_transaction_confirmed() from public, anon, authenticated;
grant execute on function midia.on_pix_transaction_confirmed() to service_role;

drop trigger if exists pix_transactions_midia_confirmed_trg on public.pix_transactions;
create trigger pix_transactions_midia_confirmed_trg
after update of status on public.pix_transactions
for each row execute function midia.on_pix_transaction_confirmed();

-- ─────────────────────────────────────────────────────────────────────────────
-- Gerador determinístico de agenda após aprovação.
-- Distribui campanhas flexíveis ao longo do horário ativo para reduzir colisão.
-- A janela é sempre explícita; o player não interrompe uma mídia já em curso.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function midia.generate_campaign_occurrences(p_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  c midia.campaigns%rowtype;
  p midia.ad_product_catalog%rowtype;
  s midia.screen_ad_settings%rowtype;
  v_tz text;
  v_creative_id uuid;
  v_day date;
  v_last_day date;
  v_local_now timestamp;
  v_open timestamp;
  v_close timestamp;
  v_planned timestamp;
  v_window_end timestamp;
  v_active_minutes integer;
  v_hash bigint;
  v_offset integer;
  v_i integer;
  v_count integer := 0;
  v_occ integer;
  v_interval integer;
begin
  select * into c from midia.campaigns where id = p_campaign_id for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if c.paid_at is null then raise exception 'campaign_not_paid'; end if;

  select * into p from midia.ad_product_catalog where product_key = c.product_key and active = true;
  if not found then raise exception 'product_not_found'; end if;

  select * into s from midia.screen_ad_settings where screen_id = c.screen_id;
  if not found then raise exception 'screen_settings_not_found'; end if;

  select timezone into v_tz from midia.locations l
   join midia.screens sc on sc.location_id = l.id
   where sc.id = c.screen_id;
  v_tz := coalesce(v_tz,'America/Sao_Paulo');
  v_local_now := timezone(v_tz, now());
  v_active_minutes := greatest(1, floor(extract(epoch from (s.active_end_time - s.active_start_time))/60)::integer);
  v_hash := abs(hashtextextended(c.id::text, 0));

  select id into v_creative_id
    from midia.ad_creatives
   where campaign_id = c.id and status = 'ready'
   order by created_at desc
   limit 1;
  if v_creative_id is null then raise exception 'creative_not_ready'; end if;

  delete from midia.campaign_occurrences
   where campaign_id = c.id and status = 'scheduled';

  -- Experimente: o próximo espaço disponível a partir de ~5 minutos, dentro
  -- dos dias já reservados no quote.
  if p.schedule_kind = 'flexible_once' then
    v_day := greatest(c.start_date, v_local_now::date);
    if v_day is null then v_day := v_local_now::date; end if;
    v_last_day := coalesce(c.end_date, v_day);

    loop
      exit when v_day > v_last_day;
      v_open := v_day + s.active_start_time;
      v_close := v_day + s.active_end_time;
      v_planned := greatest(v_open + interval '5 minutes', v_local_now + interval '5 minutes');
      if v_planned < v_close then
        v_window_end := least(v_close, v_planned + interval '2 hours');
        insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
        values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds);
        v_count := 1;
        exit;
      end if;
      v_day := v_day + 1;
    end loop;

  elsif p.schedule_kind = 'date_once' then
    v_day := c.schedule_date;
    if v_day is null then raise exception 'schedule_date_required'; end if;
    v_open := v_day + s.active_start_time;
    v_close := v_day + s.active_end_time;
    v_offset := mod(v_hash, greatest(v_active_minutes - 5,1));
    v_planned := v_open + make_interval(mins => v_offset);
    if v_day = v_local_now::date and v_planned < v_local_now + interval '2 minutes' then
      v_planned := v_local_now + interval '2 minutes';
    end if;
    if v_planned < v_close then
      v_window_end := least(v_close, v_planned + interval '2 hours');
      insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
      values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds);
      v_count := 1;
    end if;

  elsif p.schedule_kind = 'window_once' then
    if c.schedule_date is null or c.schedule_time is null then raise exception 'schedule_window_required'; end if;
    v_open := c.schedule_date + c.schedule_time;
    v_window_end := v_open + make_interval(mins => coalesce(p.window_minutes,60));
    if v_window_end <= v_local_now then raise exception 'campaign_window_elapsed'; end if;
    v_offset := mod(v_hash, greatest(coalesce(p.window_minutes,60) - 2,1));
    v_planned := v_open + make_interval(mins => v_offset);
    if v_planned < v_local_now + interval '1 minute' then v_planned := v_local_now + interval '1 minute'; end if;
    if v_planned < v_window_end then
      insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
      values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds);
      v_count := 1;
    end if;

  elsif p.schedule_kind = 'recurring_fixed' then
    v_day := c.start_date;
    v_last_day := c.end_date;
    if v_day is null or v_last_day is null then raise exception 'campaign_dates_required'; end if;
    v_occ := greatest(1, coalesce(p.occurrences_per_day,1)::integer);

    while v_day <= v_last_day loop
      v_open := v_day + s.active_start_time;
      v_close := v_day + s.active_end_time;

      for v_i in 0..(v_occ - 1) loop
        if c.schedule_time is not null then
          v_planned := v_day + c.schedule_time;
          v_window_end := v_planned + make_interval(mins => coalesce(p.window_minutes,60));
        else
          -- centro de cada fatia do dia; campanhas diferentes recebem pequeno
          -- deslocamento determinístico sem sair da fatia.
          v_offset := floor((v_i + 0.5) * v_active_minutes / v_occ)::integer;
          v_offset := least(v_active_minutes - 1, greatest(0, v_offset + mod(v_hash, greatest(floor(v_active_minutes / v_occ / 3)::integer,1))));
          v_planned := v_open + make_interval(mins => v_offset);
          v_window_end := least(v_close, v_planned + interval '60 minutes');
        end if;

        if v_window_end > v_local_now and v_planned < v_close then
          if v_planned < v_local_now + interval '1 minute' then
            v_planned := v_local_now + interval '1 minute';
          end if;
          if v_planned < v_window_end and v_planned < v_close then
            insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
            values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds)
            on conflict (campaign_id,planned_at) do nothing;
            if found then v_count := v_count + 1; end if;
          end if;
        end if;
      end loop;
      v_day := v_day + 1;
    end loop;

  elsif p.schedule_kind = 'recurring_interval' then
    v_day := c.start_date;
    v_last_day := c.end_date;
    if v_day is null or v_last_day is null then raise exception 'campaign_dates_required'; end if;
    v_interval := greatest(5, coalesce(p.interval_minutes,60));

    while v_day <= v_last_day loop
      v_open := v_day + s.active_start_time;
      v_close := v_day + s.active_end_time;
      v_offset := mod(v_hash, v_interval);
      v_planned := v_open + make_interval(mins => v_offset);

      while v_planned < v_close loop
        v_window_end := least(v_close, v_planned + make_interval(mins => v_interval));
        if v_window_end > v_local_now then
          if v_planned < v_local_now + interval '1 minute' then
            v_planned := v_local_now + interval '1 minute';
          end if;
          if v_planned < v_window_end and v_planned < v_close then
            insert into midia.campaign_occurrences(campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds)
            values (c.id,c.screen_id,v_creative_id,v_planned at time zone v_tz,v_window_end at time zone v_tz,c.duration_seconds)
            on conflict (campaign_id,planned_at) do nothing;
            if found then v_count := v_count + 1; end if;
          end if;
        end if;
        v_planned := v_planned + make_interval(mins => v_interval);
      end loop;
      v_day := v_day + 1;
    end loop;
  end if;

  if v_count <= 0 then raise exception 'campaign_window_elapsed'; end if;
  return v_count;
end;
$$;

revoke all on function midia.generate_campaign_occurrences(uuid) from public, anon, authenticated;
grant execute on function midia.generate_campaign_occurrences(uuid) to service_role;

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

-- updated_at

drop trigger if exists campaign_payments_touch_updated_at on midia.campaign_payments;
create trigger campaign_payments_touch_updated_at
before update on midia.campaign_payments
for each row execute function midia.touch_updated_at();

drop trigger if exists campaign_occurrences_touch_updated_at on midia.campaign_occurrences;
create trigger campaign_occurrences_touch_updated_at
before update on midia.campaign_occurrences
for each row execute function midia.touch_updated_at();

-- Privado / server-only
alter table midia.campaign_payments enable row level security;
alter table midia.campaign_occurrences enable row level security;
revoke all on midia.campaign_payments from public, anon, authenticated;
revoke all on midia.campaign_occurrences from public, anon, authenticated;
grant all on midia.campaign_payments to service_role;
grant all on midia.campaign_occurrences to service_role;

commit;
