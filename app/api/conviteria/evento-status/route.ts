import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { urlDoConvite } from '@/lib/conviteria/marca';

export const runtime = 'nodejs';

/**
 * Status de publicacao de um convite.
 *
 * ANTES: esta rota so lia `publicado_em`. Mas `publicado_em` e gravado pelo
 * webhook, que so dispara quando a `confirmar-pix-assistente` roda — e
 * ninguem a chamava. A pagina perguntava de 5 em 5 segundos, mas ninguem
 * estava checando o banco: quem descobria o pagamento era o cron
 * `auto-confirmar-pix`. A demora que o cliente via era o intervalo do cron.
 *
 * AGORA: se o convite ainda nao publicou e existe `pix_transaction_id`,
 * perguntamos ao banco na hora. E o mesmo que `presente/status` ja faz — e o
 * motivo de os presentes confirmarem em segundos e o convite nao.
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
    .select('id, slug, publicado_em, pix_transaction_id, contas!inner(user_id)')
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

  let publicado = !!evento.publicado_em;
  let slug = evento.slug as string;

  if (!publicado && evento.pix_transaction_id) {
    try {
      // A edge consulta o Banco Inter (ou o Mercado Pago) na hora. Se estiver
      // pago, ela confirma a transacao e dispara o webhook, que grava
      // `publicado_em` — por isso relemos o evento logo abaixo.
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/confirmar-pix-assistente`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ transaction_id: evento.pix_transaction_id }),
          // O polling roda de 5 em 5 segundos: uma consulta pendurada
          // empilharia requisicoes. Melhor desistir e tentar na proxima.
          signal: AbortSignal.timeout(8000),
        }
      );

      const { data: atualizado } = await admin
        .from('eventos')
        .select('slug, publicado_em')
        .eq('id', eventoId)
        .maybeSingle();

      if (atualizado?.publicado_em) {
        publicado = true;
        slug = atualizado.slug as string;
      }
    } catch {
      // Falha aqui nao e erro para o usuario: o cron ainda vai confirmar, e o
      // polling tenta de novo em 5s. Responder 500 faria a pagina mostrar
      // erro num pagamento que provavelmente deu certo.
    }
  }

  return NextResponse.json({
    publicado,
    slug,
    url: urlDoConvite(slug),
  });
}
