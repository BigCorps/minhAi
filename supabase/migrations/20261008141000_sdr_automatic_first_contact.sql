begin;

-- Automatic first contact remains email-only and single-touch. It never depends on
-- Gmail read scopes and never schedules follow-ups.
create or replace function public.sdr_automatic_queue_valid(q public.sdr_queue)
returns boolean
language sql stable security invoker set search_path=public,pg_catalog as $$
  select coalesce(
    q.enqueue_mode='automatic'
    and q.channel='email'
    and q.step=0
    and q.recipient_address is not null
    and q.message_subject is not null
    and q.message_body is not null
    and q.recipient_evidence->>'automation_policy'='first_contact_v1'
    and (
      q.recipient_kind='individual'
      or (
        q.recipient_kind='company_contact'
        and q.recipient_source_url is not null
        and q.recipient_evidence->>'validation'='web_research_company_contact'
      )
    ),
    false
  )
$$;

create or replace function public.sdr_queue_snapshot_guard()
returns trigger language plpgsql security invoker set search_path=public,pg_catalog as $$
declare l public.sdr_leads%rowtype;v_type text;
begin
 if tg_op='UPDATE' then
  if row(new.opportunity_id,new.lead_id,new.campaign_id,new.channel,new.step,new.recipient_kind,new.recipient_address,new.recipient_source_url,new.recipient_evidence,new.message_variant,new.message_subject,new.message_body,new.enqueue_mode,new.reviewed_by,new.reviewed_at)
   is distinct from row(old.opportunity_id,old.lead_id,old.campaign_id,old.channel,old.step,old.recipient_kind,old.recipient_address,old.recipient_source_url,old.recipient_evidence,old.message_variant,old.message_subject,old.message_body,old.enqueue_mode,old.reviewed_by,old.reviewed_at)
  then raise exception 'queue_snapshot_immutable';end if;
 elsif new.channel='email' then
  if new.recipient_address is null and new.recipient_kind='individual' and new.enqueue_mode='automatic' then
   select * into strict l from public.sdr_leads where id=new.lead_id;
   new.recipient_address:=lower(l.email);
   select qualification->'commercial_classification'->>'type' into v_type from public.sdr_opportunities where id=new.opportunity_id;
   if v_type='low_priority' then raise exception 'low_priority_outreach_blocked';end if;
   if v_type='customer_or_partner' then raise exception 'explicit_variant_required';end if;
   if v_type='partner' then new.message_variant:='partner';end if;
  end if;

  perform public.sdr_check_recipient(new.opportunity_id,new.recipient_kind,new.recipient_address,new.recipient_source_url);

  if new.enqueue_mode='automatic' then
    if not public.sdr_automatic_queue_valid(new) then raise exception 'automatic_snapshot_required';end if;
  elsif new.recipient_kind='company_contact' and (
    new.reviewed_by is null or new.reviewed_at is null
    or new.message_subject is null or new.message_body is null
    or new.recipient_evidence->>'validation' is distinct from 'web_research_company_contact'
  ) then
    raise exception 'manual_contact_review_required';
  end if;
 end if;
 return new;
end $$;

create or replace function public.sdr_enqueue_automatic_email(p_opportunity uuid,p_snapshot jsonb)
returns uuid
language plpgsql security invoker set search_path=public,pg_catalog as $$
declare
 o public.sdr_opportunities%rowtype;
 l public.sdr_leads%rowtype;
 c public.sdr_campaigns%rowtype;
 ro public.sdr_product_rollouts%rowtype;
 v_type text;
 v_id uuid;
 v_campaign_count integer;
 v_product_count integer;
 v_day_start timestamptz;
