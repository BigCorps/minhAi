'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
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
  hideThemeToggle?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const SUPABASE_FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function invokeFunction(name: string, body: any) {
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

export default function PixLinkPage({ company, initialAmount, hideThemeToggle, theme: controlledTheme, onToggleTheme }: Props) {
  const [internalTheme, setInternalTheme] = useState<'dark' | 'light'>('dark');
  const theme = controlledTheme ?? internalTheme;
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    if (controlledTheme) return; // tema vem de fora, não precisa detectar sozinho
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
    setInternalTheme(saved || (prefersDark ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    if (initialAmount && initialAmount > 0) {
      generatePix(initialAmount);
    }
  }, []);

  useEffect(() => {
    if (!pixData) return;
    const startDelay = setTimeout(() => setAutoChecking(true), 30000);
    return () => clearTimeout(startDelay);
  }, [pixData]);

  useEffect(() => {
    if (!autoChecking || !pixData) return;
    const interval = setInterval(async () => {
      if (!pixData?.transaction_id) return;
      try {
        const { ok, data } = await invokeFunction('confirmar-pix-assistente', {
          transaction_id: pixData.transaction_id,
        });
        if (ok && data?.success) {
          setConfirmed(true);
          clearInterval(interval);
        }
      } catch {
        // silencioso — checagem automática não deve incomodar o usuário
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoChecking, pixData]);

   function toggleTheme() {
    if (onToggleTheme) { onToggleTheme(); return; }
    const next = internalTheme === 'dark' ? 'light' : 'dark';
    setInternalTheme(next);
    localStorage.setItem('publicTheme', next);
  }

  async function generatePix(value: number) {
    setLoading(true);
    try {
      const { ok, status, data } = await invokeFunction('gerar-pix-assistente', {
        company_id: company.id,
        amount_cents: Math.round(value * 100),
      });
      if (!ok) throw new Error(data?.error || `Erro de rede ou resposta inválida (HTTP ${status})`);
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
      const { status, ok, data } = await invokeFunction('confirmar-pix-assistente', {
        transaction_id: pixData.transaction_id,
      });

      if (!ok && status === 400 && data?.status) {
        // Resposta esperada da function: banco ainda não confirmou o PIX
        alert('Pagamento ainda não identificado pelo banco. Aguarde alguns segundos e tente novamente.');
        return;
      }
      if (!ok) throw new Error(data?.error || `Erro HTTP ${status}`);

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
      <div style={{ minHeight: '100vh', background: isDark ? '#020617' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
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
        {!hideThemeToggle && <ThemeButton />}
      </div>
    );
  }

  if (!pixData) {
    return (
      <>
        <PixValueForm
          company={company}
          initialAmount={initialAmount}
          onSubmit={generatePix}
          loading={loading}
          theme={theme}
          onToggleTheme={onToggleTheme ?? toggleTheme}
        />
      </>
    );
  }

  return (
    <>
      <PixQRCodeDisplay
        company={company}
        pixData={pixData}
        amount={amount!}
        onConfirm={confirmPix}
        onNewPix={() => { setPixData(null); setAmount(null); setAutoChecking(false); }}
        loading={loading}
        theme={theme}
        onToggleTheme={onToggleTheme ?? toggleTheme}
      />
    </>
  );
}
