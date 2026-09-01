'use client';

// components/landing/RecursoCardsSlide.tsx

import { ReactNode } from 'react';

interface RecursoCard {
  icon: ReactNode;
  title: string;
  highlight: string;
  highlightLabel: string;
  description: string;
  color: 'green' | 'blue';
}

interface RecursoCardsSlideProps {
  theme?: 'dark' | 'light';
  recursos: RecursoCard[];
  currentIndex: number;
  totalCount: number;
}

const colorStyles = {
  green: {
    dark:  { iconBg: 'bg-green-500/15', iconText: 'text-green-400', highlightText: 'text-green-400', border: 'border-green-500/10', cardBg: 'bg-green-500/5' },
    light: { iconBg: 'bg-green-100',    iconText: 'text-green-600', highlightText: 'text-green-600', border: 'border-green-200',    cardBg: 'bg-green-50' },
  },
  blue: {
    dark:  { iconBg: 'bg-blue-500/15',  iconText: 'text-blue-400',  highlightText: 'text-blue-400',  border: 'border-blue-500/10', cardBg: 'bg-blue-500/5' },
    light: { iconBg: 'bg-blue-100',     iconText: 'text-blue-600',  highlightText: 'text-blue-600',  border: 'border-blue-200',    cardBg: 'bg-blue-50' },
  },
};

export default function RecursoCardsSlide({
  theme = 'dark',
  recursos,
  currentIndex,
  totalCount,
}: RecursoCardsSlideProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        h-full w-full overflow-hidden
        transition-colors duration-500
        ${isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-blue-50/50 to-white'
        }
      `}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/3 left-1/3 w-[40%] h-[40%] rounded-full blur-[120px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-200/15'}`} />
      </div>

      <div
        className={`
          relative z-10
          flex flex-col items-center
          w-full max-w-4xl mx-auto
          px-4 sm:px-8 lg:px-12
          pt-[68px] pb-[52px] md:pt-6 md:pb-6
          gap-3
          [@media(min-height:720px)_and_(max-width:767px)]:gap-5
          sm:gap-4 md:gap-6
        `}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            Recurso {currentIndex + 1} de {totalCount}
          </p>
          <h2
            className={`
              font-bold
              text-lg sm:text-2xl md:text-3xl
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            e não para por aí...
          </h2>
        </div>

        {/* ── Cards 2×2 ──────────────────────────────────────── */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
          {recursos.map((recurso, i) => {
            const s = colorStyles[recurso.color][isDark ? 'dark' : 'light'];
            return (
              <div
                key={i}
                className={`
                  flex items-center gap-3 sm:gap-4
                  p-3.5 sm:p-5 rounded-2xl border
                  transition-all duration-300 hover:scale-[1.02] cursor-default
                  ${s.cardBg} ${s.border}
                `}
              >
                {/* Ícone */}
                <div className={`flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${s.iconBg}`}>
                  <div className={`${s.iconText} [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6`}>
                    {recurso.icon}
                  </div>
                </div>

                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                    <span className={`text-lg sm:text-xl md:text-2xl font-bold ${s.highlightText}`}>{recurso.highlight}</span>
                    <span className={`text-[10px] sm:text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{recurso.highlightLabel}</span>
                  </div>
                  <h3 className={`text-xs sm:text-sm md:text-base font-semibold mb-0.5 sm:mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {recurso.title}
                  </h3>
                  {/* Descrição some em telas baixas */}
                  <p
                    className={`
                      text-[10px] sm:text-xs md:text-sm leading-relaxed
                      [@media(max-height:620px)_and_(max-width:767px)]:hidden
                      ${isDark ? 'text-white/45' : 'text-gray-500'}
                    `}
                  >
                    {recurso.description}
                  </p>
                </div>
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
