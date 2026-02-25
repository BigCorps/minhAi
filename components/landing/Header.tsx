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
  };

  // Encontrar índice da seção ativa e adjacentes para mobile
  const currentIndex = navItems.findIndex(item => item.id === activeSection);
  const prevItem = currentIndex > 0 ? navItems[currentIndex - 1] : null;
  const nextItem = currentIndex < navItems.length - 1 ? navItems[currentIndex + 1] : null;
  const currentItem = navItems[currentIndex];

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
                alt="eAi"
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
        <div className="flex md:hidden items-center h-16 relative">
          {/* BOTÕES FIXOS À ESQUERDA */}
          <div className="flex items-center gap-2 mr-3">
            <Link
              href="/login"
              className="px-3 py-1.5 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition-all duration-300 font-semibold text-xs whitespace-nowrap"
            >
              Entrar
            </Link>

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
          </div>

          {/* NAVEGAÇÃO HORIZONTAL NO CENTRO */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="flex items-center gap-3">
              {/* Seção Anterior (translúcida) */}
              {prevItem && (
                <button
                  onClick={() => handleNavigate(prevItem.id)}
                  className={`text-xs font-medium transition-all duration-300 ${
                    isDark ? 'text-white/30' : 'text-gray-400'
                  }`}
                >
                  {prevItem.label}
                </button>
              )}

              {/* Seção Atual (destaque) */}
              {currentItem && (
                <button
                  onClick={() => handleNavigate(currentItem.id)}
                  className={`relative px-3 py-1.5 text-sm font-bold rounded-lg transition-all duration-300 ${
                    isDark
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-blue-600 bg-blue-50'
                  }`}
                >
                  {currentItem.label}
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full ${
                      isDark ? 'bg-blue-400' : 'bg-blue-600'
                    }`}
                  />
                </button>
              )}

              {/* Próxima Seção (translúcida) */}
              {nextItem && (
                <button
                  onClick={() => handleNavigate(nextItem.id)}
                  className={`text-xs font-medium transition-all duration-300 ${
                    isDark ? 'text-white/30' : 'text-gray-400'
                  }`}
                >
                  {nextItem.label}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
