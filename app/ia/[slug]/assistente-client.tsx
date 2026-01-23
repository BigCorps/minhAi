'use client';

import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useWakeLock } from '@/hooks/useWakeLock';

interface AssistenteClientProps {
  company: {
    id: string;
    name: string;
    wake_word: string;
    greeting_message: string;
  };
}

export default function AssistenteClient({ company }: AssistenteClientProps) {
  // Estado do tema (dark por padrão)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // 🔒 Wake Lock para manter tela ligada
  const { isSupported, isActive, error, requestWakeLock, releaseWakeLock } = useWakeLock();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  // Detectar preferência do sistema
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  // Função para mostrar toast
  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Handler para toggle do Wake Lock
  const handleToggleWakeLock = async () => {
    console.log('🎯 Botão Wake Lock clicado');
    console.log('📊 Estado atual - isActive:', isActive, 'isSupported:', isSupported);

    if (!isSupported) {
      showToastMessage('Wake Lock não suportado neste navegador', 'warning');
      return;
    }

    if (isActive) {
      // Desativar
      await releaseWakeLock();
      showToastMessage('Tela sempre ligada desativada', 'warning');
    } else {
      // Ativar
      const activated = await requestWakeLock();
      if (activated) {
        showToastMessage('Tela sempre ligada ativada!', 'success');
      } else {
        showToastMessage(error || 'Erro ao ativar', 'error');
      }
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
    }`}>
      
      {/* Botões de Controle - Fixos no canto superior direito */}
      <div className="fixed top-6 right-6 z-50 flex items-center space-x-2">
        
        {/* 🔒 Botão Wake Lock (manter tela ligada) - SÓ APARECE SE SUPORTADO */}
        {isSupported && (
          <button
            onClick={handleToggleWakeLock}
            className={`p-3 rounded-full backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
            } ${isActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
            aria-label={isActive ? 'Desativar tela sempre ligada' : 'Ativar tela sempre ligada'}
            title={isActive ? 'Tela ligada ativa - clique para desativar' : 'Clique para manter tela sempre ligada'}
          >
            {isActive ? (
              // Ícone de cadeado aberto (ativo) - VERDE
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            ) : (
              // Ícone de cadeado fechado (inativo)
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>
        )}

        {/* Botão de Toggle de Tema */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-3 rounded-full backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
          }`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            // Ícone Sol
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            // Ícone Lua
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      {/* 🔔 Toast de Notificação */}
      {showToast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-xl border flex items-center space-x-3 ${
            theme === 'dark'
              ? 'bg-slate-800/95 border-white/10 text-white'
              : 'bg-white/95 border-gray-200 text-gray-900'
          }`}>
            {toastType === 'success' && (
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toastType === 'warning' && (
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toastType === 'error' && (
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header - minimalista */}
      <div className="w-full pt-8 pb-4 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className={`text-3xl font-bold mb-1 transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {company.name}
          </h1>
          <p className={`text-sm tracking-wider uppercase transition-colors ${
            theme === 'dark' ? 'text-white/40' : 'text-gray-500'
          }`}>
            Assistente Virtual com IA
          </p>
        </div>
      </div>

      {/* Área do Orbe - FOCO TOTAL */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl">
          <VoiceAssistantWithWakeWord 
            companyId={company.id} 
            companyName={company.name}
            wakeWord={company.wake_word || 'olá assistente'}
            greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
            theme={theme}
          />
        </div>
      </div>

      {/* Instruções - minimalistas embaixo */}
      <div className={`w-full py-6 px-4 border-t transition-colors ${
        theme === 'dark'
          ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl'
          : 'bg-white/80 border-gray-200 backdrop-blur-xl'
      }`}>
        <div className="max-w-4xl mx-auto">
          
          {/* Instruções compactas */}
          <div className="text-center mb-4">
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <div className={`flex items-center space-x-2 transition-colors ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  theme === 'dark' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-blue-500 text-white'
                }`}>1</span>
                <span>Permita o microfone</span>
              </div>
              
              <div className={`flex items-center space-x-2 transition-colors ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  theme === 'dark' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-blue-500 text-white'
                }`}>2</span>
                <span>Diga: "{company.wake_word}"</span>
              </div>
              
              <div className={`flex items-center space-x-2 transition-colors ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  theme === 'dark' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-blue-500 text-white'
                }`}>3</span>
                <span>Faça sua pergunta</span>
              </div>
              
              <div className={`flex items-center space-x-2 transition-colors ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  theme === 'dark' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-blue-500 text-white'
                }`}>4</span>
                <span>Diga "tchau" para encerrar</span>
              </div>
            </div>
          </div>

          {/* Footer minimalista */}
          <div className={`text-center border-t pt-4 transition-colors ${
            theme === 'dark' ? 'border-white/5' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-center space-x-4 mb-2">
              <Link
                href="https://eai.app.br"
                className={`text-xs font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-orange-600 hover:text-orange-700'
                }`}
              >
                Crie seu assistente
              </Link>
              <span className={theme === 'dark' ? 'text-white/20' : 'text-gray-400'}>|</span>
              <Link
                href="https://eai.app.br/login"
                className={`text-xs font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-orange-600 hover:text-orange-700'
                }`}
              >
                Editar Meu Assistente
              </Link>
            </div>
            <Link
              href="https://bigcorps.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[10px] transition-colors ${
                theme === 'dark'
                  ? 'text-white/30 hover:text-white/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              eAi - Desenvolvido por Bigcorps
            </Link>
          </div>
        </div>
      </div>

      {/* CSS para animações */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
