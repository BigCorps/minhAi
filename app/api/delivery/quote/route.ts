import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanText, cleanUuid, resolveCompanyActor, signDeliveryQuoteToken } from '@/lib/orders-server';
import { invokeLalamoveDelivery } from '@/lib/lalamove-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: noStore }); }

type RequestedItem = { produto_id: string; quantidade: number };

function normalizeItems(value: unknown): RequestedItem[] {
  if (!Array.isArray(value)) return [];
  const map = new Map<string, number>();
  for (const raw of value.slice(0, 50)) {
    const id = cleanUuid(raw?.produto_id);
    const qty = Math.floor(Number(raw?.quantidade || 0));
    if (!id || !Number.isFinite(qty) || qty < 1 || qty > 50) continue;
    map.set(id, Math.min(50, (map.get(id) || 0) + qty));
  }
  return [...map.entries()].map(([produto_id, quantidade]) => ({ produto_id, quantidade }));
}

async function subtotalFromItems(admin: ReturnType<typeof createAdminClient>, companyId: string, items: RequestedItem[]) {
  const ids = items.map((item) => item.produto_id);
  const { data, error } = await admin
    .from('produtos_venda')
    .select('id,preco_venda,is_active,controla_estoque,estoque_atual')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .in('id', ids);

  if (error || !data || data.length !== ids.length) throw new Error('invalid_products');
  const byId = new Map(data.map((row: any) => [String(row.id), row]));
  let cents = 0;
  for (const item of items) {
    const product: any = byId.get(item.produto_id);
    if (!product) throw new Error('invalid_products');
    if (product.controla_estoque === true && Number(product.estoque_atual || 0) < item.quantidade) {
      throw new Error('insufficient_stock');
    }
    cents += Math.round(Number(product.preco_venda || 0) * 100) * item.quantidade;
  }
  return cents;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const deliveryAddress = cleanText(body?.delivery_address, 500) || '';
  const items = normalizeItems(body?.items);

  if (!companyId || deliveryAddress.length < 8) return json({ error: 'invalid_quote_request' }, 400);

  const admin = createAdminClient();
  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id,is_active,delivery_enabled,delivery_who_pays')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) return json({ error: 'company_lookup_failed' }, 500);
  if (!company || company.is_active === false) return json({ error: 'company_not_found' }, 404);
  if (company.delivery_enabled !== true) return json({ error: 'delivery_not_available' }, 409);

  let subtotalCents = 0;
  try {
    if (items.length) {
      subtotalCents = await subtotalFromItems(admin, companyId, items);
    } else {
      // Fluxos internos/PDV podem ter opcionais e descontos. Neles aceitamos o total
      // somente após autenticar um ator autorizado da empresa.
      const auth = await resolveCompanyActor(request, body, companyId, [
        'frentista', 'atendente', 'caixa', 'gerente', 'colaborador', 'administrador',
      ]);
      if (auth.error) return json({ error: auth.error }, auth.error === 'unauthorized' ? 401 : 403);
      subtotalCents = Math.round(Number(body?.order_total_cents || 0));
      if (!Number.isFinite(subtotalCents) || subtotalCents <= 0) return json({ error: 'invalid_order_total' }, 400);
    }
  } catch (error: any) {
    return json({ error: error?.message || 'invalid_products' }, 409);
  }

  const quoted = await invokeLalamoveDelivery({
    action: 'quote',
    company_id: companyId,
    delivery_address: deliveryAddress,
    order_total_cents: subtotalCents,
  });

  if (!quoted.ok || quoted.data?.success !== true) {
    return json({
      error: quoted.data?.error || 'delivery_quote_failed',
      minimum_order_cents: quoted.data?.minimum_order_cents ?? null,
      max_radius_km: quoted.data?.max_radius_km ?? null,
    }, quoted.status >= 400 && quoted.status < 500 ? quoted.status : 502);
  }

  const quotationId = String(quoted.data.quotation_id || '');
  const quoteRequestId = String(quoted.data.request_id || '');
  const priceCents = Math.round(Number(quoted.data.price_cents || 0));
  const originalCents = Math.round(Number(quoted.data.price_original_cents || 0));
  if (!quotationId || !quoteRequestId || priceCents <= 0 || originalCents <= 0) {
    return json({ error: 'invalid_delivery_quote' }, 502);
  }

  const quoteToken = signDeliveryQuoteToken({
    companyId,
    address: deliveryAddress,
    subtotalCents,
    quotationId,
    quoteRequestId,
    priceCents,
    priceOriginalCents: originalCents,
    expiresAt: quoted.data.expires_at ? String(quoted.data.expires_at) : null,
    whoPays: company.delivery_who_pays === 'empresa' ? 'empresa' : 'cliente',
  });

  return json({
    success: true,
    quote_token: quoteToken,
    quotation_id: quotationId,
    price_cents: priceCents,
    price_original_cents: originalCents,
    price_brl: (priceCents / 100).toFixed(2),
    eta_minutes: Number.isFinite(Number(quoted.data.eta_minutes)) ? Number(quoted.data.eta_minutes) : null,
    distance_km: Number.isFinite(Number(quoted.data.distance_km)) ? Number(quoted.data.distance_km) : null,
    expires_at: quoted.data.expires_at ?? null,
    customer_pays: company.delivery_who_pays !== 'empresa',
  });
}
