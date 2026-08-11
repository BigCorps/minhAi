import { NextResponse, type NextRequest } from 'next/server';
import {
  adminConviteria, hashIp, ipDaRequisicao, validarTurnstile,
} from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = ipDaRequisicao(req);
  const corpo = (await req.json().catch(() => null)) as {
    eventoId?: string; nome?: string; mensagem?: string; turnstile?: string;
  } | null;

  if (!corpo?.eventoId || !corpo.nome?.trim() || !corpo.mensagem?.trim()) {
    return NextResponse.json({ erro: 'Preencha nome e mensagem.' }, { status: 400 });
  }
  if (!(await validarTurnstile(corpo.turnstile, ip))) {
    return NextResponse.json({ erro: 'Verificação falhou.' }, { status: 403 });
  }

  const admin = adminConviteria();
  const ipHash = hashIp(ip);

  const { count } = await admin
    .from('recados').select('id', { count: 'exact', head: true })
    .eq('evento_id', corpo.eventoId).eq('ip_hash', ipHash);
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ erro: 'Muitos recados deste dispositivo.' }, { status: 429 });
  }

  const { data: evento } = await admin
    .from('eventos').select('id').eq('id', corpo.eventoId)
    .not('publicado_em', 'is', null).maybeSingle();
  if (!evento) return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });

  // aprovado = false: mural entra moderado. O anfitriao libera no dashboard.
  const { error } = await admin.from('recados').insert({
    evento_id: corpo.eventoId,
    nome: corpo.nome.trim().slice(0, 80),
    mensagem: corpo.mensagem.trim().slice(0, 600),
    aprovado: false,
    ip_hash: ipHash,
  });

  if (error) return NextResponse.json({ erro: 'Não foi possível enviar.' }, { status: 500 });
  return NextResponse.json({ ok: true, moderado: true });
}
