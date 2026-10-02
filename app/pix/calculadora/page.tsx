'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type FeeType = 'percent' | 'fixed' | 'free' | 'unknown';
type PlanKey = 'free' | 'link' | 'pro' | 'vip';

type Quote = {
  plan: PlanKey;
  plan_name: string;
  included_automations: number;
  base_price_cents: number;
  overage_units: number;
  overage_price_cents: number;
  total_price_cents: number;
  is_best_price: boolean;
};

type Catalog = {
  plan: PlanKey;
  name: string;
  rank: number;
  monthly_price_cents: number;
  annual_price_cents: number | null;
  included_automations: number;
  overage_price_cents: number;
};

type Result = {
  units: number;
  ticketCents: number;
  monthlyVolumeCents: number;
  currentCostCents: number;
  currentKnown: boolean;
  best: Quote;
  bestAnnual: {
    plan: PlanKey;
    name: string;
    totalAnnualCents: number;
    effectiveMonthlyCents: number;
  } | null;
};

function pixPath(path: string) {
  if (typeof window === 'undefined') return `/pix${path}`;
  const host = window.location.hostname.toLowerCase();
  return host === 'pix.wiki' || host === 'www.pix.wiki' ? path : `/pix${path}`;
}

function money(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function integer(value: string) {
  return Math.max(0, Math.floor(Number(value.replace(/\D/g, '')) || 0));
}

function decimal(value: string) {
  const clean = value.trim().replace(/\s/g, '');
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default function PixWikiCalculatorPage() {
  const supabase = useMemo(() => createClient(), []);
  const [dark, setDark] = useState(true);
  const [monthlyPix, setMonthlyPix] = useState('1000');
  const [ticket, setTicket] = useState('200');
  const [feeType, setFeeType] = useState<FeeType>('percent');
  const [feeValue, setFeeValue] = useState('1');
  const [catalog, setCatalog] = useState<Catalog[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('publicTheme');
    if (saved === 'light' || saved === 'dark') setDark(saved === 'dark');
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('pixwiki_v2_plan_catalog')
      .select('plan,name,rank,monthly_price_cents,annual_price_cents,included_automations,overage_price_cents')
      .eq('is_active', true)
      .order('rank')
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data)) setCatalog(data as Catalog[]);
      });
    return () => { cancelled = true; };
  }, [supabase]);

  const page = dark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900';
  const card = dark ? 'border-white/10 bg-white/[0.035]' : 'border-black/10 bg-white shadow-sm';
  const muted = dark ? 'text-white/60' : 'text-slate-600';
  const faint = dark ? 'text-white/40' : 'text-slate-500';
  const input = dark ? 'border-white/10 bg-white/[0.055] text-white' : 'border-black/10 bg-white text-slate-900';

  function toggleTheme() {
    setDark(value => {
      const next = !value;
      localStorage.setItem('publicTheme', next ? 'dark' : 'light');
      return next;
    });
  }

  async function calculate() {
    const units = integer(monthlyPix);
    const ticketCents = Math.round(decimal(ticket) * 100);
    const fee = decimal(feeValue);

    setError('');
    setResult(null);
    if (!units) return setError('Informe quantos Pix sua empresa recebe por mês.');
    if (!ticketCents) return setError('Informe o ticket médio aproximado.');
    if ((feeType === 'percent' || feeType === 'fixed') && !fee) return setError('Informe a taxa que você paga hoje.');

    setLoading(true);
    try {
      const [{ data: quotes, error: quoteError }, catalogResult] = await Promise.all([
        supabase.rpc('pixwiki_v2_quote_monthly_usage', { p_units: units }),
        catalog.length
          ? Promise.resolve({ data: catalog, error: null })
          : supabase
              .from('pixwiki_v2_plan_catalog')
              .select('plan,name,rank,monthly_price_cents,annual_price_cents,included_automations,overage_price_cents')
              .eq('is_active', true)
              .order('rank'),
      ]);

      if (quoteError || !Array.isArray(quotes) || !quotes.length) throw new Error('quote_unavailable');
      const rows = quotes as Quote[];
      const plans = (catalogResult.data || []) as Catalog[];
      if (!catalog.length && plans.length) setCatalog(plans);
      const best = rows.find(row => row.is_best_price) || rows[0];

      let currentCostCents = 0;
      let currentKnown = feeType !== 'unknown';
      if (feeType === 'percent') currentCostCents = Math.round(units * ticketCents * (fee / 100));
      else if (feeType === 'fixed') currentCostCents = Math.round(units * fee * 100);
      else if (feeType === 'free') currentCostCents = 0;
      else currentKnown = false;

      const annualCandidates = plans
        .map(plan => {
          const overageUnits = Math.max(units - plan.included_automations, 0);
          const annualBaseCents = plan.annual_price_cents ?? plan.monthly_price_cents * 12;
          const totalAnnualCents = annualBaseCents + overageUnits * plan.overage_price_cents * 12;
          return {
            plan: plan.plan,
            name: plan.name,
            totalAnnualCents,
            effectiveMonthlyCents: Math.round(totalAnnualCents / 12),
          };
        })
        .sort((a, b) => a.totalAnnualCents - b.totalAnnualCents);

      const next: Result = {
        units,
        ticketCents,
        monthlyVolumeCents: units * ticketCents,
        currentCostCents,
        currentKnown,
        best,
        bestAnnual: annualCandidates[0] || null,
      };
      setResult(next);

      const savings = currentKnown ? currentCostCents - Number(best.total_price_cents || 0) : 0;
      localStorage.setItem('pixWikiCalculatorLead', JSON.stringify({
        version: 1,
        monthlyPix: units,
        ticketCents,
        feeType,
        feeValue: fee,
        currentCostCents,
        pixwikiCostCents: Number(best.total_price_cents || 0),
        savingsCents: savings,
        interestedPlan: best.plan,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      setError('Não foi possível calcular agora. Tente novamente em alguns instantes.');
    } finally {
      setLoading(false);
    }
  }

  function startFree() {
    window.location.href = `${pixPath('/')}#comecar`;
  }

  const savings = result?.currentKnown ? result.currentCostCents - Number(result.best.total_price_cents || 0) : null;
  const annualSavings = result?.currentKnown && result.bestAnnual
    ? result.currentCostCents * 12 - result.bestAnnual.totalAnnualCents
    : null;

  return (
    <main className={`min-h-screen transition-colors ${page}`}>
      <header className="border-b border-white/5 bg-[#020617]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href={pixPath('/')} className="flex items-center gap-2">
            <Image src="/brands/pix/pixwiki.png" alt="PixWiki" width={42} height={42} className="rounded-xl" priority />
            <b className="text-lg text-white">PixWiki</b>
          </a>
          <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75">
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Calculadora PixWiki</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Quanto sua empresa gasta para receber Pix?</h1>
          <p className={`mt-4 max-w-2xl leading-7 ${muted}`}>
            Use a taxa que você realmente paga hoje. A comparação não depende de preço de concorrente e a PixWiki não cobra percentual sobre o valor recebido.
          </p>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className={`rounded-[28px] border p-5 sm:p-6 ${card}`}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <label>
                <span className={`text-xs font-bold ${muted}`}>Pix recebidos por mês</span>
                <input value={monthlyPix} onChange={e => setMonthlyPix(e.target.value)} inputMode="numeric" placeholder="1000" className={`mt-2 w-full rounded-xl border px-4 py-3.5 outline-none ${input}`} />
              </label>
              <label>
                <span className={`text-xs font-bold ${muted}`}>Ticket médio (R$)</span>
                <input value={ticket} onChange={e => setTicket(e.target.value)} inputMode="decimal" placeholder="200" className={`mt-2 w-full rounded-xl border px-4 py-3.5 outline-none ${input}`} />
              </label>
              <label>
                <span className={`text-xs font-bold ${muted}`}>Como você paga pelo Pix hoje?</span>
                <select value={feeType} onChange={e => setFeeType(e.target.value as FeeType)} className={`mt-2 w-full rounded-xl border px-4 py-3.5 outline-none ${input}`}>
                  <option value="percent">Percentual sobre cada Pix</option>
                  <option value="fixed">Valor fixo por Pix</option>
                  <option value="free">Não pago taxa</option>
                  <option value="unknown">Não sei minha taxa</option>
                </select>
              </label>
              {(feeType === 'percent' || feeType === 'fixed') && (
                <label>
                  <span className={`text-xs font-bold ${muted}`}>{feeType === 'percent' ? 'Taxa atual (%)' : 'Taxa atual por Pix (R$)'}</span>
                  <input value={feeValue} onChange={e => setFeeValue(e.target.value)} inputMode="decimal" placeholder={feeType === 'percent' ? '1,00' : '0,99'} className={`mt-2 w-full rounded-xl border px-4 py-3.5 outline-none ${input}`} />
                </label>
              )}
            </div>
            {error && <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
            <button onClick={() => void calculate()} disabled={loading} className="mt-5 w-full rounded-xl bg-emerald-500 px-5 py-3.5 font-black text-slate-950 disabled:opacity-50">
              {loading ? 'Calculando…' : 'Calcular minha economia'}
            </button>
            <p className={`mt-3 text-center text-[11px] leading-5 ${faint}`}>A estimativa usa apenas os dados que você informar. Tarifas bancárias e do Mercado Pago são independentes da PixWiki.</p>
          </div>

          <div className={`rounded-[28px] border p-5 sm:p-6 ${card}`}>
            {!result ? (
              <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
                <div className="text-5xl">↗</div>
                <h2 className="mt-5 text-2xl font-black">Veja a melhor faixa para o seu volume</h2>
                <p className={`mt-3 max-w-md text-sm leading-6 ${muted}`}>A PixWiki compara PIX GRÁTIS, LINK, PRO e VIP e mostra a faixa mensal mais econômica para a quantidade informada.</p>
              </div>
            ) : (
              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Volume Pix/mês" value={money(result.monthlyVolumeCents)} muted={muted} />
                  <Metric label="Quantidade" value={`${new Intl.NumberFormat('pt-BR').format(result.units)} Pix`} muted={muted} />
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                  <p className="text-xs font-bold uppercase tracking-[.12em] text-emerald-300">Faixa mensal mais econômica</p>
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black">{result.best.plan_name}</h2>
                      <p className={`mt-1 text-xs ${muted}`}>{new Intl.NumberFormat('pt-BR').format(result.best.included_automations)} automações incluídas · excedente {money(result.best.overage_price_cents)}/automação</p>
                    </div>
                    <p className="text-3xl font-black text-emerald-400">{money(Number(result.best.total_price_cents))}<span className="text-sm font-bold">/mês</span></p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Metric label="Custo atual estimado" value={result.currentKnown ? money(result.currentCostCents) : 'Não informado'} muted={muted} />
                  <Metric label="Economia mensal estimada" value={savings == null ? 'Informe sua taxa' : savings > 0 ? money(savings) : savings === 0 ? 'Sem diferença de taxa' : `PixWiki custa ${money(Math.abs(savings))} a mais`} muted={muted} highlight={savings != null && savings > 0} />
                </div>

                {feeType === 'free' && (
                  <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${card}`}>
                    Você informou que hoje não paga taxa Pix. Nesse caso não há economia de tarifa para prometer; o ganho da PixWiki é automação, conciliação, equipe, Link, Checkout, API e notificações.
                  </div>
                )}
                {feeType === 'unknown' && (
                  <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${card}`}>
                    A faixa PixWiki já está calculada. Quando você souber sua taxa atual, volte e informe para comparar a economia financeira.
                  </div>
                )}

                {result.bestAnnual && (
                  <div className={`mt-4 rounded-2xl border p-5 ${card}`}>
                    <p className={`text-xs font-bold uppercase tracking-[.12em] ${faint}`}>Melhor cenário anual para esse volume</p>
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                      <div><p className="text-lg font-black">{result.bestAnnual.name}</p><p className={`mt-1 text-xs ${muted}`}>Custo estimado de 12 meses mantendo o mesmo volume</p></div>
                      <div className="text-right"><p className="text-xl font-black">{money(result.bestAnnual.totalAnnualCents)}/ano</p><p className={`text-xs ${muted}`}>≈ {money(result.bestAnnual.effectiveMonthlyCents)}/mês</p></div>
                    </div>
                    {annualSavings != null && annualSavings > 0 && <p className="mt-3 text-sm font-bold text-emerald-400">Economia anual estimada vs. sua taxa atual: {money(annualSavings)}</p>}
                  </div>
                )}

                <button onClick={startFree} className="mt-5 w-full rounded-xl bg-emerald-500 px-5 py-3.5 font-black text-slate-950">Criar conta grátis e testar com um Pix real</button>
                <p className={`mt-2 text-center text-[11px] ${faint}`}>Os dados desta simulação ficam no navegador e são associados ao seu funil somente se você criar a conta.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, muted, highlight = false }: { label: string; value: string; muted: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <p className={`text-xs ${muted}`}>{label}</p>
      <p className={`mt-2 text-xl font-black ${highlight ? 'text-emerald-400' : ''}`}>{value}</p>
    </div>
  );
}
