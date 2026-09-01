-- PixWiki: evita exibir duas vezes um Pix Link direto.
-- Produção já recebeu esta migration via MCP em 2026-08-25.
-- CREATE OR REPLACE torna o arquivo seguro/idempotente para sincronização do repositório.

create or replace view public.pixwiki_receipts as
select
  r.id,
  r.company_id,
  r.user_id,
  r.mp_payment_id,
  r.amount_cents,
  r.fee_amount_cents,
  coalesce(r.net_amount_cents, r.amount_cents - r.fee_amount_cents) as net_amount_cents,
  r.status,
  r.source,
  'mercadopago'::text as provider,
  coalesce(r.date_approved, r.date_created, r.created_at) as received_at,
  r.date_created,
  r.date_approved,
  r.payment_method_id,
  r.payment_type_id,
  r.operation_type,
  r.interaction_type,
  r.interaction_subtype
from public.mp_received_payments r
join public.companies c on c.id = r.company_id
where c.user_id = auth.uid()
  and c.segment_key = 'pix_wiki'::text
  and not exists (
    select 1
    from public.pix_direct_intents i
    join public.pix_transactions p on p.direct_intent_id = i.id
    where p.company_id = r.company_id
      and p.status::text = 'confirmed'::text
      and p.origem = 'pixwiki_link_free'
      and (
        i.matched_receipt_id = r.id
        or (
          i.provider_payment_id is not null
          and i.provider_payment_id = r.mp_payment_id
        )
      )
  )

union all

select
  p.id,
  p.company_id,
  c.user_id,
  case
    when p.payment_provider = 'mercadopago'::text then p.txid
    else null::character varying
  end as mp_payment_id,
  p.amount_cents,
  0 as fee_amount_cents,
  p.amount_cents as net_amount_cents,
  p.status::text as status,
  'pixwiki_link'::text as source,
  p.payment_provider as provider,
  coalesce(p.confirmed_at, p.requested_at, p.created_at) as received_at,
  p.requested_at as date_created,
  p.confirmed_at as date_approved,
  null::text as payment_method_id,
  null::text as payment_type_id,
  null::text as operation_type,
  null::text as interaction_type,
  null::text as interaction_subtype
from public.pix_transactions p
join public.companies c on c.id = p.company_id
where c.user_id = auth.uid()
  and c.segment_key = 'pix_wiki'::text
  and p.status::text = 'confirmed'::text
  and not exists (
    select 1
    from public.mp_received_payments r
    where r.company_id = p.company_id
      and r.mp_payment_id = p.txid::text
  );
