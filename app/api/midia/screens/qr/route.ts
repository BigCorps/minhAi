import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getUser } from '@/lib/supabase-server';
import { adminMidia } from '@/lib/midia/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });

  const url = new URL(request.url);
  const screenId = (url.searchParams.get('screenId') || '').trim();
  if (!screenId) return NextResponse.json({ error: 'Tela não informada.' }, { status: 400 });

  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id,slug')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });

  const { data: screen } = await admin
    .from('screens')
    .select('id,public_code,name,commercial_mode')
    .eq('id', screenId)
    .eq('publisher_id', publisher.id)
    .maybeSingle();
  if (!screen || !['partner','hybrid'].includes(screen.commercial_mode)) {
    return NextResponse.json({ error: 'Esta tela não participa da rede de anúncios.' }, { status: 404 });
  }

  const target = `https://${publisher.slug}.midia.pro/anuncie/${screen.public_code}`;
  const svg = await QRCode.toString(target, {
    type: 'svg',
    margin: 2,
    width: 640,
    errorCorrectionLevel: 'H',
    color: { dark: '#003295', light: '#FFFFFF' },
  });

  const download = url.searchParams.get('download') === '1';
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      ...(download ? { 'Content-Disposition': `attachment; filename="midia-pro-${screen.public_code}.svg"` } : {}),
    },
  });
}
