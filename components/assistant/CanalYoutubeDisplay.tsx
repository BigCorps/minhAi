'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

interface CanalYoutubeDisplayProps {
  data: {
    channelUrl: string;
    channelName?: string;
    channelDescription?: string;
    autoCloseDuration?: number;
  };
  onClose: () => void;
  playText: (text: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

const OPENING_TEXT =
  'Aqui está o canal do YouTube. Diga abrir para visitar o canal, inscrever para se inscrever, copiar para copiar o link, ou fechar para sair.';

const DARK = {
  bg: '#1e293b',
  border: 'rgba(255,255,255,0.08)',
  header: 'rgba(255,255,255,0.05)',
  text: '#f1f5f9',
  textMuted: 'rgba(255,255,255,0.5)',
  textSub: 'rgba(255,255,255,0.75)',
  chip: 'rgba(185,28,28,0.25)',
  chipText: '#fca5a5',
  linkBg: 'rgba(255,255,255,0.07)',
  btnSecBg: '#334155',
  btnSecHover: '#475569',
  hintBg: 'rgba(255,255,255,0.06)',
  hintText: '#94a3b8',
  progressBg: '#334155',
  previewBg: 'rgba(255,255,255,0.04)',
};

const LIGHT = {
  bg: '#ffffff',
  border: '#e2e8f0',
  header: '#f8fafc',
  text: '#0f172a',
  textMuted: '#94a3b8',
  textSub: '#475569',
  chip: '#fee2e2',
  chipText: '#b91c1c',
  linkBg: '#f1f5f9',
  btnSecBg: '#e2e8f0',
  btnSecHover: '#cbd5e1',
  hintBg: '#f8fafc',
  hintText: '#64748b',
  progressBg: '#e2e8f0',
  previewBg: '#f8fafc',
};

const getEmbedUrl = (url: string): string | null => {
  const handle = url.match(/@([\w-]+)/)?.[1];
  if (handle) return `https://www.youtube.com/embed?listType=user_uploads&list=${handle}`;
  const channelId = url.match(/channel\/([\w-]+)/)?.[1];
  if (channelId) return `https://www.youtube.com/embed?listType=user_uploads&list=${channelId}`;
  return null;
};

export default function CanalYoutubeDisplay({
  data,
  onClose,
  playText,
  theme = 'dark',
}: CanalYoutubeDisplayProps) {
  const AUTO_CLOSE = data.autoCloseDuration ?? 30;
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  const { channelUrl, channelName, channelDescription } = data;
  const P = theme === 'dark' ? DARK : LIGHT;

  const embedUrl = !embedError ? getEmbedUrl(channelUrl) : null;

  const previewFallbackUrl = embedError
    ? `https://api.microlink.io?url=${encodeURIComponent(channelUrl)}&screenshot=true&meta=false&embed=screenshot.url`
    : null;

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]+/g, '');

