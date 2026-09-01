import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const checkoutId = String(body?.checkoutId ?? '').trim();

  if (!checkoutId) {
    return NextResponse.json({ erro: 'Checkout não informado.' }, { status: 400 });
  }

  const admin = adminConviteria();

  let { data: checkout } = await admin
    .from('presente_checkouts')
    .select('id,status,pix_transaction_id,pago_em')
    .eq('id', checkoutId)
    .maybeSingle();

  if (!checkout) {
    return NextResponse.json({ erro: 'Checkout não encontrado.' }, { status: 404 });
  }

  if (checkout.status === 'pago') {
    return NextResponse.json({ pago: true, status: 'pago', pagoEm: checkout.pago_em });
  }

  if (checkout.status !== 'pendente') {
    return NextResponse.json({ pago: false, status: checkout.status });
  }

  // Espelha o checkout minhAi: pergunta ao confirmar-pix-assistente.
  // 400 significa apenas "ainda não pago", não erro do checkout.
  if (checkout.pix_transaction_id) {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/confirmar-pix-assistente`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ transaction_id: checkout.pix_transaction_id }),
        }
      );
    } catch {
      // A confirmação automática/cron continua existindo; erro pontual aqui
      // não deve transformar um PIX válido em falha.
    }
  }

  const { data: atualizado } = await admin
    .from('presente_checkouts')
    .select('status,pago_em')
    .eq('id', checkoutId)
    .maybeSingle();

  return NextResponse.json({
    pago: atualizado?.status === 'pago',
    status: atualizado?.status ?? 'pendente',
    pagoEm: atualizado?.pago_em ?? null,
  });
}
