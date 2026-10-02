-- =============================================================================
-- PixWiki V2 — Gate 6
-- Dashboard V2, uso/franquia, previsão e canais de notificação
--
-- PRÉ-REQUISITOS: Gates 1 a 5 aplicados nesta ordem.
--
-- IMPORTANTE
-- - Não ativa cobrança nem migra assinaturas neste gate.
-- - O plano V2 ausente continua sendo interpretado como PIX GRÁTIS.
-- - Push permanece gratuito; e-mail/WhatsApp/webhook compartilham a unidade
--   de automação do recebimento (orquestração na Edge Function deste gate).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Lista de empresas sem feature-gate legado.
--    Owner e manager podem operar o dashboard completo; cashier ficará em uma
--    experiência mínima própria no Gate 7.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_list_my_companies()
returns table(
  id uuid,
  name text,
  slug text,
  logo_url text,
  whatsapp_number varchar,
  email_contato text,
  pix_key text,
  pix_key_type text,
  mp_connection_id uuid,
  mp_connected boolean,
  notification_email text,
  notification_phone text,
  email_enabled boolean,
  push_enabled boolean,
  whatsapp_enabled boolean,
  is_primary boolean,
  plan_access boolean
)
language sql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
  with allowed as (
    select c.id,c.name,c.slug,c.logo_url,c.whatsapp_number,c.email_contato,c.user_id,c.created_at
    from public.companies c
    where c.segment_key='pix_wiki'
      and c.is_active=true
      and (
        c.user_id=auth.uid()
        or exists(
          select 1 from public.company_admins ca
          where ca.company_id=c.id
            and ca.user_id=auth.uid()
            and ca.role in ('owner','manager')
        )
      )
  ), first_company as (
    select a.id
    from allowed a
    order by (a.user_id=auth.uid()) desc,a.created_at asc,a.id asc
    limit 1
  )
  select
    a.id,a.name,a.slug,a.logo_url,a.whatsapp_number,a.email_contato,
    ps.pix_key,ps.pix_key_type,ps.mp_connection_id,
    coalesce(mc.is_active,false) as mp_connected,
    ns.notification_email,ns.notification_phone,
    coalesce(ns.email_enabled,false) as email_enabled,
    coalesce(ns.push_enabled,true) as push_enabled,
    coalesce(ns.whatsapp_enabled,false) as whatsapp_enabled,
    a.id=(select id from first_company) as is_primary,
    true as plan_access
  from allowed a
  left join public.pixwiki_payment_settings ps on ps.company_id=a.id
  left join public.pixwiki_mp_connections mc on mc.id=ps.mp_connection_id and mc.company_id=a.id
  left join public.pixwiki_notification_settings ns on ns.company_id=a.id
  order by a.created_at asc,a.id asc;
$$;

revoke all on function public.pixwiki_list_my_companies() from public,anon;
grant execute on function public.pixwiki_list_my_companies() to authenticated;

