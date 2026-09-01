'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

type Step = 'landing' | 'auth' | 'creating';
type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | '';

interface SignupForm {
  nomeRecebedor: string;
  chavePix: string;
  chavePixTipo: PixKeyType;
  emailContato: string;
  whatsapp: string;
  logoUrl: string;
}

interface LoggedCompany {
  id: string;
  name: string;
  slug: string;
}

const PLANS = [
  {
    key: 'free',
    name: 'Pix Grátis',
    price: 'R$ 0',
    suffix: '',
    description: 'Para acompanhar sua chave Pix sem pagar mensalidade.',
    features: ['Confirmação automática', 'Painel em tempo real', 'Histórico de recebimentos', 'Avisos por e-mail e Push'],
    highlight: false,
  },
  {
    key: 'link',
    name: 'Pix Link',
    price: 'R$ 29,90',
    suffix: '/mês',
    description: 'Para cobrar com um endereço profissional e valor pronto.',
    features: ['Tudo do Pix Grátis', 'seunome.pix.wiki', 'Link com valor preenchido', 'QR Code', 'Logo e identidade do recebedor'],
    highlight: true,
  },
  {
    key: 'pro',
    name: 'Pix Pro',
    price: 'R$ 99,90',
    suffix: '/mês',
    description: 'Para quem recebe mais e precisa organizar toda a operação.',
    features: ['Tudo do Pix Link', 'Avisos por WhatsApp', 'Várias empresas na mesma conta', 'Relatórios e exportação', 'Integrações com outros sistemas'],
    highlight: false,
  },
] as const;

const FAQ = [
  {
    q: 'O dinheiro fica no PixWiki?',
    a: 'Não. O dinheiro continua entrando diretamente na sua conta Mercado Pago. O PixWiki acompanha os recebimentos e organiza as confirmações para você.',
  },
  {
    q: 'O PixWiki cobra uma porcentagem de cada Pix?',
    a: 'Não. O PixWiki não cobra percentual por transação. Se o Mercado Pago aplicar alguma tarifa ao tipo de recebimento utilizado, o painel mostra diretamente o valor que efetivamente entrou.',
  },
  {
    q: 'Posso usar como pessoa física?',
    a: 'Sim. Você pode cadastrar o nome do recebedor e uma chave Pix da sua conta Mercado Pago, seja para uso pessoal, como autônomo, MEI ou empresa.',
  },
  {
    q: 'O cliente precisa instalar alguma coisa?',
    a: 'Não. Na Chave Pix ele paga normalmente pelo banco. No Pix Link, basta abrir a página, escanear o QR Code ou copiar o código Pix.',
  },
  {
    q: 'Como eu sei quando o Pix chegou?',
    a: 'O painel atualiza os recebimentos automaticamente. No Pix Grátis você também pode receber avisos por e-mail e Push. No Pix Pro, também pelo WhatsApp.',
  },
  {
    q: 'Qual a diferença entre Chave Pix e Pix Link?',
    a: 'Na Chave Pix o cliente informa a chave e o valor no banco. No Pix Link você envia uma página profissional com seu nome, QR Code e, se quiser, o valor já preenchido.',
  },
] as const;

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
}

