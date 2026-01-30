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
  const { theme } = useTheme();

  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className={`text-3xl font-bold mb-2 transition-colors ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Olá, {displayName}!
        </h1>
        <p className={`text-lg transition-colors ${
          theme === 'dark' ? 'text-white/60' : 'text-gray-600'
        }`}>
          Bem-vindo ao Painel de Controle do iTend
        </p>
      </div>

      {/* 💳 CARD DE CRÉDITOS - DESTAQUE NO TOPO */}
      {userId && (
        <div className="mb-8">
          <CreditsCard userId={userId} theme={theme} />
        </div>
      )}

      {/* Cards Informativos */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Assistentes */}
        <div className={`rounded-lg shadow-md p-6 border transition ${
          theme === 'dark'
            ? 'bg-slate-800/50 backdrop-blur-xl border-white/10'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-blue-500/20'
                : 'bg-blue-100'
            }`}>
              <Bot className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Assistentes</h3>
              <p className={`text-sm transition-colors ${
                theme === 'dark' ? 'text-white/40' : 'text-gray-500'
              }`}>{totalCompanies} {totalCompanies === 1 ? 'assistente' : 'assistentes'}</p>
            </div>
          </div>
          <p className={`text-sm transition-colors ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            Gerencie seus assistentes virtuais, palavras de ativação e treinamentos.
          </p>
        </div>

        {/* Card Funções */}
        <div className={`rounded-lg shadow-md p-6 border transition ${
          theme === 'dark'
            ? 'bg-slate-800/50 backdrop-blur-xl border-white/10'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-indigo-500/20'
                : 'bg-indigo-100'
            }`}>
              <Settings className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Funções</h3>
              <p className={`text-sm transition-colors ${
                theme === 'dark' ? 'text-white/40' : 'text-gray-500'
              }`}>do assistente</p>
            </div>
          </div>
          <p className={`text-sm transition-colors ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            Ative ou desative funções que o assistente pode executar.
          </p>
        </div>

        {/* Card Saldo */}
        <div className={`rounded-lg shadow-md p-6 border transition ${
          theme === 'dark'
            ? 'bg-slate-800/50 backdrop-blur-xl border-white/10'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-green-500/20'
                : 'bg-green-100'
            }`}>
              <DollarSign className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Saldo</h3>
              <p className={`text-sm transition-colors ${
                theme === 'dark' ? 'text-white/40' : 'text-gray-500'
              }`}>PIX recebidos</p>
            </div>
          </div>
          <p className={`text-sm transition-colors ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            Gerencie PIX recebidos e solicite saques.
          </p>
        </div>

        {/* Card Histórico */}
        <div className={`rounded-lg shadow-md p-6 border transition ${
          theme === 'dark'
            ? 'bg-slate-800/50 backdrop-blur-xl border-white/10'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-cyan-500/20'
                : 'bg-blue-100'
            }`}>
              <MessageSquare className={`w-6 h-6 ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Histórico</h3>
              <p className={`text-sm transition-colors ${
                theme === 'dark' ? 'text-white/40' : 'text-gray-500'
              }`}>{totalConversations} {totalConversations === 1 ? 'conversa' : 'conversas'}</p>
            </div>
          </div>
          <p className={`text-sm transition-colors ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            Ver perguntas e respostas para ajustar o prompt.
          </p>
        </div>

        {/* Card Respostas Rápidas */}
        <div className={`rounded-lg shadow-md p-6 border transition ${
          theme === 'dark'
            ? 'bg-slate-800/50 backdrop-blur-xl border-white/10'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-purple-500/20'
                : 'bg-purple-100'
            }`}>
              <Zap className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Respostas Rápidas</h3>
              <p className={`text-sm transition-colors ${
                theme === 'dark' ? 'text-white/40' : 'text-gray-500'
              }`}>{totalFAQs} {totalFAQs === 1 ? 'FAQ ativa' : 'FAQs ativas'}</p>
            </div>
          </div>
          <p className={`text-sm transition-colors ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            Configure respostas automáticas para perguntas frequentes.
          </p>
        </div>

        {/* Card Testar Assistente */}
        <div className={`rounded-lg shadow-md p-6 border transition ${
          theme === 'dark'
            ? 'bg-slate-800/50 backdrop-blur-xl border-white/10'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-amber-500/20'
                : 'bg-amber-100'
            }`}>
              <Mic className={`w-6 h-6 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Testar Assistente</h3>
              <p className={`text-sm transition-colors ${
                theme === 'dark' ? 'text-white/40' : 'text-gray-500'
              }`}>palavra de ativação</p>
            </div>
          </div>
          <p className={`text-sm transition-colors ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            Teste o assistente de voz com palavra de ativação.
          </p>
        </div>
      </div>

      {/* Call to Action - Primeira Empresa */}
      {totalCompanies === 0 && (
        <div className={`rounded-lg p-6 transition-colors border ${
          theme === 'dark'
            ? 'bg-blue-500/10 border-blue-500/20'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start space-x-3">
            <svg className={`w-6 h-6 mt-0.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className={`font-semibold mb-1 transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-blue-900'
              }`}>
                Comece Agora
              </h3>
              <p className={`text-sm mb-3 transition-colors ${
                theme === 'dark' ? 'text-white/70' : 'text-blue-800'
              }`}>
                Crie seu primeiro assistente para começar a usar o sistema de voz
              </p>
              <Link
                href="/assistentes/novo"
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