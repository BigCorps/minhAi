import type { SupabaseClient } from '@supabase/supabase-js';
import { adminConviteria } from '@/lib/conviteria/servidor';

export type ParcelasCartao = 1 | 2 | 3 | 4 | 5 | 6;
export type ResponsavelTaxaCartao = 'anfitriao' | 'convidado';

export const TAXAS_CARTAO_BPS: Record<ParcelasCartao, number> = {
  1: 499,
  2: 709,
  3: 801,
  4: 891,
  5: 980,
  6: 1067,
};

export const INFINITEPAY_HANDLE_CONVITEIA = 'bigcorps';
export const MAX_PARCELAS_CARTAO = 6;

const INFINITEPAY_LINKS_URL =
  'https://api.checkout.infinitepay.io/links';

const INFINITEPAY_PAYMENT_CHECK_URL =
  'https://api.checkout.infinitepay.io/payment_check';

export function parcelasValidas(
  valor: unknown
): valor is ParcelasCartao {
  return (
    Number.isInteger(valor) &&
    Number(valor) >= 1 &&
    Number(valor) <= MAX_PARCELAS_CARTAO
  );
}

export function taxaCartaoBps(
  parcelas: ParcelasCartao
) {
  return TAXAS_CARTAO_BPS[parcelas];
}

export function calcularTaxaCartao(
  valorCentavos: number,
  parcelas: ParcelasCartao
) {
  const bps =
    taxaCartaoBps(parcelas);

  return {
    bps,
    taxaCentavos:
      Math.round(
        (valorCentavos * bps) /
        10_000
      ),
  };
}

export function normalizarTelefoneBrasil(
  valor: string
) {
  let digitos =
    String(valor ?? '')
      .replace(/\D/g, '');

  if (
    digitos.startsWith('55') &&
    digitos.length > 11
  ) {
    digitos =
      digitos.slice(2);
  }

  if (!/^\d{10,11}$/.test(digitos)) {
    return null;
  }

  return {
    digitos,
    e164: `+55${digitos}`,
  };
}

function limparCep(valor: unknown) {
  const cep =
    String(valor ?? '')
      .replace(/\D/g, '');

  return /^\d{8}$/.test(cep)
    ? cep
    : '';
}

function separarLogradouroENumero(
  valor: unknown,
  numeroExplicito: unknown
) {
  const logradouro =
    String(valor ?? '').trim();

  const numero =
    String(
      numeroExplicito ?? ''
    ).trim();

  if (numero) {
    return {
      rua: logradouro,
      numero,
    };
  }

  const match =
    logradouro.match(
      /^(.*?)(?:,|\s)\s*(\d+[A-Za-z-]*)\s*$/
    );

  if (!match) {
    return {
      rua: logradouro,
      numero: '',
    };
  }

  return {
    rua:
      match[1].trim(),
    numero:
      match[2].trim(),
  };
}

function urlsConviteia() {
  const base =
    process.env.CONVITEIA_SITE_URL
      ?.replace(/\/+$/, '') ||
    'https://conviteia.com';

  return {
    redirectUrl:
      `${base}/convite/pagamento/cartao/resultado`,
    webhookUrl:
      `${base}/api/conviteria/presente/cartao/webhook`,
  };
}

function checkoutIdDoOrderNsu(
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

  return orderNsu
    .slice(prefixo.length)
    .trim();
}

function emailValido(
  valor: unknown
) {
  const email =
    String(valor ?? '')
      .trim()
      .toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    return '';
  }

  return email;
}

/**
 * Busca o e-mail da CONTA CRIADORA do convite.
 *
 * Importante:
 * - o navegador nunca envia esse e-mail;
 * - usamos o checkoutId embutido no order_nsu criado no servidor;
 * - percorremos presente_checkouts -> eventos -> contas;
 * - se algum registro legado não tiver e-mail, o checkout continua funcionando
 *   sem o campo, preservando compatibilidade.
 */
