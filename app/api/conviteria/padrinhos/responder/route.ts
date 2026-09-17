import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, buscarEventoAcessivelPorId } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as any;
  const eventoId = String(b?.eventoId ?? '').trim(); const slug = String(b?.slug ?? '').trim();
  if (!eventoId || !slug || !(await buscarEventoAcessivelPorId(eventoId))) return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });
  const admin = adminConviteria();
  const { data, error } = await admin.from('padrinhos_convites').update({ resposta: 'aceito', respondido_em: new Date().toISOString() }).eq('evento_id', eventoId).eq('slug', slug).select('id,resposta,respondido_em').maybeSingle();
  if (error || !data) return NextResponse.json({ erro: 'Não foi possível registrar a resposta.' }, { status: 500 });
  return NextResponse.json({ ok: true, resposta: data });
}
