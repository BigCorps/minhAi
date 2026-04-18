'use client';

// ============================================================
// components/assistant/VideoCallRequestDisplay.tsx
//
// Modal de vídeo chamada entre colaboradores.
// - Lista quem está online (via Supabase Realtime Presence)
// - Colaborador escolhe com quem falar
// - Cria sala Daily.co e envia broadcast para o escolhido
// - Ambos entram na mesma sala via DailyIframe
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { createClient } from '@/lib/supabase-browser';
import { TIPOS_COM_PRESENCA, type OnlineProfile } from '@/hooks/useOnlinePresence';

interface Props {
  data: {
    companyId: string;
    profileId: string;
    profileName: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const DARK = {
  overlay: 'rgba(0,0,0,0.85)',
  bg: '#1e1b2e',
  bgCard: '#2a2640',
  border: '#9333ea44',
  borderCard: '#9333ea33',
  title: '#ffffff',
  text: '#a1a1aa',
  textSm: '#71717a',
  hover: '#9333ea22',
  danger: '#dc2626',
};

const LIGHT = {
  overlay: 'rgba(0,0,0,0.6)',
  bg: '#ffffff',
  bgCard: '#f8f7ff',
  border: '#9333ea33',
  borderCard: '#e9d5ff',
  title: '#111827',
  text: '#6b7280',
  textSm: '#9ca3af',
  hover: '#f3e8ff',
  danger: '#dc2626',
};

const TIPO_LABEL: Record<string, string> = {
  colaborador: 'Colaborador',
  frentista: 'Frentista',
  atendente: 'Atendente',
  caixa: 'Caixa',
  gerente: 'Gerente',
  totem: 'Totem',
  administrador: 'Administrador',
};

export default function VideoCallRequestDisplay({ data, onClose, theme = 'dark' }: Props) {
  const C = theme === 'dark' ? DARK : LIGHT;

  const [status, setStatus] = useState<'list' | 'calling' | 'active'>('list');
  const [onlineProfiles, setOnlineProfiles] = useState<OnlineProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<OnlineProfile | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callFrameRef = useRef<DailyCall | null>(null);
  const callContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  // ── Escutar presença do canal da empresa ──────────────────
  useEffect(() => {
    const supabase = createClient();
    const channelName = `presence-${data.companyId}`;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    function syncPresence() {
      const state = channel.presenceState<OnlineProfile & { onlineAt: string }>();
      const profiles: OnlineProfile[] = [];

      for (const [, presences] of Object.entries(state)) {
        const p = presences[0] as any;
        // Excluir o próprio colaborador e clientes
        if (
          p?.profileId &&
          p.profileId !== data.profileId &&
          TIPOS_COM_PRESENCA.includes(p.tipo)
        ) {
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [data.companyId, data.profileId]);

  // ── Cleanup ao desmontar ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      callFrameRef.current?.destroy();
      callFrameRef.current = null;
    };
  }, []);

  // ── Timeout 2min em calling ───────────────────────────────
  useEffect(() => {
    if (status !== 'calling') return;
    timeoutRef.current = setTimeout(() => cancelCall(), 120_000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [status]);

  async function iniciarChamada(receiver: OnlineProfile) {
    setSelectedProfile(receiver);
    setLoading(true);
    setError(null);

    try {
      // Criar sala no Daily.co
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-video-call`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: data.companyId,
            caller_id: data.profileId,
            caller_type: 'collaborator',
            receiver_id: receiver.profileId,
            receiver_type: receiver.tipo,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Erro ao criar chamada');

      setCallId(result.call_id);
      setStatus('calling');

      // Broadcast Realtime para o receiver
      const supabase = createClient();
      await supabase
        .channel(`assistente-${data.companyId}-${receiver.profileId}`)
        .send({
          type: 'broadcast',
          event: 'incoming-call',
          payload: {
            callId: result.call_id,
            roomUrl: result.room_url,
            receiverToken: result.receiver_token,
            callerName: data.profileName,
          },
        });

      // Caller entra na sala
      await entrarNaSala(result.room_url, result.caller_token);

    } catch (err: any) {
      console.error('[VideoCallRequest]', err);
      setError(err.message ?? 'Erro ao iniciar chamada');
      setSelectedProfile(null);
      setStatus('list');
    } finally {
      setLoading(false);
    }
  }

  async function entrarNaSala(roomUrl: string, token: string) {
    if (!callContainerRef.current) return;

    callFrameRef.current?.destroy();

    const frame = DailyIframe.createFrame(callContainerRef.current, {
      showLeaveButton: true,
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '12px',
      },
    });

    callFrameRef.current = frame;

    frame.on('left-meeting', () => {
      frame.destroy();
      callFrameRef.current = null;
      onClose();
    });

    await frame.join({ url: roomUrl, token });
    setStatus('active');
  }

  async function cancelCall() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (callId) {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/video_calls?id=eq.${callId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'cancelled', ended_at: new Date().toISOString() }),
        }
      );
    }
    callFrameRef.current?.destroy();
    callFrameRef.current = null;
    onClose();
  }

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: C.overlay,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        width: '100%',
        maxWidth: status === 'active' ? '900px' : '440px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        transition: 'max-width 0.3s ease',
      }}>

        {/* Container do Daily iframe — visível só em active */}
        <div
          ref={callContainerRef}
          style={{
            display: status === 'active' ? 'block' : 'none',
            width: '100%',
            height: '600px',
          }}
        />

        {/* ── list / calling ── */}
        {status !== 'active' && (
          <div style={{ padding: '28px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: '#9333ea22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" fill="none" stroke="#9333ea" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <div>
                  <div style={{ color: C.title, fontWeight: 700, fontSize: '16px' }}>Vídeo Chamada</div>
                  {status === 'list' && (
                    <div style={{ color: C.text, fontSize: '12px' }}>
                      {onlineProfiles.length === 0
                        ? 'Nenhum colaborador online'
                        : `${onlineProfiles.length} colaborador${onlineProfiles.length > 1 ? 'es' : ''} online`}
                    </div>
                  )}
                </div>
              </div>
              {status === 'list' && (
                <button onClick={onClose} style={{
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', color: C.text, padding: '4px',
                }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Erro */}
            {error && (
              <div style={{
                background: '#dc262622', border: '1px solid #dc262644',
                borderRadius: '10px', padding: '12px', marginBottom: '16px',
                color: '#dc2626', fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            {/* ── Lista de online ── */}
            {status === 'list' && (
              <>
                {onlineProfiles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '50%',
                      background: '#9333ea11', margin: '0 auto 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="28" height="28" fill="none" stroke="#9333ea66" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p style={{ color: C.text, fontSize: '14px', marginBottom: '8px' }}>
                      Nenhum colaborador online no momento.
                    </p>
                    <p style={{ color: C.textSm, fontSize: '12px' }}>
                      Outros colaboradores precisam estar logados no assistente.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {onlineProfiles.map((p) => (
                      <button
                        key={p.profileId}
                        onClick={() => !loading && iniciarChamada(p)}
                        disabled={loading}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 16px',
                          background: C.bgCard,
                          border: `1px solid ${C.borderCard}`,
                          borderRadius: '12px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.6 : 1,
                          transition: 'all 0.15s ease',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Avatar inicial */}
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: '#9333ea33',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', fontWeight: 700, color: '#9333ea',
                            flexShrink: 0,
                          }}>
                            {p.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: C.title, fontWeight: 600, fontSize: '14px' }}>
                              {p.nome}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{
                                width: '7px', height: '7px', borderRadius: '50%',
                                background: '#22c55e', display: 'inline-block',
                              }} />
                              <span style={{ color: C.text, fontSize: '12px' }}>
                                {TIPO_LABEL[p.tipo] ?? p.tipo} · Online
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Ícone de chamada */}
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: '#9333ea',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Aguardando ── */}
            {status === 'calling' && (
              <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: '#9333ea22', margin: '0 auto 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 2s ease-in-out infinite',
                }}>
                  <svg width="36" height="36" fill="none" stroke="#9333ea" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <p style={{ color: C.title, fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>
                  Chamando {selectedProfile?.nome}...
                </p>
                <p style={{ color: C.text, fontSize: '13px', marginBottom: '28px' }}>
                  Aguardando atender. Timeout em 2 minutos.
                </p>
                <button
                  onClick={cancelCall}
                  style={{
                    width: '100%', padding: '12px',
                    background: 'transparent',
                    border: `1px solid ${C.danger}`,
                    color: C.danger,
                    borderRadius: '10px',
                    fontWeight: 600, fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar Chamada
                </button>
              </div>
            )}
          </div>
        )}

        <style>{`
          @keyframes pulse {
            0%,100% { opacity:1; transform:scale(1); }
            50% { opacity:0.6; transform:scale(0.95); }
          }
        `}</style>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
