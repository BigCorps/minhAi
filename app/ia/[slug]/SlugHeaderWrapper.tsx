'use client';

// ============================================================
// app/ia/[slug]/SlugHeaderWrapper.tsx
// ============================================================

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useWakeLock } from '@/hooks/useWakeLock';
import SlugHeader from '@/components/slug/SlugHeader';

interface SlugHeaderWrapperProps {
  company: {
    id: string;
    name: string;
    logo_url?: string | null;
    assistant_role?: string | null;
    webapp_theme_color?: string | null;
  };
  overlayMode?: boolean;
  forceTheme?: 'dark' | 'light';
  onClose?: () => void;
  // Controla visibilidade dos botões no overlayMode
  // Desktop: via hover no topo | Mobile: via toque no topo
  showControls?: boolean;
}

export default function SlugHeaderWrapper({
  company,
  overlayMode = false,
  forceTheme,
  onClose,
  showControls = false,
}: SlugHeaderWrapperProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const { isSupported, isActive, requestWakeLock, releaseWakeLock } = useWakeLock();

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setMounted(true);

    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    const handleKioskChange = (e: CustomEvent) => {
      setIsKioskMode(e.detail?.active ?? false);
    };
    window.addEventListener('eai:kioskModeChange', handleKioskChange as EventListener);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('eai:kioskModeChange', handleKioskChange as EventListener);
    };
  }, []);

  const theme = forceTheme ?? (mounted ? (resolvedTheme as 'dark' | 'light' ?? 'dark') : 'dark');

  const handleToggleTheme = () => {
    if (forceTheme) return;
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleToggleWakeLock = async () => {
    if (isActive) {
      await releaseWakeLock();
      showToast('Tela sempre ligada desativada', 'warning');
    } else {
      const activated = await requestWakeLock();
      if (activated) {
        showToast('Tela sempre ligada ativada!', 'success');
      } else {
        showToast('Erro ao ativar wake lock', 'error');
      }
    }
  };

  const handleEnterKioskMode = () => {
    window.dispatchEvent(new CustomEvent('eai:requestKioskMode'));
  };

  const handleToggleModoVenda = () => {
    window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
      detail: { functionKey: 'modo_venda' },
    }));
  };

  if (!mounted) {
    return (
      <header className={`w-full border-b ${
        overlayMode
          ? 'bg-transparent border-transparent'
          : 'bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80 border-white/5 backdrop-blur-xl'
      }`}>
        <div className={`${overlayMode ? 'px-6 py-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'} h-[72px]`} />
      </header>
    );
  }

  return (
    <>
      <SlugHeader
        company={company}
        theme={theme}
        overlayMode={overlayMode}
        isKioskMode={isKioskMode}
        isWakeLockActive={isActive}
        isWakeLockSupported={isSupported}
        isPortrait={isPortrait}
        showControls={showControls}
        onEnterKioskMode={handleEnterKioskMode}
        onToggleWakeLock={handleToggleWakeLock}
        onToggleModoVenda={handleToggleModoVenda}
        onToggleTheme={forceTheme ? undefined : handleToggleTheme}
        onClose={overlayMode ? onClose : undefined}
      />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
          <div className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-xl border flex items-center space-x-3 ${
            theme === 'dark'
              ? 'bg-slate-800/95 border-white/10 text-white'
              : 'bg-white/95 border-gray-200 text-gray-900'
          }`}>
            {toast.type === 'success' && (
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
