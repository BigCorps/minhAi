import type { SupabaseClient } from '@supabase/supabase-js';
import { adminConviteria } from '@/lib/conviteria/servidor';

export type ParcelasCartao = 1 | 2 | 3 | 4 | 5 | 6;
export type ResponsavelTaxaCartao = 'anfitriao' | 'convidado';

// Taxas efetivas da InfinitePay usadas como referência interna.
// O comprador nunca vê a margem da ConviteIA separadamente.
export const TAXAS_INFINITEPAY_BPS: Record<ParcelasCartao, number> = {
  1: 419,
  2: 609,
  3: 701,
  4: 791,
  5: 880,
  6: 967,
};

// Margem comercial embutida pela ConviteIA no preço do cartão.
// Em 1x o preço final é limitado a 4,99%, portanto a margem nominal é 0,80 p.p.
// De 2x a 6x acrescentamos 1,00 p.p. à taxa da InfinitePay.
export const MARGEM_CONVITEIA_CARTAO_BPS: Record<ParcelasCartao, number> = {
  1: 80,
  2: 100,
  3: 100,
  4: 100,
  5: 100,
  6: 100,
};

// Taxa comercial total usada no seletor da ConviteIA e no valor enviado ao checkout.
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

const BIGCORPS_CHECKOUT_REDIRECT_URL =
  'https://checkout.bigcorps.com.br/redirect.html';

const INFINITEPAY_PAYMENT_CHECK_URL =
  'https://api.checkout.infinitepay.io/payment_check';

const CAPITAIS_UF: Record<string, string> = {
  'rio branco': 'AC',
  'maceio': 'AL',
  'macapa': 'AP',
  'manaus': 'AM',
  'salvador': 'BA',
  'fortaleza': 'CE',
  'brasilia': 'DF',
  'vitoria': 'ES',
  'goiania': 'GO',
  'sao luis': 'MA',
  'cuiaba': 'MT',
  'campo grande': 'MS',
  'belo horizonte': 'MG',
  'belem': 'PA',
  'joao pessoa': 'PB',
  'curitiba': 'PR',
  'recife': 'PE',
  'teresina': 'PI',
  'rio de janeiro': 'RJ',
  'natal': 'RN',
  'porto alegre': 'RS',
  'porto velho': 'RO',
  'boa vista': 'RR',
  'florianopolis': 'SC',
  'sao paulo': 'SP',
  'aracaju': 'SE',
  'palmas': 'TO',
};

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
  const bps = taxaCartaoBps(parcelas);

  return {
    bps,
    taxaCentavos: Math.round((valorCentavos * bps) / 10_000),
  };
}

export function margemConviteiaCartaoBps(
  parcelas: ParcelasCartao
) {
  return MARGEM_CONVITEIA_CARTAO_BPS[parcelas];
}

export function calcularMargemConviteiaCartao(
  valorCentavos: number,
  parcelas: ParcelasCartao
) {
  const bps = margemConviteiaCartaoBps(parcelas);

  return {
    bps,
    taxaCentavos: Math.round((valorCentavos * bps) / 10_000),
  };
}

export function normalizarTelefoneBrasil(
  valor: string
) {
  let digitos = String(valor ?? '').replace(/\D/g, '');

  if (digitos.startsWith('55') && digitos.length > 11) {
    digitos = digitos.slice(2);
  }

  if (!/^\d{10,11}$/.test(digitos)) {
    return null;
  }

  return {
    digitos,
    e164: `+55${digitos}`,
  };
}

