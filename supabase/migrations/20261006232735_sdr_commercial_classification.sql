begin;

-- Merge one commercial subdocument under lock; never change stage, campaigns, queue or budgets.
create or replace function public.sdr_set_commercial_classification(p_opportunity uuid, p_mode text, p_classification jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_catalog as $$
declare o public.sdr_opportunities%rowtype; v_type text; v_route text; v_reasons jsonb;
  v_confidence numeric; v_classification jsonb; v_source text;
begin
  if p_mode is null or p_mode not in ('automatic','manual','recalculate') then raise exception 'invalid_classification_mode'; end if;
  select * into strict o from public.sdr_opportunities where id = p_opportunity for update;
  if p_mode = 'automatic' and o.qualification->'commercial_classification'->>'source' = 'manual' then
    return o.qualification->'commercial_classification';
  end if;
  v_type := p_classification->>'type';
  if v_type is null or v_type not in ('customer','partner','customer_or_partner','low_priority') then raise exception 'invalid_commercial_type'; end if;
  v_route := case v_type when 'customer' then 'customer_outreach' when 'partner' then 'partner_outreach'
    when 'customer_or_partner' then 'customer_or_partner_review' else 'low_priority' end;
  if p_mode = 'manual' then
    v_reasons := '["manual_override"]'::jsonb; v_confidence := 1;
  else
    if jsonb_typeof(p_classification->'confidence') is distinct from 'number' then raise exception 'invalid_classification'; end if;
    v_confidence := (p_classification->>'confidence')::numeric;
    if v_confidence < 0 or v_confidence > 1 then raise exception 'invalid_classification'; end if;
    v_reasons := p_classification->'reasons';
    if jsonb_typeof(v_reasons) is distinct from 'array' then raise exception 'invalid_classification'; end if;
    if jsonb_array_length(v_reasons) < 1 or jsonb_array_length(v_reasons) > 10 then raise exception 'invalid_classification'; end if;
    if exists(select 1 from jsonb_array_elements(v_reasons) r where jsonb_typeof(r) <> 'string' or
      length(r #>> '{}') > 80 or (r #>> '{}') !~ '^[a-z0-9_]+$') then raise exception 'invalid_classification'; end if;
  end if;
  select source into strict v_source from public.sdr_leads where id = o.lead_id;
  v_classification := jsonb_build_object('type',v_type,'confidence',v_confidence,'reasons',v_reasons,
    'recommendedRoute',v_route,'classifiedAt',now(),'source',case when p_mode='manual' then 'manual' else 'automatic' end,
    'rulesVersion',1,'product',o.product,'leadSource',v_source);
  update public.sdr_opportunities set qualification = o.qualification || jsonb_build_object('commercial_classification',v_classification)
    where id = p_opportunity;
  return v_classification;
end;
$$;
revoke all on function public.sdr_set_commercial_classification(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.sdr_set_commercial_classification(uuid,text,jsonb) to service_role;

commit;
