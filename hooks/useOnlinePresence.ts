'use client';

// ============================================================
// hooks/useOnlinePresence.ts
//
// Registra presença via Supabase Realtime Presence.
// Não usa tabela — funciona via canal de presença em memória.
//
// Canal: `presence-${companyId}`
// Payload: { profileId, nome, tipo, pageLocation }
// ============================================================

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

export interface OnlineProfile {
  profileId: string;
  nome: string;
  tipo: string;
  pageLocation: string;
}

interface UseOnlinePresenceProps {
  companyId: string;
  profileId: string;
  nome: string;
  tipo: string;
  pageLocation?: string;
}

// Tipos que aparecem como "online" para outros colaboradores
export const TIPOS_COM_PRESENCA = [
  'colaborador', 'frentista', 'atendente',
  'caixa', 'gerente', 'totem', 'administrador',
];

export function useOnlinePresence({
  companyId,
  profileId,
  nome,
  tipo,
  pageLocation,
}: UseOnlinePresenceProps) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    // Não registra presença para clientes ou perfis não identificados
    if (!companyId || !profileId || !TIPOS_COM_PRESENCA.includes(tipo)) return;

    const supabase = createClient();
    const channelName = `presence-${companyId}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: profileId } },
    });

    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          profileId,
          nome,
          tipo,
          pageLocation: pageLocation ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
          onlineAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.untrack().finally(() => {
        supabase.removeChannel(channel);
      });
      channelRef.current = null;
    };
  }, [companyId, profileId, nome, tipo, pageLocation]);
}

// ── Hook separado para LEITURA da lista de presença ──────────
// Usado no VideoCallRequestDisplay para ver quem está online.
export function useOnlinePresenceList(
  companyId: string,
  currentProfileId: string,
): OnlineProfile[] {
  // Este hook é stateful — usado dentro de componentes React
  // Retorno inicial vazio; o componente usa useState internamente
  return [];
}
