import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanText, cleanUuid, verifyOrderMutationToken } from '@/lib/orders-server';

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
    .select('id,company_id,status,metodo_pagamento,cobranca_id')
    .eq('id', pedidoId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (pedidoError) return json({ error: 'pedido_lookup_failed' }, 500);
  if (!pedido) return json({ error: 'pedido_not_found' }, 404);

  if (action === 'delivery') {
    if (!['aberto', 'aguardando_pagamento'].includes(String(pedido.status || ''))) {
      return json({ error: 'pedido_not_mutable', status: pedido.status }, 409);
    }
    const fee = Number(body?.delivery_fee_cents);
    const originalFee = Number(body?.delivery_fee_original_cents);
    const update = {
      delivery_requested: body?.delivery_requested === true,
      delivery_address: cleanText(body?.delivery_address, 500),
      delivery_fee_cents: Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : null,
      delivery_fee_original_cents: Number.isFinite(originalFee) && originalFee >= 0 ? Math.round(originalFee) : null,
    };
    const { data: updated, error } = await admin
      .from('pedidos')
      .update(update)
      .eq('id', pedidoId)
      .eq('company_id', companyId)
      .eq('status', pedido.status)
      .select('id,status')
      .maybeSingle();
    if (error) return json({ error: 'pedido_update_failed' }, 500);
    if (!updated) return json({ error: 'pedido_state_changed' }, 409);
    return json({ ok: true, status: updated.status });
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
  return json({ ok: true, status: updated.status, cobranca_id: updated.cobranca_id || null });
}
