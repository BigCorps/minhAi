'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Images, MessageCircle, Plus, Ticket, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import PlanoMensalCard from '@/components/conviteria/PlanoMensalCard';
import { PLANOS, brl } from '@/lib/conviteria/precos';
import { MEMORIAS_PRECO_CENTAVOS } from '@/lib/conviteria/memorias-config';

const WHATSAPP_EVENTO_PRECO_CENTAVOS = 1990;

export default function PlanoStatusHeader() {
  const [dados, setDados] = useState<{
    ativo?: boolean;
    diasRestantes?: number;
  } | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const sb = createClient();
      const sessao = (await sb.auth.getSession()).data.session;
      if (!sessao?.access_token) return;

      const r = await fetch('/api/conviteria/plano', {
        headers: { Authorization: `Bearer ${sessao.access_token}` },
      });

      if (!r.ok) return;
      const d = await r.json();
      setDados(d);
    } catch {
      // O botão continua utilizável como "Planos" mesmo se o status falhar.
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!modalAberto) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function aoTeclado(event: KeyboardEvent) {
      if (event.key === 'Escape') setModalAberto(false);
    }

    window.addEventListener('keydown', aoTeclado);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', aoTeclado);
    };
  }, [modalAberto]);

  const ativo = Boolean(dados?.ativo);
  const dias = Math.max(0, Number(dados?.diasRestantes ?? 0));
  const avulso = PLANOS.find((p) => p.id === 'avulso')!;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium"
        style={{ borderColor: '#c0607844', color: '#7c5560', backgroundColor: '#fff' }}
        title={ativo ? `Plano mensal ativo — ${dias} dias restantes` : 'Ver planos'}
        aria-haspopup="dialog"
        aria-expanded={modalAberto}
      >
        <CalendarClock className="h-4 w-4" />
        <span>{ativo ? `${dias} dia${dias === 1 ? '' : 's'}` : 'Planos'}</span>
      </button>

      {modalAberto && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalAberto(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="conviteia-planos-titulo"
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fff9fb] shadow-2xl sm:max-w-xl sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-[#fff9fb]/95 px-5 py-4 backdrop-blur sm:px-6" style={{ borderColor: '#c0607822' }}>
              <div>
                <p id="conviteia-planos-titulo" className="text-lg font-semibold" style={{ color: '#40232c' }}>
                  Planos ConviteIA
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: '#7c5560' }}>
                  Escolha entre convite avulso ou plano mensal e conheça os adicionais disponíveis para cada evento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-white transition hover:bg-[#fff4f7]"
                style={{ borderColor: '#c0607833', color: '#7c5560' }}
                aria-label="Fechar planos"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4 pb-6 sm:p-6">
              <section className="rounded-2xl border bg-white p-5" style={{ borderColor: '#c0607833' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold" style={{ color: '#40232c' }}>
                      <Ticket className="h-5 w-5" style={{ color: '#c06078' }} /> Convite avulso
                    </div>
                    <p className="mt-1 text-sm leading-5" style={{ color: '#7c5560' }}>
                      Pagamento único. O convite publicado fica no ar para sempre.
                    </p>
                    {ativo && (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        Com seu plano mensal ativo, novos convites ficam incluídos enquanto o plano estiver válido.
                      </p>
                    )}
                  </div>
                  <strong className="whitespace-nowrap" style={{ color: '#a04a63' }}>{brl(avulso.centavos)}</strong>
                </div>
                <Link
                  href="/convite/criar"
                  onClick={() => setModalAberto(false)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#c06078] px-5 py-3 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" /> Criar novo convite
                </Link>
              </section>

              <PlanoMensalCard />

              <section className="rounded-2xl border bg-white p-5" style={{ borderColor: '#c0607833' }}>
                <div>
                  <p className="font-semibold" style={{ color: '#40232c' }}>Adicionais por evento</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: '#7c5560' }}>
                    Você pode incluir na publicação ou ativar depois pela Gestão do Evento.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-[#fff9fb] p-4" style={{ borderColor: '#c0607828' }}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#a04a63]"><Images className="h-4 w-4" /></span>
                      <strong className="whitespace-nowrap text-sm text-[#a04a63]">+ {brl(MEMORIAS_PRECO_CENTAVOS)}</strong>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#40232c]">Memórias do Evento</p>
                    <p className="mt-1 text-xs leading-5 text-[#7c5560]">Fotos e vídeos dos convidados por QR Code, álbum e Modo Festa.</p>
                  </div>

                  <div className="rounded-2xl border bg-[#fff9fb] p-4" style={{ borderColor: '#c0607828' }}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#a04a63]"><MessageCircle className="h-4 w-4" /></span>
                      <strong className="whitespace-nowrap text-sm text-[#a04a63]">+ {brl(WHATSAPP_EVENTO_PRECO_CENTAVOS)}</strong>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#40232c]">WhatsApp do Evento</p>
                    <p className="mt-1 text-xs leading-5 text-[#7c5560]">Até 600 mensagens, com primeira comunicação e lembrete para confirmação de presença.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
