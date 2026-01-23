// app/dashboard/faqs/FAQsClient.tsx (Client Component)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserProfile } from '@/components/UserProfile';

interface FAQsClientProps {
  companies: any[];
  user: any;
}

export default function FAQsClient({ companies, user }: FAQsClientProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    if (mediaQuery.matches) {
      setTheme('light');
    }
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
              <Link href="/dashboard">
                <Image 
                  src="/logo.png" 
                  alt="eAi" 
                  width={150} 
                  height={68}
                  className="rounded-lg cursor-pointer"
                />
              </Link>
              <h1 className={`text-xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Respostas Rápidas
              </h1>
            </div>

            <UserProfile user={user} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className={`inline-flex items-center mb-4 transition-colors ${
              theme === 'dark'
                ? 'text-blue-400 hover:text-blue-300'
                : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao Dashboard
          </Link>
          
          <h2 className={`text-3xl font-bold mb-2 transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            💬 Gerenciar Respostas Rápidas
          </h2>
          <p className={`transition-colors ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            Selecione uma empresa para configurar as FAQs e respostas automáticas
          </p>
        </div>

        {!companies || companies.length === 0 ? (
          <div className={`rounded-xl shadow-lg p-12 text-center transition-colors ${
            theme === 'dark'
              ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10'
              : 'bg-white'
          }`}>
            <div className="max-w-md mx-auto">
              <svg className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className={`text-xl font-bold mb-2 transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Nenhuma empresa cadastrada
              </h3>
              <p className={`mb-6 transition-colors ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                Você precisa criar uma empresa antes de configurar FAQs
              </p>
              <Link
                href="/dashboard/empresas/nova"
                className="inline-block px-6 py-3 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition font-semibold"
              >
                + Criar Primeira Empresa
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/dashboard/faqs/${company.id}`}
                className={`block rounded-xl shadow-md p-6 hover:shadow-lg transition group ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10 hover:border-purple-500/30'
                    : 'bg-white hover:shadow-xl'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className={`text-xl font-bold mb-2 transition-colors ${
                      theme === 'dark'
                        ? 'text-white group-hover:text-purple-400'
                        : 'text-gray-900 group-hover:text-purple-600'
                    }`}>
                      {company.name}
                    </h3>
                    {company.wake_word && (
                      <p className={`text-sm transition-colors ${
                        theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                      }`}>
                        🎤 Palavra: {company.wake_word}
                      </p>
                    )}
                  </div>
                  <svg className={`w-6 h-6 transition-colors ${
                    theme === 'dark'
                      ? 'text-white/40 group-hover:text-purple-400'
                      : 'text-gray-400 group-hover:text-purple-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                
                <div className={`pt-4 border-t transition-colors ${
                  theme === 'dark' ? 'border-white/10' : 'border-gray-100'
                }`}>
                  <div className={`flex items-center text-sm transition-colors ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Configurar FAQs
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
