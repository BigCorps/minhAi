'use client';

// app/convite/pagar/page.tsx
//
// Mesma maquina de estados do AdicionarSaldoModal do ConsultaTec
// (valor → pix → confirmando → sucesso), com duas diferencas:
//
// 1. Nao ha escolha de valor: o preco do convite avulso vem de PLANOS, no
//    servidor. Comeca direto no PIX.
// 2. O "Já paguei" e o polling perguntam a /api/conviteria/evento-status, que
//    por sua vez pede a checagem imediata ao banco via
//    confirmar-pix-assistente. Antes essa rota so lia `publicado_em` e a
//    confirmacao ficava presa ao cron `auto-confirmar-pix` — era essa a
//    demora que o cliente via.

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import RendaBackground from '@/components/conviteria/RendaBackground';
import { Loader2, AlertCircle, CheckCircle2, Copy, Check } from 'lucide-react';
import { MARCA } from '@/lib/conviteria/marca';

const cor = {
  fora: '#ffffff',
  papel: '#fdf0f3',
  acento: '#c06078',
  acentoTexto: '#a04a63',
  tinta: '#40232c',
  tintaSuave: '#7c5560',
  blocoTexto: '#fff5f8',
  erroBg: '#f7e2e6',
  erroTexto: '#8c2f43',
};

type Passo = 'gerando' | 'pix' | 'conferindo' | 'sucesso';

interface Cobranca {
  valorCentavos: number;
  qrcode: string;
  copiaECola: string;
}

