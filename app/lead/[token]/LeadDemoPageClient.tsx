'use client';

// app/lead/[token]/LeadDemoPageClient.tsx
//
// MODIFICADO v2:
// - Tour educativo com 3 pontos de interação
// - startTourAudio() chamado DENTRO do handler de clique (contexto de gesto)
//   → iOS e Android liberam speechSynthesis sem prompt

import { useState, useCallback } from 'react';
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
import { LandingAvatarFace }     from '@/components/landing/LandingAvatarFace';
import {
  LeadMockCheckoutModal,
  type ObjetivoInfo,
} from '@/components/LeadDemo/LeadMockCheckoutModal';

// ── Tipos ────────────────────────────────────────────────────────

interface TourState {
  active: boolean;
  type:   TourType | null;
}

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

// ── Áudio — chamado DENTRO do evento de clique ───────────────────
// Chamar speak() dentro do handler garante que o contexto de gesto
// do browser (iOS Safari, Android Chrome) autorize o áudio sem
// nenhum prompt extra. useEffect não tem esse contexto.

function startTourAudio(type: TourType): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  // Cancela fala anterior se houver
  window.speechSynthesis.cancel()

  const script = getTourScript(type)
  const utter  = new SpeechSynthesisUtterance(script.audioText)
  utter.lang   = 'pt-BR'
  utter.rate   = 1.05
  utter.pitch  = 1.0

  // Seleciona voz PT-BR se já carregada (best-effort no momento do clique)
  const voices  = window.speechSynthesis.getVoices()
  const ptVoice = voices.find(v => v.lang === 'pt-BR')
                ?? voices.find(v => v.lang.startsWith('pt'))
  if (ptVoice) utter.voice = ptVoice

  window.speechSynthesis.speak(utter)
}

// ── Componente ───────────────────────────────────────────────────

