'use client';

import {
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Info,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Recursos = {
  rsvp: boolean;
  confirmacaoEmail: boolean;
  lembretesEmail: boolean;
};

const RECURSOS_PADRAO: Recursos = {
  rsvp: true,
  confirmacaoEmail: false,
  lembretesEmail: false,
};

function mensagemSugerida({
  titulo,
  url,
  recursos,
}: {
  titulo: string;
  url: string;
  recursos: Recursos;
}) {
  const linhas = [
    '💌 Você está convidado(a)!',
    '',
    `Preparamos um convite especial para *${titulo}*. ✨`,
    '',
    'Acesse aqui:',
    url,
    '',
    'No convite você encontra todos os detalhes do evento.',
  ];

  if (recursos.rsvp) {
    linhas.push(
      '✅ Confirme sua presença diretamente pelo convite.'
    );
  }

  linhas.push(
    '📅 Você também pode adicionar a data ao Google Agenda em um toque.'
  );

  if (
    recursos.confirmacaoEmail &&
    recursos.lembretesEmail
  ) {
    linhas.push(
      '✉️ Ao confirmar, você recebe a confirmação por e-mail e lembretes automáticos perto da data para não esquecer.'
    );
  } else if (recursos.confirmacaoEmail) {
    linhas.push(
      '✉️ Ao confirmar, você recebe também a confirmação por e-mail.'
    );
  } else if (recursos.lembretesEmail) {
    linhas.push(
      '✉️ Você também pode receber lembretes automáticos por e-mail perto da data.'
    );
  }

  linhas.push(
    '',
    'Esperamos você! 💕',
    '',
    'Convite digital criado com ConviteIA.'
  );

  return linhas.join('\n');
}

export default function CompartilharWhatsappPainel({
  eventoId,
  titulo,
  url,
}: {
  eventoId: string;
  titulo: string;
  url: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [recursos, setRecursos] =
    useState<Recursos>(RECURSOS_PADRAO);

  const [texto, setTexto] = useState(() =>
    mensagemSugerida({
      titulo,
      url,
      recursos: RECURSOS_PADRAO,
    })
  );

  const customizado = useRef(false);
  const carregouRecursos = useRef(false);
  const [supabase] = useState(() => createClient());

  const sugestao = useMemo(
    () =>
      mensagemSugerida({
        titulo,
        url,
        recursos,
      }),
    [titulo, url, recursos]
  );

  const chaveLocal =
    `conviteia:whatsapp:${eventoId}`;

  useEffect(() => {
    try {
      const salvo =
        window.localStorage.getItem(chaveLocal);

      if (salvo?.trim()) {
        customizado.current = true;
        setTexto(salvo);
      }
    } catch {
      // localStorage pode estar indisponível em modo privado/restrito.
    }
  }, [chaveLocal]);

  useEffect(() => {
    if (!customizado.current) {
      setTexto(sugestao);
    }
  }, [sugestao]);

  const carregarRecursos = useCallback(async () => {
    if (
      carregouRecursos.current ||
      carregando
    ) {
      return;
    }

    setCarregando(true);

    try {
      const { data } =
        await supabase.auth.getSession();

      const token =
        data.session?.access_token;

      if (!token) return;

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        eventoResp,
        googleResp,
        configResp,
      ] = await Promise.all([
        fetch(
          `/api/conviteria/evento?id=${encodeURIComponent(
            eventoId
          )}`,
          {
            headers,
            cache: 'no-store',
          }
        ),
        fetch(
          `/api/conviteria/google?evento=${encodeURIComponent(
            eventoId
          )}`,
          {
            headers,
            cache: 'no-store',
          }
        ),
        fetch(
          `/api/conviteria/google-config?evento=${encodeURIComponent(
            eventoId
          )}`,
          {
            headers,
            cache: 'no-store',
          }
        ),
      ]);

      const evento =
        eventoResp.ok
          ? await eventoResp
              .json()
              .catch(() => null)
          : null;

      const google =
        googleResp.ok
          ? await googleResp
              .json()
              .catch(() => null)
          : null;

      const config =
        configResp.ok
          ? await configResp
              .json()
              .catch(() => null)
          : null;

      const secoes =
        Array.isArray(evento?.cfg?.secoes)
          ? evento.cfg.secoes
          : null;

      const rsvp =
        secoes == null
          ? true
          : secoes.some(
              (s: any) =>
                s?.tipo === 'rsvp' &&
                s?.ativo !== false
            );

      const gmailAtivo =
        google?.conectado === true &&
        google?.gmail === true;

      const prefs =
        config?.preferencias;

      setRecursos({
        rsvp,
        confirmacaoEmail:
          gmailAtivo &&
          prefs?.enviarConfirmacao !== false,
        lembretesEmail:
          gmailAtivo &&
          (
            prefs?.lembrete30d !== false ||
            prefs?.lembrete7d !== false ||
            prefs?.lembrete1d !== false
          ),
      });

      carregouRecursos.current = true;
    } catch (erro) {
      console.error(
        'ConviteIA compartilhar WhatsApp:',
        erro
      );
    } finally {
      setCarregando(false);
    }
  }, [
    carregando,
    eventoId,
    supabase,
  ]);

  useEffect(() => {
    if (aberto) {
      void carregarRecursos();
    }
  }, [aberto, carregarRecursos]);

  function alterarTexto(valor: string) {
    customizado.current = true;
    setTexto(valor);

    try {
      window.localStorage.setItem(
        chaveLocal,
        valor
      );
    } catch {
      // A edição continua funcionando mesmo sem persistência local.
    }
  }

  function restaurar() {
    customizado.current = false;
    setTexto(sugestao);

    try {
      window.localStorage.removeItem(
        chaveLocal
      );
    } catch {
      // Sem impacto no fluxo principal.
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(
        texto.trim()
      );

      setCopiado(true);

      window.setTimeout(
        () => setCopiado(false),
        1800
      );
    } catch {
      setCopiado(false);
    }
  }

  function compartilhar() {
    const mensagem =
      texto.trim();

    if (!mensagem) return;

    const destino =
      `https://wa.me/?text=${encodeURIComponent(
        mensagem
      )}`;

    window.open(
      destino,
      '_blank',
      'noopener,noreferrer'
    );
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
          <MessageCircle className="h-4 w-4" />
          Compartilhar no WhatsApp
        </span>

        {aberto ? (
          <ChevronUp
            className="h-4 w-4"
            style={{
              color: '#9b7b84',
            }}
          />
        ) : (
          <ChevronDown
            className="h-4 w-4"
            style={{
              color: '#9b7b84',
            }}
          />
        )}
      </button>

      {aberto && (
        <div
          className="mt-4 rounded-2xl border p-4 sm:p-5"
          style={{
            backgroundColor: '#fff9fb',
            borderColor: '#c0607833',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-sm font-semibold"
                style={{
                  color: '#40232c',
                }}
              >
                Mensagem para os convidados
              </p>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color: '#7c5560',
                }}
              >
                Já deixamos uma sugestão pronta com o link e os recursos
                disponíveis neste convite. Você pode editar como quiser.
              </p>
            </div>

            {carregando && (
              <Loader2
                className="mt-0.5 h-4 w-4 shrink-0 animate-spin"
                style={{
                  color: '#c06078',
                }}
              />
            )}
          </div>

          <textarea
            value={texto}
            onChange={(e) =>
              alterarTexto(e.target.value)
            }
            rows={10}
            maxLength={2500}
            aria-label="Mensagem para compartilhar no WhatsApp"
            className="mt-4 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm leading-6 outline-none transition focus:ring-2"
            style={{
              borderColor: '#c0607833',
              color: '#40232c',
              boxShadow: 'none',
            }}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={compartilhar}
              disabled={!texto.trim()}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
              style={{
                backgroundColor: '#25D366',
              }}
            >
              <Send className="h-4 w-4" />
              Compartilhar no WhatsApp
            </button>

            <button
              type="button"
              onClick={() => void copiar()}
              disabled={!texto.trim()}
              className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-xs font-semibold disabled:opacity-45"
              style={{
                borderColor: '#c0607833',
                color: '#7c5560',
              }}
            >
              {copiado ? (
                <Check className="h-4 w-4" />
              ) : (
                <Clipboard className="h-4 w-4" />
              )}
              {copiado
                ? 'Mensagem copiada'
                : 'Copiar mensagem'}
            </button>

            <button
              type="button"
              onClick={restaurar}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-medium"
              style={{
                color: '#a04a63',
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar sugestão
            </button>
          </div>

          <div
            className="mt-5 rounded-xl border bg-white p-4"
            style={{
              borderColor: '#c0607828',
            }}
          >
            <p
              className="flex items-center gap-2 text-xs font-semibold"
              style={{
                color: '#40232c',
              }}
            >
              <Info className="h-4 w-4" />
              Enviar para vários convidados
            </p>

            <div
              className="mt-2 space-y-2 text-xs leading-5"
              style={{
                color: '#7c5560',
              }}
            >
              <p>
                No WhatsApp você pode usar uma lista de transmissão para
                enviar a mesma mensagem a vários contatos de uma vez, sem
                criar um grupo. Cada convidado recebe a mensagem em uma
                conversa particular.
              </p>

              <p>
                <strong style={{ color: '#40232c' }}>
                  Android:
                </strong>{' '}
                abra o menu ⋮ e procure “Nova transmissão”.
                {' '}
                <strong style={{ color: '#40232c' }}>
                  iPhone:
                </strong>{' '}
                procure “Listas de transmissão” ou “Nova transmissão” na
                área de conversas. O nome e a posição podem variar conforme
                a versão do WhatsApp.
              </p>

              <p>
                Selecione os contatos, crie a transmissão e cole esta
                mensagem. Para listas de transmissão, o WhatsApp pode exigir
                que o convidado tenha seu número salvo; se alguém não receber,
                envie o convite individualmente.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
