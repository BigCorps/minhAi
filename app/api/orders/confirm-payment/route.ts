// app/api/orders/confirm-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type Provider = 'infinitepay' | 'mp_point';

const noStore = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

function cleanUuid(value: unknown) {
  const id = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : '';
}

function cents(value: unknown) {
  return Math.round(Number(value || 0) * 100);
}

async function invokeEdge(functionName: string, body: Record<string, unknown>) {
  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!base || !serviceKey) {
    return { ok: false, status: 500, data: { error: 'server_not_configured' } };
  }

  const response = await fetch(`${base}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const pedidoId = cleanUuid(body?.pedido_id);
  const companyId = cleanUuid(body?.company_id);
  const provider = String(body?.provider || '') as Provider;
  const providerId = String(body?.provider_id || '').trim();

  if (!pedidoId || !companyId || !providerId || !['infinitepay', 'mp_point'].includes(provider)) {
    return json({ error: 'invalid_request' }, 400);
  }

  const admin = createAdminClient();

  const { data: pedido, error: pedidoError } = await admin
    .from('pedidos')
    .select('id,company_id,total,status,cobranca_id,metodo_pagamento,stock_deducted_at')
    .eq('id', pedidoId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (pedidoError) {
    console.error('[orders/confirm-payment] pedido:', pedidoError.message);
    return json({ error: 'pedido_lookup_failed' }, 500);
  }

  if (!pedido) return json({ error: 'pedido_not_found' }, 404);

  if (pedido.status === 'pago' || pedido.status === 'entregue') {
    return json({ success: true, status: pedido.status, already_confirmed: true });
  }

  if (!['aberto', 'aguardando_pagamento'].includes(String(pedido.status || ''))) {
    return json({ error: 'pedido_not_confirmable' }, 409);
  }

  const expectedCents = cents(pedido.total);
  if (expectedCents <= 0) return json({ error: 'invalid_order_total' }, 409);

  if (provider === 'infinitepay') {
    const { data: cobranca, error: cobrancaError } = await admin
      .from('cobrancas')
      .select('id,company_id,valor,status')
      .eq('id', providerId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (cobrancaError) {
      console.error('[orders/confirm-payment] cobranca:', cobrancaError.message);
      return json({ error: 'charge_lookup_failed' }, 500);
    }

    if (!cobranca) return json({ error: 'charge_not_found' }, 404);

    const chargeCents = cents(cobranca.valor);
    if (Math.abs(chargeCents - expectedCents) > 1) {
      return json({ error: 'payment_amount_mismatch' }, 409);
    }

    // Mesmo que o status local tenha sido adulterado, a autoridade final é
    // o confirmador existente, que consulta/valida o pagamento no provedor.
    const verified = await invokeEdge('confirmar-pagamento-infinitepay', {
      cobranca_id: providerId,
      company_id: companyId,
    });

    if (!verified.ok || verified.data?.success !== true) {
      const pending =
        verified.status === 400 ||
        verified.status === 409 ||
        verified.data?.pending === true;

      return json(
        {
          success: false,
          pending,
          error: verified.data?.error || 'payment_not_confirmed',
        },
        pending ? 409 : 502,
      );
    }

    // Mantém o vínculo do pedido com a cobrança no servidor.
    if (pedido.cobranca_id !== providerId) {
      const { error: linkError } = await admin
        .from('pedidos')
        .update({
          cobranca_id: providerId,
          status: 'aguardando_pagamento',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pedidoId)
        .eq('company_id', companyId)
        .in('status', ['aberto', 'aguardando_pagamento']);

      if (linkError) {
        console.error('[orders/confirm-payment] link cobranca:', linkError.message);
        return json({ error: 'charge_link_failed' }, 500);
      }
    }
  }

  if (provider === 'mp_point') {
    const { data: mpOrder, error: orderError } = await admin
      .from('mp_orders')
      .select('id,company_id,amount_cents,status,pedido_id')
      .eq('id', providerId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (orderError) {
      console.error('[orders/confirm-payment] mp_order:', orderError.message);
      return json({ error: 'mp_order_lookup_failed' }, 500);
    }

    if (!mpOrder) return json({ error: 'mp_order_not_found' }, 404);

    if (Number(mpOrder.amount_cents || 0) !== expectedCents) {
      return json({ error: 'payment_amount_mismatch' }, 409);
    }

    if (mpOrder.pedido_id && mpOrder.pedido_id !== pedidoId) {
      return json({ error: 'mp_order_already_linked' }, 409);
    }

    const verified = await invokeEdge('consultar-order-mp-point', {
      order_id: providerId,
    });

    if (!verified.ok || String(verified.data?.status || '').toLowerCase() !== 'paid') {
      return json(
        {
          success: false,
          pending: true,
          status: verified.data?.status ?? null,
          error: verified.data?.error || 'payment_not_confirmed',
        },
        409,
      );
    }

    if (mpOrder.pedido_id !== pedidoId) {
      const { error: linkOrderError } = await admin
        .from('mp_orders')
        .update({ pedido_id: pedidoId })
        .eq('id', providerId)
        .eq('company_id', companyId);

      if (linkOrderError) {
        console.error('[orders/confirm-payment] link mp_order:', linkOrderError.message);
        return json({ error: 'mp_order_link_failed' }, 500);
      }
    }

    const { error: pendingError } = await admin
      .from('pedidos')
      .update({
        status: 'aguardando_pagamento',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)
      .eq('company_id', companyId)
      .eq('status', 'aberto');

    if (pendingError) {
      console.error('[orders/confirm-payment] pending pedido:', pendingError.message);
      return json({ error: 'pedido_pending_update_failed' }, 500);
    }
  }

  // Esta RPC será service_role-only após a migração SQL da R4A.2.
  // createAdminClient usa SUPABASE_SERVICE_ROLE_KEY.
  const { error: confirmError } = await admin.rpc('confirmar_pedido_pago', {
    p_pedido_id: pedidoId,
  });

  if (confirmError) {
    console.error('[orders/confirm-payment] confirmar_pedido_pago:', confirmError.message);
    return json({ error: confirmError.message || 'order_confirmation_failed' }, 500);
  }

  const { data: finalPedido } = await admin
    .from('pedidos')
    .select('status,paid_at,stock_deducted_at')
    .eq('id', pedidoId)
    .maybeSingle();

  return json({
    success: true,
    status: finalPedido?.status || 'pago',
    paid_at: finalPedido?.paid_at || null,
    stock_deducted: Boolean(finalPedido?.stock_deducted_at),
  });
}
