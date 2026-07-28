'use client';

import { useState, useEffect } from 'react';

interface PixData {
  transaction_id: string;
  amount_brl: string;
  qr_code_url: string;
  pix_code: string;
  expires_at: string;
  company_name: string;
}

interface Props {
  company: {
    name: string;
    logo_url: string | null;
  };
  pixData: PixData;
  amount: number;
  onConfirm: () => Promise<void>;
  onNewPix: () => void;
  loading: boolean;
  theme: 'dark' | 'light';
}

export default function PixQRCodeDisplay({
  company,
  pixData,
  amount,
  onConfirm,
  onNewPix,
  loading,
  theme,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const isDark = theme === 'dark';

  useEffect(() => {
    const update = () => {
      const diff = new Date(pixData.expires_at).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [pixData.expires_at]);

  function copyCode() {
    navigator.clipboard.writeText(pixData.pix_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }

  const bg = isDark ? '#020617' : '#f1f5f9';
  const cardBg = isDark ? '#0f172a' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const innerBg = isDark ? '#1e293b' : '#f8fafc';
  const innerBorder = isDark ? '#334155' : '#e2e8f0';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const textMuted = isDark ? '#475569' : '#94a3b8';
  const textLabel = isDark ? '#64748b' : '#94a3b8';

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', transition: 'background 0.3s' }}>
      <div style={{ width: '100%', maxWidth: '672px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name}
              style={{ maxHeight: '64px', maxWidth: '160px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 12px' }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <span style={{ color: '#fff', fontSize: '20px', fontWeight: 700 }}>{company.name.charAt(0)}</span>
            </div>
          )}
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: textPrimary, margin: '0 0 4px' }}>{company.name}</h1>
          <p style={{ color: textSecondary, fontSize: '14px', margin: 0 }}>
            Pagamento de{' '}
            <span style={{ color: '#60a5fa', fontWeight: 700 }}>
              R$ {amount.toFixed(2).replace('.', ',')}
            </span>
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

          {/* Card 1 — Copia e Cola */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: isDark ? 'none' : '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ width: '16px', height: '16px', color: '#60a5fa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span style={{ color: textPrimary, fontWeight: 700, fontSize: '14px' }}>1. Copia e Cola</span>
            </div>

            {/* Resumo */}
<div style={{ background: innerBg, border: `1px solid ${innerBorder}`, borderRadius: '12px', padding: '16px', marginBottom: '20px', flex: 1 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: textLabel }}>Resumo</span>
    <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>
      Aguardando
    </span>
  </div>

  <p style={{ fontSize: '10.2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: textLabel, margin: '0 0 8px' }}>
    INTERMEDIAÇÕES DE PAGAMENTOS BIGCORPS
  </p>

  {[
    { label: 'Empresa', value: company.name, color: textPrimary },
    { label: 'Banco', value: 'Banco Inter', color: textPrimary },
    { label: 'Validade', value: 'Válido por 30 minutos', color: '#16a34a' },
  ].map(({ label, value, color }) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
      <span style={{ color: textSecondary }}>{label}</span>
      <span style={{ color, fontWeight: 500 }}>{value}</span>
    </div>
  ))}

  <div style={{ paddingTop: '12px', borderTop: `1px solid ${innerBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ color: textPrimary, fontWeight: 700 }}>Total</span>
    <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '22px' }}>
      R$ {amount.toFixed(2).replace('.', ',')}
    </span>
  </div>
</div>

            {/* Botões */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={copyCode}
                style={{
                  width: '100%', padding: '12px',
                  background: copied ? '#22c55e' : '#2563eb',
                  border: 'none', borderRadius: '12px',
                  color: '#fff', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? (
                  <>
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copiado!
                  </>
                ) : (
                  <>
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar Código PIX
                  </>
                )}
              </button>

              <button
                onClick={onConfirm}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  background: 'transparent',
                  border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                  borderRadius: '12px',
                  color: isDark ? '#cbd5e1' : '#64748b',
                  fontWeight: 700, fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Verificando...
                  </>
                ) : 'Já paguei, verificar agora'}
              </button>

              <button
                onClick={onNewPix}
                style={{
                  width: '100%', padding: '8px',
                  background: 'transparent', border: 'none',
                  color: textMuted, fontSize: '12px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  transition: 'color 0.2s',
                }}
              >
                <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Novo valor
              </button>
            </div>
          </div>

          {/* Card 2 — QR Code */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: isDark ? 'none' : '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', width: '100%' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ width: '16px', height: '16px', color: '#60a5fa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <span style={{ color: textPrimary, fontWeight: 700, fontSize: '14px' }}>2. Escaneie o QR Code</span>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', marginBottom: '16px', width: '100%', maxWidth: '220px' }}>
              <img src={pixData.qr_code_url} alt="QR Code PIX" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
              background: timeLeft < 300 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
              color: timeLeft < 300 ? '#f87171' : '#60a5fa',
            }}>
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Expira em: {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <footer
  style={{
    textAlign: 'center',
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    color: textMuted,
  }}
>
  <p style={{ margin: 0 }}>
    Pagamento processado com segurança via Banco Inter e BigCorps
  </p>

  <p style={{ margin: 0 }}>
    Quer receber Pix com confirmação automática?{' '}
    <a
      href="https://pix.wiki"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: textMuted,
        fontWeight: 600,
        textDecoration: 'none',
        opacity: 0.8,
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.8';
      }}
    >
      Crie o seu no Pix.Wiki
    </a>
  </p>

  <p style={{ margin: 0, opacity: 0.65 }}>
    <a
      href="https://pix.wiki"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'inherit',
        textDecoration: 'none',
        transition: 'opacity 0.2s',
      }}
    >
      Pix.Wiki
    </a>

    {' | '}Desenvolvido por{' '}

    <a
      href="https://bigcorps.com.br"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'inherit',
        textDecoration: 'none',
        transition: 'opacity 0.2s',
      }}
    >
      BigCorps
    </a>

    {' | '}Tecnologia{' '}

    <a
      href="https://minhai.app"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'inherit',
        textDecoration: 'none',
        transition: 'opacity 0.2s',
      }}
    >
      minhAi
    </a>
  </p>
</footer>

<style>{`
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
`}</style>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}