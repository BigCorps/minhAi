'use client';

import Image from 'next/image';
import Link from 'next/link';

interface SlugHeaderProps {
  company: {
    name: string;
    logo_url?: string | null;
    assistant_role?: string | null;
    webapp_enabled?: boolean;
  };
  theme: 'dark' | 'light';
  overlayMode?: boolean;
  isKioskMode?: boolean;
  isWakeLockActive?: boolean;
  isWakeLockSupported?: boolean;
  isPortrait?: boolean;
  showControls?: boolean;
  onEnterKioskMode?: () => void;
  onToggleWakeLock?: () => void;
  onToggleModoVenda?: () => void;
  onToggleTheme?: () => void;
  onClose?: () => void;
}

export default function SlugHeader({
  company,
  theme,
  overlayMode = false,
  isKioskMode = false,
  isWakeLockActive = false,
  isWakeLockSupported = false,
  isPortrait = false,
  showControls = false,
  onEnterKioskMode,
  onToggleWakeLock,
  onToggleModoVenda,
  onToggleTheme,
  onClose,
}: SlugHeaderProps) {

  const icon = overlayMode ? 'w-4 h-4' : 'w-5 h-5';

  const btn = (extra = '') => {
    const base = overlayMode
      ? `p-2 rounded-full transition-all active:scale-95 ${
          theme === 'dark'
            ? 'bg-white/10 hover:bg-white/20 text-white'
            : 'bg-black/10 hover:bg-black/20 text-black'
        }`
      : `p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
          theme === 'dark'
            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
        }`;
    return `${base} ${extra}`;
  };

  const btnVenda = () => overlayMode
    ? `p-2 rounded-full transition-all active:scale-95 ${
        theme === 'dark'
          ? 'bg-white/10 hover:bg-emerald-500/30 text-white'
          : 'bg-black/10 hover:bg-emerald-100 text-black'
      }`
    : `p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
        theme === 'dark'
          ? 'bg-white/5 border-white/10 text-white hover:bg-emerald-500/20 hover:border-emerald-500/40'
          : 'bg-black/5 border-black/10 text-black hover:bg-emerald-50 hover:border-emerald-300'
      }`;

  // Badge de verificado (verde limão) — aparece quando webapp_enabled = true
  const VerifiedBadge = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
    if (!company.webapp_enabled) return null;
    const wh = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    const iconWh = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
    return (
      <span
        title="Assistente Verificado"
        className={`inline-flex items-center justify-center ${wh} rounded-full flex-shrink-0`}
        style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
      >
        <svg
          className={`${iconWh} text-white`}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  };

  // Botões do overlay — visibilidade controlada por showControls
  const overlayButtons = (
    <div className={`flex items-center space-x-1 transition-all duration-300 ${
      showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      {onToggleModoVenda && (
        <button onClick={onToggleModoVenda} className={btnVenda()} title="Modo Venda">
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      )}
      {onEnterKioskMode && !isKioskMode && (
        <button onClick={onEnterKioskMode} className={btn()} title="Ativar Modo Kiosk">
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      )}
      {isWakeLockSupported && onToggleWakeLock && (
        <button
          onClick={onToggleWakeLock}
          className={btn(isWakeLockActive ? 'ring-2 ring-green-500 ring-opacity-50' : '')}
          title={isWakeLockActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
        >
          {isWakeLockActive ? (
            <svg className={`${icon} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </button>
      )}
      {onToggleTheme && (
        <button onClick={onToggleTheme} className={btn()} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
          {theme === 'dark' ? (
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      )}
      {onClose && (
        <button onClick={onClose} className={btn()} title="Fechar">
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );

  // Botões do modo normal (sempre visíveis)
  const normalButtons = (
    <div className="flex items-center space-x-1">
      {onToggleModoVenda && (
        <button onClick={onToggleModoVenda} className={btnVenda()} title="Modo Venda">
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      )}
      {onEnterKioskMode && !isKioskMode && (
        <button onClick={onEnterKioskMode} className={btn()} title="Ativar Modo Kiosk">
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      )}
      {isWakeLockSupported && onToggleWakeLock && (
        <button
          onClick={onToggleWakeLock}
          className={btn(isWakeLockActive ? 'ring-2 ring-green-500 ring-opacity-50' : '')}
          title={isWakeLockActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
        >
          {isWakeLockActive ? (
            <svg className={`${icon} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </button>
      )}
      {onToggleTheme && (
        <button onClick={onToggleTheme} className={btn()} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
          {theme === 'dark' ? (
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );

  return (
    <header
      data-role="slug-header"
      className={`w-full transition-colors ${
        overlayMode
          ? 'bg-transparent border-transparent'
          : `border-b ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80 border-white/5 backdrop-blur-xl'
                : 'bg-white/80 border-gray-200 backdrop-blur-xl'
            }`
      }`}
    >
      <div className={overlayMode
        ? 'px-2 py-1'
        : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
      }>

        {/* ── Desktop Layout ─────────────────────────────────── */}
        <div className={`hidden md:flex md:items-center md:justify-between relative ${
          overlayMode ? '' : 'py-4'
        }`}>

          {/* ESQUERDA */}
          {!overlayMode ? (
            <div className="flex items-center space-x-3">
              {company.logo_url && (
                <img
                  src={company.logo_url}
                  alt={`${company.name} logo`}
                  className="rounded-lg object-contain flex-shrink-0"
                  style={{ maxHeight: '40px', height: 'auto', width: 'auto', maxWidth: '120px' }}
                />
              )}
              <div className="flex flex-col">
                {/* Nome + badge */}
                <div className="flex items-center gap-2">
                  <h1 className={`text-xl sm:text-2xl font-bold transition-colors ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {company.name}
                  </h1>
                  <VerifiedBadge size="md" />
                </div>
                <p className={`text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                  theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                }`}>
                  {company.assistant_role || 'Uma IA pra chamar de sua!'}
                </p>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* DIREITA: botões + logo minhAi */}
          <div className="relative flex items-center space-x-2">
            {overlayMode ? overlayButtons : normalButtons}
            {!overlayMode && (
              <div className={`w-px h-10 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'}`} />
            )}
            <Link
              href="https://minhai.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
              title="Visite minhAi.app"
            >
              <Image
                src="/logo-circle.png"
                alt="minhAi logo"
                width={overlayMode ? 36 : 40}
                height={overlayMode ? 36 : 40}
                className="rounded-lg"
              />
            </Link>
          </div>
        </div>

        {/* ── Mobile Normal ──────────────────────────────────── */}
        {!overlayMode && (
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
                {/* Nome + badge */}
                <div className="flex items-center gap-1.5">
                  <h1 className={`text-lg font-bold whitespace-nowrap transition-colors ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {company.name}
                  </h1>
                  <VerifiedBadge size="sm" />
                </div>
                <p className={`text-[10px] tracking-wider uppercase whitespace-nowrap transition-colors ${
                  theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                }`}>
                  {company.assistant_role || 'Uma IA para chamar de sua!'}
                </p>
              </div>
              <Link
                href="https://minhai.app"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-4 flex-shrink-0 hover:opacity-80 transition-opacity"
                title="Visite minhAi.app"
              >
                <Image src="/logo-circle.png" alt="minhAi logo" width={32} height={32} className="rounded-lg" />
              </Link>
            </div>

            <div className="flex items-center justify-center space-x-2">
              {onEnterKioskMode && (
                <button
                  onClick={onEnterKioskMode}
                  className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
                  } ${isKioskMode ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
                  title="Modo Kiosk"
                >
                  {isKioskMode ? (
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
              )}
              {onToggleModoVenda && (
                <button
                  onClick={onToggleModoVenda}
                  className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-emerald-500/20'
                      : 'bg-black/5 border-black/10 text-black hover:bg-emerald-50'
                  }`}
                  title="Modo Venda"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              )}
              {isWakeLockSupported && onToggleWakeLock && (
                <button
                  onClick={onToggleWakeLock}
                  className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
                  } ${isWakeLockActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                  title={isWakeLockActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
                >
                  {isWakeLockActive ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </button>
              )}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
                  }`}
                  title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                >
                  {theme === 'dark' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Mobile Overlay ─────────────────────────────────── */}
        {overlayMode && (
          <div className="md:hidden relative flex items-center justify-end min-h-[48px] py-2">

            {/* Botões — absolute para não empurrar o logo */}
            <div className={`absolute right-9 flex items-center space-x-1 transition-all duration-300 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
              {onToggleModoVenda && (
                <button onClick={onToggleModoVenda} className={btnVenda()} title="Modo Venda">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              )}
              {onEnterKioskMode && !isKioskMode && (
                <button onClick={onEnterKioskMode} className={btn()} title="Modo Kiosk">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              )}
              {isWakeLockSupported && onToggleWakeLock && (
                <button
                  onClick={onToggleWakeLock}
                  className={btn(isWakeLockActive ? 'ring-2 ring-green-500 ring-opacity-50' : '')}
                  title={isWakeLockActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
              )}
              {onToggleTheme && (
                <button onClick={onToggleTheme} className={btn()} title="Tema">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </button>
              )}
              {onClose && (
                <button onClick={onClose} className={btn()} title="Fechar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Logo minhAi — no fluxo flex, sempre visível */}
            <Link
              href="https://minhai.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 hover:opacity-80 transition-opacity z-10"
              title="Visite minhAi.app"
            >
              <Image src="/logo-circle.png" alt="minhAi logo" width={32} height={32} className="rounded-lg" />
            </Link>
          </div>
        )}

      </div>
    </header>
  );
}
