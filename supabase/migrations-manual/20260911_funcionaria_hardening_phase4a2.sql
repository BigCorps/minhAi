-- ============================================================
-- minhAi / FuncionarIA — HARDENING FASE 4A.2
-- Data: 2026-09-11
--
-- PRÉ-REQUISITO:
--   1) R4A.2 frontend aplicada
--   2) verifier PASS
--   3) build/deploy Vercel READY
--
-- OBJETIVO:
--   confirmar pedido somente via autoridade server-side.
--
-- NÃO fecha ainda:
--   - RLS ampla de pedidos/pedido_itens/pix_transactions
--   - cobrancas/mp_orders
--   - register_function_usage público
-- Esses itens entram na 4B / 4C.
-- ============================================================

begin;

create or replace function public.confirmar_pedido_pago(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_status text;
begin
  if p_pedido_id is null then
    raise exception 'pedido_id_required';
  end if;

  -- Serializa duas confirmações simultâneas do mesmo pedido.
  select p.status
    into v_status
  from public.pedidos p
  where p.id = p_pedido_id
  for update;

  if not found then
    raise exception 'pedido_not_found';
  end if;

  -- Retry/idempotência.
  if v_status in ('pago', 'entregue') then
    perform public.baixar_estoque_pedido(p_pedido_id);
    return;
  end if;

  if v_status not in ('aberto', 'aguardando_pagamento') then
    raise exception 'pedido_not_confirmable';
  end if;

  update public.pedidos
  set
    status = 'pago',
    paid_at = coalesce(paid_at, now()),
    updated_at = now()
  where id = p_pedido_id;

  -- Helper da 4A.1 já é idempotente.
  perform public.baixar_estoque_pedido(p_pedido_id);
end;
$function$;

-- A confirmação financeira agora só pode vir de código server-side
-- com service role após revalidação do provedor.
revoke execute on function public.confirmar_pedido_pago(uuid) from public;
revoke execute on function public.confirmar_pedido_pago(uuid) from anon;
revoke execute on function public.confirmar_pedido_pago(uuid) from authenticated;
grant execute on function public.confirmar_pedido_pago(uuid) to service_role;

commit;

select jsonb_build_object(
  'confirmar_pedido_pago_execute',
    jsonb_build_object(
      'anon',
        has_function_privilege(
          'anon',
          'public.confirmar_pedido_pago(uuid)'::regprocedure,
          'EXECUTE'
        ),
      'authenticated',
        has_function_privilege(
          'authenticated',
          'public.confirmar_pedido_pago(uuid)'::regprocedure,
          'EXECUTE'
        ),
      'service_role',
        has_function_privilege(
          'service_role',
          'public.confirmar_pedido_pago(uuid)'::regprocedure,
          'EXECUTE'
        )
    ),

  'baixar_estoque_execute',
    jsonb_build_object(
      'anon',
        has_function_privilege(
          'anon',
          'public.baixar_estoque_pedido(uuid)'::regprocedure,
          'EXECUTE'
        ),
      'authenticated',
        has_function_privilege(
          'authenticated',
          'public.baixar_estoque_pedido(uuid)'::regprocedure,
          'EXECUTE'
        ),
      'service_role',
        has_function_privilege(
          'service_role',
          'public.baixar_estoque_pedido(uuid)'::regprocedure,
          'EXECUTE'
        )
    ),

  'paid_orders_without_stock_marker',
    (
      select count(*)
      from public.pedidos
      where status in ('pago','entregue')
        and stock_deducted_at is null
    ),

  'register_function_usage_still_public_for_compatibility',
    jsonb_build_object(
      'v3_anon',
        has_function_privilege(
          'anon',
          'public.register_function_usage(uuid,character varying,integer)'::regprocedure,
          'EXECUTE'
        ),
      'v4_anon',
        has_function_privilege(
          'anon',
          'public.register_function_usage(uuid,character varying,integer,jsonb)'::regprocedure,
          'EXECUTE'
        )
    )
) as phase4a2_summary;
