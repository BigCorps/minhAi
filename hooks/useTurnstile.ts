import { useEffect, useRef, useCallback, useState } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const SCRIPT_ID = 'cf-turnstile-script';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, any>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      execute: (container?: string | HTMLElement) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

function dormir(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  // O script pode já existir porque outro componente o adicionou, mas ainda
  // estar carregando. "Existe no DOM" não significa "window.turnstile pronto".
  useEffect(() => {
    if (!SITE_KEY) return;

    let cancelado = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const pronto = () => {
      if (!cancelado && window.turnstile) {
        setReady(true);
        if (timer) clearInterval(timer);
      }
    };

    if (window.turnstile) {
      pronto();
      return;
    }

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener('load', pronto);
    // Rede/cache podem fazer o evento load acontecer entre a consulta e o
    // addEventListener. O polling curto fecha essa janela sem recriar script.
    timer = setInterval(pronto, 100);

    return () => {
      cancelado = true;
      script?.removeEventListener('load', pronto);
      if (timer) clearInterval(timer);
    };
  }, []);

  // Para modal/SPAs, o desafio só é executado quando a pessoa clica em enviar.
  // Se Cloudflare exigir interação, o widget aparece no container real do form.
  useEffect(() => {
    if (!ready || !containerRef.current || !SITE_KEY || !window.turnstile) return;
    if (widgetIdRef.current) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        execution: 'execute',
        appearance: 'interaction-only',
        theme: 'light',
        size: 'flexible',
        retry: 'auto',
        'refresh-expired': 'manual',
        action: 'conviteria_publico',
        callback: (token: string) => {
          tokenRef.current = token;
        },
        'error-callback': () => {
          tokenRef.current = null;
        },
        'expired-callback': () => {
          tokenRef.current = null;
        },
      });
    } catch {
      widgetIdRef.current = null;
    }
  }, [ready]);

  useEffect(() => {
    return () => {
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      tokenRef.current = null;

      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // O próprio Turnstile pode já ter removido o iframe ao fechar modal.
        }
      }
    };
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!SITE_KEY) return null;

    // Dá tempo ao script/widget para terminar de montar depois que o modal abre.
    for (let i = 0; i < 50; i++) {
      if (widgetIdRef.current && window.turnstile && containerRef.current?.isConnected) break;
      await dormir(100);
    }

    if (!widgetIdRef.current || !window.turnstile || !containerRef.current?.isConnected) {
      return null;
    }

    tokenRef.current = null;

    try {
      window.turnstile.reset(widgetIdRef.current);
      window.turnstile.execute(containerRef.current);
    } catch {
      return null;
    }

    // Token Turnstile pode exigir interação do visitante. Mantemos o form
    // aberto enquanto ele aparece e aguardamos a callback.
    for (let i = 0; i < 150; i++) {
      if (tokenRef.current) {
        const token = tokenRef.current;
        tokenRef.current = null; // token é single-use
        return token;
      }
      await dormir(100);
    }

    return null;
  }, []);

  return { getToken, containerRef, ready };
}
