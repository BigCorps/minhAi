'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { navigateContextual } from '@/lib/routing-utils';
import { useProfile } from '@/hooks/useProfile';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

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
    webapp_home?: string | null;
    website?: string | null;
    modo_vendas_enabled?: boolean;
    modo_fila_enabled?: boolean;
    modo_links_enabled?: boolean;  
    id: string;
  };
  slug?: string;
  theme: 'dark' | 'light';
  pageType?: 'ia' | 'vendas' | 'fila' | 'cliente' | 'link' | 'site';
  overlayMode?: boolean;
  isKioskMode?: boolean;
  isWakeLockActive?: boolean;
  isWakeLockSupported?: boolean;
  isPortrait?: boolean;
  showControls?: boolean;
  onEnterKioskMode?: () => void;
  /** NOVO: chamado quando o usuário quer SAIR do kiosk (abre overlay de senha) */
  onExitKioskMode?: () => void;
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
  onExitKioskMode,
  onToggleWakeLock,
  onToggleModoVenda,
  onToggleTheme,
  onClose,
}: SlugHeaderProps) {
  const router = useRouter();

  const { profile: hookProfile } = useProfile(slug ?? '');
  const [profile, setProfile] = useState(hookProfile);

  useEffect(() => {
    setProfile(hookProfile);
  }, [hookProfile]);

  useEffect(() => {
    const handleLogin = (e: CustomEvent) => {
      setProfile(e.detail ?? null);
    };
    const handleLogout = () => {
      setProfile(null);
    };

    window.addEventListener('eai:profileLogin',  handleLogin  as EventListener);
    window.addEventListener('eai:profileLogout', handleLogout as EventListener);

    return () => {
      window.removeEventListener('eai:profileLogin',  handleLogin  as EventListener);
      window.removeEventListener('eai:profileLogout', handleLogout as EventListener);
    };
  }, []);

  const isLoggedIn = !!profile;
  const [showLoginModal, setShowLoginModal] = useState(false);

  const showHomeButton = !!company.webapp_home &&
    company.webapp_home !== 'ia' &&
    pageType !== 'site' &&
    !(company.webapp_home === 'site' && isKioskMode);

   const handleHomeClick = () => {
    if (company.webapp_home === 'site' && company.website) {
      if (!isKioskMode) {
        // Navega para a página do iframe, não abre em nova aba diretamente
        navigateContextual(router, 'site', slug);
      }
      return;
    }
    navigateContextual(router, 'ia', slug);
  };

  const showAssistenteButton = pageType !== 'ia';
  const showVendasButton     = company.modo_vendas_enabled === true && pageType !== 'vendas';
  const showFilaButton       = company.modo_fila_enabled   === true && pageType !== 'fila';
  const showClienteButton    = pageType !== 'cliente';
  const showLinksButton      = company.modo_links_enabled === true && pageType !== 'link'; 

  const handleNavigateToIA = () => {
    // /ia no subdomínio → middleware reescreve para /ia/[slug] sem passar por webapp_home
    // no domínio principal → navigateContextual usa /ia/[slug] normalmente
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isSubdomain = ['minhai.com.br', 'minhaia.app', 'nossaia.app', 'suaia.app', 'minhai.app']
      .some(d => hostname.endsWith(`.${d}`) && !hostname.startsWith('www.'))
      || hostname.includes('.localhost');

    if (isSubdomain) {
      router.push('/ia');
    } else {
      navigateContextual(router, 'ia', slug);
    }
  };
  
  const handleNavigateToVendas = () => navigateContextual(router, 'vendas',  slug);
  const handleNavigateToFila   = () => navigateContextual(router, 'fila',    slug);
  const handleNavigateToLinks  = () => navigateContextual(router, 'link',    slug);

  const handleClientesClick = () => {
    if (isLoggedIn) {
      navigateContextual(router, 'cliente', slug);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleMinhAiClick = () => {
    window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
      detail: { functionKey: 'meu_sistema' }
    }));
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const icon       = overlayMode ? 'w-4 h-4' : 'w-5 h-5';
  const iconMobile = 'w-4 h-4';

  const btn = (extra = '') => {
    const base = overlayMode
      ? `p-2 rounded-full transition-all active:scale-95 ${
          theme === 'dark'
            ? 'bg-white/10 hover:bg-white/20 text-white'
            : 'bg-black/10 hover:bg-black/20 text-black'
        }`
      : `p-2 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${
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

  // ── Botão Kiosk helpers ───────────────────────────────────
  const kioskEnterBtn = (size: 'normal' | 'overlay' | 'mobile') => {
    if (size === 'overlay') {
      return `p-2 rounded-full transition-all active:scale-95 ${
        theme === 'dark'
          ? 'bg-white/10 hover:bg-white/20 text-white'
          : 'bg-black/10 hover:bg-black/20 text-black'
      }`;
    }
    if (size === 'mobile') {
      return `p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
        theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
      }`;
    }
    return btn();
  };

  const kioskExitBtn = (size: 'normal' | 'overlay' | 'mobile') => {
    const ring = 'ring-2 ring-red-500/60';
    if (size === 'overlay') {
      return `p-2 rounded-full transition-all active:scale-95 ${ring} ${
        theme === 'dark'
          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
          : 'bg-red-50 text-red-600 hover:bg-red-100'
      }`;
    }
    return `p-2 rounded-lg backdrop-blur-xl border transition-all hover:scale-110 active:scale-95 ${ring} ${
      theme === 'dark'
        ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
        : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
    }`;
  };

  const KioskSVGEnter = ({ sz }: { sz: string }) => (
    <svg className={sz} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );

  // FIX: usa as 4 setas do kiosk (mesmo ícone do botão de entrar)
  // A classe vermelha já vem do kioskExitBtn(), não precisa mudar aqui
  const KioskSVGExit = ({ sz }: { sz: string }) => (
    <svg className={sz} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );

  const VerifiedBadge = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
    if (!company.webapp_enabled) return null;
    const wh     = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    const iconWh = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
    return (
      <span
        title="Assistente Verificado"
        className={`inline-flex items-center justify-center ${wh} rounded-full flex-shrink-0`}
        style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
      >
        <svg className={`${iconWh} text-white`} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  };

  // ── Logo minhAi — link normal ou botão kiosk ──────────────
  const MinhAiLogo = ({ width, height }: { width: number; height: number }) =>
    isKioskMode ? (
      <button
        onClick={handleMinhAiClick}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
        title="Sobre o minhAi"
      >
        <Image src="/logo-circle.png" alt="minhAi logo" width={width} height={height} className="rounded-lg" />
      </button>
    ) : (
      <Link href="https://minhai.app" target="_blank" rel="noopener noreferrer"
        className="flex-shrink-0 hover:opacity-80 transition-opacity" title="Visite minhAi.app">
        <Image src="/logo-circle.png" alt="minhAi logo" width={width} height={height} className="rounded-lg" />
      </Link>
    );

  const NavigationButtons = ({ iconSize }: { iconSize?: string } = {}) => {
    const sz = iconSize ?? icon;
    if (!slug) return null;

    return (
      <>
        {showHomeButton && (
          <button onClick={handleHomeClick} className={btn()} title={company.webapp_home === 'site' ? 'Abrir Site' : 'Página Inicial'}>
            <svg className={sz} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        )}

        {showAssistenteButton && (
          <button onClick={handleNavigateToIA} className={btn()} title="Ir para Assistente">
            <svg className={sz} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {showVendasButton && (
          <button onClick={handleNavigateToVendas} className={btn()} title="Ir para Vendas">
            <svg className={sz} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        )}

        {showFilaButton && (
          <button onClick={handleNavigateToFila} className={btn()} title="Ir para Fila de Atendimento">
            <svg className={sz} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        )}

        {showLinksButton && (
          <button onClick={handleNavigateToLinks} className={btn()} title="Página de Links">
            <svg className={sz} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        )}

        {showClienteButton && (
          <button
            onClick={handleClientesClick}
            className={btn()}
            title={isLoggedIn ? `Meu Perfil (${profile!.nome})` : 'Fazer Login'}
          >
            {isLoggedIn ? (
              <div className={`${sz} rounded-full flex items-center justify-center text-[10px] font-bold ${
                theme === 'dark' ? 'bg-blue-500/30 text-blue-200' : 'bg-blue-100 text-blue-700'
              }`}
                style={{ minWidth: sz.includes('5') ? '20px' : '16px', minHeight: sz.includes('5') ? '20px' : '16px' }}
              >
                {getInitials(profile!.nome)}
              </div>
            ) : (
              <svg className={sz} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </button>
        )}
      </>
    );
  };

  // ── overlayButtons ────────────────────────────────────────
  const overlayButtons = (
    <div className={`flex items-center space-x-1 transition-all duration-300 ${
      showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      <NavigationButtons />

      {/* Kiosk enter — só quando NÃO está em kiosk */}
      {onEnterKioskMode && !isKioskMode && (
        <button onClick={onEnterKioskMode} className={kioskEnterBtn('overlay')} title="Ativar Modo Kiosk">
          <KioskSVGEnter sz={icon} />
        </button>
      )}

      {/* Kiosk exit — só quando está em kiosk */}
      {isKioskMode && onExitKioskMode && (
        <button onClick={onExitKioskMode} className={kioskExitBtn('overlay')} title="Sair do Modo Kiosk">
          <KioskSVGExit sz={icon} />
        </button>
      )}

      {isWakeLockSupported && onToggleWakeLock && (
        <button onClick={onToggleWakeLock} className={btn(isWakeLockActive ? 'ring-2 ring-green-500 ring-opacity-50' : '')}
          title={isWakeLockActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}>
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

  // ── normalButtons ─────────────────────────────────────────
  const normalButtons = (
    <div className="flex items-center space-x-1">
      <NavigationButtons />
      {onToggleModoVenda && !slug && (
        <button onClick={onToggleModoVenda} className={btnVenda()} title="Modo Venda">
          <svg className={icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      )}

      {/* Kiosk enter — só quando NÃO está em kiosk */}
      {onEnterKioskMode && !isKioskMode && (
        <button onClick={onEnterKioskMode} className={kioskEnterBtn('normal')} title="Ativar Modo Kiosk">
          <KioskSVGEnter sz={icon} />
        </button>
      )}

      {/* Kiosk exit — só quando está em kiosk */}
      {isKioskMode && onExitKioskMode && (
        <button onClick={onExitKioskMode} className={kioskExitBtn('normal')} title="Sair do Modo Kiosk">
          <KioskSVGExit sz={icon} />
        </button>
      )}

      {isWakeLockSupported && onToggleWakeLock && (
        <button onClick={onToggleWakeLock} className={btn(isWakeLockActive ? 'ring-2 ring-green-500 ring-opacity-50' : '')}
          title={isWakeLockActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}>
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
      <div className={overlayMode ? 'px-2 py-1' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>

        {/* ── Desktop ───────────────────────────────────────── */}
        <div className={`hidden md:flex md:items-center md:justify-between relative ${overlayMode ? '' : 'py-4'}`}>
          {!overlayMode ? (
            <div className="flex items-center space-x-3">
              {company.logo_url && (
                <img src={company.logo_url} alt={`${company.name} logo`}
                  className="rounded-lg object-contain flex-shrink-0"
                  style={{ maxHeight: '40px', height: 'auto', width: 'auto', maxWidth: '120px' }} />
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className={`text-xl sm:text-2xl font-bold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {company.name}
                  </h1>
                  <VerifiedBadge size="md" />
                </div>
                <p className={`text-xs sm:text-sm tracking-wider uppercase transition-colors ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>
                  {company.assistant_role || 'Uma IA pra chamar de sua!'}
                </p>
              </div>
            </div>
          ) : (
            <div />
          )}

          <div className="relative flex items-center space-x-2">
            {overlayMode ? overlayButtons : normalButtons}
            {!overlayMode && <div className={`w-px h-10 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'}`} />}
            <MinhAiLogo width={overlayMode ? 36 : 40} height={overlayMode ? 36 : 40} />
          </div>
        </div>

        {/* ── Mobile Normal ─────────────────────────────────── */}
        {!overlayMode && (
          <div className="md:hidden py-4 space-y-4">
            <div className="relative flex items-center justify-center min-h-[48px] px-4">
              {company.logo_url && (
                <div className="absolute left-4 flex-shrink-0">
                  <img src={company.logo_url} alt={`${company.name} logo`}
                    className="rounded-lg object-contain"
                    style={{ maxHeight: '36px', height: 'auto', width: 'auto', maxWidth: '80px' }} />
                </div>
              )}
              <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center text-center">
                <div className="flex items-center gap-1.5">
                  <h1 className={`text-lg font-bold whitespace-nowrap transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {company.name}
                  </h1>
                  <VerifiedBadge size="sm" />
                </div>
                <p className={`text-[10px] tracking-wider uppercase whitespace-nowrap transition-colors ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>
                  {company.assistant_role || 'Uma IA para chamar de sua!'}
                </p>
              </div>
              <div className="absolute right-4">
                <MinhAiLogo width={32} height={32} />
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <NavigationButtons iconSize={iconMobile} />

              {/* Kiosk enter mobile */}
              {onEnterKioskMode && !isKioskMode && (
                <button onClick={onEnterKioskMode} className={kioskEnterBtn('mobile')} title="Ativar Modo Kiosk">
                  <KioskSVGEnter sz="w-4 h-4" />
                </button>
              )}
              {/* Kiosk exit mobile */}
              {isKioskMode && onExitKioskMode && (
                <button onClick={onExitKioskMode} className={kioskExitBtn('mobile')} title="Sair do Modo Kiosk">
                  <KioskSVGExit sz="w-4 h-4" />
                </button>
              )}

              {onToggleModoVenda && !slug && (
                <button onClick={onToggleModoVenda}
                  className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-emerald-500/20' : 'bg-black/5 border-black/10 text-black hover:bg-emerald-50'
                  }`} title="Modo Venda">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              )}
              {isWakeLockSupported && onToggleWakeLock && (
                <button onClick={onToggleWakeLock}
                  className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
                  } ${isWakeLockActive ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                  title={isWakeLockActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
              )}
              {onToggleTheme && (
                <button onClick={onToggleTheme}
                  className={`p-2 rounded-lg backdrop-blur-xl border transition-all active:scale-95 ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
                  }`} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
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

        {/* ── Mobile Overlay ────────────────────────────────── */}
        {overlayMode && (
          <div className="md:hidden relative flex items-center justify-end min-h-[48px] py-2">
            <div className={`absolute right-9 flex items-center space-x-1 transition-all duration-300 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
              <NavigationButtons />

              {/* Kiosk enter overlay mobile */}
              {onEnterKioskMode && !isKioskMode && (
                <button onClick={onEnterKioskMode} className={kioskEnterBtn('overlay')} title="Modo Kiosk">
                  <KioskSVGEnter sz="w-4 h-4" />
                </button>
              )}
              {/* Kiosk exit overlay mobile */}
              {isKioskMode && onExitKioskMode && (
                <button onClick={onExitKioskMode} className={kioskExitBtn('overlay')} title="Sair do Modo Kiosk">
                  <KioskSVGExit sz="w-4 h-4" />
                </button>
              )}

              {isWakeLockSupported && onToggleWakeLock && (
                <button onClick={onToggleWakeLock}
                  className={btn(isWakeLockActive ? 'ring-2 ring-green-500 ring-opacity-50' : '')}
                  title={isWakeLockActive ? 'Tela ligada ativa' : 'Manter tela sempre ligada'}>
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
            <div className="flex-shrink-0 z-10">
              <MinhAiLogo width={32} height={32} />
            </div>
          </div>
        )}
      </div>

      {showLoginModal && (
        <LoginClienteDisplay
          data={{ companyId: company.id, slug: slug ?? '', profile }}
          onClose={() => setShowLoginModal(false)}
          theme={theme}
          playText={async () => {}}
        />
      )}
    </header>
  );
}
