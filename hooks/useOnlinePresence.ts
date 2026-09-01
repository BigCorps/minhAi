import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export interface OnlineProfile {
  profileId: string;
  nome: string;
  tipo: string;
  pageLocation: string;
}

export const TIPOS_COM_PRESENCA = [
  'colaborador', 'frentista', 'atendente',
  'caixa', 'gerente', 'totem', 'administrador',
];

interface UseOnlinePresenceProps {
  companyId: string;
  profileId: string;
  nome: string;
  tipo: string;
  pageLocation?: string;
}

export function useOnlinePresence({
  companyId, profileId, nome, tipo, pageLocation,
}: UseOnlinePresenceProps) {
  const [onlineProfiles, setOnlineProfiles] = useState<OnlineProfile[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!companyId || !profileId || !TIPOS_COM_PRESENCA.includes(tipo)) return;

    const supabase = createClient();
    const channelName = `presence-${companyId}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: profileId } },
    });
    channelRef.current = channel;

    function syncPresence() {
      const state = channel.presenceState<any>();
      const profiles: OnlineProfile[] = [];
      for (const presences of Object.values(state)) {
        const p = (presences as any[])[0];
        if (p?.profileId && p.profileId !== profileId && TIPOS_COM_PRESENCA.includes(p.tipo)) {
          profiles.push({
            profileId: p.profileId,
            nome: p.nome,
            tipo: p.tipo,
            pageLocation: p.pageLocation,
          });
        }
      }
      setOnlineProfiles(profiles);
    }

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            profileId, nome, tipo,
            pageLocation: pageLocation ?? window.location.pathname,
            onlineAt: new Date().toISOString(),
          });
          setTimeout(syncPresence, 300);
        }
      });

    return () => {
      channel.untrack().finally(() => supabase.removeChannel(channel));
      channelRef.current = null;
    };
  }, [companyId, profileId, nome, tipo, pageLocation]);

  return { onlineProfiles };
}
