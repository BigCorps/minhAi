import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { PLANOS } from '@/lib/conviteria/precos';

export const runtime = 'nodejs';

/**
 * Gera a cobrança PIX do próprio convite (plano avulso).
 *
 * Faltava: `publicar` cria o evento com `publicado_em = null` e devolve
 * `cobranca: { centavos }`, mas nada gerava o PIX. O webhook já sabe tratar
 * `tipo: 'convite'` — só não existia quem criasse a transação.
 *
 * O `referencia_id` aqui é o id do EVENTO, e é por ele que o webhook
 * encontra o que publicar.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ erro: 'Faça login para continuar.' }, { status: 401 });
  }

  const admin = adminConviteria();
  const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
  if (erroAuth || !auth.user) {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });
  }

  const corpo = (await req.json().catch(() => null)) as { eventoId?: string } | null;
  if (!corpo?.eventoId) {
    return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });
  }

  // O evento precisa ser do usuário logado. Sem esta checagem, qualquer um
  // pagaria ou consultaria o convite de outro só adivinhando o uuid.
  const { data: evento } = await admin
    .from('eventos')
    .select('id, slug, publicado_em, conta_id, contas!inner(user_id)')
    .eq('id', corpo.eventoId)
    .maybeSingle();

  if (!evento) {
    return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  }

  const dono = (evento as unknown as { contas: { user_id: string } }).contas?.user_id;
  if (dono !== auth.user.id) {
    return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  }

  if (evento.publicado_em) {
    return NextResponse.json({ erro: 'Este convite já está publicado.' }, { status: 409 });
  }

  const plano = PLANOS.find((p) => p.id === 'avulso')!;

  const r = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-pix-assistente`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        origem: 'conviteria',
        // 'convite' vira purpose = conviteria_convite, que o webhook usa
        // para decidir entre publicar o evento e creditar presente.
        tipo: 'convite',
        referencia_id: evento.id,
        valor_centavos: plano.centavos,
        descricao: `Convite ${evento.slug}`,
      }),
    }
  );

  if (!r.ok) {
    return NextResponse.json({ erro: 'Não foi possível gerar o PIX.' }, { status: 502 });
  }

  const pix = (await r.json()) as {
    txid?: string;
    qrcode?: string;
    copia_e_cola?: string;
  };

  return NextResponse.json({
    eventoId: evento.id,
    valorCentavos: plano.centavos,
    txid: pix.txid,
    qrcode: pix.qrcode,
    copiaECola: pix.copia_e_cola,
  });
}