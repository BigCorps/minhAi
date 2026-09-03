'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { createClient } from '@/lib/supabase-browser';
import {
  isPlatformAuthPath,
  resolvePlatformApp,
  sanitizePlatformPath,
  type PlatformActivityKind,
} from '@/lib/platform-products';

const HEARTBEAT_MS = 60_000;
const MAX_CONSECUTIVE_FAILURES = 3;
const MAX_HEARTBEAT_SECONDS = HEARTBEAT_MS / 1000;

export default function PlatformActivityTracker() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const currentPathRef = useRef(sanitizePlatformPath(pathname));
  const failuresRef = useRef(0);
  const disabledRef = useRef(false);
  const activeSinceRef = useRef<number | null>(null);

  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    currentPathRef.current = sanitizePlatformPath(pathname);
  }, [pathname]);

  const postActivity = useCallback(
    async (
      kind: PlatformActivityKind,
      path: string,
      activeSecondsDelta = 0,
    ) => {
      if (disabledRef.current || typeof window === 'undefined') return;

      const appKey = resolvePlatformApp(window.location.hostname, path);
      if (!appKey) return;

      try {
        const response = await fetch('/api/platform/activity', {
          method: 'POST',
          credentials: 'same-origin',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kind,
            path: sanitizePlatformPath(path),
            activeSecondsDelta,
          }),
        });

        if (!response.ok) {
          throw new Error(`activity_http_${response.status}`);
        }

        failuresRef.current = 0;
      } catch (error) {
        failuresRef.current += 1;

        // A telemetria nunca interfere no produto. Após algumas falhas nesta
        // montagem, paramos de tentar e recomeçamos no próximo carregamento.
        if (failuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          disabledRef.current = true;
        }

        if (process.env.NODE_ENV === 'development') {
          console.debug('[platform-activity] evento não enviado:', error);
        }
      }
    },
    [],
  );

  const startVisibleClock = useCallback(() => {
    if (typeof document === 'undefined') return;

    activeSinceRef.current =
      document.visibilityState === 'visible'
        ? performance.now()
        : null;
  }, []);

  const flushVisibleTime = useCallback(
    (continueClock: boolean) => {
      const startedAt = activeSinceRef.current;

      if (startedAt == null) {
        if (
          continueClock &&
          typeof document !== 'undefined' &&
          document.visibilityState === 'visible'
        ) {
          activeSinceRef.current = performance.now();
        }
        return;
      }

      const now = performance.now();
      const seconds = Math.max(
        0,
        Math.min(
          MAX_HEARTBEAT_SECONDS,
          Math.round((now - startedAt) / 1000),
        ),
      );

      activeSinceRef.current =
        continueClock &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
          ? now
          : null;

      if (seconds < 1) return;

      const path = currentPathRef.current;
      if (isPlatformAuthPath(path)) return;

      void postActivity('heartbeat', path, seconds);
    },
    [postActivity],
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthenticated(Boolean(data.session?.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      const hasSession = Boolean(session?.user);
      setAuthenticated(hasSession);

      if (event === 'SIGNED_IN' && hasSession) {
        void postActivity('login', currentPathRef.current);
      }

      if (event === 'SIGNED_OUT') {
        failuresRef.current = 0;
        disabledRef.current = false;
        activeSinceRef.current = null;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [postActivity, supabase]);

  useEffect(() => {
    if (!authenticated) return;

    const path = sanitizePlatformPath(pathname);
    if (isPlatformAuthPath(path)) return;

    void postActivity('pageview', path);
  }, [authenticated, pathname, postActivity]);

  useEffect(() => {
    if (!authenticated) {
      activeSinceRef.current = null;
      return;
    }

    startVisibleClock();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        activeSinceRef.current = performance.now();
        return;
      }

      // Ao esconder a aba, contabilizamos apenas o tempo efetivamente visível.
      flushVisibleTime(false);
    };

    const onPageHide = () => {
      flushVisibleTime(false);
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      flushVisibleTime(true);
    }, HEARTBEAT_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      activeSinceRef.current = null;
    };
  }, [
    authenticated,
    flushVisibleTime,
    startVisibleClock,
  ]);

  return null;
}
