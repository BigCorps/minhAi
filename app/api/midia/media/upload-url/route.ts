import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';

const MAX_BYTES = 50 * 1024 * 1024;
const MIME_KIND: Record<string, 'image' | 'video'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
};
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
  'video/mp4': '.mp4', 'video/webm': '.webm',
};

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    screenId?: string; fileName?: string; mimeType?: string; sizeBytes?: number;
    durationSeconds?: number | null; width?: number; height?: number; displaySeconds?: number; destinationUrl?: string | null;
  } | null;

  const screenId = String(body?.screenId ?? '').trim();
  const fileName = String(body?.fileName ?? '').trim().slice(0, 180);
  const providedMime = String(body?.mimeType ?? '').toLowerCase();
  const extension = extname(fileName).toLowerCase();
  const mimeType = providedMime || ({ '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm' } as Record<string,string>)[extension] || '';
  const sizeBytes = Math.floor(Number(body?.sizeBytes ?? 0));
  const kind = MIME_KIND[mimeType];
  const width = Math.floor(Number(body?.width ?? 0));
  const height = Math.floor(Number(body?.height ?? 0));
  const durationSeconds = body?.durationSeconds == null ? null : Number(body.durationSeconds);
  const displaySeconds = Math.floor(Number(body?.displaySeconds ?? 30));
  const destinationUrl = String(body?.destinationUrl ?? '').trim().slice(0, 1000) || null;

  if (!screenId || !fileName || !kind) return NextResponse.json({ error: 'Arquivo ou tela inválidos.' }, { status: 400 });
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_BYTES) return NextResponse.json({ error: 'O arquivo deve ter no máximo 50 MB.' }, { status: 400 });
  if (width <= 0 || height <= 0 || height <= width) return NextResponse.json({ error: 'Use uma mídia vertical (altura maior que a largura).' }, { status: 400 });
  if (displaySeconds < 30 || displaySeconds > 60) return NextResponse.json({ error: 'A exibição deve ter entre 30 e 60 segundos.' }, { status: 400 });
  if (destinationUrl && !/^https?:\/\//i.test(destinationUrl)) return NextResponse.json({ error: 'Informe um link começando com http:// ou https://.' }, { status: 400 });
  if (kind === 'video' && (!Number.isFinite(durationSeconds) || Number(durationSeconds) < 29.5 || Number(durationSeconds) > 60.5)) {
    return NextResponse.json({ error: 'O vídeo deve ter entre 30 e 60 segundos.' }, { status: 400 });
  }

  const admin = adminMidia();
  const { data: publisher } = await admin.from('publishers').select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });

  const { data: screen } = await admin.from('screens').select('id').eq('id', screenId).eq('publisher_id', publisher.id).neq('status', 'archived').maybeSingle();
  if (!screen) return NextResponse.json({ error: 'Tela não encontrada.' }, { status: 404 });

  const creativeId = randomUUID();
  const safeExt = EXT_BY_MIME[mimeType];
  const storagePath = `publishers/${publisher.id}/${creativeId}/original${safeExt}`;

  const { error: insertError } = await admin.from('creatives').insert({
    id: creativeId,
    publisher_id: publisher.id,
    kind,
    file_name: fileName,
    mime_type: mimeType,
    storage_path: storagePath,
    size_bytes: sizeBytes,
    duration_seconds: kind === 'video' ? durationSeconds : null,
    width,
    height,
    status: 'uploading',
    destination_url: destinationUrl,
    metadata: { requested_screen_id: screen.id, display_seconds: displaySeconds },
  });
  if (insertError) {
    console.error('[midia/media/upload-url] creative:', insertError);
    return NextResponse.json({ error: 'Não foi possível preparar o upload.' }, { status: 500 });
  }

  const storage = adminMidiaStorage();
  const { data: signed, error: signedError } = await storage.storage.from('midia-assets').createSignedUploadUrl(storagePath);
  if (signedError || !signed?.token) {
    await admin.from('creatives').delete().eq('id', creativeId);
    console.error('[midia/media/upload-url] signed:', signedError);
    return NextResponse.json({ error: 'Não foi possível preparar o envio do arquivo.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    creativeId,
    path: storagePath,
    token: signed.token,
    bucket: 'midia-assets',
    displaySeconds,
  });
}
