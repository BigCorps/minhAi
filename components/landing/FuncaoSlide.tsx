'use client';

import { ReactNode } from 'react';

interface FuncaoSlideProps {
  theme?: 'dark' | 'light';
  icon: ReactNode;
  title: string;
  subtitle: string;
  description: string;
  color: 'green' | 'blue';
  currentIndex: number;
  totalCount: number;
}

const colorStyles = {
  green: {
    dark: {
      iconBg: 'bg-green-500/15',
      iconText: 'text-green-400',
      tag: 'bg-green-500/10 text-green-400 border-green-500/20',
      subtitleText: 'text-green-400/70',
      dotActive: 'bg-green-400',
    },
    light: {
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
      tag: 'bg-green-50 text-green-600 border-green-200',
      subtitleText: 'text-green-600/70',
      dotActive: 'bg-green-500',
    },
  },
  blue: {
    dark: {
      iconBg: 'bg-blue-500/15',
      iconText: 'text-blue-400',
      tag: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      subtitleText: 'text-blue-400/70',
      dotActive: 'bg-blue-400',
    },
    light: {
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      tag: 'bg-blue-50 text-blue-600 border-blue-200',
      subtitleText: 'text-blue-600/70',
      dotActive: 'bg-blue-500',
    },
  },
};

export default function FuncaoSlide({
  theme = 'dark',
  icon,
  title,
  subtitle,
  description,
  color,
  currentIndex,
  totalCount,
}: FuncaoSlideProps) {
  const isDark = theme === 'dark';
  const s = colorStyles[color][theme];

  return (
    <div
      className={`relative flex flex-col items-center justify-center h-full w-full px-6 sm:px-8 lg:px-12 overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/3 right-1/4 w-[40%] h-[40%] rounded-full blur-[120px] ${
            color === 'green'
              ? isDark ? 'bg-green-500/5' : 'bg-green-200/15'
              : isDark ? 'bg-blue-500/5' : 'bg-blue-200/15'
          }`}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        {/* Indicador: Função X de Y */}
        <p
          className={`text-xs font-medium uppercase tracking-widest mb-3 transition-colors ${s.subtitleText}`}
        >
          Função {currentIndex + 1} de {totalCount}
        </p>

        {/* Tag de subtítulo */}
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-medium border mb-8 transition-colors ${s.tag}`}
        >
          {subtitle}
        </span>

        {/* Ícone grande */}
        <div
          className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center mb-8 transition-colors ${s.iconBg}`}
        >
          <div className={`${s.iconText} transition-colors [&>svg]:w-10 [&>svg]:h-10 md:[&>svg]:w-12 md:[&>svg]:h-12`}>
            {icon}
          </div>
        </div>

        {/* Título */}
        <h2
          style={{ fontFamily: "'Nunito', sans-serif" }}
          className={`text-2xl sm:text-3xl md:text-4xl font-semibold mb-4 transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {title}
        </h2>

        {/* Descrição */}
        <p
          className={`text-sm sm:text-base md:text-lg leading-relaxed max-w-lg transition-colors ${
            isDark ? 'text-white/50' : 'text-gray-500'
          }`}
        >
          {description}
        </p>

        {/* Indicador de progresso das funções */}
        <div className="flex items-center gap-2 mt-10">
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

        {/* Hint de scroll */}
        <p
          className={`mt-6 text-xs transition-colors ${
            isDark ? 'text-white/20' : 'text-gray-300'
          }`}
        >
          {currentIndex < totalCount - 1 ? 'Role para ver a próxima função →' : 'Próximo: Nossos Planos →'}
        </p>
      </div>
    </div>
  );
}