begin
 select * into strict o from public.sdr_opportunities where id=p_opportunity;
 select * into strict l from public.sdr_leads where id=o.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=o.campaign_id for update;
 select * into ro from public.sdr_product_rollouts where product=o.product for update;

 if ro.product is null or ro.status<>'active' or not ro.auto_outreach_enabled or not ro.live_send_enabled or ro.daily_send_cap<1
 then raise exception 'automatic_outreach_not_active';end if;
 if not c.enabled or c.trial_ends_at is null or c.trial_ends_at<=now() or c.max_touches<>1
 then raise exception 'automatic_first_contact_requires_single_touch';end if;
 if l.owner<>'minhai' or l.suppressed_at is not null or l.human_at is not null or l.last_inbound_at is not null
 or o.stage<>'new' or l.last_contact_at is not null
 then raise exception 'lead_not_eligible';end if;
 if nullif(trim(l.company_name),'') is null or not (
   regexp_replace(coalesce(l.cnpj,''),'\D','','g') ~ '^\d{14}$'
   or (l.source in ('econodata','hunter','apollo','web_research') and l.domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$')
 ) then raise exception 'business_lead_required';end if;

 v_type:=o.qualification->'commercial_classification'->>'type';
 if v_type not in ('customer','partner') then
   if v_type='low_priority' then raise exception 'low_priority_outreach_blocked';end if;
   if v_type='customer_or_partner' then raise exception 'explicit_variant_required';end if;
   raise exception 'commercial_classification_required';
 end if;

 if p_snapshot->>'enqueue_mode' is distinct from 'automatic'
 or p_snapshot->>'message_variant' is distinct from v_type
 or nullif(p_snapshot->>'message_subject','') is null
 or length(p_snapshot->>'message_subject')>300
 or p_snapshot->>'message_subject' ~ '[\r\n]'
 or nullif(p_snapshot->>'message_body','') is null
 or length(p_snapshot->>'message_body')>12000
 or p_snapshot->'recipient_evidence'->>'automation_policy' is distinct from 'first_contact_v1'
 then raise exception 'automatic_snapshot_required';end if;

 perform public.sdr_check_recipient(
   o.id,
   p_snapshot->>'recipient_kind',
   p_snapshot->>'recipient_address',
   p_snapshot->>'recipient_source_url'
 );

 if exists(
   select 1 from public.sdr_queue
   where lead_id=l.id and status not in ('cancelled','blocked','failed')
 ) then raise exception 'company_already_contacted';end if;

 v_day_start:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';

 select count(*) into v_campaign_count
 from public.sdr_queue
 where campaign_id=c.id
 and (
   status in ('queued','processing','sending')
   or (status='sent' and sent_at>=v_day_start)
 );
 if v_campaign_count>=c.daily_limit then raise exception 'campaign_daily_limit';end if;

 select count(*) into v_product_count
 from public.sdr_queue q2
 join public.sdr_opportunities o2 on o2.id=q2.opportunity_id
 where o2.product=o.product
 and (
   q2.status in ('queued','processing','sending')
   or (q2.status='sent' and q2.sent_at>=v_day_start)
 );
 if v_product_count>=ro.daily_send_cap then raise exception 'product_daily_limit';end if;

 insert into public.sdr_queue(
   opportunity_id,lead_id,campaign_id,channel,step,
   recipient_kind,recipient_address,recipient_source_url,recipient_evidence,
   message_variant,message_subject,message_body,enqueue_mode
 )
 values(
   o.id,l.id,c.id,'email',0,
   p_snapshot->>'recipient_kind',lower(p_snapshot->>'recipient_address'),p_snapshot->>'recipient_source_url',
   coalesce(p_snapshot->'recipient_evidence','{}'::jsonb),
   p_snapshot->>'message_variant',p_snapshot->>'message_subject',p_snapshot->>'message_body','automatic'
 )
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.sdr_outreach_gate(q public.sdr_queue,ro public.sdr_product_rollouts,c public.sdr_campaigns)
returns boolean language sql stable security invoker set search_path=public,pg_catalog as $$
 select coalesce(ro.daily_send_cap>0 and (
  (ro.status='active' and ro.auto_outreach_enabled and ro.live_send_enabled and (
   (public.sdr_automatic_queue_valid(q) and c.max_touches=1)
   or (q.enqueue_mode='manual_review' and q.channel='email'
    and q.reviewed_by is not null and q.reviewed_at is not null and q.recipient_address is not null
    and q.message_subject is not null and q.message_body is not null)))
  or (q.enqueue_mode='manual_pilot' and ro.status='pilot' and ro.manual_pilot_send_enabled
   and not ro.auto_outreach_enabled and not ro.live_send_enabled and q.channel='email' and q.step=0 and c.max_touches=1
   and q.reviewed_by is not null and q.reviewed_at is not null and q.recipient_address is not null and q.message_subject is not null and q.message_body is not null
   and exists(select 1 from public.sdr_manual_pilot_opportunities p where p.product=ro.product and p.opportunity_id=q.opportunity_id)
   and (select count(*) from public.sdr_manual_pilot_opportunities p where p.product=ro.product)<=ro.pilot_limit)
 ),false)
$$;

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
   and l.owner='minhai'
   and (l.outreach_reviewed or public.sdr_automatic_queue_valid(x))
   and l.suppressed_at is null and l.human_at is null and l.last_inbound_at is null
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
declare
 q public.sdr_queue%rowtype;l public.sdr_leads%rowtype;c public.sdr_campaigns%rowtype;o public.sdr_opportunities%rowtype;
 ro public.sdr_product_rollouts%rowtype; v_product_count integer;
begin
 select * into strict q from public.sdr_queue where id=p_queue for update;
 select * into strict l from public.sdr_leads where id=q.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=q.campaign_id for update;
 select * into strict o from public.sdr_opportunities where id=q.opportunity_id;
 select * into ro from public.sdr_product_rollouts where product=o.product for update;
 if q.status<>'processing' or not c.enabled or c.trial_ends_at<=now() or c.trial_ends_at is null
 or l.owner<>'minhai'
 or not (l.outreach_reviewed or public.sdr_automatic_queue_valid(q))
 or l.suppressed_at is not null or l.human_at is not null
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
  perform public.sdr_check_recipient(q.opportunity_id,q.recipient_kind,q.recipient_address,q.recipient_source_url);
  if q.recipient_kind='company_contact' and q.enqueue_mode<>'automatic'
     and (q.reviewed_by is null or q.reviewed_at is null or q.recipient_source_url is null
       or q.recipient_evidence->>'validation' is distinct from 'web_research_company_contact')
  then raise exception 'manual_contact_review_required';end if;
 end if;
 if q.channel='whatsapp' and not exists(select 1 from public.sdr_consents where lead_id=l.id and channel='whatsapp' and product=o.product and address=l.phone and revoked_at is null)
 then raise exception 'whatsapp_optin_required';end if;
 update public.sdr_queue set status='sending',lease_at=now() where id=q.id;
end $$;

revoke all on function public.sdr_automatic_queue_valid(public.sdr_queue),public.sdr_enqueue_automatic_email(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.sdr_automatic_queue_valid(public.sdr_queue),public.sdr_enqueue_automatic_email(uuid,jsonb) to service_role;
revoke all on function public.sdr_claim(),public.sdr_begin_send(uuid),public.sdr_outreach_gate(public.sdr_queue,public.sdr_product_rollouts,public.sdr_campaigns) from public,anon,authenticated;
grant execute on function public.sdr_claim(),public.sdr_begin_send(uuid),public.sdr_outreach_gate(public.sdr_queue,public.sdr_product_rollouts,public.sdr_campaigns) to service_role;

commit;
