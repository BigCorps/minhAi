-- Midia.Pro — ZIP 06 / Lançamento + Rede + Administração
-- Aplicar SOMENTE depois dos SQLs ZIP01..ZIP05.
--
-- Esta etapa:
--   • cria campanhas institucionais/fillers administradas pela BigCorps;
--   • adiciona recuperação automática de ocorrências pagas não entregues;
--   • registra auditoria das ações administrativas do Midia.Pro;
--   • mantém toda a superfície financeira e administrativa server-only;
--   • não automatiza o PIX do saque: o Admin apenas muda o estado depois da
--     conferência/repasse operacional, igual ao modelo já usado no ConviteIA.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Mensalidade das telas de uso próprio / Pro.
-- Reaproveita a cobrança PIX retida já usada pelo Midia.Pro no ZIP04. O
-- `purpose` próprio impede crédito em company_balance e permite conciliação
-- independente da publicidade vendida na rede.
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
    'midia_campaign'::text,
    'midia_screen_plan'::text
  ]));

alter table midia.screens
  add column if not exists billing_current_period_start timestamptz null,
  add column if not exists billing_current_period_end timestamptz null,
  add column if not exists billing_last_payment_id uuid null;

create table if not exists midia.screen_plan_payments (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references midia.screens(id) on delete cascade,
  publisher_id uuid not null references midia.publishers(id) on delete cascade,
  plan_key text not null references midia.screen_plan_catalog(plan_key) on delete restrict,
  pix_transaction_id uuid null unique references public.pix_transactions(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  provider text null,
  txid text null,
  pix_code text null,
  qr_code_url text null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','expired','failed','cancelled')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  period_start timestamptz null,
  period_end timestamptz null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end > period_start)
);

create index if not exists midia_screen_plan_payments_screen_idx
  on midia.screen_plan_payments(screen_id, created_at desc);
create index if not exists midia_screen_plan_payments_status_idx
  on midia.screen_plan_payments(status, expires_at);
create unique index if not exists midia_screen_plan_one_pending_uidx
  on midia.screen_plan_payments(screen_id)
  where status='pending';