-- -----------------------------------------------------------------------------
-- 2) Snapshot único do dashboard.
--    Não retorna token Mercado Pago, provider_metadata, payer nem segredos.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_dashboard_snapshot(p_company_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_company public.companies;
  v_owner_id uuid;
  v_role text;
  v_plan text := 'free';
  v_interval text := 'monthly';
  v_billing_status text := 'active';
  v_allow_overage boolean := false;
  v_spending_limit integer;
  v_complimentary boolean := false;
  v_included integer := 100;
  v_overage_price integer := 79;
  v_base_price integer := 0;
  v_used integer := 0;
  v_credit integer := 0;
  v_period_start date;
  v_period_end date;
  v_local_now timestamp;
  v_today date;
  v_today_start timestamptz;
  v_month_start timestamptz;
  v_days_in_month integer;
  v_day_no integer;
  v_projected integer := 0;
  v_best_plan text := 'free';
  v_best_plan_name text := 'PIX GRÁTIS';
  v_best_cost bigint := 0;
  v_current_projected_cost bigint := 0;
  v_companies jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_origins jsonb := '{}'::jsonb;
  v_stats jsonb := '{}'::jsonb;
  v_settings jsonb := '{}'::jsonb;
  v_setup jsonb := '{}'::jsonb;
  v_used_pct numeric := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  -- Seleciona empresa explicitamente ou a primeira acessível como owner/manager.
  if p_company_id is not null then
    select c.* into v_company
    from public.companies c
    where c.id=p_company_id
      and c.segment_key='pix_wiki'
      and c.is_active=true
      and (
        c.user_id=v_uid
        or exists(
          select 1 from public.company_admins ca
          where ca.company_id=c.id and ca.user_id=v_uid and ca.role in ('owner','manager')
        )
      );
  else
    select c.* into v_company
    from public.companies c
    where c.segment_key='pix_wiki'
      and c.is_active=true
      and (
        c.user_id=v_uid
        or exists(
          select 1 from public.company_admins ca
          where ca.company_id=c.id and ca.user_id=v_uid and ca.role in ('owner','manager')
        )
      )
    order by (c.user_id=v_uid) desc,c.created_at asc,c.id asc
    limit 1;
  end if;

  if v_company.id is null then raise exception 'company_not_found'; end if;
  v_owner_id := v_company.user_id;
  v_role := case when v_owner_id=v_uid then 'owner' else public.pixwiki_company_access_role(v_company.id) end;
  if v_role not in ('owner','manager') then raise exception 'company_not_allowed'; end if;

  select
    coalesce(b.plan,'free'),coalesce(b.billing_interval,'monthly'),coalesce(b.status,'active'),
    coalesce(b.allow_overage,false),b.spending_limit_cents,coalesce(b.complimentary,false)
  into v_plan,v_interval,v_billing_status,v_allow_overage,v_spending_limit,v_complimentary
  from (select 1) x
  left join public.pixwiki_v2_billing_accounts b on b.user_id=v_owner_id;

  select c.included_automations,c.overage_price_cents,c.monthly_price_cents
  into v_included,v_overage_price,v_base_price
  from public.pixwiki_v2_plan_catalog c
  where c.plan=v_plan and c.is_active=true;

  if v_included is null then
    v_plan := 'free';
    select c.included_automations,c.overage_price_cents,c.monthly_price_cents
    into v_included,v_overage_price,v_base_price
    from public.pixwiki_v2_plan_catalog c where c.plan='free';
  end if;

  v_local_now := timezone('America/Sao_Paulo',now());
  v_today := v_local_now::date;
  v_period_start := date_trunc('month',v_local_now)::date;
  v_period_end := (v_period_start+interval '1 month')::date;
  v_today_start := (v_today::timestamp at time zone 'America/Sao_Paulo');
  v_month_start := (v_period_start::timestamp at time zone 'America/Sao_Paulo');
  v_day_no := greatest(1,extract(day from v_local_now)::integer);
  v_days_in_month := extract(day from (v_period_end-interval '1 day'))::integer;

  select coalesce(u.used_units,0),coalesce(u.convenience_credit_cents,0)
  into v_used,v_credit
  from public.pixwiki_v2_usage_periods u
  where u.user_id=v_owner_id and u.period_start=v_period_start;
  v_used := coalesce(v_used,0);
  v_credit := coalesce(v_credit,0);
  v_projected := case when v_used=0 then 0 else ceil(v_used::numeric*v_days_in_month::numeric/v_day_no::numeric)::integer end;
  v_used_pct := case when v_included<=0 then 0 else round((v_used::numeric*100)/v_included,1) end;

  select q.plan,q.plan_name,q.total_price_cents
  into v_best_plan,v_best_plan_name,v_best_cost
  from public.pixwiki_v2_quote_monthly_usage(v_projected) q
  where q.is_best_price=true
  order by q.total_price_cents,q.plan
  limit 1;

  select q.total_price_cents into v_current_projected_cost
  from public.pixwiki_v2_quote_monthly_usage(v_projected) q
  where q.plan=v_plan
  limit 1;

  -- Empresas acessíveis, sem qualquer token/segredo.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'name',x.name,'slug',x.slug,'logo_url',x.logo_url,
    'is_primary',x.id=v_company.id,'role',x.role
  ) order by x.created_at,x.id),'[]'::jsonb)
  into v_companies
  from (
    select distinct on(c.id)
      c.id,c.name,c.slug,c.logo_url,c.created_at,
      case when c.user_id=v_uid then 'owner' else ca.role end as role
    from public.companies c
    left join public.company_admins ca on ca.company_id=c.id and ca.user_id=v_uid
    where c.segment_key='pix_wiki' and c.is_active=true
      and (c.user_id=v_uid or ca.role in ('owner','manager'))
    order by c.id,(c.user_id=v_uid) desc
  ) x;

  -- Configurações e saúde operacional.
  select jsonb_build_object(
    'notification_email',ns.notification_email,
    'notification_phone',ns.notification_phone,
    'email_enabled',coalesce(ns.email_enabled,false),
    'push_enabled',coalesce(ns.push_enabled,true),
    'whatsapp_enabled',coalesce(ns.whatsapp_enabled,false)
  ) into v_settings
  from (select 1) x
  left join public.pixwiki_notification_settings ns on ns.company_id=v_company.id;

  select jsonb_build_object(
    'mp_connected',coalesce(mc.is_active,false),
    'pix_key_configured',coalesce(length(trim(ps.pix_key)),0)>0,
    'pix_key_type',ps.pix_key_type,
    'pix_key_masked',case
      when ps.pix_key is null or length(trim(ps.pix_key))=0 then null
      when length(ps.pix_key)<=6 then repeat('•',greatest(length(ps.pix_key)-2,1))||right(ps.pix_key,2)
      else left(ps.pix_key,2)||repeat('•',greatest(length(ps.pix_key)-6,2))||right(ps.pix_key,4)
    end,
    'onboarding_completed',exists(
      select 1 from public.pixwiki_v2_onboarding_state s
      where s.user_id=v_owner_id and s.company_id=v_company.id and s.completed_at is not null
    )
  ) into v_setup
  from (select 1) x
  left join public.pixwiki_payment_settings ps on ps.company_id=v_company.id
  left join public.pixwiki_mp_connections mc on mc.id=ps.mp_connection_id and mc.company_id=v_company.id;

  -- Estatísticas reais de recebimentos (não de automações).
  select jsonb_build_object(
    'last_hour_count',count(*) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=now()-interval '1 hour'),
    'last_hour_cents',coalesce(sum(r.amount_cents) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=now()-interval '1 hour'),0),
    'today_count',count(*) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=v_today_start),
    'today_cents',coalesce(sum(r.amount_cents) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=v_today_start),0),
    'month_count',count(*) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=v_month_start),
    'month_cents',coalesce(sum(r.amount_cents) filter(where coalesce(r.date_approved,r.date_created,r.created_at)>=v_month_start),0)
  ) into v_stats
  from public.mp_received_payments r
  where r.company_id=v_company.id and r.status='approved';

  -- Origem das automações no período (cada receipt no máximo 1 unidade).
  select jsonb_build_object(
    'pix_key',coalesce(sum(e.units) filter(where e.origin='pix_key'),0),
    'pix_link',coalesce(sum(e.units) filter(where e.origin='pix_link'),0),
    'checkout',coalesce(sum(e.units) filter(where e.origin='checkout'),0),
    'api',coalesce(sum(e.units) filter(where e.origin='api'),0)
  ) into v_origins
  from public.pixwiki_v2_usage_events e
  where e.user_id=v_owner_id
    and e.is_test=false
    and e.occurred_at>=v_month_start
    and e.occurred_at<((v_period_end::timestamp) at time zone 'America/Sao_Paulo');

  -- Últimos recebimentos com origem V2 canônica.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'amount_cents',r.amount_cents,'fee_amount_cents',coalesce(r.fee_amount_cents,0),
    'net_amount_cents',coalesce(r.net_amount_cents,r.amount_cents-coalesce(r.fee_amount_cents,0)),
    'source',case when s.id is not null then s.origin when r.source='pixwiki_link' then 'pix_link' else 'pix_key' end,
    'received_at',coalesce(r.date_approved,r.date_created,r.created_at),
    'checkout_id',s.id,'external_id',s.external_id
  ) order by coalesce(r.date_approved,r.date_created,r.created_at) desc),'[]'::jsonb)
  into v_recent
  from (
    select r.* from public.mp_received_payments r
    where r.company_id=v_company.id and r.status='approved'
    order by coalesce(r.date_approved,r.date_created,r.created_at) desc
    limit 8
  ) r
  left join lateral (
    select cs.id,cs.origin,cs.external_id
    from public.pixwiki_v2_checkout_sessions cs
    where cs.company_id=r.company_id
      and (cs.receipt_id=r.id or (cs.provider_payment_id is not null and r.mp_payment_id is not null and cs.provider_payment_id=r.mp_payment_id))
    order by cs.paid_at desc nulls last,cs.created_at desc
    limit 1
  ) s on true;

  return jsonb_build_object(
    'company',jsonb_build_object(
      'id',v_company.id,'name',v_company.name,'slug',v_company.slug,'logo_url',v_company.logo_url,'role',v_role
    ),
    'companies',v_companies,
    'billing',jsonb_build_object(
      'plan',v_plan,'billing_interval',v_interval,'status',v_billing_status,
      'allow_overage',v_allow_overage,'spending_limit_cents',v_spending_limit,
      'complimentary',v_complimentary,'base_price_cents',v_base_price,
      'overage_price_cents',v_overage_price
    ),
    'usage',jsonb_build_object(
      'period_start',v_period_start,'period_end',v_period_end,'used_units',v_used,
      'included_automations',v_included,'remaining_units',greatest(v_included-v_used,0),
      'used_percent',v_used_pct,'overage_units',greatest(v_used-v_included,0),
      'convenience_credit_cents',v_credit,'origins',v_origins,
      'threshold',case when v_used>=v_included then 'limit' when v_used_pct>=85 then 'critical' when v_used_pct>=70 then 'warning' else 'ok' end
    ),
    'projection',jsonb_build_object(
      'projected_units',v_projected,'days_elapsed',v_day_no,'days_in_month',v_days_in_month,
      'days_remaining',greatest(v_days_in_month-v_day_no,0),
      'best_plan',coalesce(v_best_plan,'free'),'best_plan_name',coalesce(v_best_plan_name,'PIX GRÁTIS'),
      'best_cost_cents',coalesce(v_best_cost,0),'current_plan_projected_cost_cents',coalesce(v_current_projected_cost,0),
      'potential_savings_cents',greatest(coalesce(v_current_projected_cost,0)-coalesce(v_best_cost,0),0)
    ),
    'notifications',coalesce(v_settings,'{}'::jsonb),
    'setup',coalesce(v_setup,'{}'::jsonb),
    'stats',coalesce(v_stats,'{}'::jsonb),
    'recent_receipts',coalesce(v_recent,'[]'::jsonb),
    'generated_at',now()
  );
