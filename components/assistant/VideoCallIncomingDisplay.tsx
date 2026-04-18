'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';

interface Props {
  data: {
    companyId: string;
    callId: string;
    roomUrl: string;
    token: string;
    callerName: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const DARK = {
  overlay: 'rgba(0,0,0,0.85)',
  bg: '#1e1b2e',
  border: '#9333ea44',
  title: '#ffffff',
  text: '#a1a1aa',
  btnAnswer: '#16a34a',
  btnDecline: '#dc2626',
};

const LIGHT = {
  overlay: 'rgba(0,0,0,0.6)',
  bg: '#ffffff',
  border: '#9333ea33',
  title: '#111827',
  text: '#6b7280',
  btnAnswer: '#16a34a',
  btnDecline: '#dc2626',
};

export default function VideoCallIncomingDisplay({ data, onClose, theme = 'dark' }: Props) {
  const C = theme === 'dark' ? DARK : LIGHT;
  const [status, setStatus] = useState<'ringing' | 'active'>('ringing');
  const [loading, setLoading] = useState(false);
  const callFrameRef = useRef<DailyCall | null>(null);
  const callContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout 2 minutos → missed
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      updateStatus('missed');
      onClose();
    }, 120_000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      callFrameRef.current?.destroy();
      callFrameRef.current = null;
    };
  }, []);

  async function updateStatus(s: 'active' | 'declined' | 'missed') {
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/video_calls?id=eq.${data.callId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: s,
          ...(s === 'active' ? { answered_at: new Date().toISOString() } : { ended_at: new Date().toISOString() }),
        }),
      }
    );
  }

  async function atender() {
    if (!callContainerRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(true);

    await updateStatus('active');

    // Destruir frame anterior se existir
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

    await frame.join({ url: data.roomUrl, token: data.token });
    setStatus('active');
    setLoading(false);
  }

  async function recusar() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await updateStatus('declined');
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
        maxWidth: status === 'active' ? '900px' : '360px',
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

        {/* ── ringing ── */}
        {status === 'ringing' && (
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: '#9333ea22', margin: '0 auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'ring 1.5s ease-in-out infinite',
            }}>
              <svg width="36" height="36" fill="none" stroke="#9333ea" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>

            <p style={{ color: C.text, fontSize: '13px', marginBottom: '6px' }}>
              Vídeo chamada recebida
            </p>
            <p style={{ color: C.title, fontWeight: 700, fontSize: '20px', marginBottom: '28px' }}>
              {data.callerName}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              {/* Recusar */}
              <button
                onClick={recusar}
                style={{
                  flex: 1, padding: '13px',
                  background: C.btnDecline,
                  color: '#fff', border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600, fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Recusar
              </button>

              {/* Atender */}
              <button
                onClick={atender}
                disabled={loading}
                style={{
                  flex: 1, padding: '13px',
                  background: C.btnAnswer,
                  color: '#fff', border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600, fontSize: '15px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                {loading ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}>
                    <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                )}
                Atender
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes ring {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(147,51,234,0.4); }
            50% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(147,51,234,0); }
          }
        `}</style>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
