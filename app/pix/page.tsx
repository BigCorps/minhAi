'use client';

// app/pix/page.tsx  ─  Landing / onboarding do Pix Wiki
//
// Fluxo:
//  1. Formulário  → nome empresa, CNPJ/CPF, chave PIX (saque), slug (pix.wiki/slug),
//                   logo URL (opcional)
//  2. Preview     → PixLinkPage renderizada com os dados digitados (sem gravar nada)
//  3. Ativar      → login/signup via Google ou email/senha
//                   após auth: cria company + user_profile + short_link
//                   redireciona para /dashboard
//
// O dinheiro dos pagamentos recebidos via Pix Wiki cai na conta BigCorps
// (BIGCORPS_PIX_KEY — mesmo fluxo do plano Smart existente).
// O campo "chave PIX" coletado aqui é a chave de SAQUE do lojista
// (armazenada em user_profiles.withdrawal_pix_key).

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
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
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function detectDocumentoTipo(value: string): 'cpf' | 'cnpj' | '' {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return 'cpf';
  if (digits.length === 14) return 'cnpj';
  return '';
}

function detectChavePixTipo(value: string): 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | '' {
  const digits = value.replace(/\D/g, '');
  if (value.includes('@')) return 'email';
  if (digits.length === 11 && !value.includes('+')) return 'cpf';
  if (digits.length === 14) return 'cnpj';
  if (value.startsWith('+') || (digits.length === 11 && value.includes('('))) return 'telefone';
  if (value.length === 36 && value.includes('-')) return 'aleatoria';
  return '';
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PixWikiPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>({
    nomeEmpresa: '', documento: '', documentoTipo: '',
    chavePix: '', chavePixTipo: '', slug: '', logoUrl: '',
  });
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [authError, setAuthError] = useState('');
  const [creating, setCreating] = useState(false);

  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-preenche slug quando digita o nome
  useEffect(() => {
    if (form.nomeEmpresa && !form.slug) {
      setForm(f => ({ ...f, slug: slugify(f.nomeEmpresa) }));
    }
  }, [form.nomeEmpresa]);

  // Checagem de slug em tempo real
  const checkSlug = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setSlugStatus('idle');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setSlugStatus('invalid');
      return;
    }
    setSlugStatus('checking');
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', value)
      .maybeSingle();
    setSlugStatus(data ? 'taken' : 'available');
  }, [supabase]);

  const handleSlugChange = (value: string) => {
    const clean = slugify(value);
    setForm(f => ({ ...f, slug: clean }));
    setSlugStatus('idle');
    if (slugDebounce.current) clearTimeout(slugDebounce.current);
    slugDebounce.current = setTimeout(() => checkSlug(clean), 500);
  };

  const handleDocumentoChange = (value: string) => {
    setForm(f => ({
      ...f,
      documento: value,
      documentoTipo: detectDocumentoTipo(value),
    }));
  };

  const handleChavePixChange = (value: string) => {
    setForm(f => ({
      ...f,
      chavePix: value,
      chavePixTipo: detectChavePixTipo(value),
    }));
  };

  const canPreview =
    form.nomeEmpresa.length >= 2 &&
    form.chavePix.length >= 5 &&
    form.slug.length >= 3 &&
    slugStatus === 'available';

  // ── Objeto fake de company para preview (sem gravar nada) ──────────────────
  const previewCompany = {
    id: 'preview',
    name: form.nomeEmpresa,
    slug: form.slug,
    logo_url: form.logoUrl || null,
  };

  // ── Criar conta e empresa após autenticação ────────────────────────────────
  const createAfterAuth = useCallback(async (userId: string) => {
    setCreating(true);
    try {
      // 1. Empresa
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
          // receiving_pix_key não é a chave do lojista —
          // o dinheiro vai para BIGCORPS_PIX_KEY (configurado na edge function).
          // A chave do lojista fica em user_profiles.withdrawal_pix_key.
        })
        .select('id')
        .single();

      if (companyErr || !company) throw new Error('Erro ao criar empresa.');

      // 2. Perfil do usuário (chave de saque)
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          withdrawal_pix_key: form.chavePix,
          withdrawal_pix_key_type: form.chavePixTipo || null,
          documento: form.documento || null,
          documento_tipo: form.documentoTipo || null,
        }, { onConflict: 'user_id' });

      // 3. Short link (pix.wiki/slug → minhai.app/pix/slug)
      await supabase
        .from('short_links')
        .insert({
          slug: form.slug,
          type: 'pix_wiki',
          company_id: company.id,
          user_id: userId,
          original_url: `https://minhai.app/pix/${form.slug}`,
        });

      // 4. Registrar lead na demo_sessions
      await supabase
        .from('demo_sessions')
        .insert({
          nome_negocio: form.nomeEmpresa,
          origem_simples: 'pixwiki',
          linked_user_id: userId,
          linked_company_id: company.id,
          linked_at: new Date().toISOString(),
          status: 'converted',
        });

      router.push('/dashboard?pixwiki=1');
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao configurar conta. Tente novamente.');
      setCreating(false);
      setStep('auth');
    }
  }, [form, supabase, router]);

  // ── Detectar retorno do OAuth e criar empresa ──────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Só executa se estava no fluxo de criação (step auth/creating)
        if (step === 'auth' || step === 'creating') {
          await createAfterAuth(session.user.id);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [step, createAfterAuth, supabase]);

  // ── Handlers de auth ──────────────────────────────────────────────────────
  const handleGoogleSignup = async () => {
    setStep('creating');
    const origin = window.location.origin;
    const params = new URLSearchParams({
      slug: form.slug,
      nome: encodeURIComponent(form.nomeEmpresa),
      pix: encodeURIComponent(form.chavePix),
      ...(form.logoUrl       ? { logo: encodeURIComponent(form.logoUrl) }       : {}),
      ...(form.documento     ? { doc: encodeURIComponent(form.documento) }       : {}),
      ...(form.documentoTipo ? { docTipo: form.documentoTipo }                   : {}),
      ...(form.chavePixTipo  ? { pixTipo: form.chavePixTipo }                    : {}),
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

    // Tenta criar conta nova; se já existir, faz login
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${window.location.origin}/pix/callback` },
    });

    if (!signUpErr && signUpData.user) {
      await createAfterAuth(signUpData.user.id);
      return;
    }

    // Conta já existe — faz login
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (signInErr || !signInData.user) {
      setAuthError(signInErr?.message || 'Erro no login. Verifique e-mail e senha.');
      setStep('auth');
      return;
    }
    await createAfterAuth(signInData.user.id);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  // Tela de criação
  if (step === 'creating') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/60 text-sm text-center">Configurando seu link PIX…</p>
      </div>
    );
  }

  // Preview da página de cobrança
  if (step === 'preview') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Barra de preview */}
        <div className="bg-slate-900 border-b border-white/8 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setStep('form')}
              className="text-white/50 hover:text-white transition-colors flex-shrink-0"
            >
              ← Editar
            </button>
            <div className="h-4 w-px bg-white/10 flex-shrink-0" />
            <span className="text-xs text-white/40 truncate">
              pix.wiki/<span className="text-green-400 font-semibold">{form.slug}</span>
            </span>
          </div>
          <button
            onClick={() => setStep('auth')}
            className="flex-shrink-0 px-4 py-1.5 bg-green-500 text-white text-sm font-bold rounded-full hover:bg-green-400 transition-all active:scale-95"
          >
            Ativar meu link →
          </button>
        </div>

        {/* Preview real */}
        <div className="flex-1 overflow-auto">
          <PixLinkPage company={previewCompany} initialAmount={null} />
        </div>
      </div>
    );
  }

  // Tela de autenticação
  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-white mb-1">
              pix.wiki/<span className="text-green-400">{form.slug}</span>
            </div>
            <p className="text-white/40 text-sm">Crie sua conta gratuita pra ativar o link</p>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-white/8 p-6 flex flex-col gap-3">
            {/* Google */}
            <button
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all active:scale-95"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-white/20 text-xs">ou</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Email/senha */}
            <form onSubmit={handleEmailSignup} className="flex flex-col gap-2.5">
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500/50"
              />
              <input
                type="password"
                placeholder="Crie uma senha (mín. 6 caracteres)"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500/50"
              />
              {authError && (
                <p className="text-red-400 text-xs">{authError}</p>
              )}
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
            className="mt-4 w-full text-center text-white/30 text-xs hover:text-white/50 transition-colors"
          >
            ← Voltar ao preview
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário principal ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Grátis — só 1% na retirada
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">
            Nunca mais perca uma venda<br />
            <span className="text-green-400">por comprovante falso</span>
          </h1>
          <p className="text-white/45 text-sm">
            Crie seu link de cobrança PIX agora. Seu cliente paga,
            você recebe confirmação automática — sem conferir nada.
          </p>
        </div>

        {/* Formulário */}
        <div className="bg-slate-900/80 rounded-2xl border border-white/8 p-5 sm:p-6 flex flex-col gap-4">

          {/* Nome da empresa */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              Nome da empresa
            </label>
            <input
              type="text"
              value={form.nomeEmpresa}
              onChange={e => setForm(f => ({ ...f, nomeEmpresa: e.target.value }))}
              onBlur={() => {
                if (!form.slug && form.nomeEmpresa) {
                  const slug = slugify(form.nomeEmpresa);
                  setForm(f => ({ ...f, slug }));
                  checkSlug(slug);
                }
              }}
              placeholder="Ex: Hamburgueria do Carlos"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500/50"
            />
          </div>

          {/* Slug — o campo mais importante */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              Seu link
            </label>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-green-500/50 transition-colors">
              <span className="pl-4 pr-2 text-white/30 text-sm flex-shrink-0">pix.wiki/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="minha-loja"
                className="flex-1 py-2.5 pr-4 bg-transparent text-white text-sm placeholder-white/25 focus:outline-none"
              />
              <div className="px-3 flex-shrink-0">
                {slugStatus === 'checking' && (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                )}
                {slugStatus === 'available' && <span className="text-green-400 text-sm">✓</span>}
                {slugStatus === 'taken' && <span className="text-red-400 text-sm">✗</span>}
              </div>
            </div>
            {slugStatus === 'taken' && (
              <p className="text-red-400 text-xs">Esse link já está em uso. Tente outro.</p>
            )}
            {slugStatus === 'invalid' && (
              <p className="text-yellow-400 text-xs">Use apenas letras, números e hífens.</p>
            )}
          </div>

          {/* Chave PIX (para SAQUE) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              Chave PIX para receber os saques
            </label>
            <input
              type="text"
              value={form.chavePix}
              onChange={e => handleChavePixChange(e.target.value)}
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500/50"
            />
            {form.chavePixTipo && (
              <p className="text-white/30 text-xs capitalize">Detectado: {form.chavePixTipo}</p>
            )}
          </div>

          {/* CNPJ/CPF */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              CNPJ ou CPF <span className="text-white/20 normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.documento}
              onChange={e => handleDocumentoChange(e.target.value)}
              placeholder="Somente para emissão de notas fiscais futuramente"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500/50"
            />
          </div>

          {/* Logo URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              URL do logo <span className="text-white/20 normal-case">(opcional)</span>
            </label>
            <input
              type="url"
              value={form.logoUrl}
              onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://suaempresa.com/logo.png"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500/50"
            />
          </div>

          {/* CTA */}
          <button
            disabled={!canPreview}
            onClick={() => setStep('preview')}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed bg-green-500 text-white hover:bg-green-400"
          >
            Ver como vai ficar →
          </button>

          {!canPreview && (
            <p className="text-white/20 text-xs text-center -mt-1">
              Preencha o nome, a chave PIX e escolha um link disponível
            </p>
          )}
        </div>

        {/* Social proof discreto */}
        <p className="text-center text-white/20 text-xs mt-5">
          Confirmação automática • Sem maquininha • Sem comprovante falso
        </p>

        {/* Loop viral — link pra quem é cliente do lojista */}
        <p className="text-center mt-3">
          <span className="text-white/20 text-xs">Você recebeu uma cobrança? </span>
          <a
            href="/pix/suporte"
            className="text-white/30 text-xs hover:text-white/50 transition-colors"
          >
            Clique no link que veio na mensagem
          </a>
        </p>
      </div>
    </div>
  );
}