async function buscarEmailCriadorDoCheckout(
  orderNsu: string
) {
  const checkoutId =
    checkoutIdDoOrderNsu(
      orderNsu
    );

  if (!checkoutId) {
    return '';
  }

  try {
    const admin =
      adminConviteria();

    const {
      data: checkout,
      error: erroCheckout,
    } = await admin
      .from(
        'presente_checkouts'
      )
      .select(
        'evento_id'
      )
      .eq(
        'id',
        checkoutId
      )
      .maybeSingle();

    if (
      erroCheckout ||
      !checkout?.evento_id
    ) {
      return '';
    }

    const {
      data: evento,
      error: erroEvento,
    } = await admin
      .from('eventos')
      .select(
        'conta_id'
      )
      .eq(
        'id',
        checkout.evento_id
      )
      .maybeSingle();

    if (
      erroEvento ||
      !evento?.conta_id
    ) {
      return '';
    }

    const {
      data: conta,
      error: erroConta,
    } = await admin
      .from('contas')
      .select('email')
      .eq(
        'id',
        evento.conta_id
      )
      .maybeSingle();

    if (
      erroConta ||
      !conta
    ) {
      return '';
    }

    return emailValido(
      conta.email
    );
  } catch (error) {
    console.error(
      'ConviteIA: falha ao buscar e-mail do criador para checkout:',
      error
    );

    return '';
  }
}

export async function criarLinkInfinitePay({
  orderNsu,
  valorCobradoCentavos,
  parcelas,
  telefoneE164,
  pagadorNome,
  eventoConfig,
}: {
  orderNsu: string;
  valorCobradoCentavos: number;
  parcelas: ParcelasCartao;
  telefoneE164: string;
  pagadorNome?: string | null;
  eventoConfig?: any;
}) {
  const cfg =
    eventoConfig ?? {};

  const anfitrioes =
    String(
      cfg?.anfitrioes?.exibicao ||
      cfg?.anfitrioes?.completo ||
      'ConviteIA'
    ).trim();

  const local =
    cfg?.local ?? {};

  const { rua, numero } =
    separarLogradouroENumero(
      local?.logradouro,
      local?.numero
    );

  const cep =
    limparCep(
      local?.cep ??
      local?.codigoPostal
    );

  const emailCriador =
    await buscarEmailCriadorDoCheckout(
      orderNsu
    );

  /**
   * O checkout abre com:
   * - nome informado pelo convidado (ou fallback do convite);
   * - telefone digitado no modal;
   * - e-mail da conta criadora do convite.
   *
   * O e-mail é apenas PRÉ-PREENCHIMENTO da InfinitePay. O convidado continua
   * livre para trocar pelo próprio e-mail antes de concluir o pagamento.
   */
  const customer: {
    name: string;
    phone_number: string;
    email?: string;
  } = {
    name:
      String(
        pagadorNome ?? ''
      ).trim() ||
      `Convidado de ${anfitrioes}`,
    phone_number:
      telefoneE164,
  };

  if (emailCriador) {
    customer.email =
      emailCriador;
  }

  const address =
    cep &&
    rua &&
    numero
      ? {
          cep,
          street: rua,
          neighborhood:
            String(
              local?.bairro ?? ''
            ).trim(),
          number: numero,
          complement:
            String(
              local?.complemento ?? ''
            ).trim(),
        }
      : undefined;

  const {
    redirectUrl,
    webhookUrl,
  } = urlsConviteia();

  /**
   * `installments` e `payment_method` são enviados pelo servidor e nunca
   * aceitos como valor livre vindo do navegador. A ConviteIA restringe
   * `installments` a 1..6 antes de chegar aqui.
   *
   * O restante segue o Checkout Integrado oficial: handle, items,
   * order_nsu, redirect_url, webhook_url, customer e address.
   */
  const payload: Record<string, unknown> = {
    handle:
      INFINITEPAY_HANDLE_CONVITEIA,

    order_nsu:
      orderNsu,

    redirect_url:
      redirectUrl,

    webhook_url:
      webhookUrl,

    payment_method:
      'credit',

    installments:
      parcelas,

    items: [
      {
        quantity: 1,
        price:
          valorCobradoCentavos,
        description:
          `Presentes para ${anfitrioes}`,
      },
    ],

    customer,
  };

  if (address) {
    payload.address =
      address;
  }

  const response =
    await fetch(
      INFINITEPAY_LINKS_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body:
          JSON.stringify(payload),
        signal:
          AbortSignal.timeout(
            8_000
          ),
        cache: 'no-store',
      }
    );

  const data =
    (await response
      .json()
      .catch(() => null)) as
      | {
          url?: string;
          checkout_url?: string;
          message?: string;
          error?: string;
        }
      | null;

  const checkoutUrl =
    data?.url ||
    data?.checkout_url ||
    '';

  if (
    !response.ok ||
    !checkoutUrl
  ) {
    const motivo =
      data?.message ||
      data?.error ||
      `HTTP ${response.status}`;

    throw new Error(
      `InfinitePay não criou o checkout: ${motivo}`
    );
  }

  return checkoutUrl;
}

