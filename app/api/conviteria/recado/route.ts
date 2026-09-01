import { NextResponse, type NextRequest } from 'next/server';
import {
  adminConviteria, hashIp, ipDaRequisicao, validarTurnstile,
} from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('evento')?.trim();
  if (!eventoId) return NextResponse.json({ recados: [] });

  const admin = adminConviteria();
  const { data: evento } = await admin.from('eventos')
    .select('id').eq('id', eventoId).not('publicado_em', 'is', null).maybeSingle();
  if (!evento) return NextResponse.json({ recados: [] });

  const { data } = await admin.from('recados')
    .select('id,nome,mensagem,created_at')
    .eq('evento_id', eventoId)
    .eq('aprovado', true)
    .order('created_at', { ascending: false })
    .limit(12);

  return NextResponse.json({
    recados: (data ?? []).map((r: any) => ({
      id: r.id, nome: r.nome, mensagem: r.mensagem, createdAt: r.created_at,
    })),
  });
}

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

  const { count } = await admin.from('recados')
    .select('id', { count: 'exact', head: true })
    .eq('evento_id', corpo.eventoId).eq('ip_hash', ipHash);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ erro: 'Muitos recados deste dispositivo.' }, { status: 429 });
  }

  const { data: evento } = await admin.from('eventos')
    .select('id').eq('id', corpo.eventoId)
    .not('publicado_em', 'is', null).maybeSingle();

  if (!evento) return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });

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
