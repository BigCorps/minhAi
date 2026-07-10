'use client';

// components/landing/FuncaoCardsSlide.tsx

import { ReactNode } from 'react';

interface FuncaoCard {
  title: string;
  description: string;
  color: 'green' | 'blue';
  icon: ReactNode;
}

interface FuncaoCardsSlideProps {
  theme?: 'dark' | 'light';
  cards: FuncaoCard[];
  currentIndex: number;
  totalCount: number;
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

export default function FuncaoCardsSlide({
  theme = 'dark',
  cards,
  currentIndex,
  totalCount,
}: FuncaoCardsSlideProps) {
  const isDark = theme === 'dark';

  const glowColor = cards[0]?.color ?? 'blue';
  const glowClass = isDark
    ? glowColor === 'green' ? 'bg-green-500/5' : 'bg-blue-500/5'
    : glowColor === 'green' ? 'bg-green-200/20' : 'bg-blue-200/20';

  const count = cards.length;
  const gridClass = count === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        h-full w-full overflow-hidden
        transition-colors duration-500
        ${isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
        }
      `}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/3 right-1/4 w-[45%] h-[45%] rounded-full blur-[130px] ${glowClass}`} />
      </div>

      <div
        className={`
          relative z-10 w-full max-w-4xl mx-auto
          flex flex-col items-center
          px-4 sm:px-8 lg:px-12
          pt-[68px] pb-[52px] md:pt-6 md:pb-6
          gap-2.5
          [@media(min-height:720px)_and_(max-width:767px)]:gap-4
          sm:gap-4 md:gap-5
        `}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            Funções — Página {currentIndex + 1} de {totalCount}
          </p>
          <h2
            className={`
              font-bold
              text-base
              [@media(min-height:680px)_and_(max-width:767px)]:text-lg
              sm:text-xl md:text-2xl
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            O que o seu funcionário IA pode fazer
          </h2>
        </div>

        {/* ── Cards ──────────────────────────────────────────── */}
        <div className={`w-full grid ${gridClass} gap-2 sm:gap-3 md:gap-4`}>
          {cards.map((card, i) => {
            const s = colorStyles[card.color][isDark ? 'dark' : 'light'];
            return (
              <div
                key={i}
                className={`
                  flex flex-col gap-2 sm:gap-3
                  p-3.5 sm:p-5 rounded-2xl border
                  transition-all duration-300 hover:scale-[1.02] cursor-default
                  ${s.cardBg} ${s.border}
                `}
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                    <div className={`${s.iconText} [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5`}>
                      {card.icon}
                    </div>
                  </div>
                  <h3 className={`text-xs sm:text-sm md:text-base font-bold ${s.titleText}`}>
                    {card.title}
                  </h3>
                </div>
                {/* Descrição some em telas muito baixas */}
                <p
                  className={`
                    text-[11px] sm:text-xs md:text-sm leading-relaxed
                    [@media(max-height:600px)_and_(max-width:767px)]:hidden
                    ${isDark ? 'text-white/50' : 'text-gray-500'}
                  `}
                >
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Progress dots ──────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalCount }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? `w-8 ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`
                  : `w-2 ${isDark ? 'bg-white/15' : 'bg-gray-200'}`
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
