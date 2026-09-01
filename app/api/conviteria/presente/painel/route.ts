import {
  NextResponse,
  type NextRequest,
} from 'next/server';
import {
  adminConviteria,
} from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

type TaxaResponsavel =
  | 'anfitriao'
  | 'convidado';

async function contextoDono(
  req: NextRequest,
  eventoId: string
) {
  const token =
    req.headers
      .get('authorization')
      ?.replace(
        'Bearer ',
        ''
      );

  if (!token) {
    return {
      erro:
        'Faça login para continuar.',
      status:
        401 as const,
    };
  }

  const admin =
    adminConviteria();

  const {
    data: auth,
    error: erroAuth,
  } = await admin.auth
    .getUser(token);

  if (
    erroAuth ||
    !auth.user
  ) {
    return {
      erro:
        'Sessão inválida.',
      status:
        401 as const,
    };
  }

  const {
    data: evento,
  } = await admin
    .from('eventos')
    .select(
      'id,slug,config,contas!inner(user_id)'
    )
    .eq(
      'id',
      eventoId
    )
    .maybeSingle();

  const userId =
    (evento as any)
      ?.contas
      ?.user_id;

  if (
    !evento ||
    userId !== auth.user.id
  ) {
    return {
      erro:
        'Convite não encontrado.',
      status:
        404 as const,
    };
  }

  return {
    admin,
    evento,
  };
}

export async function GET(
  req: NextRequest
) {
  const eventoId =
    new URL(req.url)
      .searchParams
      .get('evento')
      ?.trim();

  if (!eventoId) {
    return NextResponse.json(
      {
        erro:
          'Convite não informado.',
      },
      { status: 400 }
    );
  }

  const ctx =
    await contextoDono(
      req,
      eventoId
    );

  if ('erro' in ctx) {
    return NextResponse.json(
      { erro: ctx.erro },
      { status: ctx.status }
    );
  }

  const { admin } =
    ctx;

  const [
    { data: config },
    { count: presentesAtivos },
    { data: checkouts },
  ] = await Promise.all([
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

    admin
      .from('presentes')
      .select(
        'id',
        {
          count: 'exact',
          head: true,
        }
      )
      .eq(
        'evento_id',
        eventoId
      )
      .eq(
        'ativo',
        true
      ),

    admin
      .from(
        'presente_checkouts'
      )
      .select(
        [
          'id',
          'metodo_pagamento',
          'total_centavos',
          'valor_presentes_centavos',
          'valor_cobrado_centavos',
          'taxa_centavos',
          'taxa_processamento_centavos',
          'taxa_processamento_bps',
          'taxa_processamento_responsavel',
          'liquido_centavos',
          'parcelas',
          'pagador_nome',
          'status',
          'pago_em',
          'created_at',
          'infinitepay_receipt_url',
          'infinitepay_paid_amount_centavos',
        ].join(',')
      )
      .eq(
        'evento_id',
        eventoId
      )
      .eq(
        'status',
        'pago'
      )
      .order(
        'pago_em',
        { ascending: false }
      )
      .limit(40),
  ]);

  const pagos =
    checkouts ?? [];

  let pixQuantidade = 0;
  let pixPresentes = 0;
  let pixLiquido = 0;

  let cartaoQuantidade = 0;
  let cartaoPresentes = 0;
  let cartaoCobrado = 0;
  let cartaoTaxaProcessamento = 0;
  let cartaoTaxaConviteia = 0;
  let cartaoLiquido = 0;

  for (
    const c of pagos as any[]
  ) {
    const metodo =
      c.metodo_pagamento ===
      'cartao'
        ? 'cartao'
        : 'pix';

    const presentes =
      Number(
        c.valor_presentes_centavos ??
        c.total_centavos ??
        0
      );

    const liquido =
      Number(
        c.liquido_centavos ??
        0
      );

    if (
      metodo === 'cartao'
    ) {
      cartaoQuantidade += 1;
      cartaoPresentes += presentes;

      cartaoCobrado +=
        Number(
          c.valor_cobrado_centavos ??
          presentes
        );

      cartaoTaxaProcessamento +=
        Number(
          c.taxa_processamento_centavos ??
          0
        );

      cartaoTaxaConviteia +=
        Number(
          c.taxa_centavos ??
          0
        );

      cartaoLiquido +=
        liquido;
    } else {
      pixQuantidade += 1;
      pixPresentes +=
        presentes;
      pixLiquido +=
        liquido;
    }
  }

  return NextResponse.json({
    temPresentes:
      Number(
        presentesAtivos ?? 0
      ) > 0,

    config: {
      ativo:
        config?.ativo !==
        false,

      taxaResponsavel:
        config
          ?.taxa_responsavel ===
        'convidado'
          ? 'convidado'
          : 'anfitriao',

      maxParcelas: 6,
    },

    totais: {
      pix: {
        quantidade:
          pixQuantidade,
        presentesCentavos:
          pixPresentes,
        liquidoCentavos:
          pixLiquido,
      },

      cartao: {
        quantidade:
          cartaoQuantidade,
        presentesCentavos:
          cartaoPresentes,
        cobradoCentavos:
          cartaoCobrado,
        taxaProcessamentoCentavos:
          cartaoTaxaProcessamento,
        taxaConviteiaCentavos:
          cartaoTaxaConviteia,
        liquidoCentavos:
          cartaoLiquido,
      },
    },

    pagamentos:
      pagos
        .slice(0, 15)
        .map((c: any) => ({
          id:
            c.id,

          metodo:
            c.metodo_pagamento ===
            'cartao'
              ? 'cartao'
              : 'pix',

          valorPresentesCentavos:
            Number(
              c.valor_presentes_centavos ??
              c.total_centavos ??
              0
            ),

          valorCobradoCentavos:
            Number(
              c.valor_cobrado_centavos ??
              c.total_centavos ??
              0
            ),

          taxaConviteiaCentavos:
            Number(
              c.taxa_centavos ??
              0
            ),

          taxaProcessamentoCentavos:
            Number(
              c.taxa_processamento_centavos ??
              0
            ),

          taxaProcessamentoBps:
            Number(
              c.taxa_processamento_bps ??
              0
            ),

          taxaResponsavel:
            c.taxa_processamento_responsavel ??
            null,

          liquidoCentavos:
            Number(
              c.liquido_centavos ??
              0
            ),

          parcelas:
            c.parcelas == null
              ? null
              : Number(
                  c.parcelas
                ),

          pagadorNome:
            c.pagador_nome ??
            null,

          pagoEm:
            c.pago_em ??
            c.created_at,

          comprovanteUrl:
            c.infinitepay_receipt_url ??
            null,

          pagoInfinitePayCentavos:
            c.infinitepay_paid_amount_centavos == null
              ? null
              : Number(
                  c.infinitepay_paid_amount_centavos
                ),
        })),
  });
}

