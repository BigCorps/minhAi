'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import SaleModeModal from '@/components/VoiceAssistant/modals/SaleModeModal';

interface VendasPageProps {
  params: Promise<{ slug: string }>;
}

export default function VendasPage({ params }: VendasPageProps) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Await params (Next.js 15 requirement)
  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug);
    }
    unwrapParams();
  }, [params]);

  // Buscar dados completos da company pelo slug
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

  // Função para fechar e voltar ao assistente
  const handleClose = () => {
    if (slug) {
      router.push(`/ia/${slug}`);
    }
  };

  // TTS placeholder (você pode integrar com Web Speech API se quiser)
  const handlePlayText = async (text: string) => {
    console.log('TTS:', text);
    // Opcional: implementar TTS aqui
    // if ('speechSynthesis' in window) {
    //   const utterance = new SpeechSynthesisUtterance(text);
    //   utterance.lang = 'pt-BR';
    //   window.speechSynthesis.speak(utterance);
    // }
  };

  // Loading state
  if (loading || !slug) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg">Carregando...</div>
        </div>
      </div>
    );
  }

  // Se não encontrou companyId
  if (!companyId) {
    return null;
  }

  // Renderiza o modal em fullscreen
  return (
    <div className="min-h-screen bg-slate-900">
      <SaleModeModal
        data={{ 
          companyId,
          company: companyData
        }}
        isFullscreen={true}
        onClose={handleClose}
        theme="dark"
        playText={handlePlayText}
      />
    </div>
  );
}
