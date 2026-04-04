'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useSwipe } from '@/hooks/useSwipe';

import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import CategoryCarousel from '@/components/assistant/CategoryCarousel';
import TextAssistant from '@/components/assistant/TextAssistant';
import SlugFooter from '@/components/slug/SlugFooter';
import SlugHeaderWrapper from './SlugHeaderWrapper';
import FullModeLayout from '@/components/assistant/FullModeLayout';

interface AssistenteClientProps {
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
  };
}

export default function AssistenteClient({ company }: AssistenteClientProps) {
  const { setTheme: setGlobalTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  type AssistenteMode = 'padrao' | 'texto' | 'full';
  const [mode, setMode] = useState<AssistenteMode>('padrao');

  const MODES: AssistenteMode[] = ['full', 'padrao', 'texto'];
  const navigateMode = (direction: 'left' | 'right') => {
    setMode(prev => {
      const currentIndex = MODES.indexOf(prev);
      if (direction === 'left') {
        return MODES[currentIndex === 0 ? MODES.length - 1 : currentIndex - 1];
      } else {
        return MODES[currentIndex === MODES.length - 1 ? 0 : currentIndex + 1];
      }
    });
  };

  const [isMobile, setIsMobile] = useState(false);
  const [assistantStarted, setAssistantStarted] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textMessageHandlerRef = useRef<
    ((text: string) => Promise<{ text: string; functionKey?: string } | null>) | null
  >(null);

  const [isKioskMode, setIsKioskMode] = useState(false);
  const [kioskPassword, setKioskPassword] = useState<string | null>(null);
  const [showPasswordOverlay, setShowPasswordOverlay] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [modalType, setModalType] = useState<'setup' | 'verify'>('setup');
  const [showKioskBadge, setShowKioskBadge] = useState(false);
  const badgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const anyModalOpenRef = useRef(false);

  const { isSupported, isActive, error, requestWakeLock, releaseWakeLock } = useWakeLock();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  // ── Swipe e teclado ────────────────────────────────────────
  useSwipe({
    onSwipeLeft: () => navigateMode('right'),
    onSwipeRight: () => navigateMode('left'),
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigateMode('left');
      else if (e.key === 'ArrowRight') navigateMode('right');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── Inicialização ──────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleRequestKiosk = () => handleEnterKioskMode();
    window.addEventListener('eai:requestKioskMode', handleRequestKiosk);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('eai:requestKioskMode', handleRequestKiosk);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const onOpen  = () => { anyModalOpenRef.current = true; };
    const onClose = () => { setTimeout(() => { anyModalOpenRef.current = false; }, 300); };
    window.addEventListener('eai:modalOpen',  onOpen);
    window.addEventListener('eai:modalClose', onClose);
    return () => {
      window.removeEventListener('eai:modalOpen',  onOpen);
      window.removeEventListener('eai:modalClose', onClose);
    };
  }, []);

  // ── Kiosk: bloqueio de teclado ─────────────────────────────
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
      if (blockedKeys.includes(e.key) || blockedCombos.some(Boolean)) {
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

  // ── Kiosk: badge temporário ────────────────────────────────
  useEffect(() => {
    if (isKioskMode) {
      setShowKioskBadge(true);
      if (badgeTimeoutRef.current) clearTimeout(badgeTimeoutRef.current);
      badgeTimeoutRef.current = setTimeout(() => setShowKioskBadge(false), 5000);
    } else {
      setShowKioskBadge(false);
      if (badgeTimeoutRef.current) clearTimeout(badgeTimeoutRef.current);
    }
    return () => { if (badgeTimeoutRef.current) clearTimeout(badgeTimeoutRef.current); };
  }, [isKioskMode]);

  // ── Kiosk: reforçar fullscreen ─────────────────────────────
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

  // ── Kiosk: bloquear contexto e scroll ─────────────────────
  useEffect(() => {
    if (!isKioskMode) return;
    const blockContext = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', blockContext);
    return () => window.removeEventListener('contextmenu', blockContext);
  }, [isKioskMode]);

  useEffect(() => {
    if (!isKioskMode) return;
    const preventScroll = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const preventTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) { e.preventDefault(); return; }
      const target = e.target as HTMLElement;
      if (!target.closest('button') && !target.closest('input')) e.preventDefault();
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

  // ── Helpers ────────────────────────────────────────────────
  const theme = mounted ? (resolvedTheme as 'dark' | 'light' ?? 'dark') : 'dark';

  const showBadgeTemporarily = () => {
    setShowKioskBadge(true);
    if (badgeTimeoutRef.current) clearTimeout(badgeTimeoutRef.current);
    badgeTimeoutRef.current = setTimeout(() => setShowKioskBadge(false), 3000);
  };

  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    if (type === 'warning' && message.includes('protegido')) showBadgeTemporarily();
  };

  const handleToggleWakeLock = async () => {
    if (!isSupported) { showToastMessage('Wake Lock não suportado neste navegador', 'warning'); return; }
    if (isActive) {
      await releaseWakeLock();
      showToastMessage('Tela sempre ligada desativada', 'warning');
    } else {
      const activated = await requestWakeLock();
      if (activated) showToastMessage('Tela sempre ligada ativada!', 'success');
      else showToastMessage(error || 'Erro ao ativar', 'error');
    }
  };

  const handleEnterKioskMode = () => {
    setModalType('setup');
    setShowPasswordOverlay(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
  };

  const handleSetPassword = async () => {
    if (passwordInput.length < 4) { showToastMessage('Senha deve ter no mínimo 4 caracteres', 'warning'); return; }
    setKioskPassword(passwordInput);
    setPasswordInput('');
    setShowPasswordOverlay(false);
    window.dispatchEvent(new CustomEvent('eai:modalClose'));
    try {
      await document.documentElement.requestFullscreen();
      setIsKioskMode(true);
      window.dispatchEvent(new CustomEvent('eai:kioskModeChange', { detail: { active: true } }));
      setAssistantStarted(false);
      showToastMessage('Modo Kiosk ativado!', 'success');
    } catch {
      showToastMessage('Erro ao ativar tela cheia. Permita em seu navegador.', 'error');
      setKioskPassword(null);
    }
  };

  const handleVerifyPassword = async () => {
    if (passwordInput === kioskPassword) {
      setPasswordInput('');
      setPasswordError(false);
      setShowPasswordOverlay(false);
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
      await exitKioskMode();
    } else {
      setPasswordError(true);
      setPasswordInput('');
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  const exitKioskMode = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
    setIsKioskMode(false);
    window.dispatchEvent(new CustomEvent('eai:kioskModeChange', { detail: { active: false } }));
    setMode('padrao');
    setKioskPassword(null);
    showToastMessage('Modo Kiosk desativado', 'success');
  };

  if (!mounted) return null;

  // ── Props compartilhadas do VoiceAssistant ─────────────────
  const voiceAssistantProps = {
    companyId: company.id,
    companyName: company.name,
    slug: company.slug,
    wakeWord: company.wake_word || 'olá assistente',
    greetingMessage: company.greeting_message || 'Olá! Como posso ajudar você hoje?',
    theme,
    hideDisabledFunctions: company.hide_disabled_functions_carousel,
    autoScroll: company.carousel_auto_scroll,
    onAssistantStart: () => setAssistantStarted(true),
    onTextMessage: (handler: (text: string) => Promise<{ text: string; functionKey?: string } | null>) => {
      textMessageHandlerRef.current = handler;
    },
  };

  return (
    <>
      {/* ── Modal de senha Kiosk ──────────────────────────── */}
      {showPasswordOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl shadow-2xl overflow-hidden ${
            isMobile ? 'max-w-md w-full' : 'max-w-5xl w-full max-h-[85vh]'
          } ${
            theme === 'dark' ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <div className={isMobile ? 'flex flex-col p-6' : 'flex flex-row'}>

              {/* Lado esquerdo */}
              <div className={`${
                isMobile ? 'mb-6' : 'w-2/5 p-8 border-r'
              } ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className={`w-20 h-20 rounded-full mb-4 flex items-center justify-center ${
                    modalType === 'setup'
                      ? theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                      : theme === 'dark' ? 'bg-red-500/20'  : 'bg-red-100'
                  }`}>
                    <svg className={`w-10 h-10 ${modalType === 'setup' ? 'text-blue-500' : 'text-red-500'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className={`text-2xl md:text-3xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {modalType === 'setup' ? 'Modo Kiosk Protegido' : 'Modo Protegido Ativo'}
                  </h2>
                  <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                    {modalType === 'setup'
                      ? 'Defina uma senha para bloquear a saída do modo tela cheia'
                      : 'Digite a senha para sair do modo tela cheia'}
                  </p>
                  {!isMobile && (
                    <div className="mt-6 opacity-20">
                      <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Lado direito */}
              <div className={isMobile ? 'flex-1' : 'w-3/5 p-8'}>
                {modalType === 'setup' ? (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white/80' : 'text-gray-700'}`}>
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
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50'}`}>
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                            💡 Bloqueio Total Recomendado
                          </p>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-yellow-500/80' : 'text-yellow-700'}`}>
                            Para segurança máxima em ambientes públicos, configure o{' '}
                            <strong>Modo Kiosk no sistema operacional</strong>. Este bloqueio via navegador tem
                            limitações (F11, Task Manager podem funcionar).
                          </p>
                        </div>
                      </div>
                    </div>
                    <a
                      href="/kiosk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg border transition-all text-sm font-medium ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>🔗 Ver Guia Completo de Configuração</span>
                    </a>
                    <div className={`p-4 rounded-lg border-2 ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-start space-x-2">
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-800'}`}>Importante</p>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-blue-500/80' : 'text-blue-700'}`}>
                            Guarde esta senha! Ela será necessária para sair do modo tela cheia.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={() => { setShowPasswordOverlay(false); setPasswordInput(''); window.dispatchEvent(new CustomEvent('eai:modalClose')); }}
                        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                          theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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
                ) : (
                  <div className="space-y-4">
                    <div>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
                        className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                          passwordError ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
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
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                        💡 <strong>Esqueceu a senha?</strong> Será necessário recarregar a página e reconfigurar o modo kiosk.
                      </p>
                    </div>
                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={() => { setShowPasswordOverlay(false); window.dispatchEvent(new CustomEvent('eai:modalClose')); }}
                        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                          theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Badge Kiosk ───────────────────────────────────── */}
      {showKioskBadge && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9998] pointer-events-none">
          <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 shadow-lg">
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <span>Modo Protegido Ativo</span>
          </div>
        </div>
      )}

      {/* ── Setas de navegação ────────────────────────────── */}
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

      {/* ══════════════════════════════════════════════════════
          MODO FULL — wrapper visual apenas, VoiceAssistant
          vive abaixo junto com os demais sempre montados
      ══════════════════════════════════════════════════════ */}
      {mode === 'full' && (
        <FullModeLayout
          company={company}
          theme={theme}
          showToast={showToast}
          toastMessage={toastMessage}
          toastType={toastType}
          isKioskMode={isKioskMode}
        >
          <VoiceAssistantWithWakeWord
            {...voiceAssistantProps}
            isMaximized={true}
          />
        </FullModeLayout>
      )}

      {/* ══════════════════════════════════════════════════════
          MODO NORMAL (padrao + texto)
          Header e toast ficam aqui; VoiceAssistant abaixo
      ══════════════════════════════════════════════════════ */}
      {mode !== 'full' && (
        <div className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
            : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
        }`}>
          {/* Header */}
          <div className={mode === 'texto' ? 'fixed top-0 left-0 right-0 z-50' : ''}>
            <SlugHeaderWrapper company={company} overlayMode={false} />
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

          {/* VoiceAssistant — modo padrão (visível) */}
          {mode === 'padrao' && (
            <div className="flex-1 flex flex-col items-center justify-center py-8 pb-32">
              <div className="relative w-full max-w-5xl px-4">
                <VoiceAssistantWithWakeWord
                  {...voiceAssistantProps}
                  isMaximized={false}
                />
              </div>
            </div>
          )}

          {/* VoiceAssistant — modo texto (oculto, mantém estado) */}
          {mode === 'texto' && (
            <div className="hidden">
              <VoiceAssistantWithWakeWord
                {...voiceAssistantProps}
                isMaximized={false}
                textMode={true}
              />
            </div>
          )}

          {/* TextAssistant — modo texto */}
          {mode === 'texto' && (
            <TextAssistant
              companyId={company.id}
              theme={theme}
              slug={company.slug}
              onSendMessage={async (text) => {
                if (textMessageHandlerRef.current) return await textMessageHandlerRef.current(text);
                return null;
              }}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SEMPRE MONTADOS — carrossel e footer nunca reiniciam
          z-index acima do conteúdo mas abaixo de modais
      ══════════════════════════════════════════════════════ */}
      {assistantStarted && (
        <div className="fixed bottom-8 left-0 right-0 z-[55]">
          <CategoryCarousel
            companyId={company.id}
            onFunctionClick={(functionKey) => {
              window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
                detail: { functionKey },
              }));
            }}
            theme={theme}
            hideDisabledFunctions={company.hide_disabled_functions_carousel}
            autoScroll={company.carousel_auto_scroll}
          />
        </div>
      )}

      <SlugFooter
        theme={theme}
        slug={company.slug}
        webapp_enabled={company.webapp_enabled}
      />

      <style jsx global>{`
        @keyframes slide-down {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
      `}</style>
    </>
  );
}
