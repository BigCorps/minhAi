'use client';

import { useState } from 'react';

interface Props {
  company: {
    name: string;
    logo_url: string | null;
  };
  initialAmount: number | null;
  onSubmit: (value: number) => void;
  loading: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function PixValueForm({ company, initialAmount, onSubmit, loading, theme, onToggleTheme }: Props) {
  const [value, setValue] = useState(initialAmount ? initialAmount.toFixed(2) : '');

  const isDark = theme === 'dark';

  const bg = isDark ? '#020617' : '#ffffff';
  const cardBg = isDark ? '#0f172a' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const inputBg = isDark ? '#1e293b' : '#f8fafc';
  const inputBorder = isDark ? '#475569' : '#cbd5e1';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const textMuted = isDark ? '#475569' : '#94a3b8';

  function handleSubmit() {
    const parsed = parseFloat(value.replace(',', '.'));
    if (!parsed || parsed <= 0) return;
    onSubmit(parsed);
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', transition: 'background 0.3s' }}>
      <div style={{ width: '100%', maxWidth: '384px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              style={{ maxHeight: '80px', maxWidth: '180px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 16px' }}
            />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}>
                {company.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: textPrimary, margin: '0 0 4px' }}>
            {company.name}
          </h1>
          <p style={{ color: textSecondary, fontSize: '14px', margin: 0 }}>
            Pagamento via PIX
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: isDark ? 'none' : '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: textSecondary, marginBottom: '8px' }}>
              Valor do pagamento
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                color: textSecondary, fontWeight: 700, fontSize: '18px',
              }}>
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="0,00"
                autoFocus
                style={{
                  width: '100%',
                  paddingLeft: '48px', paddingRight: '16px',
                  paddingTop: '16px', paddingBottom: '16px',
                  background: inputBg,
                  border: `1px solid ${inputBorder}`,
                  borderRadius: '12px',
                  color: textPrimary,
                  fontSize: '20px',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = inputBorder}
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !value || parseFloat(value) <= 0}
            style={{
              width: '100%',
              padding: '16px',
              background: '#2563eb',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '16px',
              cursor: loading || !value || parseFloat(value) <= 0 ? 'not-allowed' : 'pointer',
              opacity: loading || !value || parseFloat(value) <= 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
          >
            {loading ? (
              <>
                <svg style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Gerando PIX...
              </>
            ) : (
              'Gerar QR Code PIX'
            )}
          </button>
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

        <button
          onClick={onToggleTheme}
          aria-label="Alternar tema"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '50%',
            margin: '20px auto 0',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
            color: textMuted,
            cursor: 'pointer',
          }}
        >
          {isDark ? (
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

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

      </div>
    </div>
  );
}
