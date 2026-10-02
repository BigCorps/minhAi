'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type CheckoutState = {
  checkout_id?: string;
  token?: string;
  origin?: 'pix_link' | 'checkout' | 'api' | string;
  status?: string;
  amount_cents?: number;
  expected_amount_cents?: number | null;
  discount_cents?: number;
  description?: string | null;
  expires_at?: string | null;
  payment_expires_at?: string | null;
  paid_at?: string | null;
  success_url?: string | null;
  pix_code?: string;
  qr_code_url?: string;
  queue_position?: number;
  retry_after_ms?: number;
  pending?: boolean;
  throttled?: boolean;
  error?: string;
  message?: string;
};

type Props = {
  token: string;
  company: Company;
  amountCents: number;
  description?: string | null;
  onRestart?: () => void;
};

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function brl(cents: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(cents || 0) / 100);
}

function publicErrorMessage(error?: string) {
  switch (error) {
    case 'checkout_not_found':
      return 'Esta cobrança não foi encontrada.';
    case 'checkout_expired':
      return 'Esta cobrança expirou.';
    case 'checkout_cancelled':
      return 'Esta cobrança foi cancelada.';
    case 'pix_key_required':
      return 'O recebedor ainda precisa concluir a configuração da chave Pix.';
    case 'mp_connection_required':
      return 'O recebedor ainda precisa concluir a conexão com o Mercado Pago.';
    case 'included_quota_exhausted':
    case 'spending_limit_reached':
    case 'billing_past_due':
      return 'Este Pix Link está temporariamente indisponível. O recebedor precisa revisar a franquia de automações.';
    case 'ambiguous_direct_payment':
      return 'Há mais de um recebimento compatível. A confirmação automática foi pausada por segurança.';
    default:
      return 'Não foi possível preparar este Pix agora. Tente novamente em alguns instantes.';
  }
}

