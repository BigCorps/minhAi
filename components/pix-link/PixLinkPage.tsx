'use client';

import { useEffect, useState } from 'react';
import PixValueForm from './PixValueForm';
import PixQRCodeDisplay from './PixQRCodeDisplay';

interface Company { id: string; name: string; slug: string; logo_url: string | null; }
interface Props { company: Company; initialAmount: number | null; hideThemeToggle?: boolean; theme?: 'dark' | 'light'; onToggleTheme?: () => void; }

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function invokeFunction(name: string, body: Record<string, unknown>) {
  const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
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

  useEffect(() => {
    setMounted(true);
    if (controlledTheme) return;
    const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
    setInternalTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  }, [controlledTheme]);

  useEffect(() => { if (initialAmount && initialAmount > 0) void generatePix(initialAmount); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pixData) return;
    const id = window.setTimeout(() => setAutoChecking(true), 15000);
    return () => window.clearTimeout(id);
  }, [pixData]);

  useEffect(() => {
    if (!autoChecking || !pixData?.transaction_id) return;
    const id = window.setInterval(async () => {
      try {
        const { ok, data } = await invokeFunction('confirmar-pix-assistente-v2', { transaction_id: pixData.transaction_id });
        if (ok && data?.success) { setConfirmed(true); window.clearInterval(id); }
      } catch { /* checagem automática é silenciosa */ }
    }, 5000);
    return () => window.clearInterval(id);
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
      const { ok, status, data } = await invokeFunction('gerar-pix-assistente-v2', {
        company_id: company.id,
        amount_cents: Math.round(value * 100),
      });
      if (!ok) {
        if (data?.error === 'pix_direct_slots_unavailable') throw new Error('Muitas cobranças iguais estão abertas agora. Tente novamente em instantes.');
        if (data?.error === 'mp_connection_required') throw new Error('Conecte o Mercado Pago para usar a confirmação automática do Pix Grátis.');
        throw new Error(data?.error || `HTTP ${status}`);
      }
      setAmount(Number(data.amount_brl || value));
      setPixData(data);
    } catch (error) {
      console.error('[Pix Link] gerar:', error);
      alert(error instanceof Error ? error.message : 'Erro ao gerar PIX. Tente novamente.');
    } finally { setLoading(false); }
  }

  async function confirmPix() {
    if (!pixData?.transaction_id) return;
    setLoading(true);
    try {
      const { status, ok, data } = await invokeFunction('confirmar-pix-assistente-v2', { transaction_id: pixData.transaction_id });
      if (!ok && status === 400) { alert('Pagamento ainda não identificado. Aguarde alguns segundos e tente novamente.'); return; }
      if (!ok && data?.error === 'ambiguous_direct_payment') { alert('Mais de um Pix compatível foi encontrado. A confirmação automática foi bloqueada por segurança.'); return; }
      if (!ok) throw new Error(data?.error || `HTTP ${status}`);
      if (data?.success) setConfirmed(true); else alert('PIX ainda não confirmado. Aguarde e tente novamente.');
    } catch { alert('Erro ao verificar pagamento. Tente novamente.'); }
    finally { setLoading(false); }
  }

  if (!mounted) return null;
  const isDark = theme === 'dark';

  if (confirmed) {
    const effective = Number(pixData?.amount_brl || amount || 0);
    const original = Number(pixData?.original_amount_brl || effective);
    const discount = Number(pixData?.discount_cents || 0);
    return (
      <div className={`min-h-screen px-4 flex items-center justify-center ${isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}`}>
        <div className={`w-full max-w-sm rounded-3xl border p-8 text-center ${isDark ? 'border-white/10 bg-slate-900' : 'border-black/10 bg-white shadow-sm'}`}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"><svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
          <h2 className="mt-5 text-xl font-black">Pagamento confirmado!</h2><p className={`mt-2 text-sm ${isDark ? 'text-white/55' : 'text-slate-500'}`}>{company.name}</p>
          <p className="mt-1 text-2xl font-black text-emerald-400">R$ {effective.toFixed(2).replace('.', ',')}</p>
          {discount > 0 && <p className={`mt-2 text-xs ${isDark ? 'text-white/45' : 'text-slate-400'}`}>Total R$ {original.toFixed(2).replace('.', ',')} · desconto Pix R$ {(discount / 100).toFixed(2).replace('.', ',')}</p>}
        </div>
        {!hideThemeToggle && <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border ${isDark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>}
      </div>
    );
  }

  if (!pixData) return <PixValueForm company={company} initialAmount={initialAmount} onSubmit={generatePix} loading={loading} theme={theme} onToggleTheme={onToggleTheme ?? toggleTheme} />;
  return <PixQRCodeDisplay company={company} pixData={pixData} amount={amount!} onConfirm={confirmPix} onNewPix={() => { setPixData(null); setAmount(null); setAutoChecking(false); }} loading={loading} theme={theme} onToggleTheme={onToggleTheme ?? toggleTheme} />;
}
