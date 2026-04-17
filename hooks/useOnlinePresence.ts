import { useEffect, useRef } from 'react';

interface UseOnlinePresenceProps {
  companyId: string;
  profileId: string;
  pageLocation?: string;
}

export function useOnlinePresence({ companyId, profileId, pageLocation }: UseOnlinePresenceProps) {
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isRegisteredRef = useRef(false);

  useEffect(() => {
    if (!companyId || !profileId) return;

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    async function upsertPresence(isOnline: boolean) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/online_presence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            company_id: companyId,
            profile_id: profileId,
            is_online: isOnline,
            last_seen: new Date().toISOString(),
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              isMobile: /mobile/i.test(navigator.userAgent),
            },
            page_location: pageLocation ?? window.location.pathname,
          }),
        });

        if (isOnline) isRegisteredRef.current = true;
      } catch (err) {
        console.warn('[useOnlinePresence] erro ao atualizar presença:', err);
      }
    }

    // Registrar presença ao montar
    upsertPresence(true);

    // Heartbeat a cada 30s
    heartbeatRef.current = setInterval(() => upsertPresence(true), 30_000);

    // Marcar offline ao desmontar
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (isRegisteredRef.current) upsertPresence(false);
    };
  }, [companyId, profileId, pageLocation]);
}
