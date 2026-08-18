import {
  after,
  NextResponse,
  type NextRequest,
} from 'next/server';
import {
  adminConviteria,
} from '@/lib/conviteria/servidor';
import {
  confirmarCheckoutCartao,
} from '@/lib/conviteria/cartao-infinitepay';

export const runtime = 'nodejs';
export const maxDuration = 15;

function esperar(ms: number) {
  return new Promise<void>(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}

export async function POST(
  req: NextRequest
) {
  const body =
    await req
      .json()
      .catch(() => null);

  const orderNsu =
    String(
      body?.order_nsu ?? ''
    ).trim();

  const transactionNsu =
    String(
      body?.transaction_nsu ??
      ''
    ).trim();

  const slug =
    String(
      body?.invoice_slug ??
      body?.slug ??
      ''
    ).trim();

  const receiptUrl =
    String(
      body?.receipt_url ??
      ''
    ).trim() ||
    null;

  if (
    !orderNsu ||
    !transactionNsu ||
    !slug
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Payload incompleto.',
      },
      { status: 400 }
    );
  }

  const admin =
    adminConviteria();

  const {
    data: checkout,
  } = await admin
    .from(
      'presente_checkouts'
    )
    .select(
      'id,status,metodo_pagamento,valor_cobrado_centavos,parcelas,infinitepay_order_nsu'
    )
    .eq(
      'infinitepay_order_nsu',
      orderNsu
    )
    .maybeSingle();

  if (!checkout) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Pedido não encontrado.',
      },
      { status: 400 }
    );
  }

  /**
   * A InfinitePay recomenda resposta rápida ao webhook.
   * O payload é apenas o gatilho: não creditamos saldo confiando nele.
   *
   * Depois da resposta, consultamos payment_check server-to-server. O after()
   * mantém a Function viva no Next/Vercel até a tarefa terminar.
   */
  after(async () => {
    for (
      let tentativa = 0;
      tentativa < 4;
      tentativa += 1
    ) {
      try {
        const resultado =
          await confirmarCheckoutCartao({
            admin,
            checkout,
            transactionNsu,
            slug,
            receiptUrl,
          });

        if (
          resultado.pago
        ) {
          return;
        }
      } catch (error) {
        console.error(
          `ConviteIA webhook InfinitePay tentativa ${tentativa + 1}:`,
          error
        );
      }

      await esperar(1500);
    }

    console.error(
      'ConviteIA webhook InfinitePay: pagamento não confirmado após tentativas.',
      {
        orderNsu,
        transactionNsu,
      }
    );
  });

  return NextResponse.json({
    success: true,
    message: null,
  });
}
