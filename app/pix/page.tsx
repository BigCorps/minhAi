'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';

type Step = 'landing' | 'auth' | 'creating';

type SignupForm = {
  nome: string;
  email: string;
  whatsapp: string;
  logo: string;
};

type LoggedCompany = { id: string; name: string; slug: string };

const PLANS = [
  { key: 'free', name: 'PIX GRÁTIS', price: 'R$ 0', annual: null, quota: '100 automações/mês', overage: 'R$ 0,79 excedente' },
  { key: 'link', name: 'PIX LINK', price: 'R$ 490/mês', annual: 'R$ 4.900/ano', quota: '1.000 automações/mês', overage: 'R$ 0,49 excedente' },
  { key: 'pro', name: 'PIX PRO', price: 'R$ 2.900/mês', annual: 'R$ 29.000/ano', quota: '10.000 automações/mês', overage: 'R$ 0,29 excedente' },
  { key: 'vip', name: 'PIX VIP', price: 'R$ 19.000/mês', annual: 'R$ 190.000/ano', quota: '100.000 automações/mês', overage: 'R$ 0,19 excedente' },
] as const;

const MARKET_FEES = [
  { key: 'mercado_pago', name: 'Mercado Pago', detail: 'Pix no Checkout online', display: '0,99%', feeType: 'percent', feeValue: 0.99 },
  { key: 'pagbank', name: 'PagBank', detail: 'Pix em vendas online', display: '1,89%', feeType: 'percent', feeValue: 1.89 },
  { key: 'woovi_percent', name: 'Woovi', detail: 'Plano percentual', display: '0,80%', feeType: 'percent', feeValue: 0.8, minCents: 50, maxCents: 500 },
  { key: 'asaas', name: 'Asaas', detail: 'Pix · tarifa padrão', display: 'R$ 1,99', feeType: 'fixed', feeValue: 1.99, note: 'Oferta pública: R$ 0,99 nos 3 primeiros meses' },
] as const;

const LANDING_CALC_OPTIONS = [
  ...MARKET_FEES,
  { key: 'free_pix', name: 'Já recebo por chave Pix', detail: 'Não pago taxa hoje', display: 'R$ 0', feeType: 'free', feeValue: 0 },
] as const;

const CALC_PLANS = [
  { key: 'free', name: 'PIX GRÁTIS', included: 100, baseCents: 0, overageCents: 79 },
  { key: 'link', name: 'PIX LINK', included: 1000, baseCents: 49000, overageCents: 49 },
  { key: 'pro', name: 'PIX PRO', included: 10000, baseCents: 290000, overageCents: 29 },
  { key: 'vip', name: 'PIX VIP', included: 100000, baseCents: 1900000, overageCents: 19 },
] as const;

const FAQ = [
  ['O dinheiro passa pela PixWiki?', 'Não. O dinheiro continua indo diretamente para a conta Mercado Pago conectada. A PixWiki atua na confirmação, automação e conciliação.'],
  ['Preciso escolher um plano para testar?', 'Não. Você começa grátis, conecta sua conta, faz um Pix real para você mesmo e pode testar Link, Checkout e API antes de decidir.'],
  ['A PixWiki cobra percentual sobre a venda?', 'Não. A PixWiki usa sua própria chave Pix como base do recebimento e cobra pelas automações utilizadas, não uma porcentagem do valor vendido. O Mercado Pago é usado para identificar e conciliar os recebimentos. Condições específicas da sua conta podem variar.'],
  ['Mas o Mercado Pago não cobra pelo Pix?', 'O Mercado Pago informa recebimentos por chave Pix sem taxa na Conta Negócio, enquanto o Pix no Checkout online é publicado com tarifa. A proposta da PixWiki é manter a sua chave como base do recebimento e acrescentar Checkout, API e automação sem descontar uma porcentagem de cada venda.'],
  ['O Push continua grátis?', 'Sim. Recebimentos pela sua própria chave podem continuar aparecendo no dashboard e gerar Push sem consumir automação paga.'],
  ['O que conta como uma Automação PixWiki?', 'Um pagamento identificado que aciona recursos pagos — como e-mail, WhatsApp, webhook, Pix Link, Checkout ou API — consome no máximo uma automação, mesmo quando mais de um canal é usado.'],
  ['Como funciona a faixa mais econômica?', 'No fechamento mensal, a PixWiki compara o custo da sua faixa com as demais faixas mensais. Se outra faixa resultar em custo menor para aquele volume, a cobrança usa o menor valor aplicável, sem mudar seu plano no meio do ciclo.'],
] as const;

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28);
}

