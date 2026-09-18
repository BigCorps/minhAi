import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid, verifyDeliveryQuoteToken, verifyOrderMutationToken } from '@/lib/orders-server';
import { invokeLalamoveDelivery } from '@/lib/lalamove-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: noStore }); }

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const pedidoId = cleanUuid(body?.pedido_id);
  const mutationToken = String(body?.mutation_token || '');
  const action = String(body?.action || '');

  if (!companyId || !pedidoId || !verifyOrderMutationToken(mutationToken, pedidoId, companyId)) {
    return json({ error: 'unauthorized_order_mutation' }, 401);
  }

  const admin = createAdminClient();
  const { data: pedido, error: pedidoError } = await admin
    .from('pedidos')
    .select('id,company_id,status,metodo_pagamento,cobranca_id,subtotal,delivery_requested,lalamove_order_id')
    .eq('id', pedidoId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (pedidoError) return json({ error: 'pedido_lookup_failed' }, 500);
  if (!pedido) return json({ error: 'pedido_not_found' }, 404);

  if (action === 'delivery') {
    if (!['aberto', 'aguardando_pagamento'].includes(String(pedido.status || ''))) {
      return json({ error: 'pedido_not_mutable', status: pedido.status }, 409);
    }

    if (body?.delivery_requested !== true) {
      const { data: updated, error } = await admin.from('pedidos').update({
        delivery_requested: false, delivery_address: null, delivery_fee_cents: null,
        delivery_fee_original_cents: null, delivery_who_pays_snapshot: null,
        lalamove_quotation_id: null, lalamove_quote_expires_at: null, delivery_quote_request_id: null,
        delivery_dispatch_state: 'not_requested', total: Number(pedido.subtotal || 0),
      }).eq('id', pedidoId).eq('company_id', companyId).eq('status', pedido.status).select('id,status').maybeSingle();
      if (error) return json({ error: 'pedido_update_failed' }, 500);
      if (!updated) return json({ error: 'pedido_state_changed' }, 409);
      return json({ ok: true, status: updated.status });
    }

    const quote = verifyDeliveryQuoteToken(body?.delivery_quote_token);
    const subtotalCents = Math.round(Number(pedido.subtotal || 0) * 100);
    if (!quote || quote.companyId !== companyId || quote.subtotalCents !== subtotalCents) {
      return json({ error: 'invalid_or_mismatched_delivery_quote' }, 409);
    }
    const { data: company } = await admin.from('companies').select('delivery_enabled').eq('id', companyId).maybeSingle();
    if (company?.delivery_enabled !== true) return json({ error: 'delivery_not_available' }, 409);

    const total = Number(pedido.subtotal || 0) + (quote.whoPays === 'cliente' ? quote.priceCents / 100 : 0);
    const { data: updated, error } = await admin.from('pedidos').update({
      delivery_requested: true,
      delivery_address: quote.address,
      delivery_fee_cents: quote.priceCents,
      delivery_fee_original_cents: quote.priceOriginalCents,
      delivery_who_pays_snapshot: quote.whoPays,
      lalamove_quotation_id: quote.quotationId,
      lalamove_quote_expires_at: quote.expiresAt,
      delivery_quote_request_id: cleanUuid(quote.quoteRequestId) || null,
      delivery_dispatch_state: 'ready',
      total,
    }).eq('id', pedidoId).eq('company_id', companyId).eq('status', pedido.status).select('id,status,total').maybeSingle();
    if (error) return json({ error: 'pedido_update_failed' }, 500);
    if (!updated) return json({ error: 'pedido_state_changed' }, 409);
    return json({ ok: true, status: updated.status, total: updated.total });
  }

  if (action !== 'status') return json({ error: 'invalid_action' }, 400);

  const target = String(body?.status || '');
  const update: Record<string, unknown> = {};

  if (target === 'aguardando_pagamento') {
    if (!['aberto', 'aguardando_pagamento'].includes(String(pedido.status || ''))) {
      return json({ error: 'invalid_transition', status: pedido.status }, 409);
    }
    update.status = 'aguardando_pagamento';
    const cobrancaId = cleanUuid(body?.cobranca_id);
    if (body?.cobranca_id && !cobrancaId) return json({ error: 'invalid_cobranca_id' }, 400);
    if (cobrancaId) update.cobranca_id = cobrancaId;
  } else if (target === 'pago') {
    if (!['dinheiro', 'fiado'].includes(String(pedido.metodo_pagamento || ''))) {
      return json({ error: 'payment_confirmation_must_be_provider_verified' }, 403);
    }
    if (!['aberto', 'aguardando_pagamento', 'pago'].includes(String(pedido.status || ''))) {
      return json({ error: 'invalid_transition', status: pedido.status }, 409);
    }
    update.status = 'pago';
    update.paid_at = new Date().toISOString();
  } else if (target === 'cancelado') {
    if (!['aberto', 'aguardando_pagamento', 'cancelado'].includes(String(pedido.status || ''))) {
      return json({ error: 'invalid_transition', status: pedido.status }, 409);
    }
    update.status = 'cancelado';
    update.cancelled_at = new Date().toISOString();
  } else if (target === 'aberto' && pedido.status === 'aberto') {
    return json({ ok: true, status: 'aberto', already_set: true });
  } else {
    return json({ error: 'invalid_status' }, 400);
  }

  const { data: updated, error: updateError } = await admin
    .from('pedidos')
    .update(update)
    .eq('id', pedidoId)
    .eq('company_id', companyId)
    .eq('status', pedido.status)
    .select('id,status,cobranca_id')
    .maybeSingle();

  if (updateError) return json({ error: 'pedido_update_failed' }, 500);
  if (!updated) return json({ error: 'pedido_state_changed' }, 409);

  let deliveryDispatch: any = null;
  if (target === 'pago' && pedido.delivery_requested === true && !pedido.lalamove_order_id) {
    const { data: company } = await admin.from('companies').select('delivery_auto_dispatch').eq('id', companyId).maybeSingle();
    if (company?.delivery_auto_dispatch === true) {
      deliveryDispatch = await invokeLalamoveDelivery({ action: 'order', company_id: companyId, pedido_id: pedidoId });
    }
  }

  return json({ ok: true, status: updated.status, cobranca_id: updated.cobranca_id || null, delivery_dispatch: deliveryDispatch?.data ?? null });
}
