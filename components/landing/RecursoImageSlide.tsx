'use client';

// components/landing/RecursoImageSlide.tsx

import { ReactNode, useEffect, useState } from 'react';

interface RecursoImageSlideProps {
  theme?: 'dark' | 'light';
  label: string;
  title: string;
  description: string;
  /** String única (imagem fixa) ou array (alterna automaticamente entre elas). */
  imageSrc: string | string[];
  imageAlt: string;
  color: 'green' | 'blue';
  currentIndex: number;
  totalCount: number;
  nextHint?: string;
  extraContent?: ReactNode;
  hideDots?: boolean;
  /** Intervalo da troca automática quando imageSrc é array. Padrão: 5000ms. */
  imageRotateMs?: number;
}

const colorStyles = {
  green: {
    dark:  { accent: 'text-green-400', border: 'border-green-400/20', labelBg: 'bg-green-500/10', labelText: 'text-green-400', dotActive: 'bg-green-400', glow: 'bg-green-500/5' },
    light: { accent: 'text-green-600', border: 'border-green-500/20', labelBg: 'bg-green-100',    labelText: 'text-green-600', dotActive: 'bg-green-500', glow: 'bg-green-200/15' },
  },
  blue: {
    dark:  { accent: 'text-blue-400',  border: 'border-blue-400/20',  labelBg: 'bg-blue-500/10',  labelText: 'text-blue-400',  dotActive: 'bg-blue-400',  glow: 'bg-blue-500/5' },
    light: { accent: 'text-blue-600',  border: 'border-blue-500/20',  labelBg: 'bg-blue-100',     labelText: 'text-blue-600',  dotActive: 'bg-blue-500',  glow: 'bg-blue-200/15' },
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
  extraContent,
  hideDots = false,
  imageRotateMs = 5000,
}: RecursoImageSlideProps) {
  const isDark = theme === 'dark';
  const s = colorStyles[color][theme];

  // Normaliza imageSrc em array — string única vira array de 1 item,
  // tratado de forma idêntica ao caso de múltiplas imagens (sem rotação).
  const images = Array.isArray(imageSrc) ? imageSrc : [imageSrc];
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setImgIndex((i) => (i + 1) % images.length);
    }, imageRotateMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, imageRotateMs]);

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
        <div className={`absolute top-1/4 right-1/4 w-[50%] h-[50%] rounded-full blur-[140px] ${s.glow}`} />
      </div>

      {/*
        Mobile: coluna — imagem em cima (compacta), texto abaixo
        Desktop: linha lado a lado
        pt/pb compensam header e dots — zero overflow
      */}
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

        {/* ── Imagem ─────────────────────────────────────────── */}
        <div
          className={`
            flex items-center justify-center
            order-1 md:order-2
            w-full md:w-1/2
            [@media(max-height:560px)_and_(max-width:767px)]:hidden
          `}
        >
          <div
            className="relative w-full max-w-[280px] md:max-w-full md:max-h-[55vh] transition-transform duration-300 hover:scale-105"
            style={{ height: 'clamp(120px, 30vh, 280px)' }}
          >
            {images.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={imageAlt}
                className={`absolute inset-0 m-auto drop-shadow-2xl transition-opacity duration-700 ${
                  i === imgIndex ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
              />
            ))}
          </div>
        </div>

        {/* ── Texto ──────────────────────────────────────────── */}
        <div className="flex flex-col items-center md:items-start justify-center text-center md:text-left order-2 md:order-1 w-full md:w-1/2 max-w-xl md:max-w-none">

          {/* Label */}
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-3 sm:mb-5 ${s.labelBg} ${s.labelText}`}>
            {label}
          </span>

          {/* Título */}
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

          {/* Descrição — some em telas baixas */}
          <p
            className={`
              text-xs sm:text-base md:text-lg leading-relaxed transition-colors
              [@media(max-height:640px)_and_(max-width:767px)]:hidden
              ${isDark ? 'text-white/60' : 'text-gray-500'}
            `}
          >
            {description}
          </p>

          {/* Conteúdo extra opcional — ex: DomainPreviewPicker. Sempre visível
              (não usa a mesma media query de altura da descrição) para garantir
              que fique funcional em qualquer tamanho de tela. */}
          {extraContent && (
            <div className="w-full mt-3 sm:mt-5">
              {extraContent}
            </div>
          )}

          {/* Progress dots — ocultos quando a página não pertence a uma sequência (ex: página 2, fora do bloco de Recursos) */}
          {!hideDots && (
            <div className="flex items-center gap-2 mt-4 sm:mt-8">
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
          )}

        </div>
      </div>
    </div>
  );
}