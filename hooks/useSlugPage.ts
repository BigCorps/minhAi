'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useSwipe } from '@/hooks/useSwipe';

// Tipos compartilhados
export type AssistenteMode = 'padrao' | 'texto' | 'full';

export function useSlugPage() {
  const { theme: globalTheme, setTheme: setGlobalTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Modo do assistente (roleta infinita: texto → padrao → full)
  const [mode, setMode] = useState<AssistenteMode>('padrao');
  
  // Kiosk mode
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [kioskPassword, setKioskPassword] = useState<string | null>(null);
  const [showPasswordOverlay, setShowPasswordOverlay] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [modalType, setModalType] = useState<'setup' | 'verify'>('setup');
  const [showKioskBadge, setShowKioskBadge] = useState(false);
  
  // UI States
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomControl, setShowZoomControl] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [assistantStarted, setAssistantStarted] = useState(false);
  
  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  
  // Refs
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const badgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const anyModalOpenRef = useRef(false);
  const textMessageHandlerRef = useRef<((text: string) => Promise<{ text: string; functionKey?: string } | null>) | null>(null);
  
  // Wake Lock
  const { isSupported, isActive, error, requestWakeLock, releaseWakeLock } = useWakeLock();

  // Tema derivado
  const theme = mounted ? (resolvedTheme as 'dark' | 'light') : 'dark';

  // Helper para navegar entre modos (roleta infinita)
  const MODES: AssistenteMode[] = ['texto', 'padrao', 'full'];
  const navigateMode = (direction: 'left' | 'right') => {
    const currentIndex = MODES.indexOf(mode);
    if (direction === 'left') {
      const newIndex = currentIndex === 0 ? MODES.length - 1 : currentIndex - 1;
      setMode(MODES[newIndex]);
    } else {
      const newIndex = currentIndex === MODES.length - 1 ? 0 : currentIndex + 1;
      setMode(MODES[newIndex]);
    }
  };

  // Swipe para navegar entre modos
  useSwipe({
    onSwipeLeft: () => navigateMode('right'),
    onSwipeRight: () => navigateMode('left'),
  });

  // Navegação por teclado (setas ← →)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateMode('left');
      } else if (e.key === 'ArrowRight') {
        navigateMode('right');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [mode]);

  // Detectar mobile e orientação
  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
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

  // Event listeners para modal open/close
  useEffect(() => {
    const onOpen  = () => { anyModalOpenRef.current = true; };
    const onClose = () => {
      setTimeout(() => {
        anyModalOpenRef.current = false;
      }, 300);
    };
    window.addEventListener('eai:modalOpen',  onOpen);
    window.addEventListener('eai:modalClose', onClose);
    return () => {
      window.removeEventListener('eai:modalOpen',  onOpen);
      window.removeEventListener('eai:modalClose', onClose);
    };
  }, []);

  // Toast helper
  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Toggle theme
  const toggleTheme = () => {
    setGlobalTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Toggle wake lock
  const toggleWakeLock = async () => {
    if (isActive) {
      await releaseWakeLock();
      showToastMessage('Tela pode desligar normalmente', 'success');
    } else {
      await requestWakeLock();
      showToastMessage('Tela permanecerá sempre ligada', 'success');
    }
  };

  return {
    // Estados
    theme,
    mounted,
    mode,
    isKioskMode,
    kioskPassword,
    showPasswordOverlay,
    passwordInput,
    passwordError,
    modalType,
    showKioskBadge,
    showCloseButton,
    showControls,
    zoomLevel,
    showZoomControl,
    isMobile,
    isPortrait,
    assistantStarted,
    showToast,
    toastMessage,
    toastType,
    
    // Wake Lock
    wakeLock: {
      isSupported,
      isActive,
      error,
    },
    
    // Refs
    controlsTimeoutRef,
    badgeTimeoutRef,
    anyModalOpenRef,
    textMessageHandlerRef,
    
    // Setters
    setMode,
    setIsKioskMode,
    setKioskPassword,
    setShowPasswordOverlay,
    setPasswordInput,
    setPasswordError,
    setModalType,
    setShowKioskBadge,
    setShowCloseButton,
    setShowControls,
    setZoomLevel,
    setShowZoomControl,
    setAssistantStarted,
    
    // Helpers
    navigateMode,
    showToastMessage,
    toggleTheme,
    toggleWakeLock,
  };
}
