begin;
-- Preserve campaign IDs, opportunities, attribution and opt-outs. No campaign starts here.
alter table public.sdr_campaigns drop constraint if exists sdr_campaigns_lane_check;
alter table public.sdr_leads drop constraint if exists sdr_leads_owner_check;
update public.sdr_queue q set status='cancelled',error_code='own_sales_migration'
from public.sdr_campaigns c where q.campaign_id=c.id and c.lane='silva' and q.status in ('queued','processing');
update public.sdr_campaigns set lane='high_ticket',
 name=case product when 'pixwiki' then 'SDR próprio · PixWiki' else 'SDR próprio · MonitorIA VIP' end,
 enabled=false,auto_discover=false,provider=null,trial_ends_at=null,next_search_at=null
where lane='silva';
update public.sdr_leads set owner='minhai',updated_at=now() where owner='silva';
alter table public.sdr_campaigns add constraint sdr_campaigns_lane_check check(lane in ('api1','api2','api3','high_ticket'));
alter table public.sdr_leads add constraint sdr_leads_owner_check check(owner='minhai');
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
   'minhai',p_lead->>'source',p_lead->>'source_ref',p_lead->>'evidence',coalesce(p_lead->>'email_status','unknown')) returning id into v_id;
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
 if c.provider is null then raise exception 'provider_missing';end if;
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

create or replace function public.sdr_enqueue(p_opportunity uuid,p_channel text)
returns uuid language plpgsql security invoker set search_path=public,pg_catalog as $$
declare o public.sdr_opportunities%rowtype;l public.sdr_leads%rowtype;c public.sdr_campaigns%rowtype;v_id uuid;
begin
 select * into strict o from public.sdr_opportunities where id=p_opportunity;
 select * into strict l from public.sdr_leads where id=o.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=o.campaign_id;
 if not c.enabled or l.owner<>'minhai' or not l.outreach_reviewed or l.suppressed_at is not null or l.human_at is not null or o.stage<>'new' then raise exception 'lead_not_eligible';end if;
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
 where x.status='queued' and x.due_at<=now() and cam.enabled and cam.trial_ends_at>now()
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

create or replace function public.sdr_begin_send(p_queue uuid)
returns void language plpgsql security invoker set search_path=public,pg_catalog as $$
declare q public.sdr_queue%rowtype;l public.sdr_leads%rowtype;c public.sdr_campaigns%rowtype;o public.sdr_opportunities%rowtype;
begin
 select * into strict q from public.sdr_queue where id=p_queue for update;
 select * into strict l from public.sdr_leads where id=q.lead_id for update;
 select * into strict c from public.sdr_campaigns where id=q.campaign_id;
 select * into strict o from public.sdr_opportunities where id=q.opportunity_id;
 if q.status<>'processing' or not c.enabled or c.trial_ends_at<=now() or c.trial_ends_at is null
 or l.owner<>'minhai' or not l.outreach_reviewed or l.suppressed_at is not null or l.human_at is not null
 or l.last_inbound_at is not null or o.stage not in ('new','contacted') then raise exception 'send_no_longer_eligible';end if;
 if q.channel='email' and (l.email is null or l.email_status<>'verified') then raise exception 'verified_email_required';end if;
 if q.channel='whatsapp' and not exists(select 1 from public.sdr_consents where lead_id=l.id and channel='whatsapp' and product=o.product and address=l.phone and revoked_at is null) then raise exception 'whatsapp_optin_required';end if;
 update public.sdr_queue set status='sending',lease_at=now() where id=q.id;
end $$;
commit;
