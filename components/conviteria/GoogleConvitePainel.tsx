'use client';

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
  Unplug,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase-browser';

type GoogleStatus = {
  conectado: boolean;
  email?: string;
  gmail?: boolean;
  agenda?: boolean;
  expiraEm?: string;
  atualizadoEm?: string;
};

type Preferencias = {
  enviarConfirmacao: boolean;
  lembrete30d: boolean;
  lembrete7d: boolean;
  lembrete1d: boolean;
};

type Historico = {
  id: string;
  tipo: string;
  email: string | null;
  status: string;
  agendadoPara: string | null;
  enviadoEm: string | null;
  erro: string | null;
  criadoEm: string;
};

const PREF_PADRAO: Preferencias = {
  enviarConfirmacao: true,
  lembrete30d: true,
  lembrete7d: true,
  lembrete1d: true,
};

const ROTULO_TIPO: Record<string, string> = {
  confirmacao: 'Confirmação',
  lembrete_30d: 'Lembrete de 1 mês',
  lembrete_7d: 'Lembrete de 1 semana',
  lembrete_1d: 'Lembrete de 1 dia',
};

function dataCurta(valor?: string | null) {
  if (!valor) return '';

  const d = new Date(valor);

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  return d.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function GoogleConvitePainel({
  eventoId,
}: {
  eventoId: string;
}) {
  const [supabase] =
    useState(() => createClient());

  const [status, setStatus] =
    useState<GoogleStatus>({
      conectado: false,
    });

  const [preferencias, setPreferencias] =
    useState<Preferencias>(PREF_PADRAO);

  const [historico, setHistorico] =
    useState<Historico[]>([]);

  const [historicoAberto, setHistoricoAberto] =
    useState(false);

  const [carregando, setCarregando] =
    useState(true);

  const [conectando, setConectando] =
    useState(false);

  const [desconectando, setDesconectando] =
    useState(false);

  const [salvandoPref, setSalvandoPref] =
    useState<keyof Preferencias | null>(null);

  const [erro, setErro] =
    useState('');

  const popupRef =
    useRef<Window | null>(null);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const token = useCallback(async () => {
    const { data } =
      await supabase.auth.getSession();

    return (
      data.session?.access_token ??
      ''
    );
  }, [supabase]);

  const carregar = useCallback(async () => {
    const acesso = await token();

    if (!acesso) {
      setCarregando(false);
      return;
    }

    try {
      setErro('');

      const headers = {
        Authorization: `Bearer ${acesso}`,
      };

      const [statusResp, configResp] =
        await Promise.all([
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

      const statusData =
        await statusResp.json().catch(() => null);

      if (!statusResp.ok) {
        throw new Error(
          statusData?.erro ||
          'Falha ao consultar o Google.'
        );
      }

      setStatus(
        statusData ?? {
          conectado: false,
        }
      );

      if (configResp.ok) {
        const configData =
          await configResp.json();

        setPreferencias({
          ...PREF_PADRAO,
          ...(configData?.preferencias ?? {}),
        });

        setHistorico(
          Array.isArray(configData?.historico)
            ? configData.historico
            : []
        );
      }
    } catch (e: any) {
      setErro(
        e?.message ||
        'Falha ao consultar o Google.'
      );
    } finally {
      setCarregando(false);
    }
  }, [eventoId, token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    let origemSupabase = '';

    try {
      const url =
        process.env
          .NEXT_PUBLIC_SUPABASE_URL;

      if (url) {
        origemSupabase =
          new URL(url).origin;
      }
    } catch {
      origemSupabase = '';
    }

    function mensagem(
      event: MessageEvent
    ) {
      if (
        origemSupabase &&
        event.origin !== origemSupabase
      ) {
        return;
      }

      const tipo =
        event.data?.type;

      if (
        typeof tipo !== 'string' ||
        !tipo.startsWith(
          'conviteia-google-auth-'
        )
      ) {
        return;
      }

      if (
        popupRef.current &&
        !popupRef.current.closed
      ) {
        popupRef.current.close();
      }

      popupRef.current = null;

      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );
        timerRef.current = null;
      }

      setConectando(false);

      if (
        tipo ===
        'conviteia-google-auth-success'
      ) {
        setErro('');

        setTimeout(() => {
          void carregar();
        }, 400);

        return;
      }

      if (
        tipo ===
        'conviteia-google-auth-cancelled'
      ) {
        setErro(
          'A conexão com o Google foi cancelada.'
        );

        return;
      }

      setErro(
        event.data?.message ||
        'Não foi possível conectar a conta Google.'
      );
    }

    window.addEventListener(
      'message',
      mensagem
    );

    return () => {
      window.removeEventListener(
        'message',
        mensagem
      );

      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );
      }
    };
  }, [carregar]);

  async function conectar() {
    setErro('');
    setConectando(true);

    const width = 560;
    const height = 720;

    const left = Math.max(
      0,
      window.screenX +
        (window.outerWidth - width) /
          2
    );

    const top = Math.max(
      0,
      window.screenY +
        (window.outerHeight - height) /
          2
    );

    const popup = window.open(
      'about:blank',
      'conviteia-google',
      [
        `width=${width}`,
        `height=${height}`,
        `left=${Math.round(left)}`,
        `top=${Math.round(top)}`,
        'resizable=yes',
        'scrollbars=yes',
      ].join(',')
    );

    if (!popup) {
      setConectando(false);
      setErro(
        'O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.'
      );
      return;
    }

    popupRef.current = popup;

    try {
      const { data, error } =
        await supabase.functions.invoke(
          'conviteia-google-auth-url',
          {
            body: {
              evento_id: eventoId,
            },
          }
        );

      if (error) {
        throw error;
      }

      if (
        !data?.auth_url ||
        typeof data.auth_url !== 'string'
      ) {
        throw new Error(
          data?.error ||
          'Não foi possível iniciar a conexão Google.'
        );
      }

      popup.location.href =
        data.auth_url;

      timerRef.current =
        setInterval(() => {
          if (
            popup.closed
          ) {
            if (timerRef.current) {
              clearInterval(
                timerRef.current
              );
              timerRef.current = null;
            }

            popupRef.current = null;
            setConectando(false);

            setTimeout(() => {
              void carregar();
            }, 500);
          }
        }, 700);
    } catch (e: any) {
      if (!popup.closed) {
        popup.close();
      }

      popupRef.current = null;
      setConectando(false);

      setErro(
        e?.message ||
        'Não foi possível iniciar a conexão Google.'
      );
    }
  }

  async function desconectar() {
    if (
      !window.confirm(
        'Desconectar esta conta Google deste convite?'
      )
    ) {
      return;
    }

    setErro('');
    setDesconectando(true);

    try {
      const acesso =
        await token();

      if (!acesso) {
        throw new Error(
          'Sua sessão expirou. Entre novamente.'
        );
      }

      const r = await fetch(
        `/api/conviteria/google?evento=${encodeURIComponent(
          eventoId
        )}`,
        {
          method: 'DELETE',
          headers: {
            Authorization:
              `Bearer ${acesso}`,
          },
        }
      );

      const d =
        await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(
          d?.erro ||
          'Não foi possível desconectar o Google.'
        );
      }

      setStatus({
        conectado: false,
        agenda: true,
      });
    } catch (e: any) {
      setErro(
        e?.message ||
        'Não foi possível desconectar o Google.'
      );
    } finally {
      setDesconectando(false);
    }
  }

  async function alternarPreferencia(
    chave: keyof Preferencias
  ) {
    const anterior = preferencias;

    const nova = {
      ...preferencias,
      [chave]: !preferencias[chave],
    };

    setPreferencias(nova);
    setSalvandoPref(chave);
    setErro('');

    try {
      const acesso =
        await token();

      if (!acesso) {
        throw new Error(
          'Sua sessão expirou. Entre novamente.'
        );
      }

      const r = await fetch(
        `/api/conviteria/google-config?evento=${encodeURIComponent(
          eventoId
        )}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${acesso}`,
          },
          body: JSON.stringify({
            preferencias: nova,
          }),
        }
      );

      const d =
        await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(
          d?.erro ||
          'Não foi possível salvar.'
        );
      }

      setTimeout(() => {
        void carregar();
      }, 350);
    } catch (e: any) {
      setPreferencias(anterior);

      setErro(
        e?.message ||
        'Não foi possível salvar as preferências.'
      );
    } finally {
      setSalvandoPref(null);
    }
  }

  function Preferencia({
    chave,
    titulo,
    descricao,
  }: {
    chave: keyof Preferencias;
    titulo: string;
    descricao: string;
  }) {
    const ativo =
      preferencias[chave];

    return (
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        disabled={
          salvandoPref !== null
        }
        onClick={() =>
          void alternarPreferencia(chave)
        }
        className="flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left disabled:opacity-60"
        style={{
          borderColor: '#c0607820',
        }}
      >
        <span className="min-w-0">
          <strong
            className="block text-xs font-semibold"
            style={{
              color: '#40232c',
            }}
          >
            {titulo}
          </strong>

          <small
            className="mt-0.5 block text-[10px] leading-4"
            style={{
              color: '#8b7079',
            }}
          >
            {descricao}
          </small>
        </span>

        <span
          className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
          style={{
            backgroundColor:
              ativo
                ? '#d86090'
                : '#ddd0d4',
          }}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all"
            style={{
              left:
                ativo
                  ? '18px'
                  : '2px',
            }}
          />

          {salvandoPref === chave && (
            <Loader2
              className="absolute -right-5 top-1 h-3 w-3 animate-spin"
              style={{
                color: '#a04a63',
              }}
            />
          )}
        </span>
      </button>
    );
  }

  return (
    <section
      className="mb-4 rounded-xl border bg-white p-3.5"
      style={{
        borderColor: '#c0607828',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white text-sm font-bold"
            style={{
              borderColor:
                '#e5d4d9',
              color: '#4285f4',
            }}
            aria-hidden="true"
          >
            G
          </span>

          <div className="min-w-0">
            <p
              className="text-sm font-semibold"
              style={{
                color: '#40232c',
              }}
            >
              Google
            </p>

            {carregando ? (
              <p
                className="mt-1 flex items-center gap-1.5 text-xs"
                style={{
                  color: '#7c5560',
                }}
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Verificando conexão…
              </p>
            ) : status.conectado ? (
              <>
                <p
                  className="mt-1 truncate text-xs"
                  style={{
                    color: '#2e7d55',
                  }}
                >
                  {status.email}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
                    style={{
                      backgroundColor:
                        status.gmail
                          ? '#eef8f2'
                          : '#fff4f4',
                      color:
                        status.gmail
                          ? '#2e7d55'
                          : '#9b3a4c',
                    }}
                  >
                    <Mail className="h-3 w-3" />
                    Gmail
                    {status.gmail ? ' ✓' : ' !'}
                  </span>

                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
                    style={{
                      backgroundColor:
                        '#eef8f2',
                      color:
                        '#2e7d55',
                    }}
                  >
                    <CalendarDays className="h-3 w-3" />
                    Agenda ✓
                  </span>
                </div>
              </>
            ) : (
              <p
                className="mt-1 max-w-md text-xs leading-5"
                style={{
                  color: '#7c5560',
                }}
              >
                Conecte a conta Google deste convite para enviar
                confirmações e lembretes pelo Gmail. Os convidados
                também poderão adicionar o evento à própria Agenda.
              </p>
            )}
          </div>
        </div>

        {status.conectado && (
          <CheckCircle2
            className="h-5 w-5 shrink-0"
            style={{
              color: '#2e7d55',
            }}
          />
        )}
      </div>

      {!carregando && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!status.conectado ? (
            <button
              type="button"
              onClick={conectar}
              disabled={conectando}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
              style={{
                backgroundColor:
                  '#d86090',
              }}
            >
              {conectando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span
                  className="text-[11px] font-bold"
                  aria-hidden="true"
                >
                  G
                </span>
              )}
              {conectando
                ? 'Conectando…'
                : 'Conectar Google'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={conectar}
                disabled={
                  conectando ||
                  desconectando
                }
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium disabled:opacity-60"
                style={{
                  borderColor:
                    '#c0607833',
                  color: '#7c5560',
                }}
              >
                {conectando ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Reconectar
              </button>

              <button
                type="button"
                onClick={desconectar}
                disabled={
                  conectando ||
                  desconectando
                }
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium disabled:opacity-60"
                style={{
                  borderColor:
                    '#e7c5cc',
                  color: '#9b3a4c',
                }}
              >
                {desconectando ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5" />
                )}
                Desconectar
              </button>
            </>
          )}
        </div>
      )}

      {!carregando && (
        <div
          className="mt-4 border-t pt-4"
          style={{
            borderColor: '#c060781c',
          }}
        >
          <div className="mb-2.5">
            <p
              className="text-xs font-semibold"
              style={{
                color: '#40232c',
              }}
            >
              Envios automáticos
            </p>

            <p
              className="mt-1 text-[10px] leading-4"
              style={{
                color: '#8b7079',
              }}
            >
              Você escolhe quais mensagens seus convidados recebem.
            </p>
          </div>

          <div className="grid gap-2">
            <Preferencia
              chave="enviarConfirmacao"
              titulo="Confirmação por e-mail"
              descricao="Envia um e-mail assim que a presença é confirmada ou atualizada."
            />

            <Preferencia
              chave="lembrete30d"
              titulo="Lembrete de 1 mês"
              descricao="Envia 30 dias antes do evento, às 9h."
            />

            <Preferencia
              chave="lembrete7d"
              titulo="Lembrete de 1 semana"
              descricao="Envia 7 dias antes do evento, às 9h."
            />

            <Preferencia
              chave="lembrete1d"
              titulo="Lembrete de 1 dia"
              descricao="Envia na véspera do evento, às 9h."
            />
          </div>
        </div>
      )}

      {!carregando && historico.length > 0 && (
        <div
          className="mt-4 border-t pt-3"
          style={{
            borderColor: '#c060781c',
          }}
        >
          <button
            type="button"
            onClick={() =>
              setHistoricoAberto((v) => !v)
            }
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold"
              style={{
                color: '#6f4e58',
              }}
            >
              <Clock3 className="h-3.5 w-3.5" />
              Histórico de envios
            </span>

            {historicoAberto ? (
              <ChevronUp
                className="h-3.5 w-3.5"
                style={{
                  color: '#9b7b84',
                }}
              />
            ) : (
              <ChevronDown
                className="h-3.5 w-3.5"
                style={{
                  color: '#9b7b84',
                }}
              />
            )}
          </button>

          {historicoAberto && (
            <ul className="mt-3 space-y-2">
              {historico.map((h) => {
                const enviado =
                  h.status === 'enviado';

                const agendado =
                  h.status === 'agendado';

                return (
                  <li
                    key={h.id}
                    className="rounded-xl border px-3 py-2.5"
                    style={{
                      borderColor:
                        '#c060781c',
                      background:
                        '#fffafb',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="truncate text-[11px] font-semibold"
                          style={{
                            color:
                              '#40232c',
                          }}
                        >
                          {ROTULO_TIPO[h.tipo] ?? h.tipo}
                        </p>

                        {h.email && (
                          <p
                            className="mt-0.5 truncate text-[10px]"
                            style={{
                              color:
                                '#8b7079',
                            }}
                          >
                            {h.email}
                          </p>
                        )}
                      </div>

                      <span
                        className="shrink-0 rounded-full px-2 py-1 text-[9px] font-bold"
                        style={{
                          backgroundColor:
                            enviado
                              ? '#eef8f2'
                              : agendado
                                ? '#fff7e8'
                                : '#fff1f3',
                          color:
                            enviado
                              ? '#2e7d55'
                              : agendado
                                ? '#8b6518'
                                : '#9b3a4c',
                        }}
                      >
                        {enviado
                          ? 'Enviado'
                          : agendado
                            ? 'Agendado'
                            : h.status === 'ignorado'
                              ? 'Desativado'
                              : h.status === 'processando'
                                ? 'Enviando'
                                : 'Pendente'}
                      </span>
                    </div>

                    <p
                      className="mt-1.5 flex items-center gap-1 text-[9px]"
                      style={{
                        color:
                          '#9b7b84',
                      }}
                    >
                      {enviado ? (
                        <MailCheck className="h-3 w-3" />
                      ) : (
                        <Clock3 className="h-3 w-3" />
                      )}

                      {enviado
                        ? dataCurta(h.enviadoEm)
                        : agendado
                          ? `Previsto: ${dataCurta(h.agendadoPara)}`
                          : dataCurta(h.criadoEm)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {erro && (
        <p className="mt-3 text-xs text-red-700">
          {erro}
        </p>
      )}
    </section>
  );
}
