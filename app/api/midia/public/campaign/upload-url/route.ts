import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminMidia, adminMidiaStorage, getMidiaCampaignBySecret } from '@/lib/midia/server';

const BUCKET = 'midia-assets';
const COOKIE = 'midia_campaign_draft';
const ALLOWED_MIMES = new Set(['image/jpeg','image/png','image/webp','video/mp4','video/webm']);

function extension(mime: string) {
  return ({
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/webm': 'webm',
  } as Record<string,string>)[mime] || 'bin';
}

async function secretForCampaign(campaignId: string) {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value || '';
  const prefix = `${campaignId}.`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : '';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as any;
  if (!body) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });

  const campaignId = String(body.campaignId ?? '').trim();
  const fileName = String(body.fileName ?? '').trim().replace(/[\r\n]/g, '').slice(0, 180);
  const mimeType = String(body.mimeType ?? '').trim().toLowerCase();
  const sizeBytes = Math.floor(Number(body.sizeBytes ?? 0));
  const width = Math.floor(Number(body.width ?? 0));
  const height = Math.floor(Number(body.height ?? 0));
  const durationSeconds = body.durationSeconds == null ? null : Number(body.durationSeconds);
  const source = body.source === 'card_builder' ? 'card_builder' : 'upload';

  if (!campaignId || !fileName || !ALLOWED_MIMES.has(mimeType)) return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 });
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 50 * 1024 * 1024) return NextResponse.json({ error: 'O arquivo deve ter no máximo 50 MB.' }, { status: 400 });
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= width) return NextResponse.json({ error: 'A peça precisa ser vertical.' }, { status: 400 });

  const kind = mimeType.startsWith('video/') ? 'video' : 'image';
  if (kind === 'video' && (!Number.isFinite(durationSeconds) || durationSeconds! < 29.5 || durationSeconds! > 60.5)) {
    return NextResponse.json({ error: 'O vídeo precisa ter entre 30 e 60 segundos.' }, { status: 400 });
  }

  const secret = await secretForCampaign(campaignId);
  const campaign = await getMidiaCampaignBySecret(campaignId, secret);
  if (!campaign) return NextResponse.json({ error: 'Rascunho de campanha inválido ou expirado.' }, { status: 401 });
  if (!['draft','awaiting_payment','rejected'].includes(campaign.status)) return NextResponse.json({ error: 'Esta campanha não pode mais ser alterada.' }, { status: 409 });
  if (!campaign.paid_at && new Date(campaign.quote_expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'A reserva de preço expirou. Refaça a campanha.' }, { status: 410 });

  if (kind === 'video') {
    const billed = durationSeconds! <= 30.5 ? 30 : durationSeconds! <= 45.5 ? 45 : 60;
    if (billed !== Number(campaign.duration_seconds)) {
      return NextResponse.json({ error: `A campanha foi contratada para ${campaign.duration_seconds}s. Envie um vídeo da mesma faixa de duração.` }, { status: 400 });
    }
  }

  const admin = adminMidia();
  const storagePath = `ads/${campaign.id}/${randomBytes(12).toString('hex')}.${extension(mimeType)}`;
  const { data: creative, error: insertError } = await admin
    .from('ad_creatives')
    .insert({
      campaign_id: campaign.id,
      kind,
      source,
      file_name: fileName,
      mime_type: mimeType,
      storage_path: storagePath,
      size_bytes: sizeBytes,
      duration_seconds: kind === 'video' ? durationSeconds : null,
      width,
      height,
      status: 'uploading',
      metadata: source === 'card_builder' ? { generated_by: 'midia_card_builder_v1' } : {},
    })
    .select('id,storage_path')
    .single();

  if (insertError || !creative) {
    console.error('[midia/public/campaign/upload-url] creative:', insertError);
    return NextResponse.json({ error: 'Não foi possível preparar o upload.' }, { status: 500 });
  }

  const storage = adminMidiaStorage();
  const { data: signed, error: signedError } = await storage.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if (signedError || !signed?.token) {
    await admin.from('ad_creatives').update({ status: 'failed' }).eq('id', creative.id);
    console.error('[midia/public/campaign/upload-url] signed:', signedError);
    return NextResponse.json({ error: 'Não foi possível preparar o envio do arquivo.' }, { status: 500 });
  }

  if (campaign.status !== 'rejected') await admin.from('campaigns').update({ status: 'draft' }).eq('id', campaign.id);

  return NextResponse.json({
    ok: true,
    creativeId: creative.id,
    bucket: BUCKET,
    path: storagePath,
    token: signed.token,
  });
}
