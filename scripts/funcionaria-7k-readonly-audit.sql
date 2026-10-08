-- FuncionarIA 7K — auditoria exclusivamente de leitura.
-- NÃO contém INSERT/UPDATE/DELETE/DDL nem chama RPC que escreve.
-- Contagens de zero podem indicar AUSÊNCIA DE TRÁFEGO, não teste de pagamento aprovado.
with orders_summary as (
 select count(*) filter(where p.platform='funcionaria_web') as storefront_orders,
        count(*) filter(where p.platform='funcionaria_web' and p.status in ('pago','entregue') and p.stock_deducted_at is null) as paid_without_stock_marker,
        count(*) filter(where p.platform='funcionaria_web' and p.status='cancelado' and p.paid_at is not null) as cancelled_with_paid_at,
        count(*) filter(where p.platform='funcionaria_web' and p.delivery_dispatch_state='created' and p.lalamove_order_id is null) as dispatched_without_provider_id,
        count(*) filter(where p.platform='funcionaria_web' and p.delivery_fee_refunded_at is not null and p.delivery_fee_reserved_at is null) as refund_without_reserve
 from public.pedidos p
), checkouts_summary as (
 select count(*) filter(where origem='storefront') as storefront_checkouts,
        count(*) filter(where origem='storefront' and status='pago' and completed_at is null) as paid_without_completion,
        count(*) filter(where origem='storefront' and card_provider is not null and pix_transaction_id is not null) as conflicting_methods
 from public.funcionaria_checkouts
), settlement_summary as (
 select (select count(*) from public.funcionaria_storefront_settlements) as commission_settlements,
        (select count(*) from public.funcionaria_storefront_direct_settlements) as direct_settlements,
        (select count(*) from public.funcionaria_storefront_ledger) as storefront_ledger_entries
), acl_summary as (
 select count(*) as rpc_count,
        count(*) filter(where not has_function_privilege('anon',p.oid,'EXECUTE')
          and not has_function_privilege('authenticated',p.oid,'EXECUTE')
          and has_function_privilege('service_role',p.oid,'EXECUTE')) as private_rpc_count
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
   'funcionaria_settle_storefront_commission',
   'funcionaria_settle_storefront_direct',
   'funcionaria_prepare_lalamove_dispatch',
   'funcionaria_refund_delivery_fee',
   'baixar_estoque_pedido',
   'funcionaria_storefront_guard_payment_mode'
 )
), unique_summary as (
 select count(*) filter(where indexdef ilike '%unique%' and
      indexdef ilike '%(pedido_id)%') as unique_order_indexes
 from pg_indexes where schemaname='public'
 and tablename in ('funcionaria_storefront_settlements',
                   'funcionaria_storefront_direct_settlements',
                   'funcionaria_checkouts')
)
select jsonb_build_object(
 'read_only',true,
 'scope','funcionaria_7k',
 'storefront_orders',o.storefront_orders,
 'storefront_checkouts',c.storefront_checkouts,
 'commission_settlements',s.commission_settlements,
 'direct_settlements',s.direct_settlements,
 'ledger_entries',s.storefront_ledger_entries,
 'anomalies',jsonb_build_object(
   'paid_without_stock_marker',o.paid_without_stock_marker,
   'cancelled_with_paid_at',o.cancelled_with_paid_at,
   'dispatch_without_provider_id',o.dispatched_without_provider_id,
   'refund_without_reserve',o.refund_without_reserve,
   'paid_checkout_without_completion',c.paid_without_completion,
   'conflicting_payment_methods',c.conflicting_methods
 ),
 'rpc_acl',jsonb_build_object('checked',a.rpc_count,'restricted',a.private_rpc_count),
 'unique_order_indexes',u.unique_order_indexes,
 'real_payment_coverage',case when (s.commission_settlements+s.direct_settlements)=0
   then 'not_exercised' else 'historical_records_exist' end
) as audit
from orders_summary o cross join checkouts_summary c
 cross join settlement_summary s cross join acl_summary a cross join unique_summary u;
