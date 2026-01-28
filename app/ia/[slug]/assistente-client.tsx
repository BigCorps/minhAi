'use client';

import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useWakeLock } from '@/hooks/useWakeLock';
import Image from 'next/image';

interface AssistenteClientProps {
  company: {
    id: string;
    name: string;
    wake_word: string;
    greeting_message: string;
    logo_url?: string; // 🆕 Campo para logo da empresa
  };
}

export default function AssistenteClient({ company }: AssistenteClientProps) {
  // Estado do tema (dark por padrão)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMaximized, setIsMaximized] = useState(false); // 🆕 Estado do maximizador
  
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

  // 🆕 Handler para maximizar/minimizar
  const handleToggleMaximize = () => {
    setIsMaximized(!isMaximized);
    showToastMessage(
      isMaximized ? 'Modo normal ativado' : 'Modo maximizado ativado',
      'success'
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
    }`}>
      
      {/* 🆕 NOVO HEADER REDESENHADO */}
      <header className={`w-full border-b transition-colors ${
        theme === 'dark'
          ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl'
          : 'bg-white/80 border-gray-200 backdrop-blur-xl'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
            
            {/* 👈 LADO ESQUERDO: Logo + Nome + Slogan */}
            <div className="flex items-center space-x-4">
              {/* Logo da Empresa */}
              {company.logo_url && (
                <div className="flex-shrink-0">
                  <Image
                    src={company.logo_url}
                    alt={`${company.name} logo`}
                    width={48}
                    height={48}
                    className="rounded-lg object-contain"
                  />
                </div>
              )}
              
              {/* Nome e Slogan */}
              <div className="flex flex-col">
                <h1 className={`text-xl sm:text-2xl font-bold transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {company.name}
                </h1>
                <p className={`text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                  theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                }`}>
                  Assistente Virtual com IA
                </p>
              </div>
            </div>

            {/* 👉 LADO DIREITO: Ícones + Logo eAi */}
            <div className="flex items-center space-x-3">
              
              {/* Grupo de Ícones de Controle */}
              <div className="flex items-center space-x-2">
                
                {/* 🔲 Botão Maximizar */}
                <button
                  onClick={handleToggleMaximize}
                  className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                  } ${isMaximized ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                  aria-label={isMaximized ? 'Modo normal' : 'Maximizar'}
                  title={isMaximized ? 'Sair do modo tela cheia' : 'Modo tela cheia'}
                >
                  {isMaximized ? (
                    // Ícone de minimizar (4 cantos para dentro)
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  ) : (
                    // Ícone de maximizar (4 cantos para fora)
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>

                {/* 🔒 Botão Wake Lock (manter tela ligada) - SÓ APARECE SE SUPORTADO */}
                {isSupported && (
                  <button
                    onClick={handleToggleWakeLock}
                    className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                    } ${isActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                    aria-label={isActive ? 'Desativar tela sempre ligada' : 'Ativar tela sempre ligada'}
                    title={isActive ? 'Tela ligada ativa - clique para desativar' : 'Clique para manter tela sempre ligada'}
                  >
                    {isActive ? (
                      // Ícone de cadeado aberto (ativo) - VERDE
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      // Ícone de cadeado fechado (inativo)
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* 🌙 Botão de Toggle de Tema */}
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                  }`}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    // Ícone Sol
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    // Ícone Lua
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Separador vertical */}
              <div className={`hidden md:block w-px h-10 ${
                theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'
              }`}></div>

              {/* 🎯 Logo eAi */}
              <div className="flex-shrink-0">
                <Image
                  src="/icon192.png"
                  alt="eAi logo"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

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

      {/* Área do Orbe - FOCO TOTAL */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl">
          <VoiceAssistantWithWakeWord 
            companyId={company.id} 
            companyName={company.name}
            wakeWord={company.wake_word || 'olá assistente'}
            greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
            theme={theme}
            isMaximized={isMaximized} // 🆕 Passar estado de maximização
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
