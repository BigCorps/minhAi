-- =============================================================================
-- PixWiki V2 — Gate 4
-- API V2 + Webhooks enriquecidos
--
-- PRÉ-REQUISITOS
-- - Gate 1: fundação V2
-- - Gate 2: motor universal de pagamentos
-- - Gate 3: checkout público / Pix Link V2
--
-- OBJETIVOS
-- - Dar à API server-to-server um caminho próprio, sem depender de auth.uid().
-- - Expor origem canônica: pix_key | pix_link | checkout | api.
-- - Enriquecer receipts/checkouts com external_id, customer e metadata.
-- - Versionar o contrato de webhook e manter assinatura HMAC/idempotência.
-- - Permitir API/Webhooks em qualquer plano V2; cobrança é por automação, não feature gate.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Índices de contexto do Checkout
-- -----------------------------------------------------------------------------
create index if not exists pixwiki_v2_checkout_receipt_idx
  on public.pixwiki_v2_checkout_sessions(receipt_id)
  where receipt_id is not null;

create index if not exists pixwiki_v2_checkout_company_external_idx
  on public.pixwiki_v2_checkout_sessions(company_id,external_id,created_at desc)
  where external_id is not null;

-- -----------------------------------------------------------------------------
-- 2) Metadados versionados dos eventos de Webhook
-- -----------------------------------------------------------------------------
alter table public.pixwiki_webhook_events
  add column if not exists api_version text,
  add column if not exists checkout_id uuid,
  add column if not exists external_id text,
  add column if not exists origin text;

update public.pixwiki_webhook_events
set api_version='legacy-v1'
where api_version is null;

alter table public.pixwiki_webhook_events
  alter column api_version set default '2026-10-01',
  alter column api_version set not null;

-- FK é adicionada separadamente para ser idempotente.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname='pixwiki_webhook_events_checkout_id_fkey'
      and conrelid='public.pixwiki_webhook_events'::regclass
  ) then
    alter table public.pixwiki_webhook_events
      add constraint pixwiki_webhook_events_checkout_id_fkey
      foreign key(checkout_id)
      references public.pixwiki_v2_checkout_sessions(id)
      on delete set null;
  end if;
end
$$;

-- Constraints novas somente para valores V2. Eventos antigos continuam válidos.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='pixwiki_webhook_events_api_version_check'
      and conrelid='public.pixwiki_webhook_events'::regclass
  ) then
    alter table public.pixwiki_webhook_events
      add constraint pixwiki_webhook_events_api_version_check
      check (api_version in ('legacy-v1','2026-10-01'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='pixwiki_webhook_events_origin_check'
      and conrelid='public.pixwiki_webhook_events'::regclass
  ) then
    alter table public.pixwiki_webhook_events
      add constraint pixwiki_webhook_events_origin_check
      check (origin is null or origin in ('pix_key','pix_link','checkout','api'));
  end if;
end
$$;

create index if not exists pixwiki_webhook_events_checkout_idx
  on public.pixwiki_webhook_events(checkout_id,created_at desc)
  where checkout_id is not null;

create index if not exists pixwiki_webhook_events_external_idx
  on public.pixwiki_webhook_events(user_id,external_id,created_at desc)
  where external_id is not null;

-- Mantém eventos/segredos/deliveries como objetos internos. O dashboard acessa via
-- pixwiki-api-admin, nunca diretamente pelo cliente.
revoke all on public.pixwiki_webhook_events from public, anon, authenticated;
revoke all on public.pixwiki_webhook_deliveries from public, anon, authenticated;
revoke all on public.pixwiki_webhook_secrets from public, anon, authenticated;
grant all on public.pixwiki_webhook_events to service_role;
grant all on public.pixwiki_webhook_deliveries to service_role;
grant all on public.pixwiki_webhook_secrets to service_role;


-- -----------------------------------------------------------------------------
-- 2.1) Correlação de suporte na API
-- -----------------------------------------------------------------------------
alter table public.pixwiki_api_request_logs
  add column if not exists request_id uuid,
  add column if not exists api_version text;

update public.pixwiki_api_request_logs
set api_version='legacy-v1'
where api_version is null;

alter table public.pixwiki_api_request_logs
  alter column api_version set default '2026-10-01',
  alter column api_version set not null;

create unique index if not exists pixwiki_api_request_logs_request_uidx
  on public.pixwiki_api_request_logs(request_id)
  where request_id is not null;

