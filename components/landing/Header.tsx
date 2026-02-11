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
  { id: 'precos', label: 'Preços' },
  { id: 'contato', label: 'Contato' },
];

export default function Header({ activeSection, onNavigate, theme, onToggleTheme }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isDark = theme === 'dark';

  // Detecta se o usuário rolou (para intensificar o blur do header)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsMenuOpen(false);
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
        <div className="flex justify-between items-center h-16 md:h-18">

          {/* LOGO */}
          <div className="flex-shrink-0">
            <button onClick={() => handleNavigate('inicio')} className="focus:outline-none">
              <Image
                src="/logo.png"
                alt="eAi"
                width={150}
                height={68}
                className="h-9 md:h-11 w-auto"
              />
            </button>
          </div>

          {/* NAVEGAÇÃO DESKTOP */}
          <nav className="hidden md:flex items-center">
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
                    {/* Indicador ativo */}
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

          {/* AÇÕES (Tema + Entrar + Menu Mobile) */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Botão de Tema */}
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

            {/* Botão Entrar */}
            <Link
              href="/login"
              className="hidden sm:inline-flex px-5 py-2 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition-all duration-300 font-semibold text-sm whitespace-nowrap hover:scale-105"
            >
              Entrar
            </Link>

            {/* Botão Menu Mobile (Hamburger) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-all duration-300 ${
                isDark
                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* MENU MOBILE (Dropdown) */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div
          className={`px-4 pb-4 space-y-1 border-t ${
            isDark
              ? 'bg-slate-950/95 border-white/5 backdrop-blur-xl'
              : 'bg-white/95 border-gray-100 backdrop-blur-xl'
          }`}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`block w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeSection === item.id
                  ? isDark
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-blue-600 bg-blue-50'
                  : isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/5'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
          <Link
            href="/login"
            className="block w-full text-center px-4 py-3 mt-2 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition font-semibold text-sm sm:hidden"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}