begin;

-- Preparing a reviewed queue item must remain possible while the campaign is paused.
-- Campaign.enabled continues to be mandatory in sdr_claim/sdr_begin_send, so this
-- does not permit delivery by itself.
create or replace function public.sdr_enqueue_reviewed_email(p_opportunity uuid,p_snapshot jsonb,p_actor uuid)
returns uuid language plpgsql security invoker set search_path=public,pg_catalog as $$
declare o public.sdr_opportunities%rowtype;l public.sdr_leads%rowtype;c public.sdr_campaigns%rowtype;v_id uuid;v_type text;ro public.sdr_product_rollouts%rowtype;
begin
 if to_regclass('public.sdr_manual_pilot_opportunities') is null then raise exception 'manual_pilot_migration_required';end if;
 select * into strict o from public.sdr_opportunities where id=p_opportunity;
 select * into strict l from public.sdr_leads where id=o.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=o.campaign_id;
 if p_actor is null or c.trial_ends_at is null or c.trial_ends_at<=now() or l.owner<>'minhai' or not l.outreach_reviewed or l.suppressed_at is not null or l.human_at is not null or l.last_inbound_at is not null or o.stage<>'new' then raise exception 'lead_not_eligible';end if;
 if nullif(trim(l.company_name),'') is null or not (regexp_replace(coalesce(l.cnpj,''),'\D','','g') ~ '^\d{14}$' or (l.source in ('econodata','hunter','apollo','web_research') and l.domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$')) then raise exception 'business_lead_required';end if;
 v_type:=o.qualification->'commercial_classification'->>'type';
 if v_type is null then raise exception 'commercial_classification_required';end if;
 if v_type='low_priority' then raise exception 'low_priority_outreach_blocked';end if;
 if p_snapshot->>'message_variant' is null or p_snapshot->>'message_variant' not in ('customer','partner') or (v_type<>'customer_or_partner' and p_snapshot->>'message_variant'<>v_type) then raise exception 'explicit_variant_required';end if;
 if (p_snapshot->>'enqueue_mode' is null or p_snapshot->>'enqueue_mode' not in ('manual_pilot','manual_review')) or nullif(p_snapshot->>'message_subject','') is null or length(p_snapshot->>'message_subject')>300 or p_snapshot->>'message_subject' ~ '[\r\n]' or nullif(p_snapshot->>'message_body','') is null or length(p_snapshot->>'message_body')>12000 then raise exception 'manual_contact_review_required';end if;
 perform public.sdr_check_recipient(o.id,p_snapshot->>'recipient_kind',p_snapshot->>'recipient_address',p_snapshot->>'recipient_source_url');
 select * into ro from public.sdr_product_rollouts where product=o.product for update;
 if ro.product is null or ro.status not in ('pilot','active') then raise exception 'reviewed_outreach_requires_pilot_or_active';end if;
 if (p_snapshot->>'enqueue_mode'='manual_pilot' and ro.status<>'pilot') or (p_snapshot->>'enqueue_mode'='manual_review' and ro.status<>'active') then raise exception 'outreach_review_mode_changed';end if;
 if p_snapshot->>'enqueue_mode'='manual_pilot' then
  if c.max_touches<>1 then raise exception 'manual_pilot_requires_single_touch_pilot';end if;
  if not exists(select 1 from public.sdr_manual_pilot_opportunities where product=o.product and opportunity_id=o.id) then
   if (select count(*) from public.sdr_manual_pilot_opportunities where product=o.product)>=ro.pilot_limit then raise exception 'pilot_opportunity_limit';end if;
   insert into public.sdr_manual_pilot_opportunities(product,opportunity_id,reviewed_by) values(o.product,o.id,p_actor);
  end if;
 end if;
 if exists(select 1 from public.sdr_queue where lead_id=l.id and status not in ('cancelled','blocked','failed')) then raise exception 'company_already_contacted';end if;
 insert into public.sdr_queue(opportunity_id,lead_id,campaign_id,channel,recipient_kind,recipient_address,recipient_source_url,recipient_evidence,message_variant,message_subject,message_body,enqueue_mode,reviewed_by,reviewed_at)
 values(o.id,l.id,c.id,'email',p_snapshot->>'recipient_kind',p_snapshot->>'recipient_address',p_snapshot->>'recipient_source_url',coalesce(p_snapshot->'recipient_evidence','{}'),p_snapshot->>'message_variant',p_snapshot->>'message_subject',p_snapshot->>'message_body',p_snapshot->>'enqueue_mode',p_actor,now()) returning id into v_id;
 return v_id;
end $$;

revoke all on function public.sdr_enqueue_reviewed_email(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.sdr_enqueue_reviewed_email(uuid,jsonb,uuid) to service_role;

commit;
