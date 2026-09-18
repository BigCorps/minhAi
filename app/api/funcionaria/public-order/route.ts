import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid, signStorefrontPaymentToken, verifyDeliveryQuoteToken } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';

type RequestedItem = { produto_id: string; quantidade: number };

async function prepareStorefrontPayment(
  supabase: ReturnType<typeof createAdminClient>,
  pedidoId: string,
  companyId: string,
) {
  const { data, error } = await supabase.rpc('funcionaria_prepare_storefront_checkout', {
    p_pedido_id: pedidoId,
  });
  if (error || !data?.checkout_id) {
    console.error('[funcionaria/public-order] storefront checkout:', error?.message || data);
    throw new Error('storefront_checkout_failed');
  }
  return {
    checkout_id: String(data.checkout_id),
    codigo: String(data.codigo || ''),
    status: String(data.status || 'aguardando_pagamento'),
    expires_at: data.expires_at || null,
    payment_mode: String(data.payment_mode || 'commission'),
    commission_bps: Number(data.commission_bps || 500),
    payment_token: signStorefrontPaymentToken(
      String(data.checkout_id),
      pedidoId,
      companyId,
    ),
  };
}

function normalizeItems(value: unknown): RequestedItem[] {
  if (!Array.isArray(value)) return [];
  const map = new Map<string, number>();
  for (const raw of value.slice(0, 50)) {
    const id = String(raw?.produto_id || '').trim();
    const qty = Math.max(1, Math.min(50, Math.floor(Number(raw?.quantidade || 0))));
    if (!id || !Number.isFinite(qty)) continue;
    map.set(id, Math.min(50, (map.get(id) || 0) + qty));
  }
  return [...map.entries()].map(([produto_id, quantidade]) => ({ produto_id, quantidade }));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = String(body?.company_id || '').trim();
  const clienteNome = String(body?.cliente_nome || '').trim().slice(0, 120) || null;
  const clienteTelefone = String(body?.cliente_telefone || '').replace(/\D/g, '').slice(0, 13) || null;
  const observacoes = String(body?.observacoes || '').trim().slice(0, 500) || null;
  const deliveryQuoteToken = String(body?.delivery_quote_token || '').trim();
  const idempotencyKey = String(body?.idempotency_key || '').trim().slice(0, 120);
  const items = normalizeItems(body?.itens);

  if (!companyId || !items.length || !/^[A-Za-z0-9:_-]{16,120}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: 'invalid_order' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from('companies')
    .select('id,name,is_active,is_public,delivery_enabled,delivery_who_pays')
    .eq('id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (!company) return NextResponse.json({ error: 'company_not_found' }, { status: 404 });

  const { data: settings } = await supabase
    .from('funcionaria_company_settings')
    .select('company_id,storefront_payment_mode,storefront_commission_bps')
    .eq('company_id', companyId)
    .maybeSingle();
  if (!settings) return NextResponse.json({ error: 'not_funcionaria' }, { status: 404 });

  const productIds = items.map((item) => item.produto_id);
  const { data: products, error: productsError } = await supabase
    .from('produtos_venda')
    .select('id,nome,preco_venda,estoque_atual,controla_estoque,is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .in('id', productIds);

  if (productsError || !products || products.length !== productIds.length) {
    return NextResponse.json({ error: 'invalid_products' }, { status: 409 });
  }

  const byId = new Map(products.map((p: any) => [p.id, p]));
  let subtotal = 0;
  for (const item of items) {
    const product: any = byId.get(item.produto_id);
    if (!product) return NextResponse.json({ error: 'invalid_products' }, { status: 409 });
    if (product.controla_estoque === true && Number(product.estoque_atual || 0) < item.quantidade) {
      return NextResponse.json(
        { error: 'insufficient_stock', product_name: product.nome },
        { status: 409 },
      );
    }
    subtotal += Number(product.preco_venda || 0) * item.quantidade;
  }

  const subtotalCents = Math.round(subtotal * 100);
  let orderTotal = subtotal;
  const deliveryQuote = deliveryQuoteToken ? verifyDeliveryQuoteToken(deliveryQuoteToken) : null;
  if (deliveryQuoteToken && !deliveryQuote) {
    return NextResponse.json({ error: 'invalid_or_expired_delivery_quote' }, { status: 409 });
  }
  if (deliveryQuote) {
    if (company.delivery_enabled !== true || deliveryQuote.companyId !== companyId || deliveryQuote.subtotalCents !== subtotalCents) {
      return NextResponse.json({ error: 'delivery_quote_mismatch' }, { status: 409 });
    }
    const phoneDigits = String(clienteTelefone || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      return NextResponse.json({ error: 'customer_phone_required' }, { status: 400 });
    }
    orderTotal = subtotal + (deliveryQuote.whoPays === 'cliente' ? deliveryQuote.priceCents / 100 : 0);
  }

  const { data: existingOrder } = await supabase
    .from('pedidos')
    .select('id,total,status')
    .eq('company_id', companyId)
    .eq('public_order_idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existingOrder) {
    try {
      const storefrontPayment = await prepareStorefrontPayment(supabase, existingOrder.id, companyId);
      return NextResponse.json({
        ok: true,
        kind: 'storefront_checkout',
        replayed: true,
        order: {
          pedido_id: existingOrder.id,
          total: Number(existingOrder.total || orderTotal),
          status: existingOrder.status,
        },
        storefront_payment: storefrontPayment,
      });
    } catch {
      return NextResponse.json({ error: 'storefront_checkout_failed' }, { status: 500 });
    }
  }

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      company_id: companyId,
      public_order_idempotency_key: idempotencyKey,
      cliente_nome: clienteNome,
      cliente_telefone: clienteTelefone,
      subtotal,
      desconto: 0,
      total: orderTotal,
      status: 'aberto',
      storefront_payment_mode_snapshot: settings.storefront_payment_mode || 'commission',
      storefront_commission_bps_snapshot: Number(settings.storefront_commission_bps || 500),
      ...(deliveryQuote ? {
        delivery_requested: true,
        delivery_address: deliveryQuote.address,
        delivery_fee_cents: deliveryQuote.priceCents,
        delivery_fee_original_cents: deliveryQuote.priceOriginalCents,
        delivery_who_pays_snapshot: deliveryQuote.whoPays,
        lalamove_quotation_id: deliveryQuote.quotationId,
        lalamove_quote_expires_at: deliveryQuote.expiresAt,
        delivery_quote_request_id: cleanUuid(deliveryQuote.quoteRequestId) || null,
        delivery_dispatch_state: 'ready',
      } : {}),
      observacoes,
      platform: 'funcionaria_web',
    })
    .select('id,total,status')
    .single();

  if (pedidoError?.code === '23505') {
    const { data: replay } = await supabase
      .from('pedidos')
      .select('id,total,status')
      .eq('company_id', companyId)
      .eq('public_order_idempotency_key', idempotencyKey)
      .maybeSingle();
    if (replay) {
      try {
        const storefrontPayment = await prepareStorefrontPayment(supabase, replay.id, companyId);
        return NextResponse.json({
          ok: true,
          kind: 'storefront_checkout',
          replayed: true,
          order: {
            pedido_id: replay.id,
            total: Number(replay.total || orderTotal),
            status: replay.status,
          },
          storefront_payment: storefrontPayment,
        });
      } catch {
        return NextResponse.json({ error: 'storefront_checkout_failed' }, { status: 500 });
      }
    }
  }
  if (pedidoError || !pedido) {
    console.error('[funcionaria/public-order] pedido:', pedidoError?.message);
    return NextResponse.json({ error: 'order_create_failed' }, { status: 500 });
  }

  const rows = items.map((item) => {
    const product: any = byId.get(item.produto_id);
    const unit = Number(product.preco_venda || 0);
    return {
      pedido_id: pedido.id,
      produto_id: item.produto_id,
      nome_snapshot: product.nome,
      preco_unitario: unit,
      quantidade: item.quantidade,
      subtotal: unit * item.quantidade,
    };
  });

  const { error: itemsError } = await supabase.from('pedido_itens').insert(rows);
  if (itemsError) {
    console.error('[funcionaria/public-order] itens:', itemsError.message);
    await supabase.from('pedidos').delete().eq('id', pedido.id);
    return NextResponse.json({ error: 'order_items_create_failed' }, { status: 500 });
  }

  try {
    const storefrontPayment = await prepareStorefrontPayment(supabase, pedido.id, companyId);
    return NextResponse.json({
      ok: true,
      kind: 'storefront_checkout',
      order: {
        pedido_id: pedido.id,
        total: Number(pedido.total || orderTotal),
        status: pedido.status,
      },
      storefront_payment: storefrontPayment,
    });
  } catch (checkoutError) {
    console.error('[funcionaria/public-order] storefront payment:', checkoutError);
    return NextResponse.json({ error: 'storefront_checkout_failed' }, { status: 500 });
  }
}
