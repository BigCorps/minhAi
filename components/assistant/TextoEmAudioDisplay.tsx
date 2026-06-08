'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ── Palette ─────────────────────────────────────────────
const DARK = {
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  border: '#2a2a2a',
  borderFocus: '#0000ff',
  text: '#f0f0f0',
  textMuted: '#888',
  textDim: '#555',
  accent: '#0000ff',
  accentHover: '#0033cc',
  accentSoft: 'rgba(0,0,255,0.1)',
  danger: '#ff4444',
  success: '#22c55e',
  successSoft: 'rgba(34,197,94,0.1)',
};
const LIGHT = {
  bg: '#ffffff',
  surface: '#f5f5f5',
  border: '#e0e0e0',
  borderFocus: '#0000ff',
  text: '#111111',
  textMuted: '#666',
  textDim: '#aaa',
  accent: '#0000ff',
  accentHover: '#0033cc',
  accentSoft: 'rgba(0,0,255,0.07)',
  danger: '#dc2626',
  success: '#16a34a',
  successSoft: 'rgba(22,163,74,0.08)',
};

const MAX_CHARS = 10000;
const CHARS_PER_CREDIT = 500;

function calcCredits(text: string) {
  return Math.ceil(Math.max(1, text.trim().length) / CHARS_PER_CREDIT);
}

// ── SVG Icons (inline, sem lucide) ──────────────────────
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const IconMic = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const IconCopy = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// ── Component ────────────────────────────────────────────
interface Props {
  data: {
    companyId: string;
  };
  onClose: () => void;
  isDark?: boolean;
}