end;
$$;

revoke all on function public.pixwiki_v2_dashboard_snapshot(uuid) from public,anon;
grant execute on function public.pixwiki_v2_dashboard_snapshot(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Atualização segura dos canais.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_update_notification_settings(
  p_company_id uuid,
  p_email text,
  p_email_enabled boolean,
  p_push_enabled boolean,
  p_phone text,
  p_whatsapp_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_company public.companies;
  v_role text;
  v_email text := nullif(trim(coalesce(p_email,'')),'');
  v_phone text := nullif(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'),'');
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select c.* into v_company
  from public.companies c
  where c.id=p_company_id and c.segment_key='pix_wiki' and c.is_active=true;
  if v_company.id is null then raise exception 'company_not_found'; end if;

  v_role := case when v_company.user_id=v_uid then 'owner' else public.pixwiki_company_access_role(v_company.id) end;
  if v_role not in ('owner','manager') then raise exception 'company_not_allowed'; end if;

  if coalesce(p_email_enabled,false) and (v_email is null or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'invalid_notification_email';
  end if;
  if coalesce(p_whatsapp_enabled,false) and (v_phone is null or length(v_phone)<10 or length(v_phone)>15) then
    raise exception 'invalid_notification_phone';
  end if;

  insert into public.pixwiki_notification_settings(
    company_id,user_id,notification_email,notification_phone,email_enabled,push_enabled,whatsapp_enabled,updated_at
  ) values(
    v_company.id,v_company.user_id,v_email,v_phone,coalesce(p_email_enabled,false),coalesce(p_push_enabled,true),coalesce(p_whatsapp_enabled,false),now()
  )
  on conflict(company_id) do update set
    user_id=excluded.user_id,
    notification_email=excluded.notification_email,
    notification_phone=excluded.notification_phone,
    email_enabled=excluded.email_enabled,
    push_enabled=excluded.push_enabled,
    whatsapp_enabled=excluded.whatsapp_enabled,
    updated_at=now();

  update public.companies
  set email_contato=coalesce(v_email,email_contato),
      whatsapp_number=coalesce(v_phone,whatsapp_number),
      updated_at=now()
  where id=v_company.id;

  return jsonb_build_object(
    'notification_email',v_email,'notification_phone',v_phone,
    'email_enabled',coalesce(p_email_enabled,false),
    'push_enabled',coalesce(p_push_enabled,true),
    'whatsapp_enabled',coalesce(p_whatsapp_enabled,false)
  );
end;
$$;

revoke all on function public.pixwiki_v2_update_notification_settings(uuid,text,boolean,boolean,text,boolean) from public,anon;
grant execute on function public.pixwiki_v2_update_notification_settings(uuid,text,boolean,boolean,text,boolean) to authenticated;

-- A partir deste gate, alterações de canal passam pelo RPC acima.
revoke insert,update,delete on public.pixwiki_notification_settings from authenticated;

-- -----------------------------------------------------------------------------
-- 4) Relatórios V2: disponíveis em todos os planos e com quatro origens.
-- -----------------------------------------------------------------------------
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
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_start timestamptz;
  v_end timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_start_date is null or p_end_date is null or p_end_date<p_start_date then raise exception 'invalid_period'; end if;
  if (p_end_date-p_start_date)>366 then raise exception 'period_too_large'; end if;
  if p_source not in ('all','pix_key','pix_link','checkout','api') then raise exception 'invalid_source'; end if;

  if p_company_id is not null and not exists(
    select 1 from public.companies c
    where c.id=p_company_id and c.segment_key='pix_wiki'
      and (c.user_id=v_uid or exists(
        select 1 from public.company_admins ca where ca.company_id=c.id and ca.user_id=v_uid and ca.role in ('owner','manager')
      ))
  ) then raise exception 'company_not_allowed'; end if;

  v_start := (p_start_date::timestamp at time zone 'America/Sao_Paulo');
  v_end := ((p_end_date+1)::timestamp at time zone 'America/Sao_Paulo');

  return query
  select
    r.id,r.company_id,c.name::text,r.mp_payment_id::text,r.amount_cents,
    coalesce(r.fee_amount_cents,0)::integer,
    coalesce(r.net_amount_cents,r.amount_cents-coalesce(r.fee_amount_cents,0))::integer,
    r.status::text,
    (case when s.id is not null then s.origin when r.source='pixwiki_link' then 'pix_link' else 'pix_key' end)::text,
    'mercadopago'::text,
    coalesce(r.date_approved,r.date_created,r.created_at)
  from public.mp_received_payments r
  join public.companies c on c.id=r.company_id
  left join lateral (
    select cs.id,cs.origin
    from public.pixwiki_v2_checkout_sessions cs
    where cs.company_id=r.company_id
      and (cs.receipt_id=r.id or (cs.provider_payment_id is not null and r.mp_payment_id is not null and cs.provider_payment_id=r.mp_payment_id))
    order by cs.paid_at desc nulls last,cs.created_at desc
    limit 1
  ) s on true
  where r.status='approved'
    and c.segment_key='pix_wiki'
    and (c.user_id=v_uid or exists(
      select 1 from public.company_admins ca where ca.company_id=c.id and ca.user_id=v_uid and ca.role in ('owner','manager')
    ))
    and (p_company_id is null or r.company_id=p_company_id)
    and (p_source='all' or (case when s.id is not null then s.origin when r.source='pixwiki_link' then 'pix_link' else 'pix_key' end)=p_source)
    and coalesce(r.date_approved,r.date_created,r.created_at)>=v_start
    and coalesce(r.date_approved,r.date_created,r.created_at)<v_end
  order by coalesce(r.date_approved,r.date_created,r.created_at) desc;
end;
$$;

revoke all on function public.pixwiki_report_receipts(uuid,text,date,date) from public,anon;
grant execute on function public.pixwiki_report_receipts(uuid,text,date,date) to authenticated;

commit;
notify pgrst,'reload schema';
