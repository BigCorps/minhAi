'use client';

// components/landing/WordCarousel.tsx
// Único componente client da landing — só o carrossel animado de palavras
import { useState, useEffect } from 'react';

const OPCOES = [
  'Assistente', 'Funcionária', 'Atendente', 'Minha', 'Nossa', 'Sua',
  'Gerente', 'Totem', 'Auxiliar', 'Secretária', 'Operadora',
  'Vendedora', 'Recepcionista', 'Agente', 'Analista',
  'Estoquista', 'Consultora', 'Coordenadora', 'Divulgadora', 'App',
];

interface WordCarouselProps {
  isDark: boolean;
}

export function WordCarousel({ isDark }: WordCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % OPCOES.length);
        setIsAnimating(false);
      }, 300);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-block relative overflow-hidden text-center"
      style={{ height: '1.2em', verticalAlign: '-0.30em' }}
    >
      {/* Palavras invisíveis para reservar largura máxima */}
      {OPCOES.map((palavra) => (
        <span key={palavra} className="invisible block h-0 px-1" aria-hidden="true">
          {palavra}
        </span>
      ))}
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${
          isAnimating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        } ${isDark ? 'text-green-400' : 'text-green-600'}`}
      >
        {OPCOES[currentIndex]}
      </span>
    </span>
  );
}
