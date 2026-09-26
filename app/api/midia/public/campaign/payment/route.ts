import { NextResponse } from 'next/server';
import { adminMidia, adminMidiaStorage, getMidiaCampaignBySecret } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

const COOKIE = 'midia_campaign_draft';

function campaignCookie(request: Request) {
  const raw = request.headers.get('cookie') || '';
  const value = raw.split(';').map((v) => v.trim()).find((v) => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    const dot = decoded.indexOf('.');
    if (dot < 1) return null;
    return { campaignId: decoded.slice(0, dot), secret: decoded.slice(dot + 1) };
  } catch { return null; }
}

async function campaignContext(request: Request, campaignId?: string | null) {
  const cookie = campaignCookie(request);
  const id = String(campaignId || cookie?.campaignId || '').trim();
  if (!cookie || !id || cookie.campaignId !== id) return null;
  const campaign = await getMidiaCampaignBySecret(id, cookie.secret);
  return campaign ? { campaign, cookie } : null;
}

async function paymentPayload(campaignId: string) {
  const admin = adminMidia();
  const { data: payment } = await admin
    .from('campaign_payments')
    .select('id,campaign_id,pix_transaction_id,provider,txid,pix_code,qr_code_url,amount_cents,status,expires_at,confirmed_at,created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!payment) return null;

  const publicAdmin = adminMidiaStorage();
  const { data: tx } = await publicAdmin
    .from('pix_transactions')
    .select('id,status,txid,pix_code,amount_cents,expires_at,payment_provider,purpose')
    .eq('id', payment.pix_transaction_id)
    .maybeSingle();

  if (tx?.status === 'confirmed' && payment.status !== 'confirmed') {
    const { error } = await admin.rpc('finalize_campaign_payment', { p_pix_transaction_id: tx.id });
    if (error) console.error('[midia/payment] finalize retry:', error.message);
  }

  const { data: refreshed } = await admin
    .from('campaign_payments')
    .select('id,campaign_id,pix_transaction_id,provider,txid,pix_code,qr_code_url,amount_cents,status,expires_at,confirmed_at,created_at')
    .eq('id', payment.id)
    .maybeSingle();

  return {
    id: payment.id,
    transactionId: payment.pix_transaction_id,
    txid: refreshed?.txid ?? tx?.txid ?? payment.txid,
    pixCode: refreshed?.pix_code || tx?.pix_code || payment.pix_code,
    qrCodeUrl: refreshed?.qr_code_url || payment.qr_code_url,
    amountCents: Number(refreshed?.amount_cents ?? payment.amount_cents),
    status: refreshed?.status ?? payment.status,
    providerStatus: tx?.status ?? null,
    expiresAt: refreshed?.expires_at ?? tx?.expires_at ?? payment.expires_at,
    confirmedAt: refreshed?.confirmed_at ?? null,
  };
}

async function deliveryPayload(campaignId: string) {
  const admin = adminMidia();
  const { data } = await admin
    .from('campaign_settlements')
    .select('total_occurrences,delivered_occurrences,status')
    .eq('campaign_id', campaignId)
    .maybeSingle();
  return data ? {
    totalOccurrences: Number(data.total_occurrences),
    deliveredOccurrences: Number(data.delivered_occurrences),
    status: data.status,
  } : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ctx = await campaignContext(request, url.searchParams.get('campaignId'));
  if (!ctx) return NextResponse.json({ error: 'campaign_session_invalid' }, { status: 401 });

  const payment = await paymentPayload(ctx.campaign.id);
  const refreshed = await getMidiaCampaignBySecret(ctx.campaign.id, ctx.cookie.secret);
  if (!refreshed) return NextResponse.json({ error: 'campaign_not_found' }, { status: 404 });

  return NextResponse.json({
    campaign: {
      id: refreshed.id,
      status: refreshed.status,
      paidAt: refreshed.paid_at,
      rejectionReason: refreshed.rejection_reason,
      totalPriceCents: Number(refreshed.total_price_cents),
      estimatedOccurrences: Number(refreshed.estimated_occurrences),
    },
    payment,
    delivery: await deliveryPayload(refreshed.id),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { campaignId?: string } | null;
  const ctx = await campaignContext(request, body?.campaignId);
  if (!ctx) return NextResponse.json({ error: 'campaign_session_invalid' }, { status: 401 });

  const campaign = ctx.campaign;
  if (campaign.paid_at || ['under_review','rejected','scheduled','running','completed'].includes(campaign.status)) {
    return NextResponse.json({ campaign: { id: campaign.id, status: campaign.status }, payment: await paymentPayload(campaign.id), delivery: await deliveryPayload(campaign.id) });
  }
  if (!['awaiting_payment','payment_pending'].includes(campaign.status)) {
    return NextResponse.json({ error: 'campaign_not_payable' }, { status: 409 });
  }

  const admin = adminMidia();
  const existing = await paymentPayload(campaign.id);
  if (existing && existing.status === 'pending' && new Date(existing.expiresAt).getTime() > Date.now() + 20_000) {
    const response = NextResponse.json({ campaign: { id: campaign.id, status: 'payment_pending' }, payment: existing });
    response.cookies.set(COOKIE, `${ctx.cookie.campaignId}.${ctx.cookie.secret}`, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/midia/public/campaign', maxAge: 60 * 60 * 24 * 30 });
    return response;
  }

  if (existing && existing.status === 'pending') {
    await admin.from('campaign_payments').update({ status: 'expired' }).eq('id', existing.id);
  }

  // Compatibilidade proposital: usamos a faixa de cobrança retida do ConviteIA
  // somente para forçar recebimento BigCorps/Banco Inter e silenciar notificações
  // da empresa-plataforma. `purpose=midia_campaign` é a identidade financeira
  // real e impede crédito em company_balance. Nenhuma lógica de ConviteIA é usada
  // como fonte de verdade da campanha.
  const pixResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-pix-assistente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({
      origem: 'conviteria',
      referencia_id: campaign.id,
      valor_centavos: Number(campaign.total_price_cents),
      descricao: `Midia.Pro · campanha ${campaign.id.slice(0, 8).toUpperCase()}`,
      purpose: 'midia_campaign',
      tipo: 'presente',
      brand: 'midia',
    }),
  });
  const pix = await pixResponse.json().catch(() => null);
  if (!pixResponse.ok || !pix?.transaction_id || !pix?.copia_e_cola) {
    console.error('[midia/payment] gerar pix:', pix);
    return NextResponse.json({ error: pix?.message || pix?.error || 'Não foi possível gerar o PIX.' }, { status: 502 });
  }

  const expiresAt = pix.expires_at || new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { data: payment, error: paymentError } = await admin
    .from('campaign_payments')
    .insert({
      campaign_id: campaign.id,
      pix_transaction_id: pix.transaction_id,
      provider: pix.payment_provider || 'bigcorps',
      txid: pix.txid ?? null,
      pix_code: pix.copia_e_cola,
      qr_code_url: pix.qrcode ?? pix.qr_code_url ?? null,
      amount_cents: Number(campaign.total_price_cents),
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (paymentError || !payment) {
    console.error('[midia/payment] payment row:', paymentError);
    return NextResponse.json({ error: 'O PIX foi criado, mas não foi possível vincular o pagamento à campanha.' }, { status: 500 });
  }

  await Promise.all([
    admin.from('campaigns').update({ status: 'payment_pending' }).eq('id', campaign.id).in('status', ['awaiting_payment','payment_pending']),
    admin.from('campaign_inventory_holds').update({ expires_at: new Date(new Date(expiresAt).getTime() + 5 * 60 * 1000).toISOString() }).eq('campaign_id', campaign.id).eq('status', 'pending'),
  ]);

  const payload = await paymentPayload(campaign.id);
  const response = NextResponse.json({ campaign: { id: campaign.id, status: 'payment_pending' }, payment: payload });
  response.cookies.set(COOKIE, `${ctx.cookie.campaignId}.${ctx.cookie.secret}`, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/midia/public/campaign', maxAge: 60 * 60 * 24 * 30 });
  return response;
}
