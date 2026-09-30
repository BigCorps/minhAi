import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, adminPublic } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const contribuicaoId = u.searchParams.get('contribuicaoId')?.trim();
  const transactionId = u.searchParams.get('transactionId')?.trim();
  if (!contribuicaoId || !transactionId) {
    return NextResponse.json({ erro: 'Pagamento não informado.' }, { status: 400 });
  }

  const admin = adminConviteria();
  const { data: contribuicao } = await admin.from('evento_gravata_contribuicoes')
    .select('id,status,pix_transaction_id')
    .eq('id', contribuicaoId)
    .eq('pix_transaction_id', transactionId)
    .maybeSingle();

  if (!contribuicao) return NextResponse.json({ erro: 'Pagamento não encontrado.' }, { status: 404 });
  if (contribuicao.status === 'pago') return NextResponse.json({ pago: true, status: 'pago' });
  if (['expirado', 'estornado'].includes(String(contribuicao.status))) {
    return NextResponse.json({ pago: false, status: contribuicao.status });
  }

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
    // O webhook/cron continuam como redundância. O convidado pode consultar novamente.
  }

  const { data: atual } = await admin.from('evento_gravata_contribuicoes')
    .select('status')
    .eq('id', contribuicaoId)
    .eq('pix_transaction_id', transactionId)
    .maybeSingle();

  if (atual?.status === 'pago') return NextResponse.json({ pago: true, status: 'pago' });

  const { data: tx } = await adminPublic().from('pix_transactions')
    .select('status,expires_at')
    .eq('id', transactionId)
    .maybeSingle();

  const expirou = tx?.status === 'expired' || (tx?.expires_at && new Date(tx.expires_at).getTime() <= Date.now());
  if (expirou) {
    await admin.from('evento_gravata_contribuicoes')
      .update({ status: 'expirado', updated_at: new Date().toISOString() })
      .eq('id', contribuicaoId)
      .eq('status', 'pendente');
    return NextResponse.json({ pago: false, status: 'expirado' });
  }

  return NextResponse.json({ pago: false, status: atual?.status ?? 'pendente' });
}
