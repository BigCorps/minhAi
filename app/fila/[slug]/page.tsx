'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import PainelFilaDisplay from '@/components/VoiceAssistant/modals/FilaAtendimentoDisplay/PainelFilaDisplay';
import SlugFooter from '@/components/slug/SlugFooter';
import SlugHeaderWrapper from '@/app/ia/[slug]/SlugHeaderWrapper';

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug);
    }
    void unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    let active = true;
    async function fetchCompany() {
      try {
        const response = await fetch(`/api/public/company?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        const data = payload?.company;

        if (!response.ok || !data?.id) {
          console.error('Empresa pública não encontrada:', payload?.error || response.status);
          router.push('/');
          return;
        }

        if (!active) return;
        setCompanyId(data.id);
        setCompanyData(data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar empresa pública:', error);
        router.push('/');
      }
    }

    void fetchCompany();
    return () => { active = false; };
  }, [slug, router]);

  const handlePlayText = async (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const theme = mounted ? (resolvedTheme as 'dark' | 'light' || 'dark') : 'dark';

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
          }`} />
          <div className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Carregando...
          </div>
        </div>
      </div>
    );
  }

  if (!companyId) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <SlugHeaderWrapper
          company={{
            id: companyId,
            name: companyData?.name,
            logo_url: companyData?.logo_url,
            assistant_role: companyData?.assistant_role,
            webapp_enabled: companyData?.webapp_enabled,
            webapp_home: companyData?.webapp_home ?? null,
            website: companyData?.website ?? null,
            modo_vendas_enabled: companyData?.modo_vendas_enabled,
            modo_fila_enabled: companyData?.modo_fila_enabled,
            modo_links_enabled: companyData?.modo_links_enabled,
          }}
          slug={slug}
          pageType="fila"
          overlayMode={false}
        />
      </div>

      <div className="flex-1 overflow-hidden pb-8">
        <PainelFilaDisplay
          companyId={companyId}
          theme={theme}
          playText={handlePlayText}
        />
      </div>

      <div className="flex-shrink-0">
        <SlugFooter
          theme={theme}
          slug={slug}
          webapp_enabled={companyData?.webapp_enabled}
        />
      </div>
    </div>
  );
}
