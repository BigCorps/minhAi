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
import { usePresenceDetector } from '@/hooks/usePresenceDetector';
import { useInactivityDetector } from '@/hooks/useInactivityDetector';

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

  // ── Estados de voz ────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const voiceRecorder = useVoiceRecorder();
  const { currentAudioRef, playText } = useAudioPlayer(setIsPlayingAudio);
  const companyIdRef = useRef<string | null>(null);

  // ── Mounted + permissão de microfone ──────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    requestMicrophonePermission().then((result) => {
      setPermissionGranted(result.granted);
    });
  }, []);

  // ── Detector de presença (modo vendas) ────────────────────────────────────
  // Ativado apenas se presence_greeting_enabled = true no dashboard.
  // Usa câmera frontal em background — não interfere com câmera do PDV.
  const onPresenceDetected = useCallback(() => {
    if (isPlayingAudio || isProcessing) return;
    const greeting = companyData?.greeting_message || 'Olá! Como posso ajudar você?';
    playText(greeting).catch(() => {});
  }, [isPlayingAudio, isProcessing, companyData?.greeting_message, playText]);

  usePresenceDetector({
    enabled: companyData?.presence_greeting_enabled ?? false,
    onPresenceDetected,
  });

  const onInactivityVendas = useCallback(() => {
  // No modo vendas, inatividade = voltar para o assistente
  if (slug) router.push(`/ia/${slug}`);
}, [slug, router]);

useInactivityDetector({
  timeoutSeconds: companyData?.inactivity_timeout_seconds ?? 300,
  onInactivity: onInactivityVendas,
});

  // ── Await params ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug);
    }
    unwrapParams();
  }, [params]);

  // ── Fetch company data ────────────────────────────────────────────────────
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
      companyIdRef.current = data.id;
      setCompanyData(data);
      setLoading(false);
    }

    fetchCompany();
  }, [slug, router]);

  // ── Detectar produto inicial via query params ─────────────────────────────
  useEffect(() => {
    if (!companyId || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const produtoId = params.get('produto');
    const quantidade = params.get('quantidade');
    const opcoesJson = params.get('opcoes');

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

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    fetchProduto();
  }, [companyId]);

  // ── Detectar múltiplos itens via query param (fazer_pedido) ──────────────
  useEffect(() => {
    if (!companyId || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const itensJson = params.get('itens');

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

        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      } catch (e) {
        console.error('Erro ao buscar itens:', e);
      }
    }

    buscarItens();
  }, [companyId]);

  // ── Handlers de microfone ─────────────────────────────────────────────────
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

  // ── handleTextMessage ─────────────────────────────────────────────────────
  const handleTextMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    const cId = companyIdRef.current;
    if (!cId) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', new Blob([message], { type: 'text/plain' }), 'question.txt');
      formData.append('companyId', cId);
      formData.append('directQuestion', message);
      formData.append('saleMode', 'true');

      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erro no processamento');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setIsPlayingAudio(true);

      audio.onended = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
      };
      audio.play().catch(() => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
      });
    } catch {
      // silencioso
    } finally {
      setIsProcessing(false);
    }
  }, [currentAudioRef]);

  const handleClose = () => {
    if (slug) router.push(`/ia/${slug}`);
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
      {/* SaleModeModal fullscreen — bottom-8 = altura do SlugFooter (h-8 = 32px) */}
      <div className={`fixed inset-x-0 top-0 bottom-8 z-[50] ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <SaleModeModal
          companyId={companyId}
          slug={slug}
          companyName={companyData?.name}
          companyLogo={companyData?.logo_url}
          assistantRole={companyData?.assistant_role}
          avatarType={companyData?.assistant_avatar_type}
          modo_vendas_enabled={companyData?.modo_vendas_enabled ?? true}
          modo_fila_enabled={companyData?.modo_fila_enabled ?? false}
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

      {/* SlugFooter — fica acima do modal */}
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
