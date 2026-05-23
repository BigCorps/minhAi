'use client';

import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import CategoryCarouselWrapper from '@/components/assistant/CategoryCarouselWrapper';
import TextAssistant from '@/components/assistant/TextAssistant';
import SlugFooter from '@/components/slug/SlugFooter';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useSwipe } from '@/hooks/useSwipe';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import SlugHeaderWrapper from './SlugHeaderWrapper';

interface AssistenteClientProps {
  widgetMode?: boolean;
  company: {
    id: string;
    name: string;
    slug: string;
    wake_word: string;
    greeting_message: string;
    logo_url?: string;
    assistant_role?: string;
    hide_disabled_functions_carousel?: boolean;
    carousel_auto_scroll?: boolean;
    webapp_enabled?: boolean;
    modo_vendas_enabled?: boolean;
    modo_fila_enabled?: boolean;
    modo_links_enabled?: boolean;
    assistant_type?: string;
    startup_function_key?: string | null;
  };
}

export default function AssistenteClient({ company, widgetMode = false }: AssistenteClientProps) {
  const { theme: globalTheme, setTheme: setGlobalTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // B. Substituir isMaximized por mode
  type AssistenteMode = 'padrao' | 'texto' | 'full';
  const [mode, setMode] = useState<AssistenteMode>(widgetMode ? 'texto' : 'padrao');

  // Helper para navegar entre modos (roleta infinita)
  const MODES: AssistenteMode[] = ['full', 'padrao', 'texto'];
const navigateMode = (direction: 'left' | 'right') => {
  if (isModalOpenState) return;

  // ✅ Fechar teclado ao trocar de modo
  window.dispatchEvent(new CustomEvent('eai:virtualKeyboardClose'));

  const currentIndex = MODES.indexOf(mode);
  if (direction === 'left') {
    const newIndex = currentIndex === 0 ? MODES.length - 1 : currentIndex - 1;
    setMode(MODES[newIndex]);
  } else {
    const newIndex = currentIndex === MODES.length - 1 ? 0 : currentIndex + 1;
    setMode(MODES[newIndex]);
  }
};

  const [showCloseButton, setShowCloseButton] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomControl, setShowZoomControl] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [assistantStarted, setAssistantStarted] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textMessageHandlerRef = useRef<((text: string) => Promise<{ text: string; functionKey?: string } | null>) | null>(null);
  
  const [isPortrait, setIsPortrait] = useState(false);
  
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [kioskPassword, setKioskPassword] = useState<string | null>(null);
  const [showKioskBadge, setShowKioskBadge] = useState(false);
  const badgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const anyModalOpenRef = useRef(false);
  const isExitingKioskRef = useRef(false);
  const [isModalOpenState, setIsModalOpenState] = useState(false);
  const isPrintingRef = useRef(false);
  
  const { isSupported, isActive, error, requestWakeLock, releaseWakeLock } = useWakeLock();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  // C. Swipe para navegar entre modos
const isModalOpenRef = useRef(false);
useEffect(() => {
  isModalOpenRef.current = isModalOpenState;
}, [isModalOpenState]);

useSwipe({
  onSwipeLeft: () => { if (!widgetMode && !isModalOpenRef.current) navigateMode('right'); },
  onSwipeRight: () => { if (!widgetMode && !isModalOpenRef.current) navigateMode('left'); },
});

  // C. Navegação por teclado (setas ← →)
  useEffect(() => {
const handleKeyPress = (e: KeyboardEvent) => {
  if (widgetMode || isModalOpenRef.current) return;
  if (e.key === 'ArrowLeft') {
    navigateMode('left');
  } else if (e.key === 'ArrowRight') {
    navigateMode('right');
  }
};

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [mode]);

useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    const handleRequestKiosk = () => {
      handleEnterKioskMode();
    };

    // ← ADICIONADO:
    const handleRequestExitKiosk = () => {
      handleTryExitKiosk();
    };

    // FIX: SlugHeaderWrapper confirma saída do kiosk (funciona em qualquer página)
    // Sincroniza o state do AssistenteClient quando a saída foi feita pelo wrapper
    const handleKioskExitConfirmed = () => {
      setIsKioskMode(false);
      setKioskPassword(null);
      setMode('padrao');
    };
    window.addEventListener('eai:kioskExitConfirmed', handleKioskExitConfirmed);

    // ✅ FIX: Sincronizar isKioskMode quando o evento é disparado de qualquer lugar
    // (SlugHeaderWrapper, console, ou outros componentes)
    const handleKioskModeChange = (e: CustomEvent) => {
      const { active, password } = e.detail || {};
      if (active !== undefined) {
        setIsKioskMode(active);
        if (active && password) {
          setKioskPassword(password);
        } else if (!active) {
          setKioskPassword(null);
        }
      }
    };
    window.addEventListener('eai:kioskModeChange', handleKioskModeChange as EventListener);

    // Quando SlugHeaderWrapper vai sair do fullscreen por conta própria (outras páginas),
    // suspende o handler de fullscreenchange para não re-entrar em fullscreen em touch
    const handleKioskWillExit = () => {
      isExitingKioskRef.current = true;
      setTimeout(() => { isExitingKioskRef.current = false; }, 1500);
    };
    window.addEventListener('eai:kioskWillExit', handleKioskWillExit);
  
    checkMobile();
    checkOrientation();
    
    window.addEventListener('resize', checkMobile);
    window.addEventListener('resize', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('eai:requestKioskMode', handleRequestKiosk);
      window.removeEventListener('eai:requestExitKioskMode', handleRequestExitKiosk); // ← agora existe
      window.removeEventListener('eai:kioskExitConfirmed', handleKioskExitConfirmed);
      window.removeEventListener('eai:kioskModeChange', handleKioskModeChange as EventListener); // ✅ NOVO
      window.removeEventListener('eai:kioskWillExit', handleKioskWillExit);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
const onOpen  = () => { anyModalOpenRef.current = true; setIsModalOpenState(true); };
const onClose = () => {
  setTimeout(() => { anyModalOpenRef.current = false; }, 300);
  setIsModalOpenState(false);
};
    window.addEventListener('eai:modalOpen',  onOpen);
    window.addEventListener('eai:modalClose', onClose);
    return () => {
      window.removeEventListener('eai:modalOpen',  onOpen);
      window.removeEventListener('eai:modalClose', onClose);
    };
  }, []);

useEffect(() => {
  const handleBefore = () => { isPrintingRef.current = true; };
  const handleAfter  = () => { isPrintingRef.current = false; };
  window.addEventListener('beforeprint', handleBefore);
  window.addEventListener('afterprint',  handleAfter);
  return () => {
    window.removeEventListener('beforeprint', handleBefore);
    window.removeEventListener('afterprint',  handleAfter);
  };
}, []);

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
        e.stopImmediatePropagation();
        showToastMessage('⚠️ Modo protegido ativo', 'warning');
        return false;
      }
    };
    
    window.addEventListener('keydown', blockKeys, { capture: true });
    document.addEventListener('keydown', blockKeys, { capture: true });
    document.body.addEventListener('keydown', blockKeys, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', blockKeys, { capture: true });
      document.removeEventListener('keydown', blockKeys, { capture: true });
      document.body.removeEventListener('keydown', blockKeys, { capture: true });
    };
  }, [isKioskMode]);

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

  useEffect(() => {
    if (!isKioskMode) return;
    
    const blockContext = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    window.addEventListener('contextmenu', blockContext);
    return () => window.removeEventListener('contextmenu', blockContext);
  }, [isKioskMode]);

  useEffect(() => {
    if (!isKioskMode) {
      // Rede de segurança: garante limpeza dos estilos caso o usuário saia
      // pelo Esc ou outro caminho que não passe pelo exitKioskMode
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      return;
    }
    
    const preventScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    const preventTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        return;
      }
      
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      
      if (!target.closest('button') && !target.closest('input')) {
        e.preventDefault();
      }
    };
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';
    
    window.addEventListener('scroll', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventTouch, { passive: false });
    document.addEventListener('touchmove', preventTouch, { passive: false });
    document.body.addEventListener('touchmove', preventTouch, { passive: false });
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      
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

  const showBadgeTemporarily = () => {
    setShowKioskBadge(true);
    
    if (badgeTimeoutRef.current) {
      clearTimeout(badgeTimeoutRef.current);
    }
    
    badgeTimeoutRef.current = setTimeout(() => {
      setShowKioskBadge(false);
    }, 3000);
  };

  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    
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

  // D. exitKioskMode - atualizado para usar setMode('padrao')
  const exitKioskMode = async () => {
    isExitingKioskRef.current = true; // avisa o fullscreenchange handler antes de sair
    try {
      // Só chama exitFullscreen se ainda estiver em fullscreen — evita rejeição da promessa
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Erro ao sair do fullscreen:', error);
    }
    isExitingKioskRef.current = false; // reset após sair do fullscreen

    // Remove explicitamente os bloqueios de CSS ANTES do setIsKioskMode
    // para evitar janela onde o layout ainda está travado após o fullscreen sair
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.touchAction = '';
    document.documentElement.style.overflow = '';

    setIsKioskMode(false);
    window.dispatchEvent(new CustomEvent('eai:kioskModeChange', { detail: { active: false } }));
    setMode('padrao'); // D. era: setIsMaximized(false)
    setKioskPassword(null);
    showToastMessage('Modo Kiosk desativado', 'success');
  };

  // D. handleToggleMaximize - atualizado para usar mode
  const handleToggleMaximize = () => {
    const willMaximize = mode !== 'full'; // D. era: !isMaximized
    setMode(willMaximize ? 'full' : 'padrao'); // D. era: setIsMaximized(willMaximize)
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

      {/* BADGE DE MODO KIOSK ATIVO */}
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

{/* H. Setas laterais de navegação entre modos */}
{!widgetMode && (
  <>
    {/* Seta esquerda */}
        <button
          onClick={() => navigateMode('left')}
          className={`fixed left-2 md:left-4 top-1/2 -translate-y-1/2 z-[60] p-1.5 md:p-3 rounded-full transition-all ${
            theme === 'dark'
              ? 'bg-white/5 hover:bg-white/20 text-white/40 hover:text-white md:bg-white/10'
              : 'bg-black/5 hover:bg-black/20 text-gray-900/40 hover:text-gray-900 md:bg-black/10'
          }`}
          title="Modo anterior (←)"
        >
          <svg className="w-3 h-3 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Seta direita */}
        <button
          onClick={() => navigateMode('right')}
          className={`fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-[60] p-1.5 md:p-3 rounded-full transition-all ${
            theme === 'dark'
              ? 'bg-white/5 hover:bg-white/20 text-white/40 hover:text-white md:bg-white/10'
              : 'bg-black/5 hover:bg-black/20 text-gray-900/40 hover:text-gray-900 md:bg-black/10'
          }`}
          title="Próximo modo (→)"
        >
          <svg className="w-3 h-3 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </>
  )}

      {/* ========================================== */}
      {/* D. VERSÃO FULL */}
      {/* ========================================== */}
      {mode === 'full' && (
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
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
            <div className={`max-w-7xl mx-auto flex items-center px-6 py-4 pointer-events-auto ${
              company.logo_url ? 'justify-between' : 'justify-end'
            }`}>

              {/* ESQUERDA: Logo + Zoom */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                {company.logo_url && (
                  <img
                    src={company.logo_url}
                    alt={`${company.name} logo`}
                    className="rounded-lg object-contain"
                    style={{ maxHeight: '36px', height: 'auto', width: 'auto' }}
                  />
                )}

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

              {/* DIREITA: SlugHeaderWrapper em overlayMode */}
              <div className="flex-shrink-0">
                <SlugHeaderWrapper
                  company={company}
                  slug={company.slug}    // ← ADICIONAR
                  pageType="ia"     
                  overlayMode={true}
                  onClose={undefined}
                  showControls={showCloseButton}
                />
              </div>

            </div>
          </div>

          {/* Orbe + Status (com Zoom aplicado) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-16 pb-24">
            <div
              className="relative"
              style={{ 
                transform: `scale(${zoomLevel / 100})`,
                transition: 'transform 0.2s ease-out'
              }}
            >
              <VoiceAssistantWithWakeWord 
                companyId={company.id} 
                companyName={company.name}
                slug={company.slug}
                wakeWord={company.wake_word || 'olá assistente'}
                greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
                theme={theme}
                isMaximized={true}
                onAssistantStart={() => setAssistantStarted(true)}
                hideDisabledFunctions={company.hide_disabled_functions_carousel}
                autoScroll={company.carousel_auto_scroll}
                isKioskMode={isKioskMode}
                isVendas={company.assistant_type === 'vendas'}
                startupFunctionKey={company.startup_function_key ?? undefined}
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
      {/* G. VERSÃO NORMAL (padrao + texto) */}
      {/* ========================================== */}
      {mode !== 'full' && (
        <div className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
            : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
        }`}>

          {/* SlugHeader */}
          {/* No modo texto, o TextAssistant usa fixed inset-0, então o header
              precisa ser fixed com z-index superior para ficar visível acima dele */}
          <div className={mode === 'texto' ? 'fixed top-0 left-0 right-0 z-50' : ''}>
            <SlugHeaderWrapper
              company={company}
              slug={company.slug}    // ← ADICIONAR
              pageType="ia"   
              overlayMode={false}
            />
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

          {/* G. CONTEÚDO VARIÁVEL POR MODO */}
          {mode === 'padrao' && (
            <div className="flex-1 flex flex-col items-center justify-center py-8 pb-32">
              <div className="relative w-full max-w-5xl px-4">
                <VoiceAssistantWithWakeWord 
                  companyId={company.id} 
                  companyName={company.name}
                  slug={company.slug}
                  wakeWord={company.wake_word || 'olá assistente'}
                  greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
                  theme={theme}
                  isMaximized={false}
                  onAssistantStart={() => setAssistantStarted(true)}
                  hideDisabledFunctions={company.hide_disabled_functions_carousel}
                  autoScroll={company.carousel_auto_scroll}
                  isKioskMode={isKioskMode}
                  isVendas={company.assistant_type === 'vendas'}
                  startupFunctionKey={company.startup_function_key ?? undefined}
                  onTextMessage={(handler) => {
                    textMessageHandlerRef.current = handler;
                  }}
                />
              </div>
            </div>
          )}

{/* VoiceAssistant oculto no modo texto — processa mensagens, mantém modais e GROQ ativos */}
{mode === 'texto' && (
  <div style={{ position: 'fixed', width: 0, height: 0, overflow: 'visible', pointerEvents: 'none' }}>
    <VoiceAssistantWithWakeWord
      companyId={company.id}
      companyName={company.name}
      slug={company.slug}
      wakeWord={company.wake_word || 'olá assistente'}
      greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
      theme={theme}
      isMaximized={false}
      onAssistantStart={() => setAssistantStarted(true)}
      hideDisabledFunctions={company.hide_disabled_functions_carousel}
      autoScroll={company.carousel_auto_scroll}
      isKioskMode={isKioskMode}
      isVendas={company.assistant_type === 'vendas'}
      startupFunctionKey={company.startup_function_key ?? undefined}
      textMode={true}
      onTextMessage={(handler) => {
        textMessageHandlerRef.current = handler;
      }}
    />
  </div>
)}

{mode === 'texto' && (
  <TextAssistant
    companyId={company.id}
    theme={theme}
    slug={company.slug}
    onSendMessage={async (text) => {
      if (textMessageHandlerRef.current) {
        return await textMessageHandlerRef.current(text);
      }
      return null;
    }}
  />
)}

        </div>
      )}

      {/* ── SEMPRE MONTADOS — nunca reinicializam ao trocar de modo ── */}

{assistantStarted && !widgetMode && (
  <div
    data-no-swipe
    className={`fixed bottom-8 left-0 right-0 z-[55] transition-all duration-500 ease-in-out ${
      isModalOpenState ? 'opacity-0 pointer-events-none translate-y-10' : 'opacity-100 translate-y-0'
    }`}
  >
    <CategoryCarouselWrapper
            companyId={company.id}
            onFunctionClick={(functionKey) => {
              window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
                detail: { functionKey }
              }));
            }}
            theme={theme}
            hideDisabledFunctions={company.hide_disabled_functions_carousel}
            autoScroll={company.carousel_auto_scroll}
            isVendas={company.assistant_type === 'vendas'}
            startupFunctionKey={company.startup_function_key ?? undefined}
          />
        </div>
      )}

      {/* Footer - SEM wrapper, gerencia próprio z-index */}
      <SlugFooter
        theme={theme}
        slug={company.slug}
        webapp_enabled={company.webapp_enabled}
      />

    </>
  );
}
