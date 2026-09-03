'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const FAST_INTERVAL_MS = 2000;

export default function PixWikiFastWatch() {
  const supabase = useMemo(() => createClient(), []);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        await fetch(`${FUNCTIONS_URL}/pixwiki-fast-watch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ company_id: companyId }),
          cache: 'no-store',
        });
      } catch {
        // Best effort. O cron de 1 minuto e o botão Atualizar continuam como fallback.
      } finally {
        inFlight.current = false;
        schedule();
      }
    };

    const wake = () => {
      if (document.visibilityState === 'visible') schedule(150);
    };

    const onFocus = () => schedule(150);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'pixWikiActiveCompanyId') schedule(100);
    };

    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    schedule(300);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [supabase]);

  return null;
}
