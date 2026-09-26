import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const body = await request.json().catch(() => null) as { playlistItemId?: string } | null;
  const playlistItemId = String(body?.playlistItemId ?? '').trim();
  if (!playlistItemId) return NextResponse.json({ error: 'Mídia não informada.' }, { status: 400 });

  const admin = adminMidia();
  const { data: publisher } = await admin.from('publishers').select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });

  const { data: item } = await admin.from('screen_playlist_items').select('id,screen_id,creative_id').eq('id', playlistItemId).maybeSingle();
  if (!item) return NextResponse.json({ error: 'Mídia não encontrada.' }, { status: 404 });

  const { data: screen } = await admin.from('screens').select('id').eq('id', item.screen_id).eq('publisher_id', publisher.id).maybeSingle();
  if (!screen) return NextResponse.json({ error: 'Mídia não encontrada.' }, { status: 404 });

  const { error: deleteError } = await admin.from('screen_playlist_items').delete().eq('id', item.id);
  if (deleteError) return NextResponse.json({ error: 'Não foi possível remover a mídia.' }, { status: 500 });

  const { count } = await admin.from('screen_playlist_items').select('id', { count: 'exact', head: true }).eq('creative_id', item.creative_id);
  if ((count ?? 0) === 0) {
    const { data: creative } = await admin.from('creatives').select('storage_path').eq('id', item.creative_id).eq('publisher_id', publisher.id).maybeSingle();
    if (creative?.storage_path) {
      await adminMidiaStorage().storage.from('midia-assets').remove([creative.storage_path]);
    }
    await admin.from('creatives').update({ status: 'deleted' }).eq('id', item.creative_id).eq('publisher_id', publisher.id);
  }

  return NextResponse.json({ ok: true });
}
