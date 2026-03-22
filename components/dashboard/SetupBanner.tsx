'use client';

// components/dashboard/SetupBanner.tsx
// Banner verde fino que abre o SetupAssistantChat direto do dashboard.
// É um Client Component para poder gerenciar o state do modal.

import { useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import SetupAssistantChat from './SetupAssistantChat';
import { usePlayText } from '@/hooks/usePlayText';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

interface SetupBannerProps {
  theme?: 'dark' | 'light';
}

export default function SetupBanner({ theme = 'light' }: SetupBannerProps) {
  const router = useRouter();
  const { playText } = usePlayText();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState<{
    companyId: string;
    companyName: string;
    slug: string;
  } | null>(null);

  if (dismissed) return null;

  const handleClick = async () => {
    // Redirecionar para a página de criação onde o bot é integrado
    router.push('/dashboard/assistentes/create');
  };

  return (
    <>
      {/* Banner */}
      <div className="relative flex items-center justify-between gap-4 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 overflow-hidden">
        {/* Brilho decorativo */}
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />

        {/* Conteúdo */}
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles className="w-4 h-4 flex-shrink-0 opacity-90" />
          <p className="text-sm font-medium truncate">
            <span className="font-bold">Novo!</span>{' '}
            Configure seu assistente por conversa — diga o ramo e a IA recomenda as melhores funções para você.
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleClick}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition whitespace-nowrap"
          >
            {loading ? 'Criando...' : 'Criar agora'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded transition"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal do setup (caso seja aberto sem criar novo assistente) */}
      {showSetup && setupData && (
        <SetupAssistantChat
          companyId={setupData.companyId}
          companyName={setupData.companyName}
          slug={setupData.slug}
          theme={theme}
          playText={playText}
          onClose={() => {
            setShowSetup(false);
            router.refresh();
          }}
          onConcluido={() => {
            setShowSetup(false);
            router.push('/dashboard/assistentes');
            router.refresh();
          }}
        />
      )}
    </>
  );
}
