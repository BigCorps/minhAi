'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTurnstile } from '@/hooks/useTurnstile';
import PixValueForm from './PixValueForm';
import PixQRCodeDisplay from './PixQRCodeDisplay';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface Props {
  company: Company;
  initialAmount: number | null;
}

export default function PixLinkPage({ company, initialAmount }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  const supabase = createClient();
  const { getToken, containerRef, ready: turnstileReady } = useTurnstile();

  useEffect(() => {
    setMounted(true);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
    setTheme(saved || (prefersDark ? 'dark' : 'light'));
  }, []);

  // Se veio com valor na URL, aguarda o Turnstile estar pronto antes de gerar
  useEffect(() => {
    if (initialAmount && initialAmount > 0 && turnstileReady) {
      generatePix(initialAmount);
    }
  }, [turnstileReady]);

  // Aguarda 30s após o PIX ser gerado antes de começar o auto-check
  useEffect(() => {
    if (!pixData) return;
    const startDelay = setTimeout(() => setAutoChecking(true), 30000);
    return () => clearTimeout(startDelay);
  }, [pixData]);

  // Polling a cada 5s após o delay inicial
  useEffect(() => {
    if (!autoChecking || !pixData) return;
    const interval = setInterval(async () => {
      if (!pixData?.transaction_id) return;
      try {
        const { data, error } = await supabase.functions.invoke('confirmar-pix-assistente', {
          body: { transaction_id: pixData.transaction_id },
        });
        if (!error && data?.success) {
          setConfirmed(true);
          clearInterval(interval);
        }
      } catch {
        // silencioso
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoChecking, pixData]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('publicTheme', next);
  }

  async function generatePix(value: number) {
    setLoading(true);
    setTurnstileError(null);
    try {
      // Turnstile: valida se disponível, pula silenciosamente se não
      const token = await getToken();
      if (token) {
        const { data: td, error: te } = await supabase.functions.invoke(
          'validate-turnstile',
          { body: { token } }
        );
        if (te || !td?.success) {
          setTurnstileError(td?.error || 'Verificação de segurança falhou. Tente novamente.');
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke('gerar-pix-assistente', {
        body: {
          company_id: company.id,
          amount_cents: Math.round(value * 100),
        },
      });
      if (error) throw error;
      setAmount(value);
      setPixData(data);
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
      alert('Erro ao gerar PIX. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmPix() {
    if (!pixData?.transaction_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirmar-pix-assistente', {
        body: { transaction_id: pixData.transaction_id },
      });
      if (error) throw error;
      if (data?.success) {
        setConfirmed(true);
      } else {
        alert('PIX ainda não confirmado. Aguarde e tente novamente.');
      }
    } catch {
      alert('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const isDark = theme === 'dark';

  const ThemeButton = () => (
    <button
      onClick={toggleTheme}
      style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 50,
        width: '44px', height: '44px', borderRadius: '50%',
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.12)',
        color: isDark ? '#ffffff' : '#000000',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(10px)', transition: 'all 0.2s',
      }}
    >
      {isDark ? (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );

  if (!mounted) return null;

  if (confirmed) {
    return (
      <div style={{ minHeight: '100vh', background: isDark ? '#020617' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <ThemeButton />
        <div style={{
          background: isDark ? '#0f172a' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: '16px', padding: '40px', textAlign: 'center',
          maxWidth: '384px', width: '100%',
          boxShadow: isDark ? 'none' : '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            width: '80px', height: '80px',
            background: 'rgba(34,197,94,0.1)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg style={{ width: '40px', height: '40px', color: '#4ade80' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a', marginBottom: '8px' }}>
            Pagamento Confirmado!
          </h2>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '14px', marginBottom: '4px' }}>
            {company.name}
          </p>
          <p style={{ color: '#60a5fa', fontWeight: 700, fontSize: '20px' }}>
            R$ {amount?.toFixed(2).replace('.', ',')}
          </p>
          <p style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: '12px', marginTop: '24px' }}>
            Obrigado pelo seu pagamento.
          </p>
        </div>
      </div>
    );
  }

  if (!pixData) {
    return (
      <>
        <ThemeButton />
        <div ref={containerRef} style={{ display: 'none' }} aria-hidden="true" />
        {turnstileError && (
          <div style={{
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 100, background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '10px', padding: '12px 20px',
            color: '#dc2626', fontSize: '13px', fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '360px', textAlign: 'center',
          }}>
            {turnstileError}
          </div>
        )}
        <PixValueForm
          company={company}
          initialAmount={initialAmount}
          onSubmit={generatePix}
          loading={loading}
          theme={theme}
        />
      </>
    );
  }

  return (
    <>
      <ThemeButton />
      <PixQRCodeDisplay
        company={company}
        pixData={pixData}
        amount={amount!}
        onConfirm={confirmPix}
        onNewPix={() => { setPixData(null); setAmount(null); setAutoChecking(false); }}
        loading={loading}
        theme={theme}
      />
    </>
  );
}
