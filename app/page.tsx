'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark'); // SEMPRE inicia dark

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  
    // Só muda para light se o SISTEMA estiver em light mode
    if (mediaQuery.matches) {
      setTheme('light');
    }
    // Se for dark ou sem preferência, mantém dark (padrão)
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
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

      {/* Header */}
      <header className={`border-b transition-colors ${
        theme === 'dark' 
          ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl' 
          : 'bg-white/80 border-gray-200 backdrop-blur-xl'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Image 
              src="/logo.png" 
              alt="iTend" 
              width={150} 
              height={68}
              className="h-12 w-auto"
            />
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#recursos" className={`transition-colors ${
                theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>Recursos</a>
              <a href="#precos" className={`transition-colors ${
                theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>Preços</a>
              <a href="#contato" className={`transition-colors ${
                theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>Contato</a>
            </nav>
            <Link
              href="/login"
              className="px-6 py-2 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition font-semibold"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className={`text-5xl font-bold mb-4 transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Atendimento ao Cliente
          </h1>
          <h2 className={`text-5xl font-bold mb-6 transition-colors ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`}>
            Por Voz com IA
          </h2>
          <p className={`text-xl max-w-3xl mx-auto mb-8 transition-colors ${
            theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          }`}>
            Transforme a experiência dos seus clientes com um assistente de voz inteligente
            que responde perguntas, tira dúvidas e oferece suporte 24/7.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition font-semibold text-lg"
            >
              Começar Agora
            </Link>
            <Link
              href="/teste-wake-word"
              className={`px-8 py-4 border-2 rounded-lg transition font-semibold text-lg ${
                theme === 'dark'
                  ? 'border-blue-400 text-blue-400 hover:bg-blue-400/10'
                  : 'border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
              Ver Demonstração
            </Link>
          </div>
        </div>

        {/* Demo Section */}
        <div className="max-w-2xl mx-auto">
          <div className={`rounded-2xl shadow-xl p-12 transition-colors ${
            theme === 'dark' 
              ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10' 
              : 'bg-white'
          }`}>
            <div className="flex flex-col items-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600'
              }`}>
                <svg className={`w-12 h-12 ${theme === 'dark' ? 'text-blue-400' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className={`text-2xl font-bold mb-4 transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Diga "Olá Assistente"
              </h3>
              <p className={`text-center mb-6 transition-colors ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                E comece a interagir com seu assistente de voz personalizado
              </p>
              <Link
                href="/teste-wake-word"
                className="px-6 py-3 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition font-semibold"
              >
                Testar Agora Gratuitamente
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className={`rounded-xl shadow-md p-8 transition-colors ${
            theme === 'dark'
              ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10'
              : 'bg-white'
          }`}>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
              theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={`text-xl font-bold mb-2 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Custo Baixo</h3>
            <p className={`transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              A partir de R$ 0,12 por interação. Economia de 90% comparado a atendimento humano.
            </p>
          </div>

          <div className={`rounded-xl shadow-md p-8 transition-colors ${
            theme === 'dark'
              ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10'
              : 'bg-white'
          }`}>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
              theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className={`text-xl font-bold mb-2 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Totalmente Customizável</h3>
            <p className={`transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              Configure palavras de ativação, saudações e prompts personalizados para cada empresa.
            </p>
          </div>

          <div className={`rounded-xl shadow-md p-8 transition-colors ${
            theme === 'dark'
              ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10'
              : 'bg-white'
          }`}>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
              theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className={`text-xl font-bold mb-2 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Rápido e Fácil</h3>
            <p className={`transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              Configure em minutos. Sem necessidade de código ou conhecimento técnico.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`border-t py-8 transition-colors ${
        theme === 'dark'
          ? 'bg-slate-900/50 border-white/10 backdrop-blur-xl'
          : 'bg-white border-gray-200'
      }`}>
        <div className={`px-4 text-center transition-colors ${
          theme === 'dark' ? 'text-white/60' : 'text-gray-700'
        }`}>
          <p>
            &copy; {new Date().getFullYear()} iTend - Atendimento por Voz Inteligente.
          </p>
          <small>
            <a
              href="https://bigcorps.com.br"
              target="_blank"
              rel="noreferrer"
              className={`hover:underline transition-colors ${
                theme === 'dark' ? 'text-white/40 hover:text-white/60' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Desenvolvido por BigCorps.
            </a>
          </small>
        </div>
      </footer>
    </div>
  )
}
