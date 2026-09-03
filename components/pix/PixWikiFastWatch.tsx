'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const FAST_INTERVAL_MS = 2000;

export default function PixWikiFastWatch() {
  const supabase = useMemo(() => createClient(), []);
  const inFlight = useRef(false);
  const accessToken = useRef('');

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const schedule = (delay = FAST_INTERVAL_MS) => {
      if (cancelled) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(run, delay);
    };

    const run = async () => {
      if (cancelled) return;

      if (document.visibilityState !== 'visible' || inFlight.current) {
        schedule();
        return;
      }

      const companyId = localStorage.getItem('pixWikiActiveCompanyId') || '';
      if (!companyId) {
        schedule();
        return;
      }

      inFlight.current = true;
      const cycleStartedAt = performance.now();
      try {
        const token = accessToken.current;
        if (!token) return;

        await fetch(`${FUNCTIONS_URL}/pixwiki-fast-watch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ company_id: companyId }),
          cache: 'no-store',
        });
      } catch {
        // Best effort. O cron de 1 minuto e o botão Atualizar continuam como fallback.
      } finally {
        inFlight.current = false;
        // Mantém ~2 s entre o INÍCIO dos ciclos. Antes esperávamos 2 s após
        // terminar uma chamada de ~1 s, transformando a cadência real em ~3 s.
        const elapsed = performance.now() - cycleStartedAt;
        schedule(Math.max(150, FAST_INTERVAL_MS - elapsed));
      }
    };

    const wake = () => {
      if (document.visibilityState === 'visible') schedule(150);
    };

    const onFocus = () => schedule(150);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'pixWikiActiveCompanyId') schedule(100);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      accessToken.current = session?.access_token || '';
      schedule(100);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      accessToken.current = session?.access_token || '';
      if (accessToken.current) schedule(100);
    });
    authSubscription = authListener.subscription;

    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    schedule(300);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      authSubscription?.unsubscribe();
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [supabase]);

  return null;
}
