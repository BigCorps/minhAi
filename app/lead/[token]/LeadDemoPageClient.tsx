'use client';

// app/lead/[token]/LeadDemoPageClient.tsx
//
// Visual redesenhado: avatar LandingAvatarFace (face ↔ orbe a cada 5s)
// centralizado no topo, some quando há interação. Input fixo na base.
// Toda a lógica de negócio original preservada.

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LeadDemoAssistant, type LeadDemoMessage } from '@/components/LeadDemo/LeadDemoAssistant';
import { LeadDemoHeader } from '@/components/LeadDemo/LeadDemoHeader';
import { LandingAvatarFace } from '@/components/landing/LandingAvatarFace';

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

type ObjetivoInfo = { tipo: 'pedido' | 'horario'; horario?: string };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
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
            <LandingAvatarFace theme="dark" avatarOnly />
          </div>

          {/* Frase descritiva */}
<p className="mt-4 text-center text-sm text-white/50 max-w-xs leading-relaxed px-2">
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
            Aparecem abaixo do chat, não bloqueiam a conversa.
        ── */}
        {objetivoCumprido && (
          <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-3 flex-shrink-0 pt-3">
            <button
              onClick={handleContinuarTestando}
              className="flex-1 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
            >
              Continuar testando → ver confirmação por e-mail
            </button>
            <button
              onClick={handleCriarAssistente}
              className="flex-1 px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold transition-colors"
            >
              Gostei! Criar meu assistente agora
            </button>
          </div>
        )}
      </main>

      {/* ── MODAL MOCK PIX / AGENDAMENTO ─────────────────────────────── */}
      {showMockModal && objetivoInfo && (
        <MockObjetivoModal
          info={objetivoInfo}
          produto={produto}
          preco={preco}
          nomeLead={nomeLead}
          onClose={() => setShowMockModal(false)}
        />
      )}
    </div>
  );
}

// ─── Modal mock (sem alterações) ────────────────────────────────────────────

function MockObjetivoModal({
  info,
  produto,
  preco,
  nomeLead,
  onClose,
}: {
  info: ObjetivoInfo;
  produto: string;
  preco: number;
  nomeLead: string | null;
  onClose: () => void;
}) {


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-sm w-full rounded-2xl bg-slate-900 border border-white/10 p-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        {info.tipo === 'pedido' ? (
          <>
            <p className="text-xs uppercase tracking-wide text-emerald-400 mb-2">
              Demonstração — PIX
            </p>
            <h2 className="text-xl font-bold text-white mb-1">{produto}</h2>
            <p className="text-3xl font-bold text-white mb-4">
              R$ {preco.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-sm text-white/50">
              Em um assistente real, aqui apareceria o QR Code do PIX. Isto é uma simulação.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wide text-emerald-400 mb-2">
              Demonstração — Agendamento confirmado
            </p>
            <h2 className="text-xl font-bold text-white mb-1">{produto}</h2>
            <p className="text-lg text-white/80 mb-1">{info.horario}</p>
            {nomeLead && <p className="text-sm text-white/50 mb-4">Para: {nomeLead}</p>}
            <p className="text-sm text-white/50">
              Em um assistente real, isto seria registrado na agenda automaticamente.
            </p>
          </>
        )}
        <button
          onClick={onClose}
          className="mt-5 w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}