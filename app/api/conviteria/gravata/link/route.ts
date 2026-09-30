import { NextResponse, type NextRequest } from 'next/server';
import { resolverLinkGravataWhatsApp } from '@/lib/conviteria/gravata-whatsapp-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('t')?.trim();
  if (!token) return NextResponse.json({ erro: 'Link inválido.' }, { status: 400 });
  const dados = await resolverLinkGravataWhatsApp(token);
  if (!dados) return NextResponse.json({ erro: 'Link inválido ou indisponível.' }, { status: 404 });
  return NextResponse.json({
    eventoId: dados.eventoId,
    nome: dados.nome,
    origem: 'whatsapp',
  });
}