  const handleManualClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleManualClose);

  useEffect(() => {
    if (channelUrl) {
      setQrCodeUrl(
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(channelUrl)}&margin=10`
      );
    }
  }, [channelUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.speechSynthesis.cancel();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose]);

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar', 'encerrar'].some((c) => t.includes(c))) {
        onClose();
        return;
      }
      if (['repetir', 'repete', 'de novo'].some((c) => t.includes(c))) {
        playText(OPENING_TEXT).catch(() => {});
        return;
      }
      if (['copiar', 'copia', 'copie'].some((c) => t.includes(c))) {
        navigator.clipboard.writeText(channelUrl);
        playText('Link copiado.').catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      if (['abrir', 'abre', 'ver', 'inscrever', 'inscreva', 'inscrição'].some((c) => t.includes(c))) {
        window.open(channelUrl, '_blank');
        playText('Abrindo o canal do YouTube.').catch(() => {});
        return;
      }
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(channelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => window.open(channelUrl, '_blank');

  // ── SVG icons ──────────────────────────────────────────────────────────────

  const IconYoutube = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#ef4444">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
    </svg>
  );

  const IconCopy = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );

  const IconCheck = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const IconExternal = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );

  // ── Coluna esquerda (compartilhada desktop/mobile) ─────────────────────────

  const LeftColumn = ({ mobile = false }: { mobile?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: mobile ? 'center' : undefined }}>

      {/* QR Code */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ padding: 12, borderRadius: 16, background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code Canal YouTube" style={{ width: mobile ? 140 : 160, height: mobile ? 140 : 160, objectFit: 'contain', display: 'block' }} />
          ) : (
            <div style={{ width: mobile ? 140 : 160, height: mobile ? 140 : 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #ef4444', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}
        </div>
        <p style={{ fontSize: 11, color: P.textMuted, textAlign: 'center', margin: 0 }}>
          Escaneie para acessar o canal
        </p>
      </div>

      {/* Descrição */}
      {channelDescription && (
        <p style={{ fontSize: 13, color: P.textSub, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          {channelDescription}
        </p>
      )}

      {/* Link */}
      <div style={{ borderRadius: 10, padding: '8px 12px', background: P.linkBg, display: 'flex', alignItems: 'center', gap: 8, width: mobile ? '100%' : undefined }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ef4444" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: P.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {channelUrl}
        </span>
      </div>

      {/* Botões */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: mobile ? '100%' : undefined }}>
        <button
          onClick={handleCopy}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: P.btnSecBg, color: P.text, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? 'Link Copiado!' : 'Copiar Link'}
        </button>
        <button
          onClick={handleOpen}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff',
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <IconExternal />
          Abrir Canal
        </button>
      </div>

      {/* Voice hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: P.hintBg, width: mobile ? '100%' : undefined }}>
        <span style={{ fontSize: 13 }}>🎤</span>
        <span style={{ fontSize: 11, color: P.hintText }}>
          Diga <strong>"abrir"</strong>, <strong>"inscrever"</strong>, <strong>"copiar"</strong> ou <strong>"fechar"</strong>
        </span>
      </div>
    </div>
  );

  // ── Preview ────────────────────────────────────────────────────────────────

  const Preview = () => {
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0, minHeight: 420, borderRadius: 12 }}
          title="Canal do YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => setEmbedError(true)}
        />
      );
    }
    if (previewFallbackUrl) {
      return (
        <div style={{ width: '100%', height: '100%', minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: P.previewBg, borderRadius: 12 }}>
          <img
            src={previewFallbackUrl}
            alt="Preview do canal"
            style={{ width: '100%', height: 'auto', borderRadius: 10, maxHeight: 400, objectFit: 'contain' }}
            onError={() => setEmbedError(false)} // reset para placeholder
          />
        </div>
      );
    }
    return (
      <div style={{ width: '100%', height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: P.previewBg, borderRadius: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#fff">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
          </svg>
        </div>
        <p style={{ fontWeight: 600, fontSize: 16, color: P.text, margin: 0 }}>Preview não disponível</p>
        <p style={{ fontSize: 13, color: P.textMuted, margin: 0, textAlign: 'center' }}>
          Use o QR Code ou clique em "Abrir Canal"
        </p>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return createPortal(
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      }}>
        <div style={{
          position: 'relative', width: '100%', maxWidth: 900,
          borderRadius: 20, overflow: 'hidden',
          background: P.bg, border: `1px solid ${P.border}`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', borderBottom: `1px solid ${P.border}`,
            background: P.header,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex' }}>
                <IconYoutube />
              </div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: P.text }}>
                {channelName ? channelName : 'Canal do YouTube'}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: '4px 12px', borderRadius: 999, background: P.chip, color: P.chipText, fontSize: 13, fontWeight: 600 }}>
                {timeLeft}s
              </div>
              <button
                onClick={handleManualClose}
                style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: P.textMuted, display: 'flex' }}
                onMouseEnter={e => (e.currentTarget.style.color = P.text)}
                onMouseLeave={e => (e.currentTarget.style.color = P.textMuted)}
                aria-label="Fechar"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: 24 }}>

            {/* Desktop */}
            <div className="hidden md:grid" style={{ gridTemplateColumns: '220px 1fr', gap: 24 }}>
              <LeftColumn />
              <Preview />
            </div>

            {/* Mobile */}
            <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <LeftColumn mobile />
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: P.progressBg }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #ef4444, #b91c1c)',
              width: `${(timeLeft / AUTO_CLOSE) * 100}%`,
              transition: 'width 1s linear',
            }} />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
