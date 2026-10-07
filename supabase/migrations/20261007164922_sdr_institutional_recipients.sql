begin;

alter table public.sdr_queue
 add column recipient_kind text not null default 'individual' check(recipient_kind in ('individual','company_contact')),
 add column recipient_address text,
 add column recipient_source_url text,
 add column recipient_evidence jsonb not null default '{}' check(jsonb_typeof(recipient_evidence)='object'),
 add column message_variant text not null default 'customer' check(message_variant in ('customer','partner')),
 add column message_subject text,
 add column message_body text,
 add column enqueue_mode text not null default 'automatic' check(enqueue_mode in ('automatic','manual_review','manual_pilot')),
 add column reviewed_by uuid,
 add column reviewed_at timestamptz;

-- Preserve legacy rows and freeze their existing individual address once.
update public.sdr_queue q set recipient_address=lower(l.email)
from public.sdr_leads l where q.lead_id=l.id and q.channel='email' and q.recipient_address is null;

create function public.sdr_check_recipient(p_opportunity uuid,p_kind text,p_address text,p_source text)
returns void language plpgsql security invoker set search_path=public,pg_catalog as $$
declare o public.sdr_opportunities%rowtype;l public.sdr_leads%rowtype;r jsonb;
begin
 select * into strict o from public.sdr_opportunities where id=p_opportunity;
 select * into strict l from public.sdr_leads where id=o.lead_id;
 if p_address is null or length(p_address)>254 or p_address !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then raise exception 'queue_recipient_required';end if;
 if p_kind='individual' then
  if l.email is null or lower(l.email)<>p_address or l.email_status<>'verified' then raise exception 'verified_email_required';end if;
 elsif p_kind='company_contact' then
  r:=o.qualification->'web_research';
  if r->>'status' is distinct from 'completed' or coalesce(r->>'conflictingEvidence','false')<>'false'
   or p_source is null or p_source !~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}([/?#]|$)' or p_source ~ '[[:space:]<>]'
   or lower(split_part(p_address,'@',2)) is distinct from lower(l.domain)
   or split_part(p_address,'@',1) !~ '^(administrativo|administracao|admin|contato|comercial|info|eventos|vendas|atendimento|recepcao|financeiro|suporte|support|hello|ola|contact|sales|office|reservas|booking|faleconosco|marketing|sac)([._+-][a-z0-9._+-]+)?$'
   or not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(r->'companyContacts')='array' then r->'companyContacts' else '[]' end) x where x->>'type'='email' and lower(x->>'value')=p_address and x->>'sourceUrl'=p_source)
   or not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(r->'sources')='array' then r->'sources' else '[]' end) x where x->>'url'=p_source)
  then raise exception 'validated_company_contact_required';end if;
 else raise exception 'explicit_recipient_required';end if;
end $$;

create function public.sdr_queue_snapshot_guard()
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
  if new.recipient_kind='company_contact' and (new.reviewed_by is null or new.reviewed_at is null or new.message_subject is null or new.message_body is null or new.recipient_evidence->>'validation' is distinct from 'web_research_company_contact') then raise exception 'manual_contact_review_required';end if;
 end if;
 return new;
end $$;
create trigger sdr_queue_snapshot_guard before insert or update on public.sdr_queue for each row execute function public.sdr_queue_snapshot_guard();

create function public.sdr_enqueue_reviewed_email(p_opportunity uuid,p_snapshot jsonb,p_actor uuid)
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
 if (p_snapshot->>'enqueue_mode' is null or p_snapshot->>'enqueue_mode' not in ('manual_pilot','manual_review')) or nullif(p_snapshot->>'message_subject','') is null or length(p_snapshot->>'message_subject')>300 or p_snapshot->>'message_subject' ~ '[\r\n]' or nullif(p_snapshot->>'message_body','') is null or length(p_snapshot->>'message_body')>12000 then raise exception 'manual_contact_review_required';end if;
 perform public.sdr_check_recipient(o.id,p_snapshot->>'recipient_kind',p_snapshot->>'recipient_address',p_snapshot->>'recipient_source_url');
 select * into ro from public.sdr_product_rollouts where product=o.product for update;
 if ro.product is null or ro.status not in ('pilot','active') then raise exception 'reviewed_outreach_requires_pilot_or_active';end if;
 if (p_snapshot->>'enqueue_mode'='manual_pilot' and ro.status<>'pilot') or (p_snapshot->>'enqueue_mode'='manual_review' and ro.status<>'active') then raise exception 'outreach_review_mode_changed';end if;
 if p_snapshot->>'enqueue_mode'='manual_pilot' and c.max_touches<>1 then raise exception 'manual_pilot_requires_single_touch_pilot';end if;
 if exists(select 1 from public.sdr_queue where lead_id=l.id and status not in ('cancelled','blocked','failed')) then raise exception 'company_already_contacted';end if;
 insert into public.sdr_queue(opportunity_id,lead_id,campaign_id,channel,recipient_kind,recipient_address,recipient_source_url,recipient_evidence,message_variant,message_subject,message_body,enqueue_mode,reviewed_by,reviewed_at)
 values(o.id,l.id,c.id,'email',p_snapshot->>'recipient_kind',p_snapshot->>'recipient_address',p_snapshot->>'recipient_source_url',coalesce(p_snapshot->'recipient_evidence','{}'),p_snapshot->>'message_variant',p_snapshot->>'message_subject',p_snapshot->>'message_body',p_snapshot->>'enqueue_mode',p_actor,now()) returning id into v_id;
 return v_id;
end $$;

revoke all on function public.sdr_check_recipient(uuid,text,text,text),public.sdr_queue_snapshot_guard(),public.sdr_enqueue_reviewed_email(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.sdr_check_recipient(uuid,text,text,text),public.sdr_queue_snapshot_guard(),public.sdr_enqueue_reviewed_email(uuid,jsonb,uuid) to service_role;
-- Existing queue RLS and service_role grants are unchanged.
commit;