function makeSlug(name: string) {
  const base = slugify(name) || 'pixwiki';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`.slice(0, 40);
}

function pixPath(path: string) {
  if (typeof window === 'undefined') return `/pix${path}`;
  const host = window.location.hostname.toLowerCase();
  return host === 'pix.wiki' || host === 'www.pix.wiki' ? path : `/pix${path}`;
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label="Alternar tema"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur hover:bg-white/10">
      {dark ? '☀' : '☾'}
    </button>
  );
}

export default function PixWikiPage() {
  const supabase = useMemo(() => createClient(), []);
  const pendingSlug = useRef('');
  const [dark, setDark] = useState(true);
  const [step, setStep] = useState<Step>('landing');
  const [loggedCompany, setLoggedCompany] = useState<LoggedCompany | null>(null);
  const [form, setForm] = useState<SignupForm>({ nome: '', email: '', whatsapp: '', logo: '' });
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [landingMonthlyPix, setLandingMonthlyPix] = useState('1000');
  const [landingTicket, setLandingTicket] = useState('200');
  const [landingProvider, setLandingProvider] = useState('mercado_pago');

  useEffect(() => {
    const saved = localStorage.getItem('publicTheme');
    if (saved === 'light' || saved === 'dark') setDark(saved === 'dark');
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || cancelled) return;
      const { data: companies } = await supabase.rpc('pixwiki_list_my_companies');
      if (!Array.isArray(companies) || !companies.length || cancelled) return;
      const c: any = companies.find((x: any) => x.is_primary) || companies[0];
      setLoggedCompany({ id: c.id, name: c.name, slug: c.slug });
    });
    return () => { cancelled = true; };
  }, [supabase]);

  const page = dark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900';
  const card = dark ? 'border-white/10 bg-white/[0.035]' : 'border-black/10 bg-white shadow-sm';
  const muted = dark ? 'text-white/60' : 'text-slate-600';
  const faint = dark ? 'text-white/40' : 'text-slate-500';
  const input = dark ? 'border-white/10 bg-white/[0.055] text-white placeholder:text-white/25' : 'border-black/10 bg-white text-slate-900 placeholder:text-slate-400';

  function toggleTheme() {
    setDark(v => {
      const next = !v;
      localStorage.setItem('publicTheme', next ? 'dark' : 'light');
      return next;
    });
  }

  function savePending(emailOverride?: string) {
    const slug = pendingSlug.current || makeSlug(form.nome);
    pendingSlug.current = slug;
    const payload = {
      slug,
      nome: form.nome.trim(),
      email: (emailOverride || form.email || authEmail).trim() || null,
      wa: form.whatsapp.replace(/\D/g, '').slice(0, 15) || null,
      logo: form.logo.trim() || null,
      version: 2,
    };
    localStorage.setItem('pixWikiPendingSignupV2', JSON.stringify(payload));
    localStorage.removeItem('pixWikiPendingSignup');
    return payload;
  }

  function beginSignup() {
    setError(''); setNotice('');
    if (form.nome.trim().length < 2) return setError('Informe o nome da empresa ou recebedor.');
    if (form.email && !form.email.includes('@')) return setError('Confira o e-mail informado.');
    pendingSlug.current = makeSlug(form.nome);
    if (form.email && !authEmail) setAuthEmail(form.email);
    savePending();
    setStep('auth');
    setTimeout(() => document.getElementById('criar-conta')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
  }

  async function goToOnboarding() {
    window.location.href = pixPath('/onboarding');
  }

  async function handleGoogle() {
    setError(''); setStep('creating');
    savePending();
    const next = pixPath('/onboarding');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (oauthError) { setError('Não foi possível entrar com Google agora.'); setStep('auth'); }
  }

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setError(''); setNotice('');
    if (!authEmail.includes('@') || authPassword.length < 6) return setError('Informe um e-mail válido e senha com pelo menos 6 caracteres.');
    setStep('creating');
    savePending(authEmail);
    try {
      const next = pixPath('/onboarding');
      const signup = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (!signup.error && signup.data.user && signup.data.session) { await goToOnboarding(); return; }
      if (!signup.error && signup.data.user && !signup.data.session) {
        setNotice('Conta criada. Confirme o e-mail; depois você volta direto para a configuração da PixWiki.');
        setStep('auth');
        return;
      }
      if (signup.error && !signup.error.message.toLowerCase().includes('already registered')) throw signup.error;
      const signin = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (signin.error || !signin.data.user) throw new Error('E-mail ou senha incorretos.');
      await goToOnboarding();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir seu cadastro.');
      setStep('auth');
    }
  }

  const landingComparison = useMemo(() => {
    const units = Math.max(0, Math.floor(Number(landingMonthlyPix.replace(/\D/g, '')) || 0));
    const cleanTicket = landingTicket.trim().replace(/\s/g, '');
    const ticketNumber = Number(cleanTicket.includes(',') ? cleanTicket.replace(/\./g, '').replace(',', '.') : cleanTicket) || 0;
    const ticketCents = Math.max(0, Math.round(ticketNumber * 100));
    const provider: any = LANDING_CALC_OPTIONS.find(item => item.key === landingProvider) || LANDING_CALC_OPTIONS[0];
    const plan = CALC_PLANS
      .map(item => ({ ...item, totalCents: item.baseCents + Math.max(units - item.included, 0) * item.overageCents }))
      .sort((a, b) => a.totalCents - b.totalCents)[0];

    let currentCostCents = 0;
    if (provider.feeType === 'percent') {
      let perPayment = Math.round(ticketCents * Number(provider.feeValue || 0) / 100);
      if (provider.minCents) perPayment = Math.max(perPayment, provider.minCents);
      if (provider.maxCents) perPayment = Math.min(perPayment, provider.maxCents);
      currentCostCents = perPayment * units;
    } else if (provider.feeType === 'fixed') {
      currentCostCents = Math.round(Number(provider.feeValue || 0) * 100) * units;
    }

    return { units, ticketCents, provider, plan, currentCostCents, savingsCents: currentCostCents - plan.totalCents };
  }, [landingMonthlyPix, landingTicket, landingProvider]);

  function brl(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  return (
    <main className={`min-h-screen transition-colors ${page}`}>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#020617]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="https://pix.wiki" className="flex items-center gap-2"><Image src="/brands/pix/pixwiki.png" alt="PixWiki" width={42} height={42} className="rounded-xl" priority /><b className="text-lg text-white">PixWiki</b></a>
          <div className="flex items-center gap-2"><a href={pixPath('/dashboard')} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/75">{loggedCompany ? 'Abrir painel' : 'Entrar'}</a><ThemeToggle dark={dark} onToggle={toggleTheme} /></div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[480px] max-w-5xl bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">Sua chave Pix + Checkout + automação</div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Transforme sua chave Pix em um Checkout completo, <span className="text-emerald-400">sem descontar porcentagem de cada venda.</span></h1>
            <p className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${muted}`}>Continue recebendo direto na sua própria conta Mercado Pago. A PixWiki acrescenta Link, Checkout, API, Webhooks, equipe e avisos por Push, E-mail e WhatsApp — cobrando pela automação, não pelo valor que você vende.</p>
            <div className={`mt-7 grid max-w-2xl gap-2 text-sm sm:grid-cols-2 ${muted}`}>
              <p>✓ Pix direto na sua própria chave</p><p>✓ Link e Checkout sem percentual PixWiki</p><p>✓ Push grátis para recebimentos diretos</p><p>✓ API e Webhooks para qualquer sistema</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3"><button onClick={()=>document.getElementById('taxas')?.scrollIntoView({behavior:'smooth'})} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-300">Ver quanto posso economizar</button><button onClick={()=>document.getElementById('comecar')?.scrollIntoView({behavior:'smooth'})} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950">Começar grátis</button></div>
          </div>

          <div id="comecar" className={`rounded-[28px] border p-5 sm:p-6 ${card}`}>
            {loggedCompany ? (
              <div className="py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl">✓</div>
                <h2 className="mt-4 text-xl font-black">Sua PixWiki já existe</h2>
                <p className={`mt-2 text-sm ${muted}`}>Continue a configuração guiada ou abra o dashboard de {loggedCompany.name}.</p>
                <a href={pixPath('/onboarding')} className="mt-5 flex w-full justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950">Continuar configuração</a>
                <a href={pixPath('/dashboard')} className={`mt-2 flex w-full justify-center rounded-xl border px-4 py-3 text-sm font-bold ${card}`}>Ir direto ao dashboard</a>
              </div>
            ) : step === 'creating' ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400"/><p className="font-bold">Preparando seu acesso…</p></div>
            ) : step === 'auth' ? (
              <div id="criar-conta">
                <button type="button" onClick={() => setStep('landing')} className={`text-xs font-bold ${faint}`}>← Voltar</button>
                <h2 className="mt-4 text-xl font-black">Crie sua conta grátis</h2>
                <p className={`mt-1 text-sm ${muted}`}>A próxima etapa conecta o Mercado Pago e mostra um Pix real chegando no dashboard.</p>
                <button onClick={handleGoogle} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continuar com Google</span>
                </button>
                <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-white/10"/><span className={`text-[10px] font-bold uppercase ${faint}`}>ou</span><div className="h-px flex-1 bg-white/10"/></div>
                <form onSubmit={handleEmail} className="space-y-3">
                  <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Seu e-mail" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} />
                  <input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Crie uma senha" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} />
                  <button type="submit" className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950">Criar conta grátis</button>
                </form>
                {(error||notice)&&<div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${error?'border-red-500/25 bg-red-500/10 text-red-300':'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{error||notice}</div>}
              </div>
            ) : (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Comece grátis</p>
                <h2 className="mt-2 text-xl font-black">Crie sua PixWiki</h2>
                <p className={`mt-1 text-sm ${muted}`}>Sem chave Pix agora. Primeiro criamos a conta; depois você conecta o Mercado Pago e vê tudo funcionando.</p>
                <div className="mt-5 space-y-4">
                  <label className="block"><span className={`text-xs font-bold ${muted}`}>Empresa ou recebedor</span><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex.: Loja Central" className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} /></label>
                  <details className={`rounded-xl border p-3 ${dark?'border-white/10':'border-black/10'}`}><summary className={`cursor-pointer text-xs font-bold ${muted}`}>Contato e logo (opcional)</summary><div className="mt-3 space-y-3"><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="E-mail para avisos" className={`w-full rounded-xl border px-4 py-3 text-sm ${input}`} /><input value={form.whatsapp} onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))} placeholder="WhatsApp" inputMode="tel" className={`w-full rounded-xl border px-4 py-3 text-sm ${input}`} /><input type="url" value={form.logo} onChange={e=>setForm(f=>({...f,logo:e.target.value}))} placeholder="URL do logo" className={`w-full rounded-xl border px-4 py-3 text-sm ${input}`} /></div></details>
                  {error&&<div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
                  <button onClick={beginSignup} className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950">Continuar grátis</button>
                  <p className={`text-center text-[11px] ${faint}`}>Você não precisa escolher plano nem informar dados de cobrança.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="taxas" className={`border-y ${dark?'border-white/5 bg-white/[0.02]':'border-black/5 bg-white'}`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Compare antes de escolher</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">O Pix pode ser grátis. O Checkout nem sempre é.</h2>
            <p className={`mx-auto mt-3 max-w-2xl text-sm leading-7 ${muted}`}>Receber pela sua chave Pix pode custar zero, mas plataformas de cobrança normalmente aplicam tarifa quando entram Checkout, QR dinâmico ou automação. A PixWiki faz o caminho inverso: mantém sua chave como base e cobra pelas automações.</p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MARKET_FEES.map(item => <article key={item.key} className={`rounded-3xl border p-5 ${card}`}><p className="text-sm font-black">{item.name}</p><p className={`mt-1 text-xs ${muted}`}>{item.detail}</p><p className="mt-5 text-3xl font-black">{item.display}</p>{'note' in item && item.note ? <p className={`mt-2 text-[11px] leading-5 ${faint}`}>{item.note}</p> : null}{'minCents' in item && item.minCents ? <p className={`mt-2 text-[11px] leading-5 ${faint}`}>mín. R$ 0,50 · máx. R$ 5,00 por Pix</p> : null}</article>)}
          </div>
          <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div><p className="font-black text-emerald-300">No próprio Mercado Pago, receber por chave Pix é informado como sem taxa.</p><p className={`mt-1 text-sm leading-6 ${muted}`}>A tarifa pública de 0,99% aparece no Pix do Checkout online. Com a PixWiki, sua própria chave continua sendo a base do recebimento; Mercado Pago entra para identificar e conciliar.</p></div>
            <div className="mt-4 shrink-0 rounded-2xl bg-emerald-500 px-5 py-3 text-center text-slate-950 sm:mt-0"><p className="text-[10px] font-black uppercase">PixWiki sobre a venda</p><p className="text-3xl font-black">0%</p></div>
          </div>
          <p className={`mt-4 text-center text-[11px] leading-5 ${faint}`}>Taxas públicas de referência consultadas em outubro de 2026. Condições, promoções e negociações comerciais podem variar por conta e produto.</p>

          <div id="calculadora" className={`mt-10 rounded-[30px] border p-5 sm:p-7 ${card}`}>
            <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">Faça a conta agora</p>
                <h3 className="mt-2 text-2xl font-black sm:text-3xl">Quanto uma tarifa por venda pesa no seu mês?</h3>
                <p className={`mt-2 text-sm leading-6 ${muted}`}>Escolha uma referência pública ou diga que já recebe sem taxa. A PixWiki compara o custo da automação sem fingir economia onde ela não existe.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <label><span className={`text-xs font-bold ${muted}`}>Pix recebidos por mês</span><input value={landingMonthlyPix} onChange={e=>setLandingMonthlyPix(e.target.value)} inputMode="numeric" className={`mt-1 w-full rounded-xl border px-4 py-3 outline-none ${input}`} /></label>
                  <label><span className={`text-xs font-bold ${muted}`}>Ticket médio (R$)</span><input value={landingTicket} onChange={e=>setLandingTicket(e.target.value)} inputMode="decimal" className={`mt-1 w-full rounded-xl border px-4 py-3 outline-none ${input}`} /></label>
                </div>
                <p className={`mt-4 text-xs font-bold ${muted}`}>Como você recebe hoje?</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {LANDING_CALC_OPTIONS.map(item=><button key={item.key} type="button" onClick={()=>setLandingProvider(item.key)} className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${landingProvider===item.key?'border-emerald-500/40 bg-emerald-500/10 text-emerald-300':dark?'border-white/10 hover:bg-white/5':'border-black/10 hover:bg-slate-50'}`}><span className="font-black">{item.name}</span><span className={`ml-1 ${landingProvider===item.key?'text-emerald-300/75':faint}`}>· {item.detail}</span></button>)}
                </div>
                <a href={pixPath('/calculadora')} className="mt-4 inline-flex text-xs font-black text-emerald-400 hover:underline">Abrir calculadora completa e editar minha taxa →</a>
              </div>
              <div>
                {landingComparison.provider.feeType === 'free' ? (
                  <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.08] p-6">
                    <p className="text-xs font-black uppercase tracking-[.14em] text-emerald-300">Você já recebe Pix sem tarifa? Ótimo.</p>
                    <h3 className="mt-2 text-2xl font-black">Não troque taxa zero por outra taxa.</h3>
                    <p className={`mt-3 text-sm leading-7 ${muted}`}>Use a PixWiki para adicionar o que normalmente falta no Pix por chave: Checkout, Link, API, Webhooks, conciliação, equipe e notificações por Push, E-mail e WhatsApp.</p>
                    <p className="mt-4 text-sm font-bold text-emerald-300">Confira apenas se sua solução atual também mantém custo zero quando entram Pix dinâmico, Checkout e integrações.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className={`rounded-2xl border p-4 ${card}`}><p className={`text-xs ${muted}`}>Volume estimado</p><p className="mt-2 text-xl font-black">{brl(landingComparison.units * landingComparison.ticketCents)}</p></div>
                      <div className={`rounded-2xl border p-4 ${card}`}><p className={`text-xs ${muted}`}>Tarifa atual estimada</p><p className="mt-2 text-xl font-black">{brl(landingComparison.currentCostCents)}</p></div>
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4"><p className="text-xs text-emerald-300">Melhor faixa PixWiki</p><p className="mt-2 text-xl font-black text-emerald-300">{brl(landingComparison.plan.totalCents)}</p></div>
                    </div>
                    <div className={`mt-4 rounded-2xl border p-5 ${landingComparison.savingsCents>0?'border-emerald-500/30 bg-emerald-500/10':card}`}>
                      <p className="text-sm font-black">{landingComparison.savingsCents>0?`Economia estimada: ${brl(landingComparison.savingsCents)} por mês`:'O diferencial aqui é a automação, não prometer uma economia artificial.'}</p>
                      <p className={`mt-2 text-xs leading-5 ${muted}`}>A PixWiki não desconta percentual de cada venda. O custo mostrado é pela faixa de automações para o volume informado.</p>
                    </div>
                  </>
                )}
                <button onClick={()=>document.getElementById('comecar')?.scrollIntoView({behavior:'smooth'})} className="mt-5 w-full rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-slate-950">Começar grátis e testar com um Pix real</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Uma infraestrutura, muitos tamanhos</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Do pequeno empreendedor ao grande marketplace.</h2><p className={`mx-auto mt-3 max-w-2xl text-sm leading-7 ${muted}`}>Você pode começar enviando um link pelo WhatsApp e crescer até uma integração completa por API. A mesma PixWiki acompanha a operação.</p></div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            ['Pequeno empreendedor','Envie um Pix Link, receba direto na sua conta e saiba na hora quando o cliente pagar.'],
            ['Loja e e-commerce','Use Checkout Pix, identifique pedidos automaticamente e pare de conferir comprovante manualmente.'],
            ['Desenvolvedor','API, Webhooks, external_id, metadata e idempotência para integrar ao seu próprio sistema.'],
            ['Sistema criado com IA','Está construindo com ChatGPT, Claude, Cursor ou outro agente? Adicione cobrança Pix sem criar uma infraestrutura financeira do zero.'],
            ['Empresas, ERPs e operações','Conciliação, equipe, área Caixa e milhares de recebimentos mensais no mesmo fluxo.'],
            ['Marketplaces e alto volume','Quando o faturamento cresce, uma porcentagem de cada venda cresce junto. A PixWiki escala cobrando pela automação.'],
          ].map(([title,desc])=><article key={title} className={`rounded-3xl border p-6 ${card}`}><h3 className="text-lg font-black">{title}</h3><p className={`mt-2 text-sm leading-6 ${muted}`}>{desc}</p></article>)}
        </div>
        <div className="mt-6 rounded-3xl bg-emerald-500 p-6 text-slate-950 sm:flex sm:items-center sm:justify-between sm:gap-6"><div><p className="text-2xl font-black">R$ 50 ou R$ 500 mil: porcentagem cresce com a venda.</p><p className="mt-1 text-sm font-semibold">Na PixWiki, você paga pela automação que usa — não uma fatia do seu faturamento.</p></div><button onClick={()=>document.getElementById('comecar')?.scrollIntoView({behavior:'smooth'})} className="mt-4 shrink-0 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white sm:mt-0">Testar agora</button></div>
      </section>

      <section className={`border-y ${dark?'border-white/5 bg-white/[0.02]':'border-black/5 bg-white'}`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Ativação em minutos</p>
          <h2 className="mt-2 text-3xl font-black">Você vê o primeiro pagamento funcionando antes de decidir.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[['1','Conecte sua conta','Autorize seu Mercado Pago. O dinheiro continua chegando diretamente para você.'],['2','Use sua própria chave Pix','Faça um Pix real e veja a confirmação aparecer no dashboard em tempo real.'],['3','Escolha até onde automatizar','Comece com Link e notificações. Quando precisar, avance para Checkout, API, Webhooks e equipe.']].map(([n,t,d])=><article key={n} className={`rounded-3xl border p-6 ${card}`}><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 font-black text-slate-950">{n}</div><h3 className="mt-5 text-lg font-black">{t}</h3><p className={`mt-2 text-sm leading-relaxed ${muted}`}>{d}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Planos V2</p><h2 className="mt-2 text-3xl font-black">Pague pela automação, não pelo dinheiro que recebe.</h2><p className={`mx-auto mt-3 max-w-2xl ${muted}`}>Todas as faixas usam o mesmo produto. O que muda é a quantidade de automações incluídas e o preço do excedente.</p></div>
        <div className="mt-8 grid gap-4 lg:grid-cols-4">{PLANS.map(plan=><article key={plan.key} className={`rounded-3xl border p-5 ${plan.key==='pro'?'border-emerald-500/35 bg-emerald-500/[0.06]':card}`}><p className="text-xs font-black text-emerald-400">{plan.name}</p><p className="mt-3 text-2xl font-black">{plan.price}</p>{plan.annual && <p className={`mt-1 text-xs font-bold ${faint}`}>{plan.annual} · equivalente a 10 mensalidades</p>}<p className={`mt-4 text-sm ${muted}`}>{plan.quota}</p><p className={`mt-1 text-xs ${faint}`}>{plan.overage}</p><button onClick={()=>document.getElementById('comecar')?.scrollIntoView({behavior:'smooth'})} className="mt-5 w-full rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-black text-slate-950">Testar primeiro</button></article>)}</div>
        <p className={`mt-4 text-center text-xs ${faint}`}>Você pode controlar excedente e limite mensal. No fechamento, a proteção de faixa econômica evita cobrar mais do que uma faixa mensal mais vantajosa para o mesmo volume.</p>
        <div className="mt-5 text-center"><a href={pixPath('/calculadora')} className="inline-flex rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300">Abrir calculadora completa →</a></div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className={`rounded-[32px] border p-6 sm:p-8 ${card}`}>
          <div className="grid gap-8 lg:grid-cols-[1fr_.9fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Infraestrutura, não carteira</p>
              <h2 className="mt-2 text-3xl font-black">Seu dinheiro não passa pela PixWiki.</h2>
              <p className={`mt-3 max-w-2xl text-sm leading-7 ${muted}`}>A conexão com o Mercado Pago serve para identificar e conciliar recebimentos. Tokens ficam no servidor, Checkouts usam identificadores opacos e Webhooks podem ser validados por assinatura HMAC.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {['Mercado Pago conectado por OAuth','Service role nunca enviado ao navegador','API com idempotência','Checkout público com token opaco','Webhook assinado','Papéis owner, manager e cashier'].map(item => <div key={item} className={`rounded-2xl border p-4 text-sm font-bold ${card}`}>✓ {item}</div>)}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={pixPath('/seguranca')} className="rounded-xl border border-emerald-500/25 px-4 py-2.5 text-xs font-black text-emerald-400">Segurança</a>
            <a href={pixPath('/docs')} className={`rounded-xl border px-4 py-2.5 text-xs font-black ${card}`}>Documentação da API</a>
          </div>
        </div>
      </section>

      <section className={`border-y ${dark?'border-white/5 bg-white/[0.02]':'border-black/5 bg-white'}`}><div className="mx-auto max-w-4xl px-4 py-16 sm:px-6"><h2 className="text-center text-3xl font-black">Dúvidas frequentes</h2><div className="mt-8 space-y-3">{FAQ.map(([q,a],i)=><details key={q} open={i===0} className={`rounded-2xl border p-5 ${card}`}><summary className="cursor-pointer list-none font-bold">{q}</summary><p className={`mt-3 text-sm leading-relaxed ${muted}`}>{a}</p></details>)}</div></div></section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6"><h2 className="text-3xl font-black">Seu primeiro Pix confirmado pela PixWiki pode ser o seu próprio teste.</h2><p className={`mx-auto mt-3 max-w-2xl ${muted}`}>Crie a conta, conecte o Mercado Pago e veja o dashboard ganhar vida antes de decidir qualquer plano.</p><button onClick={()=>document.getElementById('comecar')?.scrollIntoView({behavior:'smooth'})} className="mt-6 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950">Começar grátis</button></section>

    </main>
  );
}
