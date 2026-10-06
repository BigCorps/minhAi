begin;

alter table public.sdr_provider_budgets drop constraint sdr_provider_budgets_provider_check;
alter table public.sdr_provider_budgets add constraint sdr_provider_budgets_provider_check
  check (provider in ('econodata','apollo','hunter','web_research'));
-- Separate search units; never enable or change existing provider budgets.
insert into public.sdr_provider_budgets(provider) values ('web_research') on conflict do nothing;

-- Claim the opportunity and reserve three search units together, preventing duplicate research.
create or replace function public.sdr_begin_web_research(p_opportunity uuid)
returns void language plpgsql security invoker set search_path = public, pg_catalog as $$
declare o public.sdr_opportunities%rowtype; v_lead uuid;
begin
  select lead_id into strict v_lead from public.sdr_opportunities where id = p_opportunity;
  -- Serialize all opportunities of the same lead, not only one product/opportunity.
  perform id from public.sdr_leads where id = v_lead for update;
  select * into strict o from public.sdr_opportunities where id = p_opportunity for update;
  if o.stage in ('lost','won','paid') then raise exception 'lead_not_eligible'; end if;
  if exists(select 1 from public.sdr_opportunities where lead_id = v_lead and qualification ? 'web_research') then raise exception 'web_research_already_attempted'; end if;
  perform public.sdr_reserve_units('web_research', 3);
  update public.sdr_opportunities set qualification = qualification || jsonb_build_object(
    'web_research', jsonb_build_object('status','running','model','gpt-5.6-luna','searchCount',0,'researchedAt',now())
  ) where id = p_opportunity;
end;
$$;
revoke all on function public.sdr_begin_web_research(uuid) from public, anon, authenticated;
grant execute on function public.sdr_begin_web_research(uuid) to service_role;

commit;