function brl(centavos: number) {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

function PagarConteudo() {
  const [passo, setPasso] = useState<Passo>('gerando');
  const [erro, setErro] = useState<string | null>(null);
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [urlConvite, setUrlConvite] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const params = useSearchParams();
  const eventoId = params.get('evento');
  const [supabase] = useState(() => createClient());

  const autorizacao = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  /** Consulta o status. Devolve true quando ja publicou. */
  const conferir = useCallback(async (): Promise<boolean> => {
    const acesso = await autorizacao();
    if (!acesso || !eventoId) return false;

    const r = await fetch(
      `/api/conviteria/evento-status?eventoId=${encodeURIComponent(eventoId)}`,
      { headers: { Authorization: `Bearer ${acesso}` } }
    );
    if (!r.ok) return false;

    const d = await r.json();
    if (d.publicado) {
      setUrlConvite(d.url);
      setPasso('sucesso');
      return true;
    }
    return false;
  }, [autorizacao, eventoId]);

  // Gera a cobranca uma vez, ao abrir.
  useEffect(() => {
    if (!eventoId) {
      setErro('Convite não informado.');
      return;
    }

    let cancelado = false;

    (async () => {
      const acesso = await autorizacao();
      if (!acesso) {
        setErro('Faça login para continuar.');
        return;
      }

      // Se o webhook ja publicou (usuario recarregou a pagina depois de pagar),
      // nao gera PIX novo.
      if (await conferir()) return;

      const r = await fetch('/api/conviteria/cobrar-convite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${acesso}`,
        },
        body: JSON.stringify({ eventoId }),
      });

      const d = await r.json().catch(() => null);
      if (cancelado) return;

      if (!r.ok) {
        setErro(d?.erro ?? 'Não foi possível gerar o PIX.');
        return;
      }

      setCobranca({
        valorCentavos: d.valorCentavos,
        qrcode: d.qrcode,
        copiaECola: d.copiaECola,
      });
      setPasso('pix');
    })();

    return () => { cancelado = true; };
  }, [eventoId, autorizacao, conferir]);

  // Enquanto o QR esta na tela, pergunta o status a cada 5s. O usuario paga no
  // app do banco e a pagina vira sozinha, sem ele precisar clicar em nada.
  //
  // Mesmo ritmo do ModalPresentes: uma primeira consulta aos 7s e depois de
  // 5 em 5. Os 7s existem porque consultar antes disso e quase sempre em vao
  // — ninguem paga um PIX em menos que isso — e cada consulta agora custa uma
  // chamada ao banco, nao so uma leitura de coluna.
  //
  // `emVoo` evita empilhar: a rota pode levar ate 8s no pior caso, e sem essa
  // trava o intervalo dispararia outra consulta por cima da anterior.
  const emVoo = useRef(false);

  useEffect(() => {
    if (passo !== 'pix') return;

    let encerrado = false;

    const tentar = async () => {
      if (encerrado || emVoo.current) return;
      emVoo.current = true;
      try {
        await conferir();
      } finally {
        emVoo.current = false;
      }
    };

    const atraso = window.setTimeout(tentar, 7000);
    const id = window.setInterval(tentar, 5000);

    return () => {
      encerrado = true;
      window.clearTimeout(atraso);
      window.clearInterval(id);
    };
  }, [passo, conferir]);

  async function copiar() {
    if (!cobranca) return;
    await navigator.clipboard.writeText(cobranca.copiaECola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function conferirAgora() {
    setPasso('conferindo');
    setErro(null);
    const ok = await conferir();
    if (!ok) {
      setErro('Ainda não identificamos o pagamento. Aguarde alguns segundos e tente de novo.');
      setPasso('pix');
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
    >
      {/* Sem backgroundColor: o SVG e `-z-10` e o fundo do <main> o cobriria. */}
      <RendaBackground />

      <div
        className="w-full max-w-md rounded-2xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: cor.fora, borderColor: cor.acento + '33' }}
      >
        <header
          className="px-6 py-5 text-center border-b"
          style={{ borderColor: cor.acento + '22' }}
        >
          <h1 className="text-xl font-semibold" style={{ color: cor.tinta }}>
            Publicar seu convite
          </h1>
          <p className="text-sm mt-1" style={{ color: cor.tintaSuave }}>
            {MARCA}
          </p>
        </header>

        <div className="px-6 py-6">
          {erro && (
            <div
              className="mb-5 rounded-lg px-4 py-3 flex items-start gap-2 text-sm"
              style={{ backgroundColor: cor.erroBg, color: cor.erroTexto }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{erro}</p>
            </div>
          )}

          {(passo === 'gerando' || passo === 'conferindo') && (
            <div className="flex flex-col items-center py-12">
              <Loader2
                className="w-9 h-9 animate-spin mb-3"
                style={{ color: cor.acento }}
              />
              <p style={{ color: cor.tinta }}>
                {passo === 'gerando' ? 'Gerando o PIX…' : 'Conferindo o pagamento…'}
              </p>
            </div>
          )}

          {passo === 'pix' && cobranca && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-2xl font-semibold" style={{ color: cor.tinta }}>
                R$ {brl(cobranca.valorCentavos)}
              </p>

              {/* `qrcode` vem como URL https no fluxo Banco Inter e como data:
                  URI no fluxo Mercado Pago. <img> aceita os dois — por isso
                  nao ha validacao de prefixo aqui. */}
              <img
                src={cobranca.qrcode}
                alt="QR Code do PIX"
                className="w-56 h-56 rounded-lg border"
                style={{ borderColor: cor.acento + '44' }}
              />

              <p className="text-sm text-center" style={{ color: cor.tintaSuave }}>
                Escaneie o código no app do seu banco. Assim que o pagamento
                cair, o convite entra no ar sozinho.
              </p>

              <button
                type="button"
                onClick={copiar}
                className="w-full py-2.5 rounded-lg border text-sm font-medium flex items-center justify-center gap-2"
                style={{ borderColor: cor.acento + '55', color: cor.tinta }}
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiado ? 'Código copiado!' : 'Copiar código PIX'}
              </button>

              <button
                type="button"
                onClick={conferirAgora}
                className="w-full py-3 rounded-lg font-semibold"
                style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}
              >
                Já paguei
              </button>
            </div>
          )}

          {passo === 'sucesso' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="w-12 h-12" style={{ color: cor.acento }} />
              <p className="font-semibold text-lg" style={{ color: cor.tinta }}>
                Convite publicado!
              </p>
              {urlConvite && (
                <>
                  <p className="text-sm break-all" style={{ color: cor.tintaSuave }}>
                    {urlConvite}
                  </p>
                  <a
                    href={urlConvite}
                    className="mt-2 w-full py-3 rounded-lg font-semibold"
                    style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}
                  >
                    Ver meu convite
                  </a>
                  {/* Sem esta saida a pessoa termina o pagamento sem caminho
                      de volta e precisa fechar tudo para achar o painel. */}
                  <a
                    href="/convite/painel"
                    className="w-full py-3 rounded-lg font-semibold border"
                    style={{ borderColor: cor.acento + '55', color: cor.acentoTexto }}
                  >
                    Meus convites
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PagarPage() {
  return (
    <Suspense fallback={null}>
      <PagarConteudo />
    </Suspense>
  );
}