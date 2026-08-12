import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { urlDoConvite } from '@/lib/conviteria/marca';

export const runtime = 'nodejs';

/**
 * Status de publicacao de um convite.
 *
 * Existe porque `cobrar-convite` devolve `txid`, e nao o `transaction_id` que
 * a `confirmar-pix-assistente` exige — entao a pagina de pagamento nao tem
 * como perguntar "o PIX caiu?" pelo caminho do ConsultaTec.
 *
 * Quem confirma o pagamento e o webhook, que grava `publicado_em`. Aqui so
 * lemos esse campo. E menos codigo e mais confiavel: uma unica fonte de
 * verdade em vez de duas rotas decidindo quando o convite esta no ar.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ erro: 'Faça login para continuar.' }, { status: 401 });
  }

  const eventoId = new URL(req.url).searchParams.get('eventoId');
  if (!eventoId) {
    return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });
  }

  const admin = adminConviteria();

  const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
  if (erroAuth || !auth.user) {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });
  }

  const { data: evento } = await admin
    .from('eventos')
    .select('id, slug, publicado_em, contas!inner(user_id)')
    .eq('id', eventoId)
    .maybeSingle();

  if (!evento) {
    return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  }

  // Mesma checagem de dono do cobrar-convite: sem ela, qualquer um sabendo o
  // uuid consulta o convite alheio.
  const dono = (evento as unknown as { contas: { user_id: string } }).contas?.user_id;
  if (dono !== auth.user.id) {
    return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    publicado: !!evento.publicado_em,
    slug: evento.slug,
    url: urlDoConvite(evento.slug as string),
  });
}