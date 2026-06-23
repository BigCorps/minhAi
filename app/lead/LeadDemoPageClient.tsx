'use client';

// app/lead/[token]/LeadDemoPageClient.tsx
//
// Componente client da página /lead/[token]. Responsabilidades:
// - Renderizar header com nome do negócio (tema dark fixo)
// - Hospedar LeadDemoAssistant
// - Reagir aos callbacks (onObjetivoCumprido, onNomeLeadCapturado,
//   onSessaoExpirada) renderizando modais mock e os botões de avanço
//   de etapa, exatamente conforme o roteiro confirmado:
//   - Fim do Passo 1 (objetivo cumprido): 2 botões lado a lado
//     ("continuar testando" → Passo 2 e-mail | banner de cadastro)
//   - Sem interromper a conversa — os botões aparecem ao lado,
//     a conversa continua disponível.

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LeadDemoAssistant, type LeadDemoMessage } from '@/components/LeadDemoAssistant';

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
    // Decisão confirmada: zero recuperação parcial — reinicia do zero.
    router.push('/lead');
  }, [router]);

  const handleContinuarTestando = useCallback(() => {
    // Avança para o Passo 2 (e-mail). Rota a definir quando
    // construirmos esse passo — placeholder por ora.
    router.push(`/lead/${token}/email`);
  }, [router, token]);

  const handleCriarAssistente = useCallback(() => {
    // Passo 4 (cadastro), pode ser chamado a qualquer momento a
    // partir do banner, conforme roteiro confirmado.
    router.push(`/cadastro?demo=${token}`);
  }, [router, token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header simples — sem SlugHeaderWrapper (acoplado a company real) */}
      <header className="border-b border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wide">Demonstração</p>
            <h1 className="text-lg font-bold text-white">{nomeNegocio}</h1>
          </div>
          <span className="text-xs text-white/30">minhAi</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
        <div className="w-full max-w-2xl" style={{ height: '70vh' }}>
          <LeadDemoAssistant
            token={token}
            initialMessages={initialMessages}
            initialObjetivoCumprido={objetivoCumpridoInicial}
            initialNomeLead={nomeLeadInicial}
            onObjetivoCumprido={handleObjetivoCumprido}
            onNomeLeadCapturado={handleNomeLeadCapturado}
            onSessaoExpirada={handleSessaoExpirada}
          />
        </div>

        {/* Botões de avanço — aparecem ao lado, não bloqueiam a conversa */}
        {objetivoCumprido && (
          <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-3">
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

      {/* Modal mock de PIX ou agendamento — placeholder simples, a
          refinar quando desenharmos visualmente esses modais. */}
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