export type VerificacaoInfinitePay = {
  success?: boolean;
  paid?: boolean;
  amount?: number;
  paid_amount?: number;
  installments?: number;
  capture_method?: string;
};

export async function verificarInfinitePay({
  orderNsu,
  transactionNsu,
  slug,
  valorEsperadoCentavos,
  parcelasEsperadas,
}: {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
  valorEsperadoCentavos: number;
  parcelasEsperadas: ParcelasCartao;
}) {
  const response =
    await fetch(
      INFINITEPAY_PAYMENT_CHECK_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body:
          JSON.stringify({
            handle:
              INFINITEPAY_HANDLE_CONVITEIA,
            order_nsu:
              orderNsu,
            transaction_nsu:
              transactionNsu,
            slug,
          }),
        signal:
          AbortSignal.timeout(
            7_000
          ),
        cache: 'no-store',
      }
    );

  const data =
    (await response
      .json()
      .catch(() => null)) as
      | VerificacaoInfinitePay
      | null;

  if (
    !response.ok ||
    !data?.success ||
    data.paid !== true
  ) {
    return {
      pago: false as const,
      motivo: 'pendente',
      data,
    };
  }

  if (
    data.capture_method !==
    'credit_card'
  ) {
    return {
      pago: false as const,
      motivo:
        'metodo_invalido',
      data,
    };
  }

  if (
    Number(data.installments) !==
    parcelasEsperadas
  ) {
    return {
      pago: false as const,
      motivo:
        'parcelas_divergentes',
      data,
    };
  }

  if (
    Number(data.amount) !==
    valorEsperadoCentavos
  ) {
    return {
      pago: false as const,
      motivo:
        'valor_divergente',
      data,
    };
  }

  return {
    pago: true as const,
    data,
  };
}

export async function confirmarCheckoutCartao({
  admin,
  checkout,
  transactionNsu,
  slug,
  receiptUrl,
}: {
  admin: SupabaseClient;
  checkout: {
    id: string;
    status: string;
    metodo_pagamento: string;
    valor_cobrado_centavos:
      number | null;
    parcelas:
      number | null;
    infinitepay_order_nsu:
      string | null;
  };
  transactionNsu: string;
  slug: string;
  receiptUrl?:
    string | null;
}) {
  if (
    checkout.status === 'pago'
  ) {
    return {
      pago: true,
      jaProcessado: true,
    };
  }

  if (
    checkout.metodo_pagamento !==
      'cartao' ||
    !checkout
      .infinitepay_order_nsu ||
    !checkout
      .valor_cobrado_centavos ||
    !parcelasValidas(
      checkout.parcelas
    )
  ) {
    throw new Error(
      'Checkout de cartão inválido.'
    );
  }

  const verificado =
    await verificarInfinitePay({
      orderNsu:
        checkout
          .infinitepay_order_nsu,
      transactionNsu,
      slug,
      valorEsperadoCentavos:
        Number(
          checkout
            .valor_cobrado_centavos
        ),
      parcelasEsperadas:
        checkout.parcelas,
    });

  if (!verificado.pago) {
    return {
      pago: false,
      motivo:
        verificado.motivo,
    };
  }

  const pago =
    verificado.data;

  const {
    error: erroMeta,
  } = await admin
    .from(
      'presente_checkouts'
    )
    .update({
      infinitepay_slug:
        slug,
      infinitepay_transaction_nsu:
        transactionNsu,
      infinitepay_receipt_url:
        receiptUrl || null,
      infinitepay_capture_method:
        pago.capture_method ??
        'credit_card',
      infinitepay_paid_amount_centavos:
        Number(
          pago.paid_amount ??
          pago.amount ??
          0
        ) || null,
    })
    .eq(
      'id',
      checkout.id
    )
    .eq(
      'status',
      'pendente'
    );

  if (erroMeta) {
    throw new Error(
      `Falha ao registrar confirmação InfinitePay: ${erroMeta.message}`
    );
  }

  /**
   * Fonte única de verdade financeira já existente na ConviteIA.
   * Ela bloqueia o checkout pendente, marca checkout/itens pagos,
   * soma liquido_centavos, credita evento_saldo e incrementa cotas.
   */
  const {
    data: processado,
    error: erroProcessar,
  } = await admin.rpc(
    'processar_checkout_presente',
    {
      p_checkout_id:
        checkout.id,
    }
  );

  if (erroProcessar) {
    throw new Error(
      `Falha ao processar presentes: ${erroProcessar.message}`
    );
  }

  return {
    pago: true,
    jaProcessado:
      processado !== true,
  };
}
