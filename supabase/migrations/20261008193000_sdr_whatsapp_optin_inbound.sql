begin;

create or replace function public.sdr_normalize_phone(p_value text)
returns text
language sql immutable security invoker set search_path=public,pg_catalog as $$
  select nullif(regexp_replace(coalesce(p_value,''),'\D','','g'),'')
$$;

create unique index if not exists sdr_consents_active_unique
on public.sdr_consents(lead_id,product,channel,address)
where revoked_at is null;

create or replace function public.sdr_record_whatsapp_consent(
  p_opportunity uuid,
  p_evidence text,
  p_version text default 'sdr-v2'
) returns uuid
language plpgsql security invoker set search_path=public,pg_catalog as $$
declare
  o public.sdr_opportunities%rowtype;
  l public.sdr_leads%rowtype;
  v_phone text;
  v_id uuid;
begin
  select * into strict o from public.sdr_opportunities where id=p_opportunity;
  select * into strict l from public.sdr_leads where id=o.lead_id for update;
  if l.suppressed_at is not null then raise exception 'contact_blocked'; end if;
  v_phone:=public.sdr_normalize_phone(l.phone);
  if v_phone is null or v_phone !~ '^[1-9][0-9]{9,14}$' then raise exception 'contact_blocked'; end if;
  if length(trim(coalesce(p_evidence,'')))<20 then raise exception 'consent_evidence_required'; end if;

  update public.sdr_consents
  set revoked_at=now()
  where lead_id=l.id and product=o.product and channel='whatsapp'
    and revoked_at is null and address<>v_phone;

  insert into public.sdr_consents(lead_id,channel,address,product,granted_at,revoked_at,evidence,version)
  values(l.id,'whatsapp',v_phone,o.product,now(),null,left(trim(p_evidence),2000),left(coalesce(nullif(trim(p_version),''),'sdr-v2'),100))
  on conflict (lead_id,product,channel,address) where revoked_at is null
  do update set granted_at=excluded.granted_at,evidence=excluded.evidence,version=excluded.version
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.sdr_whatsapp_queue_valid(q public.sdr_queue)
returns boolean
language sql stable security invoker set search_path=public,pg_catalog as $$
  select coalesce(
    q.channel='whatsapp'
    and q.step=0
    and q.enqueue_mode='manual_review'
    and q.recipient_kind='individual'
    and q.recipient_address ~ '^[1-9][0-9]{9,14}$'
    and q.recipient_evidence->>'validation'='explicit_whatsapp_optin'
    and nullif(q.recipient_evidence->>'consent_id','') is not null
    and nullif(q.recipient_evidence->>'template_name','') is not null
    and q.reviewed_by is not null
    and q.reviewed_at is not null,
    false
  )
$$;

create or replace function public.sdr_enqueue_optin_whatsapp(
  p_opportunity uuid,
  p_actor uuid
) returns uuid
language plpgsql security invoker set search_path=public,pg_catalog as $$
declare
  o public.sdr_opportunities%rowtype;
  l public.sdr_leads%rowtype;
  c public.sdr_campaigns%rowtype;
  ro public.sdr_product_rollouts%rowtype;
  t public.sdr_templates%rowtype;
  co public.sdr_consents%rowtype;
  v_phone text;
  v_variant text;
  v_id uuid;
