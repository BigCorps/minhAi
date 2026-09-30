import { NextResponse, type NextRequest } from 'next/server';
import { resolverLinkGravataWhatsApp } from '@/lib/conviteria/gravata-whatsapp-servidor';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, contexto: { params: Promise<{ token: string }> }) {
  const { token } = await contexto.params;
  const dados = await resolverLinkGravataWhatsApp(String(token ?? '').trim());
  if (!dados) return NextResponse.redirect(new URL('/convite', req.url));

  const destino = new URL(`https://${dados.slug}.conviteia.com/memorias`);
  destino.searchParams.set('acao', 'contribuir');
  destino.searchParams.set('origem', 'whatsapp');
  destino.searchParams.set('t', token);
  return NextResponse.redirect(destino);
}
