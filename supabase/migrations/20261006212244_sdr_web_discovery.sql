begin;

-- Manual web discovery has its own guardrail, independent of campaign.provider/max_runs.
create or replace function public.sdr_begin_web_discovery(p_campaign uuid)
returns uuid language plpgsql security invoker set search_path = public, pg_catalog as $$
declare v_run uuid;
begin
  perform id from public.sdr_campaigns where id = p_campaign for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if exists(select 1 from public.sdr_runs where campaign_id = p_campaign and status = 'running') then
    raise exception 'search_running';
  end if;
  perform public.sdr_reserve_units('web_research', 3);
  insert into public.sdr_runs(campaign_id, provider, request_fingerprint, credits_reserved)
  values(p_campaign, 'web_research', 'web_discovery:gpt-5.6-luna:v1', 3) returning id into v_run;
  return v_run;
end;
$$;
revoke all on function public.sdr_begin_web_discovery(uuid) from public, anon, authenticated;
grant execute on function public.sdr_begin_web_discovery(uuid) to service_role;

-- Serialize identity lookup with the existing import's lock, including other campaigns/providers.
-- The canonical importer still owns all lead/opportunity persistence and deduplication.
create or replace function public.sdr_import_web_discovery_lead(p_lead jsonb, p_campaign uuid, p_keys text[])
returns jsonb language plpgsql security invoker set search_path = public, pg_catalog as $$
declare v_duplicate boolean; v_lead uuid;
begin
  lock table public.sdr_lead_keys in share row exclusive mode;
  select exists(select 1 from public.sdr_lead_keys where key = any(p_keys)) into v_duplicate;
  v_lead := public.sdr_import_lead(p_lead, p_campaign, p_keys);
  return jsonb_build_object('leadId', v_lead, 'duplicate', v_duplicate);
end;
$$;
revoke all on function public.sdr_import_web_discovery_lead(jsonb, uuid, text[]) from public, anon, authenticated;
grant execute on function public.sdr_import_web_discovery_lead(jsonb, uuid, text[]) to service_role;

commit;
