'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useSearchParams,
} from 'next/navigation';
import {
  CheckCircle2,
  ExternalLink,
  Gift,
  Loader2,
  RefreshCw,
} from 'lucide-react';

type Estado =
  | 'verificando'
  | 'pago'
  | 'pendente'
  | 'erro';

function ResultadoConteudo() {
  const params =
    useSearchParams();

  const orderNsu =
    params.get(
      'order_nsu'
    ) ?? '';

  const transactionNsu =
    params.get(
      'transaction_nsu'
    ) ?? '';

  const slug =
    params.get('slug') ??
    '';

  const receiptUrl =
    params.get(
      'receipt_url'
    ) ?? '';

  const [estado, setEstado] =
    useState<Estado>(
      'verificando'
    );

  const [
    mensagem,
    setMensagem,
  ] = useState(
    'Confirmando seu pagamento com a InfinitePay…'
  );

  const [
    comprovante,
    setComprovante,
  ] = useState(
    receiptUrl
  );

  const [
    conviteSlug,
    setConviteSlug,
  ] = useState('');

  const voltarConvite =
    useMemo(
      () =>
        conviteSlug
          ? `https://${encodeURIComponent(conviteSlug)}.conviteia.com`
          : 'https://conviteia.com',
      [conviteSlug]
    );

  const verificar =
    useCallback(async () => {
      if (!orderNsu) {
        setEstado('erro');
        setMensagem(
          'Não foi possível identificar este pagamento.'
        );
        return false;
      }

      try {
        const r =
          await fetch(
            '/api/conviteria/presente/cartao/status',
            {
              method:
                'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  orderNsu,
                  transactionNsu:
                    transactionNsu ||
                    undefined,
                  slug:
                    slug ||
                    undefined,
                  receiptUrl:
                    receiptUrl ||
                    undefined,
                }),
              cache:
                'no-store',
            }
          );

        const d =
          await r
            .json()
            .catch(
              () => null
            );

        if (
          d?.conviteSlug
        ) {
          setConviteSlug(
            d.conviteSlug
          );
        }

        if (
          r.ok &&
          d?.pago
        ) {
          setEstado('pago');

          setMensagem(
            'Presentes confirmados com sucesso!'
          );

          if (
            d?.receiptUrl
          ) {
            setComprovante(
              d.receiptUrl
            );
          }

          return true;
        }

        if (
          r.status === 404 ||
          r.status === 409
        ) {
          setEstado('erro');

          setMensagem(
            d?.erro ??
            'Não foi possível localizar este pagamento.'
          );

          return false;
        }

        setEstado(
          'pendente'
        );

        setMensagem(
          'O pagamento ainda está sendo confirmado. Isso normalmente leva apenas alguns segundos.'
        );

        return false;
      } catch {
        setEstado(
          'pendente'
        );

        setMensagem(
          'Estamos aguardando a confirmação do pagamento. Você pode verificar novamente.'
        );

        return false;
      }
    }, [
      orderNsu,
      receiptUrl,
      slug,
      transactionNsu,
    ]);

  useEffect(() => {
    let cancelado =
      false;

    let timeout:
      number | undefined;

    (async () => {
      for (
        let tentativa = 0;
        tentativa < 7 &&
        !cancelado;
        tentativa += 1
      ) {
        setEstado(
          'verificando'
        );

        const pago =
          await verificar();

        if (
          pago ||
          cancelado
        ) {
          return;
        }

        await new Promise<void>(
          (resolve) => {
            timeout =
              window.setTimeout(
                resolve,
                1800
              );
          }
        );
      }

      if (!cancelado) {
        setEstado(
          'pendente'
        );

        setMensagem(
          'Seu pagamento foi enviado e ainda está sendo confirmado. Se acabou de pagar, aguarde alguns segundos e verifique novamente.'
        );
      }
    })();

    return () => {
      cancelado =
        true;

      if (timeout) {
        window.clearTimeout(
          timeout
        );
      }
    };
  }, [verificar]);

  async function verificarManual() {
    setEstado(
      'verificando'
    );

    setMensagem(
      'Consultando a InfinitePay…'
    );

    await verificar();
  }

  return (
    <main className="min-h-screen bg-[#fff8fa] px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-[#c06078]/20 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-7 text-center border-b border-[#c06078]/10">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#fdf0f3] flex items-center justify-center text-[#b34f77]">
            <Gift className="w-7 h-7" />
          </div>

          <p className="mt-3 text-xs uppercase tracking-[.18em] text-[#a04a63]">
            Convite IA
          </p>

          <h1 className="mt-1 text-xl font-semibold text-[#40232c]">
            Pagamento do presente
          </h1>
        </div>

        <div className="px-6 py-8 text-center">
          {estado ===
            'verificando' && (
            <div className="space-y-4">
              <Loader2 className="mx-auto w-10 h-10 animate-spin text-[#b34f77]" />
              <p className="text-sm text-[#7c5560]">
                {mensagem}
              </p>
            </div>
          )}

          {estado ===
            'pago' && (
            <div className="space-y-4">
              <CheckCircle2 className="mx-auto w-14 h-14 text-emerald-600" />

              <div>
                <h2 className="text-lg font-semibold text-[#40232c]">
                  Presentes confirmados!
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#7c5560]">
                  Obrigado. O pagamento foi confirmado e os presentes já foram registrados para os anfitriões.
                </p>
              </div>

              {comprovante && (
                <a
                  href={comprovante}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-[#a04a63] hover:underline"
                >
                  Ver comprovante
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {estado ===
            'pendente' && (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-amber-600" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[#40232c]">
                  Confirmando pagamento
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#7c5560]">
                  {mensagem}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  verificarManual
                }
                className="w-full rounded-xl bg-[#b34f77] px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
              >
                Verificar novamente
              </button>
            </div>
          )}

          {estado ===
            'erro' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[#40232c]">
                  Não foi possível confirmar
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#7c5560]">
                  {mensagem}
                </p>
              </div>
            </div>
          )}

          {estado !==
            'verificando' && (
            <a
              href={
                voltarConvite
              }
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[#c06078]/30 px-4 py-3 text-sm font-semibold text-[#a04a63] hover:bg-[#fdf0f3]"
            >
              Voltar ao convite
            </a>
          )}
        </div>

        <p className="px-6 pb-6 text-center text-[11px] leading-5 text-[#9b7882]">
          O pagamento com cartão é processado com segurança pela InfinitePay.
        </p>
      </section>
    </main>
  );
}

export default function ResultadoCartaoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fff8fa] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#b34f77]" />
        </main>
      }
    >
      <ResultadoConteudo />
    </Suspense>
  );
}