create or replace function midia.finalize_screen_plan_payment(p_pix_transaction_id uuid)
returns table (
  screen_id uuid,
  billing_status text,
  period_end timestamptz,
  already_processed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
declare
  v_tx public.pix_transactions%rowtype;
  v_payment midia.screen_plan_payments%rowtype;
  v_screen midia.screens%rowtype;
  v_plan midia.screen_plan_catalog%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_already boolean := false;
begin
  select * into v_tx
    from public.pix_transactions
   where id=p_pix_transaction_id
   for update;
  if not found or v_tx.purpose <> 'midia_screen_plan' then raise exception 'midia_screen_plan_payment_not_found'; end if;
  if v_tx.status <> 'confirmed' then raise exception 'midia_screen_plan_payment_not_confirmed'; end if;

  select * into v_payment
    from midia.screen_plan_payments
   where pix_transaction_id=p_pix_transaction_id
   for update;

  if not found then
    begin
      select * into v_payment
        from midia.screen_plan_payments
       where id=v_tx.referencia_id::uuid
       for update;
    exception when others then
      raise exception 'midia_screen_plan_reference_invalid';
    end;
    if not found then raise exception 'midia_screen_plan_payment_not_found'; end if;
    update midia.screen_plan_payments
       set pix_transaction_id=v_tx.id,
           provider=coalesce(provider,v_tx.payment_provider,'bigcorps'),
           txid=coalesce(txid,v_tx.txid),
           pix_code=coalesce(pix_code,v_tx.pix_code),
           updated_at=now()
     where id=v_payment.id
     returning * into v_payment;
  end if;

  select * into v_screen from midia.screens where id=v_payment.screen_id for update;
  if not found or v_screen.publisher_id <> v_payment.publisher_id then raise exception 'midia_screen_plan_screen_not_found'; end if;
  select * into v_plan from midia.screen_plan_catalog where plan_key=v_payment.plan_key;
  if not found or v_payment.amount_cents <= 0 then raise exception 'midia_screen_plan_invalid'; end if;
  if v_screen.plan_key <> v_payment.plan_key then raise exception 'midia_screen_plan_changed'; end if;
  -- O preço é fotografado quando o PIX é criado. Uma alteração futura no
  -- catálogo não invalida uma cobrança que já estava em andamento.
  if v_tx.amount_cents <> v_payment.amount_cents then
    raise exception 'midia_screen_plan_amount_mismatch';
  end if;

  v_already := v_payment.status='confirmed';
  if v_already then
    return query select v_screen.id,v_screen.billing_status,v_payment.period_end,true;
    return;
  end if;

  v_start := greatest(now(),coalesce(v_screen.billing_current_period_end,now()));
  v_end := v_start + interval '1 month';

  update midia.screen_plan_payments
     set status='confirmed',confirmed_at=coalesce(confirmed_at,now()),period_start=v_start,period_end=v_end,updated_at=now()
   where id=v_payment.id;

  update midia.screens
     set billing_status='active',
         billing_current_period_start=v_start,
         billing_current_period_end=v_end,
         billing_last_payment_id=v_payment.id,
         status=case when status='draft' then 'active' else status end,
         updated_at=now()
   where id=v_screen.id
   returning * into v_screen;

  perform midia.notify_screen_playlist(v_screen.id,'screen_plan_paid');
  return query select v_screen.id,v_screen.billing_status,v_end,false;
end;
$$;

revoke all on function midia.finalize_screen_plan_payment(uuid) from public, anon, authenticated;
grant execute on function midia.finalize_screen_plan_payment(uuid) to service_role;

-- Mantém o gatilho do ZIP04 e acrescenta a mensalidade da tela sem criar um
-- segundo trigger concorrente sobre a mesma transação.
create or replace function midia.on_pix_transaction_confirmed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, midia
as $$
begin
  if new.status='confirmed' and old.status is distinct from 'confirmed' then
    if new.purpose='midia_campaign' then
      begin
        perform midia.finalize_campaign_payment(new.id);
      exception when others then
        raise warning 'Midia.Pro: falha ao finalizar campanha PIX %: %', new.id, sqlerrm;
      end;
    elsif new.purpose='midia_screen_plan' then
      begin
        perform midia.finalize_screen_plan_payment(new.id);
      exception when others then
        raise warning 'Midia.Pro: falha ao ativar plano PIX %: %', new.id, sqlerrm;
      end;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function midia.on_pix_transaction_confirmed() from public, anon, authenticated;
grant execute on function midia.on_pix_transaction_confirmed() to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Auditoria administrativa
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null,
  entity_type text not null,
  entity_id text null,
  before_data jsonb null,
  after_data jsonb null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (char_length(action) between 2 and 100),
  check (char_length(entity_type) between 2 and 80)
);

create index if not exists midia_admin_audit_created_idx
  on midia.admin_audit_log(created_at desc);
create index if not exists midia_admin_audit_entity_idx
  on midia.admin_audit_log(entity_type, entity_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Campanhas institucionais / fillers.
-- Não geram settlement, proof-of-play financeiro nem saldo de parceiro.
-- São usadas apenas dentro do inventário reservado à rede quando não existe
-- campanha paga vencendo naquele momento.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists midia.house_creatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  advertiser_label text not null default 'Midia.Pro',
  kind text not null check (kind in ('image','video')),
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  duration_seconds numeric(8,3) null check (duration_seconds is null or duration_seconds between 0 and 61),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  display_seconds integer not null default 30 check (display_seconds in (30,45,60)),
  priority integer not null default 100 check (priority between 1 and 10000),
  status text not null default 'uploading' check (status in ('uploading','ready','paused','deleted','failed')),
  starts_at timestamptz null,
  ends_at timestamptz null,
  target_inventory_classes text[] not null default array['standard','movement','premium','led']::text[],
  target_venue_types text[] null,
  created_by_user_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(name) between 2 and 140),
  check (char_length(advertiser_label) between 2 and 100),
  check (char_length(file_name) between 1 and 180),
  check (height > width),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists midia_house_creatives_status_idx
  on midia.house_creatives(status, priority desc, created_at desc);

