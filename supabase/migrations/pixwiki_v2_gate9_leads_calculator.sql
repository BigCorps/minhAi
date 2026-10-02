-- =============================================================================
-- PixWiki V2 — Gate 9
-- Calculadora comercial + Lead Scoring + Admin BigCorps
--
-- PRÉ-REQUISITOS: Gates 1 a 8 aplicados nesta ordem.
--
-- PRINCÍPIOS
-- - Não cria CRM paralelo: pixwiki_v2_onboarding_state segue como fonte do lead.
-- - Score é determinístico, calculado no banco e não depende de metadata do JWT.
-- - "Iniciou compra" nasce de uma fatura real de plano, não de clique no front.
-- - A listagem administrativa é service_role-only e nunca é exposta ao cliente.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Marco comercial faltante: início de compra.
-- -----------------------------------------------------------------------------
alter table public.pixwiki_v2_onboarding_state
  add column if not exists purchase_started_at timestamptz;

create index if not exists pixwiki_v2_onboarding_score_updated_idx
  on public.pixwiki_v2_onboarding_state(lead_score desc, updated_at desc);

create index if not exists pixwiki_v2_onboarding_purchase_idx
  on public.pixwiki_v2_onboarding_state(purchase_started_at desc)
  where purchase_started_at is not null;

-- -----------------------------------------------------------------------------
-- 2) Score oficial V2.
--
-- Fórmula acordada:
-- account +5
-- MP conectado +15
-- primeiro Pix +20
-- Push +5
-- Link testado +10
-- Checkout testado +15
-- API testada +20
-- Webhook testado +20
-- volume declarado >= 10k Pix/mês +30
-- pricing/calculadora vista +5
-- início de compra +40
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_compute_lead_score(
  p_state public.pixwiki_v2_onboarding_state
)
returns integer
language plpgsql
immutable
set search_path='public','pg_temp'
as $$
declare
  v_score integer := 0;
begin
  if p_state.account_created_at is not null then v_score := v_score + 5; end if;
  if p_state.mp_connected_at is not null then v_score := v_score + 15; end if;
  if p_state.first_receipt_at is not null then v_score := v_score + 20; end if;
  if p_state.push_enabled_at is not null then v_score := v_score + 5; end if;
  if p_state.link_tested_at is not null then v_score := v_score + 10; end if;
  if p_state.checkout_tested_at is not null then v_score := v_score + 15; end if;
  if p_state.api_tested_at is not null then v_score := v_score + 20; end if;
  if p_state.webhook_tested_at is not null then v_score := v_score + 20; end if;
  if coalesce(p_state.estimated_monthly_pix,0) >= 10000 then v_score := v_score + 30; end if;
  if p_state.pricing_viewed_at is not null then v_score := v_score + 5; end if;
  if p_state.purchase_started_at is not null then v_score := v_score + 40; end if;
  return greatest(v_score,0);
end;
$$;

revoke all on function public.pixwiki_v2_compute_lead_score(public.pixwiki_v2_onboarding_state)
  from public,anon,authenticated;
grant execute on function public.pixwiki_v2_compute_lead_score(public.pixwiki_v2_onboarding_state)
  to service_role;

-- Recalcula os registros que já existirem quando o Gate 9 for aplicado.
update public.pixwiki_v2_onboarding_state s
set lead_score=public.pixwiki_v2_compute_lead_score(s),
    updated_at=greatest(coalesce(s.updated_at,now()),coalesce(s.updated_at,now()));

-- -----------------------------------------------------------------------------
-- 3) Fatura de plano paga = lead iniciou compra.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_mark_purchase_started_from_invoice()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
begin
  if new.target_plan in ('link','pro','vip')
     and coalesce(new.invoice_type,'base')='base'
     and coalesce(new.amount_cents,0)>0
     and new.status in ('pending','paid') then
    update public.pixwiki_v2_onboarding_state
    set purchase_started_at=coalesce(purchase_started_at,new.created_at,now()),
        last_step=case
          when completed_at is null then 'purchase_started'
          else last_step
        end,
        updated_at=now()
    where user_id=new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function public.pixwiki_v2_mark_purchase_started_from_invoice()
  from public,anon,authenticated;
grant execute on function public.pixwiki_v2_mark_purchase_started_from_invoice()
  to service_role;

drop trigger if exists trg_pixwiki_v2_purchase_started on public.pixwiki_invoices;
create trigger trg_pixwiki_v2_purchase_started
after insert or update of status,target_plan,invoice_type,amount_cents
on public.pixwiki_invoices
for each row
execute function public.pixwiki_v2_mark_purchase_started_from_invoice();

-- Backfill somente quando já existe uma fatura V2 de plano real.
update public.pixwiki_v2_onboarding_state s
set purchase_started_at=x.purchase_started_at,
    updated_at=now()