async function invokeV2(action: string, body: Record<string, unknown>) {
  const response = await fetch(`${FUNCTIONS_URL}/pixwiki-v2-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ action, ...body }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data: data as CheckoutState };
}

export default function PixWikiV2PaymentPage({ token, company, amountCents, description, onRestart }: Props) {
  const [dark, setDark] = useState(true);
  const [state, setState] = useState<CheckoutState>({
    token,
    status: 'created',
    amount_cents: amountCents,
    description: description || null,
  });
  const [copied, setCopied] = useState(false);
  const [fatalError, setFatalError] = useState('');
  const [notice, setNotice] = useState('');
  const [manualChecking, setManualChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const prepareInFlight = useRef(false);
  const confirmInFlight = useRef(false);
  const queueTimer = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('publicTheme');
    if (saved === 'light' || saved === 'dark') setDark(saved === 'dark');
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  const toggleTheme = () => {
    setDark(current => {
      const next = !current;
      localStorage.setItem('publicTheme', next ? 'dark' : 'light');
      return next;
    });
  };

  const prepare = useCallback(async () => {
    if (prepareInFlight.current) return;
    prepareInFlight.current = true;
    setFatalError('');
    try {
      const result = await invokeV2('prepare', { token });
      const next = result.data || {};

      if (result.status === 202 && next.status === 'queued') {
        setState(previous => ({ ...previous, ...next, status: 'queued' }));
        const delay = Math.max(800, Math.min(4000, Number(next.retry_after_ms || 1500)));
        if (queueTimer.current !== null) window.clearTimeout(queueTimer.current);
        queueTimer.current = window.setTimeout(() => void prepare(), delay);
        return;
      }

      if (!result.ok) {
        if (result.status === 410) setState(previous => ({ ...previous, ...next }));
        setFatalError(publicErrorMessage(next.error));
        return;
      }

      setState(previous => ({ ...previous, ...next }));
    } catch {
      setFatalError('Não conseguimos falar com a PixWiki agora. Tente novamente.');
    } finally {
      prepareInFlight.current = false;
    }
  }, [token]);

  useEffect(() => {
    void prepare();
    return () => {
      if (queueTimer.current !== null) window.clearTimeout(queueTimer.current);
    };
  }, [prepare]);

  const confirm = useCallback(async (manual = false) => {
    if (confirmInFlight.current) return;
    confirmInFlight.current = true;
    if (manual) setManualChecking(true);
    try {
      const result = await invokeV2('confirm', { token });
      const next = result.data || {};
      if (result.status === 409 && next.error === 'ambiguous_direct_payment') {
        setNotice(publicErrorMessage(next.error));
        return;
      }
      if (!result.ok) return;
      setState(previous => ({ ...previous, ...next }));
      if (next.status === 'paid') setNotice('Pagamento identificado automaticamente.');
    } finally {
      confirmInFlight.current = false;
      if (manual) setManualChecking(false);
    }
  }, [token]);

  useEffect(() => {
    if (state.status !== 'payment_ready' && state.status !== 'slot_reserved') return;
    let cancelled = false;
    let timer: number | null = null;
    const started = Date.now();

    const schedule = (delay?: number) => {
      if (cancelled) return;
      const age = Date.now() - started;
      const next = delay ?? (age < 60_000 ? 2000 : age < 5 * 60_000 ? 4000 : 7000);
      timer = window.setTimeout(run, next);
    };

    const run = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') {
        schedule();
        return;
      }
      const cycle = performance.now();
      await confirm(false);
      const elapsed = performance.now() - cycle;
      const age = Date.now() - started;
      const interval = age < 60_000 ? 2000 : age < 5 * 60_000 ? 4000 : 7000;
      schedule(Math.max(200, interval - elapsed));
    };

    const wake = () => {
      if (document.visibilityState === 'visible') schedule(150);
    };
    document.addEventListener('visibilitychange', wake);
    schedule(1000);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [confirm, state.status]);

  useEffect(() => {
    if (!state.payment_expires_at || state.status === 'paid') {
      setTimeLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((new Date(state.payment_expires_at!).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [state.payment_expires_at, state.status]);

  useEffect(() => {
    if (state.status !== 'payment_ready' || !state.payment_expires_at || timeLeft !== 0) return;
    const expiredAt = new Date(state.payment_expires_at).getTime();
    if (Number.isFinite(expiredAt) && expiredAt <= Date.now()) {
      setNotice('O QR expirou. Preparando um novo Pix automaticamente…');
      const timer = window.setTimeout(() => void prepare(), 500);
      return () => window.clearTimeout(timer);
    }
  }, [prepare, state.payment_expires_at, state.status, timeLeft]);

  useEffect(() => {
    if (state.status !== 'paid' || !state.success_url) return;
    const timer = window.setTimeout(() => window.location.assign(String(state.success_url)), 2500);
    return () => window.clearTimeout(timer);
  }, [state.status, state.success_url]);

  const effectiveCents = Number(state.expected_amount_cents ?? state.amount_cents ?? amountCents);
  const originalCents = Number(state.amount_cents ?? amountCents);
  const discountCents = Math.max(0, Number(state.discount_cents || 0));
  const qrUrl = useMemo(() => {
    const raw = state.qr_code_url || '';
    if (!raw || !raw.includes('/api/qrcode')) return raw;
    try {
      const url = new URL(raw, 'https://pix.wiki');
      url.searchParams.set('brand', 'pixwiki');
      return url.toString();
    } catch {
      return raw;
    }
  }, [state.qr_code_url]);

  async function copyCode() {
    if (!state.pix_code) return;
    await navigator.clipboard.writeText(state.pix_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const page = dark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900';
  const card = dark ? 'border-white/10 bg-white/[0.045]' : 'border-black/10 bg-white shadow-xl shadow-slate-200/40';
  const muted = dark ? 'text-white/55' : 'text-slate-500';
  const subtle = dark ? 'text-white/35' : 'text-slate-400';
  const inner = dark ? 'border-white/10 bg-black/15' : 'border-black/10 bg-slate-50';

  const merchantHeader = (
    <div className="text-center">
      {company.logo_url ? (
        <img src={company.logo_url} alt={company.name} className="mx-auto mb-3 max-h-16 max-w-44 object-contain" />
      ) : (
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-black text-slate-950">
          {company.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <h1 className="text-xl font-black">{company.name}</h1>
      {description ? <p className={`mt-1 text-sm ${muted}`}>{description}</p> : null}
    </div>
  );

  if (state.status === 'paid') {
    return (
      <main className={`min-h-screen px-4 py-10 ${page}`}>
        <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border ${dark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
          <section className={`w-full rounded-[28px] border p-7 text-center ${card}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-400">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="mt-5 text-2xl font-black">Pagamento confirmado!</h2>
            <p className={`mt-2 text-sm ${muted}`}>{company.name}</p>
            <p className="mt-2 text-3xl font-black text-emerald-400">{brl(effectiveCents)}</p>
            {discountCents > 0 ? <p className={`mt-2 text-xs ${subtle}`}>Valor original {brl(originalCents)} · desconto por conveniência {brl(discountCents)}</p> : null}
            {state.success_url ? (
              <button type="button" onClick={() => window.location.assign(String(state.success_url))} className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950">Continuar</button>
            ) : null}
            {onRestart ? <button type="button" onClick={onRestart} className={`mt-4 text-xs font-bold ${muted}`}>Fazer outro Pix</button> : null}
          </section>
        </div>
      </main>
    );
  }

  if (state.status === 'queued' && !fatalError) {
    return (
      <main className={`min-h-screen px-4 py-10 ${page}`}>
        <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border ${dark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
          <section className={`w-full rounded-[28px] border p-7 text-center ${card}`}>
            {merchantHeader}
            <div className="mx-auto mt-8 h-11 w-11 animate-spin rounded-full border-4 border-emerald-500/15 border-t-emerald-400" />
            <h2 className="mt-5 text-xl font-black">Preparando seu Pix…</h2>
            <p className={`mt-2 text-sm leading-6 ${muted}`}>Estamos organizando pagamentos deste mesmo valor. Seu QR Code aparecerá automaticamente assim que houver uma combinação disponível.</p>
            {Number(state.queue_position || 0) > 1 ? <p className={`mt-3 text-xs ${subtle}`}>Posição atual: {state.queue_position}</p> : null}
            <div className={`mt-5 rounded-2xl border p-4 ${inner}`}>
              <div className="flex items-center justify-between text-sm"><span className={muted}>Valor</span><strong>{brl(originalCents)}</strong></div>
            </div>
            <p className={`mt-5 text-xs ${subtle}`}>Não feche esta página. A atualização é automática.</p>
          </section>
        </div>
      </main>
    );
  }

  if (fatalError) {
    return (
      <main className={`min-h-screen px-4 py-10 ${page}`}>
        <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border ${dark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
          <section className={`w-full rounded-[28px] border p-7 text-center ${card}`}>
            {merchantHeader}
            <div className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-2xl text-amber-400">!</div>
            <h2 className="mt-4 text-xl font-black">Não conseguimos gerar o Pix</h2>
            <p className={`mt-2 text-sm leading-6 ${muted}`}>{fatalError}</p>
            <button type="button" onClick={() => void prepare()} className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950">Tentar novamente</button>
            {onRestart ? <button type="button" onClick={onRestart} className={`mt-4 text-xs font-bold ${muted}`}>Voltar e informar outro valor</button> : null}
          </section>
        </div>
      </main>
    );
  }

  if (!state.pix_code || !qrUrl) {
    return (
      <main className={`min-h-screen px-4 py-10 ${page}`}>
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/15 border-t-emerald-400" />
            <p className={`mt-4 text-sm ${muted}`}>Preparando pagamento…</p>
          </div>
        </div>
      </main>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <main className={`min-h-screen px-4 py-8 ${page}`}>
      <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className={`fixed right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border ${dark ? 'border-white/15 bg-white/10' : 'border-black/10 bg-black/5'}`}>◐</button>
      <div className="mx-auto w-full max-w-2xl">
        {merchantHeader}
        <p className={`mt-2 text-center text-sm ${muted}`}>Pagamento de <strong className="text-emerald-400">{brl(effectiveCents)}</strong></p>

        {discountCents > 0 ? (
          <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between gap-3 text-sm"><span className={muted}>Valor original</span><span>{brl(originalCents)}</span></div>
            <div className="mt-1 flex items-center justify-between gap-3 text-sm"><span className="text-emerald-400">Desconto por conveniência PixWiki</span><strong className="text-emerald-400">− {brl(discountCents)}</strong></div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-emerald-500/20 pt-3"><strong>Pagar</strong><span className="text-2xl font-black text-emerald-400">{brl(effectiveCents)}</span></div>
          </div>
        ) : null}

        {notice ? <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-center text-xs text-sky-300">{notice}</div> : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className={`rounded-3xl border p-5 ${card}`}>
            <div className="flex items-center justify-between gap-3"><h2 className="font-black">1. Pix Copia e Cola</h2><span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-400">AGUARDANDO</span></div>
            <div className={`mt-4 rounded-2xl border p-4 ${inner}`}>
              <div className="flex justify-between gap-3 text-sm"><span className={muted}>Recebedor</span><strong className="text-right">{company.name}</strong></div>
              <div className="mt-2 flex justify-between gap-3 text-sm"><span className={muted}>Confirmação</span><strong className="text-right">Automática pela PixWiki</strong></div>
              <div className="mt-2 flex justify-between gap-3 text-sm"><span className={muted}>QR atual</span><strong className={timeLeft <= 20 ? 'text-amber-400' : 'text-emerald-400'}>{minutes}:{seconds}</strong></div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><strong>Total</strong><span className="text-xl font-black text-emerald-400">{brl(effectiveCents)}</span></div>
            </div>
            <button type="button" onClick={copyCode} className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-black text-white ${copied ? 'bg-emerald-500' : 'bg-blue-600'}`}>{copied ? 'Código copiado!' : 'Copiar código Pix'}</button>
            <button type="button" onClick={() => void confirm(true)} disabled={manualChecking} className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50 ${dark ? 'border-white/15 text-white/75' : 'border-slate-300 text-slate-600'}`}>{manualChecking ? 'Verificando…' : 'Já paguei, verificar agora'}</button>
          </section>

          <section className={`rounded-3xl border p-5 text-center ${card}`}>
            <h2 className="text-left font-black">2. Escaneie o QR Code</h2>
            <div className="mx-auto mt-5 max-w-[230px] rounded-2xl bg-white p-4"><img src={qrUrl} alt="QR Code Pix" className="h-auto w-full" /></div>
            <div className={`mx-auto mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-black ${timeLeft <= 20 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>QR válido por {minutes}:{seconds}</div>
            <p className={`mt-4 text-xs leading-5 ${muted}`}>O dinheiro vai direto para a chave Pix do recebedor. A PixWiki identifica o recebimento pela conta Mercado Pago conectada e confirma esta tela automaticamente.</p>
          </section>
        </div>

        <footer className={`py-8 text-center text-[11px] leading-5 ${subtle}`}>
          A PixWiki não mantém saldo nem recebe o dinheiro da venda. O pagamento é enviado diretamente ao recebedor.<br />
          PixWiki · Desenvolvido por BigCorps · Tecnologia minhAi
        </footer>
      </div>
    </main>
  );
}