-- -----------------------------------------------------------------------------
-- 3) Fonte interna da API: receipts enriquecidos e paginados
--
-- Esta função é deliberadamente service_role-only. Ela recebe p_user_id porque a
-- autenticação por API Key já foi feita na Edge Function; nunca fica exposta a
-- anon/authenticated.
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_api_receipts_internal(
  p_user_id uuid,
  p_receipt_id uuid default null,
  p_company_id uuid default null,
  p_source text default 'all',
  p_status text default 'all',
  p_start_at timestamptz default now() - interval '30 days',
  p_end_at timestamptz default now(),
  p_limit integer default 50,
  p_offset integer default 0
)
returns table(
  id uuid,
  company_id uuid,
  mp_payment_id text,
  amount_cents integer,
  fee_amount_cents integer,
  net_amount_cents integer,
  status text,
  source text,
  provider text,
  received_at timestamptz,
  checkout_id uuid,
  external_id text,
  description text,
  customer_name text,
  customer_email text,
  customer_phone text,
  metadata jsonb,
  original_amount_cents integer,
  discount_cents integer,
  is_test boolean,
  total_count bigint
)
language sql
stable
security definer
set search_path='public','pg_temp'
as $$
  with mp as (
    select
      r.id,
      r.company_id,
      r.mp_payment_id::text,
      r.amount_cents,
      coalesce(r.fee_amount_cents,0)::integer as fee_amount_cents,
      coalesce(r.net_amount_cents,r.amount_cents-coalesce(r.fee_amount_cents,0))::integer as net_amount_cents,
      r.status::text,
      case
        when s.id is not null then s.origin
        when r.source='pixwiki_link' then 'pix_link'
        else 'pix_key'
      end::text as source,
      'mercadopago'::text as provider,
      coalesce(r.date_approved,r.date_created,r.created_at) as received_at,
      s.id as checkout_id,
      s.external_id,
      s.description,
      s.customer_name,
      s.customer_email,
      s.customer_phone,
      coalesce(s.metadata,'{}'::jsonb) as metadata,
      coalesce(s.amount_cents,r.amount_cents)::integer as original_amount_cents,
      coalesce(s.discount_cents,0)::integer as discount_cents,
      coalesce(s.is_test,false) as is_test
    from public.mp_received_payments r
    join public.companies c on c.id=r.company_id
    left join lateral (
      select x.*
      from public.pixwiki_v2_checkout_sessions x
      where x.company_id=r.company_id
        and (
          x.receipt_id=r.id
          or (
            x.provider_payment_id is not null
            and r.mp_payment_id is not null
            and x.provider_payment_id=r.mp_payment_id
          )
        )
      order by x.paid_at desc nulls last,x.created_at desc
      limit 1
    ) s on true
    where c.user_id=p_user_id
      and c.segment_key='pix_wiki'
      and r.status='approved'
  ),
  legacy as (
    -- Preserva o contrato do endpoint antigo para Pix Link confirmado que ainda
    -- não tenha receipt MP anexado no instante da consulta.
    select
      p.id,
      p.company_id,
      case when p.payment_provider='mercadopago' then p.txid::text else null end as mp_payment_id,
      p.amount_cents::integer,
      0::integer as fee_amount_cents,
      p.amount_cents::integer as net_amount_cents,
      'confirmed'::text as status,
      'pix_link'::text as source,
      coalesce(p.payment_provider,'pix_direct')::text as provider,
      coalesce(p.confirmed_at,p.requested_at,p.created_at) as received_at,
      null::uuid as checkout_id,
      null::text as external_id,
      null::text as description,
      null::text as customer_name,
      null::text as customer_email,
      null::text as customer_phone,
      '{}'::jsonb as metadata,
      coalesce(p.original_amount_cents,p.amount_cents)::integer as original_amount_cents,
      coalesce(p.discount_cents,0)::integer as discount_cents,
      false as is_test
    from public.pix_transactions p
    join public.companies c on c.id=p.company_id
    where c.user_id=p_user_id
      and c.segment_key='pix_wiki'
      and p.status::text='confirmed'
      and p.origem in ('pixwiki_link','pixwiki_link_free')
      and not exists (
        select 1
        from public.mp_received_payments r
        where r.company_id=p.company_id
          and (
            (p.payment_provider='mercadopago' and r.mp_payment_id=p.txid::text)
            or (
              p.direct_intent_id is not null
              and exists(
                select 1
                from public.pix_direct_intents i
                where i.id=p.direct_intent_id
                  and i.matched_receipt_id=r.id
              )
            )
          )
      )
  ),
  combined as (
    select * from mp
    union all
    select * from legacy
  ),
  filtered as (
    select *
    from combined x
    where (p_receipt_id is null or x.id=p_receipt_id)
      and (p_company_id is null or x.company_id=p_company_id)
      and (p_source='all' or x.source=p_source)
      and (
        p_status='all'
        or (p_status='approved' and x.status='approved')
        or (p_status='confirmed' and x.status in ('approved','confirmed'))
      )
      and x.received_at>=p_start_at
      and x.received_at<p_end_at
  )
  select
    f.*,
    count(*) over()::bigint as total_count
  from filtered f
  order by f.received_at desc
  limit greatest(1,least(coalesce(p_limit,50),100))
  offset greatest(0,least(coalesce(p_offset,0),100000));
$$;

