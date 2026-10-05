'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase-browser';

// Mesma correção aplicada na landing da ConviteIA (set/2026):
// antes, a landing e o login ficavam escondidos atrás de um logo pulsando
// até o servidor do Supabase responder se havia sessão. Quem chegava pelo
// anúncio (navegador do Instagram, 4G) via tela vazia e saía antes de a
// página aparecer, e o pixel da Meta nem chegava a carregar.
//
// Agora a página aparece na hora. A checagem usa getSession(), que lê a
// sessão salva no navegador sem ida ao servidor, e só redireciona quem já
// está logado. A segurança do painel continua sendo validada no servidor.

function routeContext() {
  if (typeof window === 'undefined') {
    return { shouldCheck: false, destination: '/dashboard' };
  }

  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname;
  const rootHost = host === 'midia.pro' || host === 'www.midia.pro';

  if (rootHost && (path === '/' || path === '/login')) {
    return { shouldCheck: true, destination: '/dashboard' };
  }

  // Preview/local acessado pelo prefixo interno do monorepo.
  if (path === '/midia' || path === '/midia/login') {
    return { shouldCheck: true, destination: '/midia/dashboard' };
  }

  return { shouldCheck: false, destination: '/dashboard' };
}

export default function MidiaSessionRouteGuard({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    const ctx = routeContext();
    if (!ctx.shouldCheck) return () => { mounted = false; };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (data.session?.user) {
          // replace evita que "voltar" leve o usuário autenticado novamente
          // para a landing/login: usuário logado vai direto ao painel.
          window.location.replace(ctx.destination);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return <>{children}</>;
}
