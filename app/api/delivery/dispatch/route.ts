import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid, resolveCompanyActor, verifyOrderMutationToken } from '@/lib/orders-server';
import { invokeLalamoveDelivery } from '@/lib/lalamove-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: noStore }); }

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const pedidoId = cleanUuid(body?.pedido_id);
  const manual = body?.manual === true;
  if (!companyId || !pedidoId) return json({ error: 'invalid_dispatch_request' }, 400);

  const mutationToken = String(body?.mutation_token || '');
  const hasOrderToken = verifyOrderMutationToken(mutationToken, pedidoId, companyId);
  if (manual && hasOrderToken) return json({ error: 'manual_dispatch_requires_company_actor' }, 403);

  if (!hasOrderToken) {
    const auth = await resolveCompanyActor(request, body, companyId, [
      'frentista', 'atendente', 'caixa', 'gerente', 'colaborador', 'administrador',
    ]);
    if (auth.error) return json({ error: auth.error }, auth.error === 'unauthorized' ? 401 : 403);
  }

  const admin = createAdminClient();
  const { data: pedido, error } = await admin
    .from('pedidos')
    .select('id,company_id,status,delivery_requested,lalamove_order_id,delivery_share_link')
    .eq('id', pedidoId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) return json({ error: 'pedido_lookup_failed' }, 500);
  if (!pedido) return json({ error: 'pedido_not_found' }, 404);
  if (pedido.delivery_requested !== true) return json({ error: 'delivery_not_requested' }, 409);
  if (!['pago', 'entregue'].includes(String(pedido.status || ''))) return json({ error: 'payment_not_confirmed' }, 409);
  if (pedido.lalamove_order_id) {
    return json({ success: true, already_created: true, order_id: pedido.lalamove_order_id, share_link: pedido.delivery_share_link });
  }

  if (!manual) {
    const { data: company } = await admin
      .from('companies')
      .select('delivery_auto_dispatch')
      .eq('id', companyId)
      .maybeSingle();
    if (company?.delivery_auto_dispatch !== true) return json({ success: true, skipped: true, reason: 'auto_dispatch_disabled' });
  }

  const result = await invokeLalamoveDelivery({
    action: 'order',
    company_id: companyId,
    pedido_id: pedidoId,
    manual,
  });

  return json(result.data, result.ok ? 200 : (result.status || 502));
}
