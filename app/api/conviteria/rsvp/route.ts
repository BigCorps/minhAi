import { NextResponse, type NextRequest } from 'next/server';
import {
  adminConviteria, hashIp, ipDaRequisicao, validarTurnstile,
} from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = ipDaRequisicao(req);
  const corpo = (await req.json().catch(() => null)) as {
    eventoId?: string; nome?: string; contato?: string;
    comparecera?: boolean; adultos?: number; criancas?: number;
    observacoes?: string; turnstile?: string;
  } | null;

  if (!corpo?.eventoId || !corpo.nome?.trim()) {
    return NextResponse.json({ erro: 'Preencha seu nome.' }, { status: 400 });
  }
  if (!(await validarTurnstile(corpo.turnstile, ip))) {
    return NextResponse.json({ erro: 'Verificação falhou. Recarregue a página.' }, { status: 403 });
  }

  const admin = adminConviteria();
  const ipHash = hashIp(ip);

  // Anti-flood: no maximo 5 confirmacoes por IP por evento.
  const { count } = await admin
    .from('convidados')
    .select('id', { count: 'exact', head: true })
    .eq('evento_id', corpo.eventoId)
    .eq('ip_hash', ipHash);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ erro: 'Muitas confirmações deste dispositivo.' }, { status: 429 });
  }

  // O evento precisa existir E estar publicado: sem isso da para gravar em
  // rascunho de terceiro so adivinhando o uuid.
  const { data: evento } = await admin
    .from('eventos').select('id').eq('id', corpo.eventoId)
    .not('publicado_em', 'is', null).maybeSingle();
  if (!evento) return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });

  const { error } = await admin.from('convidados').insert({
    evento_id: corpo.eventoId,
    nome: corpo.nome.trim().slice(0, 120),
    contato: corpo.contato?.trim().slice(0, 60) ?? null,
    comparecera: corpo.comparecera ?? true,
    adultos: Math.min(Math.max(corpo.adultos ?? 1, 0), 20),
    criancas: Math.min(Math.max(corpo.criancas ?? 0, 0), 20),
    observacoes: corpo.observacoes?.trim().slice(0, 400) ?? null,
    ip_hash: ipHash,
  });

  if (error) return NextResponse.json({ erro: 'Não foi possível confirmar.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
