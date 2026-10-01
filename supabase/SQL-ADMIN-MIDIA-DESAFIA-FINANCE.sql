-- =============================================================================
-- Admin minhAi — Financeiro com Midia.Pro + DesafIA
--
-- Já aplicado no Supabase de produção em 30/09/2026 via MCP.
-- O arquivo fica no repositório para manter o banco documentado e reproduzível.
--
-- Regras:
-- - Midia.Pro: receita BigCorps = mensalidade de tela confirmada.
--   Investimento de campanhas/anúncios NÃO é tratado aqui como receita integral.
-- - DesafIA: receita BigCorps = invoices de assinatura Plus confirmadas.
-- - MRR conta somente assinaturas pagas/ativas. Plus manual de revisão não vira MRR.
-- =============================================================================

begin;

create or replace function public.platform_revenue_events(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table(
  event_id text,
  product_key text,
  user_id uuid,
  amount_cents bigint,
  status_group text,
  kind text,
  source text,
  created_at timestamptz,
  paid_at timestamptz
)
language sql
stable
security definer
set search_path='public','auth','conviteria','pg_catalog'
as $$
  with all_events as (
    select
      'pix_payments:' || pp.id::text as event_id,
      case
        when cp.package_type = 'monthly' then 'minhai'
        when cp.package_type = 'melhoria' then 'melhoria'
        when cp.package_type = 'credits' then 'shared_credits'
        else 'shared_credits'
      end as product_key,
      pp.user_id,
      pp.amount_cents::bigint as amount_cents,
      case
        when lower(coalesce(pp.status,'')) in ('paid','pago','approved','confirmed','processed') then 'paid'
        when lower(coalesce(pp.status,'')) in ('pending','pendente','open','created','awaiting_payment','waiting') then 'pending'
        when lower(coalesce(pp.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        else 'other'
      end as status_group,
      case when cp.package_type = 'monthly' then 'assinatura' else 'créditos' end as kind,
      'pix_payments'::text as source,
      pp.created_at,
      pp.paid_at
    from public.pix_payments pp
    left join public.credits_packages cp on cp.id = pp.package_id

    union all

    select
      'funcionaria_invoices:' || fi.id::text,
      'funcionaria',
      fi.user_id,
      fi.amount_cents::bigint,
      case
        when lower(coalesce(fi.status,'')) in ('paid','pago','approved','confirmed','processed') then 'paid'
        when lower(coalesce(fi.status,'')) in ('pending','pendente','open','created','awaiting_payment','waiting') then 'pending'
        when lower(coalesce(fi.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        else 'other'
      end,
      coalesce(fi.invoice_type,'assinatura'),
      'funcionaria_invoices',
      fi.created_at,
      fi.paid_at
    from public.funcionaria_invoices fi

    union all

    select
      'pixwiki_invoices:' || pi.id::text,
      'pixwiki',
      pi.user_id,
      pi.amount_cents::bigint,
      case
        when lower(coalesce(pi.status,'')) in ('paid','pago','approved','confirmed','processed') then 'paid'
        when lower(coalesce(pi.status,'')) in ('pending','pendente','open','created','awaiting_payment','waiting') then 'pending'
        when lower(coalesce(pi.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        else 'other'
      end,
      'assinatura',
      'pixwiki_invoices',
      pi.created_at,
      pi.paid_at
    from public.pixwiki_invoices pi

    union all

    select
      'conviteia_mensalidades:' || cm.id::text,
      'conviteia',
      cc.user_id,
      cm.valor_centavos::bigint,
      case
        when lower(coalesce(cm.status,'')) in ('paid','pago','approved','confirmed','processed') then 'paid'
        when lower(coalesce(cm.status,'')) in ('pending','pendente','open','created','awaiting_payment','waiting') then 'pending'
        when lower(coalesce(cm.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        else 'other'
      end,
      'assinatura',
      'conviteria.mensalidades',
      cm.created_at,
      cm.pago_em
    from conviteria.mensalidades cm
    join conviteria.contas cc on cc.id = cm.conta_id

    union all

    select
      'conviteia_pix:' || pt.id::text,
      'conviteia',
      cc.user_id,
      pt.amount_cents::bigint,
      case
        when lower(coalesce(pt.status,'')) in ('paid','pago','approved','confirmed','processed','transferred') then 'paid'
        when lower(coalesce(pt.status,'')) in ('pending','pendente','open','created','awaiting_payment','waiting') then 'pending'
        when lower(coalesce(pt.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        else 'other'
      end,
      case
        when coalesce(pt.notes,'') ilike '%+ Memórias do Evento%' then 'convite + memórias'
        when coalesce(pt.notes,'') ilike 'Memórias do Evento%' then 'memórias'
        else 'convite avulso'
      end,
      'pix_transactions.conviteria_convite',
      pt.created_at,
      pt.confirmed_at
    from public.pix_transactions pt
    join conviteria.eventos ce on ce.id::text = pt.referencia_id
    join conviteria.contas cc on cc.id = ce.conta_id
    where pt.origem = 'conviteria'
      and pt.purpose = 'conviteria_convite'

    union all

    select
      'conviteia_gift_fee:' || pc.id::text,
      'conviteia',
      cc.user_id,
      greatest(0,coalesce(pc.taxa_centavos,0))::bigint,
      case
        when lower(coalesce(pc.status,'')) in ('paid','pago','approved','confirmed','processed') then 'paid'
        when lower(coalesce(pt.status,'')) in ('paid','pago','approved','confirmed','processed','transferred') then 'paid'
        when lower(coalesce(pt.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        when lower(coalesce(pc.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        when lower(coalesce(pc.status,'')) in ('pending','pendente','open','created','awaiting_payment','waiting') then 'pending'
        else 'other'
      end,
      'taxa de presente',
      'conviteria.presente_checkouts.taxa',
      pc.created_at,
      case
        when lower(coalesce(pc.status,'')) in ('paid','pago','approved','confirmed','processed')
          or lower(coalesce(pt.status,'')) in ('paid','pago','approved','confirmed','processed','transferred')
        then coalesce(pc.pago_em,pt.confirmed_at,pc.created_at)
        else null
      end
    from conviteria.presente_checkouts pc
    join conviteria.eventos ce on ce.id = pc.evento_id
    join conviteria.contas cc on cc.id = ce.conta_id
    left join public.pix_transactions pt on pt.id = pc.pix_transaction_id
    where coalesce(pc.taxa_centavos,0) > 0

    union all

    select
      'consultatec_pix:' || pt.id::text,
      'consultatec',
      coalesce(pt.user_id, ct_company.user_id),
      pt.amount_cents::bigint,
      case
        when lower(coalesce(pt.status,'')) in ('paid','pago','approved','confirmed','processed','transferred') then 'paid'
        when lower(coalesce(pt.status,'')) in ('pending','pendente','open','created','awaiting_payment','waiting') then 'pending'
        when lower(coalesce(pt.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        else 'other'
      end,
      case
        when pt.origem = 'consultatec_topup' then 'recarga de saldo'
        else 'consulta avulsa'
      end,
      case
        when pt.origem = 'consultatec_topup' then 'pix_transactions.consultatec_topup'
        else 'pix_transactions.consulta_fee'
      end,
      pt.created_at,
      pt.confirmed_at
    from public.pix_transactions pt
    left join public.companies ct_company on ct_company.id = pt.company_id
    where
      (
        pt.purpose = 'consulta_fee'
        and (
          pt.origem = 'consultatec'
          or (pt.origem is null and ct_company.segment_key = 'consultatec')
        )
      )
      or (
        pt.purpose = 'payment'
        and pt.origem = 'consultatec_topup'
      )

    union all

    select
      'midia_screen_plan:' || spp.id::text,
      'midia',
      mp.user_id,
      spp.amount_cents::bigint,
      case
        when lower(coalesce(spp.status,'')) in ('paid','pago','approved','confirmed','processed') then 'paid'
        when lower(coalesce(spp.status,'')) in ('pending','pendente','open','created','awaiting_payment','waiting') then 'pending'
        when lower(coalesce(spp.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        else 'other'
      end,
      'assinatura de tela',
      'midia.screen_plan_payments',
      spp.created_at,
      spp.confirmed_at
    from midia.screen_plan_payments spp
    join midia.publishers mp on mp.id = spp.publisher_id

    union all

    select
      'desafia_invoices:' || di.id::text,
      'desafia',
      di.user_id,
      di.amount_cents::bigint,
      case
        when lower(coalesce(di.status,'')) in ('paid','pago','approved','confirmed','processed') then 'paid'
        when lower(coalesce(di.status,'')) in ('pending','pendente','open','created','awaiting_payment','waiting') then 'pending'
        when lower(coalesce(di.status,'')) in ('failed','cancelled','canceled','expired','expirado','rejected') then 'failed'
        else 'other'
      end,
      'assinatura Plus',
      'desafia.billing_invoices',
      di.created_at,
      di.paid_at
    from desafia.billing_invoices di
  )
  select *
  from all_events e
  where (p_from is null or coalesce(e.paid_at,e.created_at) >= p_from)
    and (p_to is null or coalesce(e.paid_at,e.created_at) < p_to)
$$;

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

-- Os snapshots têm listas fixas de produtos. Atualizamos somente essas listas,
-- preservando o restante da definição atual das funções.
do $$
declare
  v_signature text;
  v_definition text;
  v_patched text;
begin
  v_signature := 'public.admin_platform_dashboard_snapshot(integer)';
  select pg_get_functiondef(v_signature::regprocedure::oid) into v_definition;
  if v_definition not like '%''desafia''%' then
    v_patched := replace(
      v_definition,
      '(''consultatec'',5),(''conviteia'',6),(''melhoria'',7),(''funcionaria'',8)',
      '(''consultatec'',5),(''conviteia'',6),(''melhoria'',7),(''funcionaria'',8),(''midia'',9),(''desafia'',10)'
    );
    if v_patched = v_definition then raise exception 'Não foi possível atualizar dashboard_snapshot'; end if;
    execute v_patched;
  end if;

  v_signature := 'public.admin_platform_finance_snapshot(integer)';
  select pg_get_functiondef(v_signature::regprocedure::oid) into v_definition;
  if v_definition not like '%(''desafia'',10)%' then
    v_patched := replace(
      v_definition,
      '(''conviteia'',6),(''melhoria'',7),(''funcionaria'',8),(''shared_credits'',9)',
      '(''conviteia'',6),(''melhoria'',7),(''funcionaria'',8),(''midia'',9),(''desafia'',10),(''shared_credits'',11)'
    );
    if v_patched = v_definition then raise exception 'Não foi possível atualizar finance_snapshot'; end if;
    execute v_patched;
  end if;

  v_signature := 'public.admin_platform_margin_snapshot()';
  select pg_get_functiondef(v_signature::regprocedure::oid) into v_definition;
  if v_definition not like '%(''desafia'',10)%' then
    v_patched := replace(
      v_definition,
      '(''conviteia'',6),(''melhoria'',7),(''funcionaria'',8),(''shared_credits'',9)',
      '(''conviteia'',6),(''melhoria'',7),(''funcionaria'',8),(''midia'',9),(''desafia'',10),(''shared_credits'',11)'
    );
    if v_patched = v_definition then raise exception 'Não foi possível atualizar margin_snapshot'; end if;
    execute v_patched;
  end if;
end
$$;

commit;

notify pgrst, 'reload schema';
