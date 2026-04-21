'use client';

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
    dark: {
      iconBg: 'bg-green-500/15',
      iconText: 'text-green-400',
      highlightText: 'text-green-400',
      border: 'border-green-500/10',
      cardBg: 'bg-green-500/5',
    },
    light: {
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
      highlightText: 'text-green-600',
      border: 'border-green-200',
      cardBg: 'bg-green-50',
    },
  },
  blue: {
    dark: {
      iconBg: 'bg-blue-500/15',
      iconText: 'text-blue-400',
      highlightText: 'text-blue-400',
      border: 'border-blue-500/10',
      cardBg: 'bg-blue-500/5',
    },
    light: {
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      highlightText: 'text-blue-600',
      border: 'border-blue-200',
      cardBg: 'bg-blue-50',
    },
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
      className={`relative flex flex-col h-full w-full overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-blue-50/50 to-white'
      }`}
    >
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/3 left-1/3 w-[40%] h-[40%] rounded-full blur-[120px] ${
          isDark ? 'bg-blue-500/5' : 'bg-blue-200/15'
        }`} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 sm:px-8 lg:px-12 pt-20 pb-6 md:pt-24 md:pb-8">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            Recurso {currentIndex + 1} de {totalCount}
          </p>
          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-xl sm:text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            e não para por aí...
          </h2>
        </div>

        {/* Cards grid: 2x2 on desktop, 1 column on mobile (scrollable) */}
        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 overflow-y-auto md:overflow-visible flex-1 md:flex-none">
          {recursos.map((recurso, i) => {
            const s = colorStyles[recurso.color][theme];
            return (
              <div
                key={i}
                className={`flex items-center gap-4 p-4 md:p-5 rounded-2xl border transition-all duration-300 ease-out hover:scale-[1.03] cursor-default ${s.cardBg} ${s.border}`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center ${s.iconBg}`}>
                  <div className={`${s.iconText} [&>svg]:w-6 [&>svg]:h-6 md:[&>svg]:w-7 md:[&>svg]:h-7`}>
                    {recurso.icon}
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-xl md:text-2xl font-bold ${s.highlightText}`}>{recurso.highlight}</span>
                    <span className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{recurso.highlightLabel}</span>
                  </div>
                  <h3 className={`text-sm md:text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {recurso.title}
                  </h3>
                  <p className={`text-xs md:text-sm leading-relaxed ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                    {recurso.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-4 md:mt-6">
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