begin
  if p_actor is null then raise exception 'review_actor_required'; end if;
  select * into strict o from public.sdr_opportunities where id=p_opportunity;
  select * into strict l from public.sdr_leads where id=o.lead_id for update;
  select * into strict c from public.sdr_campaigns where id=o.campaign_id for update;
  select * into ro from public.sdr_product_rollouts where product=o.product for update;

  if ro.product is null or ro.status<>'active' or not ro.auto_outreach_enabled or not ro.live_send_enabled or ro.daily_send_cap<1
  then raise exception 'automatic_outreach_not_active'; end if;
  if not c.enabled or c.trial_ends_at is null or c.trial_ends_at<=now()
  then raise exception 'trial_not_active'; end if;
  if l.owner<>'minhai' or not l.outreach_reviewed or l.suppressed_at is not null or l.human_at is not null or l.last_inbound_at is not null
     or o.stage not in ('new','contacted')
  then raise exception 'lead_not_eligible'; end if;

  v_phone:=public.sdr_normalize_phone(l.phone);
  if v_phone is null or v_phone !~ '^[1-9][0-9]{9,14}$' then raise exception 'contact_blocked'; end if;

  select * into co from public.sdr_consents
  where lead_id=l.id and product=o.product and channel='whatsapp'
    and address=v_phone and revoked_at is null
  order by granted_at desc limit 1;
  if co.id is null then raise exception 'whatsapp_optin_required'; end if;

  select * into t from public.sdr_templates where product=o.product;
  if t.product is null or upper(coalesce(t.status,''))<>'APPROVED' or t.meta_id is null
  then raise exception 'whatsapp_template_not_approved'; end if;

  if exists(
    select 1 from public.sdr_queue
    where opportunity_id=o.id and channel='whatsapp' and status not in ('cancelled','blocked','failed')
  ) then raise exception 'company_already_contacted'; end if;

  v_variant:=case when o.qualification->'commercial_classification'->>'type'='partner' then 'partner' else 'customer' end;

  insert into public.sdr_queue(
    opportunity_id,lead_id,campaign_id,channel,step,
    recipient_kind,recipient_address,recipient_source_url,recipient_evidence,
    message_variant,message_subject,message_body,enqueue_mode,reviewed_by,reviewed_at
  ) values(
    o.id,l.id,c.id,'whatsapp',0,
    'individual',v_phone,null,
    jsonb_build_object(
      'validation','explicit_whatsapp_optin',
      'consent_id',co.id::text,
      'consent_version',co.version,
      'template_name',t.name,
      'template_meta_id',t.meta_id
    ),
    v_variant,null,t.body,'manual_review',p_actor,now()
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
    and q.message_subject is not null and q.message_body is not null)
   or (public.sdr_whatsapp_queue_valid(q) and c.max_touches=1)))
  or (q.enqueue_mode='manual_pilot' and ro.status='pilot' and ro.manual_pilot_send_enabled
   and not ro.auto_outreach_enabled and not ro.live_send_enabled and q.channel='email' and q.step=0 and c.max_touches=1
   and q.reviewed_by is not null and q.reviewed_at is not null and q.recipient_address is not null and q.message_subject is not null and q.message_body is not null
   and exists(select 1 from public.sdr_manual_pilot_opportunities p where p.product=ro.product and p.opportunity_id=q.opportunity_id)
   and (select count(*) from public.sdr_manual_pilot_opportunities p where p.product=ro.product)<=ro.pilot_limit)
 ),false)
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
 elsif new.channel='whatsapp' then
  if not public.sdr_whatsapp_queue_valid(new) then raise exception 'whatsapp_snapshot_required'; end if;
 end if;
 return new;
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
   and l.owner='minhai'
   and (l.outreach_reviewed or public.sdr_automatic_queue_valid(x) or public.sdr_whatsapp_queue_valid(x))
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
 ro public.sdr_product_rollouts%rowtype; v_product_count integer; co public.sdr_consents%rowtype; t public.sdr_templates%rowtype;
