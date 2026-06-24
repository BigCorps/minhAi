'use client';

// app/lead/[token]/LeadDemoPageClient.tsx
//
// Visual redesenhado: avatar LandingAvatarFace (face ↔ orbe a cada 5s)
// centralizado no topo, some quando há interação. Input fixo na base.
// Toda a lógica de negócio original preservada.
//
// ATUALIZAÇÃO: MockObjetivoModal simples substituído por
// LeadMockCheckoutModal (components/LeadDemo/LeadMockCheckoutModal.tsx),
// que tem etapas espelhando CheckoutFlow/GestorAgendaDisplay reais
// (pagamento → aguardando/QR mock → confirmado, com a etapa extra de
// "cobrar agora ou depois" para o ramo Agenda).

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LeadDemoAssistant, type LeadDemoMessage } from '@/components/LeadDemo/LeadDemoAssistant';
import { LeadDemoHeader } from '@/components/LeadDemo/LeadDemoHeader';
import { LandingAvatarFace } from '@/components/landing/LandingAvatarFace';
import { LeadMockCheckoutModal, type ObjetivoInfo } from '@/components/LeadDemo/LeadMockCheckoutModal';

interface LeadDemoPageClientProps {
  token: string;
  ramo: string;
  nomeNegocio: string;
  produto: string;
  preco: number;
  nomeLead: string | null;
  objetivoCumprido: boolean;
  context: Array<{ role: 'user' | 'assistant'; content: string }>;
  temEmail: boolean;
  temPhone: boolean;
}

export default function LeadDemoPageClient({
  token,
  ramo,
  nomeNegocio,
  produto,
  preco,
  nomeLead: nomeLeadInicial,
  objetivoCumprido: objetivoCumpridoInicial,
  context,
}: LeadDemoPageClientProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  const [objetivoCumprido, setObjetivoCumprido] = useState(objetivoCumpridoInicial);
  const [objetivoInfo, setObjetivoInfo] = useState<ObjetivoInfo | null>(null);
  const [nomeLead, setNomeLead] = useState<string | null>(nomeLeadInicial);
  const [showMockModal, setShowMockModal] = useState(false);

  // Controla visibilidade do avatar — some quando há mensagens
  const [hasMessages, setHasMessages] = useState(
    context.length > 0
  );

  const initialMessages: LeadDemoMessage[] = context.map(m => ({
    role: m.role,
    content: m.content,
  }));

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

  // Callback chamado pelo LeadDemoAssistant quando o user envia 1ª msg
  const handleFirstMessage = useCallback(() => {
    setHasMessages(true);
  }, []);

  const RAMOS_AGENDAMENTO = ['clinica', 'academia', 'educacao'];
  const fraseAvatar = RAMOS_AGENDAMENTO.includes(ramo)
    ? 'Esse é o exemplo do seu Assistente. Pergunte sobre disponibilidade e horários para simularmos um agendamento.'
    : 'Esse é o exemplo do seu Assistente. Pergunte sobre o seu produto para simularmos uma venda.';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
    }`}>
      <LeadDemoHeader nomeNegocio={nomeNegocio} />

      <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-0 gap-0 overflow-hidden relative">

        {/* ── AVATAR + FRASE ────────────────────────────────────────────
            Ocupa espaço fixo e faz fade-out quando há mensagens,
            para o chat tomar conta da tela sem remover o elemento
            (evita layout shift brusco).
        ── */}
        <div
          className={`w-full flex flex-col items-center flex-shrink-0 transition-all duration-700 ease-in-out ${
            hasMessages
              ? 'opacity-0 max-h-0 pointer-events-none overflow-hidden'
              : 'opacity-100 max-h-[420px]'
          }`}
        >
          {/* Avatar — limitado a 260px de altura */}
          <div className="w-full max-w-[260px] h-[260px] relative">
            <LandingAvatarFace theme={isDark ? 'dark' : 'light'} avatarOnly />
          </div>

          {/* Frase descritiva */}
<p className={`mt-4 text-center text-sm max-w-xs leading-relaxed px-2 ${
  isDark ? 'text-white/50' : 'text-gray-500'
}`}>
  {fraseAvatar}
</p>
        </div>

        {/* ── ÁREA DE CHAT ─────────────────────────────────────────────
            Quando não há msgs: encolhe para dar espaço ao avatar.
            Quando há msgs: expande para preencher.
        ── */}
        <div
          className={`w-full max-w-2xl transition-all duration-700 ease-in-out flex-1 min-h-0 ${
            hasMessages ? 'flex flex-col' : 'flex flex-col'
          }`}
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

        {/* ── BOTÕES DE AVANÇO ─────────────────────────────────────────
            Corrigido: o input de LeadDemoAssistant é 'fixed bottom-6'
            (ancorado na viewport, não no fluxo normal do documento —
            decisão já validada visualmente). Por isso estes botões
            também precisam ser 'fixed', posicionados ACIMA da faixa
            do input, em vez de seguir o fluxo normal (senão o input
            fixo sobrepõe os botões, como visto no teste). A conversa
            continua disponível — os botões só ficam por cima, não
            substituem o input.
        ── */}
        {objetivoCumprido && (
          <div className="fixed bottom-24 left-4 right-4 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 z-10">
            <button
              onClick={handleContinuarTestando}
              className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors shadow-lg"
            >
              Continuar testando → ver confirmação por e-mail
            </button>
            <button
              onClick={handleCriarAssistente}
              className={`flex-1 px-6 py-3 rounded-xl border font-semibold transition-colors shadow-lg backdrop-blur-sm ${
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

      {/* ── MODAL MOCK PIX / AGENDAMENTO ─────────────────────────────── */}
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
    </div>
  );
}