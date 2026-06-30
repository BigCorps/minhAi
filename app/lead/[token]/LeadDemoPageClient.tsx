'use client';

// app/lead/[token]/LeadDemoPageClient.tsx — v4
//
// Áudio: usa /api/google-tts (com cache Supabase) em vez de speechSynthesis.
// Estratégia: pré-busca os 3 audios no background ao montar a página.
// Quando o usuário clica, o blob já está pronto → audio.play() dentro
// do gesto → funciona no iOS Safari sem bloqueio de autoplay.
// Fallback: speechSynthesis se a pré-busca ainda não terminou ou falhou.
//
// CORREÇÃO: trocado AvatarFace (componente do assistente real,
// controlado externamente por isSpeaking/isListening/isProcessing,
// sem ciclo de animação próprio — ficava travado em avatarType="orb"
// fixo) por LandingAvatarFace com avatarOnly, que já tem o ciclo
// autônomo rosto↔orbe (5s/4s) embutido, sem precisar de nenhum
// estado externo alimentando a animação.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter }   from 'next/navigation';
import { useTheme }    from 'next-themes';

import { LeadDemoAssistant, type LeadDemoMessage } from '@/components/LeadDemo/LeadDemoAssistant';
import { LeadDemoHeader }        from '@/components/LeadDemo/LeadDemoHeader';
import { LeadDemoCarrosselMock } from '@/components/LeadDemo/LeadDemoCarrosselMock';
import {
  LeadDemoTourOverlay,
  getTourScript,
  type TourType,
} from '@/components/LeadDemo/LeadDemoTourOverlay';
import { LandingAvatarFace } from '@/components/landing/LandingAvatarFace';
import {
  LeadMockCheckoutModal,
  type ObjetivoInfo,
} from '@/components/LeadDemo/LeadMockCheckoutModal';

// ── Tipos ────────────────────────────────────────────────────────

interface TourState { active: boolean; type: TourType | null }

interface LeadDemoPageClientProps {
  token:            string;
  ramo:             string;
  nomeNegocio:      string;
  produto:          string;
  preco:            number;
  nomeLead:         string | null;
  objetivoCumprido: boolean;
  context:          Array<{ role: 'user' | 'assistant'; content: string }>;
  temEmail:         boolean;
  temPhone:         boolean;
}

const TOUR_TYPES: TourType[] = ['carrossel', 'assistente', 'modos'];

// ── Componente ───────────────────────────────────────────────────

