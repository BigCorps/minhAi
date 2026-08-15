'use client';
// lib/useMarca.ts
//
// Devolve a marca do host atual, para componentes COMPARTILHADOS entre os
// apps (banner de cookies, toasts, modais de sistema) se pintarem com a cor
// certa em vez da cor fixa da minhAi.
//
// Por que hook e não contexto: `getBrandByHost` é função pura sobre o
// hostname. Não precisa de provider, não precisa de fetch, não precisa de
// estado global.

import { useEffect, useState } from 'react';
import { BRANDS, getBrandByHost, type BrandKey } from './brand';

/**
 * Marca do host atual.
 *
 * Resolve dentro de `useEffect` de propósito: `window` não existe no
 * servidor, e ler direto no corpo do componente causaria erro de hidratação
 * (servidor renderiza uma cor, cliente outra, o React reclama).
 *
 * Enquanto não hidrata, devolve `minhai`. Para o banner de cookies isso é
 * irrelevante — ele só aparece depois da hidratação. Se usar em algo visível
 * no primeiro paint, o certo é ler o host no servidor e passar por prop.
 */
export function useMarca() {
  const [chave, setChave] = useState<BrandKey>('minhai');

  useEffect(() => {
    setChave(getBrandByHost(window.location.hostname));
  }, []);

  return { chave, marca: BRANDS[chave] };
}
