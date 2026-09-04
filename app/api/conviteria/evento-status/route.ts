import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { urlDoConvite } from '@/lib/conviteria/marca';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ erro: 'Faça login para continuar.' }, { status: 401 });

  const u = new URL(req.url);
  const eventoId = u.searchParams.get('eventoId');
  const esperaMemorias = u.searchParams.get('memorias') === '1';
  if (!eventoId) return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });

  const admin = adminConviteria();
  const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
  if (erroAuth || !auth.user) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });

  const { data: evento } = await admin.from('eventos')
    .select('id,slug,publicado_em,pix_transaction_id,contas!inner(user_id)')
    .eq('id', eventoId).maybeSingle();
  if (!evento) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  const dono = (evento as unknown as { contas: { user_id: string } }).contas?.user_id;
  if (dono !== auth.user.id) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });

  const { data: pacote } = await admin.from('evento_memorias_config')
    .select('status,expira_em,pix_transaction_id')
    .eq('evento_id', eventoId).maybeSingle();

  const memoriasAtivasAgora = pacote?.status === 'ativo' && (!pacote.expira_em || new Date(pacote.expira_em) > new Date());
  const transactionId = esperaMemorias && !memoriasAtivasAgora && pacote?.pix_transaction_id
    ? pacote.pix_transaction_id
    : (!evento.publicado_em ? evento.pix_transaction_id : null);

  if (transactionId) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/confirmar-pix-assistente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ transaction_id: transactionId }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // O polling tenta de novo; o cron de PIX continua como redundância.
    }
  }

  const [{ data: atual }, { data: pacoteAtual }] = await Promise.all([
    admin.from('eventos').select('slug,publicado_em').eq('id', eventoId).maybeSingle(),
    admin.from('evento_memorias_config').select('status,expira_em').eq('evento_id', eventoId).maybeSingle(),
  ]);

  const publicado = Boolean(atual?.publicado_em);
  const memoriasAtivas = pacoteAtual?.status === 'ativo' && (!pacoteAtual.expira_em || new Date(pacoteAtual.expira_em) > new Date());
  const slug = (atual?.slug ?? evento.slug) as string;

  return NextResponse.json({
    publicado,
    memoriasAtivas,
    concluido: publicado && (!esperaMemorias || memoriasAtivas),
    slug,
    url: urlDoConvite(slug),
  });
}
