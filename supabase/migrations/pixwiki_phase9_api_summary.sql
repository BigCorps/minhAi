create or replace function public.pixwiki_api_summary_internal(
  p_user_id uuid,
  p_company_id uuid default null,
  p_source text default 'all',
  p_start_at timestamptz default now()-interval '30 days',
  p_end_at timestamptz default now()
)
returns table(receipt_count bigint,gross_cents bigint,fee_cents bigint,net_cents bigint,pix_key_count bigint,pix_link_count bigint)
language sql stable security definer set search_path=public
as $$
  select count(*)::bigint,
         coalesce(sum(r.amount_cents),0)::bigint,
         coalesce(sum(r.fee_amount_cents),0)::bigint,
         coalesce(sum(r.net_amount_cents),0)::bigint,
         count(*) filter(where r.source='pix_key')::bigint,
         count(*) filter(where r.source='pixwiki_link')::bigint
  from public.pixwiki_receipts r
  join public.companies c on c.id=r.company_id
  where c.user_id=p_user_id and c.segment_key='pix_wiki'
    and (p_company_id is null or r.company_id=p_company_id)
    and (p_source='all' or r.source=p_source)
    and r.received_at>=p_start_at and r.received_at<p_end_at;
$$;
revoke all on function public.pixwiki_api_summary_internal(uuid,uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.pixwiki_api_summary_internal(uuid,uuid,text,timestamptz,timestamptz) to service_role;
