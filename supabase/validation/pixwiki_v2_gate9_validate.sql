-- PixWiki V2 Gate 9 — validação READ-ONLY
-- Execute APÓS aplicar a migration do Gate 9.

-- 1) Marco de início de compra.
select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public'
  and table_name='pixwiki_v2_onboarding_state'
  and column_name='purchase_started_at';

-- 2) Trigger que transforma fatura real em milestone comercial.
select tgname,pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid='public.pixwiki_invoices'::regclass
  and tgname='trg_pixwiki_v2_purchase_started'
  and not tgisinternal;

-- 3) Funções do Gate 9 e ACLs.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'pixwiki_v2_compute_lead_score',
    'pixwiki_v2_mark_purchase_started_from_invoice',
    'admin_pixwiki_v2_leads_page'
  )
order by p.proname;

-- 4) Distribuição do funil/score depois do recálculo.
select
  count(*)::int as leads_total,
  count(*) filter(where mp_connected_at is not null)::int as mp_connected,
  count(*) filter(where first_receipt_at is not null)::int as first_pix,
  count(*) filter(where pricing_viewed_at is not null)::int as pricing_viewed,
  count(*) filter(where purchase_started_at is not null)::int as purchase_started,
  count(*) filter(where lead_score>=80)::int as score_80_plus,
  coalesce(round(avg(lead_score)::numeric,1),0) as avg_score
from public.pixwiki_v2_onboarding_state;

-- 5) Confere que invoices anteriores elegíveis foram backfilled.
select
  count(*)::int as users_with_paid_plan_invoice,
  count(*) filter(where s.purchase_started_at is not null)::int as users_marked_purchase_started
from (
  select distinct user_id
  from public.pixwiki_invoices
  where target_plan in ('link','pro','vip')
    and coalesce(invoice_type,'base')='base'
    and amount_cents>0
    and status in ('pending','paid')
) i
left join public.pixwiki_v2_onboarding_state s on s.user_id=i.user_id;

-- 6) Snapshot administrativo. No SQL Editor deve retornar JSON paginado.
select public.admin_pixwiki_v2_leads_page(
  p_search=>null,
  p_stage=>null,
  p_plan=>null,
  p_min_score=>0,
  p_page=>1,
  p_per_page=>10,
  p_sort=>'score_desc'
) as admin_leads_preview;
