'use client';

// components/landing/FuncaoCardsCarousel.tsx

import { ReactNode, useEffect, useState, useCallback } from 'react';

interface FuncaoCard {
  title: string;
  description: string;
  color: 'green' | 'blue';
  icon: ReactNode;
}

interface FuncaoGroup {
  id: string;
  cards: FuncaoCard[];
}

interface FuncaoCardsCarouselProps {
  theme?: 'dark' | 'light';
  /** Badge acima do título. Padrão: 'Funções'. */
  label?: string;
  title: string;
  description: string;
  groups: FuncaoGroup[];
  /** Intervalo da rotação automática, em ms. Padrão: 5000 (5s). */
  rotateMs?: number;
}

const colorStyles = {
  green: {
    dark:  { border: 'border-green-500/15', cardBg: 'bg-green-500/5',  iconBg: 'bg-green-500/15',  iconText: 'text-green-400', titleText: 'text-green-400' },
    light: { border: 'border-green-200',    cardBg: 'bg-green-50',     iconBg: 'bg-green-100',     iconText: 'text-green-600', titleText: 'text-green-700' },
  },
  blue: {
    dark:  { border: 'border-blue-500/15',  cardBg: 'bg-blue-500/5',   iconBg: 'bg-blue-500/15',   iconText: 'text-blue-400',  titleText: 'text-blue-400' },
    light: { border: 'border-blue-200',     cardBg: 'bg-blue-50',      iconBg: 'bg-blue-100',      iconText: 'text-blue-600',  titleText: 'text-blue-700' },
  },
};

export default function FuncaoCardsCarousel({
  theme = 'dark',
  label = 'Funções',
  title,
  description,
  groups,
  rotateMs = 5000,
}: FuncaoCardsCarouselProps) {
  const isDark = theme === 'dark';
  const total = groups.length;

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Rotação automática — reinicia a contagem sempre que `current` muda
  // (seja por auto-avanço ou clique manual), e para enquanto `paused`.
  useEffect(() => {
    if (paused || total <= 1) return;
    const t = setTimeout(() => {
      setCurrent((c) => (c + 1) % total);
    }, rotateMs);
    return () => clearTimeout(t);
  }, [current, paused, total, rotateMs]);

  const goPrev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);
  const goNext = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);

  const activeGroup = groups[current];
  const count = activeGroup.cards.length;
  // 3 cards: grid de 2 colunas, 1º card ocupa as 2 colunas (fica sozinho
  // acima), os outros 2 dividem a linha de baixo — evita cards espremidos
  // em 3 colunas cortando o texto. 4 cards: grade 2x2 normal.
  const gridClass = 'grid-cols-1 sm:grid-cols-2';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        w-full overflow-hidden bg-transparent
        transition-colors duration-500
      `}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/3 right-1/4 w-[45%] h-[45%] rounded-full blur-[130px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'}`} />
      </div>

      <div
        className={`
          relative z-10
          flex flex-col md:flex-row
          items-center justify-center md:justify-between
          w-full max-w-7xl mx-auto
          px-5 sm:px-10 lg:px-16
          pt-24 pb-16 sm:pt-28 sm:pb-20 md:py-16
          gap-8 md:gap-12
        `}
      >

        {/* ── Texto — sempre primeiro no mobile (acima), à esquerda no desktop ── */}
        <div className="flex flex-col items-center md:items-start justify-center text-center md:text-left order-1 w-full md:w-1/2 max-w-xl md:max-w-none">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest leading-none mb-3 sm:mb-5 ${
            isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600'
          }`}>
            {label}
          </span>
          <h2
            className={`
              font-bold leading-tight transition-colors
              mb-3 sm:mb-5
              text-2xl sm:text-3xl md:text-4xl lg:text-5xl
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            {title}
          </h2>
          <p
            className={`
              text-sm sm:text-base md:text-lg leading-relaxed transition-colors
              ${isDark ? 'text-white/60' : 'text-gray-500'}
            `}
          >
            {description}
          </p>
        </div>

        {/* ── Carrossel de cards ───────────────────────────────
            Pausa a rotação automática enquanto o mouse está sobre a área
            (desktop). No mobile, a rotação continua em segundo plano —
            as setas permitem navegação manual a qualquer momento. */}
        <div
          className="flex flex-col items-center justify-center order-2 w-full md:w-1/2"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 w-full">
            <button
              onClick={goPrev}
              aria-label="Grupo anterior de funções"
              className={`
                flex-shrink-0 p-1.5 sm:p-2 rounded-full border transition-colors
                ${isDark
                  ? 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                  : 'bg-black/5 border-black/10 text-gray-400 hover:text-gray-700 hover:bg-black/10'
                }
              `}
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className={`flex-1 grid ${gridClass} gap-2 sm:gap-3`}>
              {activeGroup.cards.map((card, i) => {
                const s = colorStyles[card.color][isDark ? 'dark' : 'light'];
                return (
                  <div
                    key={`${activeGroup.id}-${i}`}
                    className={`
                      flex flex-col gap-2 sm:gap-3
                      p-3 sm:p-4 rounded-2xl border
                      transition-all duration-300
                      ${count === 3 && i === 0 ? 'sm:col-span-2' : ''}
                      ${s.cardBg} ${s.border}
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                        <div className={`${s.iconText} [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5`}>
                          {card.icon}
                        </div>
                      </div>
                      <h3 className={`text-xs sm:text-sm font-bold leading-tight ${s.titleText}`}>
                        {card.title}
                      </h3>
                    </div>
                    <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={goNext}
              aria-label="Próximo grupo de funções"
              className={`
                flex-shrink-0 p-1.5 sm:p-2 rounded-full border transition-colors
                ${isDark
                  ? 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                  : 'bg-black/5 border-black/10 text-gray-400 hover:text-gray-700 hover:bg-black/10'
                }
              `}
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Dots locais — indicam e permitem pular direto pra um dos 4 grupos */}
          <div className="flex items-center gap-1.5 mt-3 sm:mt-4">
            {groups.map((g, i) => (
              <button
                key={g.id}
                onClick={() => setCurrent(i)}
                aria-label={`Ir para grupo ${i + 1} de funções`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? `w-6 ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`
                    : `w-1.5 ${isDark ? 'bg-white/15' : 'bg-gray-200'}`
                }`}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}