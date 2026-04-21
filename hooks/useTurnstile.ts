// ============================================================
// hooks/useTurnstile.ts
// Caminho: hooks/useTurnstile.ts
//
// Hook que carrega o script do Cloudflare Turnstile e expõe
// um método para obter o token de verificação.
//
// Uso:
//   const { getToken, TurnstileWidget } = useTurnstile();
//   ...
//   const token = await getToken();
//   if (!token) { setError('Verificação falhou'); return; }
//   // prosseguir com a ação
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const SCRIPT_ID = 'cf-turnstile-script';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, any>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef  = useRef<string | null>(null);
  const tokenRef     = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  // Carrega o script uma única vez por página
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) {
      setReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id  = SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  // Renderiza o widget quando o script carrega e o container existe
  useEffect(() => {
    if (!ready || !containerRef.current || !SITE_KEY) return;
    if (widgetIdRef.current) return; // já renderizado

    widgetIdRef.current = window.turnstile?.render(containerRef.current, {
      sitekey: SITE_KEY,
      size: 'invisible',
      callback: (token: string) => {
        tokenRef.current = token;
      },
      'error-callback': () => {
        tokenRef.current = null;
      },
      'expired-callback': () => {
        tokenRef.current = null;
      },
    }) ?? null;
  }, [ready]);

  // Desmonta o widget ao desmontar o componente
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  /**
   * Obtém o token do Turnstile.
   * - Se o token já existe (widget invisible completou), retorna direto.
   * - Aguarda até 8s para o widget completar (modo managed/invisible).
   * - Retorna null se não houver SITE_KEY (dev sem configuração).
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!SITE_KEY) return null; // dev bypass — edge também ignora

    // Token já disponível
    if (tokenRef.current) {
      const t = tokenRef.current;
      tokenRef.current = null; // tokens são single-use
      return t;
    }

    // Reset para forçar nova verificação
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }

    // Aguarda o callback com timeout
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (tokenRef.current) {
          clearInterval(interval);
          const t = tokenRef.current;
          tokenRef.current = null;
          resolve(t);
          return;
        }
        if (Date.now() - start > 8000) {
          clearInterval(interval);
          resolve(null);
        }
      }, 100);
    });
  }, []);

  /**
   * Div invisível que deve ser renderizado no JSX do componente.
   * Coloque em qualquer lugar do return — ele não ocupa espaço visual.
   */
  const TurnstileWidget = (
    <div ref={containerRef} style={{ display: 'none' }} aria-hidden="true" />
  );

  return { getToken, TurnstileWidget, ready };
}
