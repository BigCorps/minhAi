'use client';
import { useState, useEffect } from 'react';

/**
 * Detecta se o usuário está em uma tela mobile.
 * Baseado APENAS no tamanho da janela (matchMedia).
 * UserAgent foi removido pois misturar hardware + viewport
 * causa layout incorreto (ex: desktop com janela estreita,
 * ou dispositivo mobile em tela grande).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}
