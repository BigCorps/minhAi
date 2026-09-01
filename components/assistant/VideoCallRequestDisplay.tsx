'use client';

// ============================================================
// components/assistant/VideoCallRequestDisplay.tsx
//
// Modal de vídeo chamada entre colaboradores.
// Seção 1: Chamada imediata via Daily.co (colaboradores online)
// Seção 2: Agendar via Google Meet (se conta Google conectada)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { createClient } from '@/lib/supabase-browser';
import type { OnlineProfile } from '@/hooks/useOnlinePresence';

interface Props {
  data: {
    companyId: string;
    profileId: string;
    profileName: string;
    onlineProfiles: OnlineProfile[];
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const DARK = {
  overlay:    'rgba(0,0,0,0.85)',
  bg:         '#1e1b2e',
  bgCard:     '#2a2640',
  bgSection:  '#252236',
  border:     '#9333ea44',
  borderCard: '#9333ea33',
  borderDiv:  '#ffffff11',
  title:      '#ffffff',
  text:       '#a1a1aa',
  textSm:     '#71717a',
  danger:     '#dc2626',
  input:      '#1a1728',
  inputBorder:'#9333ea33',
};

const LIGHT = {
  overlay:    'rgba(0,0,0,0.6)',
  bg:         '#ffffff',
  bgCard:     '#f8f7ff',
  bgSection:  '#f3f0ff',
  border:     '#9333ea33',
  borderCard: '#e9d5ff',
  borderDiv:  '#00000011',
  title:      '#111827',
  text:       '#6b7280',
  textSm:     '#9ca3af',
  danger:     '#dc2626',
  input:      '#ffffff',
  inputBorder:'#d1d5db',
};

const TIPO_LABEL: Record<string, string> = {
  colaborador:  'Colaborador',
  frentista:    'Frentista',
  atendente:    'Atendente',
  caixa:        'Caixa',
  gerente:      'Gerente',
  totem:        'Totem',
  administrador:'Administrador',
};

export default function VideoCallRequestDisplay({ data, onClose, theme = 'dark' }: Props) {
  const C = theme === 'dark' ? DARK : LIGHT;

  // ── Daily states ──────────────────────────────────────────
  const [status, setStatus]                   = useState<'list' | 'calling' | 'active'>('list');
  const onlineProfiles: OnlineProfile[]       = data.onlineProfiles ?? [];
  const [selectedProfile, setSelectedProfile] = useState<OnlineProfile | null>(null);
  const [callId, setCallId]                   = useState<string | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [isEntering, setIsEntering]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  // ── Meet states ───────────────────────────────────────────
  const [hasGoogle, setHasGoogle]   = useState<boolean | null>(null);
  const [meetLoading, setMeetLoading] = useState(false);
  const [meetError, setMeetError]   = useState<string | null>(null);
  const [meetSuccess, setMeetSuccess] = useState<string | null>(null);
  const [meetDate, setMeetDate]     = useState('');
  const [meetTime, setMeetTime]     = useState('');
  const [meetEmail, setMeetEmail]   = useState('');
  const [meetTitle, setMeetTitle]   = useState('Reunião');

  // ── Responsive ────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Daily refs ────────────────────────────────────────────
  const callFrameRef     = useRef<DailyCall | null>(null);
  const callContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef       = useRef<NodeJS.Timeout | null>(null);

  // ── Verificar conta Google ────────────────────────────────
  useEffect(() => {
    async function checkGoogle() {
      try {
        const supabase = createClient();
        const { data: acc } = await supabase
          .from('google_accounts')
          .select('id')
          .eq('company_id', data.companyId)
          .eq('is_active', true)
          .maybeSingle();
        setHasGoogle(!!acc);
      } catch {
        setHasGoogle(false);
      }
    }
    checkGoogle();
  }, [data.companyId]);

  // ── Pré-preencher data/hora (+30min) ──────────────────────
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    setMeetDate(now.toISOString().split('T')[0]);
    setMeetTime(now.toTimeString().slice(0, 5));
  }, []);

  // ── Cleanup ───────────────────────────────────────────────
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

