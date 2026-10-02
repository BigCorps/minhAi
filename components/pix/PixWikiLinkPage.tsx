'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PixQRCodeDisplay from '@/components/pix-link/PixQRCodeDisplay';
import PixWikiV2PaymentPage from '@/components/pix/PixWikiV2PaymentPage';

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

function parseAmount(value: string) {
  const normalized = value.replace(/[^0-9,.]/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function invoke(name: string, body: Record<string, unknown>) {
  const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function friendlyError(error?: string) {
  if (error === 'mp_connection_required') return 'O recebedor ainda precisa conectar o Mercado Pago.';
  if (error === 'pix_key_required') return 'O recebedor ainda precisa configurar a chave Pix.';
  if (error === 'included_quota_exhausted' || error === 'spending_limit_reached' || error === 'billing_past_due') {
    return 'Este Pix Link está temporariamente indisponível. O recebedor precisa revisar a franquia de automações.';
  }
  return 'Não foi possível preparar o Pix agora. Tente novamente.';
}

export default function PixWikiLinkPage({ company, initialAmount }: Props) {
  const [dark, setDark] = useState(true);
  const [value, setValue] = useState(initialAmount ? initialAmount.toFixed(2) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutToken, setCheckoutToken] = useState('');
  const [checkoutAmountCents, setCheckoutAmountCents] = useState(0);
  const [legacyPix, setLegacyPix] = useState<any>(null);
  const [legacyConfirmed, setLegacyConfirmed] = useState(false);
  const legacyCheckInFlight = useRef(false);
  const autoStarted = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('publicTheme');
    if (saved === 'light' || saved === 'dark') setDark(saved === 'dark');
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  function toggleTheme() {
    setDark(current => {
      const next = !current;
      localStorage.setItem('publicTheme', next ? 'dark' : 'light');
      return next;
    });
  }

  async function legacyFallback(amount: number) {
    const legacy = await invoke('pixwiki-create-payment', {
      company_id: company.id,
      amount_cents: Math.round(amount * 100),
    });
    if (!legacy.ok) throw new Error(legacy.data?.error || `HTTP ${legacy.status}`);
    setLegacyPix(legacy.data);
    setCheckoutToken('');
    setCheckoutAmountCents(0);
  }

  async function createV2(amount: number) {
    const cents = Math.round(amount * 100);
    const response = await invoke('pixwiki-v2-checkout', {
      action: 'create_link',
      slug: company.slug,
      amount_cents: cents,
      description: `Pagamento para ${company.name}`,
    });

    if (response.ok && response.data?.checkout?.token) {
      setCheckoutToken(String(response.data.checkout.token));
      setCheckoutAmountCents(cents);
      return;
    }

    // Rollback operacional: se o V2 ainda não estiver habilitado/implantado,
    // o link divulgado continua conseguindo gerar Pix pelo motor anterior.
    const v2Unavailable = response.status === 404
      || response.status >= 500
      || ['pix_link_v2_not_enabled', 'v2_runtime_not_configured'].includes(String(response.data?.error || ''));

    if (v2Unavailable) {
      await legacyFallback(amount);
      return;
    }

    throw new Error(String(response.data?.error || `HTTP ${response.status}`));
  }

  async function submitAmount(amount: number) {
    if (!amount || amount <= 0) return;
    setLoading(true);
    setError('');
    setLegacyConfirmed(false);
    setLegacyPix(null);
    try {
      await createV2(amount);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialAmount || initialAmount <= 0 || autoStarted.current) return;
    autoStarted.current = true;
    void submitAmount(initialAmount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAmount]);

  useEffect(() => {
    const transactionId = String(legacyPix?.transaction_id || '');
    if (!transactionId || legacyConfirmed) return;
    let cancelled = false;
    let timer: number | null = null;
    const started = Date.now();

    const schedule = () => {
      if (cancelled) return;
      const age = Date.now() - started;
      timer = window.setTimeout(check, age < 60_000 ? 2000 : age < 5 * 60_000 ? 4000 : 7000);
    };

    const check = async () => {
      if (cancelled || document.visibilityState !== 'visible' || legacyCheckInFlight.current) {
        schedule();
        return;
      }
      legacyCheckInFlight.current = true;
      try {
        const result = await invoke('pixwiki-confirm-payment', { transaction_id: transactionId });
        if (result.ok && result.data?.success && !cancelled) {
          setLegacyConfirmed(true);
          return;
        }
      } finally {
        legacyCheckInFlight.current = false;
      }
      schedule();
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [legacyConfirmed, legacyPix?.transaction_id]);

  const parsed = useMemo(() => parseAmount(value), [value]);
  const page = dark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900';
  const card = dark ? 'border-white/10 bg-white/[0.045]' : 'border-black/10 bg-white shadow-xl shadow-slate-200/40';
  const input = dark ? 'border-white/10 bg-white/[0.06] text-white placeholder:text-white/25' : 'border-black/10 bg-white text-slate-900 placeholder:text-slate-400';
  const muted = dark ? 'text-white/55' : 'text-slate-500';
  const subtle = dark ? 'text-white/35' : 'text-slate-400';

  if (checkoutToken) {
    return (
      <PixWikiV2PaymentPage
        token={checkoutToken}
        company={company}
        amountCents={checkoutAmountCents}
        description={`Pix Link · ${company.name}`}
        onRestart={() => {
          setCheckoutToken('');
          setCheckoutAmountCents(0);
          setValue('');
          setError('');
        }}
      />
    );
  }

  if (legacyConfirmed) {
    const effective = Number(legacyPix?.amount_brl || parsed || 0);
    return (
      <main className={`min-h-screen px-4 py-10 ${page}`}>
        <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border ${dark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
        <div className="mx-auto flex min-h-[80vh] max-w-sm items-center">
          <section className={`w-full rounded-[28px] border p-8 text-center ${card}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="mt-5 text-xl font-black">Pagamento confirmado!</h2>
            <p className={`mt-2 text-sm ${muted}`}>{company.name}</p>
            <p className="mt-2 text-3xl font-black text-emerald-400">{effective.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <button type="button" onClick={() => { setLegacyPix(null); setLegacyConfirmed(false); setValue(''); }} className={`mt-5 text-xs font-bold ${muted}`}>Fazer outro Pix</button>
          </section>
        </div>
      </main>
    );
  }

  if (legacyPix) {
    return (
      <PixQRCodeDisplay
        company={company}
        pixData={legacyPix}
        amount={Number(legacyPix.amount_brl || parsed || 0)}
        onConfirm={async () => {
          const result = await invoke('pixwiki-confirm-payment', { transaction_id: legacyPix.transaction_id });
          if (result.ok && result.data?.success) setLegacyConfirmed(true);
        }}
        onNewPix={() => { setLegacyPix(null); setLegacyConfirmed(false); setValue(''); }}
        loading={loading}
        theme={dark ? 'dark' : 'light'}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <main className={`min-h-screen px-4 py-10 ${page}`}>
      <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border ${dark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <section className={`w-full rounded-[28px] border p-6 sm:p-7 ${card}`}>
          <div className="text-center">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="mx-auto mb-3 max-h-16 max-w-44 object-contain" />
            ) : (
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-black text-slate-950">{company.name.slice(0, 1).toUpperCase()}</div>
            )}
            <h1 className="text-xl font-black">{company.name}</h1>
            <p className={`mt-1 text-sm ${muted}`}>Pagamento via Pix com confirmação automática</p>
          </div>

          <label className="mt-7 block">
            <span className={`text-xs font-black uppercase tracking-wide ${subtle}`}>Valor do pagamento</span>
            <div className="relative mt-2">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black ${muted}`}>R$</span>
              <input
                inputMode="decimal"
                value={value}
                onChange={event => setValue(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && parsed > 0) void submitAmount(parsed); }}
                placeholder="0,00"
                autoFocus={!initialAmount}
                className={`w-full rounded-xl border py-4 pl-12 pr-4 text-xl font-black outline-none focus:border-emerald-400/60 ${input}`}
              />
            </div>
          </label>

          {error ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

          <button
            type="button"
            onClick={() => void submitAmount(parsed)}
            disabled={loading || parsed <= 0}
            className="mt-5 w-full rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? 'Preparando Pix…' : 'Pagar com Pix'}
          </button>

          <div className={`mt-5 rounded-xl border p-3 text-xs leading-5 ${dark ? 'border-white/8 bg-black/10 text-white/40' : 'border-black/5 bg-slate-50 text-slate-400'}`}>
            O dinheiro vai direto para a chave Pix do recebedor. A PixWiki apenas identifica o recebimento e confirma o pagamento.
          </div>

          <footer className={`mt-6 text-center text-[11px] ${subtle}`}>PixWiki · Desenvolvido por BigCorps · Tecnologia minhAi</footer>
        </section>
      </div>
    </main>
  );
}