from (
  select i.user_id,min(i.created_at) as purchase_started_at
  from public.pixwiki_invoices i
  where i.target_plan in ('link','pro','vip')
    and coalesce(i.invoice_type,'base')='base'
    and coalesce(i.amount_cents,0)>0
    and i.status in ('pending','paid')
  group by i.user_id
) x
where x.user_id=s.user_id
  and s.purchase_started_at is null;

-- O UPDATE acima dispara o score trigger do Gate 5. Rodamos um segundo passe
-- explícito para instalações onde o trigger antigo tenha sido removido.
update public.pixwiki_v2_onboarding_state s
set lead_score=public.pixwiki_v2_compute_lead_score(s),updated_at=now();

-- -----------------------------------------------------------------------------
-- 4) Snapshot administrativo paginado dos Leads PixWiki.
--    Somente service_role executa. Route Handler do Admin aplica autenticação
--    Google-only antes de chamar esta RPC.
-- -----------------------------------------------------------------------------
create or replace function public.admin_pixwiki_v2_leads_page(
  p_search text default null,
  p_stage text default null,
  p_plan text default null,
  p_min_score integer default 0,
  p_page integer default 1,
  p_per_page integer default 25,
  p_sort text default 'score_desc'
)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_search text := nullif(lower(trim(coalesce(p_search,''))),'');
  v_stage text := nullif(lower(trim(coalesce(p_stage,''))),'');
  v_plan text := nullif(lower(trim(coalesce(p_plan,''))),'');
  v_min_score integer := greatest(coalesce(p_min_score,0),0);
  v_page integer := greatest(coalesce(p_page,1),1);
  v_per_page integer := least(greatest(coalesce(p_per_page,25),10),100);
  v_sort text := lower(trim(coalesce(p_sort,'score_desc')));
  v_offset integer;
  v_total bigint := 0;
  v_items jsonb := '[]'::jsonb;
  v_summary jsonb := '{}'::jsonb;
