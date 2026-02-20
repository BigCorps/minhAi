'use client';

import { ReactNode } from 'react';

interface RecursoImageSlideProps {
  theme?: 'dark' | 'light';
  label: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  color: 'green' | 'blue';
  currentIndex: number;
  totalCount: number;
  nextHint?: string;
}

const colorStyles = {
  green: {
    dark: {
      accent: 'text-green-400',
      border: 'border-green-400/20',
      labelBg: 'bg-green-500/10',
      labelText: 'text-green-400',
      dotActive: 'bg-green-400',
      glow: 'bg-green-500/5',
    },
    light: {
      accent: 'text-green-600',
      border: 'border-green-500/20',
      labelBg: 'bg-green-100',
      labelText: 'text-green-600',
      dotActive: 'bg-green-500',
      glow: 'bg-green-200/15',
    },
  },
  blue: {
    dark: {
      accent: 'text-blue-400',
      border: 'border-blue-400/20',
      labelBg: 'bg-blue-500/10',
      labelText: 'text-blue-400',
      dotActive: 'bg-blue-400',
      glow: 'bg-blue-500/5',
    },
    light: {
      accent: 'text-blue-600',
      border: 'border-blue-500/20',
      labelBg: 'bg-blue-100',
      labelText: 'text-blue-600',
      dotActive: 'bg-blue-500',
      glow: 'bg-blue-200/15',
    },
  },
};

export default function RecursoImageSlide({
  theme = 'dark',
  label,
  title,
  description,
  imageSrc,
  imageAlt,
  color,
  currentIndex,
  totalCount,
  nextHint,
}: RecursoImageSlideProps) {
  const isDark = theme === 'dark';
  const s = colorStyles[color][theme];

  return (
    <div
      className={`relative flex flex-col h-full w-full overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-white via-blue-50/50 to-white'
      }`}
    >
      {/* Decorative glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 right-1/4 w-[50%] h-[50%] rounded-full blur-[140px] ${s.glow}`} />
      </div>

      {/* Content: side by side on desktop, stacked on mobile */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center h-full px-6 sm:px-10 lg:px-16 gap-8 md:gap-12 pt-20 pb-10 md:py-0">

        {/* LEFT: Text */}
        <div className="flex flex-col items-start justify-center w-full md:w-1/2 max-w-xl order-2 md:order-1">
          {/* Label */}
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-5 ${s.labelBg} ${s.labelText}`}>
            {label}
          </span>

          {/* Title */}
          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-5 transition-colors ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {title}
          </h2>

          {/* Description */}
          <p className={`text-sm sm:text-base md:text-lg leading-relaxed transition-colors ${
            isDark ? 'text-white/60' : 'text-gray-500'
          }`}>
            {description}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mt-8">
            {Array.from({ length: totalCount }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? `w-8 ${s.dotActive}`
                    : `w-2 ${isDark ? 'bg-white/15' : 'bg-gray-200'}`
                }`}
              />
            ))}
          </div>

          {/* Hint */}
          <p className={`mt-4 text-xs transition-colors ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
            {nextHint ?? (currentIndex < totalCount - 1 ? 'Role para ver mais →' : 'Próximo: Funções do eAi →')}
          </p>
        </div>

        {/* RIGHT: Image */}
        <div className="flex items-center justify-center w-full md:w-1/2 max-w-lg order-1 md:order-2">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="w-full max-w-[320px] sm:max-w-[400px] md:max-w-full object-contain drop-shadow-2xl"
            style={{ maxHeight: '55vh' }}
          />
        </div>
      </div>
    </div>
  );
}
