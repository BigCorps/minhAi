'use client';

import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import FunctionCarousel from '@/components/assistant/FunctionCarousel';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useTheme } from 'next-themes';
import Image from 'next/image';

interface AssistenteClientProps {
  company: {
    id: string;
    name: string;
    wake_word: string;
    greeting_message: string;
    logo_url?: string;
  };
}

export default function AssistenteClient({ company }: AssistenteClientProps) {
  const { theme: globalTheme, setTheme: setGlobalTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomControl, setShowZoomControl] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [assistantStarted, setAssistantStarted] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isSupported, isActive, error, requestWakeLock, releaseWakeLock } = useWakeLock();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  // Sincronizar montagem para evitar erros de hidratação
  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // O tema efetivo que será usado pelos componentes
  const theme = mounted ? (resolvedTheme as 'dark' | 'light' || 'dark') : 'dark';

  const handleZoomChange = (value: number) => {
    setZoomLevel(value);
  };

  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleToggleWakeLock = async () => {
    if (!isSupported) {
      showToastMessage('Wake Lock não suportado neste navegador', 'warning');
      return;
    }

    if (isActive) {
      await releaseWakeLock();
      showToastMessage('Tela sempre ligada desativada', 'warning');
    } else {
      const activated = await requestWakeLock();
      if (activated) {
        showToastMessage('Tela sempre ligada ativada!', 'success');
      } else {
        showToastMessage(error || 'Erro ao ativar', 'error');
      }
    }
  };

  const handleToggleMaximize = () => {
    const willMaximize = !isMaximized;
    setIsMaximized(willMaximize);
    setZoomLevel(100);
    setAssistantStarted(false);
    showToastMessage(
      willMaximize ? 'Modo maximizado ativado' : 'Modo normal ativado',
      'success'
    );
    
    if (willMaximize) {
      setShowControls(true);
      setShowCloseButton(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowCloseButton(false);
      }, 5000);
    }
  };

  const toggleTheme = () => {
    setGlobalTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) return null;

  return (
    <>
      {/* ========================================== */}
      {/* VERSÃO MAXIMIZADA (com Zoom) */}
      {/* ========================================== */}
      {isMaximized && (
        <div 
          className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
              : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
          }`}
          onMouseMove={(e) => {
            const isNearTop = e.clientY < 100;
            setShowControls(isNearTop);
            setShowCloseButton(isNearTop);
            
            if (isNearTop && controlsTimeoutRef.current) {
              clearTimeout(controlsTimeoutRef.current);
              controlsTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            setShowControls(false);
            setShowCloseButton(false);
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            const isNearTop = touch.clientY < 100;
            
            if (isNearTop) {
              setShowControls(true);
              setShowCloseButton(true);
              
              if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
              }
              
              controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
                setShowCloseButton(false);
              }, 5000);
            }
          }}
        >
          {/* Header Minimalista */}
          <div className="absolute top-0 left-0 right-0 px-6 py-4 z-20 pointer-events-none">
            <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
              
              {/* Logo Empresa + Zoom Control (Esquerda) */}
              <div className="flex items-center space-x-3">
                {company.logo_url && (
                  <img
                    src={company.logo_url}
                    alt={`${company.name} logo`}
                    className="rounded-lg object-contain"
                    style={{ maxHeight: '36px', height: 'auto', width: 'auto' }}
                  />
                )}
                
                {/* Controle de Zoom */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowZoomControl(!showZoomControl)}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    } ${
                      theme === 'dark'
                        ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                        : 'bg-black/5 hover:bg-black/10 text-black border border-black/10'
                    }`}
                    title="Controlar zoom"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>

                  {showZoomControl && (
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/95 border-white/10 text-white'
                        : 'bg-white/95 border-gray-200 text-gray-900'
                    }`}>
                      <button
                        onClick={() => handleZoomChange(Math.max(50, zoomLevel - 10))}
                        className={`p-1 rounded transition-all ${
                          theme === 'dark'
                            ? 'hover:bg-white/10 text-white'
                            : 'hover:bg-black/10 text-black'
                        }`}
                        disabled={zoomLevel <= 50}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="text-sm font-medium min-w-[3rem] text-center">{zoomLevel}%</span>
                      <button
                        onClick={() => handleZoomChange(Math.min(200, zoomLevel + 10))}
                        className={`p-1 rounded transition-all ${
                          theme === 'dark'
                            ? 'hover:bg-white/10 text-white'
                            : 'hover:bg-black/10 text-black'
                        }`}
                        disabled={zoomLevel >= 200}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Botão Fechar (Direita) */}
              <button
                onClick={handleToggleMaximize}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  showCloseButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
                } ${
                  theme === 'dark'
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                    : 'bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20'
                }`}
                title="Sair do modo tela cheia"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Toast */}
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

          {/* Orbe + Carrossel DENTRO do VoiceAssistant (única renderização) */}
          <div 
            className="flex-1 flex flex-col items-center justify-center py-8"
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center'
            }}
          >
            <div className="w-full max-w-5xl px-4">
              <VoiceAssistantWithWakeWord 
                companyId={company.id} 
                companyName={company.name}
                wakeWord={company.wake_word || 'olá assistente'}
                greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
                theme={theme}
                isMaximized={true}
                onAssistantStart={() => setAssistantStarted(true)}
              />
            </div>
          </div>

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
      )}

      {/* ========================================== */}
      {/* VERSÃO NORMAL (sem Zoom) */}
      {/* ========================================== */}
      {!isMaximized && (
        <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
            : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
        }`}>
          {/* Header Normal */}
          <header className={`w-full py-6 px-4 border-b transition-colors ${
            theme === 'dark'
              ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl'
              : 'bg-white/80 border-gray-200 backdrop-blur-xl'
          }`}>
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {company.logo_url && (
                    <img
                      src={company.logo_url}
                      alt={`${company.name} logo`}
                      className="rounded-lg object-contain"
                      style={{ maxHeight: '48px', height: 'auto', width: 'auto' }}
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h1 className={`text-2xl md:text-3xl font-bold transition-colors truncate ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {company.name}
                    </h1>
                    <p className={`text-sm transition-colors ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                    }`}>
                      Assistente de Voz Inteligente
                    </p>
                  </div>

                  <Link 
                    href="https://eai.app.br" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute right-4 flex-shrink-0 hover:opacity-80 transition-opacity"
                    title="Visite eAi.app.br"
                  >
                    <Image
                      src="/icon192.png"
                      alt="eAi logo"
                      width={32}
                      height={32}
                      className="rounded-lg"
                    />
                  </Link>
                </div>

                <div className="flex items-center justify-center space-x-2">
                  
                  <button
                    onClick={handleToggleMaximize}
                    className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white'
                        : 'bg-black/5 border-black/10 text-black'
                    }`}
                    title="Modo tela cheia"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>

                  {isSupported && (
                    <button
                      onClick={handleToggleWakeLock}
                      className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white'
                          : 'bg-black/5 border-black/10 text-black'
                      } ${isActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                      title={isActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
                    >
                      {isActive ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </button>
                  )}

                  <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white'
                        : 'bg-black/5 border-black/10 text-black'
                    }`}
                    title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                  >
                    {theme === 'dark' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Toast */}
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

          {/* Orbe + Carrossel DENTRO do VoiceAssistant (única renderização) */}
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="w-full max-w-5xl px-4">
              <VoiceAssistantWithWakeWord 
                companyId={company.id} 
                companyName={company.name}
                wakeWord={company.wake_word || 'olá assistente'}
                greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
                theme={theme}
                isMaximized={false}
                onAssistantStart={() => setAssistantStarted(true)}
              />
            </div>
          </div>

          {/* 🚫 CARROSSEL DUPLICADO REMOVIDO - Agora só existe dentro do VoiceAssistantWithWakeWord */}

          {/* Footer */}
          <div className={`w-full py-6 px-4 border-t transition-colors ${
            theme === 'dark'
              ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl'
              : 'bg-white/80 border-gray-200 backdrop-blur-xl'
          }`}>
            <div className="max-w-4xl mx-auto">
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
                    <span>Faça sua solicitação</span>
                  </div>
                  <div className={`flex items-center space-x-2 transition-colors ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      theme === 'dark' 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                        : 'bg-blue-500 text-white'
                    }`}>4</span>
                    <span>Aguarde a resposta.</span>
                  </div>
                </div>
              </div>

              <div className={`text-center border-t pt-4 transition-colors ${
                theme === 'dark' ? 'border-white/5' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-center space-x-4 mb-2">
                  <Link href="https://eai.app.br" className={`text-xs font-medium transition-colors ${
                    theme === 'dark' ? 'text-lime-400 hover:text-blue-300' : 'text-green-600 hover:text-orange-700'
                  }`}>
                    Crie seu assistente
                  </Link>
                  <span className={theme === 'dark' ? 'text-white/20' : 'text-gray-400'}>|</span>
                  <Link href="https://eai.app.br/login" className={`text-xs font-medium transition-colors ${
                    theme === 'dark' ? 'text-lime-400 hover:text-blue-300' : 'text-green-600 hover:text-orange-700'
                  }`}>
                    Editar Meu Assistente
                  </Link>
                </div>
                <Link href="https://bigcorps.com.br" target="_blank" rel="noopener noreferrer" className={`text-[10px] transition-colors ${
                  theme === 'dark' ? 'text-white/30 hover:text-white/50' : 'text-gray-500 hover:text-gray-700'
                }`}>
                  eAi App - Desenvolvido por BigCorps
                </Link>
              </div>
            </div>
          </div>

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
      )}
    </>
  );
}
