import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminMidia, adminMidiaStorage, getMidiaCampaignBySecret } from '@/lib/midia/server';

const BUCKET = 'midia-assets';
const COOKIE = 'midia_campaign_draft';

async function secretForCampaign(campaignId: string) {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value || '';
  const prefix = `${campaignId}.`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : '';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as any;
  const campaignId = String(body?.campaignId ?? '').trim();
  const creativeId = String(body?.creativeId ?? '').trim();
  if (!campaignId || !creativeId) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });

  const secret = await secretForCampaign(campaignId);
  const campaign = await getMidiaCampaignBySecret(campaignId, secret);
  if (!campaign) return NextResponse.json({ error: 'Rascunho de campanha inválido.' }, { status: 401 });
  if (!campaign.paid_at && new Date(campaign.quote_expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'A reserva expirou. Refaça a campanha.' }, { status: 410 });

  const admin = adminMidia();
  const { data: creative } = await admin
    .from('ad_creatives')
    .select('id,campaign_id,storage_path,size_bytes,status')
    .eq('id', creativeId)
    .eq('campaign_id', campaignId)
    .eq('status', 'uploading')
    .maybeSingle();
  if (!creative) return NextResponse.json({ error: 'Upload não encontrado.' }, { status: 404 });

  const storage = adminMidiaStorage();
  const { data: info, error: infoError } = await storage.storage.from(BUCKET).info(creative.storage_path);
  const actualSize = Number((info as any)?.size ?? 0);
  if (infoError || !info || actualSize <= 0 || actualSize !== Number(creative.size_bytes)) {
    await admin.from('ad_creatives').update({ status: 'failed' }).eq('id', creative.id);
    return NextResponse.json({ error: 'O arquivo não chegou completo. Tente enviar novamente.' }, { status: 409 });
  }

  const { error: readyError } = await admin
    .from('ad_creatives')
    .update({ status: 'ready' })
    .eq('id', creative.id)
    .eq('status', 'uploading');
  if (readyError) {
    console.error('[midia/public/campaign/complete] ready:', readyError);
    return NextResponse.json({ error: 'Não foi possível finalizar o anúncio.' }, { status: 500 });
  }

  await admin
    .from('ad_creatives')
    .update({ status: 'replaced' })
    .eq('campaign_id', campaignId)
    .neq('id', creative.id)
    .in('status', ['ready','uploading']);

  const nextStatus = campaign.status === 'rejected' || campaign.paid_at ? 'under_review' : 'awaiting_payment';
  const { error: campaignError } = await admin
    .from('campaigns')
    .update({ status: nextStatus, rejection_reason: null, reviewed_at: null })
    .eq('id', campaignId)
    .in('status', ['draft','awaiting_payment','rejected','under_review']);

  if (campaignError) {
    console.error('[midia/public/campaign/complete] campaign:', campaignError);
    return NextResponse.json({ error: 'A peça foi salva, mas a campanha não pôde ser atualizada.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    campaign: {
      id: campaign.id,
      totalPriceCents: Number(campaign.total_price_cents),
      estimatedOccurrences: Number(campaign.estimated_occurrences),
      quoteExpiresAt: campaign.quote_expires_at,
      status: nextStatus,
    },
  });
}
