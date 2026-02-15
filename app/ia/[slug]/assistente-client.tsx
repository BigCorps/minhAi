'use client';

import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import FunctionCarousel from '@/components/assistant/FunctionCarousel';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import DigitalClock from '@/components/ui/DigitalClock';

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
  
  // 🆕 Estado para detectar orientação portrait
  const [isPortrait, setIsPortrait] = useState(false);
  
  // 🆕 ESTADOS PARA MODO KIOSK COM SENHA
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [kioskPassword, setKioskPassword] = useState<string | null>(null);
  const [showPasswordOverlay, setShowPasswordOverlay] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [modalType, setModalType] = useState<'setup' | 'verify'>('setup');
  const [showKioskBadge, setShowKioskBadge] = useState(false); // 🆕 Controla exibição do badge
  const badgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    
    // 🆕 Verificar orientação
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    
    checkMobile();
    checkOrientation();
    
    window.addEventListener('resize', checkMobile);
    window.addEventListener('resize', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', checkOrientation);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // 🆕 BLOQUEAR TECLAS EM MODO KIOSK
  useEffect(() => {
    if (!isKioskMode) return;
    
    const blockKeys = (e: KeyboardEvent) => {
      const blockedKeys = ['F11', 'Escape', 'F5'];
      const blockedCombos = [
        e.altKey && e.key === 'Tab',
        e.altKey && e.key === 'F4',
        e.ctrlKey && e.key === 'w',
        e.ctrlKey && e.key === 'q',
        e.ctrlKey && e.shiftKey && e.key === 'q',
        e.metaKey && e.key === 'q',
      ];
      
      if (blockedKeys.includes(e.key) || blockedCombos.some(combo => combo)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // 🆕 Parar propagação imediata
        showToastMessage('⚠️ Modo protegido ativo', 'warning');
        return false; // 🆕 Garantir bloqueio
      }
    };
    
    // 🆕 Adicionar em múltiplas fases para garantir bloqueio do F11
    window.addEventListener('keydown', blockKeys, { capture: true });
    document.addEventListener('keydown', blockKeys, { capture: true });
    document.body.addEventListener('keydown', blockKeys, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', blockKeys, { capture: true });
      document.removeEventListener('keydown', blockKeys, { capture: true });
      document.body.removeEventListener('keydown', blockKeys, { capture: true });
    };
  }, [isKioskMode]);

  // 🆕 ESCONDER BADGE APÓS 5 SEGUNDOS
  useEffect(() => {
    if (isKioskMode) {
      setShowKioskBadge(true);
      
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current);
      }
      
      badgeTimeoutRef.current = setTimeout(() => {
        setShowKioskBadge(false);
      }, 5000);
    } else {
      setShowKioskBadge(false);
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current);
      }
    }
    
    return () => {
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current);
      }
    };
  }, [isKioskMode]);

  // 🆕 DETECTAR SAÍDA DE FULLSCREEN
  useEffect(() => {
    if (!isKioskMode) return;
    
    const handleFullscreenChange = () => {
      if (isKioskMode && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          showToastMessage('⚠️ Digite a senha para sair', 'warning');
          setModalType('verify');
          setShowPasswordOverlay(true);
        });
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isKioskMode]);

  // 🆕 BLOQUEAR MENU DE CONTEXTO
  useEffect(() => {
    if (!isKioskMode) return;
    
    const blockContext = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    window.addEventListener('contextmenu', blockContext);
    return () => window.removeEventListener('contextmenu', blockContext);
  }, [isKioskMode]);

  // 🆕 BLOQUEAR SCROLL E GESTOS NO MOBILE
  useEffect(() => {
    if (!isKioskMode) return;
    
    // Bloquear scroll
    const preventScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // Bloquear gestos de touch (arrastar para cima/baixo)
    const preventTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        // Bloquear multi-touch (pinch zoom, etc)
        e.preventDefault();
        return;
      }
      
      // Permitir apenas toques na área do app, bloquear arrastar
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      
      // Se não for um elemento interativo, bloquear
      if (!target.closest('button') && !target.closest('input')) {
        e.preventDefault();
      }
    };
    
    // Adicionar estilos para bloquear scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';
    
    // Event listeners
    window.addEventListener('scroll', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventTouch, { passive: false });
    document.addEventListener('touchmove', preventTouch, { passive: false });
    document.body.addEventListener('touchmove', preventTouch, { passive: false });
    
    return () => {
      // Restaurar estilos
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      
      // Remover listeners
      window.removeEventListener('scroll', preventScroll);
      window.removeEventListener('touchmove', preventTouch);
      document.removeEventListener('touchmove', preventTouch);
      document.body.removeEventListener('touchmove', preventTouch);
    };
  }, [isKioskMode]);

  const theme = mounted ? (resolvedTheme as 'dark' | 'light' || 'dark') : 'dark';

  const handleZoomChange = (value: number) => {
    setZoomLevel(value);
  };

  // 🆕 MOSTRAR BADGE TEMPORARIAMENTE (quando usuário tenta sair)
  const showBadgeTemporarily = () => {
    setShowKioskBadge(true);
    
    if (badgeTimeoutRef.current) {
      clearTimeout(badgeTimeoutRef.current);
    }
    
    badgeTimeoutRef.current = setTimeout(() => {
      setShowKioskBadge(false);
    }, 3000); // 3 segundos quando é aviso
  };

  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    
    // 🆕 Se for aviso de modo protegido, mostrar badge também
    if (type === 'warning' && message.includes('protegido')) {
      showBadgeTemporarily();
    }
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

  // 🆕 ENTRAR EM MODO KIOSK (com senha)
  const handleEnterKioskMode = () => {
    setModalType('setup');
    setShowPasswordOverlay(true);
  };

  // 🆕 DEFINIR SENHA E ATIVAR FULLSCREEN
  const handleSetPassword = async () => {
    if (passwordInput.length < 4) {
      showToastMessage('Senha deve ter no mínimo 4 caracteres', 'warning');
      return;
    }
    
    setKioskPassword(passwordInput);
    setPasswordInput('');
    setShowPasswordOverlay(false);
    
    try {
      await document.documentElement.requestFullscreen();
      setIsKioskMode(true);
      setIsMaximized(true);
      setZoomLevel(100);
      setAssistantStarted(false);
      showToastMessage('Modo Kiosk ativado!', 'success');
      
      // Mostrar controles inicialmente
      setShowControls(true);
      setShowCloseButton(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowCloseButton(false);
      }, 5000);
    } catch (error) {
      console.error('Erro ao ativar fullscreen:', error);
      showToastMessage('Erro ao ativar tela cheia. Permita em seu navegador.', 'error');
      setKioskPassword(null);
    }
  };

  // 🆕 TENTAR SAIR (pede senha se estiver em modo kiosk)
  const handleTryExitKiosk = () => {
    if (isKioskMode) {
      setModalType('verify');
      setShowPasswordOverlay(true);
    } else {
      exitKioskMode();
    }
  };

  // 🆕 VERIFICAR SENHA
  const handleVerifyPassword = async () => {
    // TODO: Implementar validação com backend quando disponível
    // const isValid = await validateFullscreenPassword(passwordInput, company.id);
    
    const isValid = passwordInput === kioskPassword;
    
    if (isValid) {
      setPasswordInput('');
      setPasswordError(false);
      setShowPasswordOverlay(false);
      await exitKioskMode();
    } else {
      setPasswordError(true);
      setPasswordInput('');
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  // 🆕 SAIR DO MODO KIOSK
  const exitKioskMode = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Erro ao sair do fullscreen:', error);
    }
    
    setIsKioskMode(false);
    setIsMaximized(false);
    setKioskPassword(null);
    showToastMessage('Modo Kiosk desativado', 'success');
  };

  // MAXIMIZAR NORMAL (sem senha) - mantido para compatibilidade
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
      {/* 🆕 MODAL DE SENHA PARA MODO KIOSK */}
      {showPasswordOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-8 ${
            theme === 'dark' 
              ? 'bg-slate-800 border border-white/10' 
              : 'bg-white border border-gray-200'
          }`}>
            {modalType === 'setup' ? (
              // DEFINIR SENHA
              <>
                <div className="text-center mb-6">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className={`text-2xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Modo Kiosk Protegido
                  </h2>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    Defina uma senha para bloquear a saída do modo tela cheia
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                    }`}>
                      Senha (mínimo 4 caracteres)
                    </label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSetPassword()}
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-white/10 text-white placeholder-white/40'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="••••••••"
                      autoFocus
                    />
                  </div>
                  
                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50'
                  }`}>
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'
                        }`}>
                          Importante
                        </p>
                        <p className={`text-xs mt-1 ${
                          theme === 'dark' ? 'text-yellow-500/80' : 'text-yellow-700'
                        }`}>
                          Guarde esta senha! Ela será necessária para sair do modo tela cheia.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowPasswordOverlay(false);
                        setPasswordInput('');
                      }}
                      className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-white/5 hover:bg-white/10 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSetPassword}
                      disabled={passwordInput.length < 4}
                      className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                        passwordInput.length < 4
                          ? 'bg-gray-400 cursor-not-allowed text-white/50'
                          : 'bg-blue-500 hover:bg-blue-600 text-white active:scale-95'
                      }`}
                    >
                      Ativar Modo Kiosk
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // VERIFICAR SENHA
              <>
                <div className="text-center mb-6">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
                  }`}>
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className={`text-2xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Modo Protegido Ativo
                  </h2>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    Digite a senha para sair do modo tela cheia
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                        passwordError
                          ? 'border-red-500 focus:border-red-500'
                          : 'focus:border-blue-500'
                      } ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-white/10 text-white placeholder-white/40'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="••••••••"
                      autoFocus
                    />
                    {passwordError && (
                      <p className="text-red-500 text-sm mt-2 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Senha incorreta!</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowPasswordOverlay(false)}
                      className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-white/5 hover:bg-white/10 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleVerifyPassword}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-all active:scale-95"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 🆕 BADGE DE MODO KIOSK ATIVO - APARECE POR 5 SEGUNDOS */}
      {showKioskBadge && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9998] pointer-events-none animate-fade-in">
          <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 shadow-lg">
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <span>Modo Protegido Ativo</span>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VERSÃO MAXIMIZADA */}
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
                        ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                        : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'
                    }`}
                    title="Zoom"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </button>
                  
                  {/* Slider + Valor */}
                  <div className={`flex items-center space-x-2 transition-all duration-300 ${
                    showZoomControl && showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                  }`}>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={zoomLevel}
                      onChange={(e) => handleZoomChange(Number(e.target.value))}
                      className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 hover:[&::-webkit-slider-thumb]:bg-blue-600"
                    />
                    <span className={`text-xs font-mono min-w-[3rem] text-right ${
                      theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      {zoomLevel}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 🆕 Relógio Digital Centralizado - VERSÃO MAXIMIZADA */}
              {!isPortrait && (
                <DigitalClock className={`absolute left-1/2 -translate-x-1/2 text-2xl font-bold transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0'
                } ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`} />
              )}
              
              {/* Botão Fechar + Logo eAi (Direita) */}
              <div className="relative flex items-center space-x-3">
                <button
                  onClick={handleTryExitKiosk}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    showCloseButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  } ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-black/10 hover:bg-black/20 text-black'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <Link 
                  href="https://eai.app.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                  title="Visite eAi.app.br"
                >
                  <Image
                    src="/icon192.png"
                    alt="eAi logo"
                    width={36}
                    height={36}
                    className="rounded-lg"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* Orbe + Status (com Zoom aplicado) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pb-24">
            <div 
              style={{ 
                transform: `scale(${zoomLevel / 100})`,
                transition: 'transform 0.2s ease-out'
              }}
            >
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

          {/* Carrossel FIXO no rodapé */}
          {assistantStarted && (
            <div className="fixed bottom-0 left-0 right-0 w-full z-30">
              <FunctionCarousel
                companyId={company.id}
                onFunctionClick={(functionKey) => {
                  window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
                    detail: { functionKey }
                  }));
                }}
                theme={theme}
              />
            </div>
          )}

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
            @keyframes fade-in {
              from {
                opacity: 0;
                transform: translate(-50%, -10px);
              }
              to {
                opacity: 1;
                transform: translate(-50%, 0);
              }
            }
            .animate-slide-down {
              animation: slide-down 0.3s ease-out;
            }
            .animate-fade-in {
              animation: fade-in 0.3s ease-out;
            }
          `}</style>
        </div>
      )}

      {/* ========================================== */}
      {/* VERSÃO NORMAL */}
      {/* ========================================== */}
      {!isMaximized && (
        <div className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
            : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
        }`}>
          
          {/* Header */}
          <header className={`w-full border-b transition-colors ${
            theme === 'dark'
              ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl'
              : 'bg-white/80 border-gray-200 backdrop-blur-xl'
          }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Desktop Layout */}
              <div className="hidden md:flex md:items-center md:justify-between py-4">
                
                {/* LADO ESQUERDO - Desktop */}
                <div className="flex items-center space-x-4">
                  {company.logo_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={company.logo_url}
                        alt={`${company.name} logo`}
                        className="rounded-lg object-contain"
                        style={{ maxHeight: '40px', height: 'auto', width: 'auto', maxWidth: '120px' }}
                      />
                    </div>
                  )}
                  
                  <div className="flex flex-col">
                    <h1 className={`text-xl sm:text-2xl font-bold transition-colors ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {company.name}
                    </h1>
                    <p className={`text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                      theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                    }`}>
                      Assistente Virtual de Voz
                    </p>
                  </div>
                </div>

                {/* 🆕 Relógio Digital Centralizado - VERSÃO NORMAL DESKTOP */}
                {!isPortrait && (
                  <DigitalClock className={`absolute left-1/2 -translate-x-1/2 text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`} />
                )}

                {/* LADO DIREITO - Desktop */}
                <div className="flex items-center space-x-3">
                  
                  <div className="flex items-center space-x-2">
                    
                    {/* 🆕 BOTÃO MODO KIOSK (substitui maximizar) */}
                    <button
                      onClick={handleEnterKioskMode}
                      className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                      } ${isKioskMode ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
                      title={isKioskMode ? "Modo Kiosk Ativo" : "Ativar Modo Kiosk"}
                    >
                      {isKioskMode ? (
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      )}
                    </button>

                    {isSupported && (
                      <button
                        onClick={handleToggleWakeLock}
                        className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                          theme === 'dark'
                            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                        } ${isActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                        title={isActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
                      >
                        {isActive ? (
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </button>
                    )}

                    <button
                      onClick={toggleTheme}
                      className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                      }`}
                      title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                    >
                      {theme === 'dark' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className={`w-px h-10 ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'
                  }`}></div>

                  <Link 
                    href="https://eai.app.br" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    title="Visite eAi.app.br"
                  >
                    <Image
                      src="/icon192.png"
                      alt="eAi logo"
                      width={40}
                      height={40}
                      className="rounded-lg"
                    />
                  </Link>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden py-4 space-y-4">
                
                <div className="relative flex items-center justify-center min-h-[48px] px-4">
                  {company.logo_url && (
                    <div className="absolute left-4 flex-shrink-0">
                      <img
                        src={company.logo_url}
                        alt={`${company.name} logo`}
                        className="rounded-lg object-contain"
                        style={{ maxHeight: '36px', height: 'auto', width: 'auto', maxWidth: '80px' }}
                      />
                    </div>
                  )}
                  
                  <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center text-center">
                    <h1 className={`text-lg font-bold whitespace-nowrap transition-colors ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {company.name}
                    </h1>
                    <p className={`text-[10px] tracking-wider uppercase whitespace-nowrap transition-colors ${
                      theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                    }`}>
                      Assistente Virtual de Voz
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
                  
                  {/* 🆕 BOTÃO MODO KIOSK - Mobile */}
                  <button
                    onClick={handleEnterKioskMode}
                    className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white'
                        : 'bg-black/5 border-black/10 text-black'
                    } ${isKioskMode ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
                    title="Modo Kiosk"
                  >
                    {isKioskMode ? (
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    )}
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

          {/* Orbe + Carrossel */}
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
            @keyframes fade-in {
              from {
                opacity: 0;
                transform: translate(-50%, -10px);
              }
              to {
                opacity: 1;
                transform: translate(-50%, 0);
              }
            }
            .animate-slide-down {
              animation: slide-down 0.3s ease-out;
            }
            .animate-fade-in {
              animation: fade-in 0.3s ease-out;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
