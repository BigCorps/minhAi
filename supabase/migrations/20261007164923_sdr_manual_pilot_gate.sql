begin;
alter table public.sdr_product_rollouts add column manual_pilot_send_enabled boolean not null default false,
 add constraint sdr_manual_pilot_gate_status check(not manual_pilot_send_enabled or (status='pilot' and not auto_outreach_enabled and not live_send_enabled));

create table public.sdr_manual_pilot_opportunities (
 product text not null references public.sdr_product_rollouts(product),
 opportunity_id uuid not null references public.sdr_opportunities(id),
 reviewed_by uuid not null,
 first_enqueued_at timestamptz not null default now(),
 primary key(product,opportunity_id)
);
alter table public.sdr_manual_pilot_opportunities enable row level security;
revoke all on public.sdr_manual_pilot_opportunities from public,anon,authenticated;
grant select,insert on public.sdr_manual_pilot_opportunities to service_role;
create policy service_role_access on public.sdr_manual_pilot_opportunities to service_role using(true) with check(true);

create function public.sdr_set_manual_pilot_gate(p_product text,p_enabled boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_catalog as $$
declare ro public.sdr_product_rollouts%rowtype;
begin
 select * into ro from public.sdr_product_rollouts where product=p_product for update;
 if ro.product is null or ro.status<>'pilot' then raise exception 'manual_gate_requires_pilot';end if;
 if p_enabled is null or (p_enabled and (ro.auto_outreach_enabled or ro.live_send_enabled or ro.daily_send_cap<1)) then raise exception 'manual_gate_requires_separate_pilot';end if;
 update public.sdr_product_rollouts set manual_pilot_send_enabled=p_enabled,updated_at=now() where product=p_product returning * into ro;
 return to_jsonb(ro);
end $$;

create function public.sdr_outreach_gate(q public.sdr_queue,ro public.sdr_product_rollouts,c public.sdr_campaigns)
returns boolean language sql stable security invoker set search_path=public,pg_catalog as $$
 select coalesce(ro.daily_send_cap>0 and (
  (q.enqueue_mode<>'manual_pilot' and ro.status='active' and ro.auto_outreach_enabled and ro.live_send_enabled)
  or (q.enqueue_mode='manual_pilot' and ro.status='pilot' and ro.manual_pilot_send_enabled
   and not ro.auto_outreach_enabled and not ro.live_send_enabled and q.channel='email' and q.step=0 and c.max_touches=1
   and q.reviewed_by is not null and q.reviewed_at is not null and q.recipient_address is not null and q.message_subject is not null and q.message_body is not null
   and exists(select 1 from public.sdr_manual_pilot_opportunities p where p.product=ro.product and p.opportunity_id=q.opportunity_id)
   and (select count(*) from public.sdr_manual_pilot_opportunities p where p.product=ro.product)<=ro.pilot_limit)
 ),false)
$$;
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
    manual_pilot_send_enabled=case when p_status='pilot' then manual_pilot_send_enabled else false end,
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

create or replace function public.sdr_enqueue_reviewed_email(p_opportunity uuid,p_snapshot jsonb,p_actor uuid)
returns uuid language plpgsql security invoker set search_path=public,pg_catalog as $$
declare o public.sdr_opportunities%rowtype;l public.sdr_leads%rowtype;c public.sdr_campaigns%rowtype;v_id uuid;v_type text;ro public.sdr_product_rollouts%rowtype;
begin
 if to_regclass('public.sdr_manual_pilot_opportunities') is null then raise exception 'manual_pilot_migration_required';end if;
 select * into strict o from public.sdr_opportunities where id=p_opportunity;
 select * into strict l from public.sdr_leads where id=o.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=o.campaign_id;
 if p_actor is null or not c.enabled or c.trial_ends_at is null or c.trial_ends_at<=now() or l.owner<>'minhai' or not l.outreach_reviewed or l.suppressed_at is not null or l.human_at is not null or l.last_inbound_at is not null or o.stage<>'new' then raise exception 'lead_not_eligible';end if;
 if nullif(trim(l.company_name),'') is null or not (regexp_replace(coalesce(l.cnpj,''),'\D','','g') ~ '^\d{14}$' or (l.source in ('econodata','hunter','apollo','web_research') and l.domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$')) then raise exception 'business_lead_required';end if;
 v_type:=o.qualification->'commercial_classification'->>'type';
 if v_type is null then raise exception 'commercial_classification_required';end if;
 if v_type='low_priority' then raise exception 'low_priority_outreach_blocked';end if;
 if p_snapshot->>'message_variant' is null or p_snapshot->>'message_variant' not in ('customer','partner') or (v_type<>'customer_or_partner' and p_snapshot->>'message_variant'<>v_type) then raise exception 'explicit_variant_required';end if;
 if p_snapshot->>'enqueue_mode' is distinct from 'manual_pilot' or nullif(p_snapshot->>'message_subject','') is null or length(p_snapshot->>'message_subject')>300 or p_snapshot->>'message_subject' ~ '[\r\n]' or nullif(p_snapshot->>'message_body','') is null or length(p_snapshot->>'message_body')>12000 then raise exception 'manual_contact_review_required';end if;
 perform public.sdr_check_recipient(o.id,p_snapshot->>'recipient_kind',p_snapshot->>'recipient_address',p_snapshot->>'recipient_source_url');
 select * into ro from public.sdr_product_rollouts where product=o.product for update;
 if ro.product is null or ro.status<>'pilot' or c.max_touches<>1 then raise exception 'manual_pilot_requires_single_touch_pilot';end if;
 -- Allocate a distinct slot at enqueue, even with the send gate closed. Never reclaim a slot silently.
 if not exists(select 1 from public.sdr_manual_pilot_opportunities where product=o.product and opportunity_id=o.id) then
  if (select count(*) from public.sdr_manual_pilot_opportunities where product=o.product)>=ro.pilot_limit then raise exception 'pilot_opportunity_limit';end if;
  insert into public.sdr_manual_pilot_opportunities(product,opportunity_id,reviewed_by) values(o.product,o.id,p_actor);
 end if;
 if exists(select 1 from public.sdr_queue where lead_id=l.id and status not in ('cancelled','blocked','failed')) then raise exception 'company_already_contacted';end if;
 insert into public.sdr_queue(opportunity_id,lead_id,campaign_id,channel,recipient_kind,recipient_address,recipient_source_url,recipient_evidence,message_variant,message_subject,message_body,enqueue_mode,reviewed_by,reviewed_at)
 values(o.id,l.id,c.id,'email',p_snapshot->>'recipient_kind',p_snapshot->>'recipient_address',p_snapshot->>'recipient_source_url',coalesce(p_snapshot->'recipient_evidence','{}'),p_snapshot->>'message_variant',p_snapshot->>'message_subject',p_snapshot->>'message_body','manual_pilot',p_actor,now()) returning id into v_id;
 return v_id;
end $$;

create or replace function public.sdr_claim()
returns setof public.sdr_queue language plpgsql security invoker set search_path=public,pg_catalog as $$
declare
 q public.sdr_queue%rowtype;c public.sdr_campaigns%rowtype;ro public.sdr_product_rollouts%rowtype;
 v_product text;v_product_count integer;
begin
 update public.sdr_queue set status='unknown',error_code='expired_send_lease' where status='sending' and lease_at<now()-interval '10 minutes';
 update public.sdr_queue set status='queued',lease_at=null where status='processing' and lease_at<now()-interval '10 minutes';
 for q in
  select x.* from public.sdr_queue x
  join public.sdr_campaigns cam on cam.id=x.campaign_id
  join public.sdr_leads l on l.id=x.lead_id
  join public.sdr_opportunities o on o.id=x.opportunity_id
  join public.sdr_product_rollouts rr on rr.product=o.product
  where x.status='queued' and x.due_at<=now() and cam.enabled and cam.trial_ends_at>now()
   and l.owner='minhai' and l.outreach_reviewed and l.suppressed_at is null and l.human_at is null and l.last_inbound_at is null
   and o.stage in ('new','contacted')
   and public.sdr_outreach_gate(x,rr,cam)
  order by x.due_at for update of x skip locked limit 3
 loop
  select * into c from public.sdr_campaigns where id=q.campaign_id for update;
  if (select count(*) from public.sdr_queue where campaign_id=c.id and
   (sent_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' or status in ('processing','sending'))) >= c.daily_limit then continue;end if;

  select product into v_product from public.sdr_opportunities where id=q.opportunity_id;
  select * into ro from public.sdr_product_rollouts where product=v_product for update;
  if ro.product is null or not public.sdr_outreach_gate(q,ro,c) then continue;end if;
  select count(*) into v_product_count
  from public.sdr_queue q2 join public.sdr_opportunities o2 on o2.id=q2.opportunity_id
  where o2.product=v_product and
   (q2.sent_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
    or q2.status in ('processing','sending'));
  if v_product_count>=ro.daily_send_cap then continue;end if;

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
 select * into strict c from public.sdr_campaigns where id=q.campaign_id for update;
 select * into strict o from public.sdr_opportunities where id=q.opportunity_id;
 select * into ro from public.sdr_product_rollouts where product=o.product for update;
 if q.status<>'processing' or not c.enabled or c.trial_ends_at<=now() or c.trial_ends_at is null
 or l.owner<>'minhai' or not l.outreach_reviewed or l.suppressed_at is not null or l.human_at is not null
 or l.last_inbound_at is not null or o.stage not in ('new','contacted')
 or ro.product is null or not public.sdr_outreach_gate(q,ro,c)
 then raise exception 'send_no_longer_eligible';end if;
 select count(*) into v_product_count
 from public.sdr_queue q2 join public.sdr_opportunities o2 on o2.id=q2.opportunity_id
 where o2.product=o.product and q2.id<>q.id and
   (q2.sent_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
    or q2.status in ('processing','sending'));
 if v_product_count>=ro.daily_send_cap then raise exception 'product_daily_limit';end if;
 if (select count(*) from public.sdr_queue where campaign_id=c.id and id<>q.id and
  (sent_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' or status in ('processing','sending')))>=c.daily_limit then raise exception 'campaign_daily_limit';end if;
 if q.channel='email' then
  if q.recipient_address is null then raise exception 'queue_recipient_required';end if;
  if q.recipient_kind='individual' and (l.email is null or lower(l.email)<>q.recipient_address or l.email_status<>'verified') then raise exception 'verified_email_required';end if;
  if q.recipient_kind='company_contact' and (q.reviewed_by is null or q.reviewed_at is null or q.recipient_source_url is null or q.recipient_evidence->>'validation' is distinct from 'web_research_company_contact') then raise exception 'manual_contact_review_required';end if;
 end if;
 if q.channel='whatsapp' and not exists(select 1 from public.sdr_consents where lead_id=l.id and channel='whatsapp' and product=o.product and address=l.phone and revoked_at is null) then raise exception 'whatsapp_optin_required';end if;
 update public.sdr_queue set status='sending',lease_at=now() where id=q.id;
end $$;


revoke all on function public.sdr_set_manual_pilot_gate(text,boolean),public.sdr_outreach_gate(public.sdr_queue,public.sdr_product_rollouts,public.sdr_campaigns) from public,anon,authenticated;
grant execute on function public.sdr_set_manual_pilot_gate(text,boolean),public.sdr_outreach_gate(public.sdr_queue,public.sdr_product_rollouts,public.sdr_campaigns) to service_role;
revoke all on function public.sdr_claim(),public.sdr_begin_send(uuid),public.sdr_enqueue_reviewed_email(uuid,jsonb,uuid),public.sdr_set_product_rollout(text,text,boolean,boolean,boolean,integer,integer) from public,anon,authenticated;
grant execute on function public.sdr_claim(),public.sdr_begin_send(uuid),public.sdr_enqueue_reviewed_email(uuid,jsonb,uuid),public.sdr_set_product_rollout(text,text,boolean,boolean,boolean,integer,integer) to service_role;
-- No seed, UPDATE or invocation enables the new gate. No existing campaign/budget is changed.
commit;