function semAcento(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizado(valor: unknown) {
  return semAcento(valor)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function limparCep(valor: unknown) {
  const cep = String(valor ?? '').replace(/\D/g, '');
  return /^\d{8}$/.test(cep) ? cep : '';
}

function emailValido(valor: unknown) {
  const email = String(valor ?? '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return '';
  }

  return email;
}

function separarLogradouroENumero(
  valor: unknown,
  numeroExplicito: unknown
) {
  const logradouro = String(valor ?? '').trim();
  const numero = String(numeroExplicito ?? '').trim();

  if (numero) {
    return {
      rua: logradouro,
      numero,
    };
  }

  const match = logradouro.match(
    /^(.*?)(?:,|\s)\s*(\d+[A-Za-z-]*)\s*$/
  );

  if (!match) {
    return {
      rua: logradouro,
      numero: '',
    };
  }

  return {
    rua: match[1].trim(),
    numero: match[2].trim(),
  };
}

function cidadeEUf(local: any) {
  const cidadeBruta = String(local?.cidade ?? '').trim();

  const ufExplicita =
    String(
      local?.uf ??
      local?.estadoUf ??
      local?.siglaEstado ??
      ''
    )
      .trim()
      .toUpperCase();

  const sufixo = cidadeBruta.match(
    /(?:\s*[-,/]\s*|\s+)([A-Za-z]{2})\s*$/
  );

  let uf =
    /^[A-Z]{2}$/.test(ufExplicita)
      ? ufExplicita
      : sufixo?.[1]?.toUpperCase() ?? '';

  let cidade =
    sufixo
      ? cidadeBruta.slice(0, sufixo.index).trim()
      : cidadeBruta;

  if (!uf && cidade) {
    uf = CAPITAIS_UF[normalizado(cidade)] ?? '';
  }

  return {
    cidade,
    uf,
  };
}

type EnderecoInfinitePay = {
  cep: string;
  street: string;
  neighborhood: string;
  number: string;
  complement: string;
};

type ViaCepResultado = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

async function buscarCepPorEndereco(local: any) {
  const { rua } =
    separarLogradouroENumero(
      local?.logradouro,
      local?.numero
    );

  const { cidade, uf } =
    cidadeEUf(local);

  if (
    !rua ||
    rua.length < 3 ||
    !cidade ||
    cidade.length < 3 ||
    !/^[A-Z]{2}$/.test(uf)
  ) {
    return null;
  }

  try {
    const url =
      `https://viacep.com.br/ws/` +
      `${encodeURIComponent(uf)}/` +
      `${encodeURIComponent(cidade)}/` +
      `${encodeURIComponent(rua)}/json/`;

    const response =
      await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(4_000),
        cache: 'no-store',
      });

    if (!response.ok) {
      return null;
    }

    const data =
      (await response.json().catch(() => null)) as
        | ViaCepResultado[]
        | null;

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const bairroEsperado =
      normalizado(local?.bairro);

    const ruaEsperada =
      normalizado(rua);

    const exatoBairro =
      data.find((r) =>
        limparCep(r.cep) &&
        normalizado(r.logradouro) === ruaEsperada &&
        (
          !bairroEsperado ||
          normalizado(r.bairro) === bairroEsperado
        )
      );

    const exatoRua =
      data.find((r) =>
        limparCep(r.cep) &&
        normalizado(r.logradouro) === ruaEsperada
      );

    const primeiroValido =
      data.find((r) =>
        limparCep(r.cep)
      );

    return exatoBairro ?? exatoRua ?? primeiroValido ?? null;
  } catch (error) {
    console.error(
      'ConviteIA: falha ao localizar CEP do evento:',
      error
    );

    return null;
  }
}