  // ── Daily: iniciar chamada ────────────────────────────────
  async function iniciarChamada(receiver: OnlineProfile) {
    setSelectedProfile(receiver);
    setLoading(true);
    setError(null);
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
            company_id:    data.companyId,
            caller_id:     data.profileId,
            caller_type:   'collaborator',
            receiver_id:   receiver.profileId,
            receiver_type: receiver.tipo,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Erro ao criar chamada');

      setCallId(result.call_id);
      setStatus('calling');

      const supabase = createClient();
      const broadcastChannel = supabase.channel(`assistente-${data.companyId}-${receiver.profileId}`);
      await broadcastChannel.subscribe();
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: {
          callId:        result.call_id,
          roomUrl:       result.room_url,
          receiverToken: result.receiver_token,
          callerName:    data.profileName,
        },
      });
      await supabase.removeChannel(broadcastChannel);
      await entrarNaSala(result.room_url, result.caller_token);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao iniciar chamada');
      setSelectedProfile(null);
      setStatus('list');
    } finally {
      setLoading(false);
    }
  }

  async function entrarNaSala(roomUrl: string, token: string) {
    if (!callContainerRef.current) return;
    setIsEntering(true);
    callContainerRef.current.style.display = 'block';
    callContainerRef.current.style.height  = isMobile ? '100%' : '80vh';
    callFrameRef.current?.destroy();
    const frame = DailyIframe.createFrame(callContainerRef.current, {
      showLeaveButton: true,
      lang: 'pt-BR',
      iframeStyle: { width: '100%', height: '100%', border: '0', borderRadius: '12px' },
    });
    callFrameRef.current = frame;
    frame.on('left-meeting', () => { frame.destroy(); callFrameRef.current = null; onClose(); });
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

  // ── Meet: agendar reunião ─────────────────────────────────
  async function agendarMeet() {
    if (!meetDate || !meetTime || !meetEmail) {
      setMeetError('Preencha data, hora e email do participante.');
      return;
    }
    setMeetLoading(true);
    setMeetError(null);
    setMeetSuccess(null);
    try {
      // 1. Criar espaço no Meet
      const meetRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-google-meet`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ company_id: data.companyId }),
        }
      );
      const meetData = await meetRes.json();
      if (!meetRes.ok) throw new Error(meetData.error ?? 'Erro ao criar Meet');

      // 2. Criar evento no Google Calendar com link do Meet
      const startDateTime = new Date(`${meetDate}T${meetTime}:00`).toISOString();
      const endDateTime   = new Date(new Date(`${meetDate}T${meetTime}:00`).getTime() + 60 * 60 * 1000).toISOString();

      const supabase = createClient();
const { error: eventError } = await supabase.functions.invoke('criar-evento-calendario', {
  body: {
    company_id:  data.companyId,
    summary:     meetTitle || 'Reunião',
    description: `Reunião via Google Meet\nLink: ${meetData.url}`,
    start_time:  startDateTime,   // ✅ corrigido
    end_time:    endDateTime,     // ✅ corrigido
    attendees:   [{ email: meetEmail }],
    location:    meetData.url,
  },
});
      if (eventError) throw new Error('Erro ao criar evento no calendário');

      setMeetSuccess(`Reunião agendada! Convite enviado para ${meetEmail} com o link do Google Meet.`);
    } catch (err: any) {
      setMeetError(err.message ?? 'Erro ao agendar reunião');
    } finally {
      setMeetLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: `1px solid ${C.inputBorder}`, background: C.input,
    color: C.title, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  };

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: (status === 'active' || isEntering) && isMobile ? '0' : '16px',
        width: '100%',
        maxWidth: isMobile ? ((status === 'active' || isEntering) ? '100%' : '440px') : (status === 'active' ? '900px' : '480px'),
        height: (status === 'active' || isEntering) && isMobile ? '100dvh' : 'auto',
        maxHeight: status === 'active' ? 'none' : '90vh',
        overflowY: status === 'active' ? 'hidden' : 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        transition: 'max-width 0.3s ease',
      }}>

        {/* Container Daily */}
        <div ref={callContainerRef} style={{ display: 'none', width: '100%', height: isMobile ? '100%' : '80vh', maxHeight: isMobile ? 'none' : '80vh' }} />

        {status !== 'active' && (
          <div style={{ padding: '24px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#9333ea22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" fill="none" stroke="#9333ea" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <div style={{ color: C.title, fontWeight: 700, fontSize: '15px' }}>Vídeo Chamada</div>
              </div>
              {status === 'list' && (
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.text, padding: '4px' }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {error && (
              <div style={{ background: '#dc262622', border: '1px solid #dc262644', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', color: '#dc2626', fontSize: '13px' }}>
                {error}
              </div>
            )}

            {/* ═══════════════════════════════════
                SEÇÃO 1 — CHAMADA AGORA (Daily)
            ═══════════════════════════════════ */}
            {status === 'list' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9333ea', display: 'inline-block' }} />
                  <span style={{ color: C.text, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Chamada agora · {onlineProfiles.length} online
                  </span>
                </div>

                {onlineProfiles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', background: C.bgCard, borderRadius: '12px', marginBottom: '20px' }}>
                    <svg width="28" height="28" fill="none" stroke={C.textSm} strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 8px', display: 'block' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p style={{ color: C.text, fontSize: '13px', margin: 0 }}>Nenhum colaborador online agora.</p>
                    <p style={{ color: C.textSm, fontSize: '11px', margin: '4px 0 0' }}>Outros precisam estar logados no assistente.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {onlineProfiles.map((p) => (
                      <button
                        key={p.profileId}
                        onClick={() => !loading && iniciarChamada(p)}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.bgCard, border: `1px solid ${C.borderCard}`, borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, width: '100%', textAlign: 'left' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#9333ea33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#9333ea', flexShrink: 0 }}>
                            {p.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: C.title, fontWeight: 600, fontSize: '13px' }}>{p.nome}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                              <span style={{ color: C.text, fontSize: '11px' }}>{TIPO_LABEL[p.tipo] ?? p.tipo} · Online</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Divisor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 20px' }}>
                  <div style={{ flex: 1, height: '1px', background: C.borderDiv }} />
                  <span style={{ color: C.textSm, fontSize: '11px', fontWeight: 500 }}>ou agendar</span>
                  <div style={{ flex: 1, height: '1px', background: C.borderDiv }} />
                </div>

                {/* ═══════════════════════════════════
                    SEÇÃO 2 — GOOGLE MEET AGENDADO
                ═══════════════════════════════════ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M21.5 7.5L17 12l4.5 4.5V7.5z" fill="#00832d"/>
                    <path d="M3 7.5A1.5 1.5 0 014.5 6h9A1.5 1.5 0 0115 7.5v9A1.5 1.5 0 0113.5 18h-9A1.5 1.5 0 013 16.5v-9z" fill="#0066da"/>
                    <path d="M15 10.5v3L17 15v-6l-2 1.5z" fill="#e94235"/>
                  </svg>
                  <span style={{ color: C.text, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Google Meet · Reunião agendada
                  </span>
                </div>

                {hasGoogle === null && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textSm} strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </div>
                )}

                {hasGoogle === false && (
                  <div style={{ background: C.bgSection, border: `1px solid ${C.borderCard}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <p style={{ color: C.text, fontSize: '13px', margin: '0 0 10px' }}>
                      Conecte uma conta Google para agendar reuniões via Meet.
                    </p>
                    <a
                      href={`/dashboard/${data.companyId}/google-connect`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1a73e8', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Conectar conta Google →
                    </a>
                  </div>
                )}

                {hasGoogle === true && (
                  <div style={{ background: C.bgSection, border: `1px solid ${C.borderCard}`, borderRadius: '12px', padding: '16px' }}>
                    {meetError && (
                      <div style={{ background: '#dc262622', border: '1px solid #dc262644', borderRadius: '8px', padding: '9px 12px', marginBottom: '12px', color: '#dc2626', fontSize: '12px' }}>
                        {meetError}
                      </div>
                    )}
                    {meetSuccess ? (
                      <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <svg width="32" height="32" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600, margin: '0 0 4px' }}>Reunião agendada!</p>
                        <p style={{ color: C.text, fontSize: '12px', margin: 0 }}>{meetSuccess}</p>
                        <button
                          onClick={() => setMeetSuccess(null)}
                          style={{ marginTop: '12px', color: C.textSm, fontSize: '12px', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Agendar outra
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label style={{ color: C.text, fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Título da reunião</label>
                          <input type="text" value={meetTitle} onChange={e => setMeetTitle(e.target.value)} placeholder="Ex: Alinhamento semanal" style={inputStyle} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ color: C.text, fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Data</label>
                            <input type="date" value={meetDate} onChange={e => setMeetDate(e.target.value)} style={inputStyle} />
                          </div>
                          <div>
                            <label style={{ color: C.text, fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Hora</label>
                            <input type="time" value={meetTime} onChange={e => setMeetTime(e.target.value)} style={inputStyle} />
                          </div>
                        </div>
                        <div>
                          <label style={{ color: C.text, fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email do participante</label>
                          <input type="email" value={meetEmail} onChange={e => setMeetEmail(e.target.value)} placeholder="participante@email.com" style={inputStyle} />
                          <p style={{ color: C.textSm, fontSize: '10px', margin: '4px 0 0' }}>
                            O Google Calendar envia o convite com o link automaticamente.
                          </p>
                        </div>
                        <button
                          onClick={agendarMeet}
                          disabled={meetLoading}
                          style={{ width: '100%', padding: '11px', background: meetLoading ? '#1a73e866' : '#1a73e8', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: meetLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '2px' }}
                        >
                          {meetLoading ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                              <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M21.5 7.5L17 12l4.5 4.5V7.5z" fill="#fff" opacity=".9"/>
                              <path d="M3 7.5A1.5 1.5 0 014.5 6h9A1.5 1.5 0 0115 7.5v9A1.5 1.5 0 0113.5 18h-9A1.5 1.5 0 013 16.5v-9z" fill="#fff"/>
                            </svg>
                          )}
                          {meetLoading ? 'Agendando...' : 'Agendar e enviar convite'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Aguardando Daily ── */}
            {status === 'calling' && (
              <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#9333ea22', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
                  <svg width="36" height="36" fill="none" stroke="#9333ea" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <p style={{ color: C.title, fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Chamando {selectedProfile?.nome}...</p>
                <p style={{ color: C.text, fontSize: '13px', marginBottom: '28px' }}>Aguardando atender. Timeout em 2 minutos.</p>
                <button onClick={cancelCall} style={{ width: '100%', padding: '12px', background: 'transparent', border: `1px solid ${C.danger}`, color: C.danger, borderRadius: '10px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  Cancelar Chamada
                </button>
              </div>
            )}
          </div>
        )}

        <style>{`
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.95)} }
          @keyframes spin  { to{transform:rotate(360deg)} }
        `}</style>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
