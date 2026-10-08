begin;

create or replace function public.sdr_automatic_outreach_capacity(p_product text,p_campaign uuid)
returns integer
language plpgsql stable security invoker set search_path=public,pg_catalog as $$
declare
 c public.sdr_campaigns%rowtype;
 ro public.sdr_product_rollouts%rowtype;
 v_day_start timestamptz;
 v_campaign_count integer;
 v_product_count integer;
begin
 select * into c from public.sdr_campaigns where id=p_campaign and product=p_product;
 if c.id is null then return 0; end if;
 select * into ro from public.sdr_product_rollouts where product=p_product;
 if ro.product is null or ro.status<>'active' or not ro.auto_outreach_enabled or not ro.live_send_enabled
    or ro.daily_send_cap<1 or not c.enabled or c.max_touches<>1
    or c.trial_ends_at is null or c.trial_ends_at<=now()
 then return 0; end if;

 v_day_start:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';

 select count(*) into v_campaign_count
 from public.sdr_queue
 where campaign_id=c.id
 and (
   status in ('queued','processing','sending')
   or (status='sent' and sent_at>=v_day_start)
 );

 select count(*) into v_product_count
 from public.sdr_queue q
 join public.sdr_opportunities o on o.id=q.opportunity_id
 where o.product=p_product
 and (
   q.status in ('queued','processing','sending')
   or (q.status='sent' and q.sent_at>=v_day_start)
 );

 return greatest(0,least(c.daily_limit-v_campaign_count,ro.daily_send_cap-v_product_count));
end $$;

create or replace function public.sdr_begin_automatic_web_discovery(p_campaign uuid)
returns uuid
language plpgsql security invoker set search_path=public,pg_catalog as $$
declare
 c public.sdr_campaigns%rowtype;
 ro public.sdr_product_rollouts%rowtype;
 v_run uuid;
 v_day_start timestamptz;
 v_next timestamptz;
begin
 select * into strict c from public.sdr_campaigns where id=p_campaign for update;
 select * into ro from public.sdr_product_rollouts where product=c.product for update;

 if not c.enabled or not c.auto_discover or c.trial_ends_at is null or c.trial_ends_at<=now()
 then raise exception 'automatic_discovery_not_active'; end if;
 if ro.product is null or ro.status<>'active' or not ro.auto_discovery_enabled
 then raise exception 'automatic_discovery_not_active'; end if;
 if c.next_search_at is not null and c.next_search_at>now()
 then raise exception 'search_not_due'; end if;
 if exists(select 1 from public.sdr_runs where campaign_id=p_campaign and status='running')
 then raise exception 'search_running'; end if;

 v_day_start:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 if exists(
   select 1 from public.sdr_runs
   where campaign_id=p_campaign
     and provider='web_research'
     and request_fingerprint='web_discovery:gpt-5.6-luna:auto:v1'
     and created_at>=v_day_start
 ) then raise exception 'search_daily_limit'; end if;

 perform public.sdr_reserve_units('web_research',3);
 insert into public.sdr_runs(campaign_id,provider,request_fingerprint,credits_reserved)
 values(p_campaign,'web_research','web_discovery:gpt-5.6-luna:auto:v1',3)
 returning id into v_run;

 v_next:=((date_trunc('day',now() at time zone 'America/Sao_Paulo') + interval '1 day 9 hours') at time zone 'America/Sao_Paulo');
 update public.sdr_campaigns set next_search_at=v_next where id=p_campaign;
 return v_run;
end $$;

revoke all on function public.sdr_automatic_outreach_capacity(text,uuid),public.sdr_begin_automatic_web_discovery(uuid) from public,anon,authenticated;
grant execute on function public.sdr_automatic_outreach_capacity(text,uuid),public.sdr_begin_automatic_web_discovery(uuid) to service_role;

commit;
