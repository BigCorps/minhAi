import { NextResponse, type NextRequest } from 'next/server';
import {
  buscarEventoMemoriasPublicado,
  resumoPublico,
  usoMemorias,
} from '@/lib/conviteria/memorias-servidor';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug')?.trim().toLowerCase();
  if (!slug) return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });

  const evento = await buscarEventoMemoriasPublicado(slug);
  if (!evento) return NextResponse.json({ erro: 'Memórias indisponíveis.' }, { status: 404 });

  const uso = await usoMemorias(evento.id);
  return NextResponse.json({ ...resumoPublico(evento), uso });
}
