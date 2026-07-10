'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface HeaderProps {
  activeSection: string;
  onNavigate: (id: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const navItems = [
  { id: 'inicio', label: 'Início' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'funcoes', label: 'Funções' },
  { id: 'informacoes', label: 'Informações' },
  { id: 'precos', label: 'Preços' },
  { id: 'contato', label: 'Contato' },
];

export default function Header({ activeSection, onNavigate, theme, onToggleTheme }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDark = theme === 'dark';

  // Detecta se o usuário rolou (para intensificar o blur do header)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fecha o menu mobile automaticamente se a seção ativa mudar
  // (usuário rolou a página manualmente enquanto o menu estava aberto)
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeSection]);

  // Lógica de Instalação PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Verifica se já está instalado ou se o usuário já fechou/instalou antes
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const alreadyInstalled = localStorage.getItem('minhai_pwa_installed') === 'true';

      if (!isStandalone && !alreadyInstalled) {
        setShowInstallButton(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      localStorage.setItem('minhai_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Verificação inicial
    if (window.matchMedia('(display-mode: standalone)').matches) {
      localStorage.setItem('minhai_pwa_installed', 'true');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    }
  };

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        isDark
          ? `${isScrolled ? 'bg-slate-950/80' : 'bg-slate-950/40'} border-b border-white/5 backdrop-blur-xl`
          : `${isScrolled ? 'bg-white/90' : 'bg-white/60'} border-b border-gray-200/50 backdrop-blur-xl`
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* LAYOUT DESKTOP */}
        <div className="hidden md:flex justify-between items-center h-18">
          {/* LOGO */}
          <div className="flex-shrink-0">
            <button onClick={() => handleNavigate('inicio')} className="focus:outline-none">
              <Image
                src="/logo.png"
                alt="minhAi"
                width={150}
                height={68}
                className="h-11 w-auto"
              />
            </button>
          </div>

          {/* NAVEGAÇÃO DESKTOP */}
          <nav className="flex items-center">
            <ul className="flex items-center space-x-1">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                      activeSection === item.id
                        ? isDark
                          ? 'text-blue-400'
                          : 'text-blue-600'
                        : isDark
                          ? 'text-white/60 hover:text-white hover:bg-white/5'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    {item.label}
                    {activeSection === item.id && (
                      <span
                        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full transition-all duration-300 ${
                          isDark ? 'bg-blue-400' : 'bg-blue-600'
                        }`}
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* AÇÕES DESKTOP */}
          <div className="flex items-center space-x-3">
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-300 font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar App
              </button>
            )}

            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg border transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                  : 'bg-black/5 border-black/5 text-gray-500 hover:text-gray-900 hover:bg-black/10'
              }`}
              aria-label="Alternar tema"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <Link
              href="/login"
              className="px-5 py-2 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition-all duration-300 font-semibold text-sm whitespace-nowrap hover:scale-105"
            >
              Entrar
            </Link>
          </div>
        </div>

        {/* LAYOUT MOBILE */}
        <div className="flex md:hidden items-center justify-between h-16">
          {/* LOGO À ESQUERDA */}
          <div className="flex-shrink-0">
            <button onClick={() => handleNavigate('inicio')} className="focus:outline-none">
              <Image
                src="/logo.png"
                alt="minhAi"
                width={150}
                height={68}
                className="h-9 w-auto"
              />
            </button>
          </div>

          {/* BOTÕES À DIREITA */}
          <div className="flex items-center gap-2">
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300"
                title="Baixar App"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}

            <button
              onClick={onToggleTheme}
              className={`p-1.5 rounded-lg border transition-all duration-300 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                  : 'bg-black/5 border-black/5 text-gray-500 hover:text-gray-900 hover:bg-black/10'
              }`}
              aria-label="Alternar tema"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <Link
              href="/login"
              className="px-3 py-1.5 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition-all duration-300 font-semibold text-xs whitespace-nowrap"
            >
              Entrar
            </Link>

            {/* Hambúrguer — abre/fecha o menu de navegação */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              className={`p-1.5 rounded-lg border transition-all duration-300 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                  : 'bg-black/5 border-black/5 text-gray-500 hover:text-gray-900 hover:bg-black/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* MENU MOBILE — dropdown com todas as seções, a atual destacada */}
        {mobileMenuOpen && (
          <nav
            className={`md:hidden pb-3 border-t ${isDark ? 'border-white/5' : 'border-gray-200/50'}`}
            aria-label="Menu de navegação mobile"
          >
            <ul className="flex flex-col gap-1 pt-2">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeSection === item.id
                        ? isDark
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-blue-50 text-blue-600'
                        : isDark
                          ? 'text-white/60 hover:text-white hover:bg-white/5'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}