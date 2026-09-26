import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia, hashMidiaDeviceSecret } from '@/lib/midia/server';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function pairingCode() {
  const bytes = randomBytes(8);
  let raw = '';
  for (let i = 0; i < 8; i += 1) raw += ALPHABET[bytes[i] % ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const body = await request.json().catch(() => null) as { screenId?: string } | null;
  const screenId = String(body?.screenId ?? '').trim();
  if (!screenId) return NextResponse.json({ error: 'Tela não informada.' }, { status: 400 });

  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id,slug,status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });

  const { data: screen } = await admin
    .from('screens')
    .select('id,name,status,billing_status')
    .eq('id', screenId)
    .eq('publisher_id', publisher.id)
    .neq('status', 'archived')
    .maybeSingle();
  if (!screen) return NextResponse.json({ error: 'Tela não encontrada.' }, { status: 404 });

  // Códigos antigos deixam de valer, mas o player já pareado continua ativo
  // até que um NOVO dispositivo conclua o pareamento.
  await admin
    .from('devices')
    .update({ revoked_at: new Date().toISOString(), pairing_code_hash: null, pairing_expires_at: null })
    .eq('screen_id', screen.id)
    .is('paired_at', null)
    .is('revoked_at', null);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = pairingCode();
    const normalized = code.replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error } = await admin.from('devices').insert({
      screen_id: screen.id,
      pairing_code_hash: hashMidiaDeviceSecret(normalized),
      pairing_expires_at: expiresAt,
      capabilities: { player: 'web', cache: 'cache-storage-v1' },
    });

    if (!error) {
      return NextResponse.json({
        ok: true,
        code,
        expiresAt,
        playerUrl: `https://${publisher.slug}.midia.pro/play`,
        activationPending: !['not_required', 'active'].includes(screen.billing_status),
      });
    }
    if (error.code !== '23505') {
      console.error('[midia/device-pairing] create:', error);
      break;
    }
  }

  return NextResponse.json({ error: 'Não foi possível gerar o código de pareamento.' }, { status: 500 });
}
