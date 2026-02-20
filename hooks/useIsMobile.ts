'use client';

import { useState, useEffect } from 'react';

/**
 * Detecta se o usuário está em um dispositivo móvel.
 * Combina userAgent (tipo de hardware) + matchMedia (tamanho de tela).
 * userAgent é checado uma vez; matchMedia responde a redimensionamento.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // Avaliação inicial no cliente (evita hydration mismatch no Next.js)
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
  });

  useEffect(() => {
    // userAgent não muda — checar uma vez é suficiente
    const isMobileUA = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );

    // matchMedia captura tablets/janelas redimensionadas
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const update = () => {
      setIsMobile(isMobileUA || mediaQuery.matches);
    };

    update(); // checar imediatamente
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isMobile;
}
