'use client';

import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[platform-admin] Erro de renderização:', error);
  }, [error]);

  const goHome = () => {
    const path =
      window.location.hostname.toLowerCase() === 'admin.minhai.app'
        ? '/'
        : '/admin';

    window.location.assign(path);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center justify-center">
        <section className="w-full rounded-3xl border border-amber-400/20 bg-white/[0.04] p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
                Admin minhAi
              </p>
              <h1 className="text-xl font-black">Não foi possível abrir esta tela</h1>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-400">
            Nenhum detalhe interno do erro é exibido no navegador. Você pode
            tentar novamente ou voltar para o painel.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>

            <button
              type="button"
              onClick={goHome}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300"
            >
              <ShieldCheck className="h-4 w-4" />
              Voltar ao Admin
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