-- Sinal global para todos os players. Evita incrementar milhares de versões de
-- tela quando apenas o catálogo institucional muda.
create or replace function midia.notify_house_playlist(p_action text default 'refresh')
returns void
language plpgsql
security definer
set search_path = pg_catalog, realtime, midia
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'action', coalesce(nullif(trim(p_action),''),'refresh'),
      'changed_at', now()
    ),
    'playlist',
    'midia-house',
    false
  );
end;
$$;

revoke all on function midia.notify_house_playlist(text) from public, anon, authenticated;
grant execute on function midia.notify_house_playlist(text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Recuperação de proof-of-play perdido.
-- A ocorrência original vira `missed` e uma substituta é agendada. O settlement
-- continua com o total ORIGINAL, portanto uma reposição nunca aumenta a receita
-- de parceiro nem o valor cobrado do anunciante.
-- ─────────────────────────────────────────────────────────────────────────────
alter table midia.campaign_occurrences
  add column if not exists recovery_of_occurrence_id uuid null references midia.campaign_occurrences(id) on delete set null,
  add column if not exists recovery_attempt smallint not null default 0 check (recovery_attempt between 0 and 5),
  add column if not exists missed_at timestamptz null,
  add column if not exists missed_reason text null;

create index if not exists midia_campaign_occurrences_recovery_idx
  on midia.campaign_occurrences(screen_id, status, window_end_at, recovery_attempt);

-- Localiza um horário de reposição dentro do horário operacional da tela.
-- Procura no máximo 7 dias, em passos de 2 minutos, evitando outro `planned_at`
-- muito próximo na mesma tela. É manutenção de baixa frequência, não caminho
-- quente de reprodução.
create or replace function midia.find_recovery_slot(
  p_screen_id uuid,
  p_not_before timestamptz default now()
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  v_tz text;
  v_start time;
  v_end time;
  v_local_from timestamp;
  v_day date;
  v_open timestamp;
  v_close timestamp;
  v_candidate timestamp;
  v_candidate_utc timestamptz;
  v_d integer;
begin
  select coalesce(l.timezone,'America/Sao_Paulo'), s.active_start_time, s.active_end_time
    into v_tz, v_start, v_end
    from midia.screens sc
    join midia.locations l on l.id=sc.location_id
    join midia.screen_ad_settings s on s.screen_id=sc.id
   where sc.id=p_screen_id;
  if not found then return null; end if;

  v_local_from := timezone(v_tz, greatest(coalesce(p_not_before,now()), now()));

  for v_d in 0..7 loop
    v_day := v_local_from::date + v_d;
    v_open := v_day + v_start;
    v_close := v_day + v_end;
    v_candidate := greatest(v_open + interval '5 minutes',
                            case when v_d=0 then v_local_from + interval '5 minutes' else v_open + interval '5 minutes' end);
    v_candidate := date_trunc('minute', v_candidate) + interval '1 minute';

    while v_candidate < v_close - interval '3 minutes' loop
      v_candidate_utc := v_candidate at time zone v_tz;
      if not exists (
        select 1
          from midia.campaign_occurrences o
         where o.screen_id=p_screen_id
           and o.status='scheduled'
           and o.planned_at between v_candidate_utc - interval '90 seconds'
                                and v_candidate_utc + interval '90 seconds'
      ) then
        return v_candidate_utc;
      end if;
      v_candidate := v_candidate + interval '2 minutes';
    end loop;
  end loop;

  return null;
end;
$$;

revoke all on function midia.find_recovery_slot(uuid,timestamptz) from public, anon, authenticated;
grant execute on function midia.find_recovery_slot(uuid,timestamptz) to service_role;

create or replace function midia.recover_missed_occurrences(
  p_screen_id uuid default null,
  p_limit integer default 25
)
returns table (
  missed_marked integer,
  replacements_created integer
)
language plpgsql
security definer
set search_path = pg_catalog, midia
as $$
declare
  r record;
  s midia.campaign_settlements%rowtype;
  v_slot timestamptz;
  v_window_end timestamptz;
  v_tz text;
  v_active_end time;
  v_local_slot timestamp;
  v_close timestamptz;
  v_missed integer := 0;
  v_created integer := 0;
  v_limit integer := least(200, greatest(1, coalesce(p_limit,25)));
begin
  for r in
    select o.*
      from midia.campaign_occurrences o
      join midia.campaigns c on c.id=o.campaign_id
     where o.status='scheduled'
       and o.window_end_at < now() - interval '2 minutes'
       and (p_screen_id is null or o.screen_id=p_screen_id)
       and c.status in ('scheduled','running')
     order by o.window_end_at
     limit v_limit
     for update of o skip locked
  loop
    update midia.campaign_occurrences
       set status='missed',
           missed_at=coalesce(missed_at,now()),
           missed_reason=coalesce(missed_reason,'window_elapsed_without_proof'),
           updated_at=now()
     where id=r.id and status='scheduled';
    if not found then continue; end if;
    v_missed := v_missed + 1;

    select * into s from midia.campaign_settlements where campaign_id=r.campaign_id;
    if not found or s.status='cancelled' or s.delivered_occurrences >= s.total_occurrences then
      continue;
    end if;
    if coalesce(r.recovery_attempt,0) >= 3 then
      continue;
    end if;

    v_slot := midia.find_recovery_slot(r.screen_id, now());
    if v_slot is null then continue; end if;

    select coalesce(l.timezone,'America/Sao_Paulo'), sas.active_end_time
      into v_tz, v_active_end
      from midia.screens sc
      join midia.locations l on l.id=sc.location_id
      join midia.screen_ad_settings sas on sas.screen_id=sc.id
     where sc.id=r.screen_id;

    v_local_slot := timezone(v_tz, v_slot);
    v_close := ((v_local_slot::date + v_active_end) at time zone v_tz);
    v_window_end := least(v_close, v_slot + interval '60 minutes');
    if v_window_end <= v_slot + interval '2 minutes' then continue; end if;

    begin
      insert into midia.campaign_occurrences(
        campaign_id,screen_id,creative_id,planned_at,window_end_at,display_seconds,
        status,recovery_of_occurrence_id,recovery_attempt
      ) values (
        r.campaign_id,r.screen_id,r.creative_id,v_slot,v_window_end,r.display_seconds,
        'scheduled',r.id,coalesce(r.recovery_attempt,0)+1
      );
      v_created := v_created + 1;
      perform midia.notify_screen_playlist(r.screen_id,'occurrence_recovered');
    exception when unique_violation then
      -- Outra sessão encontrou o mesmo slot; próxima execução tenta novamente.
      null;
    end;
  end loop;

  return query select v_missed,v_created;
end;
$$;

revoke all on function midia.recover_missed_occurrences(uuid,integer) from public, anon, authenticated;
grant execute on function midia.recover_missed_occurrences(uuid,integer) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers / updated_at / segurança
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists house_creatives_touch_updated_at on midia.house_creatives;
create trigger house_creatives_touch_updated_at
before update on midia.house_creatives
for each row execute function midia.touch_updated_at();

alter table midia.house_creatives enable row level security;
alter table midia.admin_audit_log enable row level security;

revoke all on midia.house_creatives from public, anon, authenticated;
revoke all on midia.admin_audit_log from public, anon, authenticated;
grant all on midia.house_creatives to service_role;
grant all on midia.admin_audit_log to service_role;


-- Mensalidades permanecem server-only.
drop trigger if exists screen_plan_payments_touch_updated_at on midia.screen_plan_payments;
create trigger screen_plan_payments_touch_updated_at
before update on midia.screen_plan_payments
for each row execute function midia.touch_updated_at();

alter table midia.screen_plan_payments enable row level security;
revoke all on midia.screen_plan_payments from public, anon, authenticated;
grant all on midia.screen_plan_payments to service_role;

commit;
