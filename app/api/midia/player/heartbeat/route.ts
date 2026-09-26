import { NextResponse } from 'next/server';
import { adminMidia, canMidiaScreenPlay, getMidiaDeviceContext } from '@/lib/midia/server';

export async function POST(request: Request) {
  const ctx = await getMidiaDeviceContext(request);
  if (!ctx) return NextResponse.json({ error: 'player_unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    playlistVersion?: number;
    appVersion?: string;
    cacheItems?: number;
    pendingProofs?: number;
  } | null;

  const appVersion = String(body?.appVersion ?? 'web-1').slice(0, 40);
  const playerVersion = Number.isFinite(Number(body?.playlistVersion)) ? Math.max(0, Math.floor(Number(body?.playlistVersion))) : null;
  const now = new Date().toISOString();
  const admin = adminMidia();

  await Promise.all([
    admin.from('devices').update({
      last_seen_at: now,
      app_version: appVersion,
      last_playlist_version: playerVersion,
      capabilities: {
        player: 'web',
        cache: 'cache-storage-v1',
        cache_items: Math.max(0, Math.min(10000, Math.floor(Number(body?.cacheItems ?? 0)))),
        pending_proofs: Math.max(0, Math.min(5000, Math.floor(Number(body?.pendingProofs ?? 0)))),
      },
    }).eq('id', ctx.device.id),
    admin.from('screens').update({ last_seen_at: now }).eq('id', ctx.screen.id),
  ]);

  return NextResponse.json({
    ok: true,
    canPlay: canMidiaScreenPlay(ctx),
    playlistVersion: ctx.screen.playlist_version,
    refresh: playerVersion == null || playerVersion !== ctx.screen.playlist_version,
    serverTime: now,
  });
}
