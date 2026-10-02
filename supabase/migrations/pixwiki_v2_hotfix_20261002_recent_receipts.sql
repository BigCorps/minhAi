-- PixWiki V2 hotfix 2026-10-02
-- Histórico rico do dashboard: leitura autenticada por empresa, até 500 recebimentos.

create or replace function public.pixwiki_v2_recent_receipts(
  p_company_id uuid,
  p_limit integer default 200
)
returns table(
  id uuid,
  amount_cents integer,
  fee_amount_cents integer,
  net_amount_cents integer,
  source text,
  received_at timestamptz,
  checkout_id uuid,
  external_id text
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_role text;
  v_limit integer := least(greatest(coalesce(p_limit,200),1),500);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select c.user_id into v_owner from public.companies c
  where c.id=p_company_id and c.segment_key='pix_wiki' and c.is_active=true;
  if v_owner is null then raise exception 'company_not_found'; end if;
  v_role := case when v_owner=v_uid then 'owner' else public.pixwiki_company_access_role(p_company_id) end;
  if v_role not in ('owner','manager') then raise exception 'company_not_allowed'; end if;

  return query
  select r.id,r.amount_cents,coalesce(r.fee_amount_cents,0)::integer,
    coalesce(r.net_amount_cents,r.amount_cents-coalesce(r.fee_amount_cents,0))::integer,
    (case when s.id is not null then s.origin when r.source='pixwiki_link' then 'pix_link' else 'pix_key' end)::text,
    coalesce(r.date_approved,r.date_created,r.created_at)::timestamptz,s.id,s.external_id
  from public.mp_received_payments r
  left join lateral (
    select cs.id,cs.origin,cs.external_id from public.pixwiki_v2_checkout_sessions cs
    where cs.company_id=r.company_id and (cs.receipt_id=r.id or (cs.provider_payment_id is not null and r.mp_payment_id is not null and cs.provider_payment_id=r.mp_payment_id))
    order by cs.paid_at desc nulls last,cs.created_at desc limit 1
  ) s on true
  where r.company_id=p_company_id and r.status='approved'
  order by coalesce(r.date_approved,r.date_created,r.created_at) desc
  limit v_limit;
end;
$$;

revoke all on function public.pixwiki_v2_recent_receipts(uuid,integer) from public, anon;
grant execute on function public.pixwiki_v2_recent_receipts(uuid,integer) to authenticated;
