'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase-browser';
import SaleModeModal from '@/components/VoiceAssistant/modals/SaleModeModal';
import SlugFooter from '@/components/slug/SlugFooter';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAudioPlayer } from '@/components/VoiceAssistant/hooks/useAudioPlayer';
import { requestMicrophonePermission } from '@/components/VoiceAssistant/utils/audioUtils';
import { useInactivityDetector } from '@/hooks/useInactivityDetector';
import { getContextualRoute } from '@/lib/routing-utils';
import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import { ActionModals } from '@/components/VoiceAssistant/ActionModals';
import type { ActiveModal } from '@/components/VoiceAssistant/types';
import { FeatureHighlightModal } from '@/components/VoiceAssistant/FeatureHighlightModal';

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
  const [produtoInicial, setProdutoInicial] = useState<any>(null);
  const [quantidadeInicial, setQuantidadeInicial] = useState<number>(1);
  const [opcoesIniciais, setOpcoesIniciais] = useState<any[]>([]);

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [vendaActiveModal, setVendaActiveModal] = useState<ActiveModal | null>(null);

  const voiceRecorder = useVoiceRecorder();
  const { currentAudioRef, playText } = useAudioPlayer(setIsPlayingAudio, companyData?.tts_voice);
  const companyIdRef = useRef<string | null>(null);

  const textMessageHandlerRef = useRef<
    ((text: string) => Promise<{ text: string; functionKey?: string } | null>) | null
  >(null);

  useEffect(() => {
    setMounted(true);
    requestMicrophonePermission().then((result) => {
      setPermissionGranted(result.granted);
    });
  }, []);

  const onInactivityVendas = useCallback(() => {
    const action = companyData?.inactivity_action ?? 'restart';
    if (action === 'offers_panel') {
      setVendaActiveModal({ type: 'PainelOfertasDisplay', data: { companyId } });
    } else if (action === 'feature_highlight') {
      window.dispatchEvent(new CustomEvent('eai:triggerInactivity'));
    } else if (slug) {
      router.push(getContextualRoute('ia', slug));
    }
  }, [companyData?.inactivity_action, companyId, slug, router]);

  useInactivityDetector({
    timeoutSeconds: companyData?.inactivity_timeout_seconds ?? 300,
    onInactivity: onInactivityVendas,
  });

  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug);
    }
    void unwrapParams();
  }, [params]);

  // IMPORTANTE: página pública nunca mais lê a linha administrativa inteira
  // de public.companies. A API server-side devolve somente campos públicos.
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
        companyIdRef.current = data.id;
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

  useEffect(() => {
    if (!companyId || typeof window === 'undefined') return;

    const search = new URLSearchParams(window.location.search);
    const produtoId = search.get('produto');
    const quantidade = search.get('quantidade');
    const opcoesJson = search.get('opcoes');

    if (!produtoId) return;

    async function fetchProduto() {
      const supabase = createClient();
      const { data: produto, error } = await supabase
        .from('produtos_venda')
        .select('*')
        .eq('id', produtoId)
        .eq('company_id', companyId)
        .single();

      if (error || !produto) {
        console.error('Produto não encontrado:', error);
        return;
      }

      setProdutoInicial(produto);
      setQuantidadeInicial(quantidade ? parseInt(quantidade) : 1);

      if (opcoesJson) {
        try {
          setOpcoesIniciais(JSON.parse(opcoesJson));
        } catch (e) {
          console.error('Erro ao parsear opções:', e);
        }
      }

      window.history.replaceState({}, '', window.location.pathname);
    }

    void fetchProduto();
  }, [companyId]);

  useEffect(() => {
    if (!companyId || typeof window === 'undefined') return;

    const search = new URLSearchParams(window.location.search);
    const itensJson = search.get('itens');
    if (!itensJson) return;

    async function buscarItens() {
      try {
        const itensBrutos = JSON.parse(itensJson);
        const { buscarProdutoPorNome } = await import('@/lib/produtos-venda');
        const itensResolvidos: { produto: any; quantidade: number }[] = [];

        for (const item of itensBrutos) {
          const produtos = await buscarProdutoPorNome(companyId, item.nome);
          if (produtos.length > 0) {
            itensResolvidos.push({ produto: produtos[0], quantidade: item.quantidade });
          }
        }

        if (itensResolvidos.length > 0) {
          setProdutoInicial(itensResolvidos[0].produto);
          setQuantidadeInicial(itensResolvidos[0].quantidade);
        }

        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.error('Erro ao buscar itens:', e);
      }
    }

    void buscarItens();
  }, [companyId]);

  const handleMicDown = useCallback(async () => {
    if (isPlayingAudio) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
        setIsPlayingAudio(false);
      }
      return;
    }
    if (!permissionGranted || isProcessing || isTranscribing) return;

    setIsListening(true);
    await voiceRecorder.startRecording();
  }, [isPlayingAudio, permissionGranted, isProcessing, isTranscribing, voiceRecorder, currentAudioRef]);

  const handleMicUp = useCallback(async () => {
    if (!voiceRecorder.isRecording) return;
    setIsListening(false);

    try {
      const audioBlob = await voiceRecorder.stopRecording();
      setIsTranscribing(true);

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      });

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) throw new Error('Erro na transcrição');
      const { text } = await response.json();
      if (text?.trim()) await handleTextMessage(text.trim());
    } catch {
      // silencioso
    } finally {
      setIsTranscribing(false);
    }
  }, [voiceRecorder]);

  const handleTextMessage = useCallback(async (message: string) => {
    if (!message.trim() || !textMessageHandlerRef.current) return;

    setIsProcessing(true);
    try {
      const result = await textMessageHandlerRef.current(message);
      if (result?.text) await playText(result.text);
    } catch {
      // silencioso
    } finally {
      setIsProcessing(false);
    }
  }, [playText]);

  const handleClose = () => {
    if (slug) router.push(getContextualRoute('ia', slug));
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
    <div className="relative min-h-screen">
      <div className="hidden">
        <VoiceAssistantWithWakeWord
          companyId={companyId}
          companyName={companyData?.name ?? ''}
          slug={slug}
          wakeWord={companyData?.wake_word ?? ''}
          greetingMessage={companyData?.greeting_message ?? ''}
          theme={theme}
          isMaximized={false}
          textMode={true}
          onTextMessage={(handler) => {
            textMessageHandlerRef.current = handler;
          }}
          onModalChange={(modal) => setVendaActiveModal(modal)}
        />
      </div>

      <ActionModals
        activeModal={vendaActiveModal}
        onClose={() => setVendaActiveModal(null)}
        theme={theme}
        playText={playText}
      />

      {vendaActiveModal?.type === 'FeatureHighlightModal' && (
        <FeatureHighlightModal
          isOpen={true}
          onClose={() => setVendaActiveModal(null)}
          featureName={vendaActiveModal.data.featureName}
          featureDescription={vendaActiveModal.data.featureDescription}
          featureCategory={vendaActiveModal.data.featureCategory}
          theme={theme}
        />
      )}

      <div className={`fixed inset-x-0 top-0 bottom-8 z-[50] ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <SaleModeModal
          companyId={companyId}
          slug={slug}
          companyName={companyData?.name}
          companyLogo={companyData?.logo_url}
          assistantRole={companyData?.assistant_role}
          webapp_home={companyData?.webapp_home ?? null}
          website={companyData?.website ?? null}
          avatarType={companyData?.assistant_avatar_type}
          modo_vendas_enabled={companyData?.modo_vendas_enabled ?? true}
          modo_fila_enabled={companyData?.modo_fila_enabled ?? false}
          modo_links_enabled={companyData?.modo_links_enabled ?? false}
          isFullscreen={true}
          footerHeight={32}
          onClose={handleClose}
          theme={theme}
          playText={playText}
          produtoInicial={produtoInicial}
          quantidadeInicial={quantidadeInicial}
          opcoesIniciais={opcoesIniciais}
          isListening={isListening}
          isProcessing={isProcessing}
          isPlayingAudio={isPlayingAudio}
          isTranscribing={isTranscribing}
          onMicDown={handleMicDown}
          onMicUp={handleMicUp}
          onTextMessage={handleTextMessage}
        />
      </div>

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