function makeInternalSlug(name: string) {
  const base = slugify(name) || 'pixwiki';
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`.slice(0, 40);
}

function detectPixKeyType(value: string): PixKeyType {
  const clean = value.trim();
  const digits = clean.replace(/\D/g, '');
  if (clean.includes('@')) return 'email';
  if (/^[0-9a-fA-F-]{36}$/.test(clean)) return 'random';
  if (digits.length === 14) return 'cnpj';
  if (digits.length === 11 && !clean.startsWith('+') && !clean.includes('(')) return 'cpf';
  if (clean.startsWith('+') || clean.includes('(') || (digits.length >= 10 && digits.length <= 13)) return 'phone';
  return '';
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur transition hover:bg-white/10"
    >
      {dark ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

export default function PixWikiPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pendingSlug = useRef('');

  const [dark, setDark] = useState(true);
  const [step, setStep] = useState<Step>('landing');
  const [loggedCompany, setLoggedCompany] = useState<LoggedCompany | null>(null);
  const [form, setForm] = useState<SignupForm>({
    nomeRecebedor: '',
    chavePix: '',
    chavePixTipo: '',
    emailContato: '',
    whatsapp: '',
    logoUrl: '',
  });
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('publicTheme');
    if (saved === 'light' || saved === 'dark') {
      setDark(saved === 'dark');
      return;
    }
    setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || cancelled) return;
      const { data: companies } = await supabase.rpc('pixwiki_list_my_companies');
      if (cancelled || !Array.isArray(companies) || companies.length === 0) return;
      const preferred = companies.find((c: any) => c.is_primary) || companies[0];
      setLoggedCompany({ id: preferred.id, name: preferred.name, slug: preferred.slug });
    });
    return () => { cancelled = true; };
  }, [supabase]);

  const page = dark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900';
  const card = dark ? 'border-white/10 bg-white/[0.035]' : 'border-black/10 bg-white shadow-sm';
  const muted = dark ? 'text-white/60' : 'text-slate-600';
  const faint = dark ? 'text-white/40' : 'text-slate-500';
  const input = dark
    ? 'border-white/10 bg-white/[0.055] text-white placeholder:text-white/25'
    : 'border-black/10 bg-white text-slate-900 placeholder:text-slate-400';

  function toggleTheme() {
    setDark(current => {
      const next = !current;
      localStorage.setItem('publicTheme', next ? 'dark' : 'light');
      return next;
    });
  }

  function updateForm<K extends keyof SignupForm>(key: K, value: SignupForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function beginSignup() {
    setError('');
    setNotice('');
    if (form.nomeRecebedor.trim().length < 2) {
      setError('Informe o nome do recebedor.');
      return;
    }
    if (form.chavePix.trim().length < 5) {
      setError('Informe sua chave Pix do Mercado Pago.');
      return;
    }
    const type = form.chavePixTipo || detectPixKeyType(form.chavePix);
    if (!type) {
      setError('Não conseguimos identificar o tipo da chave Pix. Confira a chave digitada.');
      return;
    }
    updateForm('chavePixTipo', type);
    if (!pendingSlug.current) pendingSlug.current = makeInternalSlug(form.nomeRecebedor);
    if (form.emailContato && !authEmail) setAuthEmail(form.emailContato);
    setStep('auth');
    window.setTimeout(() => document.getElementById('criar-conta')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  async function createAfterAuth(userId: string) {
    const slug = pendingSlug.current || makeInternalSlug(form.nomeRecebedor);
    const keyType = form.chavePixTipo || detectPixKeyType(form.chavePix) || 'random';

    const { data: company, error: companyError } = await supabase.rpc('ensure_my_pix_wiki_company', {
      p_slug: slug,
      p_name: form.nomeRecebedor.trim(),
      p_logo_url: form.logoUrl.trim() || null,
      p_whatsapp: form.whatsapp.trim() || null,
      p_email: form.emailContato.trim() || authEmail || null,
    }).single();

    if (companyError || !company) throw new Error('Não foi possível criar seu cadastro PixWiki.');

    const [profileResult, paymentResult, notificationResult] = await Promise.all([
      supabase.from('user_profiles').upsert({
        user_id: userId,
        withdrawal_pix_key: form.chavePix.trim(),
        withdrawal_pix_key_type: keyType,
      }, { onConflict: 'user_id' }),
      supabase.from('pixwiki_payment_settings').upsert({
        company_id: company.id,
        user_id: userId,
        pix_key: form.chavePix.trim(),
        pix_key_type: keyType,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' }),
      supabase.from('pixwiki_notification_settings').upsert({
        company_id: company.id,
        user_id: userId,
        notification_email: form.emailContato.trim() || authEmail || null,
        email_enabled: true,
        push_enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' }),
    ]);

    const setupError = profileResult.error || paymentResult.error || notificationResult.error;
    if (setupError) throw setupError;

    await supabase.from('demo_sessions').insert({
      nome_negocio: form.nomeRecebedor.trim(),
      email: form.emailContato.trim() || authEmail || null,
      phone: form.whatsapp.trim() || null,
      origem_simples: 'pixwiki',
      linked_user_id: userId,
      linked_company_id: company.id,
      linked_at: new Date().toISOString(),
      status: 'converted',
    }).then(() => undefined, () => undefined);

    localStorage.setItem('pixWikiActiveCompanyId', company.id);
    router.replace(`/dashboard?bemvindo=1&company=${encodeURIComponent(company.id)}`);
  }

  async function handleGoogle() {
    setError('');
    setStep('creating');
    const slug = pendingSlug.current || makeInternalSlug(form.nomeRecebedor);
    pendingSlug.current = slug;
    localStorage.setItem('pixWikiPendingSignup', JSON.stringify({
      slug,
      nome: form.nomeRecebedor.trim(),
      pix: form.chavePix.trim(),
      pixTipo: form.chavePixTipo || detectPixKeyType(form.chavePix) || 'random',
      logo: form.logoUrl.trim() || null,
      doc: null,
      docTipo: null,
      wa: form.whatsapp.trim() || null,
      email: form.emailContato.trim() || authEmail || null,
    }));

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (oauthError) {
      setError('Não foi possível entrar com Google agora. Tente novamente.');
      setStep('auth');
    }
  }

  async function handleEmail(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!authEmail || authPassword.length < 6) {
      setError('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.');
      return;
    }

    setStep('creating');
    try {
      const signup = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (!signup.error && signup.data.user && signup.data.session) {
        await createAfterAuth(signup.data.user.id);
        return;
      }

      if (!signup.error && signup.data.user && !signup.data.session) {
        setNotice('Conta criada. Confira seu e-mail para confirmar o acesso e depois entre no PixWiki.');
        setStep('auth');
        return;
      }

      if (signup.error && !signup.error.message.toLowerCase().includes('already registered')) {
        throw signup.error;
      }

      const signin = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (signin.error || !signin.data.user) throw new Error('E-mail ou senha incorretos.');
      await createAfterAuth(signin.data.user.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir seu cadastro.');
      setStep('auth');
    }
  }

  return (
    <main className={`min-h-screen transition-colors ${page}`}>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#020617]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="https://pix.wiki" className="flex items-center gap-2" aria-label="PixWiki — início">
            <Image src="/brands/pix/pixwiki.png" alt="PixWiki" width={42} height={42} className="rounded-xl" priority />
            <span className="text-lg font-black tracking-tight text-white">PixWiki</span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/dashboard" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white">
              {loggedCompany ? 'Abrir painel' : 'Entrar'}
            </a>
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[420px] max-w-5xl bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              O dinheiro continua direto no seu Mercado Pago
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Receba Pix e saiba quando o dinheiro <span className="text-emerald-400">realmente chegou.</span>
            </h1>
            <p className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${muted}`}>
              Use sua própria chave Pix ou envie um Pix Link. O PixWiki acompanha os recebimentos, atualiza seu painel e avisa você — sem depender de print ou comprovante enviado pelo cliente.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => document.getElementById('comecar')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400">
                Criar Pix Grátis
              </button>
              <a href="#como-funciona" className={`rounded-xl border px-5 py-3 text-sm font-bold ${card}`}>Como funciona</a>
            </div>
            <div className={`mt-7 grid max-w-xl gap-2 text-sm sm:grid-cols-3 ${muted}`}>
              <p>✓ Sem mensalidade para começar</p>
              <p>✓ Sem percentual do PixWiki por transação</p>
              <p>✓ Pessoa física ou empresa</p>
            </div>
          </div>

          <div id="comecar" className={`rounded-[28px] border p-5 shadow-2xl shadow-emerald-950/10 sm:p-6 ${card}`}>
            {loggedCompany ? (
              <div className="py-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl">✓</div>
                <h2 className="mt-4 text-xl font-black">Sua conta já está pronta</h2>
                <p className={`mt-2 text-sm ${muted}`}>Acesse o painel de {loggedCompany.name} para acompanhar recebimentos e configurar seus avisos.</p>
                <a href="/dashboard" className="mt-5 inline-flex w-full justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950">Abrir meu painel</a>
              </div>
            ) : step === 'creating' ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
                <div>
                  <p className="font-bold">Preparando seu PixWiki…</p>
                  <p className={`mt-1 text-sm ${muted}`}>Só leva alguns segundos.</p>
                </div>
              </div>
            ) : step === 'auth' ? (
              <div id="criar-conta">
                <button type="button" onClick={() => setStep('landing')} className={`text-xs font-bold ${faint}`}>← Voltar</button>
                <h2 className="mt-4 text-xl font-black">Crie sua conta grátis</h2>
                <p className={`mt-1 text-sm ${muted}`}>Depois você conecta o Mercado Pago no painel e começa a acompanhar sua chave.</p>

                <button onClick={handleGoogle} className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 01-1.99 3.02v2.54h3.22c1.89-1.74 2.99-4.3 2.99-7.4z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.37l-3.22-2.54c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.08v2.62A9.99 9.99 0 0012 22z"/><path fill="#FBBC05" d="M6.41 13.93A6 6 0 016.1 12c0-.67.11-1.32.31-1.93V7.45H3.08A10 10 0 002 12c0 1.62.39 3.15 1.08 4.55l3.33-2.62z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.78.5 3.82 1.5l2.86-2.87C16.96 2.98 14.7 2 12 2a9.99 9.99 0 00-8.92 5.45l3.33 2.62C7.2 7.71 9.4 5.95 12 5.95z"/></svg>
                  Continuar com Google
                </button>

                <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-white/10"/><span className={`text-[10px] font-bold uppercase tracking-widest ${faint}`}>ou</span><div className="h-px flex-1 bg-white/10"/></div>

                <form onSubmit={handleEmail} className="space-y-3">
                  <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Seu e-mail" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-400/60 ${input}`} />
                  <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Crie uma senha" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-400/60 ${input}`} />
                  <button type="submit" className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950">Criar conta grátis</button>
                </form>
              </div>
            ) : (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Comece grátis</p>
                <h2 className="mt-2 text-xl font-black">Cadastre sua chave Pix</h2>
                <p className={`mt-1 text-sm ${muted}`}>Não precisa escolher plano agora. O Pix Grátis já inclui confirmação, painel, e-mail e Push.</p>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className={`text-xs font-bold ${muted}`}>Nome do recebedor</span>
                    <input value={form.nomeRecebedor} onChange={e => updateForm('nomeRecebedor', e.target.value)} placeholder="Ex.: Maria Silva ou Loja de Serviços" className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-400/60 ${input}`} />
                  </label>
                  <label className="block">
                    <span className={`text-xs font-bold ${muted}`}>Sua chave Pix do Mercado Pago</span>
                    <input value={form.chavePix} onChange={e => { updateForm('chavePix', e.target.value); updateForm('chavePixTipo', detectPixKeyType(e.target.value)); }} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" className={`mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-emerald-400/60 ${input}`} />
                  </label>

                  <details className={`rounded-xl border p-3 ${dark ? 'border-white/10' : 'border-black/10'}`}>
                    <summary className={`cursor-pointer list-none text-xs font-bold ${muted}`}>Adicionar contato e logo <span className={faint}>(opcional)</span></summary>
                    <div className="mt-3 space-y-3">
                      <input type="email" value={form.emailContato} onChange={e => updateForm('emailContato', e.target.value)} placeholder="E-mail para avisos" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} />
                      <input value={form.whatsapp} onChange={e => updateForm('whatsapp', e.target.value)} placeholder="WhatsApp" inputMode="tel" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} />
                      <input type="url" value={form.logoUrl} onChange={e => updateForm('logoUrl', e.target.value)} placeholder="Link do seu logo" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${input}`} />
                    </div>
                  </details>

                  {(error || notice) && <div className={`rounded-xl border px-3 py-2 text-xs ${error ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>{error || notice}</div>}
                  <button onClick={beginSignup} className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400">Continuar grátis</button>
                  <p className={`text-center text-[11px] leading-relaxed ${faint}`}>Depois do cadastro, conecte o Mercado Pago. O PixWiki não movimenta nem guarda seu dinheiro.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="como-funciona" className={`border-y ${dark ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-white'}`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Como funciona</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Seu Pix continua simples. A confirmação é que fica automática.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['1', 'Cadastre sua chave', 'Use uma chave Pix da sua conta Mercado Pago e escolha o nome que aparecerá no seu painel.'],
              ['2', 'Conecte o Mercado Pago', 'A conexão permite ao PixWiki acompanhar os recebimentos sem pedir acesso à sua senha bancária.'],
              ['3', 'Receba e acompanhe', 'Quando um Pix for identificado, o painel atualiza e você recebe os avisos que tiver ativado.'],
            ].map(([number, title, text]) => (
              <div key={number} className={`rounded-3xl border p-6 ${card}`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-sm font-black text-slate-950">{number}</div>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={`rounded-[30px] border p-6 sm:p-8 ${card}`}>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">CHAVE PIX</span>
            <h2 className="mt-4 text-2xl font-black">Para quem quer continuar cobrando pela própria chave.</h2>
            <p className={`mt-3 leading-relaxed ${muted}`}>O cliente paga como já está acostumado. O PixWiki organiza o histórico, mostra o valor que realmente entrou e avisa você quando o recebimento for identificado.</p>
            <div className={`mt-5 space-y-2 text-sm ${muted}`}><p>✓ Ideal para balcão e clientes recorrentes</p><p>✓ Pode começar no Pix Grátis</p><p>✓ Sem link obrigatório</p></div>
          </div>
          <div className={`rounded-[30px] border border-sky-500/25 bg-sky-500/[0.06] p-6 sm:p-8`}>
            <span className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-black text-sky-300">PIX LINK</span>
            <h2 className="mt-4 text-2xl font-black">Para enviar uma cobrança pronta e profissional.</h2>
            <p className={`mt-3 leading-relaxed ${muted}`}>Use um endereço como <strong className={dark ? 'text-white' : 'text-slate-900'}>sualoja.pix.wiki</strong>, com seu nome, QR Code e o valor já preenchido. Ótimo para WhatsApp, redes sociais e vendas à distância.</p>
            <div className={`mt-5 space-y-2 text-sm ${muted}`}><p>✓ Página com identidade do recebedor</p><p>✓ Link com ou sem valor</p><p>✓ Incluído no Pix Link e Pix Pro</p></div>
          </div>
        </div>
      </section>

      <section id="planos" className={`border-y ${dark ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-white'}`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Planos simples</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Comece grátis. Evolua quando precisar.</h2>
            <p className={`mt-3 ${muted}`}>O PixWiki cobra pelo serviço e pelos recursos do plano — não uma porcentagem de cada venda.</p>
          </div>
          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            {PLANS.map(plan => (
              <article key={plan.key} className={`relative rounded-[28px] border p-6 ${plan.highlight ? 'border-sky-400/40 bg-sky-500/[0.06]' : card}`}>
                {plan.highlight && <span className="absolute right-5 top-5 rounded-full bg-sky-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950">Mais popular</span>}
                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className={`mt-2 min-h-11 text-sm ${muted}`}>{plan.description}</p>
                <div className="mt-5 flex items-end gap-1"><strong className="text-3xl font-black">{plan.price}</strong><span className={`pb-1 text-xs ${muted}`}>{plan.suffix}</span></div>
                <div className={`mt-5 space-y-2 text-sm ${muted}`}>{plan.features.map(feature => <p key={feature}>✓ {feature}</p>)}</div>
                <button onClick={() => document.getElementById('comecar')?.scrollIntoView({ behavior: 'smooth' })} className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-black ${plan.key === 'pro' ? 'bg-emerald-500 text-slate-950' : plan.highlight ? 'bg-sky-400 text-slate-950' : dark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}>{plan.key === 'free' ? 'Começar grátis' : `Conhecer ${plan.name}`}</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Painel ao vivo', 'Os novos recebimentos aparecem automaticamente e você também pode tocar em Atualizar quando quiser.'],
            ['Avisos do seu jeito', 'E-mail e Push desde o grátis. WhatsApp no Pix Pro.'],
            ['Várias empresas', 'No Pix Pro, cada empresa pode ter sua própria conta Mercado Pago, chave e avisos.'],
            ['Relatórios', 'Veja períodos, valores recebidos e exporte seus dados no Pix Pro.'],
          ].map(([title, text]) => (
            <div key={title} className={`rounded-3xl border p-5 ${card}`}><h3 className="font-black">{title}</h3><p className={`mt-2 text-sm leading-relaxed ${muted}`}>{text}</p></div>
          ))}
        </div>
      </section>

      <section id="faq" className={`border-y ${dark ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-white'}`}>
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="text-center"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Dúvidas frequentes</p><h2 className="mt-2 text-3xl font-black">PixWiki, sem letra miúda.</h2></div>
          <div className="mt-8 space-y-3">
            {FAQ.map((item, index) => (
              <details key={item.q} open={index === 0} className={`group rounded-2xl border p-5 ${card}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold"><span>{item.q}</span><span className={`text-xl transition group-open:rotate-45 ${faint}`}>+</span></summary>
                <p className={`mt-3 max-w-3xl text-sm leading-relaxed ${muted}`}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-20">
        <h2 className="text-3xl font-black tracking-tight">Sua chave Pix já recebe. O PixWiki faz você acompanhar melhor.</h2>
        <p className={`mx-auto mt-3 max-w-2xl ${muted}`}>Crie sua conta grátis, conecte o Mercado Pago e comece a receber confirmações sem mudar o jeito que seus clientes pagam.</p>
        <button onClick={() => document.getElementById('comecar')?.scrollIntoView({ behavior: 'smooth' })} className="mt-6 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950">Criar Pix Grátis</button>
      </section>

      <footer className={`border-t px-4 py-8 text-center text-xs ${dark ? 'border-white/5 text-white/35' : 'border-black/5 text-slate-500'}`}>
        <p>PixWiki · O dinheiro cai direto na sua conta Mercado Pago.</p>
        <p className="mt-2"><a href="https://bigcorps.com.br" className="hover:underline">BigCorps</a> · tecnologia <a href="https://minhai.app" className="hover:underline">minhAi</a></p>
      </footer>
    </main>
  );
}
