begin;
create table if not exists public.sdr_campaigns (
 id uuid primary key default gen_random_uuid(), name text not null,
 lane text not null check(lane in ('api1','api2','api3','silva')),
 product text not null check(product in ('conviteia','melhoria','midia','artefinal','consultatec','funcionaria','pixwiki','monitoria_vip')),
 provider text check(provider in ('econodata','apollo','hunter')),
 enabled boolean not null default false, auto_discover boolean not null default false,
 filters jsonb not null default '{}', cursor jsonb not null default '{}',
 trial_ends_at timestamptz, next_search_at timestamptz,
 max_runs integer not null default 5 check(max_runs between 1 and 1000),
 daily_limit integer not null default 5 check(daily_limit between 1 and 100),
 max_touches integer not null default 1 check(max_touches between 1 and 3),
 cost_cents bigint not null default 0 check(cost_cents>=0),
 created_at timestamptz not null default now(), unique(lane,product)
);
insert into public.sdr_campaigns(name,lane,product) values
 ('API 1 · ConviteIA','api1','conviteia'),('API 1 · MelhorIA','api1','melhoria'),
 ('API 2 · Mídia.Pro','api2','midia'),('API 2 · ArteFinal','api2','artefinal'),
 ('API 3 · ConsultaTec','api3','consultatec'),('API 3 · FuncionarIA','api3','funcionaria'),
 ('Grupo Silva · PixWiki','silva','pixwiki'),('Grupo Silva · MonitorIA VIP','silva','monitoria_vip')