async function resolverEnderecoInfinitePay(
  eventoConfig: any
): Promise<EnderecoInfinitePay | undefined> {
  const local =
    eventoConfig?.local ?? {};

  const {
    rua: ruaSalva,
    numero,
  } =
    separarLogradouroENumero(
      local?.logradouro,
      local?.numero
    );

  if (!numero) {
    // A InfinitePay precisa do número para deixar o endereço pronto.
    return undefined;
  }

  let cep =
    limparCep(
      local?.cep ??
      local?.codigoPostal
    );

  let rua =
    ruaSalva;

  let bairro =
    String(local?.bairro ?? '').trim();

  if (!cep) {
    const encontrado =
      await buscarCepPorEndereco(local);

    if (encontrado) {
      cep =
        limparCep(encontrado.cep);

      rua =
        String(
          encontrado.logradouro ??
          rua
        ).trim() || rua;

      bairro =
        String(
          encontrado.bairro ??
          bairro
        ).trim() || bairro;
    }
  }

  if (!cep || !rua) {
    return undefined;
  }

  return {
    cep,
    street: rua,
    neighborhood: bairro,
    number: numero,
    complement:
      String(
        local?.complemento ??
        ''
      ).trim(),
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
  const prefixo = 'conviteia-';

  if (!orderNsu.startsWith(prefixo)) {
    return '';
  }

  return orderNsu.slice(prefixo.length).trim();
}

/**
 * Busca o e-mail da conta que criou o convite.
 * Esse dado nunca vem do navegador.
 */
async function buscarEmailCriadorDoCheckout(
  orderNsu: string
) {
  const checkoutId =
    checkoutIdDoOrderNsu(orderNsu);

  if (!checkoutId) {
    return '';
  }

  try {
    const admin =
      adminConviteria();

    const {
      data: checkout,
      error: erroCheckout,
    } =
      await admin
        .from('presente_checkouts')
        .select('evento_id')
        .eq('id', checkoutId)
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
    } =
      await admin
        .from('eventos')
        .select('conta_id')
        .eq('id', checkout.evento_id)
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
    } =
      await admin
        .from('contas')
        .select('email')
        .eq('id', evento.conta_id)
        .maybeSingle();

    if (erroConta || !conta) {
      return '';
    }

    return emailValido(conta.email);
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
  telefoneE164,
  pagadorNome,
  eventoConfig,
}: {
  orderNsu: string;
  valorCobradoCentavos: number;
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

  const [
    emailCriador,
    address,
  ] =
    await Promise.all([
      buscarEmailCriadorDoCheckout(
        orderNsu
      ),
      resolverEnderecoInfinitePay(
        cfg
      ),
    ]);

  const nome =
    String(
      pagadorNome ?? ''
    ).trim() ||
    `Convidado de ${anfitrioes}`;

  if (!emailCriador) {
    throw new Error(
      'O convite não possui e-mail de contato para pré-preencher o checkout.'
    );
  }

  if (
    !address?.cep ||
    !address?.number
  ) {
    throw new Error(
      'Não foi possível identificar CEP e número do local do evento.'
    );
  }

  const {
    redirectUrl,
  } = urlsConviteia();

  /**
   * A quantidade escolhida no seletor da ConviteIA é usada apenas para definir
   * o preço comercial antes do checkout. Não enviamos `installments` nem
   * `parcelas` à InfinitePay, preservando o checkout de cartão/carteira digital
   * sem o seletor de parcelas que apareceu quando esse parâmetro foi incluído.
   *
   * `result_url` mantém o retorno dentro da ConviteIA. O redirecionador
   * acrescenta os identificadores da transação (order_nsu, transaction_nsu,
   * slug etc.) ao retorno após o pagamento.
   */
  const params =
    new URLSearchParams({
      valor_centavos:
        String(
          valorCobradoCentavos
        ),

      order_id:
        orderNsu,

      telefone:
        telefoneE164
          .replace(/\D/g, ''),

      nome,

      email:
        emailCriador,

      cep:
        address.cep,

      numero:
        address.number,

      handle:
        INFINITEPAY_HANDLE_CONVITEIA,

      // Neste checkout da ConviteIA queremos somente cartão/carteira digital.
      // O redirect da BigCorps mantém "all" como padrão para os outros sistemas.
      payment_method:
        'credit',

      // Opt-in para o redirect enviar o comprador diretamente de volta à ConviteIA.
      app:
        'conviteia',

      resultId:
        crypto.randomUUID(),

      result_url:
        redirectUrl,
    });

  if (address.complement) {
    params.set(
      'complemento',
      address.complement
    );
  }

  return (
    `${BIGCORPS_CHECKOUT_REDIRECT_URL}?` +
    params.toString()
  );
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
}: {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
  valorEsperadoCentavos: number;
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
      motivo: 'metodo_invalido',
      data,
    };
  }

  if (
    Number(data.amount) !==
    valorEsperadoCentavos
  ) {
    return {
      pago: false as const,
      motivo: 'valor_divergente',
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
  receiptUrl?: string | null;
}) {
  if (checkout.status === 'pago') {
    return {
      pago: true,
      jaProcessado: true,
    };
  }

  if (
    checkout.metodo_pagamento !==
      'cartao' ||
    !checkout.infinitepay_order_nsu ||
    !checkout.valor_cobrado_centavos ||
    !parcelasValidas(checkout.parcelas)
  ) {
    throw new Error(
      'Checkout de cartão inválido.'
    );
  }

  const verificado =
    await verificarInfinitePay({
      orderNsu:
        checkout.infinitepay_order_nsu,
      transactionNsu,
      slug,
      valorEsperadoCentavos:
        Number(
          checkout.valor_cobrado_centavos
        ),
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
  } =
    await admin
      .from('presente_checkouts')
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
      .eq('id', checkout.id)
      .eq('status', 'pendente');

  if (erroMeta) {
    throw new Error(
      `Falha ao registrar confirmação InfinitePay: ${erroMeta.message}`
    );
  }

  const {
    data: processado,
    error: erroProcessar,
  } =
    await admin.rpc(
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
