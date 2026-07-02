'use client';

// components/landing/VantagensInfoSlide.tsx

import { ReactNode, useEffect, useState } from 'react';

interface VantagemCard {
  icon: ReactNode;
  title: string;
  highlight: string;
  description: string;
  color: 'blue' | 'green';
}

interface VantagensInfoSlideProps {
  theme?: 'dark' | 'light';
  label: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  cards: VantagemCard[];
  /** Intervalo da alternância automática imagem ↔ cards. Padrão: 5000ms. */
  rotateMs?: number;
}

const colorMap = {
  blue: {
    dark:  { iconBg: 'bg-blue-500/15',  iconText: 'text-blue-400',  highlight: 'text-blue-400',  border: 'border-blue-500/10' },
    light: { iconBg: 'bg-blue-100',     iconText: 'text-blue-600',  highlight: 'text-blue-600',  border: 'border-blue-100' },
  },
  green: {
    dark:  { iconBg: 'bg-green-500/15', iconText: 'text-green-400', highlight: 'text-green-400', border: 'border-green-500/10' },
    light: { iconBg: 'bg-green-100',    iconText: 'text-green-600', highlight: 'text-green-600', border: 'border-green-100' },
  },
};

export default function VantagensInfoSlide({
  theme = 'dark',
  label,
  title,
  description,
  imageSrc,
  imageAlt,
  cards,
  rotateMs = 5000,
}: VantagensInfoSlideProps) {
  const isDark = theme === 'dark';

  // frame 0 = imagem, frame 1 = cards de vantagens
  const [frame, setFrame] = useState<0 | 1>(0);

  useEffect(() => {
    const t = setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0));
    }, rotateMs);
    return () => clearInterval(t);
  }, [rotateMs]);

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
        <div className={`absolute top-1/4 right-1/4 w-[50%] h-[50%] rounded-full blur-[140px] ${isDark ? 'bg-green-500/5' : 'bg-green-200/15'}`} />
      </div>

      <div
        className={`
          relative z-10
          flex flex-col md:flex-row
          items-center justify-center md:justify-between
          h-full w-full max-w-7xl mx-auto
          px-5 sm:px-10 lg:px-16
          pt-[68px] pb-[52px] md:pt-0 md:pb-0
          gap-3
          [@media(min-height:720px)_and_(max-width:767px)]:gap-5
          md:gap-12
        `}
      >

        {/* ── Texto — label, título, frase abaixo do título ────── */}
        <div className="flex flex-col items-center md:items-start justify-center text-center md:text-left order-1 w-full md:w-1/2 max-w-xl md:max-w-none">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest leading-none mb-3 sm:mb-5 ${
            isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600'
          }`}>
            {label}
          </span>

          <h2
            className={`
              font-bold leading-tight transition-colors
              mb-2 sm:mb-5
              text-xl
              [@media(min-height:680px)_and_(max-width:767px)]:text-2xl
              sm:text-3xl md:text-4xl lg:text-5xl
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            {title}
          </h2>

          <p
            className={`
              text-xs sm:text-base md:text-lg leading-relaxed transition-colors
              [@media(max-height:640px)_and_(max-width:767px)]:hidden
              ${isDark ? 'text-white/60' : 'text-gray-500'}
            `}
          >
            {description}
          </p>
        </div>

        {/* ── Visual — alterna entre a imagem e os 3 cards de vantagens ── */}
        <div
          className={`
            relative flex items-center justify-center
            order-2 w-full md:w-1/2
            [@media(max-height:560px)_and_(max-width:767px)]:hidden
          `}
        >
          <div
            className="relative w-full max-w-[320px] md:max-w-full"
            style={{ height: 'clamp(240px, 48vh, 520px)' }}
          >
            {/* Frame 0 — imagem */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
                frame === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={imageSrc}
                alt={imageAlt}
                className="drop-shadow-2xl"
                style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
              />
            </div>

            {/* Frame 1 — os 3 cards de vantagens */}
            <div
              className={`absolute inset-0 flex flex-col justify-center gap-2 sm:gap-3 transition-opacity duration-700 ${
                frame === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {cards.map((card, i) => {
                const c = colorMap[card.color][isDark ? 'dark' : 'light'];
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4 transition-all duration-300 ${c.border} ${
                      isDark ? 'bg-white/[0.02]' : 'bg-white/80 shadow-sm'
                    }`}
                  >
                    <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                      <div className={`${c.iconText} [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5`}>{card.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                        <h3 className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {card.title}
                        </h3>
                        <span className={`text-xs font-bold ${c.highlight}`}>{card.highlight}</span>
                      </div>
                      <p className={`text-[10px] sm:text-xs leading-relaxed ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                        {card.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}