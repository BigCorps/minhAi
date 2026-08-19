import {
  NextResponse,
  type NextRequest,
} from 'next/server';
import {
  adminConviteria,
  hashIp,
  ipDaRequisicao,
} from '@/lib/conviteria/servidor';
import {
  LIMITE_PRESENTES_POR_PIX,
  MAX_TOTAL_PRESENTES_PIX_CENTAVOS,
  MAX_VALOR_PRESENTE_CENTAVOS,
  MIN_VALOR_PRESENTE_CENTAVOS,
} from '@/lib/conviteria/catalogo';
import {
  calcularMargemConviteiaCartao,
  calcularTaxaCartao,
  criarLinkInfinitePay,
  normalizarTelefoneBrasil,
  parcelasValidas,
  type ResponsavelTaxaCartao,
} from '@/lib/conviteria/cartao-infinitepay';

export const runtime = 'nodejs';

type ItemPedido = {
  presenteId?: string;
  valorCentavos?: number;
};

const MAX_CHECKOUTS_10_MIN = 6;

export async function POST(
  req: NextRequest
) {
  const ip =
    ipDaRequisicao(req);

  const ipHash =
    hashIp(ip);

  const corpo =
    (await req
      .json()
      .catch(() => null)) as
      | {
          eventoId?: string;
          itens?: ItemPedido[];
          pagadorNome?: string;
          mensagem?: string;
          telefone?: string;
          parcelas?: number;
        }
      | null;

  const eventoId =
    corpo?.eventoId?.trim();

  const recebidos =
    Array.isArray(corpo?.itens)
      ? corpo!.itens!
      : [];

  const telefone =
    normalizarTelefoneBrasil(
      String(
        corpo?.telefone ?? ''
      )
    );

  const parcelas =
    Number(corpo?.parcelas);

  if (
    !eventoId ||
    recebidos.length === 0
  ) {
    return NextResponse.json(
      {
        erro:
          'Escolha pelo menos um presente.',
      },
      { status: 400 }
    );
  }

  if (!telefone) {
    return NextResponse.json(
      {
        erro:
          'Informe um celular válido com DDD.',
      },
      { status: 400 }
    );
  }

  if (
    !parcelasValidas(
      parcelas
    )
  ) {
    return NextResponse.json(
      {
        erro:
          'Escolha entre 1x e 6x no cartão.',
      },
      { status: 400 }
    );
  }

  const unicos =
    new Map<
      string,
      ItemPedido
    >();

  for (
    const item of recebidos
  ) {
    if (item?.presenteId) {
      unicos.set(
        item.presenteId,
        item
      );
    }
  }

  const itens =
    [...unicos.values()];

  if (
    itens.length === 0 ||
    itens.length >
      LIMITE_PRESENTES_POR_PIX
  ) {
    return NextResponse.json(
      {
        erro:
          `Escolha até ${LIMITE_PRESENTES_POR_PIX} presentes por pagamento.`,
      },
      { status: 400 }
    );
  }

  const admin =
    adminConviteria();

  const desde =
    new Date(
      Date.now() -
      10 * 60 * 1000
    ).toISOString();

  const { count } =
    await admin
      .from(
        'presente_checkouts'
      )
      .select(
        'id',
        {
          count: 'exact',
          head: true,
        }
      )
      .eq(
        'ip_hash',
        ipHash
      )
      .gte(
        'created_at',
        desde
      );

  if (
    (count ?? 0) >=
    MAX_CHECKOUTS_10_MIN
  ) {
    return NextResponse.json(
      {
        erro:
          'Muitas tentativas de pagamento. Aguarde alguns minutos e tente novamente.',
      },
      { status: 429 }
    );
  }

  const ids =
    itens.map(
      (item) =>
        item.presenteId!
    );

  const [
    { data: evento },
    { data: configCartao },
  ] = await Promise.all([
    admin
      .from('eventos')
      .select(
        'id,slug,config'
      )
      .eq('id', eventoId)
      .not(
        'publicado_em',
        'is',
        null
      )
      .eq(
        'arquivado',
        false
      )
      .maybeSingle(),

    admin
      .from(
        'pagamento_cartao_config'
      )
      .select(
        'ativo,taxa_responsavel'
      )
      .eq(
        'evento_id',
        eventoId
      )
      .maybeSingle(),
  ]);

  if (!evento) {
    return NextResponse.json(
      {
        erro:
          'Convite indisponível.',
      },
      { status: 404 }
    );
  }

  const cartaoAtivo =
    configCartao?.ativo !==
    false;

  const responsavelTaxa:
    ResponsavelTaxaCartao =
      configCartao
        ?.taxa_responsavel ===
      'convidado'
        ? 'convidado'
        : 'anfitriao';

  if (!cartaoAtivo) {
    return NextResponse.json(
      {
        erro:
          'Pagamento por cartão não está disponível neste convite.',
      },
      { status: 409 }
    );
  }

  const {
    data: presentes,
    error: erroPresentes,
  } = await admin
    .from('presentes')
    .select(
      'id,titulo,valor_centavos,permite_valor_livre,cotas_total,cotas_vendidas'
    )
    .eq(
      'evento_id',
      eventoId
    )
    .eq('ativo', true)
    .in('id', ids);

  if (
    erroPresentes ||
    !presentes ||
    presentes.length !==
      ids.length
  ) {
    return NextResponse.json(
      {
        erro:
          'Um ou mais presentes não estão mais disponíveis.',
      },
      { status: 409 }
    );
  }

  const porId =
    new Map(
      presentes.map(
        (p: any) => [
          p.id as string,
          p,
        ]
      )
    );

  const linhas: Array<{
    presente_id: string;
    valor_centavos: number;
    taxa_centavos: number;
    taxa_processamento_centavos:
      number;
    liquido_centavos: number;
  }> = [];

  let totalPresentes = 0;
  let taxaConviteiaTotal = 0;
  let taxaProcessamentoTotal = 0;
  let liquidoTotal = 0;

  for (
    const pedido of itens
  ) {
    const presente: any =
      porId.get(
        pedido.presenteId!
      );

    if (!presente) {
      return NextResponse.json(
        {
          erro:
            'Presente indisponível.',
        },
        { status: 409 }
      );
    }

    if (
      presente.cotas_total !=
        null &&
      Number(
        presente
          .cotas_vendidas ?? 0
      ) >=
        Number(
          presente.cotas_total
        )
    ) {
      return NextResponse.json(
        {
          erro:
            `“${presente.titulo}” já foi presenteado.`,
        },
        { status: 409 }
      );
    }

    const valor =
      presente
        .permite_valor_livre
        ? Math.round(
            Number(
              pedido
                .valorCentavos ??
              0
            )
          )
        : Number(
            presente
              .valor_centavos
          );

    if (
      !Number.isSafeInteger(
        valor
      ) ||
      valor <
        MIN_VALOR_PRESENTE_CENTAVOS ||
      valor >
        MAX_VALOR_PRESENTE_CENTAVOS
    ) {
      return NextResponse.json(
        {
          erro:
            `Valor inválido para “${presente.titulo}”.`,
        },
        { status: 400 }
      );
    }

    // A taxa comercial já contém a margem da ConviteIA.
    // Não descontamos um segundo 1% do valor do presente.
    const taxaConviteia =
      calcularMargemConviteiaCartao(
        valor,
        parcelas
      ).taxaCentavos;

    const taxaProcessamento =
      calcularTaxaCartao(
        valor,
        parcelas
      ).taxaCentavos;

    const liquido =
      valor -
      (
        responsavelTaxa ===
        'anfitriao'
          ? taxaProcessamento
          : 0
      );

    if (liquido <= 0) {
      return NextResponse.json(
        {
          erro:
            `O valor de “${presente.titulo}” é insuficiente para este parcelamento.`,
        },
        { status: 400 }
      );
    }

    linhas.push({
      presente_id:
        presente.id,
      valor_centavos:
        valor,
      taxa_centavos:
        taxaConviteia,
      taxa_processamento_centavos:
        taxaProcessamento,
      liquido_centavos:
        liquido,
    });

    totalPresentes +=
      valor;

    taxaConviteiaTotal +=
      taxaConviteia;

    taxaProcessamentoTotal +=
      taxaProcessamento;

    liquidoTotal +=
      liquido;
  }

  if (
    totalPresentes <= 0 ||
    totalPresentes >
      MAX_TOTAL_PRESENTES_PIX_CENTAVOS
  ) {
    return NextResponse.json(
      {
        erro:
          'Valor total fora do permitido.',
      },
      { status: 400 }
    );
  }

  const valorCobrado =
    totalPresentes +
    (
      responsavelTaxa ===
      'convidado'
        ? taxaProcessamentoTotal
        : 0
    );

  const nome =
    corpo?.pagadorNome
      ?.trim()
      .slice(0, 80) ||
    null;

  const mensagem =
    corpo?.mensagem
      ?.trim()
      .slice(0, 400) ||
    null;

  const taxa =
    calcularTaxaCartao(
      totalPresentes,
      parcelas
    );

  const {
    data: checkout,
    error: erroCheckout,
  } = await admin
    .from(
      'presente_checkouts'
    )
    .insert({
      evento_id:
        eventoId,

      // Mantém a semântica histórica do PIX:
      // total_centavos = valor dos presentes.
      total_centavos:
        totalPresentes,

      // Margem ConviteIA embutida dentro da taxa comercial do cartão.
      // É informação contábil interna e não é somada novamente ao checkout.
      taxa_centavos:
        taxaConviteiaTotal,

      liquido_centavos:
        liquidoTotal,

      metodo_pagamento:
        'cartao',

      valor_presentes_centavos:
        totalPresentes,

      valor_cobrado_centavos:
        valorCobrado,

      taxa_processamento_centavos:
        taxaProcessamentoTotal,

      taxa_processamento_bps:
        taxa.bps,

      taxa_processamento_responsavel:
        responsavelTaxa,

      parcelas,

      pagador_telefone:
        telefone.digitos,

      pagador_nome:
        nome,

      mensagem,

      ip_hash:
        ipHash,

      status:
        'pendente',
    })
    .select('id')
    .single();

  if (
    erroCheckout ||
    !checkout
  ) {
    return NextResponse.json(
      {
        erro:
          'Não foi possível preparar o pagamento por cartão.',
      },
      { status: 500 }
    );
  }

  const orderNsu =
    `conviteia-${checkout.id}`;

  const {
    error: erroItens,
  } = await admin
    .from(
      'presente_pagamentos'
    )
    .insert(
      linhas.map(
        (l) => ({
          checkout_id:
            checkout.id,
          evento_id:
            eventoId,
          presente_id:
            l.presente_id,
          valor_centavos:
            l.valor_centavos,
          taxa_centavos:
            l.taxa_centavos,
          taxa_processamento_centavos:
            l.taxa_processamento_centavos,
          liquido_centavos:
            l.liquido_centavos,
          pagador_nome:
            nome,
          mensagem,
          status:
            'pendente',
        })
      )
    );

  if (erroItens) {
    await admin
      .from(
        'presente_checkouts'
      )
      .update({
        status:
          'expirado',
      })
      .eq(
        'id',
        checkout.id
      );

    return NextResponse.json(
      {
        erro:
          'Não foi possível registrar os presentes.',
      },
      { status: 500 }
    );
  }

  let checkoutUrl:
    string;

  try {
    checkoutUrl =
      await criarLinkInfinitePay({
        orderNsu,
        valorCobradoCentavos:
          valorCobrado,
        telefoneE164:
          telefone.e164,
        pagadorNome:
          nome,
        eventoConfig:
          evento.config,
      });
  } catch (error) {
    console.error(
      'ConviteIA criar checkout InfinitePay:',
      error
    );

    await Promise.all([
      admin
        .from(
          'presente_checkouts'
        )
        .update({
          status:
            'expirado',
        })
        .eq(
          'id',
          checkout.id
        ),

      admin
        .from(
          'presente_pagamentos'
        )
        .update({
          status:
            'expirado',
        })
        .eq(
          'checkout_id',
          checkout.id
        ),
    ]);

    return NextResponse.json(
      {
        erro:
          'A InfinitePay não conseguiu abrir o pagamento agora. Tente novamente.',
      },
      { status: 502 }
    );
  }

  const {
    error: erroMeta,
  } = await admin
    .from(
      'presente_checkouts'
    )
    .update({
      infinitepay_order_nsu:
        orderNsu,
      checkout_url:
        checkoutUrl,
    })
    .eq(
      'id',
      checkout.id
    );

  if (erroMeta) {
    await Promise.all([
      admin
        .from(
          'presente_checkouts'
        )
        .update({
          status:
            'expirado',
        })
        .eq(
          'id',
          checkout.id
        ),

      admin
        .from(
          'presente_pagamentos'
        )
        .update({
          status:
            'expirado',
        })
        .eq(
          'checkout_id',
          checkout.id
        ),
    ]);

    return NextResponse.json(
      {
        erro:
          'Não foi possível finalizar o checkout.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    checkoutId:
      checkout.id,

    metodo:
      'cartao',

    parcelas,

    taxaBps:
      taxa.bps,

    responsavelTaxa,

    valorPresentesCentavos:
      totalPresentes,

    taxaConviteiaCentavos:
      taxaConviteiaTotal,

    taxaProcessamentoCentavos:
      taxaProcessamentoTotal,

    valorCobradoCentavos:
      valorCobrado,

    liquidoEventoCentavos:
      liquidoTotal,

    checkoutUrl,
  });
}
