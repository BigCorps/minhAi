'use client';

// ============================================================
// app/ia/[slug]/SlugHeaderWrapper.tsx
//
// Client Component responsável por gerenciar os estados do
// header (tema, kiosk, wake lock, orientação) e passar os
// handlers corretos para o SlugHeader.
//
// Separado do layout.tsx (Server Component) para não forçar
// todo o layout a virar client.
//
// O modal de kiosk completo (com senha) continua no
// assistente-client.tsx — aqui apenas disparamos o evento
// global que o assistente-client.tsx já escuta, mantendo
// compatibilidade total com o código existente.
// ============================================================

import { useState, useEffect, useRef } from 'react';
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
}

export default function SlugHeaderWrapper({ company }: SlugHeaderWrapperProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);

  const { isSupported, isActive, requestWakeLock, releaseWakeLock } = useWakeLock();

  // Sincroniza montagem para evitar hydration mismatch
  useEffect(() => {
    setMounted(true);

    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    // Escuta evento do assistente-client.tsx para sincronizar estado do kiosk
    const handleKioskChange = (e: CustomEvent) => {
      setIsKioskMode(e.detail?.active ?? false);
    };
    window.addEventListener('eai:kioskModeChange', handleKioskChange as EventListener);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('eai:kioskModeChange', handleKioskChange as EventListener);
    };
  }, []);

  const theme = mounted ? (resolvedTheme as 'dark' | 'light' ?? 'dark') : 'dark';

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleToggleWakeLock = async () => {
    if (isActive) {
      await releaseWakeLock();
    } else {
      await requestWakeLock();
    }
  };

  // Dispara evento global — o assistente-client.tsx já tem o handler
  // completo do modal de kiosk (senha, fullscreen, bloqueios).
  // Aqui apenas delegamos para manter DRY.
  const handleEnterKioskMode = () => {
    window.dispatchEvent(new CustomEvent('eai:requestKioskMode'));
  };

  const handleToggleModoVenda = () => {
    window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
      detail: { functionKey: 'modo_venda' },
    }));
  };

  if (!mounted) {
    // Render mínimo no SSR para evitar layout shift
    return (
      <header className="w-full border-b bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80 border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-[72px]" />
      </header>
    );
  }

  return (
    <SlugHeader
      company={company}
      theme={theme}
      isKioskMode={isKioskMode}
      isWakeLockActive={isActive}
      isWakeLockSupported={isSupported}
      isPortrait={isPortrait}
      onEnterKioskMode={handleEnterKioskMode}
      onToggleWakeLock={handleToggleWakeLock}
      onToggleModoVenda={handleToggleModoVenda}
      onToggleTheme={handleToggleTheme}
    />
  );
}
