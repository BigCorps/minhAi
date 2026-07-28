'use client';

// app/pix/page.tsx  ─  Landing / onboarding do Pix Wiki

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PixLinkPage from '@/components/pix-link/PixLinkPage';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Step = 'form' | 'preview' | 'auth' | 'creating';

interface FormData {
  nomeEmpresa: string;
  documento: string;
  documentoTipo: 'cpf' | 'cnpj' | '';
  chavePix: string;
  chavePixTipo: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | '';
  slug: string;
  logoUrl: string;
  whatsapp: string;
  emailContato: string;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(value: string): string {
  return value
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function detectDocumentoTipo(value: string): 'cpf' | 'cnpj' | '' {
  const d = value.replace(/\D/g, '');
  if (d.length === 11) return 'cpf';
  if (d.length === 14) return 'cnpj';
  return '';
}

function detectChavePixTipo(value: string): 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | '' {
  const d = value.replace(/\D/g, '');
  if (value.includes('@')) return 'email';
  if (d.length === 11 && !value.includes('+') && !value.startsWith('(')) return 'cpf';
  if (d.length === 14) return 'cnpj';
  if (value.startsWith('+') || (d.length >= 10 && value.includes('('))) return 'telefone';
  if (value.length === 36 && value.split('-').length === 5) return 'aleatoria';
  return '';
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="
        fixed top-4 right-4 z-50
        w-9 h-9 rounded-full
        flex items-center justify-center
        bg-black/8 dark:bg-white/8
        border border-black/10 dark:border-white/10
        text-black/50 dark:text-white/50
        hover:bg-black/12 dark:hover:bg-white/12
        transition-colors
      "
      aria-label="Alternar tema"
    >
      {isDark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

function Logos() {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <Image src="/logo-circle.png" alt="minhAi" width={36} height={36} className="rounded-xl" />
      <span className="text-black/25 dark:text-white/25 text-lg font-light">|</span>
      <Image src="/brands/pix/pixwiki.png" alt="Pix Wiki" width={90} height={36} className="object-contain h-9 w-auto" />
    </div>
  );
}

function Field({ label, hint, optional, children }: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 flex items-center gap-1.5">
        {label}
        {optional && (
          <span className="normal-case font-normal text-black/25 dark:text-white/25">opcional</span>
        )}
      </label>
      {children}
      {hint && <p className="text-[10px] text-black/25 dark:text-white/25">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="
        w-full px-4 py-2.5 rounded-xl text-sm
        bg-black/5 dark:bg-white/5
        border border-black/10 dark:border-white/10
        text-black dark:text-white
        placeholder-black/25 dark:placeholder-white/25
        focus:outline-none focus:border-green-500/60
        transition-colors
      "
    />
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PixWikiPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const [step, setStep]             = useState<Step>('form');
  const [form, setForm]             = useState<FormData>({
    nomeEmpresa: '', documento: '', documentoTipo: '',
    chavePix: '', chavePixTipo: '', slug: '',
    logoUrl: '', whatsapp: '', emailContato: '',
  });
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [email, setEmail]           = useState('');
  const [senha, setSenha]           = useState('');
  const [authError, setAuthError]   = useState('');

  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const up = (field: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const checkSlug = useCallback(async (value: string) => {
    if (!value || value.length < 3) { setSlugStatus('idle'); return; }
    if (!/^[a-z0-9-]+$/.test(value)) { setSlugStatus('invalid'); return; }
    setSlugStatus('checking');
    const { data } = await supabase
      .from('companies').select('id').eq('slug', value).maybeSingle();
    setSlugStatus(data ? 'taken' : 'available');
  }, [supabase]);

  const handleSlugChange = (value: string) => {
    const clean = slugify(value);
    up('slug', clean);
    setSlugStatus('idle');
    if (slugDebounce.current) clearTimeout(slugDebounce.current);
    slugDebounce.current = setTimeout(() => checkSlug(clean), 500);
  };

  const canPreview =
    form.nomeEmpresa.length >= 2 &&
    form.chavePix.length >= 5 &&
    form.slug.length >= 3 &&
    slugStatus === 'available';

  const previewCompany = {
    id: 'preview', name: form.nomeEmpresa, slug: form.slug, logo_url: form.logoUrl || null,
  };

  const createAfterAuth = useCallback(async (userId: string) => {
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .insert({
        name: form.nomeEmpresa, slug: form.slug,
        logo_url: form.logoUrl || null,
        is_active: true, is_public: true, assistant_type: 'smart', user_id: userId,
        whatsapp_number: form.whatsapp || null,
        email_contato: form.emailContato || null,
      })
      .select('id').single();
    if (companyErr || !company) throw new Error('Erro ao criar empresa.');

    await supabase.from('user_profiles').upsert({
      user_id: userId,
      withdrawal_pix_key: form.chavePix,
      withdrawal_pix_key_type: form.chavePixTipo || null,
      documento: form.documento || null,
      documento_tipo: form.documentoTipo || null,
    }, { onConflict: 'user_id' });

    await supabase.from('short_links').insert({
      slug: form.slug, type: 'pix_wiki', company_id: company.id, user_id: userId,
      original_url: `https://minhai.app/pix/${form.slug}`,
    });

    await supabase.from('demo_sessions').insert({
      nome_negocio: form.nomeEmpresa,
      email: form.emailContato || null,
      phone: form.whatsapp || null,
      origem_simples: 'pixwiki',
      linked_user_id: userId, linked_company_id: company.id,
      linked_at: new Date().toISOString(), status: 'converted',
    });

    router.replace('/dashboard?pixwiki=1');
  }, [form, supabase, router]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user &&
          (step === 'auth' || step === 'creating')) {
          await createAfterAuth(session.user.id);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [step, createAfterAuth, supabase]);

  const handleGoogleSignup = async () => {
    setStep('creating');
    const params = new URLSearchParams({
      slug: form.slug,
      nome: encodeURIComponent(form.nomeEmpresa),
      pix:  encodeURIComponent(form.chavePix),
      ...(form.logoUrl       ? { logo:    encodeURIComponent(form.logoUrl) }       : {}),
      ...(form.documento     ? { doc:     encodeURIComponent(form.documento) }     : {}),
      ...(form.documentoTipo ? { docTipo: form.documentoTipo }                     : {}),
      ...(form.chavePixTipo  ? { pixTipo: form.chavePixTipo }                      : {}),
      ...(form.whatsapp      ? { wa:      encodeURIComponent(form.whatsapp) }      : {}),
      ...(form.emailContato  ? { email:   encodeURIComponent(form.emailContato) }  : {}),
    });
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/pix/callback?${params.toString()}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !senha || senha.length < 6) {
      setAuthError('E-mail e senha (mín. 6 caracteres) são obrigatórios.');
      return;
    }
    setStep('creating');
    const { data: su, error: suErr } = await supabase.auth.signUp({ email, password: senha });
    if (!suErr && su.user) { await createAfterAuth(su.user.id); return; }
    const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (siErr || !si.user) {
      setAuthError(siErr?.message || 'E-mail ou senha incorretos.');
      setStep('auth'); return;
    }
    await createAfterAuth(si.user.id);
  };

  // ─── Wrapper com tema ─────────────────────────────────────────────────────
  const wrap = (children: React.ReactNode) => (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-[#0e1117]">
        <ThemeToggle isDark={isDark} onToggle={() => setIsDark(v => !v)} />
        {children}
      </div>
    </div>
  );

  // ─── Criando ──────────────────────────────────────────────────────────────
  if (step === 'creating') return wrap(
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-black/40 dark:text-white/40 text-sm">Configurando seu link PIX…</p>
    </div>
  );

  // ─── Preview ──────────────────────────────────────────────────────────────
  if (step === 'preview') return wrap(
    <div className="min-h-screen flex flex-col">
      <div className="bg-white dark:bg-[#1a1d27] border-b border-black/8 dark:border-white/8 px-4 py-3 flex items-center justify-between gap-3 pr-16">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setStep('form')}
            className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors text-sm flex-shrink-0"
          >
            ← Editar
          </button>
          <div className="h-4 w-px bg-black/10 dark:bg-white/10 flex-shrink-0" />
          <span className="text-xs text-black/30 dark:text-white/30 truncate">
            pix.wiki/<span className="text-green-600 dark:text-green-400 font-semibold">{form.slug}</span>
          </span>
        </div>
        <button
          onClick={() => setStep('auth')}
          className="flex-shrink-0 px-4 py-1.5 bg-green-500 text-white text-sm font-bold rounded-full hover:bg-green-400 transition-all active:scale-95"
        >
          Ativar meu link →
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <PixLinkPage company={previewCompany} initialAmount={null} />
      </div>
    </div>
  );

  // ─── Auth ─────────────────────────────────────────────────────────────────
  if (step === 'auth') return wrap(
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <Logos />
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="text-xl font-bold text-black dark:text-white mb-1">
            pix.wiki/<span className="text-green-500">{form.slug}</span>
          </div>
          <p className="text-black/40 dark:text-white/40 text-sm">
            Crie sua conta gratuita pra ativar o link
          </p>
        </div>
        <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl border border-black/8 dark:border-white/8 p-5 flex flex-col gap-3">
          <button
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white text-gray-800 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all active:scale-95 shadow-sm border border-black/8"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-black/8 dark:bg-white/8" />
            <span className="text-black/20 dark:text-white/20 text-xs">ou</span>
            <div className="flex-1 h-px bg-black/8 dark:bg-white/8" />
          </div>
          <form onSubmit={handleEmailSignup} className="flex flex-col gap-2">
            <Input value={email} onChange={setEmail} placeholder="Seu e-mail" type="email" />
            <Input value={senha} onChange={setSenha} placeholder="Senha (mín. 6 caracteres)" type="password" />
            {authError && <p className="text-red-500 text-xs">{authError}</p>}
            <button type="submit" className="w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-400 transition-all active:scale-95">
              Criar conta e ativar link
            </button>
          </form>
        </div>
        <button onClick={() => setStep('preview')} className="mt-4 w-full text-center text-black/25 dark:text-white/25 text-xs hover:text-black/50 dark:hover:text-white/50 transition-colors">
          ← Voltar ao preview
        </button>
      </div>
    </div>
  );

  // ─── Formulário ───────────────────────────────────────────────────────────
  return wrap(
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Logos />

        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Grátis — 1% apenas na retirada
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white leading-tight mb-2">
            Nunca mais perca uma venda<br />
            <span className="text-green-500">por comprovante falso</span>
          </h1>
          <p className="text-black/45 dark:text-white/45 text-sm leading-relaxed">
            Crie seu link de cobrança PIX. Quando o cliente pagar, você recebe confirmação
            automática no{' '}
            <span className="font-medium text-black/70 dark:text-white/70">dashboard</span>,
            por{' '}
            <span className="font-medium text-black/70 dark:text-white/70">e-mail</span>
            {' '}e no{' '}
            <span className="font-medium text-black/70 dark:text-white/70">WhatsApp</span>
            {' '}— sem conferir nada.
          </p>
        </div>

        <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl border border-black/8 dark:border-white/8 p-5 sm:p-6 flex flex-col gap-4">

          <Field label="Nome da empresa">
            <Input
              value={form.nomeEmpresa}
              onChange={v => {
                up('nomeEmpresa', v);
                if (!form.slug) {
                  const s = slugify(v);
                  up('slug', s);
                  if (slugDebounce.current) clearTimeout(slugDebounce.current);
                  slugDebounce.current = setTimeout(() => checkSlug(s), 600);
                }
              }}
              placeholder="Ex: Hamburgueria do Carlos"
            />
          </Field>

          <Field label="Seu link">
            <div className="flex items-center rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus-within:border-green-500/60 transition-colors">
              <span className="pl-4 pr-1 text-black/30 dark:text-white/30 text-sm flex-shrink-0">pix.wiki/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="minha-loja"
                className="flex-1 py-2.5 pr-2 bg-transparent text-black dark:text-white text-sm placeholder-black/25 dark:placeholder-white/25 focus:outline-none"
              />
              <div className="px-3 w-8 flex justify-center flex-shrink-0">
                {slugStatus === 'checking' && <div className="w-3 h-3 border-2 border-black/20 dark:border-white/20 border-t-transparent rounded-full animate-spin" />}
                {slugStatus === 'available' && <span className="text-green-500 text-sm font-bold">✓</span>}
                {slugStatus === 'taken'     && <span className="text-red-500 text-sm font-bold">✗</span>}
              </div>
            </div>
            {slugStatus === 'taken'   && <p className="text-red-500 text-xs">Esse link já está em uso. Tente outro.</p>}
            {slugStatus === 'invalid' && <p className="text-yellow-600 dark:text-yellow-400 text-xs">Use apenas letras, números e hífens.</p>}
          </Field>

          <Field label="Chave PIX para receber os saques" hint="CPF, CNPJ, e-mail, telefone ou chave aleatória">
            <Input
              value={form.chavePix}
              onChange={v => { up('chavePix', v); up('chavePixTipo', detectChavePixTipo(v)); }}
              placeholder="Sua chave pra sacar o saldo"
            />
            {form.chavePixTipo && (
              <p className="text-[10px] text-black/30 dark:text-white/30 -mt-1 capitalize">Detectado: {form.chavePixTipo}</p>
            )}
          </Field>

          {/* Mais opções: WhatsApp, email, logo, CNPJ */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-black/35 dark:text-white/35 hover:text-black/60 dark:hover:text-white/60 transition-colors select-none list-none flex items-center gap-1.5">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Mais opções (WhatsApp, e-mail, logo, CNPJ)
            </summary>
            <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-black/6 dark:border-white/6">
              <Field label="WhatsApp" optional hint="Para receber confirmações de pagamento">
                <Input value={form.whatsapp} onChange={v => up('whatsapp', v)} placeholder="(11) 99999-9999" />
              </Field>
              <Field label="E-mail de contato" optional hint="Para receber confirmações de pagamento">
                <Input value={form.emailContato} onChange={v => up('emailContato', v)} placeholder="contato@suaempresa.com" type="email" />
              </Field>
              <Field label="URL do logo" optional>
                <Input value={form.logoUrl} onChange={v => up('logoUrl', v)} placeholder="https://suaempresa.com/logo.png" type="url" />
              </Field>
              <Field label="CNPJ ou CPF" optional hint="Necessário para emissão de notas fiscais no futuro">
                <Input
                  value={form.documento}
                  onChange={v => { up('documento', v); up('documentoTipo', detectDocumentoTipo(v)); }}
                  placeholder="00.000.000/0000-00 ou 000.000.000-00"
                />
              </Field>
            </div>
          </details>

          <button
            disabled={!canPreview}
            onClick={() => setStep('preview')}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 bg-green-500 hover:bg-green-400 text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Ver como vai ficar →
          </button>
          {!canPreview && (
            <p className="text-black/25 dark:text-white/25 text-xs text-center -mt-2">
              Preencha o nome, a chave PIX e escolha um link disponível
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
          {['Confirmação automática', 'Sem maquininha', 'Zero comprovante falso'].map(t => (
            <span key={t} className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 border border-black/6 dark:border-white/6">
              {t}
            </span>
          ))}
        </div>

        <p className="text-center mt-3">
          <span className="text-black/20 dark:text-white/20 text-xs">Recebeu uma cobrança? </span>
          <a href="/pix/suporte" className="text-black/30 dark:text-white/30 text-xs hover:text-black/50 dark:hover:text-white/50 transition-colors">
            Clique no link que veio na mensagem
          </a>
        </p>
      </div>
    </div>
  );
}


// ─── Tipos ────────────────────────────────────────────────────────────────────
type Step = 'form' | 'preview' | 'auth' | 'creating';

interface FormData {
  nomeEmpresa: string;
  documento: string;
  documentoTipo: 'cpf' | 'cnpj' | '';
  chavePix: string;
  chavePixTipo: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | '';
  slug: string;
  logoUrl: string;
  whatsapp: string;
  emailContato: string;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(value: string): string {
  return value
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function detectDocumentoTipo(value: string): 'cpf' | 'cnpj' | '' {
  const d = value.replace(/\D/g, '');
  if (d.length === 11) return 'cpf';
  if (d.length === 14) return 'cnpj';
  return '';
}

function detectChavePixTipo(value: string): 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | '' {
  const d = value.replace(/\D/g, '');
  if (value.includes('@')) return 'email';
  if (d.length === 11 && !value.includes('+') && !value.startsWith('(')) return 'cpf';
  if (d.length === 14) return 'cnpj';
  if (value.startsWith('+') || (d.length >= 10 && value.includes('('))) return 'telefone';
  if (value.length === 36 && value.split('-').length === 5) return 'aleatoria';
  return '';
}

// ─── Input reutilizável (mantém tema) ────────────────────────────────────────
function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-black/25 dark:text-white/25">{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="
        w-full px-4 py-2.5 rounded-xl text-sm
        bg-black/5 dark:bg-white/5
        border border-black/10 dark:border-white/10
        text-black dark:text-white
        placeholder-black/25 dark:placeholder-white/25
        focus:outline-none focus:border-green-500/60
        transition-colors
      "
    />
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PixWikiPage() {
  const supabase = createClient();
  const router   = useRouter();

  // Tema — igual ao padrão da PixLinkPage
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [step, setStep]           = useState<Step>('form');
  const [form, setForm]           = useState<FormData>({
    nomeEmpresa: '', documento: '', documentoTipo: '',
    chavePix: '', chavePixTipo: '', slug: '',
    logoUrl: '', whatsapp: '', emailContato: '',
  });
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [email, setEmail]           = useState('');
  const [senha, setSenha]           = useState('');
  const [authError, setAuthError]   = useState('');

  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const up = (field: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  // Auto-slug ao digitar nome
  useEffect(() => {
    if (form.nomeEmpresa && !form.slug) {
      const s = slugify(form.nomeEmpresa);
      up('slug', s);
      checkSlug(s);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.nomeEmpresa]);

  const checkSlug = useCallback(async (value: string) => {
    if (!value || value.length < 3) { setSlugStatus('idle'); return; }
    if (!/^[a-z0-9-]+$/.test(value)) { setSlugStatus('invalid'); return; }
    setSlugStatus('checking');
    const { data } = await supabase
      .from('companies').select('id').eq('slug', value).maybeSingle();
    setSlugStatus(data ? 'taken' : 'available');
  }, [supabase]);

  const handleSlugChange = (value: string) => {
    const clean = slugify(value);
    up('slug', clean);
    setSlugStatus('idle');
    if (slugDebounce.current) clearTimeout(slugDebounce.current);
    slugDebounce.current = setTimeout(() => checkSlug(clean), 500);
  };

  const canPreview =
    form.nomeEmpresa.length >= 2 &&
    form.chavePix.length >= 5 &&
    form.slug.length >= 3 &&
    slugStatus === 'available';

  // Fake company para o preview
  const previewCompany = {
    id: 'preview',
    name: form.nomeEmpresa,
    slug: form.slug,
    logo_url: form.logoUrl || null,
  };

  // ── Criar empresa após auth ────────────────────────────────────────────────
  const createAfterAuth = useCallback(async (userId: string) => {
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .insert({
        name: form.nomeEmpresa,
        slug: form.slug,
        logo_url: form.logoUrl || null,
        is_active: true,
        is_public: true,
        assistant_type: 'smart',
        user_id: userId,
        whatsapp_number: form.whatsapp || null,
        email_contato: form.emailContato || null,
      })
      .select('id')
      .single();

    if (companyErr || !company) throw new Error('Erro ao criar empresa.');

    await supabase.from('user_profiles').upsert({
      user_id: userId,
      withdrawal_pix_key:      form.chavePix,
      withdrawal_pix_key_type: form.chavePixTipo || null,
      documento:      form.documento || null,
      documento_tipo: form.documentoTipo || null,
    }, { onConflict: 'user_id' });

    await supabase.from('short_links').insert({
      slug: form.slug,
      type: 'pix_wiki',
      company_id: company.id,
      user_id: userId,
      original_url: `https://minhai.app/pix/${form.slug}`,
    });

    await supabase.from('demo_sessions').insert({
      nome_negocio: form.nomeEmpresa,
      email:        form.emailContato || null,
      phone:        form.whatsapp || null,
      origem_simples: 'pixwiki',
      linked_user_id: userId,
      linked_company_id: company.id,
      linked_at: new Date().toISOString(),
      status: 'converted',
    });

    router.replace('/dashboard?pixwiki=1');
  }, [form, supabase, router]);

  // Listener de auth (fluxo email/senha)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user &&
          (step === 'auth' || step === 'creating')) {
          await createAfterAuth(session.user.id);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [step, createAfterAuth, supabase]);

  // ── Handlers de auth ──────────────────────────────────────────────────────
  const handleGoogleSignup = async () => {
    setStep('creating');
    const origin = window.location.origin;
    const params = new URLSearchParams({
      slug: form.slug,
      nome: encodeURIComponent(form.nomeEmpresa),
      pix:  encodeURIComponent(form.chavePix),
      ...(form.logoUrl      ? { logo:     encodeURIComponent(form.logoUrl) }      : {}),
      ...(form.documento    ? { doc:      encodeURIComponent(form.documento) }    : {}),
      ...(form.documentoTipo? { docTipo:  form.documentoTipo }                    : {}),
      ...(form.chavePixTipo ? { pixTipo:  form.chavePixTipo }                     : {}),
      ...(form.whatsapp     ? { wa:       encodeURIComponent(form.whatsapp) }     : {}),
      ...(form.emailContato ? { email:    encodeURIComponent(form.emailContato) } : {}),
    });
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/pix/callback?${params.toString()}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !senha || senha.length < 6) {
      setAuthError('E-mail e senha (mín. 6 caracteres) são obrigatórios.');
      return;
    }
    setStep('creating');
    const { data: su, error: suErr } = await supabase.auth.signUp({
      email, password: senha,
      options: { emailRedirectTo: `${window.location.origin}/pix/callback` },
    });
    if (!suErr && su.user) { await createAfterAuth(su.user.id); return; }

    const { data: si, error: siErr } = await supabase.auth.signInWithPassword({
      email, password: senha,
    });
    if (siErr || !si.user) {
      setAuthError(siErr?.message || 'E-mail ou senha incorretos.');
      setStep('auth');
      return;
    }
    await createAfterAuth(si.user.id);
  };

  // ─── Render: criando ──────────────────────────────────────────────────────
  if (step === 'creating') {
    return (
      <div className={`${isDark ? 'dark' : ''}`}>
        <div className="min-h-screen bg-white dark:bg-[#0e1117] flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-black/50 dark:text-white/50 text-sm">Configurando seu link PIX…</p>
        </div>
      </div>
    );
  }

  // ─── Render: preview ──────────────────────────────────────────────────────
  if (step === 'preview') {
    return (
      <div className={`${isDark ? 'dark' : ''}`}>
        <div className="min-h-screen bg-white dark:bg-[#0e1117] flex flex-col">
          {/* Barra de preview */}
          <div className="bg-white dark:bg-[#1a1d27] border-b border-black/8 dark:border-white/8 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setStep('form')}
                className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors text-sm flex-shrink-0"
              >
                ← Editar
              </button>
              <div className="h-4 w-px bg-black/10 dark:bg-white/10 flex-shrink-0" />
              <span className="text-xs text-black/30 dark:text-white/30 truncate">
                pix.wiki/<span className="text-green-600 dark:text-green-400 font-semibold">{form.slug}</span>
              </span>
            </div>
            <button
              onClick={() => setStep('auth')}
              className="flex-shrink-0 px-4 py-1.5 bg-green-500 text-white text-sm font-bold rounded-full hover:bg-green-400 transition-all active:scale-95"
            >
              Ativar meu link →
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <PixLinkPage company={previewCompany} initialAmount={null} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: auth ─────────────────────────────────────────────────────────
  if (step === 'auth') {
    return (
      <div className={`${isDark ? 'dark' : ''}`}>
        <div className="min-h-screen bg-white dark:bg-[#0e1117] flex flex-col items-center justify-center px-4 py-10">
          {/* Logos */}
          <div className="flex items-center gap-3 mb-6">
            <Image src={MINHAI_LOGO_URL} alt="minhAi" width={32} height={32} className="rounded-lg" />
            <span className="text-black/20 dark:text-white/20 text-lg">×</span>
            <span className="font-black text-lg text-black dark:text-white">
              pix<span className="text-green-500">.</span>wiki
            </span>
          </div>

          <div className="w-full max-w-sm">
            <div className="text-center mb-5">
              <div className="text-xl font-bold text-black dark:text-white mb-1">
                pix.wiki/<span className="text-green-500">{form.slug}</span>
              </div>
              <p className="text-black/40 dark:text-white/40 text-sm">
                Crie sua conta gratuita pra ativar o link
              </p>
            </div>

            <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl border border-black/8 dark:border-white/8 p-5 flex flex-col gap-3">
              <button
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white dark:bg-white text-gray-800 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-black/8 dark:bg-white/8" />
                <span className="text-black/20 dark:text-white/20 text-xs">ou</span>
                <div className="flex-1 h-px bg-black/8 dark:bg-white/8" />
              </div>

              <form onSubmit={handleEmailSignup} className="flex flex-col gap-2">
                <Input value={email} onChange={setEmail} placeholder="Seu e-mail" type="email" />
                <Input value={senha} onChange={setSenha} placeholder="Crie uma senha (mín. 6 caracteres)" type="password" />
                {authError && <p className="text-red-500 text-xs">{authError}</p>}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-400 transition-all active:scale-95"
                >
                  Criar conta e ativar link
                </button>
              </form>
            </div>

            <button
              onClick={() => setStep('preview')}
              className="mt-4 w-full text-center text-black/25 dark:text-white/25 text-xs hover:text-black/50 dark:hover:text-white/50 transition-colors"
            >
              ← Voltar ao preview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: formulário ───────────────────────────────────────────────────
  return (
    <div className={`${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-white dark:bg-[#0e1117] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Logos */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image src={MINHAI_LOGO_URL} alt="minhAi" width={36} height={36} className="rounded-xl" />
            <span className="text-black/20 dark:text-white/20 text-xl">×</span>
            <span className="font-black text-2xl text-black dark:text-white">
              pix<span className="text-green-500">.</span>wiki
            </span>
          </div>

          {/* Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Grátis — 1% apenas na retirada
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white leading-tight mb-2">
              Nunca mais perca uma venda<br />
              <span className="text-green-500">por comprovante falso</span>
            </h1>
            <p className="text-black/45 dark:text-white/45 text-sm leading-relaxed">
              Crie seu link de cobrança PIX. Seu cliente paga e você recebe
              a confirmação automática no{' '}
              <span className="text-black/70 dark:text-white/70 font-medium">dashboard</span>,
              por{' '}
              <span className="text-black/70 dark:text-white/70 font-medium">e-mail</span>
              {' '}e no{' '}
              <span className="text-black/70 dark:text-white/70 font-medium">WhatsApp</span>
              {' '}— sem conferir nada.
            </p>
          </div>

          {/* Formulário */}
          <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl border border-black/8 dark:border-white/8 p-5 sm:p-6 flex flex-col gap-4">

            {/* Nome */}
            <Field label="Nome da empresa">
              <Input
                value={form.nomeEmpresa}
                onChange={v => {
                  up('nomeEmpresa', v);
                  if (!form.slug) {
                    const s = slugify(v);
                    up('slug', s);
                    if (slugDebounce.current) clearTimeout(slugDebounce.current);
                    slugDebounce.current = setTimeout(() => checkSlug(s), 600);
                  }
                }}
                placeholder="Ex: Hamburgueria do Carlos"
              />
            </Field>

            {/* Slug */}
            <Field label="Seu link">
              <div className={`
                flex items-center rounded-xl overflow-hidden transition-colors
                bg-black/5 dark:bg-white/5
                border border-black/10 dark:border-white/10
                focus-within:border-green-500/60
              `}>
                <span className="pl-4 pr-1 text-black/30 dark:text-white/30 text-sm flex-shrink-0">
                  pix.wiki/
                </span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="minha-loja"
                  className="flex-1 py-2.5 pr-2 bg-transparent text-black dark:text-white text-sm placeholder-black/25 dark:placeholder-white/25 focus:outline-none"
                />
                <div className="px-3 flex-shrink-0 w-8 flex justify-center">
                  {slugStatus === 'checking' && (
                    <div className="w-3 h-3 border-2 border-black/20 dark:border-white/20 border-t-transparent rounded-full animate-spin" />
                  )}
                  {slugStatus === 'available' && <span className="text-green-500 text-sm font-bold">✓</span>}
                  {slugStatus === 'taken'     && <span className="text-red-500 text-sm font-bold">✗</span>}
                </div>
              </div>
              {slugStatus === 'taken'   && <p className="text-red-500 text-xs">Esse link já está em uso. Tente outro.</p>}
              {slugStatus === 'invalid' && <p className="text-yellow-600 dark:text-yellow-400 text-xs">Use apenas letras, números e hífens.</p>}
            </Field>

            {/* Chave PIX */}
            <Field
              label="Chave PIX para receber os saques"
              hint="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            >
              <Input
                value={form.chavePix}
                onChange={v => {
                  up('chavePix', v);
                  up('chavePixTipo', detectChavePixTipo(v));
                }}
                placeholder="Sua chave pra sacar o saldo"
              />
              {form.chavePixTipo && (
                <p className="text-[10px] text-black/30 dark:text-white/30 capitalize -mt-1">
                  Detectado: {form.chavePixTipo}
                </p>
              )}
            </Field>

            {/* WhatsApp */}
            <Field
              label={<>WhatsApp <span className="text-black/25 dark:text-white/25 normal-case font-normal">(opcional — para receber confirmações)</span></>}
            >
              <Input
                value={form.whatsapp}
                onChange={v => up('whatsapp', v)}
                placeholder="(11) 99999-9999"
              />
            </Field>

            {/* Email */}
            <Field
              label={<>E-mail <span className="text-black/25 dark:text-white/25 normal-case font-normal">(opcional — para receber confirmações)</span></>}
            >
              <Input
                value={form.emailContato}
                onChange={v => up('emailContato', v)}
                placeholder="contato@suaempresa.com"
                type="email"
              />
            </Field>

            {/* Opcionais colapsados */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors select-none list-none flex items-center gap-1.5">
                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Mais opções (logo, CNPJ, domínio)
              </summary>
              <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-black/6 dark:border-white/6">
                <Field
                  label={<>URL do logo <span className="text-black/25 dark:text-white/25 normal-case font-normal">(opcional)</span></>}
                >
                  <Input
                    value={form.logoUrl}
                    onChange={v => up('logoUrl', v)}
                    placeholder="https://suaempresa.com/logo.png"
                    type="url"
                  />
                </Field>
                <Field
                  label={<>CNPJ ou CPF <span className="text-black/25 dark:text-white/25 normal-case font-normal">(opcional)</span></>}
                  hint="Necessário para emissão de notas fiscais no futuro"
                >
                  <Input
                    value={form.documento}
                    onChange={v => {
                      up('documento', v);
                      up('documentoTipo', detectDocumentoTipo(v));
                    }}
                    placeholder="00.000.000/0000-00 ou 000.000.000-00"
                  />
                </Field>
              </div>
            </details>

            {/* CTA */}
            <button
              disabled={!canPreview}
              onClick={() => setStep('preview')}
              className="
                w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95
                bg-green-500 hover:bg-green-400 text-white
                disabled:opacity-30 disabled:cursor-not-allowed
              "
            >
              Ver como vai ficar →
            </button>

            {!canPreview && (
              <p className="text-black/25 dark:text-white/25 text-xs text-center -mt-2">
                Preencha o nome, a chave PIX e escolha um link disponível
              </p>
            )}
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {['Confirmação automática', 'Sem maquininha', 'Zero comprovante falso'].map(t => (
              <span
                key={t}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium
                  bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40
                  border border-black/6 dark:border-white/6"
              >
                {t}
              </span>
            ))}
          </div>

          <p className="text-center mt-3">
            <span className="text-black/20 dark:text-white/20 text-xs">Recebeu uma cobrança? </span>
            <a href="/pix/suporte" className="text-black/30 dark:text-white/30 text-xs hover:text-black/50 dark:hover:text-white/50 transition-colors">
              Clique no link que veio na mensagem
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
