alter table public.mp_received_payments
  add column if not exists notification_claimed_at timestamptz,
  add column if not exists notification_claim_owner text;

create or replace function public.pixwiki_claim_receipt_notification(
  p_receipt_id uuid,
  p_owner text,
  p_claim_ttl_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed uuid;
begin
  if p_receipt_id is null or coalesce(trim(p_owner), '') = '' then
    return false;
  end if;

  update public.mp_received_payments
     set notification_claimed_at = now(),
         notification_claim_owner = left(trim(p_owner), 120),
         updated_at = now()
   where id = p_receipt_id
     and notification_eligible = true
     and notified_at is null
     and (
       notification_claimed_at is null
       or notification_claimed_at < now() - make_interval(
         secs => greatest(30, least(coalesce(p_claim_ttl_seconds, 120), 600))
       )
     )
  returning id into v_claimed;

  return v_claimed is not null;
end;
$$;

create or replace function public.pixwiki_release_receipt_notification_claim(
  p_receipt_id uuid,
  p_owner text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mp_received_payments
     set notification_claimed_at = null,
         notification_claim_owner = null,
         updated_at = now()
   where id = p_receipt_id
     and notified_at is null
     and notification_claim_owner = left(trim(coalesce(p_owner, '')), 120);
end;
$$;

revoke all on function public.pixwiki_claim_receipt_notification(uuid, text, integer) from public;
revoke all on function public.pixwiki_release_receipt_notification_claim(uuid, text) from public;
grant execute on function public.pixwiki_claim_receipt_notification(uuid, text, integer) to service_role;
grant execute on function public.pixwiki_release_receipt_notification_claim(uuid, text) to service_role;
