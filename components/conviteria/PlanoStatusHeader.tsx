'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import PlanoMensalCard from '@/components/conviteria/PlanoMensalCard';

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
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fff9fb] shadow-2xl sm:max-w-lg sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-[#fff9fb]/95 px-5 py-4 backdrop-blur sm:px-6" style={{ borderColor: '#c0607822' }}>
              <div>
                <p id="conviteia-planos-titulo" className="text-lg font-semibold" style={{ color: '#40232c' }}>
                  Planos ConviteIA
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: '#7c5560' }}>
                  Veja seu plano atual ou assine o mensal sem sair do painel.
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

            <div className="p-4 pb-2 sm:p-6 sm:pb-2">
              <PlanoMensalCard />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
