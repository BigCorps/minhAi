'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Fingerprint, Loader2, Smile } from 'lucide-react';
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { createClient } from '@/lib/supabase-browser';
import { useTurnstile } from '@/hooks/useTurnstile';
import { useAssistant } from '@/contexts/AssistantContext';
import {
  clearFuncionarIAOnboardingDraft,
  completeFuncionarIAOnboardingDraft,
  loadFuncionarIAOnboardingDraft,
} from '@/lib/funcionaria-onboarding-draft';

const BRAND = {
  purple: '#6D28D9',
  purpleDark: '#5B21B6',
  lime: '#A3E635',
  graphite: '#111827',
  background: '#F8FAFC',
};

export default function FuncionarIALoginPage() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricUserEmail, setBiometricUserEmail] = useState<string | null>(null);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'unknown'>('unknown');
  const [pendingOnboarding, setPendingOnboarding] = useState(false);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);

  const { getToken, containerRef } = useTurnstile();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { setSelectedAssistant } = useAssistant();

  const completePendingOnboarding = useCallback(async (): Promise<boolean> => {
    const draft = await loadFuncionarIAOnboardingDraft();
    if (!draft) return false;

    const completed = await completeFuncionarIAOnboardingDraft(supabase, draft);
    setSelectedAssistant(completed.companyId, completed.companyName);
    await clearFuncionarIAOnboardingDraft();
    setHasPendingDraft(false);
    router.replace('/dashboard');
    router.refresh();
    return true;
  }, [router, setSelectedAssistant, supabase]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const destination = searchParams.get('destino');
    const onboardingPending = destination === 'onboarding';
    setPendingOnboarding(onboardingPending);
    if (onboardingPending) setMode(searchParams.get('mode') === 'login' ? 'login' : 'signup');
    else if (searchParams.get('mode') === 'signup') setMode('signup');

    if (onboardingPending) {
      loadFuncionarIAOnboardingDraft().then(draft => setHasPendingDraft(!!draft));
    }

    const urlError = searchParams.get('error');
    if (urlError === 'auth_error') setError('Erro na autenticação. Tente novamente.');
    if (urlError === 'callback_error') setError('Erro inesperado no login. Tente novamente.');

    const safetyTimeout = window.setTimeout(() => setIsCheckingBiometrics(false), 3000);

    async function checkBiometrics() {
      try {
        if (!browserSupportsWebAuthn()) return;

        setBiometricType(/iPhone/i.test(navigator.userAgent) ? 'face' : 'fingerprint');

        const lastUserEmail =
          localStorage.getItem('lastLoggedInUser') ||
          document.cookie.match(/lastLoggedInUser=([^;]+)/)?.[1] ||
          null;

        if (!lastUserEmail) return;

        const rpcPromise = supabase.rpc('has_webauthn_credential_by_email', {
          p_email: lastUserEmail,
        });
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          window.setTimeout(
            () => resolve({ data: null, error: new Error('timeout') }),
            2500
          )
        );

        const { data, error: rpcError } = await Promise.race([rpcPromise, timeoutPromise]);
        if (!rpcError && data === true) setBiometricUserEmail(lastUserEmail);
      } catch (err) {
        console.error('Falha ao verificar biometria:', err);
      } finally {
        window.clearTimeout(safetyTimeout);
        setIsCheckingBiometrics(false);
      }
    }

    checkBiometrics();
    return () => window.clearTimeout(safetyTimeout);
  }, [supabase]);

  // Retomada pós-OAuth ou pós-confirmação de e-mail. Se já existe sessão e o
  // rascunho do onboarding está no navegador, finaliza automaticamente — igual
  // ao fluxo da ConviteIA, sem mandar a pessoa voltar ao passo 7.
  useEffect(() => {
    if (!pendingOnboarding) return;
    let cancelled = false;

    (async () => {
      const draft = await loadFuncionarIAOnboardingDraft();
      if (cancelled || !draft) return;
      setHasPendingDraft(true);

      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;

      setLoading(true);
      setError(null);
      try {
        await completePendingOnboarding();
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Não foi possível ativar sua FuncionarIA.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [completePendingOnboarding, pendingOnboarding, supabase]);

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Ler antes do primeiro await: React pode limpar currentTarget depois que
    // o handler cede o controle (mesma correção usada na ConviteIA).
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (token) {
        const { data: turnstileData, error: turnstileError } = await supabase.functions.invoke(
          'validate-turnstile',
          { body: { token } }
        );
        if (turnstileError || !turnstileData?.success) {
          throw new Error(turnstileData?.error || 'Verificação de segurança falhou. Tente novamente.');
        }
      }

      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');
      const name = String(formData.get('name') || '').trim();

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            ...(pendingOnboarding ? {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/login?destino=onboarding')}`,
            } : {}),
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          localStorage.setItem('lastLoggedInUser', email);
          if (pendingOnboarding && (await completePendingOnboarding())) return;
          router.push('/onboarding');
          router.refresh();
        } else {
          alert(pendingOnboarding
            ? 'Cadastro criado! Sua FuncionarIA ficou salva. Confirme seu e-mail e entre para ativá-la.'
            : 'Cadastro realizado! Verifique seu email para confirmar.');
          setMode('login');
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      localStorage.setItem('lastLoggedInUser', email);
      if (pendingOnboarding && (await completePendingOnboarding())) return;
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    if (!biometricUserEmail) return;
    setLoading(true);
    setError(null);

    try {
      const { data: options, error: optionsError } = await supabase.functions.invoke(
        'webauthn-authentication-options',
        { body: { email: biometricUserEmail } }
      );
      if (optionsError) throw new Error('Não foi possível iniciar a biometria.');

      const authenticationResponse = await startAuthentication(options);

      const { data: verification, error: verificationError } = await supabase.functions.invoke(
        'webauthn-verify-authentication',
        {
          body: {
            expectedChallenge: options.challenge,
            authenticationResponse,
          },
        }
      );
      if (verificationError || !verification?.success) {
        throw new Error(verification?.error || 'Falha na verificação biométrica.');
      }

      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'webauthn-create-session',
        { body: { email: verification.email, user_id: verification.user_id } }
      );
      if (sessionError || !sessionData?.success) throw new Error('Falha ao estabelecer a sessão.');

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      });
      if (setSessionError) throw setSessionError;

      localStorage.setItem('lastLoggedInUser', verification.email);
      if (pendingOnboarding && (await completePendingOnboarding())) return;
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      const message = String(err?.message || '').toLowerCase();
      if (message.includes('timed out') || message.includes('not allowed') || message.includes('cancel')) {
        setError('Autenticação cancelada ou expirada. Tente novamente ou use email e senha.');
      } else if (message.includes('no credentials') || message.includes('not found')) {
        setError('Biometria não encontrada neste dispositivo.');
      } else {
        setError('Falha na autenticação biométrica. Use email e senha.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    setLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            pendingOnboarding ? '/login?destino=onboarding' : '/dashboard'
          )}`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err?.message || `Erro ao fazer login com ${provider === 'google' ? 'Google' : 'Facebook'}.`);
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background:
          'radial-gradient(circle at 12% 10%, rgba(109,40,217,.16), transparent 34%), radial-gradient(circle at 88% 90%, rgba(163,230,53,.18), transparent 34%), #F8FAFC',
      }}
    >
      <div className="w-full max-w-md">
        <section className="relative overflow-hidden rounded-3xl border border-violet-100 bg-white p-5 shadow-2xl shadow-violet-950/10 sm:p-8">
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.lime})` }}
          />

          <div className="mb-6 text-center">
            <Image
              src="/brands/funcionaria/logo.png"
              alt="FuncionarIA"
              width={120}
              height={120}
              priority
              className="mx-auto h-28 w-28 object-contain"
            />
            <h1 className="mt-3 text-2xl font-black tracking-tight" style={{ color: BRAND.graphite }}>
              {pendingOnboarding
                ? (mode === 'login' ? 'Entre para ativar sua FuncionarIA' : 'Crie sua conta para ativar')
                : (mode === 'login' ? 'Entrar na FuncionarIA' : 'Criar sua conta')}
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              A funcionária IA que veste a camisa da sua empresa, no presencial e no online.
            </p>
          </div>


          {pendingOnboarding && hasPendingDraft && (
            <div className="mb-5 rounded-2xl border border-lime-200 bg-lime-50 p-4 text-sm text-lime-900">
              <div className="font-black">Sua FuncionarIA está pronta.</div>
              <p className="mt-1 leading-5 text-lime-800">
                Seu visual, habilidades e configuração estão salvos. Entre ou crie sua conta para ativar tudo sem refazer o onboarding.
              </p>
              <Link href="/onboarding" className="mt-2 inline-block text-xs font-black text-[#6D28D9] hover:underline">
                Voltar e ajustar
              </Link>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isCheckingBiometrics ? (
            <div className="flex justify-center py-7">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: BRAND.purple }} />
            </div>
          ) : mode === 'login' && biometricUserEmail ? (
            <div className="mb-5 space-y-3">
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 text-center">
                <p className="text-xs text-slate-500">Entrar como</p>
                <p className="font-bold text-slate-900">{biometricUserEmail}</p>
              </div>
              <button
                onClick={handleBiometricLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl px-6 py-3 font-bold text-white transition disabled:opacity-50"
                style={{ background: BRAND.purple }}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {biometricType === 'face' ? <Smile className="h-6 w-6" /> : <Fingerprint className="h-6 w-6" />}
                    {biometricType === 'face' ? 'Entrar com Rosto' : 'Entrar com Digital'}
                  </>
                )}
              </button>
              <button
                onClick={() => setBiometricUserEmail(null)}
                className="w-full text-sm font-medium text-slate-400 hover:text-slate-600"
              >
                Entrar com outra conta
              </button>
              <Divider label="ou use seu e-mail" />
            </div>
          ) : null}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <Field label="Nome completo" name="name" type="text" placeholder="Seu nome" required />
            )}

            <Field label="Email" name="email" type="email" placeholder="seu@email.com" required />

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div
              ref={containerRef}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
              aria-hidden="true"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl px-6 py-3 font-black text-white shadow-lg shadow-violet-900/10 transition disabled:opacity-50"
              style={{ background: BRAND.purple }}
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <Divider label="ou" />

          <div className="space-y-3">
            <button
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar com Google
            </button>

            <button
              onClick={() => handleOAuth('facebook')}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continuar com Facebook
            </button>
          </div>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setMode((current) => (current === 'login' ? 'signup' : 'login'));
                setError(null);
              }}
              className="text-sm font-bold hover:underline"
              style={{ color: BRAND.purpleDark }}
            >
              {mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Fazer login'}
            </button>
          </div>

          <footer className="mt-6 border-t border-slate-100 pt-5 text-center">
            <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
              <Link href="https://www.minhai.app/termos" className="hover:text-slate-600">
                Termos de Uso
              </Link>
              <span>•</span>
              <Link href="https://www.minhai.app/aviso" className="hover:text-slate-600">
                Privacidade
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Tecnologia <span className="font-bold" style={{ color: BRAND.purpleDark }}>minhAi</span> • BigCorps
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white px-2 text-slate-400">{label}</span>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </div>
  );
}
