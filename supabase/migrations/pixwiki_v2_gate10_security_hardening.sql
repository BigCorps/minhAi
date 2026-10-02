-- PixWiki V2 — Gate 10
-- Hardening final, menor privilégio e índices apontados pelo Advisor.
-- Aplicar SOMENTE após Gates 1..9.

begin;

-- 1) Fecha a pendência histórica da view de recebimentos.
-- Gates 4/6 já movem API/dashboard/relatórios para RPCs/base tables.
alter view public.pixwiki_receipts set (security_invoker = true);
revoke all privileges on table public.pixwiki_receipts from public, anon, authenticated;
grant select on table public.pixwiki_receipts to service_role;

-- 2) Função utilitária imutável sem search_path mutável.
alter function public.pixwiki_normalize_slug(text) set search_path to pg_catalog;

-- 3) RPCs de usuário: nunca anon; somente usuário autenticado + backend.
revoke execute on function public.pixwiki_claim_slug(uuid,text) from public, anon;
grant execute on function public.pixwiki_claim_slug(uuid,text) to authenticated, service_role;

revoke execute on function public.pixwiki_create_company(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.pixwiki_create_company(text,text,text,text,text,text,text) to authenticated, service_role;

revoke execute on function public.pixwiki_list_my_companies() from public, anon;
grant execute on function public.pixwiki_list_my_companies() to authenticated, service_role;

revoke execute on function public.pixwiki_my_entitlements() from public, anon;
grant execute on function public.pixwiki_my_entitlements() to authenticated, service_role;

revoke execute on function public.pixwiki_slug_available(text) from public, anon;
grant execute on function public.pixwiki_slug_available(text) to authenticated, service_role;

revoke execute on function public.pixwiki_register_push_subscription(uuid,text,text,text) from public, anon;
grant execute on function public.pixwiki_register_push_subscription(uuid,text,text,text) to authenticated, service_role;

revoke execute on function public.pixwiki_unregister_push_subscription(text) from public, anon;
grant execute on function public.pixwiki_unregister_push_subscription(text) to authenticated, service_role;

revoke execute on function public.pixwiki_disconnect_mp_connection(uuid) from public, anon;
grant execute on function public.pixwiki_disconnect_mp_connection(uuid) to authenticated, service_role;

revoke execute on function public.pixwiki_report_receipts(uuid,text,date,date) from public, anon;
grant execute on function public.pixwiki_report_receipts(uuid,text,date,date) to authenticated, service_role;

-- 4) Helpers/server-only. A superfície pública usa Server Components ou Edge Functions.
revoke execute on function public.pixwiki_can_serve_subdomain(text) from public, anon, authenticated;
grant execute on function public.pixwiki_can_serve_subdomain(text) to service_role;

revoke execute on function public.pixwiki_public_company_for_subdomain(text) from public, anon, authenticated;
grant execute on function public.pixwiki_public_company_for_subdomain(text) to service_role;

revoke execute on function public.pixwiki_primary_company_id(uuid) from public, anon, authenticated;
grant execute on function public.pixwiki_primary_company_id(uuid) to service_role;

revoke execute on function public.pixwiki_company_allowed_for_plan(uuid,uuid) from public, anon, authenticated;
grant execute on function public.pixwiki_company_allowed_for_plan(uuid,uuid) to service_role;

revoke execute on function public.pixwiki_effective_plan_for_user(uuid) from public, anon, authenticated;
grant execute on function public.pixwiki_effective_plan_for_user(uuid) to service_role;

revoke execute on function public.pixwiki_entitlements_for_user(uuid) from public, anon, authenticated;
grant execute on function public.pixwiki_entitlements_for_user(uuid) to service_role;

revoke execute on function public.pixwiki_has_feature_for_user(uuid,text) from public, anon, authenticated;
grant execute on function public.pixwiki_has_feature_for_user(uuid,text) to service_role;

-- 5) Índices PixWiki indicados pelo Advisor de performance.
create index if not exists pix_direct_intents_matched_receipt_idx
  on public.pix_direct_intents(matched_receipt_id)
  where matched_receipt_id is not null;
create index if not exists pix_direct_intents_user_idx
  on public.pix_direct_intents(user_id);
create index if not exists pixwiki_invoices_target_plan_idx
  on public.pixwiki_invoices(target_plan);
create index if not exists pixwiki_payment_settings_mp_connection_idx
  on public.pixwiki_payment_settings(mp_connection_id)
  where mp_connection_id is not null;
create index if not exists pixwiki_subscriptions_last_invoice_idx
  on public.pixwiki_subscriptions(last_paid_invoice_id)
  where last_paid_invoice_id is not null;
create index if not exists pixwiki_subscriptions_plan_idx
  on public.pixwiki_subscriptions(plan);
create index if not exists pixwiki_sync_state_company_idx
  on public.pixwiki_sync_state(company_id);
create index if not exists pixwiki_sync_state_user_idx
  on public.pixwiki_sync_state(user_id);
create index if not exists pixwiki_webhook_events_company_idx
  on public.pixwiki_webhook_events(company_id);

commit;
