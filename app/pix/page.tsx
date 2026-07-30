'use client';

// app/pix/page.tsx — Landing/onboarding do Pix Wiki
// Tema: controlado via state (mesmo padrão da PixLinkPage),
// aplicado inline em cada elemento — sem dark: do Tailwind,
// sem dependência do ThemeProvider do layout.

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PixLinkPage from '@/components/pix-link/PixLinkPage';

// ─── Paletas de cor ───────────────────────────────────────────────────────────
const D = {
  pageBg:       'bg-[#020617]',
  cardBg:       'bg-[#020617]',
  border:       'border-white/10',
  borderLight:  'border-white/6',
  text:         'text-white',
  textMuted:    'text-white/60',
  textFaint:    'text-white/40',
  inputBg:      'bg-white/5',
  inputBorder:  'border-white/10',
  inputText:    'text-white',
  inputPh:      'placeholder-white/25',
  divider:      'bg-white/8',
  toggleBg:     'bg-white/8 border-white/10 text-white/50 hover:bg-white/12',
  summaryText:  'text-white/35 hover:text-white/60',
  detailBorder: 'border-white/6',
  badgeBg:      'bg-white/5 border-white/6 text-white/40',
  footerText:   'text-white/25',
  footerLink:   'text-white/40 hover:text-white/70',
};

