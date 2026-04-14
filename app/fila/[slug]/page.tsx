'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase-browser';
import PainelFilaDisplay from '@/components/VoiceAssistant/modals/FilaAtendimentoDisplay/PainelFilaDisplay';
import SlugFooter from '@/components/slug/SlugFooter';
import SlugHeader from '@/components/slug/SlugHeader';

interface FilaPageProps {
  params: Promise<{ slug: string }>;
}

export default function FilaPage({ params }: FilaPageProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Await params
  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug);
    }
    unwrapParams();
  }, [params]);

  // Fetch company data
  useEffect(() => {
    if (!slug) return;

    async function fetchCompany() {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        console.error('Empresa não encontrada:', error);
        router.push('/');
        return;
      }

      setCompanyId(data.id);
      setCompanyData(data);
      setLoading(false);
    }

    fetchCompany();
  }, [slug, router]);

  const handlePlayText = async (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Tema resolvido
  const theme = mounted ? (resolvedTheme as 'dark' | 'light' || 'dark') : 'dark';

  // Loading state
  if (loading || !slug || !mounted) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className={`w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4 ${
            theme === 'dark' 
              ? 'border-blue-500/30 border-t-blue-500' 
              : 'border-blue-600/30 border-t-blue-600'
          }`}></div>
          <div className={`text-lg ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Carregando...
          </div>
        </div>
      </div>
    );
  }

  if (!companyId) {
    return null;
  }

  return (
    <div className="relative min-h-screen">
      {/* Painel Fila - z-[50] */}
      <div className={`fixed inset-0 z-[50] ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        {/* SlugHeader */}
        <SlugHeader
          company={{
            id: companyId,
            name: companyData?.name,
            logo_url: companyData?.logo_url,
            assistant_role: companyData?.assistant_role,
            webapp_enabled: companyData?.webapp_enabled,
            modo_vendas_enabled: companyData?.modo_vendas_enabled,
            modo_fila_enabled: companyData?.modo_fila_enabled,
          }}
          slug={slug}
          pageType="fila"
          theme={theme}
          overlayMode={false}
          isKioskMode={false}
          isWakeLockActive={false}
          isWakeLockSupported={false}
          isPortrait={false}
          showControls={false}
          onEnterKioskMode={() => {}}
          onToggleWakeLock={() => {}}
          onToggleModoVenda={() => {}}
          onToggleTheme={() => {}}
          onClose={undefined}
        />

        {/* Painel */}
        <PainelFilaDisplay
          companyId={companyId}
          theme={theme}
          playText={handlePlayText}
        />
      </div>

      {/* SlugFooter - z-[310] */}
      <div className="fixed bottom-0 left-0 right-0 z-[310]">
        <SlugFooter
          theme={theme}
          slug={slug}
          webapp_enabled={companyData?.webapp_enabled}
        />
      </div>
    </div>
  );
}
