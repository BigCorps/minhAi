'use client';

import { useEffect, useState } from 'react';
import PixValueForm from '@/components/pix-link/PixValueForm';
import PixQRCodeDisplay from '@/components/pix-link/PixQRCodeDisplay';

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

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function invoke(name: string, body: Record<string, unknown>) {
  const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export default function PixWikiLinkPage({ company, initialAmount }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
    setTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    if (initialAmount && initialAmount > 0) void generatePix(initialAmount);
    // O valor inicial só deve gerar uma cobrança na primeira montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pixData) return;
    const id = window.setTimeout(() => setAutoChecking(true), 15000);
    return () => window.clearTimeout(id);
  }, [pixData]);

  useEffect(() => {
    if (!autoChecking || !pixData?.transaction_id) return;
    const id = window.setInterval(async () => {
      const { ok, data } = await invoke('pixwiki-confirm-payment', { transaction_id: pixData.transaction_id });
      if (ok && data?.success) {
        setConfirmed(true);
        window.clearInterval(id);
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [autoChecking, pixData]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('publicTheme', next);
  }

  async function generatePix(value: number) {
    setLoading(true);
    try {
      const { ok, status, data } = await invoke('pixwiki-create-payment', {
        company_id: company.id,
        amount_cents: Math.round(value * 100),
      });
      if (!ok) {
        if (data?.error === 'mp_connection_required') throw new Error('Mercado Pago desta empresa não está conectado.');
        throw new Error(data?.error || `HTTP ${status}`);
      }
      setAmount(value);
      setPixData(data);
    } catch (error) {
      console.error('[PixWiki Link] gerar:', error);
      alert(error instanceof Error ? error.message : 'Erro ao gerar Pix. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmPix() {
    if (!pixData?.transaction_id) return;
    setLoading(true);
    try {
      const { ok, status, data } = await invoke('pixwiki-confirm-payment', {
        transaction_id: pixData.transaction_id,
      });
      if (!ok && status === 400) {
        alert('Pagamento ainda não identificado. Aguarde alguns segundos e tente novamente.');
        return;
      }
      if (!ok) throw new Error(data?.error || `HTTP ${status}`);
      if (data?.success) setConfirmed(true);
    } catch (error) {
      console.error('[PixWiki Link] confirmar:', error);
      alert('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  if (confirmed) {
    const isDark = theme === 'dark';
    return (
      <div className={`min-h-screen px-4 flex items-center justify-center ${isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}`}>
        <div className={`w-full max-w-sm rounded-3xl border p-8 text-center ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-black/10 bg-white shadow-sm'}`}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="mt-5 text-xl font-black">Pagamento confirmado!</h2>
          <p className={`mt-2 text-sm ${isDark ? 'text-white/55' : 'text-slate-500'}`}>{company.name}</p>
          <p className="mt-1 text-2xl font-black text-emerald-400">R$ {amount?.toFixed(2).replace('.', ',')}</p>
        </div>
        <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border ${isDark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
      </div>
    );
  }

  if (!pixData) {
    return <PixValueForm company={company} initialAmount={initialAmount} onSubmit={generatePix} loading={loading} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <PixQRCodeDisplay
      company={company}
      pixData={pixData}
      amount={amount!}
      onConfirm={confirmPix}
      onNewPix={() => { setPixData(null); setAmount(null); setAutoChecking(false); }}
      loading={loading}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
