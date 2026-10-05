-- Somente leitura. Rodar no projeto minhAi após aplicar a migration.
select product_key,count(*) as assinaturas,sum(monthly_value_cents) as mrr_centavos
from public.platform_active_subscriptions() group by product_key;
select coalesce(sum(monthly_value_cents),0) as mrr_total_centavos from public.platform_active_subscriptions();
select product_key,kind,sum(amount_cents) as recebido_centavos
from public.platform_revenue_events(date_trunc('month',now()),null)
where status_group='paid' group by product_key,kind;
select plan,status,complimentary,count(*) from public.pixwiki_v2_billing_accounts group by plan,status,complimentary;
select name,lane,provider,enabled,auto_discover,daily_limit,max_touches,trial_ends_at from public.sdr_campaigns order by lane,product;
select provider,enabled,limit_units,used_units,expires_at from public.sdr_provider_budgets;
select c.relname,c.relrowsecurity,
 has_table_privilege('anon',c.oid,'select') as anon_select,
 has_table_privilege('authenticated',c.oid,'select') as user_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relname like 'sdr_%';
select p.proname,has_function_privilege('anon',p.oid,'execute') as anon_execute,
 has_function_privilege('authenticated',p.oid,'execute') as user_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'sdr_%';
select public.sdr_metrics();
select status,count(*) from public.sdr_queue group by status;
-- Esperado na instalação inicial: campanhas pausadas, budgets desabilitados,
-- nenhuma permissão anon/authenticated e nenhum contato/fila criado.