on conflict(lane,product) do nothing;
create table if not exists public.sdr_leads (
 id uuid primary key default gen_random_uuid(), company_name text not null,
 contact_name text, domain text, cnpj text, email text, phone text,
 owner text not null default 'minhai' check(owner in ('minhai','silva')),
 source text not null, source_ref text not null, evidence text not null,
 email_status text not null default 'unknown', outreach_reviewed boolean not null default false,
 suppressed_at timestamptz, suppression_reason text, human_at timestamptz,
 last_inbound_at timestamptz, last_contact_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sdr_lead_keys(key text primary key,lead_id uuid not null references public.sdr_leads on delete cascade);
create index if not exists sdr_lead_keys_lead_idx on public.sdr_lead_keys(lead_id);
create table if not exists public.sdr_sources (
 id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.sdr_leads,
 provider text not null, source_ref text not null, campaign_id uuid references public.sdr_campaigns,
 observed_at timestamptz not null default now(), evidence text not null, unique(provider,source_ref,campaign_id)
);
create table if not exists public.sdr_opportunities (
 id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.sdr_leads,
 campaign_id uuid not null references public.sdr_campaigns, product text not null,
 stage text not null default 'new' check(stage in ('new','contacted','replied','qualified','meeting','proposal','paid','won','lost')),
 qualification jsonb not null default '{}', score integer not null default 0 check(score between 0 and 100),
 match_reason text not null, user_id uuid, external_ref text,
 estimated_cents bigint not null default 0 check(estimated_cents>=0), paid_cents bigint not null default 0 check(paid_cents>=0),
 activated_at timestamptz, linked_at timestamptz, closed_at timestamptz,
 created_at timestamptz not null default now(), unique(lead_id,product)
);
create unique index if not exists sdr_opportunities_user_product_idx on public.sdr_opportunities(user_id,product) where user_id is not null;
create unique index if not exists sdr_opportunities_external_product_idx on public.sdr_opportunities(external_ref,product) where external_ref is not null;
create index if not exists sdr_opportunities_campaign_idx on public.sdr_opportunities(campaign_id);
create table if not exists public.sdr_consents (
 id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.sdr_leads,
 channel text not null check(channel in ('whatsapp','email')), address text not null, product text not null,
 granted_at timestamptz not null default now(), revoked_at timestamptz, evidence text not null, version text not null default 'sdr-v1'
);
create index if not exists sdr_consents_lead_idx on public.sdr_consents(lead_id,channel,product);
create table if not exists public.sdr_runs (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.sdr_campaigns,
 provider text not null, status text not null default 'running', request_fingerprint text not null,
 credits_reserved numeric not null default 0, credits_charged numeric,
 imported integer not null default 0, duplicates integer not null default 0, error_code text,
 created_at timestamptz not null default now(), finished_at timestamptz
);
create index if not exists sdr_runs_campaign_idx on public.sdr_runs(campaign_id,created_at);
create table if not exists public.sdr_templates (
 product text primary key, name text not null unique, language text not null default 'pt_BR', body text not null,
 meta_id text,status text not null default 'DRAFT',category text not null default 'MARKETING' check(category='MARKETING'),
 synced_at timestamptz,submitted_at timestamptz
);
create table if not exists public.sdr_queue (
 id uuid primary key default gen_random_uuid(), opportunity_id uuid not null references public.sdr_opportunities,
 lead_id uuid not null references public.sdr_leads,campaign_id uuid not null references public.sdr_campaigns,
 channel text not null check(channel in ('email','whatsapp')),step integer not null default 0 check(step between 0 and 2),
 status text not null default 'queued' check(status in ('queued','processing','sending','sent','blocked','failed','unknown','cancelled')),
 due_at timestamptz not null default now(),lease_at timestamptz,provider_id text,thread_id text,error_code text,sent_at timestamptz,
 created_at timestamptz not null default now(),unique(opportunity_id,channel,step)
);
create index if not exists sdr_queue_due_idx on public.sdr_queue(status,due_at);
create index if not exists sdr_queue_campaign_idx on public.sdr_queue(campaign_id,sent_at);
create index if not exists sdr_queue_lead_idx on public.sdr_queue(lead_id);
create table if not exists public.sdr_events (
 id uuid primary key default gen_random_uuid(),lead_id uuid references public.sdr_leads,opportunity_id uuid references public.sdr_opportunities,
 event_type text not null,event_key text unique,actor text not null,detail jsonb not null default '{}',created_at timestamptz not null default now()
);
create index if not exists sdr_events_opportunity_idx on public.sdr_events(opportunity_id,created_at);
create table if not exists public.sdr_payments (
 event_id text primary key,opportunity_id uuid not null references public.sdr_opportunities,
 amount_cents bigint not null check(amount_cents>0),paid_at timestamptz not null,source text not null,created_at timestamptz not null default now()
);
create table if not exists public.sdr_provider_budgets (
 provider text primary key check(provider in ('econodata','apollo','hunter')),
 limit_units numeric not null default 0 check(limit_units>=0),used_units numeric not null default 0 check(used_units>=0),
 expires_at timestamptz,enabled boolean not null default false
);
insert into public.sdr_provider_budgets(provider) values('econodata'),('apollo'),('hunter') on conflict do nothing;

-- Serial ingestion preserves one company/contact even with simultaneous providers.
create or replace function public.sdr_import_lead(p_lead jsonb,p_campaign uuid,p_keys text[])
returns uuid language plpgsql security invoker set search_path=public,pg_catalog as $$
declare v_id uuid;v_ids uuid[];c public.sdr_campaigns%rowtype;
begin
 if coalesce(array_length(p_keys,1),0)=0 then raise exception 'missing_identity';end if;
 lock table public.sdr_lead_keys in share row exclusive mode;
 select * into strict c from public.sdr_campaigns where id=p_campaign;
 select array_agg(distinct lead_id) into v_ids from public.sdr_lead_keys where key=any(p_keys);
 if array_length(v_ids,1)>1 then raise exception 'identity_conflict';end if;
 v_id:=v_ids[1];
 if v_id is null then
  insert into public.sdr_leads(company_name,contact_name,domain,cnpj,email,phone,owner,source,source_ref,evidence,email_status)
  values(p_lead->>'company_name',p_lead->>'contact_name',p_lead->>'domain',p_lead->>'cnpj',p_lead->>'email',p_lead->>'phone',
   case when c.lane='silva' then 'silva' else 'minhai' end,p_lead->>'source',p_lead->>'source_ref',p_lead->>'evidence',coalesce(p_lead->>'email_status','unknown')) returning id into v_id;
 end if;
 insert into public.sdr_lead_keys(key,lead_id) select k,v_id from unnest(p_keys) k on conflict do nothing;
 insert into public.sdr_sources(lead_id,provider,source_ref,campaign_id,evidence)
 values(v_id,p_lead->>'source',p_lead->>'source_ref',p_campaign,p_lead->>'evidence') on conflict do nothing;
 insert into public.sdr_opportunities(lead_id,campaign_id,product,match_reason)
 values(v_id,p_campaign,c.product,p_lead->>'evidence') on conflict(lead_id,product) do nothing;
 return v_id;
end $$;
create or replace function public.sdr_reserve_run(p_campaign uuid,p_units numeric,p_fingerprint text)
returns uuid language plpgsql security invoker set search_path=public,pg_catalog as $$
declare c public.sdr_campaigns%rowtype;b public.sdr_provider_budgets%rowtype;v_id uuid;
begin
 select * into strict c from public.sdr_campaigns where id=p_campaign for update;
 if c.provider is null or c.lane='silva' then raise exception 'provider_missing';end if;
 if c.trial_ends_at is null or c.trial_ends_at<=now() then raise exception 'trial_not_active';end if;
 if exists(select 1 from public.sdr_runs where campaign_id=c.id and status='running') then raise exception 'search_running';end if;
 if (select count(*) from public.sdr_runs where campaign_id=c.id)>=c.max_runs then raise exception 'run_limit';end if;
 select * into strict b from public.sdr_provider_budgets where provider=c.provider for update;
 if not b.enabled or b.expires_at is null or b.expires_at<=now() or p_units<0 or b.used_units+p_units>b.limit_units then raise exception 'provider_budget';end if;
 update public.sdr_provider_budgets set used_units=used_units+p_units where provider=c.provider;
 insert into public.sdr_runs(campaign_id,provider,request_fingerprint,credits_reserved) values(c.id,c.provider,p_fingerprint,p_units) returning id into v_id;
 update public.sdr_campaigns set next_search_at=now()+interval '1 day' where id=c.id;
 return v_id;
end $$;
create or replace function public.sdr_stop(p_lead uuid,p_reason text,p_suppress boolean default false)
returns void language plpgsql security invoker set search_path=public,pg_catalog as $$
begin
 update public.sdr_leads set human_at=case when p_suppress then human_at else now() end,
 suppressed_at=case when p_suppress then now() else suppressed_at end,
 suppression_reason=case when p_suppress then p_reason else suppression_reason end,updated_at=now() where id=p_lead;
 update public.sdr_queue set status='cancelled',error_code=p_reason where lead_id=p_lead and status in ('queued','processing');
 if p_suppress then update public.sdr_consents set revoked_at=now() where lead_id=p_lead and revoked_at is null;end if;
 insert into public.sdr_events(lead_id,event_type,actor,detail) values(p_lead,case when p_suppress then 'optout' else 'handoff' end,'system',jsonb_build_object('reason',p_reason));
end $$;
create or replace function public.sdr_enqueue(p_opportunity uuid,p_channel text)
returns uuid language plpgsql security invoker set search_path=public,pg_catalog as $$
declare o public.sdr_opportunities%rowtype;l public.sdr_leads%rowtype;c public.sdr_campaigns%rowtype;v_id uuid;
begin
 select * into strict o from public.sdr_opportunities where id=p_opportunity;
 select * into strict l from public.sdr_leads where id=o.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=o.campaign_id;
 if not c.enabled or c.lane='silva' or l.owner<>'minhai' or not l.outreach_reviewed or l.suppressed_at is not null or l.human_at is not null or o.stage<>'new' then raise exception 'lead_not_eligible';end if;
 if p_channel not in ('email','whatsapp') then raise exception 'channel_invalid';end if;
 if exists(select 1 from public.sdr_queue where lead_id=l.id and status not in ('cancelled','blocked','failed')) then raise exception 'company_already_contacted';end if;
 if p_channel='whatsapp' and not exists(select 1 from public.sdr_consents where lead_id=l.id and channel='whatsapp' and product=o.product and address=l.phone and revoked_at is null) then raise exception 'whatsapp_optin_required';end if;
 if p_channel='email' and (l.email is null or l.email_status<>'verified') then raise exception 'verified_email_required';end if;
 insert into public.sdr_queue(opportunity_id,lead_id,campaign_id,channel) values(o.id,l.id,c.id,p_channel) returning id into v_id;
 return v_id;
end $$;
create or replace function public.sdr_claim()
returns setof public.sdr_queue language plpgsql security invoker set search_path=public,pg_catalog as $$
declare q public.sdr_queue%rowtype;c public.sdr_campaigns%rowtype;
begin
 update public.sdr_queue set status='unknown',error_code='expired_send_lease' where status='sending' and lease_at<now()-interval '10 minutes';
 update public.sdr_queue set status='queued',lease_at=null where status='processing' and lease_at<now()-interval '10 minutes';
 for q in select x.* from public.sdr_queue x join public.sdr_campaigns cam on cam.id=x.campaign_id
 join public.sdr_leads l on l.id=x.lead_id join public.sdr_opportunities o on o.id=x.opportunity_id
 where x.status='queued' and x.due_at<=now() and cam.enabled and cam.lane<>'silva' and cam.trial_ends_at>now()
 and l.owner='minhai' and l.outreach_reviewed and l.suppressed_at is null and l.human_at is null and l.last_inbound_at is null
 and o.stage in ('new','contacted') order by x.due_at for update of x skip locked limit 3
 loop
  select * into c from public.sdr_campaigns where id=q.campaign_id for update;
  if (select count(*) from public.sdr_queue where campaign_id=c.id and
   (sent_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' or status in ('processing','sending'))) >= c.daily_limit then continue;end if;
  update public.sdr_queue set status='processing',lease_at=now() where id=q.id returning * into q;
  return next q;
 end loop;
end $$;
create or replace function public.sdr_inbound_thread()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare l record;t text;
begin
 if new.last_inbound_at is null then return new;end if;
 if tg_op='UPDATE' and new.last_inbound_at is not distinct from old.last_inbound_at then return new;end if;
 t:=lower(trim(coalesce(new.last_message_text,'')));
 for l in select id from public.sdr_leads where phone=new.from_id loop
  update public.sdr_leads set last_inbound_at=new.last_inbound_at where id=l.id;
  perform public.sdr_stop(l.id,case when t ~ '^(sair|parar|pare|cancelar|stop|remover|não quero|nao quero)' then 'whatsapp_optout' else 'whatsapp_reply' end,
   t ~ '^(sair|parar|pare|cancelar|stop|remover|não quero|nao quero)');
  update public.sdr_opportunities set stage='replied' where lead_id=l.id and stage in ('new','contacted');
 end loop;
 return new;
end $$;
drop trigger if exists sdr_inbound_thread on public.bigcorps_whatsapp_threads;
create trigger sdr_inbound_thread after insert or update of last_inbound_at on public.bigcorps_whatsapp_threads for each row execute function public.sdr_inbound_thread();
create or replace function public.sdr_human_takeover()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare l record;
begin
 if new.platform='whatsapp' and (new.is_paused or not new.ai_enabled) then
  for l in select id from public.sdr_leads where phone=new.conversation_id loop perform public.sdr_stop(l.id,'human_takeover',false);end loop;
 end if;
 return new;
end $$;
drop trigger if exists sdr_human_takeover on public.conversation_ai_control;
create trigger sdr_human_takeover after update of is_paused,ai_enabled on public.conversation_ai_control for each row execute function public.sdr_human_takeover();
create or replace function public.sdr_reserve_units(p_provider text,p_units numeric)
returns void language plpgsql security invoker set search_path=public,pg_catalog as $$
declare b public.sdr_provider_budgets%rowtype;
begin
 select * into strict b from public.sdr_provider_budgets where provider=p_provider for update;
 if not b.enabled or b.expires_at is null or b.expires_at<=now() or p_units<=0 or b.used_units+p_units>b.limit_units then raise exception 'provider_budget';end if;
 update public.sdr_provider_budgets set used_units=used_units+p_units where provider=p_provider;
end $$;
create or replace function public.sdr_begin_send(p_queue uuid)
returns void language plpgsql security invoker set search_path=public,pg_catalog as $$
declare q public.sdr_queue%rowtype;l public.sdr_leads%rowtype;c public.sdr_campaigns%rowtype;o public.sdr_opportunities%rowtype;
begin
 select * into strict q from public.sdr_queue where id=p_queue for update;
 select * into strict l from public.sdr_leads where id=q.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=q.campaign_id;
 select * into strict o from public.sdr_opportunities where id=q.opportunity_id;
 if q.status<>'processing' or not c.enabled or c.trial_ends_at<=now() or c.trial_ends_at is null
 or c.lane='silva' or l.owner<>'minhai' or not l.outreach_reviewed or l.suppressed_at is not null or l.human_at is not null
 or l.last_inbound_at is not null or o.stage not in ('new','contacted') then raise exception 'send_no_longer_eligible';end if;
 if q.channel='email' and (l.email is null or l.email_status<>'verified') then raise exception 'verified_email_required';end if;
 if q.channel='whatsapp' and not exists(select 1 from public.sdr_consents where lead_id=l.id and channel='whatsapp' and product=o.product and address=l.phone and revoked_at is null) then raise exception 'whatsapp_optin_required';end if;
 update public.sdr_queue set status='sending',lease_at=now() where id=q.id;
end $$;
create or replace function public.sdr_refresh_sales()
returns void language plpgsql security invoker set search_path=public,pg_catalog as $$
begin
 update public.sdr_opportunities o set paid_cents=0,stage='proposal',closed_at=null
 where o.paid_cents>0 and not exists(select 1 from public.sdr_payments p where p.opportunity_id=o.id);
 update public.sdr_opportunities o set paid_cents=s.amount,
 stage=case when o.activated_at is not null then 'won' else 'paid' end,
 closed_at=case when o.activated_at is not null then coalesce(o.closed_at,now()) else null end
 from (select opportunity_id,sum(amount_cents) as amount from public.sdr_payments group by opportunity_id) s where o.id=s.opportunity_id;
end $$;
create or replace function public.sdr_reconcile_payments()
returns integer language plpgsql security invoker set search_path=public,pg_catalog as $$
declare n integer;recipient record;
begin
 insert into public.sdr_payments(event_id,opportunity_id,amount_cents,paid_at,source)
 select r.event_id,o.id,r.amount_cents,r.paid_at,r.source
 from public.platform_revenue_events(now()-interval '90 days',null) r
 join public.sdr_opportunities o on o.user_id=r.user_id and o.product=r.product_key
 where r.status_group='paid' and r.amount_cents>0 and r.paid_at>=o.linked_at
 and o.linked_at is not null and r.kind<>'taxa de presente'
 on conflict(event_id) do nothing;
 get diagnostics n=row_count;
 for recipient in select distinct o.lead_id from public.sdr_opportunities o join public.sdr_payments p on p.opportunity_id=o.id
 join public.sdr_leads l on l.id=o.lead_id where l.human_at is null loop
 perform public.sdr_stop(recipient.lead_id,'payment_confirmed',false);
 end loop;
 -- Financial source updates (refund/cancel) remove the old positive attribution.
 delete from public.sdr_payments p using public.platform_revenue_events(now()-interval '90 days',null) r
 where p.event_id=r.event_id and r.status_group<>'paid';
 update public.sdr_opportunities o set paid_cents=0,stage='proposal',closed_at=null
 where o.paid_cents>0 and not exists(select 1 from public.sdr_payments p where p.opportunity_id=o.id);
 perform public.sdr_refresh_sales();return n;
end $$;
create or replace function public.sdr_metrics()
returns jsonb language sql stable security invoker set search_path=public,pg_catalog as $$
select coalesce(jsonb_agg(x),'[]') from (
 select c.id,c.name,c.provider,c.lane,c.product,c.cost_cents,
 (select count(*) from public.sdr_opportunities o where o.campaign_id=c.id) as leads,
 (select count(*) from public.sdr_opportunities o join public.sdr_leads l on l.id=o.lead_id where o.campaign_id=c.id and l.email_status='verified') as verified,
 (select count(distinct lead_id) from public.sdr_queue q where q.campaign_id=c.id and q.status='sent') as contacted,
 (select count(*) from public.sdr_opportunities o join public.sdr_leads l on l.id=o.lead_id where o.campaign_id=c.id and l.last_inbound_at is not null) as replied,
 (select count(*) from public.sdr_opportunities o where o.campaign_id=c.id and o.score>=60) as qualified,
 (select count(*) from public.sdr_opportunities o where o.campaign_id=c.id and o.stage='won') as won,
 (select coalesce(sum(o.paid_cents),0) from public.sdr_opportunities o where o.campaign_id=c.id) as revenue_cents,
 (select coalesce(sum(r.credits_reserved),0) from public.sdr_runs r where r.campaign_id=c.id) as reserved_units,
 (select coalesce(sum(r.credits_charged),0) from public.sdr_runs r where r.campaign_id=c.id) as known_charged_units
 from public.sdr_campaigns c order by c.lane,c.product
) x;
$$;
create or replace function public.sdr_whatsapp_last_inbound(p_phone text,p_page text)
returns timestamptz language sql stable security invoker set search_path=public,pg_catalog as $$
 select max(ts) from (
 select t.last_inbound_at as ts from public.bigcorps_whatsapp_threads t where t.from_id=p_phone and t.page_id=p_page
 union all
 select m.created_at from public.messages m join public.conversations c on c.id=m.conversation_id
 where c.meta_from_id=p_phone and c.meta_page_id=p_page and c.meta_platform='whatsapp' and m.role='user'
 ) x where ts<=now();
$$;
-- Catch dedicated sales numbers as well as the shared inbox.
create or replace function public.sdr_inbound_message()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare c record;l record;t text;
begin
 if new.role<>'user' then return new;end if;
 select meta_from_id,meta_platform,meta_page_id into c from public.conversations where id=new.conversation_id;
 if c.meta_platform<>'whatsapp' then return new;end if;
 t:=lower(trim(coalesce(new.content,'')));
 for l in select id from public.sdr_leads where phone=c.meta_from_id loop
 update public.sdr_leads set last_inbound_at=new.created_at where id=l.id;
 perform public.sdr_stop(l.id,'whatsapp_reply',t ~ '^(sair|parar|pare|cancelar|stop|remover|não quero|nao quero)');
 update public.sdr_opportunities set stage='replied' where lead_id=l.id and stage in ('new','contacted');
 end loop;
 return new;
end $$;
drop trigger if exists sdr_inbound_message on public.messages;
create trigger sdr_inbound_message after insert on public.messages for each row execute function public.sdr_inbound_message();
do $$ declare t text;f record;begin
 foreach t in array array['sdr_campaigns','sdr_leads','sdr_lead_keys','sdr_sources','sdr_opportunities','sdr_consents','sdr_runs','sdr_templates','sdr_queue','sdr_events','sdr_payments','sdr_provider_budgets'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'sdr_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
-- MRR: paid recurring contracts only. Complimentary entitlements are untouched.
create or replace function public.platform_active_subscriptions()
returns table(
  product_key text,
  user_id uuid,
  monthly_value_cents bigint,
  period_end timestamptz,
  status text
)
language sql
stable
security definer
set search_path='public','auth','conviteria','pg_catalog'
as $$
  select
    'minhai', uc.user_id,
    last_paid.amount_cents::bigint,
    uc.plan_expires_at,
    'active'
  from public.user_credits uc
  left join public.credits_packages cp on cp.id = uc.active_plan_id
  join lateral (
    select p.amount_cents from public.pix_payments p
    where p.user_id=uc.user_id and p.package_id=uc.active_plan_id
      and lower(p.status) in ('paid','pago','approved','confirmed','processed')
      and p.paid_at is not null and p.amount_cents>0
      and p.paid_at >= uc.plan_expires_at - interval '32 days'
    order by p.paid_at desc limit 1
  ) last_paid on true
  where cp.package_type='monthly' and uc.has_active_plan is true
    and uc.plan_expires_at is not null
    and uc.plan_expires_at > now()

  union all

  select 'pixwiki', b.user_id,
    round(i.base_price_cents::numeric / case when b.billing_interval='annual' then 12 else 1 end)::bigint,
    b.current_period_end::timestamptz,b.status
  from public.pixwiki_v2_billing_accounts b
  join public.pixwiki_invoices i on i.id=b.last_paid_invoice_id and i.user_id=b.user_id
  where not b.complimentary and b.plan<>'free' and b.status in ('active','grace')
    and b.current_period_end > current_date and i.invoice_type='base'
    and i.status in ('paid','pago','approved','confirmed','processed') and i.paid_at is not null
    and i.base_price_cents>0

  union all

  select
    'funcionaria', fs.user_id,
    coalesce((
      select sum(sc.monthly_price_cents)::bigint
      from unnest(coalesce(fs.current_skill_keys,array[]::text[])) k(skill_key)
      join public.funcionaria_skill_catalog sc on sc.skill_key = k.skill_key
      where sc.is_active is true
    ),0)::bigint,
    fs.current_period_end,
    coalesce(fs.status,'active')
  from public.funcionaria_subscriptions fs
  join public.funcionaria_invoices fi on fi.id=fs.last_paid_invoice_id and fi.user_id=fs.user_id
    and fi.status in ('paid','pago','approved','confirmed','processed') and fi.paid_at is not null and fi.amount_cents>0
  where lower(coalesce(fs.status,'')) in ('active','paid','grace')
    and (fs.current_period_end is null or fs.current_period_end > now())

  union all

  select
    'conviteia', cc.user_id,
    coalesce(last_paid.valor_centavos,0)::bigint,
    cc.plano_expira_em,
    'active'
  from conviteria.contas cc
  left join lateral (
    select cm.valor_centavos
    from conviteria.mensalidades cm
    where cm.conta_id = cc.id
      and lower(coalesce(cm.status,'')) in ('pago','paid','approved')
    order by coalesce(cm.pago_em,cm.created_at) desc
    limit 1
  ) last_paid on true
  where last_paid.valor_centavos>0 and cc.plano_expira_em is not null
    and cc.plano_expira_em > now()

  union all

  select
    'midia',
    mp.user_id,
    coalesce(pc.monthly_price_cents,0)::bigint,
    ms.billing_current_period_end,
    'active'
  from midia.screens ms
  join midia.publishers mp on mp.id = ms.publisher_id
  join midia.screen_plan_catalog pc on pc.plan_key = ms.plan_key
  where coalesce(pc.monthly_price_cents,0) > 0
    and ms.billing_status = 'active'
    and exists(select 1 from midia.screen_plan_payments p where p.screen_id=ms.id
      and p.status in ('paid','pago','approved','confirmed','processed') and p.amount_cents>0
      and p.confirmed_at >= ms.billing_current_period_end - interval '32 days')
    and (ms.billing_current_period_end is null or ms.billing_current_period_end > now())

  union all

  select
    'desafia',
    owner_user.user_id,
    coalesce(last_paid.amount_cents,0)::bigint,
    ds.current_period_end,
    coalesce(ds.status,'active')
  from desafia.subscriptions ds
  join lateral (
    select fm.user_id
    from desafia.family_members fm
    where fm.family_id = ds.family_id
      and fm.user_id is not null
    order by case when fm.role='owner' then 0 else 1 end, fm.created_at
    limit 1
  ) owner_user on true
  left join lateral (
    select bi.amount_cents
    from desafia.billing_invoices bi
    where bi.family_id = ds.family_id
      and lower(coalesce(bi.status,'')) in ('paid','pago','approved','confirmed','processed')
    order by coalesce(bi.paid_at,bi.updated_at,bi.created_at) desc
    limit 1
  ) last_paid on true
  where last_paid.amount_cents>0 and lower(coalesce(ds.status,'')) in ('active','paid','grace')
    and (ds.current_period_end is null or ds.current_period_end > now())
$$;
revoke all on function public.platform_active_subscriptions() from public,anon,authenticated;
grant execute on function public.platform_active_subscriptions() to service_role;
commit;
