begin;

create table if not exists public.sdr_product_rollouts (
  product text primary key check(product ~ '^[a-z0-9_]{2,60}$'),
  status text not null default 'draft' check(status in ('draft','pilot','ready','active','paused')),
  auto_discovery_enabled boolean not null default false,
  auto_outreach_enabled boolean not null default false,
  live_send_enabled boolean not null default false,
  pilot_limit integer not null default 3 check(pilot_limit between 1 and 25),
  daily_send_cap integer not null default 0 check(daily_send_cap between 0 and 100),
  config jsonb not null default '{}' check(jsonb_typeof(config)='object'),
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  check(not live_send_enabled or (status='active' and auto_outreach_enabled and daily_send_cap>0))
);

insert into public.sdr_product_rollouts(product,status,pilot_limit,daily_send_cap) values
  ('conviteia','pilot',3,3),
  ('melhoria','draft',3,3),
  ('midia','draft',3,3),
  ('artefinal','draft',3,3),
  ('consultatec','draft',3,3),
  ('funcionaria','draft',3,3),
  ('pixwiki','draft',2,2),
  ('monitoria_vip','draft',2,2)
on conflict(product) do nothing;

alter table public.sdr_product_rollouts enable row level security;
revoke all on public.sdr_product_rollouts from public,anon,authenticated;
grant select,insert,update,delete on public.sdr_product_rollouts to service_role;
drop policy if exists service_role_access on public.sdr_product_rollouts;
create policy service_role_access on public.sdr_product_rollouts to service_role using(true) with check(true);

create or replace function public.sdr_set_product_rollout(
  p_product text,p_status text,p_auto_discovery boolean,p_auto_outreach boolean,p_live_send boolean,
  p_pilot_limit integer,p_daily_send_cap integer
) returns jsonb
language plpgsql security invoker set search_path=public,pg_catalog as $$
declare r public.sdr_product_rollouts%rowtype;
begin
  if p_status is null or p_status not in ('draft','pilot','ready','active','paused') then raise exception 'invalid_rollout_status'; end if;
  if p_pilot_limit is null or p_pilot_limit not between 1 and 25 or p_daily_send_cap is null or p_daily_send_cap not between 0 and 100 then raise exception 'invalid_rollout_number'; end if;
  select * into r from public.sdr_product_rollouts where product=p_product for update;
  if not found then raise exception 'invalid_product'; end if;
  if p_auto_discovery and p_status not in ('pilot','active') then raise exception 'auto_discovery_requires_pilot_or_active'; end if;
  if p_auto_outreach and p_status<>'active' then raise exception 'auto_outreach_requires_active'; end if;
  if p_live_send and (p_status<>'active' or not p_auto_outreach or p_daily_send_cap<1) then raise exception 'live_send_requires_active_outreach'; end if;
  update public.sdr_product_rollouts set
    status=p_status,
    auto_discovery_enabled=coalesce(p_auto_discovery,false),
    auto_outreach_enabled=coalesce(p_auto_outreach,false),
    live_send_enabled=coalesce(p_live_send,false),
    pilot_limit=p_pilot_limit,
    daily_send_cap=p_daily_send_cap,
    activated_at=case when p_status='active' then coalesce(activated_at,now()) else null end,
    updated_at=now()
  where product=p_product returning * into r;
  return to_jsonb(r);
end $$;

create or replace function public.sdr_claim()
returns setof public.sdr_queue language plpgsql security invoker set search_path=public,pg_catalog as $$
declare q public.sdr_queue%rowtype;c public.sdr_campaigns%rowtype;
begin
 update public.sdr_queue set status='unknown',error_code='expired_send_lease' where status='sending' and lease_at<now()-interval '10 minutes';
 update public.sdr_queue set status='queued',lease_at=null where status='processing' and lease_at<now()-interval '10 minutes';
 for q in
  select x.* from public.sdr_queue x
  join public.sdr_campaigns cam on cam.id=x.campaign_id
  join public.sdr_leads l on l.id=x.lead_id
  join public.sdr_opportunities o on o.id=x.opportunity_id
  join public.sdr_product_rollouts ro on ro.product=o.product
  where x.status='queued' and x.due_at<=now() and cam.enabled and cam.trial_ends_at>now()
   and l.owner='minhai' and l.outreach_reviewed and l.suppressed_at is null and l.human_at is null and l.last_inbound_at is null
   and o.stage in ('new','contacted')
   and ro.status='active' and ro.auto_outreach_enabled and ro.live_send_enabled and ro.daily_send_cap>0
   and (select count(*) from public.sdr_queue q2 join public.sdr_opportunities o2 on o2.id=q2.opportunity_id
        where o2.product=o.product and (q2.sent_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
          or q2.status in ('processing','sending'))) < ro.daily_send_cap
  order by x.due_at for update of x skip locked limit 3
 loop
  select * into c from public.sdr_campaigns where id=q.campaign_id for update;
  if (select count(*) from public.sdr_queue where campaign_id=c.id and
   (sent_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' or status in ('processing','sending'))) >= c.daily_limit then continue;end if;
  update public.sdr_queue set status='processing',lease_at=now() where id=q.id returning * into q;
  return next q;
 end loop;
end $$;

create or replace function public.sdr_begin_send(p_queue uuid)
returns void language plpgsql security invoker set search_path=public,pg_catalog as $$
declare q public.sdr_queue%rowtype;l public.sdr_leads%rowtype;c public.sdr_campaigns%rowtype;o public.sdr_opportunities%rowtype;
 ro public.sdr_product_rollouts%rowtype; v_product_count integer;
begin
 select * into strict q from public.sdr_queue where id=p_queue for update;
 select * into strict l from public.sdr_leads where id=q.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=q.campaign_id;
 select * into strict o from public.sdr_opportunities where id=q.opportunity_id;
 select * into ro from public.sdr_product_rollouts where product=o.product;
 if q.status<>'processing' or not c.enabled or c.trial_ends_at<=now() or c.trial_ends_at is null
 or l.owner<>'minhai' or not l.outreach_reviewed or l.suppressed_at is not null or l.human_at is not null
 or l.last_inbound_at is not null or o.stage not in ('new','contacted')
 or ro.product is null or ro.status<>'active' or not ro.auto_outreach_enabled or not ro.live_send_enabled or ro.daily_send_cap<1
 then raise exception 'send_no_longer_eligible';end if;
 select count(*) into v_product_count
 from public.sdr_queue q2 join public.sdr_opportunities o2 on o2.id=q2.opportunity_id
 where o2.product=o.product and q2.id<>q.id and
   (q2.sent_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
    or q2.status in ('processing','sending'));
 if v_product_count>=ro.daily_send_cap then raise exception 'product_daily_limit';end if;
 if q.channel='email' and (l.email is null or l.email_status<>'verified') then raise exception 'verified_email_required';end if;
 if q.channel='whatsapp' and not exists(select 1 from public.sdr_consents where lead_id=l.id and channel='whatsapp' and product=o.product and address=l.phone and revoked_at is null) then raise exception 'whatsapp_optin_required';end if;
 update public.sdr_queue set status='sending',lease_at=now() where id=q.id;
end $$;

revoke all on function public.sdr_set_product_rollout(text,text,boolean,boolean,boolean,integer,integer) from public,anon,authenticated;
grant execute on function public.sdr_set_product_rollout(text,text,boolean,boolean,boolean,integer,integer) to service_role;
revoke all on function public.sdr_claim(), public.sdr_begin_send(uuid) from public,anon,authenticated;
grant execute on function public.sdr_claim(), public.sdr_begin_send(uuid) to service_role;

commit;
