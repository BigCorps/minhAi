import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { cleanUuid } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FUNCTION_TO_METHOD: Record<string, 'pix' | 'nfc' | 'tef'> = {
  pix_generate: 'pix',
  link_pagamento: 'pix',
  nfc_debito: 'nfc',
  nfc_credito: 'nfc',
  tef_debito: 'tef',
  tef_credito: 'tef',
};
const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: noStore }); }

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const companyId = cleanUuid(body?.company_id);
  const value = Number(body?.valor);
  const functionKey = String(body?.function_key || '');
  const method = FUNCTION_TO_METHOD[functionKey];

  if (!companyId || !method || !Number.isFinite(value) || value <= 0 || value > 10_000_000) {
    return json({ error: 'invalid_order' }, 400);
  }

  const admin = createAdminClient();
  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id,user_id,is_active')
    .eq('id', companyId)
    .maybeSingle();
  if (companyError) return json({ error: 'company_lookup_failed' }, 500);
  if (!company || company.is_active === false) return json({ error: 'company_not_found' }, 404);

  const { data: pedido, error } = await admin
    .from('pedidos')
    .insert({
      company_id: companyId,
      user_id: company.user_id || null,
      subtotal: value,
      desconto: 0,
      total: value,
      metodo_pagamento: method,
      status: 'aguardando_pagamento',
      observacoes: 'Pedido via assistente de voz',
      platform: 'voice_assistant',
    })
    .select('id')
    .single();

  if (error || !pedido) return json({ error: 'order_create_failed' }, 500);
  return json({ ok: true, pedido_id: pedido.id });
}
