'use client';

// components/dashboard/SetupBanner.tsx

import { useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SetupBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 overflow-hidden">
      {/* Brilho decorativo */}
      <div className="absolute inset-0 bg-white/5 pointer-events-none" />

      {/* Texto */}
      <div className="flex items-start sm:items-center gap-3 pr-6 sm:pr-0">
        <Sparkles className="w-4 h-4 flex-shrink-0 opacity-90 mt-0.5 sm:mt-0" />
        <p className="text-sm font-medium leading-snug">
          <span className="font-bold">Novo!</span>{' '}
          Configure seu assistente por conversa — diga o ramo e a IA recomenda as melhores funções para você.
        </p>
      </div>

      {/* Botão */}
      <div className="flex items-center gap-2 ml-7 sm:ml-0 sm:flex-shrink-0">
        <button
          onClick={() => router.push('/dashboard/assistentes/create')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition whitespace-nowrap"
        >
          Criar agora
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fechar */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded transition"
        title="Fechar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
