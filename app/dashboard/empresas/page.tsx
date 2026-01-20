'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface EmpresasPageProps {
  companies: any[];
  CopyLinkButtonComponent: React.ComponentType<{ slug: string }>;
}

export default function EmpresasPageClient({ companies, CopyLinkButtonComponent }: EmpresasPageProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
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
                  alt="iTend" 
                  width={150} 
                  height={68}
                  className="rounded-lg cursor-pointer"
                />
              </Link>
              <h1 className={`text-xl font-bold transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Empresas
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className={`inline-flex items-center transition-colors ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
              </Link>
              <Link
                href="/dashboard/empresas/nova"
                className="px-4 py-2 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition font-semibold"
              >
                + Nova Empresa
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!companies || companies.length === 0 ? (
          <div className={`rounded-lg shadow-md p-12 text-center transition-colors ${
            theme === 'dark'
              ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10'
              : 'bg-white'
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
            }`}>
              <svg className={`w-8 h-8 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className={`text-xl font-bold mb-2 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Nenhuma empresa cadastrada
            </h2>
            <p className={`mb-6 transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              Crie sua primeira empresa para começar a usar o assistente de voz
            </p>
            <Link
              href="/dashboard/empresas/nova"
              className="inline-block px-6 py-3 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition font-semibold"
            >
              Criar Primeira Empresa
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`rounded-lg shadow-md p-6 hover:shadow-lg transition ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10 hover:border-blue-500/30'
                    : 'bg-white hover:shadow-xl'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20'
                      : 'bg-gradient-to-br from-blue-500 to-blue-600'
                  }`}>
                    <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    Ativo
                  </span>
                </div>

                <h3 className={`text-lg font-bold mb-3 transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {company.name}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className={`flex items-center text-sm transition-colors ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <code className={`text-xs px-2 py-1 rounded truncate ${
                      theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                    }`}>
                      /oi/{company.slug}
                    </code>
                  </div>
                  
                  <div className={`flex items-center text-sm transition-colors ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-xs truncate">
                      Ativação: <strong>{company.wake_word || 'olá assistente'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    href={`/dashboard/empresas/${company.id}`}
                    className={`flex-1 px-4 py-2 rounded-lg transition text-center text-sm font-medium ${
                      theme === 'dark'
                        ? 'bg-slate-700/50 text-white/90 hover:bg-slate-700/70'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/oi/${company.slug}`}
                    target="_blank"
                    className="flex-1 px-4 py-2 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition text-center text-sm font-medium"
                  >
                    Abrir
                  </Link>
                </div>

                <div className={`mt-3 pt-3 border-t transition-colors ${
                  theme === 'dark' ? 'border-white/10' : 'border-gray-100'
                }`}>
                  <CopyLinkButtonComponent slug={company.slug} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