begin
 select * into strict q from public.sdr_queue where id=p_queue for update;
 select * into strict l from public.sdr_leads where id=q.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=q.campaign_id for update;
 select * into strict o from public.sdr_opportunities where id=q.opportunity_id;
 select * into ro from public.sdr_product_rollouts where product=o.product for update;
 if q.status<>'processing' or not c.enabled or c.trial_ends_at<=now() or c.trial_ends_at is null
 or l.owner<>'minhai'
 or not (l.outreach_reviewed or public.sdr_automatic_queue_valid(q) or public.sdr_whatsapp_queue_valid(q))
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
 elsif q.channel='whatsapp' then
  if not public.sdr_whatsapp_queue_valid(q) then raise exception 'whatsapp_snapshot_required'; end if;
  if public.sdr_normalize_phone(l.phone) is distinct from q.recipient_address then raise exception 'whatsapp_number_changed'; end if;
  select * into co from public.sdr_consents
  where id=(q.recipient_evidence->>'consent_id')::uuid
    and lead_id=l.id and product=o.product and channel='whatsapp'
    and address=q.recipient_address and revoked_at is null;
  if co.id is null then raise exception 'whatsapp_optin_required'; end if;
  select * into t from public.sdr_templates where product=o.product;
  if t.product is null or upper(coalesce(t.status,''))<>'APPROVED' or t.meta_id is null
    or t.name is distinct from q.recipient_evidence->>'template_name'
  then raise exception 'whatsapp_template_not_approved'; end if;
 end if;
 update public.sdr_queue set status='sending',lease_at=now() where id=q.id;
end $$;

create or replace function public.sdr_inbound_thread()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare l record;t text;v_phone text;
begin
 if new.last_inbound_at is null then return new;end if;
 if tg_op='UPDATE' and new.last_inbound_at is not distinct from old.last_inbound_at then return new;end if;
 t:=lower(trim(coalesce(new.last_message_text,'')));
 v_phone:=public.sdr_normalize_phone(new.from_id);
 for l in select id from public.sdr_leads where public.sdr_normalize_phone(phone)=v_phone loop
  update public.sdr_leads set last_inbound_at=new.last_inbound_at where id=l.id;
  perform public.sdr_stop(l.id,case when t ~ '^(sair|parar|pare|cancelar|stop|remover|não quero|nao quero)' then 'whatsapp_optout' else 'whatsapp_reply' end,
   t ~ '^(sair|parar|pare|cancelar|stop|remover|não quero|nao quero)');
  update public.sdr_opportunities set stage='replied' where lead_id=l.id and stage in ('new','contacted');
 end loop;
 return new;
end $$;

create or replace function public.sdr_inbound_message()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare c record;l record;t text;v_phone text;
begin
 if new.role<>'user' then return new;end if;
 select meta_from_id,meta_platform,meta_page_id into c from public.conversations where id=new.conversation_id;
 if c.meta_platform<>'whatsapp' then return new;end if;
 t:=lower(trim(coalesce(new.content,'')));
 v_phone:=public.sdr_normalize_phone(c.meta_from_id);
 for l in select id from public.sdr_leads where public.sdr_normalize_phone(phone)=v_phone loop
  update public.sdr_leads set last_inbound_at=new.created_at where id=l.id;
  perform public.sdr_stop(l.id,case when t ~ '^(sair|parar|pare|cancelar|stop|remover|não quero|nao quero)' then 'whatsapp_optout' else 'whatsapp_reply' end,
   t ~ '^(sair|parar|pare|cancelar|stop|remover|não quero|nao quero)');
  update public.sdr_opportunities set stage='replied' where lead_id=l.id and stage in ('new','contacted');
 end loop;
 return new;
end $$;

revoke all on function public.sdr_normalize_phone(text),public.sdr_record_whatsapp_consent(uuid,text,text),public.sdr_whatsapp_queue_valid(public.sdr_queue),public.sdr_enqueue_optin_whatsapp(uuid,uuid) from public,anon,authenticated;
grant execute on function public.sdr_normalize_phone(text),public.sdr_record_whatsapp_consent(uuid,text,text),public.sdr_whatsapp_queue_valid(public.sdr_queue),public.sdr_enqueue_optin_whatsapp(uuid,uuid) to service_role;
revoke all on function public.sdr_claim(),public.sdr_begin_send(uuid),public.sdr_outreach_gate(public.sdr_queue,public.sdr_product_rollouts,public.sdr_campaigns) from public,anon,authenticated;
grant execute on function public.sdr_claim(),public.sdr_begin_send(uuid),public.sdr_outreach_gate(public.sdr_queue,public.sdr_product_rollouts,public.sdr_campaigns) to service_role;

commit;
