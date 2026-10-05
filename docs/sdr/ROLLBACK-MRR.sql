-- Run only if reverting the financial correction. Restores the previous calculation.
create or replace function public.platform_active_subscriptions()
returns table(
  product_key text,
  user_id uuid,
  monthly_value_cents bigint,
  period_end timestamptz,
  status text
)
language sql
stable
security definer
set search_path='public','auth','conviteria','pg_catalog'
as $$
  select
    'minhai', uc.user_id,
    coalesce(cp.price_cents,0)::bigint,
    uc.plan_expires_at,
    'active'
  from public.user_credits uc
  left join public.credits_packages cp on cp.id = uc.active_plan_id
  where uc.has_active_plan is true
    and uc.plan_expires_at is not null
    and uc.plan_expires_at > now()

  union all

  select
    'pixwiki', ps.user_id,
    coalesce(pc.price_cents,0)::bigint,
    ps.current_period_end,
    coalesce(ps.status,'active')
  from public.pixwiki_subscriptions ps
  left join public.pixwiki_plan_catalog pc on pc.plan = ps.plan
  where lower(coalesce(ps.status,'')) in ('active','trialing','paid','grace')
    and (ps.current_period_end is null or ps.current_period_end > now())

  union all

  select
    'funcionaria', fs.user_id,
    coalesce((
      select sum(sc.monthly_price_cents)::bigint
      from unnest(coalesce(fs.current_skill_keys,array[]::text[])) k(skill_key)
      join public.funcionaria_skill_catalog sc on sc.skill_key = k.skill_key
      where sc.is_active is true
    ),0)::bigint,
    fs.current_period_end,
    coalesce(fs.status,'active')
  from public.funcionaria_subscriptions fs
  where lower(coalesce(fs.status,'')) in ('active','trialing','paid','grace','free')
    and (fs.current_period_end is null or fs.current_period_end > now())

  union all

  select
    'conviteia', cc.user_id,
    coalesce(last_paid.valor_centavos,0)::bigint,
    cc.plano_expira_em,
    'active'
  from conviteria.contas cc
  left join lateral (
    select cm.valor_centavos
    from conviteria.mensalidades cm
    where cm.conta_id = cc.id
      and lower(coalesce(cm.status,'')) in ('pago','paid','approved')
    order by coalesce(cm.pago_em,cm.created_at) desc
    limit 1
  ) last_paid on true
  where cc.plano_expira_em is not null
    and cc.plano_expira_em > now()

  union all

  select
    'midia',
    mp.user_id,
    coalesce(pc.monthly_price_cents,0)::bigint,
    ms.billing_current_period_end,
    'active'
  from midia.screens ms
  join midia.publishers mp on mp.id = ms.publisher_id
  join midia.screen_plan_catalog pc on pc.plan_key = ms.plan_key
  where coalesce(pc.monthly_price_cents,0) > 0
    and ms.billing_status = 'active'
    and (ms.billing_current_period_end is null or ms.billing_current_period_end > now())

  union all

  select
    'desafia',
    owner_user.user_id,
    coalesce(last_paid.amount_cents,
      case when ds.plan_code='plus_monthly' then 1990 else 0 end
    )::bigint,
    ds.current_period_end,
    coalesce(ds.status,'active')
  from desafia.subscriptions ds
  join lateral (
    select fm.user_id
    from desafia.family_members fm
    where fm.family_id = ds.family_id
      and fm.user_id is not null
    order by case when fm.role='owner' then 0 else 1 end, fm.created_at
    limit 1
  ) owner_user on true
  left join lateral (
    select bi.amount_cents
    from desafia.billing_invoices bi
    where bi.family_id = ds.family_id
      and lower(coalesce(bi.status,'')) in ('paid','pago','approved','confirmed','processed')
    order by coalesce(bi.paid_at,bi.updated_at,bi.created_at) desc
    limit 1
  ) last_paid on true
  where lower(coalesce(ds.status,'')) in ('active','trialing','paid','grace')
    and (ds.current_period_end is null or ds.current_period_end > now())
$$;