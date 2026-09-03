'use client';

import { useEffect, useRef, useState } from 'react';
import PixValueForm from '@/components/pix-link/PixValueForm';
import PixQRCodeDisplay from '@/components/pix-link/PixQRCodeDisplay';

interface Company { id: string; name: string; slug: string; logo_url: string | null; }
interface Props { company: Company; initialAmount: number | null; }
type PaymentMode = 'free' | 'mercadopago';
type PaymentOptions = { default_mode: PaymentMode; allow_payer_choice: boolean; free_available: boolean; mercadopago_available: boolean; };

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function invoke(name: string, body: Record<string, unknown>) {
  const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
    body: JSON.stringify(body),
    cache: 'no-store',
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
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [selectedMode, setSelectedMode] = useState<PaymentMode>('mercadopago');
  const [choiceConfirmed, setChoiceConfirmed] = useState(false);
  const autoCheckInFlight = useRef(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
    setTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    void (async () => {
      const result = await invoke('pixwiki-payment-options', { company_id: company.id });
      const data = result.ok ? result.data : { default_mode: 'mercadopago', allow_payer_choice: false, free_available: false, mercadopago_available: true };
      const normalized: PaymentOptions = {
        default_mode: data?.default_mode === 'free' ? 'free' : 'mercadopago',
        allow_payer_choice: !!data?.allow_payer_choice,
        free_available: !!data?.free_available,
        mercadopago_available: data?.mercadopago_available !== false,
      };
      setOptions(normalized);
      setSelectedMode(normalized.default_mode);
      if (!normalized.allow_payer_choice) {
        setChoiceConfirmed(true);
        if (initialAmount && initialAmount > 0) void generatePix(initialAmount, normalized.default_mode);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Confirmação automática rápida do Pix Link.
  // Antes a tela esperava 15 s e só então consultava a cada 5 s. Agora começa
  // cedo, consulta a cada ~2 s nos primeiros 60 s e depois reduz a frequência.
  // A chamada é pausada em aba oculta e nunca deixa duas consultas sobrepostas.
  useEffect(() => {
    const transactionId = String(pixData?.transaction_id || '');
    if (!transactionId || confirmed) return;

    let cancelled = false;
    let timeoutId: number | null = null;
    const startedAt = Date.now();

    const nextDelay = () => {
      const age = Date.now() - startedAt;
      if (age < 60_000) return 2000;
      if (age < 5 * 60_000) return 4000;
      return 7000;
    };

    const schedule = (delay = nextDelay()) => {
      if (cancelled) return;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(check, delay);
    };

    const check = async () => {
      if (cancelled || confirmed) return;
      if (document.visibilityState !== 'visible' || autoCheckInFlight.current) {
        schedule();
        return;
      }

      autoCheckInFlight.current = true;
      try {
        const { ok, data } = await invoke('pixwiki-confirm-payment', { transaction_id: transactionId });
        if (ok && data?.success && !cancelled) {
          setConfirmed(true);
          return;
        }
      } catch {
        // Best effort: o botão "Já paguei" continua disponível.
      } finally {
        autoCheckInFlight.current = false;
      }

      schedule();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') schedule(150);
    };
    const onFocus = () => schedule(150);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    schedule(1200);

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [confirmed, pixData?.transaction_id]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('publicTheme', next);
  }

  async function generatePix(value: number, forcedMode?: PaymentMode) {
    setLoading(true);
    setConfirmed(false);
    try {
      const { ok, status, data } = await invoke('pixwiki-create-payment', {
        company_id: company.id,
        amount_cents: Math.round(value * 100),
        payment_mode: forcedMode || selectedMode,
      });
      if (!ok) {
        if (data?.error === 'mp_connection_required') throw new Error('Mercado Pago desta empresa não está conectado.');
        if (data?.error === 'pix_key_required') throw new Error('A chave Pix desta empresa não está configurada.');
        if (data?.error === 'pix_direct_slots_unavailable') throw new Error('Muitas cobranças iguais estão abertas agora. Tente novamente em instantes ou escolha Pix pelo Mercado Pago.');
        throw new Error(data?.error || `HTTP ${status}`);
      }
      setAmount(Number(data.amount_brl || value));
      setPixData(data);
    } catch (error) {
      console.error('[PixWiki Link] gerar:', error);
      alert(error instanceof Error ? error.message : 'Erro ao gerar Pix. Tente novamente.');
    } finally { setLoading(false); }
  }

  async function confirmChoice() {
    setChoiceConfirmed(true);
    if (initialAmount && initialAmount > 0) await generatePix(initialAmount, selectedMode);
  }

  async function confirmPix() {
    if (!pixData?.transaction_id) return;
    setLoading(true);
    try {
      const { ok, status, data } = await invoke('pixwiki-confirm-payment', { transaction_id: pixData.transaction_id });
      if (!ok && data?.error === 'ambiguous_direct_payment') { alert('Encontramos mais de um Pix compatível. A confirmação automática foi bloqueada por segurança; o recebedor poderá conferir o recebimento.'); return; }
      if (!ok && status === 400) { alert('Pagamento ainda não identificado. Aguarde alguns segundos e tente novamente.'); return; }
      if (!ok) throw new Error(data?.error || `HTTP ${status}`);
      if (data?.success) setConfirmed(true);
    } catch (error) {
      console.error('[PixWiki Link] confirmar:', error);
      alert('Erro ao verificar pagamento. Tente novamente.');
    } finally { setLoading(false); }
  }

  if (!mounted || !options) return null;
  const isDark = theme === 'dark';

  if (options.allow_payer_choice && !choiceConfirmed) {
    return (
      <div className={`min-h-screen px-4 flex items-center justify-center ${isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}`}>
        <div className={`w-full max-w-lg rounded-3xl border p-6 ${isDark ? 'border-white/10 bg-slate-900' : 'border-black/10 bg-white shadow-xl'}`}>
          <div className="text-center"><h1 className="text-xl font-black">Como prefere pagar?</h1><p className={`mt-1 text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{company.name}</p></div>
          <div className="mt-5 grid gap-3">
            {options.free_available && (
              <button type="button" onClick={() => setSelectedMode('free')} className={`rounded-2xl border p-4 text-left ${selectedMode === 'free' ? 'border-emerald-500 bg-emerald-500/10' : isDark ? 'border-white/10' : 'border-black/10'}`}>
                <div className="flex items-center justify-between"><strong>Pix Grátis</strong><span className="rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-black text-slate-950">RECOMENDADO</span></div>
                <p className={`mt-2 text-xs leading-5 ${isDark ? 'text-white/55' : 'text-slate-500'}`}>Sem tarifa de cobrança do PixWiki. Em pagamentos simultâneos, pode haver um pequeno desconto de até R$ 0,10 para identificar o Pix.</p>
              </button>
            )}
            {options.mercadopago_available && (
              <button type="button" onClick={() => setSelectedMode('mercadopago')} className={`rounded-2xl border p-4 text-left ${selectedMode === 'mercadopago' ? 'border-sky-500 bg-sky-500/10' : isDark ? 'border-white/10' : 'border-black/10'}`}>
                <strong>Pix pelo Mercado Pago</strong>
                <p className={`mt-2 text-xs leading-5 ${isDark ? 'text-white/55' : 'text-slate-500'}`}>Valor exato da cobrança, identificado diretamente pelo Mercado Pago. Sujeito às tarifas do provedor.</p>
              </button>
            )}
          </div>
          <button type="button" onClick={confirmChoice} disabled={loading} className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{loading ? 'Gerando…' : initialAmount ? `Continuar · R$ ${initialAmount.toFixed(2).replace('.', ',')}` : 'Continuar'}</button>
        </div>
        <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border ${isDark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
      </div>
    );
  }

  if (confirmed) {
    const effective = Number(pixData?.amount_brl || amount || 0);
    const original = Number(pixData?.original_amount_brl || effective);
    const discount = Number(pixData?.discount_cents || 0);
    return (
      <div className={`min-h-screen px-4 flex items-center justify-center ${isDark ? 'bg-[#020617] text-white' : 'bg-white text-slate-900'}`}>
        <div className={`w-full max-w-sm rounded-3xl border p-8 text-center ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-black/10 bg-white shadow-sm'}`}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"><svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
          <h2 className="mt-5 text-xl font-black">Pagamento confirmado!</h2><p className={`mt-2 text-sm ${isDark ? 'text-white/55' : 'text-slate-500'}`}>{company.name}</p>
          <p className="mt-1 text-2xl font-black text-emerald-400">R$ {effective.toFixed(2).replace('.', ',')}</p>
          {discount > 0 && <p className={`mt-2 text-xs ${isDark ? 'text-white/45' : 'text-slate-400'}`}>Total R$ {original.toFixed(2).replace('.', ',')} · desconto Pix R$ {(discount / 100).toFixed(2).replace('.', ',')}</p>}
        </div>
        <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border ${isDark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
      </div>
    );
  }

  if (!pixData) return <PixValueForm company={company} initialAmount={initialAmount} onSubmit={value => generatePix(value)} loading={loading} theme={theme} onToggleTheme={toggleTheme} />;

  return <PixQRCodeDisplay company={company} pixData={pixData} amount={amount!} onConfirm={confirmPix} onNewPix={() => { setPixData(null); setAmount(null); setConfirmed(false); }} loading={loading} theme={theme} onToggleTheme={toggleTheme} />;
}
