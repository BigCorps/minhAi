'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase-browser';
import SaleModeModal from '@/components/VoiceAssistant/modals/SaleModeModal';
import SlugFooter from '@/components/slug/SlugFooter';
import CategoryCarousel from '@/components/assistant/CategoryCarousel';

interface VendasPageProps {
  params: Promise<{ slug: string }>;
}

export default function VendasPage({ params }: VendasPageProps) {
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

  const handleClose = () => {
    if (slug) {
      router.push(`/ia/${slug}`);
    }
  };

  const handlePlayText = async (text: string) => {
    console.log('TTS:', text);
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
      {/* Modal - z-[50] para ficar abaixo do carousel */}
      <div className={`fixed inset-0 z-[50] ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <SaleModeModal
          companyId={companyId}
          slug={slug}
          companyName={companyData?.name}
          companyLogo={companyData?.logo_url}
          assistantRole={companyData?.assistant_role}
          modo_vendas_enabled={companyData?.modo_vendas_enabled ?? true}
          modo_fila_enabled={companyData?.modo_fila_enabled ?? false}
          isFullscreen={true}
          onClose={handleClose}
          theme={theme}
          playText={handlePlayText}
        />
      </div>

      {/* CategoryCarousel - z-[300] para ficar acima de tudo */}
      <div className="fixed bottom-8 left-0 right-0 z-[300] pointer-events-none">
        <div className="pointer-events-auto">
          <CategoryCarousel
            companyId={companyId}
            onFunctionClick={(functionKey) => {
              window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
                detail: { functionKey }
              }));
            }}
            theme={theme}
            hideDisabledFunctions={companyData?.hide_disabled_functions_carousel}
            autoScroll={companyData?.carousel_auto_scroll}
          />
        </div>
      </div>

      {/* SlugFooter - z-[310] para ficar no topo */}
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
