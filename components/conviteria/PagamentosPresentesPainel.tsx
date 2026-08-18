'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Banknote,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  Loader2,
  QrCode,
  ReceiptText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { brlSaque } from '@/lib/conviteria/saque';

type TaxaResponsavel =
  | 'anfitriao'
  | 'convidado';

type Dados = {
  temPresentes: boolean;
  config: {
    ativo: boolean;
    taxaResponsavel:
      TaxaResponsavel;
    maxParcelas: number;
  };
  totais: {
    pix: {
      quantidade: number;
      presentesCentavos: number;
      liquidoCentavos: number;
    };
    cartao: {
      quantidade: number;
      presentesCentavos: number;
      cobradoCentavos: number;
      taxaProcessamentoCentavos: number;
      taxaConviteiaCentavos: number;
      liquidoCentavos: number;
    };
  };
  pagamentos: Array<{
    id: string;
    metodo: 'pix' | 'cartao';
    valorPresentesCentavos: number;
    valorCobradoCentavos: number;
    taxaConviteiaCentavos: number;
    taxaProcessamentoCentavos: number;
    taxaProcessamentoBps: number;
    taxaResponsavel:
      TaxaResponsavel | null;
    liquidoCentavos: number;
    parcelas: number | null;
    pagadorNome: string | null;
    pagoEm: string | null;
    comprovanteUrl: string | null;
  }>;
};

const TAXAS = [
  ['1x', '4,99%'],
  ['2x', '7,09%'],
  ['3x', '8,01%'],
  ['4x', '8,91%'],
  ['5x', '9,80%'],
  ['6x', '10,67%'],
] as const;

function dataPtBr(valor: string | null) {
  if (!valor) return '';

  const d = new Date(valor);

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  return d.toLocaleString(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    }
  );
}

