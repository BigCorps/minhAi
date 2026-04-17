'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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
  overlay: 'rgba(0,0,0,0.75)',
  bg: '#1e1b2e',
  border: '#9333ea44',
  title: '#ffffff',
  text: '#a1a1aa',
  textSm: '#71717a',
  btnPrimary: '#9333ea',
  btnPrimaryHover: '#7e22ce',
  btnDanger: '#dc2626',
  btnDangerHover: '#b91c1c',
};

const LIGHT = {
  overlay: 'rgba(0,0,0,0.5)',
  bg: '#ffffff',
  border: '#9333ea33',
  title: '#111827',
  text: '#6b7280',
  textSm: '#9ca3af',
  btnPrimary: '#9333ea',
  btnPrimaryHover: '#7e22ce',
  btnDanger: '#dc2626',
  btnDangerHover: '#b91c1c',
};

export default function VideoCallRequestDisplay({ data, onClose, theme = 'dark' }: Props) {
  const C = theme === 'dark' ? DARK : LIGHT;
  const [status, setStatus] = useState<'idle' | 'requesting' | 'waiting'>('idle');
  const [loading, setLoading] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [callerToken, setCallerToken] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout de 2 minutos
  useEffect(() => {
    if (status !== 'waiting') return;
    timeoutRef.current = setTimeout(() => {
      cancelCall();
    }, 120_000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [status]);

  // Listener: proprietário atendeu
  useEffect(() => {
    if (!callId) return;
    const handler = (e: any) => {
      if (e.detail?.callId === callId && roomUrl && callerToken) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        window.open(roomUrl + '?t=' + callerToken, '_blank');
        onClose();
      }
    };
    window.addEventListener('eai:videoCallAnswered', handler);
    return () => window.removeEventListener('eai:videoCallAnswered', handler);
  }, [callId, roomUrl, callerToken]);

  async function solicitarChamada() {
    setLoading(true);
    setStatus('requesting');
    try {
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
            receiver_type: 'owner',
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setCallId(result.call_id);
      setRoomUrl(result.room_url);
      setCallerToken(result.caller_token);
      setStatus('waiting');

      // Enviar notificação ao proprietário
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-video-call`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            call_id: result.call_id,
            notification_type: 'incoming',
          }),
        }
      );
    } catch (err: any) {
      console.error('[VideoCallRequest] erro:', err);
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  }

  async function cancelCall() {
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
        maxWidth: '400px',
        padding: '28px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#9333ea22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Camera icon */}
              <svg width="20" height="20" fill="none" stroke="#9333ea" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <span style={{ color: C.title, fontWeight: 700, fontSize: '16px' }}>Vídeo Chamada</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '4px', borderRadius: '6px', color: C.text,
          }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Idle */}
        {status === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: C.text, fontSize: '14px', marginBottom: '24px' }}>
              Solicitar uma vídeo chamada com o proprietário?
            </p>
            <button
              onClick={solicitarChamada}
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: C.btnPrimary, color: '#fff',
                border: 'none', borderRadius: '10px',
                fontWeight: 600, fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {loading ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              )}
              {loading ? 'Solicitando...' : 'Solicitar Chamada'}
            </button>
          </div>
        )}

        {/* Requesting */}
        {status === 'requesting' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"
              style={{ margin: '0 auto 16px', display: 'block', animation: 'spin 1s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
            </svg>
            <p style={{ color: C.title, fontWeight: 600, fontSize: '15px' }}>Criando sala...</p>
          </div>
        )}

        {/* Waiting */}
        {status === 'waiting' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#9333ea22', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              <svg width="32" height="32" fill="none" stroke="#9333ea" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <p style={{ color: C.title, fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>
              Aguardando proprietário...
            </p>
            <p style={{ color: C.text, fontSize: '13px', marginBottom: '24px' }}>
              Uma notificação foi enviada. Timeout em 2 minutos.
            </p>
            <button
              onClick={cancelCall}
              style={{
                width: '100%', padding: '11px',
                background: 'transparent',
                border: `1px solid ${C.btnDanger}`,
                color: C.btnDanger,
                borderRadius: '10px',
                fontWeight: 600, fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancelar Chamada
            </button>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.95); } }
        `}</style>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
