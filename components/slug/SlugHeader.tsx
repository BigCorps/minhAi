'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { navigateContextual } from '@/lib/routing-utils';
import { useProfile } from '@/hooks/useProfile';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Importação dinâmica do LoginClienteDisplay
const LoginClienteDisplay = dynamic(
  () => import('@/components/assistant/LoginClienteDisplay'),
  { ssr: false }
);

interface SlugHeaderProps {
  company: {
    name: string;
    logo_url?: string | null;
    assistant_role?: string | null;
    webapp_enabled?: boolean;
    modo_vendas_enabled?: boolean;
    modo_fila_enabled?: boolean;
    id: string;
  };
  slug?: string;
  theme: 'dark' | 'light';
  pageType?: 'ia' | 'vendas' | 'fila' | 'cliente'; // MUDANÇA 1: Adicionado 'cliente'
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
  slug,
  theme,
  pageType = 'ia',
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
  const router = useRouter();
  
  // MUDANÇA 2: Hook de perfil do usuário
  const { profile } = useProfile(slug ?? '');
  const isLoggedIn = !!profile;
  
  // MUDANÇA 3: Estado do modal de login
  const [showLoginModal, setShowLoginModal] = useState(false);

  // MUDANÇA 4: Lógica de visibilidade atualizada
  const showAssistenteButton = (!isLoggedIn || pageType === 'ia') && pageType !== 'ia';
  const showVendasButton = (company.modo_vendas_enabled ?? true) && pageType !== 'vendas';
  const showFilaButton = (company.modo_fila_enabled ?? false) && pageType !== 'fila';

  // Handlers de navegação
const handleNavigateToIA = () => {
  navigateContextual(router, 'ia', slug);
};

const handleNavigateToVendas = () => {
  navigateContextual(router, 'vendas', slug);
};

const handleNavigateToFila = () => {
  navigateContextual(router, 'fila', slug);
};

  // MUDANÇA 5: Handler do botão Clientes
  const handleClientesClick = () => {
    if (isLoggedIn) {
      navigateContextual(router, 'cliente', slug);
    } else {
      setShowLoginModal(true);
    }
  };

  // Função para obter iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  // Badge de verificado
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

  // BOTÕES DE NAVEGAÇÃO
  const NavigationButtons = () => {
    if (!slug) return null;

    return (
      <>
        {/* Botão Assistente */}
        {showAssistenteButton && (
          <button
            onClick={handleNavigateToIA}
            className={btn()}
            title="Ir para Assistente"
          >
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {/* Botão Vendas */}
        {showVendasButton && (
          <button
            onClick={handleNavigateToVendas}
            className={btnVenda()}
            title="Ir para Vendas"
          >
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        )}

        {/* Botão Fila */}
        {showFilaButton && (
          <button
            onClick={handleNavigateToFila}
            className={btn()}
            title="Ir para Fila de Atendimento"
          >
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        )}

        {/* MUDANÇA 6: Botão Clientes/Perfil */}
        <button
          onClick={handleClientesClick}
          className={btn()}
          title={isLoggedIn ? 'Meu Perfil' : 'Fazer Login'}
        >
          {isLoggedIn ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: theme === 'dark'
                    ? 'rgba(168, 85, 247, 0.3)'
                    : 'rgba(168, 85, 247, 0.2)',
                  color: theme === 'dark' ? 'rgb(216, 180, 254)' : 'rgb(107, 33, 168)',
                }}
              >
                {getInitials(profile.nome)}
              </div>
            </div>
          ) : (
            <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </button>
      </>
    );
  };

  // Botões do overlay
  const overlayButtons = (
    <>
      <NavigationButtons />
      {onToggleModoVenda && !slug && (
        <button onClick={onToggleModoVenda} className={btn()} title="Modo Venda">
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      )}
      {onEnterKioskMode && !isKioskMode && (
        <button onClick={onEnterKioskMode} className={btn()} title="Modo Kiosk">
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
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>
      )}
      {onToggleTheme && (
        <button onClick={onToggleTheme} className={btn()} title="Tema">
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>
      )}
      {onClose && (
        <button onClick={onClose} className={btn()} title="Fechar">
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </>
  );

  return (
    <header className={`w-full z-10 ${overlayMode ? 'absolute top-0' : ''}`}>
      <div className={`w-full backdrop-blur-md transition-colors ${
        theme === 'dark'
          ? overlayMode
            ? 'bg-gradient-to-b from-black/60 via-black/40 to-transparent'
            : 'bg-slate-900/80 border-b border-white/5'
          : overlayMode
            ? 'bg-gradient-to-b from-white/80 via-white/60 to-transparent'
            : 'bg-white/80 border-b border-black/5'
      }`}>

        {/* Desktop Normal */}
        {!overlayMode && (
          <div className="hidden md:flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-4 flex-shrink-0 relative">
              {company.logo_url && (
                <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
                  <div className="w-full h-full bg-white dark:bg-slate-900 rounded-md overflow-hidden flex items-center justify-center">
                    <Image
                      src={company.logo_url}
                      alt={company.name}
                      width={40}
                      height={40}
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h1 className={`font-bold text-lg leading-tight tracking-tight truncate transition-colors ${
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
              <NavigationButtons />
              
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
              {onToggleModoVenda && !slug && (
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

        {/* Mobile Overlay */}
        {overlayMode && (
          <div className="md:hidden relative flex items-center justify-end min-h-[48px] py-2">
            <div className={`absolute right-9 flex items-center space-x-1 transition-all duration-300 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
              {overlayButtons}
            </div>

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

      {/* Modal de Login */}
      {showLoginModal && (
        <LoginClienteDisplay
          data={{
            companyId: company.id,
            slug: slug ?? '',
            profile,
          }}
          onClose={() => setShowLoginModal(false)}
          theme={theme}
          playText={async () => {}}
        />
      )}
    </header>
  );
}