begin
  if v_stage is not null and v_stage not in ('account','connected','activated','pricing','purchase') then
    raise exception 'invalid_stage';
  end if;
  if v_plan is not null and v_plan not in ('free','link','pro','vip') then
    raise exception 'invalid_plan';
  end if;
  if v_sort not in ('score_desc','recent_desc','volume_desc','savings_desc') then
    v_sort := 'score_desc';
  end if;

  v_offset := (v_page-1)*v_per_page;

  with base as (
    select
      s.user_id,
      s.company_id,
      c.name::text as company_name,
      c.slug::text as company_slug,
      u.email::text as email,
      coalesce(ns.notification_phone,c.whatsapp_number::text)::text as phone,
      s.last_step,
      s.lead_score,
      case
        when s.purchase_started_at is not null then 'purchase'
        when s.pricing_viewed_at is not null then 'pricing'
        when s.first_receipt_at is not null then 'activated'
        when s.mp_connected_at is not null then 'connected'
        else 'account'
      end as stage,
      s.estimated_monthly_pix,
      s.estimated_ticket_cents,
      s.current_fee_type,
      s.current_fee_value,
      s.estimated_current_cost_cents,
      s.estimated_pixwiki_cost_cents,
      s.estimated_savings_cents,
      s.interested_plan,
      coalesce(b.plan,'free')::text as billing_plan,
      coalesce(b.status,'active')::text as billing_status,
      s.account_created_at,
      s.mp_connected_at,
      s.first_receipt_at,
      s.pricing_viewed_at,
      s.purchase_started_at,
      s.completed_at,
      greatest(
        s.account_created_at,s.mp_connected_at,s.pix_key_configured_at,s.first_receipt_at,
        s.link_tested_at,s.checkout_tested_at,s.api_tested_at,s.webhook_tested_at,
        s.pricing_viewed_at,s.purchase_started_at,s.completed_at,s.created_at
      ) as last_activity_at
    from public.pixwiki_v2_onboarding_state s
    left join public.companies c on c.id=s.company_id
    left join auth.users u on u.id=s.user_id
    left join public.pixwiki_notification_settings ns on ns.company_id=s.company_id
    left join public.pixwiki_v2_billing_accounts b on b.user_id=s.user_id
  ), filtered as (
    select * from base b
    where b.lead_score>=v_min_score
      and (v_stage is null or b.stage=v_stage)
      and (v_plan is null or coalesce(b.interested_plan,b.billing_plan,'free')=v_plan)
      and (
        v_search is null
        or lower(coalesce(b.company_name,'')) like '%'||v_search||'%'
        or lower(coalesce(b.company_slug,'')) like '%'||v_search||'%'
        or lower(coalesce(b.email,'')) like '%'||v_search||'%'
        or (length(regexp_replace(v_search,'[^0-9]','','g'))>0 and regexp_replace(coalesce(b.phone,''),'[^0-9]','','g') like '%'||regexp_replace(v_search,'[^0-9]','','g')||'%')
      )
  )
  select count(*) into v_total from filtered;

  with base as (
    select
      s.user_id,
      s.company_id,
      c.name::text as company_name,
      c.slug::text as company_slug,
      u.email::text as email,
      coalesce(ns.notification_phone,c.whatsapp_number::text)::text as phone,
      s.last_step,
      s.lead_score,
      case
        when s.purchase_started_at is not null then 'purchase'
        when s.pricing_viewed_at is not null then 'pricing'
        when s.first_receipt_at is not null then 'activated'
        when s.mp_connected_at is not null then 'connected'
        else 'account'
      end as stage,
      s.estimated_monthly_pix,
      s.estimated_ticket_cents,
      s.current_fee_type,
      s.current_fee_value,
      s.estimated_current_cost_cents,
      s.estimated_pixwiki_cost_cents,
      s.estimated_savings_cents,
      s.interested_plan,
      coalesce(b.plan,'free')::text as billing_plan,
      coalesce(b.status,'active')::text as billing_status,
      s.account_created_at,
      s.mp_connected_at,
      s.first_receipt_at,
      s.pricing_viewed_at,
      s.purchase_started_at,
      s.completed_at,
      greatest(
        s.account_created_at,s.mp_connected_at,s.pix_key_configured_at,s.first_receipt_at,
        s.link_tested_at,s.checkout_tested_at,s.api_tested_at,s.webhook_tested_at,
        s.pricing_viewed_at,s.purchase_started_at,s.completed_at,s.created_at
      ) as last_activity_at
    from public.pixwiki_v2_onboarding_state s
    left join public.companies c on c.id=s.company_id
    left join auth.users u on u.id=s.user_id
    left join public.pixwiki_notification_settings ns on ns.company_id=s.company_id
    left join public.pixwiki_v2_billing_accounts b on b.user_id=s.user_id
  ), filtered as (
    select * from base b
    where b.lead_score>=v_min_score
      and (v_stage is null or b.stage=v_stage)
      and (v_plan is null or coalesce(b.interested_plan,b.billing_plan,'free')=v_plan)
      and (
        v_search is null
        or lower(coalesce(b.company_name,'')) like '%'||v_search||'%'
        or lower(coalesce(b.company_slug,'')) like '%'||v_search||'%'
        or lower(coalesce(b.email,'')) like '%'||v_search||'%'
        or (length(regexp_replace(v_search,'[^0-9]','','g'))>0 and regexp_replace(coalesce(b.phone,''),'[^0-9]','','g') like '%'||regexp_replace(v_search,'[^0-9]','','g')||'%')
      )
  ), ordered as (
    select *
    from filtered
    order by
      case when v_sort='score_desc' then lead_score end desc nulls last,
      case when v_sort='recent_desc' then last_activity_at end desc nulls last,
      case when v_sort='volume_desc' then estimated_monthly_pix end desc nulls last,
      case when v_sort='savings_desc' then estimated_savings_cents end desc nulls last,
      lead_score desc,
      last_activity_at desc
    offset v_offset limit v_per_page
  )
  select coalesce(jsonb_agg(to_jsonb(ordered)),'[]'::jsonb)
    into v_items
  from ordered;

  select jsonb_build_object(
    'total',count(*)::bigint,
    'activated',count(*) filter(where first_receipt_at is not null)::bigint,
    'pricingViewed',count(*) filter(where pricing_viewed_at is not null)::bigint,
    'purchaseStarted',count(*) filter(where purchase_started_at is not null)::bigint,
    'declared10kPlus',count(*) filter(where coalesce(estimated_monthly_pix,0)>=10000)::bigint,
    'score80Plus',count(*) filter(where lead_score>=80)::bigint,
    'averageScore',coalesce(round(avg(lead_score)::numeric,1),0),
    'positiveSavingsCents',coalesce(sum(greatest(coalesce(estimated_savings_cents,0),0)),0)::bigint
  )
  into v_summary
  from public.pixwiki_v2_onboarding_state;

  return jsonb_build_object(
    'generatedAt',now(),
    'summary',v_summary,
    'items',v_items,
    'pagination',jsonb_build_object(
      'page',v_page,
      'perPage',v_per_page,
      'total',v_total,
      'totalPages',greatest(ceil(v_total::numeric/v_per_page::numeric)::integer,1)
    )
  );
end;
$$;

revoke all on function public.admin_pixwiki_v2_leads_page(text,text,text,integer,integer,integer,text)
  from public,anon,authenticated;
grant execute on function public.admin_pixwiki_v2_leads_page(text,text,text,integer,integer,integer,text)
  to service_role;

commit;
