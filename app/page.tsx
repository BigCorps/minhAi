'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/landing/Header';

// ============================================================
// SEÇÕES PLACEHOLDER (serão substituídas nos próximos passos)
// ============================================================

function InicioSection({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  return (
    <div className={`flex flex-col items-center justify-center h-full w-full p-8 transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      <h1 className={`text-4xl md:text-6xl font-bold leading-tight mb-4 text-center transition-colors ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        eAi, que tal um Atendimento
        <span className={`block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
          por Voz com IA?
        </span>
      </h1>
      <p className={`text-lg md:text-xl max-w-2xl text-center mb-8 transition-colors ${
        isDark ? 'text-white/60' : 'text-gray-600'
      }`}>
        Transforme a experiência dos seus clientes com um assistente de voz inteligente,
        personalizado e disponível 24/7.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/login"
          className="px-8 py-4 bg-primary-green text-white rounded-full hover:bg-primary-green-dark transition-all duration-300 font-semibold text-lg hover:scale-105 shadow-lg"
        >
          Começar Agora
        </Link>
        <Link
          href="/teste-wake-word"
          className={`px-8 py-4 border-2 rounded-full transition-all duration-300 font-semibold text-lg hover:scale-105 ${
            isDark
              ? 'border-blue-400/50 text-blue-400 hover:bg-blue-400/10'
              : 'border-blue-600/50 text-blue-600 hover:bg-blue-50'
          }`}
        >
          Ver Demonstração
        </Link>
      </div>
    </div>
  );
}

function RecursosSection({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  return (
    <div className={`flex flex-col items-center justify-center h-full w-full p-8 transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-white via-blue-50 to-white'
    }`}>
      <h2 className={`text-4xl md:text-5xl font-bold mb-6 transition-colors ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>Recursos</h2>
      <p className={`text-lg max-w-xl text-center transition-colors ${
        isDark ? 'text-white/50' : 'text-gray-500'
      }`}>Seção será implementada no Passo 4</p>
    </div>
  );
}

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

export default function LandingPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('inicio');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
    }
  }, []);

  // Suporte a navegação por teclado (setas esquerda/direita)
  useEffect(() => {
    const sectionIds = ['inicio', 'recursos', 'funcoes', 'precos', 'contato'];

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = sectionIds.indexOf(activeSection);
      if (e.key === 'ArrowRight' && currentIndex < sectionIds.length - 1) {
        e.preventDefault();
        scrollToSection(sectionIds[currentIndex + 1]);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        scrollToSection(sectionIds[currentIndex - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, scrollToSection]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const isDark = theme === 'dark';

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
          /* Esconde a scrollbar mas mantém funcionalidade */
          scrollbarWidth: 'none',        /* Firefox */
          msOverflowStyle: 'none',       /* IE/Edge */
        }}
      >
        <style jsx>{`
          main::-webkit-scrollbar {
            display: none;               /* Chrome/Safari/Opera */
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

      {/* Indicador de Progresso (bolinhas na parte inferior) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        {['inicio', 'recursos', 'funcoes', 'precos', 'contato'].map((id) => (
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
