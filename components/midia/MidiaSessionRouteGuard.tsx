'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase-browser';

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
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const ctx = routeContext();

    if (!ctx.shouldCheck) {
      setChecking(false);
      return () => {
        mounted = false;
      };
    }

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!mounted) return;

        if (!error && data.user) {
          // replace evita que "voltar" leve o usuário autenticado novamente
          // para a landing/login. É o mesmo princípio usado no ConviteIA:
          // usuário logado nunca recebe a experiência pública de aquisição.
          window.location.replace(ctx.destination);
          return;
        }

        setChecking(false);
      })
      .catch(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-white">
        <div className="text-center">
          <Image
            src="/brands/midia/logo.png"
            alt="Midia.Pro"
            width={120}
            height={120}
            priority
            className="mx-auto h-20 w-auto animate-pulse object-contain"
          />
          <p className="mt-3 text-xs font-bold text-slate-400">Carregando Midia.Pro…</p>
        </div>
      </main>
    );
  }

  return children;
}
