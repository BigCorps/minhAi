'use client';

import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useTheme } from '@/contexts/ThemeContext';

interface DashboardViewProps {
  user: any;
  totalCompanies: number;
  totalConversations: number;
  totalFAQs: number;
}

export default function DashboardView({
  user,
  totalCompanies,
  totalConversations,
  totalFAQs
}: DashboardViewProps) {
  const { theme } = useTheme();
  
  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  // Classes dinâmicas baseadas no tema
  const cardClass = theme === 'dark'
    ? 'bg-slate-800/50 border-white/10 hover:border-blue-500/50 text-white'
    : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-lg text-gray-900 shadow-sm';

  const textMutedClass = theme === 'dark' ? 'text-white/60' : 'text-gray-500';
  const textTitleClass = theme === 'dark' ? 'text-white' : 'text-gray-900';

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
        : 'bg-gray-50'
    }`}>
      
      {/* Header Unificado */}
      <DashboardHeader user={user} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className={`text-3xl font-bold mb-2 transition-colors ${textTitleClass}`}>
              Olá, {displayName}! 👋
            </h1>
            <p className={`text-lg transition-colors ${textMutedClass}`}>
              Bem-vindo ao seu painel de controle
            </p>
          </div>

          {/* Cards Principais */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card Assistentes */}
            <Link href="/dashboard/empresas"> 
              {/* Note: Alterei o link para /empresas que é o padrão que criamos antes */}
              <div className={`border rounded-xl p-6 transition cursor-pointer ${cardClass}`}>
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Assistentes</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
                      {totalCompanies} assistentes
                    </p>
                  </div>
                </div>
                <p className={`text-sm ${textMutedClass}`}>Gerencie seus assistentes virtuais</p>
              </div>
            </Link>

            {/* Card Histórico */}
            <Link href="/dashboard/historico">
              <div className={`border rounded-xl p-6 transition cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-slate-800/50 border-white/10 hover:border-cyan-500/50 text-white' 
                  : 'bg-white border-gray-200 hover:border-cyan-400 hover:shadow-lg text-gray-900 shadow-sm'
              }`}>
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    theme === 'dark' ? 'bg-cyan-500/20' : 'bg-cyan-100'
                  }`}>
                    <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Histórico</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
                      {totalConversations} conversas
                    </p>
                  </div>
                </div>
                <p className={`text-sm ${textMutedClass}`}>Visualize conversas anteriores</p>
              </div>
            </Link>

            {/* Card FAQs */}
            <Link href="/dashboard/faqs">
              <div className={`border rounded-xl p-6 transition cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-slate-800/50 border-white/10 hover:border-purple-500/50 text-white' 
                  : 'bg-white border-gray-200 hover:border-purple-400 hover:shadow-lg text-gray-900 shadow-sm'
              }`}>
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
                  }`}>
                    <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">FAQs</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
                      {totalFAQs} respostas
                    </p>
                  </div>
                </div>
                <p className={`text-sm ${textMutedClass}`}>Respostas automáticas</p>
              </div>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/dashboard/funcoes">
              <div className={`border rounded-xl p-6 transition cursor-pointer ${cardClass}`}>
                <h3 className="text-xl font-bold mb-2">⚙️ Funções</h3>
                <p className={`text-sm ${textMutedClass}`}>Configure funções do assistente</p>
              </div>
            </Link>

            <Link href="/dashboard/saldo">
              <div className={`border rounded-xl p-6 transition cursor-pointer ${cardClass}`}>
                <h3 className="text-xl font-bold mb-2">💰 Saldo</h3>
                <p className={`text-sm ${textMutedClass}`}>PIX recebidos e saques</p>
              </div>
            </Link>
          </div>

          {/* CTA - Criar Assistente */}
          {totalCompanies === 0 && (
            <div className={`border rounded-xl p-6 ${
              theme === 'dark' 
                ? 'bg-blue-500/10 border-blue-500/20' 
                : 'bg-blue-50 border-blue-100'
            }`}>
              <h3 className={`font-semibold mb-1 ${textTitleClass}`}>🚀 Comece Agora</h3>
              <p className={`text-sm mb-3 ${textMutedClass}`}>Crie seu primeiro assistente</p>
              <Link href="/dashboard/empresas/nova" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-semibold">
                + Criar Assistente
              </Link>
            </div>
          )}

          {/* Status Alert */}
          <div className={`border rounded-xl p-4 ${
            theme === 'dark' 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-green-50 border-green-100'
          }`}>
            <div className="flex items-center space-x-2">
              <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>
                ✅ Dashboard funcionando!
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}