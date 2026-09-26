import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';

const ALLOWED = new Set(['image/jpeg','image/png','image/webp','video/mp4','video/webm']);
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const body = await request.json().catch(() => null) as { creativeId?: string; screenId?: string } | null;
  const creativeId = String(body?.creativeId ?? '').trim();
  const screenId = String(body?.screenId ?? '').trim();
  if (!creativeId || !screenId) return NextResponse.json({ error: 'Upload inválido.' }, { status: 400 });

  const admin = adminMidia();
  const { data: publisher } = await admin.from('publishers').select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });

  const [{ data: screen }, { data: creative }] = await Promise.all([
    admin.from('screens').select('id').eq('id', screenId).eq('publisher_id', publisher.id).neq('status', 'archived').maybeSingle(),
    admin.from('creatives').select('id,storage_path,mime_type,size_bytes,status,metadata').eq('id', creativeId).eq('publisher_id', publisher.id).maybeSingle(),
  ]);
  if (!screen || !creative || creative.status !== 'uploading') return NextResponse.json({ error: 'Upload não encontrado ou já finalizado.' }, { status: 409 });

  const storage = adminMidiaStorage();
  const { data: info, error: infoError } = await storage.storage.from('midia-assets').info(creative.storage_path);
  const actualSize = Number(info?.size ?? 0);
  const actualMime = String(info?.contentType ?? creative.mime_type).toLowerCase();
  if (infoError || !actualSize || actualSize > MAX_BYTES || !ALLOWED.has(actualMime)) {
    await Promise.all([
      storage.storage.from('midia-assets').remove([creative.storage_path]),
      admin.from('creatives').update({ status: 'failed' }).eq('id', creative.id),
    ]);
    return NextResponse.json({ error: 'O arquivo enviado não passou na validação.' }, { status: 400 });
  }

  const displaySeconds = Math.max(30, Math.min(60, Math.floor(Number((creative.metadata as any)?.display_seconds ?? 30))));
  const { data: maxItem } = await admin
    .from('screen_playlist_items')
    .select('sort_order')
    .eq('screen_id', screen.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = Number(maxItem?.sort_order ?? 0) + 10;

  const { error: readyError } = await admin
    .from('creatives')
    .update({ status: 'ready', size_bytes: actualSize, mime_type: actualMime })
    .eq('id', creative.id)
    .eq('status', 'uploading');
  if (readyError) return NextResponse.json({ error: 'Não foi possível finalizar a mídia.' }, { status: 500 });

  const { data: item, error: itemError } = await admin.from('screen_playlist_items').insert({
    screen_id: screen.id,
    creative_id: creative.id,
    source: 'own',
    display_seconds: displaySeconds,
    sort_order: sortOrder,
    active: true,
  }).select('id').single();

  if (itemError) {
    console.error('[midia/media/complete] playlist:', itemError);
    await Promise.all([
      storage.storage.from('midia-assets').remove([creative.storage_path]),
      admin.from('creatives').update({ status: 'failed' }).eq('id', creative.id),
    ]);
    return NextResponse.json({ error: 'A mídia foi enviada, mas não entrou na playlist.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, playlistItemId: item.id });
}
