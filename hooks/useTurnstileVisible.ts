// ============================================================
// hooks/useTurnstile.ts
//
// Modo visível (appearance: 'always') — o widget sempre aparece
// com a caixinha de verificação. Mais confiável que
// 'interaction-only' pois não depende de timing de renderização.
//
// Uso:
//   const { containerRef, token, resetWidget } = useTurnstile();
//   <div ref={containerRef} />
//   <button disabled={!token}>Entrar</button>
//
// O token é gerado assim que o usuário clica na caixinha.
// Após consumir, chame resetWidget() para limpar para o próximo uso.
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';

const SITE_KEY  = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const SCRIPT_ID = 'cf-turnstile-script';

declare global {
  interface Window {
    turnstile?: {
      render:      (container: string | HTMLElement, options: Record<string, any>) => string;
      reset:       (widgetId: string) => void;
      remove:      (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

export function useTurnstile() {
  const containerRef  = useRef<HTMLDivElement | null>(null);
  const widgetIdRef   = useRef<string | null>(null);
  const [token, setToken]   = useState<string | null>(null);
  const [ready, setReady]   = useState(false);

  // Carrega o script uma única vez por página
  useEffect(() => {
    if (!SITE_KEY) return; // sem chave → não carrega nada

    if (document.getElementById(SCRIPT_ID)) {
      setReady(true);
      return;
    }
    const script    = document.createElement('script');
    script.id       = SCRIPT_ID;
    script.src      = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async    = true;
    script.onload   = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  // Renderiza o widget quando script carrega e container existe
  useEffect(() => {
    if (!ready || !containerRef.current || !SITE_KEY) return;
    if (widgetIdRef.current) return; // já renderizado

    widgetIdRef.current = window.turnstile?.render(containerRef.current, {
      sitekey:    SITE_KEY,
      appearance: 'always',   // ← sempre visível, comportamento previsível
      theme:      'auto',
      callback: (t: string) => {
        setToken(t);
      },
      'error-callback': () => {
        setToken(null);
      },
      'expired-callback': () => {
        setToken(null);
      },
    }) ?? null;
  }, [ready]);

  // Remove widget ao desmontar
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  // Chame após consumir o token para permitir novo submit
  const resetWidget = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  return { containerRef, token, resetWidget, ready };
}
