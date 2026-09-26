import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminMidia, hashMidiaDeviceSecret } from '@/lib/midia/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    code?: string;
    publisherSlug?: string;
    deviceName?: string;
    appVersion?: string;
  } | null;

  const code = String(body?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const publisherSlug = String(body?.publisherSlug ?? '').toLowerCase().trim();
  const deviceName = String(body?.deviceName ?? '').trim().replace(/\s+/g, ' ').slice(0, 80) || null;
  const appVersion = String(body?.appVersion ?? 'web-1').trim().slice(0, 40);

  if (code.length !== 8 || !/^[A-Z0-9]+$/.test(code)) {
    return NextResponse.json({ error: 'Código de pareamento inválido.' }, { status: 400 });
  }
  if (!publisherSlug || !/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(publisherSlug)) {
    return NextResponse.json({ error: 'Endereço Midia.Pro inválido.' }, { status: 400 });
  }

  const rawToken = randomBytes(32).toString('base64url');
  const admin = adminMidia();
  const { data, error } = await admin.rpc('claim_device_pairing', {
    p_pairing_code_hash: hashMidiaDeviceSecret(code),
    p_device_token_hash: hashMidiaDeviceSecret(rawToken),
    p_device_name: deviceName,
    p_app_version: appVersion,
    p_publisher_slug: publisherSlug,
  });

  if (error) {
    console.error('[midia/player/pair] claim:', error);
    return NextResponse.json({ error: 'Não foi possível concluir o pareamento.' }, { status: 500 });
  }

  const claimed = Array.isArray(data) ? data[0] : data;
  if (!claimed) {
    return NextResponse.json({ error: 'Código inválido, expirado ou já utilizado.' }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    deviceToken: rawToken,
    deviceId: claimed.device_id,
    screen: {
      id: claimed.screen_id,
      name: claimed.screen_name,
      playlistVersion: Number(claimed.playlist_version),
      canPlay: Boolean(claimed.can_play),
    },
  });
}