export default function LeadDemoPageClient({
  token,
  ramo,
  nomeNegocio,
  produto,
  preco,
  nomeLead:         nomeLeadInicial,
  objetivoCumprido: objetivoCumpridoInicial,
  context,
}: LeadDemoPageClientProps) {
  const router            = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark            = resolvedTheme !== 'light';

  // ── Estado original ──────────────────────────────────────────

  const [objetivoCumprido, setObjetivoCumprido] = useState(objetivoCumpridoInicial);
  const [objetivoInfo, setObjetivoInfo]         = useState<ObjetivoInfo | null>(null);
  const [nomeLead, setNomeLead]                 = useState<string | null>(nomeLeadInicial);
  const [showMockModal, setShowMockModal]       = useState(false);
  const [hasMessages, setHasMessages]           = useState(context.length > 0);

  // ── Estado do tour ───────────────────────────────────────────

  const [tourState, setTourState] = useState<TourState>({ active: false, type: null });

  // ── Mensagens iniciais ───────────────────────────────────────

  const initialMessages: LeadDemoMessage[] = context.map(m => ({
    role:    m.role,
    content: m.content,
  }));

  // ── Handlers originais ───────────────────────────────────────

  const handleObjetivoCumprido = useCallback((info: ObjetivoInfo) => {
    setObjetivoInfo(info);
    setObjetivoCumprido(true);
    setShowMockModal(true);
  }, []);

  const handleNomeLeadCapturado = useCallback((nome: string) => {
    setNomeLead(nome);
  }, []);

  const handleSessaoExpirada = useCallback(() => {
    router.push('/lead');
  }, [router]);

  const handleContinuarTestando = useCallback(() => {
    router.push(`/lead/${token}/email`);
  }, [router, token]);

  const handleCriarAssistente = useCallback(() => {
    router.push(`/cadastro?demo=${token}`);
  }, [router, token]);

  const handleFirstMessage = useCallback(() => {
    setHasMessages(true);
  }, []);

  // ── Handlers do tour — speak() chamado aqui, dentro do gesto ─

  /** Clique no carrossel mock */
  const handleCarrosselClick = useCallback(() => {
    startTourAudio('carrossel')               // ← dentro do gesto ✓
    setTourState({ active: true, type: 'carrossel' });
  }, []);

  /** Qualquer botão de modo (Shop / Full / Link / User / Kiosk) */
  const handleModoBtnClick = useCallback(() => {
    startTourAudio('modos')                   // ← dentro do gesto ✓
    setTourState({ active: true, type: 'modos' });
  }, []);

  /** Setas ← → */
  const handleArrowClick = useCallback((_dir: 'prev' | 'next') => {
    startTourAudio('assistente')              // ← dentro do gesto ✓
    setTourState({ active: true, type: 'assistente' });
  }, []);

  /** Fecha o overlay (overlay já cancela o áudio internamente) */
  const handleTourClose = useCallback(() => {
    setTourState({ active: false, type: null });
  }, []);

  // ── Frase do avatar ──────────────────────────────────────────

  const RAMOS_AGENDAMENTO = ['clinica', 'academia', 'educacao'];
  const fraseAvatar = RAMOS_AGENDAMENTO.includes(ramo)
    ? 'Esse é o exemplo do seu Assistente. Pergunte sobre disponibilidade e horários para simularmos um agendamento.'
    : 'Esse é o exemplo do seu Assistente. Pergunte sobre o seu produto para simularmos uma venda.';

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
    }`}>

      {/* Header — recebe os callbacks do tour */}
      <LeadDemoHeader
        nomeNegocio={nomeNegocio}
        onModoBtnClick={handleModoBtnClick}
        onArrowClick={handleArrowClick}
      />

      <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-0 gap-0 overflow-hidden relative">

        {/* ── Avatar + frase + carrossel mock ─────────────────────
            Bloco inteiro faz fade-out quando chegam mensagens.
        ── */}
        <div className={`w-full flex flex-col items-center flex-shrink-0
          transition-all duration-700 ease-in-out ${
          hasMessages
            ? 'opacity-0 max-h-0 pointer-events-none overflow-hidden'
            : 'opacity-100 max-h-[500px]'
        }`}>

          {/* Avatar */}
          <div className="w-full max-w-[260px] h-[260px] relative">
            <LandingAvatarFace theme={isDark ? 'dark' : 'light'} avatarOnly />
          </div>

          {/* Frase */}
          <p className={`mt-4 text-center text-sm max-w-xs leading-relaxed px-2 ${
            isDark ? 'text-white/50' : 'text-gray-500'
          }`}>
            {fraseAvatar}
          </p>

          {/* Carrossel mock — clique abre tour de categorias */}
          <div className="w-full mt-4">
            <LeadDemoCarrosselMock
              theme={isDark ? 'dark' : 'light'}
              onCarrosselClick={handleCarrosselClick}
            />
          </div>
        </div>

        {/* ── Área de chat ── */}
        <div className="w-full max-w-2xl transition-all duration-700 ease-in-out flex-1 min-h-0 flex flex-col"
          style={{ height: hasMessages ? '100%' : undefined }}
        >
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

        {/* ── Botões de avanço pós-objetivo ── */}
        {objetivoCumprido && (
          <div className="fixed bottom-24 left-4 right-4 max-w-2xl mx-auto
            flex flex-col sm:flex-row gap-3 z-10">
            <button
              onClick={handleContinuarTestando}
              className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600
                text-white font-semibold transition-colors shadow-lg"
            >
              Continuar testando → ver confirmação por e-mail
            </button>
            <button
              onClick={handleCriarAssistente}
              className={`flex-1 px-6 py-3 rounded-xl border font-semibold
                transition-colors shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'border-white/20 hover:bg-white/10 text-white bg-slate-900/80'
                  : 'border-black/20 hover:bg-black/5 text-gray-900 bg-white/80'
              }`}
            >
              Gostei! Criar meu assistente agora
            </button>
          </div>
        )}
      </main>

      {/* ── Modal de checkout mock (PIX / Agendamento) ── */}
      {showMockModal && objetivoInfo && (
        <LeadMockCheckoutModal
          info={objetivoInfo}
          produto={produto}
          preco={preco}
          nomeLead={nomeLead}
          isDark={isDark}
          onClose={() => setShowMockModal(false)}
        />
      )}

      {/* ── Tour overlay — z-50, fora do main ─────────────────────
          Renderizado como irmão do main para garantir z-index pleno.
          O áudio já foi iniciado no handler de clique acima.
      ── */}
      {tourState.active && tourState.type && (
        <LeadDemoTourOverlay
          type={tourState.type}
          onClose={handleTourClose}
        />
      )}
    </div>
  );
}