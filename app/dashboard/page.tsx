'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/landing/Header';
import InicioSection from '@/components/landing/InicioSection';
import RecursosSection from '@/components/landing/RecursosSection';

// ============================================================
// SEÇÕES PLACEHOLDER (serão substituídas nos próximos passos)
// ============================================================

function FuncoesSection({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  return (
    <div className={`flex flex-col items-center justify-center h-full w-full p-8 transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-800 to-slate-950'
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      <h2 className={`text-4xl md:text-5xl font-bold mb-6 transition-colors ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>Funções</h2>
      <p className={`text-lg max-w-xl text-center transition-colors ${
        isDark ? 'text-white/50' : 'text-gray-500'
      }`}>Seção será implementada no Passo 5</p>
    </div>
  );
}

function PrecosSection({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  return (
    <div className={`flex flex-col items-center justify-center h-full w-full p-8 transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-white via-blue-50 to-white'
    }`}>
      <h2 className={`text-4xl md:text-5xl font-bold mb-6 transition-colors ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>Preços</h2>
      <p className={`text-lg max-w-xl text-center transition-colors ${
        isDark ? 'text-white/50' : 'text-gray-500'
      }`}>Seção será implementada no Passo 6</p>
    </div>
  );
}

function ContatoSection({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  return (
    <div className={`flex flex-col items-center justify-center h-full w-full p-8 transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      <h2 className={`text-4xl md:text-5xl font-bold mb-6 transition-colors ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>Contato</h2>
      <p className={`text-lg max-w-xl text-center transition-colors ${
        isDark ? 'text-white/50' : 'text-gray-500'
      }`}>Seção será implementada no Passo 7</p>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL DA LANDING PAGE
// ============================================================

const SECTION_IDS = ['inicio', 'recursos', 'funcoes', 'precos', 'contato'];

export default function LandingPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('inicio');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isScrollingRef = useRef(false);

  // Detecta preferência de tema do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    if (mediaQuery.matches) {
      setTheme('light');
    }
  }, []);

  // IntersectionObserver para detectar a seção ativa durante o scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    const sections = container.querySelectorAll('section[id]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  // Navegação suave para uma seção
  const scrollToSection = useCallback((id: string) => {
    const section = document.getElementById(id);
    if (section && scrollContainerRef.current) {
      isScrollingRef.current = true;
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
      // Libera o scroll após a animação terminar
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  }, []);

  // Navegar para próxima/anterior seção
  const navigateNext = useCallback(() => {
    const currentIndex = SECTION_IDS.indexOf(activeSection);
    if (currentIndex < SECTION_IDS.length - 1) {
      scrollToSection(SECTION_IDS[currentIndex + 1]);
    }
  }, [activeSection, scrollToSection]);

  const navigatePrev = useCallback(() => {
    const currentIndex = SECTION_IDS.indexOf(activeSection);
    if (currentIndex > 0) {
      scrollToSection(SECTION_IDS[currentIndex - 1]);
    }
  }, [activeSection, scrollToSection]);

  // =============================================
  // SCROLL VERTICAL → HORIZONTAL (Desktop)
  // =============================================
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let wheelTimeout: NodeJS.Timeout;
    let canScroll = true;

    const handleWheel = (e: WheelEvent) => {
      // Só converte se o scroll é predominantemente vertical
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      e.preventDefault();

      if (!canScroll || isScrollingRef.current) return;

      // Threshold mínimo para evitar scrolls acidentais
      if (Math.abs(e.deltaY) < 30) return;

      canScroll = false;

      if (e.deltaY > 0) {
        navigateNext();
      } else {
        navigatePrev();
      }

      // Cooldown entre navegações (evita pular seções)
      wheelTimeout = setTimeout(() => {
        canScroll = true;
      }, 1000);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      clearTimeout(wheelTimeout);
    };
  }, [navigateNext, navigatePrev]);

  // Suporte a navegação por teclado (setas esquerda/direita)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrev]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const isDark = theme === 'dark';
  const currentIndex = SECTION_IDS.indexOf(activeSection);
  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < SECTION_IDS.length - 1;

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-slate-950 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {/* Header Fixo */}
      <Header
        activeSection={activeSection}
        onNavigate={scrollToSection}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Container de Rolagem Horizontal */}
      <main
        ref={scrollContainerRef}
        className="flex w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style jsx>{`
          main::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <section id="inicio" className="w-screen h-screen flex-shrink-0 snap-start snap-always">
          <InicioSection theme={theme} />
        </section>

        <section id="recursos" className="w-screen h-screen flex-shrink-0 snap-start snap-always">
          <RecursosSection theme={theme} />
        </section>

        <section id="funcoes" className="w-screen h-screen flex-shrink-0 snap-start snap-always">
          <FuncoesSection theme={theme} />
        </section>

        <section id="precos" className="w-screen h-screen flex-shrink-0 snap-start snap-always">
          <PrecosSection theme={theme} />
        </section>

        <section id="contato" className="w-screen h-screen flex-shrink-0 snap-start snap-always">
          <ContatoSection theme={theme} />
        </section>
      </main>

      {/* ================================================ */}
      {/* SETA ESQUERDA                                   */}
      {/* ================================================ */}
      <button
        onClick={navigatePrev}
        className={`fixed left-4 md:left-6 top-1/2 -translate-y-1/2 z-40 p-2 md:p-3 rounded-full backdrop-blur-sm border transition-all duration-500 group ${
          canGoLeft
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 -translate-x-4 pointer-events-none'
        } ${
          isDark
            ? 'bg-white/5 border-white/10 hover:bg-white/10'
            : 'bg-black/5 border-black/5 hover:bg-black/10'
        }`}
        aria-label="Seção anterior"
      >
        <svg
          className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:-translate-x-0.5 ${
            isDark ? 'text-white/30 group-hover:text-white/60' : 'text-gray-300 group-hover:text-gray-500'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ================================================ */}
      {/* SETA DIREITA                                    */}
      {/* ================================================ */}
      <button
        onClick={navigateNext}
        className={`fixed right-4 md:right-6 top-1/2 -translate-y-1/2 z-40 p-2 md:p-3 rounded-full backdrop-blur-sm border transition-all duration-500 group ${
          canGoRight
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-4 pointer-events-none'
        } ${
          isDark
            ? 'bg-white/5 border-white/10 hover:bg-white/10'
            : 'bg-black/5 border-black/5 hover:bg-black/10'
        }`}
        aria-label="Próxima seção"
      >
        <svg
          className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:translate-x-0.5 ${
            isDark ? 'text-white/30 group-hover:text-white/60' : 'text-gray-300 group-hover:text-gray-500'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ================================================ */}
      {/* INDICADOR DE PROGRESSO (bolinhas)               */}
      {/* ================================================ */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        {SECTION_IDS.map((id) => (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className={`rounded-full transition-all duration-300 ${
              activeSection === id
                ? `w-8 h-2 ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`
                : `w-2 h-2 ${isDark ? 'bg-white/30 hover:bg-white/50' : 'bg-gray-300 hover:bg-gray-400'}`
            }`}
            aria-label={`Ir para ${id}`}
          />
        ))}
      </div>
    </div>
  );
}