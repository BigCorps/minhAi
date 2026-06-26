'use client';

// components/LeadDemoHeader.tsx
//
// Header da demo /lead, espelhando o estilo visual de
// components/slug/SlugHeader.tsx, mas reduzido por decisão do
// usuário: SEM botões de navegação entre modos (vendas/fila/links/
// cliente/kiosk) — só:
// - Logo do cliente (placeholder redondo "Seu Logo Aqui", já que a
//   demo não tem upload de logo real) + nome do negócio
// - Logo minhAi
// - Wake lock (manter tela ligada) — usa @/hooks/useWakeLock real
// - Seletor de tema dark/light — usa next-themes real (decisão
//   atualizada: a demo agora permite trocar tema de fato)

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useWakeLock } from '@/hooks/useWakeLock';
import { Moon, Sun, Lock, LockOpen } from 'lucide-react';

export interface LeadDemoHeaderProps {
  nomeNegocio: string;
  /** URL do logo do negócio, se algum dia a demo passar a aceitar upload. Hoje sempre null/undefined. */
  logoUrl?: string | null;
}

export function LeadDemoHeader({ nomeNegocio, logoUrl }: LeadDemoHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isSupported, isActive, error, requestWakeLock, releaseWakeLock } = useWakeLock();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = mounted ? ((resolvedTheme as 'dark' | 'light') ?? 'dark') : 'dark';

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleToggleWakeLock = async () => {
    if (!isSupported) {
      showToast('Tela sempre ligada não é suportada neste navegador');
      return;
    }
    if (isActive) {
      await releaseWakeLock();
      showToast('Tela sempre ligada desativada');
    } else {
      const activated = await requestWakeLock();
      showToast(activated ? 'Tela sempre ligada ativada!' : (error || 'Erro ao ativar'));
    }
  };

  const iconSize = 'w-5 h-5';
  const iconSizeMobile = 'w-4 h-4';

  const btnClass = `p-2 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
    theme === 'dark'
      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
      : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
  }`;

  if (!mounted) {
    return (
      <header className="w-full border-b bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80 border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-[72px]" />
      </header>
    );
  }

  return (
    <header
      className={`w-full border-b transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80 border-white/5 backdrop-blur-xl'
          : 'bg-white/80 border-gray-200 backdrop-blur-xl'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Desktop ── */}
        <div className="hidden md:flex md:items-center md:justify-between py-4">
          <div className="flex items-center space-x-3">
            <LogoPlaceholder logoUrl={logoUrl} theme={theme} size={40} />
            <div className="flex flex-col">
              <h1 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {nomeNegocio}
              </h1>
              <p className={`text-xs sm:text-sm tracking-wider uppercase ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>
                Demonstração minhAi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isSupported && (
              <button
                onClick={handleToggleWakeLock}
                className={`${btnClass} ${isActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                title={isActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
              >
                {isActive ? (
                  <Lock className={`${iconSize} text-green-400`} />
                ) : (
                  <LockOpen className={iconSize} />
                )}
              </button>
            )}
            <button
              onClick={handleToggleTheme}
              className={btnClass}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? <Sun className={iconSize} /> : <Moon className={iconSize} />}
            </button>
            <div className={`w-px h-10 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'}`} />
            <MinhAiLogo size={40} />
          </div>
        </div>

        {/* ── Mobile ── */}
        <div className="md:hidden py-4 space-y-3">
          <div className="relative flex items-center justify-center min-h-[44px] px-2">
            <div className="absolute left-0">
              <LogoPlaceholder logoUrl={logoUrl} theme={theme} size={32} />
            </div>
            <div className="flex flex-col items-center text-center">
              <h1 className={`text-base font-bold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {nomeNegocio}
              </h1>
              <p className={`text-[10px] tracking-wider uppercase whitespace-nowrap ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>
                Demonstração minhAi
              </p>
            </div>
            <div className="absolute right-0">
              <MinhAiLogo size={32} />
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2">
            {isSupported && (
              <button
                onClick={handleToggleWakeLock}
                className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                  theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
                } ${isActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                title={isActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
              >
                {isActive ? (
                  <Lock className={`${iconSizeMobile} text-green-400`} />
                ) : (
                  <LockOpen className={iconSizeMobile} />
                )}
              </button>
            )}
            <button
              onClick={handleToggleTheme}
              className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
              }`}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? <Sun className={iconSizeMobile} /> : <Moon className={iconSizeMobile} />}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-xl border text-sm font-medium ${
              theme === 'dark' ? 'bg-slate-800/95 border-white/10 text-white' : 'bg-white/95 border-gray-200 text-gray-900'
            }`}
          >
            {toast}
          </div>
        </div>
      )}
    </header>
  );
}

// ── Logo do cliente: placeholder redondo "Seu Logo Aqui" ──────────
// A demo não tem upload de logo, então sempre mostra o placeholder.
// Mantido como componente próprio para, no futuro, trocar facilmente
// por <img src={logoUrl}> caso a demo passe a aceitar upload.
function LogoPlaceholder({
  logoUrl,
  theme,
  size,
}: {
  logoUrl?: string | null;
  theme: 'dark' | 'light';
  size: number;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Logo do negócio"
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 border-2 border-dashed ${
        theme === 'dark'
          ? 'bg-white/5 border-white/20 text-white/40'
          : 'bg-black/5 border-black/20 text-gray-400'
      }`}
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: size * 0.18 }} className="text-center leading-tight font-medium px-1">
        Seu Logo Aqui
      </span>
    </div>
  );
}

// ── Logo minhAi ──────────────────────────────────────────────────
// Sistema real usa next/image com /logo-circle.png. Mantemos o mesmo
// asset por consistência visual — assume-se que esse arquivo já
// existe em /public (confirmado pelo uso em SlugHeader.tsx).
function MinhAiLogo({ size }: { size: number }) {
  return (
    <img
      src="/logo-circle.png"
      alt="minhAi logo"
      className="rounded-lg flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}