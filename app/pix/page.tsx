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

const FAQ = [
  ['O dinheiro passa pela PixWiki?', 'Não. O dinheiro continua indo diretamente para a conta Mercado Pago conectada. A PixWiki atua na confirmação, automação e conciliação.'],
  ['Preciso escolher um plano para testar?', 'Não. Você começa grátis, conecta sua conta, faz um Pix real para você mesmo e pode testar Link, Checkout e API antes de decidir.'],
  ['A PixWiki cobra percentual sobre a venda?', 'Não. A PixWiki não fica com uma porcentagem do valor vendido. Eventuais tarifas do Mercado Pago ou da instituição financeira são independentes da PixWiki.'],
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
    // Mantém uma marca simples para fluxos antigos saberem que existe cadastro pendente.
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
            <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">0% de taxa PixWiki sobre o valor recebido</div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">A infraestrutura Pix da <span className="text-emerald-400">sua empresa.</span></h1>
            <p className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${muted}`}>Conecte seu Mercado Pago, acompanhe Pix recebidos na sua própria chave e automatize Link, Checkout, API e notificações. O dinheiro continua direto na sua conta.</p>
            <div className={`mt-7 grid max-w-2xl gap-2 text-sm sm:grid-cols-2 ${muted}`}>
              <p>✓ 100 automações por mês para começar</p><p>✓ Push e dashboard para Pix direto</p><p>✓ Checkout e API antes de contratar</p><p>✓ Sem percentual da PixWiki sobre a venda</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3"><a href={pixPath('/calculadora')} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-300">Calcular minha economia</a><button onClick={()=>document.getElementById('comecar')?.scrollIntoView({behavior:'smooth'})} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950">Testar grátis</button></div>
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

      <section className={`border-y ${dark?'border-white/5 bg-white/[0.02]':'border-black/5 bg-white'}`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Ativação em minutos</p>
          <h2 className="mt-2 text-3xl font-black">Não explicamos apenas. Você vê funcionando.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[['1','Conecte o Mercado Pago','Autorize sua própria conta. A PixWiki não recebe nem guarda seu dinheiro.'],['2','Faça um Pix real','Envie um pequeno Pix para sua chave usando outra conta e veja a confirmação aparecer.'],['3','Teste as automações','Crie Link, Checkout e até uma chamada de API de teste antes de contratar.']].map(([n,t,d])=><article key={n} className={`rounded-3xl border p-6 ${card}`}><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 font-black text-slate-950">{n}</div><h3 className="mt-5 text-lg font-black">{t}</h3><p className={`mt-2 text-sm leading-relaxed ${muted}`}>{d}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Planos V2</p><h2 className="mt-2 text-3xl font-black">Pague pela automação, não pelo dinheiro que recebe.</h2><p className={`mx-auto mt-3 max-w-2xl ${muted}`}>Todas as faixas usam o mesmo produto. O que muda é a quantidade de automações incluídas e o preço do excedente.</p></div>
        <div className="mt-8 grid gap-4 lg:grid-cols-4">{PLANS.map(plan=><article key={plan.key} className={`rounded-3xl border p-5 ${plan.key==='pro'?'border-emerald-500/35 bg-emerald-500/[0.06]':card}`}><p className="text-xs font-black text-emerald-400">{plan.name}</p><p className="mt-3 text-2xl font-black">{plan.price}</p>{plan.annual && <p className={`mt-1 text-xs font-bold ${faint}`}>{plan.annual} · equivalente a 10 mensalidades</p>}<p className={`mt-4 text-sm ${muted}`}>{plan.quota}</p><p className={`mt-1 text-xs ${faint}`}>{plan.overage}</p><button onClick={()=>document.getElementById('comecar')?.scrollIntoView({behavior:'smooth'})} className="mt-5 w-full rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-black text-slate-950">Testar primeiro</button></article>)}</div>
        <p className={`mt-4 text-center text-xs ${faint}`}>Você pode controlar excedente e limite mensal. No fechamento, a proteção de faixa econômica evita cobrar mais do que uma faixa mensal mais vantajosa para o mesmo volume.</p>
        <div className="mt-5 text-center"><a href={pixPath('/calculadora')} className="inline-flex rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300">Comparar com a taxa que pago hoje →</a></div>
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
