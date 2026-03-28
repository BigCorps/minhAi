'use client';

// ============================================================
// components/slug/SlugHeader.tsx
//
// Header fixo compartilhado entre todas as rotas do slug.
// Extraído do assistente-client.tsx — mantém exatamente o mesmo
// layout, botões e comportamento do header original.
//
// Props obrigatórias:
//   company  — dados básicos da empresa (nome, logo, role)
//
// Props opcionais (passadas pelo hub /ia/[slug]/page.tsx):
//   onEnterKioskMode   — abre modal de senha do kiosk
//   onToggleWakeLock   — liga/desliga wake lock
//   onToggleModoVenda  — abre SaleModeModal via evento global
//   isKioskMode        — estado atual do kiosk
//   isWakeLockActive   — estado atual do wake lock
//   isWakeLockSupported
//   theme              — 'dark' | 'light'
//   onToggleTheme      — alterna o tema
// ============================================================

import Image from 'next/image';
import Link from 'next/link';
import DigitalClock from '@/components/ui/DigitalClock';

interface SlugHeaderProps {
  company: {
    name: string;
    logo_url?: string | null;
    assistant_role?: string | null;
  };
  theme: 'dark' | 'light';
  isKioskMode?: boolean;
  isWakeLockActive?: boolean;
  isWakeLockSupported?: boolean;
  isPortrait?: boolean;
  onEnterKioskMode?: () => void;
  onToggleWakeLock?: () => void;
  onToggleModoVenda?: () => void;
  onToggleTheme?: () => void;
}

export default function SlugHeader({
  company,
  theme,
  isKioskMode = false,
  isWakeLockActive = false,
  isWakeLockSupported = false,
  isPortrait = false,
  onEnterKioskMode,
  onToggleWakeLock,
  onToggleModoVenda,
  onToggleTheme,
}: SlugHeaderProps) {
  return (
    <header
      data-role="slug-header"
      className={`w-full border-b transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-slate-950/80 border-white/5 backdrop-blur-xl'
          : 'bg-white/80 border-gray-200 backdrop-blur-xl'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Desktop Layout ─────────────────────────────────── */}
        <div className="hidden md:flex md:items-center md:justify-between py-4 relative">

          {/* ESQUERDA: logo + nome + role */}
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
                {company.assistant_role || 'Uma IA pra chamar de sua!'}
              </p>
            </div>
          </div>

          {/* CENTRO: relógio digital (só landscape) */}
          {!isPortrait && (
            <DigitalClock
              className="absolute left-1/2 -translate-x-1/2"
              theme={theme}
            />
          )}

          {/* DIREITA: botões de controle + logo minhAi */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">

              {/* Botão Modo Kiosk */}
              {onEnterKioskMode && (
                <button
                  onClick={onEnterKioskMode}
                  className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                  } ${isKioskMode ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
                  title={isKioskMode ? 'Modo Kiosk Ativo' : 'Ativar Modo Kiosk'}
                >
                  {isKioskMode ? (
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
              )}

              {/* Botão Modo Venda */}
              {onToggleModoVenda && (
                <button
                  onClick={onToggleModoVenda}
                  className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-emerald-500/20 hover:border-emerald-500/40'
                      : 'bg-black/5 border-black/10 text-black hover:bg-emerald-50 hover:border-emerald-300'
                  }`}
                  title="Modo Venda"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              )}

              {/* Botão Wake Lock */}
              {isWakeLockSupported && onToggleWakeLock && (
                <button
                  onClick={onToggleWakeLock}
                  className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                  } ${isWakeLockActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                  title={isWakeLockActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}
                >
                  {isWakeLockActive ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Botão Tema */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className={`p-2.5 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                  }`}
                  title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                >
                  {theme === 'dark' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              )}
            </div>

            {/* Divisor */}
            <div className={`w-px h-10 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'}`} />

            {/* Logo minhAi */}
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
                width={40}
                height={40}
                className="rounded-lg"
              />
            </Link>
          </div>
        </div>

        {/* ── Mobile Layout ───────────────────────────────────── */}
        <div className="md:hidden py-4 space-y-4">

          {/* Linha 1: logo (esq) + nome centralizado + minhAi (dir) */}
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
              <Image
                src="/logo-circle.png"
                alt="minhAi logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </Link>
          </div>

          {/* Linha 2: botões de controle centralizados */}
          <div className="flex items-center justify-center space-x-2">

            {/* Kiosk */}
            {onEnterKioskMode && (
              <button
                onClick={onEnterKioskMode}
                className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white'
                    : 'bg-black/5 border-black/10 text-black'
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

            {/* Modo Venda */}
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

            {/* Wake Lock */}
            {isWakeLockSupported && onToggleWakeLock && (
              <button
                onClick={onToggleWakeLock}
                className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white'
                    : 'bg-black/5 border-black/10 text-black'
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

            {/* Tema */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white'
                    : 'bg-black/5 border-black/10 text-black'
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

      </div>
    </header>
  );
}
