// app/(dashboard)/HomeClient.tsx
'use client';

import Link from 'next/link';
import { CreditsCard } from '@/components/CreditsCard';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Bot, 
  Settings, 
  DollarSign, 
  MessageSquare, 
  Zap,
  Mic
} from 'lucide-react';

interface HomeClientProps {
  user: any;
  userId: string;
  totalCompanies: number;
  totalConversations: number;
  totalFAQs: number;
}

export default function HomeClient({ 
  user,
  userId,
  totalCompanies, 
  totalConversations, 
  totalFAQs 
}: HomeClientProps) {
  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  // ✅ REMOVIDO useTheme temporariamente
  // Usando tema dark fixo para testar
  const theme = 'dark';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold mb-2 text-white">
          Olá, {displayName}!
        </h1>
        <p className="text-lg text-white/60">
          Bem-vindo ao Painel de Controle do eAi
        </p>
      </div>

      {/* 💳 CARD DE CRÉDITOS */}
      {userId && (
        <div className="mb-8">
          <CreditsCard userId={userId} theme={theme} />
        </div>
      )}

      {/* Cards Informativos */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Assistentes */}
        <Link href="/dashboard/assistentes" className="block">
          <div className="rounded-lg shadow-md p-6 border bg-slate-800/50 backdrop-blur-xl border-white/10 hover:border-primary-green/50 transition">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-500/20">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Assistentes</h3>
                <p className="text-sm text-white/40">
                  {totalCompanies} {totalCompanies === 1 ? 'assistente' : 'assistentes'}
                </p>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Gerencie seus assistentes virtuais, palavras de ativação e treinamentos.
            </p>
          </div>
        </Link>

        {/* Card Funções */}
        <Link href="/dashboard/funcoes" className="block">
          <div className="rounded-lg shadow-md p-6 border bg-slate-800/50 backdrop-blur-xl border-white/10 hover:border-primary-green/50 transition">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-indigo-500/20">
                <Settings className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Funções</h3>
                <p className="text-sm text-white/40">do assistente</p>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Ative ou desative funções que o assistente pode executar.
            </p>
          </div>
        </Link>

        {/* Card Saldo */}
        <Link href="/dashboard/saldo" className="block">
          <div className="rounded-lg shadow-md p-6 border bg-slate-800/50 backdrop-blur-xl border-white/10 hover:border-primary-green/50 transition">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-500/20">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Saldo</h3>
                <p className="text-sm text-white/40">PIX recebidos</p>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Gerencie PIX recebidos e solicite saques.
            </p>
          </div>
        </Link>

        {/* Card Histórico */}
        <Link href="/dashboard/historico" className="block">
          <div className="rounded-lg shadow-md p-6 border bg-slate-800/50 backdrop-blur-xl border-white/10 hover:border-primary-green/50 transition">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-cyan-500/20">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Histórico</h3>
                <p className="text-sm text-white/40">
                  {totalConversations} {totalConversations === 1 ? 'conversa' : 'conversas'}
                </p>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Ver perguntas e respostas para ajustar o prompt.
            </p>
          </div>
        </Link>

        {/* Card Respostas Rápidas */}
        <Link href="/dashboard/faqs" className="block">
          <div className="rounded-lg shadow-md p-6 border bg-slate-800/50 backdrop-blur-xl border-white/10 hover:border-primary-green/50 transition">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-500/20">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Respostas Rápidas</h3>
                <p className="text-sm text-white/40">
                  {totalFAQs} {totalFAQs === 1 ? 'FAQ ativa' : 'FAQs ativas'}
                </p>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Configure respostas automáticas para perguntas frequentes.
            </p>
          </div>
        </Link>

        {/* Card Testar Assistente */}
        <Link href="/dashboard/voice" className="block">
          <div className="rounded-lg shadow-md p-6 border bg-slate-800/50 backdrop-blur-xl border-white/10 hover:border-primary-green/50 transition">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-500/20">
                <Mic className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Testar Assistente</h3>
                <p className="text-sm text-white/40">palavra de ativação</p>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Teste o assistente de voz com palavra de ativação.
            </p>
          </div>
        </Link>
      </div>

      {/* Call to Action - Primeira Empresa */}
      {totalCompanies === 0 && (
        <div className="rounded-lg p-6 bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 mt-0.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold mb-1 text-white">
                Comece Agora
              </h3>
              <p className="text-sm mb-3 text-white/70">
                Crie seu primeiro assistente para começar a usar o sistema de voz
              </p>
              <Link
                href="/dashboard/assistentes/novo"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold"
              >
                + Criar Primeiro Assistente
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}