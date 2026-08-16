-- PixWiki — Fase 8: Relatórios
-- Backend já aplicado em produção via Supabase MCP.
-- Este arquivo mantém o repositório reproduzível; a função é idempotente.

create or replace function public.pixwiki_report_receipts(
  p_company_id uuid default null,
  p_source text default 'all',
  p_start_date date default current_date,
  p_end_date date default current_date
)
returns table(
  id uuid,
  company_id uuid,
  company_name text,
  mp_payment_id text,
  amount_cents integer,
  fee_amount_cents integer,
  net_amount_cents integer,
  status text,
  source text,
  provider text,
  received_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_start timestamptz;
  v_end timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not public.pixwiki_has_feature_for_user(v_uid, 'reports') then
    raise exception 'plan_required';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'invalid_period';
  end if;

  if (p_end_date - p_start_date) > 366 then
    raise exception 'period_too_large';
  end if;

  if p_source not in ('all', 'pix_key', 'pixwiki_link') then
    raise exception 'invalid_source';
  end if;

  if p_company_id is not null and not exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.user_id = v_uid
      and c.segment_key = 'pix_wiki'
  ) then
    raise exception 'company_not_allowed';
  end if;

  v_start := (p_start_date::timestamp at time zone 'America/Sao_Paulo');
  v_end := ((p_end_date + 1)::timestamp at time zone 'America/Sao_Paulo');

  return query
  select
    r.id,
    r.company_id,
    c.name::text as company_name,
    r.mp_payment_id::text,
    r.amount_cents,
    r.fee_amount_cents,
    r.net_amount_cents,
    r.status::text,
    r.source::text,
    r.provider::text,
    r.received_at
  from public.pixwiki_receipts r
  join public.companies c on c.id = r.company_id
  where c.user_id = v_uid
    and c.segment_key = 'pix_wiki'
    and (p_company_id is null or r.company_id = p_company_id)
    and (p_source = 'all' or r.source = p_source)
    and r.received_at >= v_start
    and r.received_at < v_end
  order by r.received_at desc;
end;
$$;

revoke all on function public.pixwiki_report_receipts(uuid,text,date,date) from public;
revoke all on function public.pixwiki_report_receipts(uuid,text,date,date) from anon;
grant execute on function public.pixwiki_report_receipts(uuid,text,date,date) to authenticated;
grant execute on function public.pixwiki_report_receipts(uuid,text,date,date) to service_role;