export default function LeadDemoPageClient({
  token, ramo, nomeNegocio, produto, preco,
  nomeLead:         nomeLeadInicial,
  objetivoCumprido: objetivoCumpridoInicial,
  context,
}: LeadDemoPageClientProps) {
  const router            = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark            = resolvedTheme !== 'light';

  // ── Estado ───────────────────────────────────────────────────

  const [objetivoCumprido, setObjetivoCumprido] = useState(objetivoCumpridoInicial);
  const [objetivoInfo, setObjetivoInfo]         = useState<ObjetivoInfo | null>(null);
  const [nomeLead, setNomeLead]                 = useState<string | null>(nomeLeadInicial);
  const [showMockModal, setShowMockModal]       = useState(false);
  const [hasMessages, setHasMessages]           = useState(context.length > 0);
  const [tourState, setTourState]               = useState<TourState>({ active: false, type: null });

  // ── Refs de áudio ────────────────────────────────────────────

  /** Blob URLs pré-buscados para cada tipo de tour (Google TTS com cache) */
  const tourAudiosRef   = useRef<Map<TourType, string>>(new Map());
  /** Áudio em reprodução no momento */
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Pré-busca dos áudios no background ───────────────────────
  // Disparado uma vez ao montar a página, sem bloquear a UI.
  // Quando o usuário clicar, o blob já está disponível → play()
  // dentro do gesto → iOS Safari autoriza sem prompt.

  useEffect(() => {
    let cancelled = false;

    const prefetch = async () => {
      await Promise.allSettled(
        TOUR_TYPES.map(async (type) => {
          try {
            const script = getTourScript(type);
            const res = await fetch('/api/google-tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              // Usa a voz padrão do servidor (NEURAL_MALE PT-BR)
              // e velocidade ligeiramente mais lenta para narração educativa
              body: JSON.stringify({ text: script.audioText, speed: 1.1 }),
            });
            if (!res.ok || cancelled) return;
            const blob = await res.blob();
            if (cancelled) return;
            // Revoga URL anterior se existir (re-fetch improvável mas seguro)
            const existing = tourAudiosRef.current.get(type);
            if (existing) URL.revokeObjectURL(existing);
            tourAudiosRef.current.set(type, URL.createObjectURL(blob));
            console.log(`[TourAudio] pré-busca ok — ${type}`);
          } catch {
            console.warn(`[TourAudio] pré-busca falhou — ${type} (fallback: speechSynthesis)`);
          }
        })
      );
    };

    prefetch();

    return () => {
      cancelled = true;
      // Para qualquer áudio em reprodução
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      // Libera blob URLs
      tourAudiosRef.current.forEach(url => URL.revokeObjectURL(url));
      tourAudiosRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── startTourAudio — chamado DENTRO do gesto de clique ───────
  // 1ª opção: blob URL pré-buscado do Google TTS (melhor qualidade + cache)
  // Fallback: window.speechSynthesis (se pré-busca ainda não terminou)

  const startTourAudio = useCallback((type: TourType) => {
    // Para áudio anterior
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    const blobUrl = tourAudiosRef.current.get(type);

    if (blobUrl) {
      // ✅ Google TTS pré-buscado — play dentro do gesto = iOS OK
      const audio = new Audio(blobUrl);
      audio.play().catch(err => {
        console.warn('[TourAudio] play() bloqueado:', err);
      });
      currentAudioRef.current = audio;

    } else {
      // ⚠️ Fallback: speechSynthesis (pré-busca ainda em andamento ou falhou)
      if (!('speechSynthesis' in window)) return;
      const script = getTourScript(type);
      const utter  = new SpeechSynthesisUtterance(script.audioText);
      utter.lang   = 'pt-BR';
      utter.rate   = 1.05;
      // Tenta voz Google se disponível no browser
      const voices  = window.speechSynthesis.getVoices();
      const ptVoice =
        voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google')) ??
        voices.find(v => v.lang === 'pt-BR') ??
        voices.find(v => v.lang.startsWith('pt'));
      if (ptVoice) utter.voice = ptVoice;
      window.speechSynthesis.speak(utter);
    }
  }, []); // refs são estáveis

  const stopTourAudio = useCallback(() => {
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    window.speechSynthesis?.cancel();
  }, []);

  // ── Handlers originais ───────────────────────────────────────

  const handleObjetivoCumprido = useCallback((info: ObjetivoInfo) => {
    setObjetivoInfo(info); setObjetivoCumprido(true); setShowMockModal(true);
  }, []);
  const handleNomeLeadCapturado = useCallback((nome: string) => { setNomeLead(nome); }, []);
  const handleSessaoExpirada    = useCallback(() => { router.push('/lead'); }, [router]);
  const handleContinuarTestando = useCallback(() => { router.push(`/lead/${token}/email`); }, [router, token]);
  const handleCriarAssistente   = useCallback(() => { router.push(`/cadastro?demo=${token}`); }, [router, token]);
  const handleFirstMessage      = useCallback(() => { setHasMessages(true); }, []);

  // ── Handlers do tour ─────────────────────────────────────────

  const handleCarrosselClick = useCallback(() => {
    startTourAudio('carrossel');                         // ← dentro do gesto ✓
    setTourState({ active: true, type: 'carrossel' });
  }, [startTourAudio]);

  const handleModoBtnClick = useCallback(() => {
    startTourAudio('modos');                             // ← dentro do gesto ✓
    setTourState({ active: true, type: 'modos' });
  }, [startTourAudio]);

  const handleArrowClick = useCallback((_dir: 'prev' | 'next') => {
    startTourAudio('assistente');                        // ← dentro do gesto ✓
    setTourState({ active: true, type: 'assistente' });
  }, [startTourAudio]);

  const handleTourClose = useCallback(() => {
    stopTourAudio();
    setTourState({ active: false, type: null });
  }, [stopTourAudio]);

  // ── Frase do avatar ──────────────────────────────────────────

  const RAMOS_AGENDAMENTO = ['clinica', 'academia', 'educacao'];
  const fraseAvatar = RAMOS_AGENDAMENTO.includes(ramo)
    ? 'Esse é o exemplo do seu Assistente. Pergunte sobre disponibilidade e horários para simularmos um agendamento.'
    : 'Esse é o exemplo do seu Assistente. Pergunte sobre o seu produto para simularmos uma venda.';

  const initialMessages: LeadDemoMessage[] = context.map(m => ({
    role: m.role, content: m.content,
  }));

  const arrowBtnClass = `w-10 h-10 rounded-full flex items-center justify-center
    opacity-40 hover:opacity-100 transition-opacity backdrop-blur-sm border ${
    isDark
      ? 'bg-white/10 border-white/20 text-white'
      : 'bg-black/5 border-black/10 text-gray-700'
  }`;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
    }`}>

      <LeadDemoHeader
        nomeNegocio={nomeNegocio}
        onModoBtnClick={handleModoBtnClick}
      />

      {/* Setas laterais — fixed, centradas verticalmente, iguais ao assistente real */}
      {!tourState.active && (
        <>
          <button
            onClick={() => handleArrowClick('prev')}
            className={`fixed left-3 top-1/2 -translate-y-1/2 z-20 ${arrowBtnClass}`}
            aria-label="Ver página do assistente"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => handleArrowClick('next')}
            className={`fixed right-3 top-1/2 -translate-y-1/2 z-20 ${arrowBtnClass}`}
            aria-label="Ver página do assistente"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" className="w-5 h-5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-0 gap-0 overflow-hidden relative">

        {/* Avatar + frase — some ao 1º msg */}
        <div className={`w-full flex flex-col items-center flex-shrink-0
          transition-all duration-700 ease-in-out ${
          hasMessages
            ? 'opacity-0 max-h-0 pointer-events-none overflow-hidden'
            : 'opacity-100 max-h-[400px]'
        }`}>
          <div className="w-full max-w-[280px] h-[280px] relative">
            <LandingAvatarFace theme={isDark ? 'dark' : 'light'} avatarOnly />
          </div>
          <p className={`mt-3 text-center text-sm max-w-xs leading-relaxed px-2 ${
            isDark ? 'text-white/50' : 'text-gray-500'
          }`}>
            {fraseAvatar}
          </p>
        </div>

        {/* Chat */}
        <div className="w-full max-w-2xl transition-all duration-700 ease-in-out flex-1 min-h-0 flex flex-col"
          style={{ height: hasMessages ? '100%' : undefined }}>
          <LeadDemoAssistant
            token={token}
            theme={isDark ? 'dark' : 'light'}
            initialMessages={initialMessages}
            initialObjetivoCumprido={objetivoCumpridoInicial}
            initialNomeLead={nomeLeadInicial}
            onObjetivoCumprido={handleObjetivoCumprido}
            onNomeLeadCapturado={handleNomeLeadCapturado}
            onSessaoExpirada={handleSessaoExpirada}
            onFirstMessage={handleFirstMessage}
          />
        </div>

        {/* Botões pós-objetivo */}
        {objetivoCumprido && (
          <div className="fixed bottom-24 left-4 right-4 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 z-10">
            <button onClick={handleContinuarTestando}
              className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors shadow-lg">
              Continuar testando → ver confirmação por e-mail
            </button>
            <button onClick={handleCriarAssistente}
              className={`flex-1 px-6 py-3 rounded-xl border font-semibold transition-colors shadow-lg backdrop-blur-sm ${
                isDark ? 'border-white/20 hover:bg-white/10 text-white bg-slate-900/80'
                       : 'border-black/20 hover:bg-black/5 text-gray-900 bg-white/80'
              }`}>
              Gostei! Criar meu assistente agora
            </button>
          </div>
        )}
      </main>

      {/* Carrossel mock — fixed acima do input, some ao 1º msg */}
      {!hasMessages && (
        <div className="fixed bottom-[80px] left-0 right-0 z-[5] pointer-events-auto">
          <LeadDemoCarrosselMock
            theme={isDark ? 'dark' : 'light'}
            onCarrosselClick={handleCarrosselClick}
          />
        </div>
      )}

      {/* Modal checkout */}
      {showMockModal && objetivoInfo && (
        <LeadMockCheckoutModal
          info={objetivoInfo} produto={produto} preco={preco}
          nomeLead={nomeLead} isDark={isDark}
          onClose={() => setShowMockModal(false)}
        />
      )}

      {/* Tour overlay — fora do main para z-50 pleno */}
      {tourState.active && tourState.type && (
        <LeadDemoTourOverlay
          type={tourState.type}
          onClose={handleTourClose}
          theme={isDark ? 'dark' : 'light'}
        />
      )}
    </div>
  );
}