export default function TextoEmAudioDisplay({ data, onClose, isDark = true }: Props) {
  const P = isDark ? DARK : LIGHT;
  const { companyId } = data;

  const [text, setText] = useState('');
  const [voice, setVoice] = useState<'feminina' | 'masculina'>('feminina');
  const [loading, setLoading] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) textareaRef.current?.focus(); }, [mounted]);

  const credits = text.trim().length > 0 ? calcCredits(text) : 0;
  const charsLeft = MAX_CHARS - text.length;
  const overLimit = text.length > MAX_CHARS;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function handleGenerate() {
    if (!text.trim() || overLimit || loading) return;
    setLoading(true);
    setError('');
    setAudioBase64(null);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/texto-em-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, text, voice }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao gerar áudio');
      setAudioBase64(data.audio_base64);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!audioBase64) return;
    const fileName = `audio-minhai-${Date.now()}.mp3`;
    const link = document.createElement('a');
    link.href = `data:audio/mpeg;base64,${audioBase64}`;
    link.download = fileName;
    link.click();
  }

  function handlePlayPreview() {
    if (!audioBase64) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    audioRef.current = audio;
    audio.play();
  }

  function handleCopyText() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setAudioBase64(null);
    setError('');
    setText('');
    textareaRef.current?.focus();
  }

  if (!mounted) return null;

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: P.bg,
          borderRadius: '16px',
          border: `1px solid ${P.border}`,
          width: '100%', maxWidth: '560px',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${P.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: P.accentSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>🔵</div>
            <div>
              <div style={{ color: P.text, fontWeight: 700, fontSize: '16px' }}>Texto em Áudio</div>
              <div style={{ color: P.textMuted, fontSize: '12px' }}>Google TTS Neural — pt-BR</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: P.textMuted, padding: '4px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Resultado gerado */}
          {audioBase64 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: P.successSoft,
                border: `1px solid ${P.success}`,
                borderRadius: '10px', padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                <div style={{ color: P.success, fontWeight: 600, fontSize: '14px' }}>
                  ✓ Áudio gerado com sucesso!
                </div>
                <div style={{ color: P.textMuted, fontSize: '13px', lineHeight: 1.5 }}>
                  Voz <strong style={{ color: P.text }}>{voice}</strong> · {text.trim().length} caracteres · {credits} crédito{credits > 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handlePlayPreview}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', borderRadius: '8px',
                      background: P.accentSoft, border: `1px solid ${P.accent}`,
                      color: P.accent, fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <IconPlay /> Ouvir prévia
                  </button>
                  <button
                    onClick={handleDownload}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', borderRadius: '8px',
                      background: P.accent, border: 'none',
                      color: '#fff', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <IconDownload /> Baixar MP3
                  </button>
                </div>
              </div>

              <button
                onClick={handleReset}
                style={{
                  background: 'none', border: `1px solid ${P.border}`,
                  borderRadius: '8px', padding: '10px',
                  color: P.textMuted, fontSize: '13px', cursor: 'pointer',
                }}
              >
                Gerar outro áudio
              </button>
            </div>
          ) : (
            <>
              {/* Seletor de voz */}
              <div>
                <div style={{ color: P.textMuted, fontSize: '12px', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Voz
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['feminina', 'masculina'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVoice(v)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: `1.5px solid ${voice === v ? P.accent : P.border}`,
                        background: voice === v ? P.accentSoft : P.surface,
                        color: voice === v ? P.accent : P.textMuted,
                        fontSize: '13px', fontWeight: voice === v ? 700 : 400,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}
                    >
                      <IconMic />
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <div style={{ color: P.textMuted, fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Texto
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {text.trim().length > 0 && (
                      <button
                        onClick={handleCopyText}
                        title="Copiar texto"
                        style={{
                          background: 'none', border: 'none',
                          color: copied ? P.success : P.textDim,
                          cursor: 'pointer', padding: '2px',
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <IconCopy />
                      </button>
                    )}
                    <span style={{
                      fontSize: '12px',
                      color: overLimit ? P.danger : charsLeft < 1000 ? '#f59e0b' : P.textMuted,
                    }}>
                      {overLimit ? `−${Math.abs(charsLeft)}` : charsLeft.toLocaleString('pt-BR')} restantes
                    </span>
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Cole ou digite o texto que deseja transformar em áudio..."
                  rows={7}
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: P.surface, color: P.text,
                    border: `1.5px solid ${overLimit ? P.danger : text.length > 0 ? P.borderFocus : P.border}`,
                    borderRadius: '10px', fontSize: '14px', lineHeight: 1.6,
                    resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                />
              </div>

              {/* Info de créditos */}
              {text.trim().length > 0 && !overLimit && (
                <div style={{
                  background: P.accentSoft,
                  border: `1px solid ${P.accent}`,
                  borderRadius: '8px', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ color: P.textMuted, fontSize: '13px' }}>
                    {text.trim().length.toLocaleString('pt-BR')} caracteres
                  </span>
                  <span style={{ color: P.accent, fontWeight: 700, fontSize: '14px' }}>
                    {credits} crédito{credits > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Aviso sobre texto longo */}
              {text.trim().length > 0 && (
                <div style={{ color: P.textMuted, fontSize: '11px', lineHeight: 1.5 }}>
                  💡 1 crédito a cada 500 caracteres · máx. 10.000 por geração
                </div>
              )}

              {/* Erro */}
              {error && (
                <div style={{
                  background: 'rgba(255,68,68,0.08)',
                  border: `1px solid ${P.danger}`,
                  borderRadius: '8px', padding: '10px 14px',
                  color: P.danger, fontSize: '13px',
                }}>
                  {error}
                </div>
              )}

              {/* Botão gerar */}
              <button
                onClick={handleGenerate}
                disabled={!text.trim() || overLimit || loading}
                style={{
                  padding: '13px', borderRadius: '10px',
                  background: !text.trim() || overLimit || loading ? P.surface : P.accent,
                  border: `1.5px solid ${!text.trim() || overLimit || loading ? P.border : P.accent}`,
                  color: !text.trim() || overLimit || loading ? P.textMuted : '#fff',
                  fontSize: '15px', fontWeight: 700, cursor: !text.trim() || overLimit || loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      display: 'inline-block', width: 16, height: 16,
                      border: '2px solid #ffffff44', borderTop: '2px solid #fff',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                    Gerando áudio...
                  </>
                ) : (
                  <>🔵 Gerar Áudio {credits > 0 ? `— ${credits} crédito${credits > 1 ? 's' : ''}` : ''}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(modal, document.body);
}
