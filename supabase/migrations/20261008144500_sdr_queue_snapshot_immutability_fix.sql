begin;

-- Corrective migration for the automatic first-contact rollout.
-- Preserve immutability for every frozen queue snapshot field on UPDATE.
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

commit;
