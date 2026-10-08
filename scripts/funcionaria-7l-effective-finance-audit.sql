-- FuncionarIA 7L: confirmação READ-ONLY da função realmente ativa
-- Nunca aplicar como migration. Não chama o executor financeiro.
with fn as (
 select lower(pg_get_functiondef(p.oid)) as body,
        p.oid,
        p.prosecdef as security_definer
 from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public'
   and p.proname='funcionaria_settle_storefront_commission'
   and pg_get_function_identity_arguments(p.oid) like
     'p_pedido_id uuid, p_checkout_id uuid, p_provider text%'
), flags as (
 select
   count(*) as function_matches,
   bool_and(
      position('v_existing.provider <> p_provider' in body)>0
      and position('v_existing.provider_reference <> trim(p_provider_reference)' in body)>0
      and position('settlement_evidence_conflict' in body)>0
      and position('''duplicate'',true' in body)>0
      and position('settlement_evidence_conflict' in body)<
          position('''duplicate'',true' in body)
   ) as conflict_before_duplicate,
   bool_and(position('card_provider_fee_evidence_mismatch' in body)>0) as provider_fee_checked,
   bool_and(position('baixar_estoque_pedido' in body)>0) as stock_update_present,
   bool_and(security_definer and
      has_function_privilege('service_role',oid,'EXECUTE') and
      not has_function_privilege('anon',oid,'EXECUTE') and
      not has_function_privilege('authenticated',oid,'EXECUTE')) as service_only
 from fn
)
select jsonb_build_object(
 'read_only',true,
 'function_matches',coalesce(f.function_matches,0),
 'conflicting_replay_blocked',coalesce(f.conflict_before_duplicate,false),
 'provider_fee_checked',coalesce(f.provider_fee_checked,false),
 'stock_update_present',coalesce(f.stock_update_present,false),
 'service_only',coalesce(f.service_only,false),
 'settlements_count',(select count(*) from public.funcionaria_storefront_settlements),
 'payment_test_coverage',case when
   (select count(*) from public.funcionaria_storefront_settlements)=0
   then 'not_exercised' else 'historical_data_only' end
) as audit
from flags f;
