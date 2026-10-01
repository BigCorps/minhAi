-- Security 1A.2a
-- Persist the production hardening already applied to debit_delivery_fee.
-- This is intentionally service-role only: Phase 7E uses
-- funcionaria_reserve_delivery_fee for the active Lalamove flow.

begin;

alter function public.debit_delivery_fee(uuid, uuid, integer, jsonb)
  set search_path = public, pg_temp;

revoke execute on function public.debit_delivery_fee(uuid, uuid, integer, jsonb)
  from public, anon, authenticated;

grant execute on function public.debit_delivery_fee(uuid, uuid, integer, jsonb)
  to service_role;

commit;
