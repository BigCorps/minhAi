import {
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

function checkoutIdDeOrderNsu(
  orderNsu: string
) {
  const prefixo =
    'conviteia-';

  if (
    !orderNsu.startsWith(
      prefixo
    )
  ) {
    return '';
  }

  return orderNsu.slice(
    prefixo.length
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
      body?.orderNsu ?? ''
    ).trim();

  const checkoutId =
    String(
      body?.checkoutId ?? ''
    ).trim() ||
    checkoutIdDeOrderNsu(
      orderNsu
    );

  const transactionNsu =
    String(
      body?.transactionNsu ??
      ''
    ).trim();

  const slug =
    String(
      body?.slug ?? ''
    ).trim();

  const receiptUrl =
    String(
      body?.receiptUrl ??
      ''
    ).trim() ||
    null;

  if (!checkoutId) {
    return NextResponse.json(
      {
        erro:
          'Checkout não informado.',
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
      [
        'id',
        'evento_id',
        'status',
        'metodo_pagamento',
        'valor_cobrado_centavos',
        'parcelas',
        'infinitepay_order_nsu',
        'infinitepay_transaction_nsu',
        'infinitepay_slug',
        'infinitepay_receipt_url',
        'pago_em',
      ].join(',')
    )
    .eq(
      'id',
      checkoutId
    )
    .maybeSingle();

  if (!checkout) {
    return NextResponse.json(
      {
        erro:
          'Checkout não encontrado.',
      },
      { status: 404 }
    );
  }

  const {
    data: evento,
  } = await admin
    .from('eventos')
    .select('slug')
    .eq(
      'id',
      checkout.evento_id
    )
    .maybeSingle();

  const conviteSlug =
    evento?.slug ?? null;

  if (
    checkout.metodo_pagamento !==
    'cartao'
  ) {
    return NextResponse.json(
      {
        erro:
          'Este checkout não é de cartão.',
      },
      { status: 409 }
    );
  }

  if (
    checkout.status ===
    'pago'
  ) {
    return NextResponse.json({
      pago: true,
      status: 'pago',
      pagoEm:
        checkout.pago_em,
      receiptUrl:
        checkout
          .infinitepay_receipt_url,
      conviteSlug,
    });
  }

  if (
    checkout.status !==
    'pendente'
  ) {
    return NextResponse.json({
      pago: false,
      status:
        checkout.status,
      conviteSlug,
    });
  }

  const tx =
    transactionNsu ||
    checkout
      .infinitepay_transaction_nsu ||
    '';

  const invoiceSlug =
    slug ||
    checkout
      .infinitepay_slug ||
    '';

  if (
    !tx ||
    !invoiceSlug
  ) {
    return NextResponse.json({
      pago: false,
      status: 'pendente',
      aguardandoRetorno:
        true,
      conviteSlug,
    });
  }

  try {
    const resultado =
      await confirmarCheckoutCartao({
        admin,
        checkout: {
          id:
            checkout.id,
          status:
            checkout.status,
          metodo_pagamento:
            checkout.metodo_pagamento,
          valor_cobrado_centavos:
            checkout
              .valor_cobrado_centavos,
          parcelas:
            checkout.parcelas,
          infinitepay_order_nsu:
            checkout
              .infinitepay_order_nsu,
        },
        transactionNsu:
          tx,
        slug:
          invoiceSlug,
        receiptUrl:
          receiptUrl ||
          checkout
            .infinitepay_receipt_url,
      });

    if (!resultado.pago) {
      return NextResponse.json({
        pago: false,
        status:
          'pendente',
        verificacao:
          resultado.motivo,
        conviteSlug,
      });
    }

    const {
      data: atualizado,
    } = await admin
      .from(
        'presente_checkouts'
      )
      .select(
        'pago_em,infinitepay_receipt_url'
      )
      .eq(
        'id',
        checkout.id
      )
      .maybeSingle();

    return NextResponse.json({
      pago: true,
      status: 'pago',
      pagoEm:
        atualizado?.pago_em ??
        null,
      receiptUrl:
        atualizado
          ?.infinitepay_receipt_url ??
        receiptUrl,
      conviteSlug,
    });
  } catch (error) {
    console.error(
      'ConviteIA status cartão:',
      error
    );

    return NextResponse.json(
      {
        pago: false,
        status:
          'pendente',
        erro:
          'Não foi possível confirmar o pagamento agora.',
        conviteSlug,
      },
      { status: 502 }
    );
  }
}