export async function PATCH(
  req: NextRequest
) {
  const body =
    await req
      .json()
      .catch(() => null);

  const eventoId =
    String(
      body?.eventoId ?? ''
    ).trim();

  const ativo =
    body?.ativo;

  const taxaResponsavel =
    String(
      body?.taxaResponsavel ??
      ''
    ) as TaxaResponsavel;

  if (
    !eventoId ||
    typeof ativo !==
      'boolean' ||
    ![
      'anfitriao',
      'convidado',
    ].includes(
      taxaResponsavel
    )
  ) {
    return NextResponse.json(
      {
        erro:
          'Configuração inválida.',
      },
      { status: 400 }
    );
  }

  const ctx =
    await contextoDono(
      req,
      eventoId
    );

  if ('erro' in ctx) {
    return NextResponse.json(
      { erro: ctx.erro },
      { status: ctx.status }
    );
  }

  const {
    admin,
    evento,
  } = ctx;

  const {
    error: erroConfig,
  } = await admin
    .from(
      'pagamento_cartao_config'
    )
    .upsert(
      {
        evento_id:
          eventoId,
        ativo,
        taxa_responsavel:
          taxaResponsavel,
      },
      {
        onConflict:
          'evento_id',
      }
    );

  if (erroConfig) {
    console.error(
      'ConviteIA configuração cartão:',
      erroConfig
    );

    return NextResponse.json(
      {
        erro:
          'Não foi possível salvar a configuração do cartão.',
      },
      { status: 500 }
    );
  }

  /**
   * Mantém o config do convite sincronizado com o painel.
   * Assim, se o usuário abrir o wizard de edição depois, verá a escolha atual.
   */
  const cfg =
    (evento.config ??
      {}) as any;

  const secoes =
    Array.isArray(cfg.secoes)
      ? cfg.secoes
      : [];

  let achou = false;

  const novasSecoes =
    secoes.map(
      (s: any) => {
        if (
          s?.tipo !==
          'presentes'
        ) {
          return s;
        }

        achou = true;

        return {
          ...s,
          config: {
            ...(s.config ?? {}),
            cartaoAtivo:
              ativo
                ? 'sim'
                : 'nao',
            taxaCartaoResponsavel:
              taxaResponsavel,
          },
        };
      }
    );

  const cfgNovo =
    achou
      ? {
          ...cfg,
          secoes:
            novasSecoes,
        }
      : cfg;

  if (achou) {
    const {
      error:
        erroEvento,
    } = await admin
      .from('eventos')
      .update({
        config:
          cfgNovo,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        eventoId
      );

    if (erroEvento) {
      console.error(
        'ConviteIA sincronização config cartão:',
        erroEvento
      );
    }
  }

  return NextResponse.json({
    ok: true,
    config: {
      ativo,
      taxaResponsavel,
      maxParcelas: 6,
    },
  });
}