export default function PagamentosPresentesPainel({
  eventoId,
}: {
  eventoId: string;
}) {
  const [aberto, setAberto] =
    useState(false);

  const [dados, setDados] =
    useState<Dados | null>(null);

  const [erro, setErro] =
    useState('');

  const [salvando, setSalvando] =
    useState(false);

  const [salvo, setSalvo] =
    useState(false);

  const token = useCallback(
    async () =>
      (
        await createClient()
          .auth.getSession()
      ).data.session
        ?.access_token ?? '',
    []
  );

  const carregar =
    useCallback(async () => {
      setErro('');

      try {
        const r = await fetch(
          `/api/conviteria/presente/painel?evento=${encodeURIComponent(eventoId)}`,
          {
            headers: {
              Authorization:
                `Bearer ${await token()}`,
            },
            cache: 'no-store',
          }
        );

        const d =
          await r.json();

        if (!r.ok) {
          throw new Error(
            d?.erro ??
            'Falha ao carregar pagamentos.'
          );
        }

        setDados(d);
      } catch (e: any) {
        setErro(
          e?.message ??
          'Falha ao carregar pagamentos.'
        );
      }
    }, [eventoId, token]);

  useEffect(() => {
    if (aberto && !dados) {
      void carregar();
    }
  }, [aberto, dados, carregar]);

  async function salvarConfig(
    proxima: Dados['config']
  ) {
    if (!dados || salvando) return;

    const anterior = dados.config;

    setDados({
      ...dados,
      config: proxima,
    });

    setSalvando(true);
    setErro('');
    setSalvo(false);

    try {
      const r = await fetch(
        '/api/conviteria/presente/painel',
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${await token()}`,
          },
          body: JSON.stringify({
            eventoId,
            ativo:
              proxima.ativo,
            taxaResponsavel:
              proxima.taxaResponsavel,
          }),
        }
      );

      const d =
        await r.json()
          .catch(() => null);

      if (!r.ok) {
        throw new Error(
          d?.erro ??
          'Não foi possível salvar.'
        );
      }

      setSalvo(true);

      window.setTimeout(
        () => setSalvo(false),
        1800
      );
    } catch (e: any) {
      setDados({
        ...dados,
        config: anterior,
      });

      setErro(
        e?.message ??
        'Não foi possível salvar.'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="mt-3 border-t pt-3"
      style={{
        borderColor: '#c0607822',
      }}
    >
      <button
        type="button"
        onClick={() =>
          setAberto((v) => !v)
        }
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{
            color: '#a04a63',
          }}
        >
          <CreditCard className="h-4 w-4" />
          {aberto
            ? 'Fechar pagamentos'
            : 'Pagamentos dos presentes'}
        </span>

        {aberto
          ? (
            <ChevronUp
              className="h-4 w-4"
              style={{
                color: '#9b7b84',
              }}
            />
          )
          : (
            <ChevronDown
              className="h-4 w-4"
              style={{
                color: '#9b7b84',
              }}
            />
          )
        }
      </button>

      {aberto && (
        <div
          className="mt-4 rounded-2xl border p-4 sm:p-5"
          style={{
            backgroundColor:
              '#fff9fb',
            borderColor:
              '#c0607833',
          }}
        >
          {!dados && !erro && (
            <div
              className="flex items-center justify-center gap-2 py-8 text-sm"
              style={{
                color: '#7c5560',
              }}
            >
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando pagamentos…
            </div>
          )}

          {dados && !dados.temPresentes && (
            <p
              className="rounded-xl bg-white px-4 py-3 text-xs"
              style={{
                color: '#7c5560',
              }}
            >
              Este convite não tem presentes ativos no momento.
            </p>
          )}

          {dados && dados.temPresentes && (
            <>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: '#40232c',
                  }}
                >
                  Formas de pagamento
                </p>

                <p
                  className="mt-1 text-xs leading-5"
                  style={{
                    color: '#7c5560',
                  }}
                >
                  O PIX continua disponível normalmente.
                  Você pode oferecer também cartão de
                  crédito em até 6x pela InfinitePay.
                </p>
              </div>

              <div
                className="mt-4 rounded-xl border bg-white p-4"
                style={{
                  borderColor:
                    '#c0607828',
                }}
              >
                <label
                  className="flex cursor-pointer items-center justify-between gap-4"
                >
                  <span>
                    <span
                      className="flex items-center gap-2 text-sm font-medium"
                      style={{
                        color:
                          '#40232c',
                      }}
                    >
                      <CreditCard className="h-4 w-4" />
                      Aceitar cartão
                    </span>

                    <span
                      className="mt-1 block text-xs"
                      style={{
                        color:
                          '#7c5560',
                      }}
                    >
                      Crédito de 1x a 6x.
                    </span>
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      dados.config.ativo
                    }
                    disabled={salvando}
                    onChange={(e) =>
                      void salvarConfig({
                        ...dados.config,
                        ativo:
                          e.target.checked,
                      })
                    }
                    className="h-5 w-5 accent-[#c06078]"
                  />
                </label>
              </div>

              {dados.config.ativo && (
                <div
                  className="mt-3 rounded-xl border bg-white p-4"
                  style={{
                    borderColor:
                      '#c0607828',
                  }}
                >
                  <p
                    className="text-xs font-semibold"
                    style={{
                      color:
                        '#40232c',
                    }}
                  >
                    Quem paga a taxa do cartão?
                  </p>

                  <div className="mt-3 grid gap-2">
                    <label
                      className="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3"
                      style={{
                        borderColor:
                          dados.config.taxaResponsavel ===
                          'anfitriao'
                            ? '#c06078'
                            : '#c0607828',
                        backgroundColor:
                          dados.config.taxaResponsavel ===
                          'anfitriao'
                            ? '#fff4f7'
                            : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name={`taxa-${eventoId}`}
                        value="anfitriao"
                        checked={
                          dados.config.taxaResponsavel ===
                          'anfitriao'
                        }
                        disabled={salvando}
                        onChange={() =>
                          void salvarConfig({
                            ...dados.config,
                            taxaResponsavel:
                              'anfitriao',
                          })
                        }
                        className="mt-0.5 accent-[#c06078]"
                      />

                      <span>
                        <strong
                          className="block text-xs"
                          style={{
                            color:
                              '#40232c',
                          }}
                        >
                          Eu assumo a taxa
                        </strong>

                        <span
                          className="mt-1 block text-xs leading-5"
                          style={{
                            color:
                              '#7c5560',
                          }}
                        >
                          O convidado paga somente o
                          valor dos presentes. A taxa
                          do cartão é descontada do
                          saldo do evento.
                        </span>
                      </span>
                    </label>

                    <label
                      className="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3"
                      style={{
                        borderColor:
                          dados.config.taxaResponsavel ===
                          'convidado'
                            ? '#c06078'
                            : '#c0607828',
                        backgroundColor:
                          dados.config.taxaResponsavel ===
                          'convidado'
                            ? '#fff4f7'
                            : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name={`taxa-${eventoId}`}
                        value="convidado"
                        checked={
                          dados.config.taxaResponsavel ===
                          'convidado'
                        }
                        disabled={salvando}
                        onChange={() =>
                          void salvarConfig({
                            ...dados.config,
                            taxaResponsavel:
                              'convidado',
                          })
                        }
                        className="mt-0.5 accent-[#c06078]"
                      />

                      <span>
                        <strong
                          className="block text-xs"
                          style={{
                            color:
                              '#40232c',
                          }}
                        >
                          Repassar ao convidado
                        </strong>

                        <span
                          className="mt-1 block text-xs leading-5"
                          style={{
                            color:
                              '#7c5560',
                          }}
                        >
                          O valor da taxa de processamento
                          é acrescentado ao total do
                          pagamento no cartão.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                    {TAXAS.map(
                      ([parcela, taxa]) => (
                        <div
                          key={parcela}
                          className="rounded-lg px-2 py-2 text-center"
                          style={{
                            backgroundColor:
                              '#fdf0f3',
                          }}
                        >
                          <strong
                            className="block text-[11px]"
                            style={{
                              color:
                                '#40232c',
                            }}
                          >
                            {parcela}
                          </strong>
                          <span
                            className="text-[10px]"
                            style={{
                              color:
                                '#a04a63',
                            }}
                          >
                            {taxa}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  <p
                    className="mt-3 text-[11px] leading-5"
                    style={{
                      color:
                        '#7c5560',
                    }}
                  >
                    As taxas acima são de processamento
                    do cartão. A taxa de 1% da ConviteIA
                    sobre presentes continua separada.
                  </p>
                </div>
              )}

              {(salvando || salvo) && (
                <p
                  className="mt-3 flex items-center gap-2 text-xs"
                  style={{
                    color: salvo
                      ? '#047857'
                      : '#7c5560',
                  }}
                >
                  {salvando
                    ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Salvando…
                      </>
                    )
                    : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Configuração salva
                      </>
                    )
                  }
                </p>
              )}

              <div className="mt-5">
                <p
                  className="mb-2 text-xs font-semibold"
                  style={{
                    color: '#40232c',
                  }}
                >
                  Recebimentos confirmados
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl border bg-white p-4"
                    style={{
                      borderColor:
                        '#c0607828',
                    }}
                  >
                    <p
                      className="flex items-center gap-1.5 text-xs"
                      style={{
                        color:
                          '#7c5560',
                      }}
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      PIX
                    </p>

                    <p
                      className="mt-1 text-lg font-semibold"
                      style={{
                        color:
                          '#40232c',
                      }}
                    >
                      {brlSaque(
                        dados.totais.pix
                          .presentesCentavos
                      )}
                    </p>

                    <p
                      className="mt-1 text-[10px]"
                      style={{
                        color:
                          '#9b7b84',
                      }}
                    >
                      {dados.totais.pix.quantidade}{' '}
                      pagamento
                      {dados.totais.pix.quantidade === 1
                        ? ''
                        : 's'}
                    </p>
                  </div>

                  <div
                    className="rounded-xl border bg-white p-4"
                    style={{
                      borderColor:
                        '#c0607828',
                    }}
                  >
                    <p
                      className="flex items-center gap-1.5 text-xs"
                      style={{
                        color:
                          '#7c5560',
                      }}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Cartão
                    </p>

                    <p
                      className="mt-1 text-lg font-semibold"
                      style={{
                        color:
                          '#40232c',
                      }}
                    >
                      {brlSaque(
                        dados.totais.cartao
                          .presentesCentavos
                      )}
                    </p>

                    <p
                      className="mt-1 text-[10px]"
                      style={{
                        color:
                          '#9b7b84',
                      }}
                    >
                      {dados.totais.cartao.quantidade}{' '}
                      pagamento
                      {dados.totais.cartao.quantidade === 1
                        ? ''
                        : 's'}
                    </p>
                  </div>
                </div>

                {dados.totais.cartao.quantidade > 0 && (
                  <div
                    className="mt-3 rounded-xl px-4 py-3 text-xs"
                    style={{
                      backgroundColor:
                        '#fdf0f3',
                      color:
                        '#7c5560',
                    }}
                  >
                    <div className="flex justify-between gap-3">
                      <span>
                        Processamento do cartão
                      </span>
                      <strong
                        style={{
                          color:
                            '#40232c',
                        }}
                      >
                        {brlSaque(
                          dados.totais.cartao
                            .taxaProcessamentoCentavos
                        )}
                      </strong>
                    </div>

                    <div className="mt-1 flex justify-between gap-3">
                      <span>
                        Taxa ConviteIA (1%)
                      </span>
                      <strong
                        style={{
                          color:
                            '#40232c',
                        }}
                      >
                        {brlSaque(
                          dados.totais.cartao
                            .taxaConviteiaCentavos
                        )}
                      </strong>
                    </div>

                    <div
                      className="mt-2 flex justify-between gap-3 border-t pt-2"
                      style={{
                        borderColor:
                          '#c0607822',
                      }}
                    >
                      <span>
                        Líquido do cartão creditado
                      </span>
                      <strong
                        style={{
                          color:
                            '#40232c',
                        }}
                      >
                        {brlSaque(
                          dados.totais.cartao
                            .liquidoCentavos
                        )}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {dados.pagamentos.length > 0 && (
                <div className="mt-5">
                  <p
                    className="mb-2 flex items-center gap-2 text-xs font-semibold"
                    style={{
                      color:
                        '#40232c',
                    }}
                  >
                    <ReceiptText className="h-4 w-4" />
                    Últimos pagamentos
                  </p>

                  <ul className="space-y-2">
                    {dados.pagamentos.map(
                      (p) => (
                        <li
                          key={p.id}
                          className="rounded-xl border bg-white px-3 py-3"
                          style={{
                            borderColor:
                              '#c0607828',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p
                                className="flex items-center gap-1.5 text-xs font-semibold"
                                style={{
                                  color:
                                    '#40232c',
                                }}
                              >
                                {p.metodo === 'cartao'
                                  ? (
                                    <CreditCard className="h-3.5 w-3.5" />
                                  )
                                  : (
                                    <QrCode className="h-3.5 w-3.5" />
                                  )
                                }

                                {p.metodo === 'cartao'
                                  ? `Cartão · ${p.parcelas ?? 1}x`
                                  : 'PIX'}
                              </p>

                              <p
                                className="mt-1 truncate text-[11px]"
                                style={{
                                  color:
                                    '#7c5560',
                                }}
                              >
                                {p.pagadorNome ||
                                  'Convidado'}
                                {p.pagoEm
                                  ? ` · ${dataPtBr(p.pagoEm)}`
                                  : ''}
                              </p>
                            </div>

                            <strong
                              className="shrink-0 text-sm"
                              style={{
                                color:
                                  '#40232c',
                              }}
                            >
                              {brlSaque(
                                p.valorPresentesCentavos
                              )}
                            </strong>
                          </div>

                          {p.metodo === 'cartao' && (
                            <div
                              className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2 text-[10px]"
                              style={{
                                borderColor:
                                  '#c060781c',
                                color:
                                  '#7c5560',
                              }}
                            >
                              <span>
                                Cobrado
                              </span>
                              <strong
                                className="text-right"
                                style={{
                                  color:
                                    '#40232c',
                                }}
                              >
                                {brlSaque(
                                  p.valorCobradoCentavos
                                )}
                              </strong>

                              <span>
                                Processamento
                              </span>
                              <strong
                                className="text-right"
                                style={{
                                  color:
                                    '#40232c',
                                }}
                              >
                                {brlSaque(
                                  p.taxaProcessamentoCentavos
                                )}
                              </strong>

                              <span>
                                Líquido do evento
                              </span>
                              <strong
                                className="text-right"
                                style={{
                                  color:
                                    '#40232c',
                                }}
                              >
                                {brlSaque(
                                  p.liquidoCentavos
                                )}
                              </strong>
                            </div>
                          )}

                          {p.comprovanteUrl && (
                            <a
                              href={p.comprovanteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium"
                              style={{
                                color:
                                  '#a04a63',
                              }}
                            >
                              Comprovante InfinitePay
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </>
          )}

          {erro && (
            <p className="mt-3 text-xs text-red-700">
              {erro}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