revoke all on function public.pixwiki_v2_api_receipts_internal(uuid,uuid,uuid,text,text,timestamptz,timestamptz,integer,integer)
  from public,anon,authenticated;
grant execute on function public.pixwiki_v2_api_receipts_internal(uuid,uuid,uuid,text,text,timestamptz,timestamptz,integer,integer)
  to service_role;

-- -----------------------------------------------------------------------------
-- 4) Summary V2: agrega no Postgres, sem limite artificial de 100k linhas
-- -----------------------------------------------------------------------------
create or replace function public.pixwiki_v2_api_summary_internal(
  p_user_id uuid,
  p_company_id uuid default null,
  p_source text default 'all',
  p_start_at timestamptz default now() - interval '30 days',
  p_end_at timestamptz default now()
)
returns table(
  receipt_count bigint,
  gross_cents bigint,
  fee_cents bigint,
  net_cents bigint,
  pix_key_count bigint,
  pix_link_count bigint,
  checkout_count bigint,
  api_count bigint
)
language sql
stable
security definer
set search_path='public','pg_temp'
as $$
  with mp as (
    select
      r.id,
      r.amount_cents,
      coalesce(r.fee_amount_cents,0)::integer as fee_amount_cents,
      coalesce(r.net_amount_cents,r.amount_cents-coalesce(r.fee_amount_cents,0))::integer as net_amount_cents,
      case
        when s.id is not null then s.origin
        when r.source='pixwiki_link' then 'pix_link'
        else 'pix_key'
      end::text as source,
      coalesce(r.date_approved,r.date_created,r.created_at) as received_at
    from public.mp_received_payments r
    join public.companies c on c.id=r.company_id
    left join lateral (
      select x.id,x.origin
      from public.pixwiki_v2_checkout_sessions x
      where x.company_id=r.company_id
        and (
          x.receipt_id=r.id
          or (
            x.provider_payment_id is not null
            and r.mp_payment_id is not null
            and x.provider_payment_id=r.mp_payment_id
          )
        )
      order by x.paid_at desc nulls last,x.created_at desc
      limit 1
    ) s on true
    where c.user_id=p_user_id
      and c.segment_key='pix_wiki'
      and r.status='approved'
      and (p_company_id is null or r.company_id=p_company_id)
  ),
  legacy as (
    select
      p.id,
      p.amount_cents::integer,
      0::integer as fee_amount_cents,
      p.amount_cents::integer as net_amount_cents,
      'pix_link'::text as source,
      coalesce(p.confirmed_at,p.requested_at,p.created_at) as received_at
    from public.pix_transactions p
    join public.companies c on c.id=p.company_id
    where c.user_id=p_user_id
      and c.segment_key='pix_wiki'
      and p.status::text='confirmed'
      and p.origem in ('pixwiki_link','pixwiki_link_free')
      and (p_company_id is null or p.company_id=p_company_id)
      and not exists (
        select 1
        from public.mp_received_payments r
        where r.company_id=p.company_id
          and (
            (p.payment_provider='mercadopago' and r.mp_payment_id=p.txid::text)
            or (
              p.direct_intent_id is not null
              and exists(
                select 1
                from public.pix_direct_intents i
                where i.id=p.direct_intent_id
                  and i.matched_receipt_id=r.id
              )
            )
          )
      )
  ),
  combined as (
    select * from mp
    union all
    select * from legacy
  )
  select
    count(*)::bigint,
    coalesce(sum(e.amount_cents),0)::bigint,
    coalesce(sum(e.fee_amount_cents),0)::bigint,
    coalesce(sum(e.net_amount_cents),0)::bigint,
    count(*) filter(where e.source='pix_key')::bigint,
    count(*) filter(where e.source='pix_link')::bigint,
    count(*) filter(where e.source='checkout')::bigint,
    count(*) filter(where e.source='api')::bigint
  from combined e
  where (p_source='all' or e.source=p_source)
    and e.received_at>=p_start_at
    and e.received_at<p_end_at;
$$;

revoke all on function public.pixwiki_v2_api_summary_internal(uuid,uuid,text,timestamptz,timestamptz)
  from public,anon,authenticated;
grant execute on function public.pixwiki_v2_api_summary_internal(uuid,uuid,text,timestamptz,timestamptz)
  to service_role;

-- -----------------------------------------------------------------------------
-- 5) Segurança: API/Webhook V2 não depende mais do feature gate legado.
-- Nenhuma permissão nova é dada a anon/authenticated nos objetos internos.
-- -----------------------------------------------------------------------------
revoke all on public.pixwiki_api_keys from public,anon,authenticated;
revoke all on public.pixwiki_api_request_logs from public,anon,authenticated;
revoke all on public.pixwiki_webhooks from public,anon,authenticated;
grant all on public.pixwiki_api_keys to service_role;
grant all on public.pixwiki_api_request_logs to service_role;
grant all on public.pixwiki_webhooks to service_role;

notify pgrst, 'reload schema';

commit;