const L = {
  pageBg:       'bg-white',
  cardBg:       'bg-white',
  border:       'border-black/8',
  borderLight:  'border-black/6',
  text:         'text-gray-900',
  textMuted:    'text-gray-900',
  textFaint:    'text-black/70',
  inputBg:      'bg-black/5',
  inputBorder:  'border-black/10',
  inputText:    'text-gray-900',
  inputPh:      'placeholder-black/25',
  divider:      'bg-black/8',
  toggleBg:     'bg-black/8 border-black/10 text-black/50 hover:bg-black/12',
  summaryText:  'text-black/35 hover:text-black/60',
  detailBorder: 'border-black/6',
  badgeBg:      'bg-black/5 border-black/6 text-black/40',
  footerText:   'text-black/30',
  footerLink:   'text-black/40 hover:text-black/70',
};

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
function slugify(v: string) {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function detectDocumentoTipo(v: string): 'cpf' | 'cnpj' | '' {
  const d = v.replace(/\D/g, '');
  return d.length === 11 ? 'cpf' : d.length === 14 ? 'cnpj' : '';
}

function detectChavePixTipo(v: string): 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | '' {
  const d = v.replace(/\D/g, '');
  if (v.includes('@')) return 'email';
  if (d.length === 11 && !v.includes('+') && !v.startsWith('(')) return 'cpf';
  if (d.length === 14) return 'cnpj';
  if (v.startsWith('+') || (d.length >= 10 && v.includes('('))) return 'telefone';
  if (v.length === 36 && v.split('-').length === 5) return 'aleatoria';
  return '';
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const p = dark ? D : L;
  return (
    <button
      onClick={onToggle}
      aria-label="Alternar tema"
      className={`fixed top-4 right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${p.toggleBg}`}
    >
      {dark ? (
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
      
      <Image src="/brands/pix/pixwiki.png" alt="Pix Wiki" width={90} height={36} className="object-contain h-9 w-auto" />

      <span className="text-gray-300 text-lg font-light select-none">|</span>

      <Image src="/logo-circle.png" alt="minhAi" width={36} height={36} className="rounded-xl" />
    </div>
  );
}

function Footer({ dark }: { dark: boolean }) {
  const p = dark ? D : L;
  return (
    <footer className={`mt-6 text-center flex flex-col gap-1 ${p.footerText} text-xs`}>
      <p>
        <a href="https://pix.wiki" className={`transition-colors ${p.footerLink}`}>Pix.Wiki</a>
        {' '}|{' '}
        Desenvolvido por{' '}
        <a href="https://bigcorps.com.br" className={`transition-colors ${p.footerLink}`}>BigCorps</a>
        {' '}| Tecnologia{' '}
        <a href="https://minhai.app" className={`transition-colors ${p.footerLink}`}>minhAi</a>
      </p>
    </footer>
  );
}

function Input({ value, onChange, placeholder, type = 'text', dark }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dark: boolean;
}) {
  const p = dark ? D : L;
  return (
    <input
      type={type} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-green-500/60 transition-colors ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
    />
  );
}

function Field({ label, hint, optional, dark, children }: {
  label: string; hint?: string; optional?: boolean; dark: boolean; children: React.ReactNode;
}) {
  const p = dark ? D : L;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${p.textFaint}`}>{label}</span>
        {optional && <span className={`text-[10px] ${p.textFaint}`}>opcional</span>}
      </div>
      {children}
      {hint && <p className={`text-[10px] ${p.textFaint}`}>{hint}</p>}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PixWikiPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [dark, setDark]   = useState(true);
  const [step, setStep]   = useState<Step>('form');
  const [form, setForm]   = useState<FormData>({
    nomeEmpresa: '', documento: '', documentoTipo: '',
    chavePix: '', chavePixTipo: '', slug: '',
    logoUrl: '', whatsapp: '', emailContato: '',
  });
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [authEmail, setAuthEmail]   = useState('');
  const [authSenha, setAuthSenha]   = useState('');
  const [authError, setAuthError]   = useState('');
  const slugRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugManuallyEdited = useRef(false);

  useEffect(() => {
   const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
   if (saved) {
     setDark(saved === 'dark');
     return;
   }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const p = dark ? D : L;

  const up = (field: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const RESERVED_PIX_SLUGS = ['login', 'conta', 'suporte', 'termos', 'aviso', 'exclusao', 'api'];
  
  const checkSlug = useCallback(async (value: string) => {
    if (!value || value.length < 3) { setSlugStatus('idle'); return; }
    if (!/^[a-z0-9-]+$/.test(value)) { setSlugStatus('invalid'); return; }
    if (RESERVED_PIX_SLUGS.includes(value)) { setSlugStatus('taken'); return; }
    setSlugStatus('checking');
    const { data } = await supabase.from('companies').select('id').eq('slug', value).maybeSingle();
    setSlugStatus(data ? 'taken' : 'available');
  }, [supabase]);

const toggleDark = () => {
  setDark(v => {
    const next = !v;
    localStorage.setItem('publicTheme', next ? 'dark' : 'light');
    return next;
  });
};

  const handleSlugChange = (value: string) => {
    slugManuallyEdited.current = true;
    const clean = slugify(value);
    up('slug', clean);
    setSlugStatus('idle');
    if (slugRef.current) clearTimeout(slugRef.current);
    slugRef.current = setTimeout(() => checkSlug(clean), 500);
  };

  const canPreview =
    form.nomeEmpresa.length >= 2 &&
    form.chavePix.length >= 5 &&
    form.slug.length >= 3 &&
    slugStatus === 'available';

  const PREVIEW_TARGET_COMPANY_ID = '3bf1e6ec-e139-4a43-9294-cf88a074355b';
  
  const previewCompany = {
   id: PREVIEW_TARGET_COMPANY_ID, name: form.nomeEmpresa, slug: form.slug, logo_url: form.logoUrl || null,
  };

  const createAfterAuth = useCallback(async (userId: string) => {
   const { data: company, error } = await supabase
     .rpc('ensure_my_pix_wiki_company', {
       p_slug: form.slug,
       p_name: form.nomeEmpresa,
       p_logo_url: form.logoUrl || null,
       p_whatsapp: form.whatsapp || null,
       p_email: form.emailContato || null,
     })
     .single();

   if (error || !company) throw new Error('Erro ao criar empresa.');

    await supabase.from('user_profiles').upsert({
      user_id: userId,
      withdrawal_pix_key: form.chavePix,
      withdrawal_pix_key_type: form.chavePixTipo || null,
      documento: form.documento || null,
      documento_tipo: form.documentoTipo || null,
    }, { onConflict: 'user_id' });

    await supabase.from('short_links').insert({
      slug: company.slug, type: 'pix_wiki',
      company_id: company.id, user_id: userId,
      original_url: `https://minhai.app/pix/${company.slug}`,
    });

    await supabase.from('demo_sessions').insert({
      nome_negocio: form.nomeEmpresa,
      email: form.emailContato || null,
      phone: form.whatsapp || null,
      origem_simples: 'pixwiki',
      linked_user_id: userId, linked_company_id: company.id,
      linked_at: new Date().toISOString(), status: 'converted',
    });

    router.replace('/pix/conta?bemvindo=1');
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
   // Guarda os dados do formulário pra retomar depois do login. A criação da
   // empresa acontece de forma lazy em /pix/conta (mesmo padrão do
   // ensure_my_arte_company() do ArteFinal) — o /auth/callback compartilhado
   // não precisa saber nada sobre Pix Wiki.
   localStorage.setItem('pixWikiPendingSignup', JSON.stringify({
     slug: form.slug,
     nome: form.nomeEmpresa,
     pix: form.chavePix,
     pixTipo: form.chavePixTipo || null,
     logo: form.logoUrl || null,
     doc: form.documento || null,
     docTipo: form.documentoTipo || null,
     wa: form.whatsapp || null,
     email: form.emailContato || null,
   }));
   await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/pix/conta')}`,
       queryParams: { access_type: 'offline', prompt: 'consent' },
     },
   });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail || !authSenha || authSenha.length < 6) {
      setAuthError('E-mail e senha (mín. 6 caracteres) são obrigatórios.');
      return;
    }
    setStep('creating');
    const { data: su, error: suErr } = await supabase.auth.signUp({ email: authEmail, password: authSenha });
    if (!suErr && su.user) { await createAfterAuth(su.user.id); return; }

   // Se o signUp falhou por um motivo que NÃO é "conta já existe", mostra o erro real
   // em vez de tentar o fallback de login (que sempre falharia com mensagem confusa).
   if (suErr && !suErr.message.toLowerCase().includes('already registered')) {
     setAuthError(
       suErr.message.includes('weak')
         ? 'Essa senha é considerada fraca ou já vazou em bancos de dados públicos. Escolha outra senha.'
         : suErr.message
     );
     setStep('auth');
    return;
   }

    const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email: authEmail, password: authSenha });
    if (siErr || !si.user) {
      setAuthError(siErr?.message || 'E-mail ou senha incorretos.');
      setStep('auth'); return;
    }
    await createAfterAuth(si.user.id);
  };

  // ─── STEP: criando ────────────────────────────────────────────────────────
  if (step === 'creating') return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${p.pageBg}`}>
      <ThemeToggle dark={dark} onToggle={toggleDark} />
      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      <p className={`text-sm ${p.textMuted}`}>Configurando seu link PIX…</p>
    </div>
  );

  // ─── STEP: preview ────────────────────────────────────────────────────────
  if (step === 'preview') return (
    <div className={`min-h-screen flex flex-col ${p.pageBg}`}>
      <ThemeToggle dark={dark} onToggle={toggleDark} />
      <div className={`${p.cardBg} border-b ${p.border} px-4 py-3 flex items-center justify-between gap-3 pr-16`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setStep('form')}
            className={`text-sm flex-shrink-0 transition-colors ${p.textMuted} hover:${p.text}`}
          >
            ← Editar
          </button>
          <div className={`h-4 w-px flex-shrink-0 ${p.divider}`} />
          <span className={`text-xs truncate ${p.textFaint}`}>
            pix.wiki/<span className="text-green-500 font-semibold">{form.slug}</span>
          </span>
        </div>
        <button
          onClick={() => setStep('auth')}
          className="flex-shrink-0 px-4 py-1.5 bg-green-500 text-white text-sm font-bold rounded-full hover:bg-green-400 transition-all active:scale-95"
        >
          Ativar meu link →
        </button>
      </div>

     <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center">
       <p className="text-amber-500 text-xs font-medium">
         ⚠️ Isso é uma demonstração — não conclua o pagamento. Depois de ativar
         sua conta, você gera PIX de verdade no seu próprio link.
       </p>
     </div>
      
      <div className="flex-1 overflow-auto">
        <PixLinkPage company={previewCompany} initialAmount={null} />
      </div>
    </div>
  );

  // ─── STEP: auth ───────────────────────────────────────────────────────────
  if (step === 'auth') return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-10 ${p.pageBg}`}>
      <ThemeToggle dark={dark} onToggle={toggleDark} />
      <Logos />
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className={`text-xl font-bold mb-1 ${p.text}`}>
            pix.wiki/<span className="text-green-500">{form.slug}</span>
          </div>
          <p className={`text-sm ${p.textMuted}`}>Crie sua conta gratuita pra ativar o link</p>
        </div>
        <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${p.cardBg} ${p.border}`}>
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
            <div className={`flex-1 h-px ${p.divider}`} />
            <span className={`text-xs ${p.textFaint}`}>ou</span>
            <div className={`flex-1 h-px ${p.divider}`} />
          </div>
          <form onSubmit={handleEmailSignup} className="flex flex-col gap-2">
            <Input value={authEmail} onChange={setAuthEmail} placeholder="Seu e-mail" type="email" dark={dark} />
            <Input value={authSenha} onChange={setAuthSenha} placeholder="Senha (mín. 6 caracteres)" type="password" dark={dark} />
            {authError && <p className="text-red-500 text-xs">{authError}</p>}
            <button type="submit" disabled={step === 'creating'} className="w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-400 transition-all active:scale-95 disabled:opacity-50">
              Criar conta e ativar link
            </button>
          </form>
        </div>
        <button
          onClick={() => setStep('preview')}
          className={`mt-4 w-full text-center text-xs transition-colors ${p.textFaint} hover:${p.textMuted}`}
        >
          ← Voltar ao preview
        </button>
      </div>
      <Footer dark={dark} />
    </div>
  );

  // ─── STEP: formulário (default) ───────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-12 ${p.pageBg}`}>
      <ThemeToggle dark={dark} onToggle={toggleDark} />
      <div className="w-full max-w-md">
        <Logos />

        <div className="text-center mb-7">
          
          <h1 className={`text-2xl sm:text-3xl font-bold leading-tight mb-2 ${p.text}`}>
            Nunca mais perca uma venda<br />
            <span className="text-green-500">por comprovante falso</span>
          </h1>
          <p className={`text-sm leading-relaxed ${p.textMuted}`}>
            Crie seu link de cobrança PIX. Quando o cliente pagar, você recebe
            confirmação automática no{' '}
            <span className={`font-medium ${p.text}`}>dashboard</span>, por{' '}
            <span className={`font-medium ${p.text}`}>e-mail</span> e no{' '}
            <span className={`font-medium ${p.text}`}>WhatsApp</span>
            {' '}- sem mensalidade e sem preocupação.
          </p>
        </div>

        <div className={`rounded-2xl border p-5 sm:p-6 flex flex-col gap-4 ${p.cardBg} ${p.border}`}>

          <Field label="Nome da empresa" dark={dark}>
            <Input
              value={form.nomeEmpresa}
              onChange={v => {
                up('nomeEmpresa', v);
                if (!slugManuallyEdited.current) {
                  const s = slugify(v);
                  up('slug', s);
                  if (slugRef.current) clearTimeout(slugRef.current);
                  slugRef.current = setTimeout(() => checkSlug(s), 600);
                }
              }}
              placeholder="Ex: Hamburgueria do Carlos"
              dark={dark}
            />
          </Field>

          <Field label="Seu link" dark={dark}>
            <div className={`flex items-center rounded-xl overflow-hidden border focus-within:border-green-500/60 transition-colors ${p.inputBg} ${p.inputBorder}`}>
              <span className={`pl-4 pr-1 text-sm flex-shrink-0 ${p.textFaint}`}>pix.wiki/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="minha-loja"
                className={`flex-1 py-2.5 pr-2 bg-transparent text-sm focus:outline-none ${p.inputText} ${p.inputPh}`}
              />
              <div className="px-3 w-8 flex justify-center flex-shrink-0">
                {slugStatus === 'checking' && (
                  <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${dark ? 'border-white/20' : 'border-black/20'}`} />
                )}
                {slugStatus === 'available' && <span className="text-green-500 text-sm font-bold">✓</span>}
                {slugStatus === 'taken'     && <span className="text-red-500 text-sm font-bold">✗</span>}
              </div>
            </div>
            {slugStatus === 'taken'   && <p className="text-red-500 text-xs">Esse link já está em uso. Tente outro.</p>}
            {slugStatus === 'invalid' && <p className="text-yellow-600 text-xs">Use apenas letras, números e hífens.</p>}
          </Field>

          <Field label="Chave PIX para receber os saques" hint="CPF, CNPJ, e-mail, telefone ou chave aleatória" dark={dark}>
            <Input
              value={form.chavePix}
              onChange={v => { up('chavePix', v); up('chavePixTipo', detectChavePixTipo(v)); }}
              placeholder="Sua chave pra sacar o saldo"
              dark={dark}
            />
            {form.chavePixTipo && (
              <p className={`text-[10px] -mt-1 capitalize ${p.textFaint}`}>Detectado: {form.chavePixTipo}</p>
            )}
          </Field>

          {/* Mais opções */}
          <details className="group">
            <summary className={`cursor-pointer text-xs transition-colors select-none list-none flex items-center gap-1.5 ${p.summaryText}`}>
              <svg className="w-3 h-3 transition-transform group-open:rotate-90 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Mais opções (WhatsApp, e-mail, logo, CNPJ)
            </summary>
            <div className={`flex flex-col gap-3 mt-3 pt-3 border-t ${p.detailBorder}`}>
              <Field label="WhatsApp" optional hint="Para receber confirmações de pagamento" dark={dark}>
                <Input value={form.whatsapp} onChange={v => up('whatsapp', v)} placeholder="(11) 99999-9999" dark={dark} />
              </Field>
              <Field label="E-mail de contato" optional hint="Para receber confirmações de pagamento" dark={dark}>
                <Input value={form.emailContato} onChange={v => up('emailContato', v)} placeholder="contato@suaempresa.com" type="email" dark={dark} />
              </Field>
              <Field label="URL do logo" optional dark={dark}>
                <Input value={form.logoUrl} onChange={v => up('logoUrl', v)} placeholder="https://suaempresa.com/logo.png" type="url" dark={dark} />
              </Field>
              <Field label="CNPJ ou CPF" optional hint="Necessário para emissão de notas fiscais." dark={dark}>
                <Input
                  value={form.documento}
                  onChange={v => { up('documento', v); up('documentoTipo', detectDocumentoTipo(v)); }}
                  placeholder="00.000.000/0000-00 ou 000.000.000-00"
                  dark={dark}
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
            <p className={`text-xs text-center -mt-2 ${p.textFaint}`}>
              Preencha o nome, a chave PIX e escolha um link disponível
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
          {['Confirmação automática', 'Sem maquininha', 'Zero comprovante falso'].map(t => (
            <span key={t} className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${p.badgeBg}`}>{t}</span>
          ))}
        </div>

        <p className={`text-center mt-3 text-xs ${p.textFaint}`}>
          Recebeu uma cobrança?{' '}
          <a href="/pix/suporte" className={`transition-colors ${p.footerLink}`}>
            Clique no link que veio na mensagem
          </a>
        </p>

        <Footer dark={dark} />
      </div>
    </div>
  );
}
