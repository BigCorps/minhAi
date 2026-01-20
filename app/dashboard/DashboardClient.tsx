// app/dashboard/DashboardClient.tsx (Client Component)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserProfile } from '@/components/UserProfile';

interface DashboardClientProps {
  user: any;
  totalCompanies: number;
  totalConversations: number;
  totalFAQs: number;
}

export default function DashboardClient({ 
  user, 
  totalCompanies, 
  totalConversations, 
  totalFAQs 
}: DashboardClientProps) {
  // SEMPRE inicia com dark, só muda se o sistema for explicitamente light
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Detecta APENAS se o sistema está explicitamente em light mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    // Se o sistema está em light mode, usa light. Caso contrário, mantém dark
    if (mediaQuery.matches) {
      setTheme('light');
    }
    // Se for dark ou não houver preferência, mantém dark (que já é o padrão)
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'
    }`}>
      
      {/* Botão de Toggle de Tema */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={`fixed top-6 right-6 z-50 p-3 rounded-full backdrop-blur-xl border transition-all hover:scale-110 ${
          theme === 'dark'
            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
        }`}
        aria-label="Alternar tema"
      >
        {theme === 'dark' ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <header className={`border-b transition-colors ${
        theme === 'dark' 
          ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Image 
                src="/logo.png" 
                alt="iTend" 
                width={150} 
                height={68}
                className="rounded-lg"
              />
              <h1 className={`text-xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Painel de Controle
              </h1>
            </div>

            <UserProfile user={user} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Olá, {user?.user_metadata?.name || user?.email || 'Usuário'}!
          </h2>
          <p className={`transition-colors ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            Bem-vindo ao Painel de Controle do iTend
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/dashboard/empresas"
            className={`block rounded-lg shadow-md p-6 hover:shadow-lg transition group ${
              theme === 'dark'
                ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10 hover:border-blue-500/30'
                : 'bg-white hover:shadow-xl'
            }`}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition ${
                theme === 'dark'
                  ? 'bg-blue-500/20 group-hover:bg-blue-500/30'
                  : 'bg-blue-100 group-hover:bg-blue-200'
              }`}>
                <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-bold transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Empresas</h3>
                <p className={`text-sm transition-colors ${
                  theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                }`}>{totalCompanies} {totalCompanies === 1 ? 'empresa' : 'empresas'}</p>
              </div>
            </div>
            <p className={`transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              Gerenciar empresas, palavras de ativação e treinamentos.
            </p>
          </Link>

          <Link
            href="/dashboard/faqs"
            className={`block rounded-lg shadow-md p-6 hover:shadow-lg transition group ${
              theme === 'dark'
                ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10 hover:border-purple-500/30'
                : 'bg-white hover:shadow-xl'
            }`}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition ${
                theme === 'dark'
                  ? 'bg-purple-500/20 group-hover:bg-purple-500/30'
                  : 'bg-purple-100 group-hover:bg-purple-200'
              }`}>
                <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
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
            <p className={`transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              Configure respostas automáticas para perguntas frequentes
            </p>
          </Link>

          <Link
            href="/dashboard/historico"
            className={`block rounded-lg shadow-md p-6 hover:shadow-lg transition group ${
              theme === 'dark'
                ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10 hover:border-cyan-500/30'
                : 'bg-white hover:shadow-xl'
            }`}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition ${
                theme === 'dark'
                  ? 'bg-cyan-500/20 group-hover:bg-cyan-500/30'
                  : 'bg-blue-100 group-hover:bg-blue-200'
              }`}>
                <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
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
            <p className={`transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              Ver perguntas e respostas para ajustar o prompt
            </p>
          </Link>

          <Link
            href="/teste-wake-word"
            className={`block rounded-lg shadow-md p-6 hover:shadow-lg transition group ${
              theme === 'dark'
                ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10 hover:border-green-500/30'
                : 'bg-white hover:shadow-xl'
            }`}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition ${
                theme === 'dark'
                  ? 'bg-green-500/20 group-hover:bg-green-500/30'
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
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
            <p className={`transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              Teste o assistente de voz com palavra de ativação
            </p>
          </Link>
        </div>

        {totalCompanies === 0 && (
          <div className={`rounded-lg p-6 transition-colors ${
            theme === 'dark'
              ? 'bg-blue-500/10 border border-blue-500/20'
              : 'bg-blue-50 border border-blue-200'
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
                  Crie sua primeira empresa para começar a usar o assistente de voz
                </p>
                <Link
                  href="/dashboard/empresas/nova"
                  className="inline-block px-4 py-2 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition text-sm font-semibold"
                >
                  + Criar Primeira Empresa
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
