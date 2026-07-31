'use client';

// app/consultatec/login/page.tsx
// Porta fiel da lógica de /arte/login: mesma biometria WebAuthn, Turnstile,
// OAuth Google/Facebook e email+senha — só troca tema (creme/preto) e
// redirects (/arte → /consultatec). Infra de auth é compartilhada entre
// produtos minhAi de propósito (mesma auth.users), então localStorage
// 'lastLoggedInUser' e os edge functions webauthn-* seguem os mesmos.

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Eye, EyeOff, Loader2,
  Fingerprint, Smile, AlertCircle
} from 'lucide-react';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useTurnstile } from '@/hooks/useTurnstile';

const cor = {
  fundo: '#F2EAD3',
  fundoCard: '#FBF6E9',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  tintaMuted: '#6B6350',
  destaque: '#2F4F3A',
  destaqueHover: '#25402E',
  erroBg: '#F4E4E0',
  erroTexto: '#7A2E2E',
};

export default function ConsultaTecLoginPage() {
  const [loading, setLoading]               = useState(false);
  const [mode, setMode]                     = useState<'login' | 'signup'>('login');
  const [error, setError]                   = useState<string | null>(null);
  const [showPassword, setShowPassword]     = useState(false);

  const [biometricUserEmail, setBiometricUserEmail]   = useState<string | null>(null);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);
  const [biometricType, setBiometricType]             = useState<'fingerprint' | 'face' | 'unknown'>('unknown');

  const { getToken, containerRef, ready: turnstileReady } = useTurnstile();

  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlError = searchParams.get('error');
    if (urlError === 'auth_error')     setError('Erro na autenticação. Tente novamente.');
    if (urlError === 'callback_error') setError('Erro inesperado no login. Tente novamente.');

    const safetyTimeout = setTimeout(() => setIsCheckingBiometrics(false), 3000);

    const checkBiometrics = async () => {
      try {
        if (!browserSupportsWebAuthn()) return;

        const isLikelyFaceID = /iPhone/i.test(navigator.userAgent);
        setBiometricType(isLikelyFaceID ? 'face' : 'fingerprint');

        const lastUserEmail =
          localStorage.getItem('lastLoggedInUser') ||
          document.cookie.match(/lastLoggedInUser=([^;]+)/)?.[1] ||
          null;

        if (!lastUserEmail) return;

        const rpcPromise = supabase.rpc('has_webauthn_credential_by_email', { p_email: lastUserEmail });
        const timeoutPromise = new Promise<{ data: null; error: Error }>(
          (resolve) => setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 2500)
        );

        const { data, error: rpcError } = await Promise.race([rpcPromise, timeoutPromise]);
        if (!rpcError && data === true) setBiometricUserEmail(lastUserEmail);
      } catch (err) {
        console.error('Falha ao verificar biometria:', err);
      } finally {
        clearTimeout(safetyTimeout);
        setIsCheckingBiometrics(false);
      }
    };

    checkBiometrics();
    return () => clearTimeout(safetyTimeout);
  }, [supabase]);

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (token) {
        const { data: td, error: te } = await supabase.functions.invoke('validate-turnstile', { body: { token } });
        if (te || !td?.success) {
          setError(td?.error || 'Verificação de segurança falhou. Tente novamente.');
          return;
        }
      }

      const formData = new FormData(form);
      const email    = formData.get('email')    as string;
      const password = formData.get('password') as string;
      const name     = formData.get('name')     as string;

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        if (data.session) {
          localStorage.setItem('lastLoggedInUser', email);
          router.push('/consultatec');
        } else {
          alert('Cadastro realizado! Verifique seu email para confirmar.');
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('lastLoggedInUser', email);
        router.push('/consultatec');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao autenticar. Tente novamente.');
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

      const authResponse = await startAuthentication(options);

      const { data: verification, error: verificationError } = await supabase.functions.invoke(
        'webauthn-verify-authentication',
        { body: { expectedChallenge: options.challenge, authenticationResponse: authResponse } }
      );
      if (verificationError || !verification.success)
        throw new Error(verification?.error || 'Falha na verificação biométrica.');

      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'webauthn-create-session',
        { body: { email: verification.email, user_id: verification.user_id } }
      );
      if (sessionError || !sessionData.success) throw new Error('Falha ao estabelecer a sessão.');

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token:  sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      });
      if (setSessionError) throw setSessionError;

      localStorage.setItem('lastLoggedInUser', verification.email);
      router.push('/consultatec');
    } catch (error: any) {
      const msg: string = error.message || '';
      if (msg.includes('timed out') || msg.includes('not allowed') || msg.includes('cancel')) {
        setError('Autenticação cancelada ou expirada. Tente novamente ou use email e senha.');
      } else if (msg.includes('No credentials') || msg.includes('not found')) {
        setError('Biometria não encontrada neste dispositivo.');
      } else {
        setError('Falha na autenticação biométrica. Use email e senha.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/consultatec` },
      });
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('user_already_exists')) {
          setError('Este email já possui cadastro com senha. Faça login com email e senha.');
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login com Google.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFacebookLogin() {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/consultatec` },
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login com Facebook.');
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: cor.fundo }}
    >
      <div className="max-w-md w-full">
        <div
          className="rounded-2xl shadow-xl p-5 sm:p-8 border"
          style={{ backgroundColor: cor.fundoCard, borderColor: cor.borda }}
        >

          {/* Logo duplo ConsultaTec | minhAi */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-16 h-16 overflow-hidden rounded-full flex-shrink-0">
                <Image
                  src="/brands/consultatec/logo.png"
                  alt="ConsultaTec"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="text-2xl font-thin select-none flex-shrink-0" style={{ color: cor.borda }}>
                |
              </span>

              <div className="w-10 h-10 overflow-hidden rounded-full flex-shrink-0">
                <Image
                  src="/icon.png"
                  alt="minhAi"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h1 className="font-serif text-xl font-bold mb-1" style={{ color: cor.tinta }}>
              {mode === 'login' ? 'Entrar no ConsultaTec' : 'Criar sua conta'}
            </h1>
            <p className="text-sm" style={{ color: cor.tintaMuted }}>
              {mode === 'login'
                ? 'Entre com sua conta minhAi para usar o ConsultaTec'
                : 'Crie sua conta minhAi para usar o ConsultaTec'}
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="mb-5 p-4 rounded-lg border flex items-start gap-3" style={{ backgroundColor: cor.erroBg, borderColor: cor.erroTexto }}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: cor.erroTexto }} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: cor.erroTexto }}>{error}</p>
                {(error.includes('já possui cadastro') || error.includes('já tem cadastro')) && (
                  <button
                    onClick={() => { setError(null); setMode('login'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="mt-2 text-xs font-semibold underline underline-offset-2 hover:no-underline"
                    style={{ color: cor.erroTexto }}
                  >
                    Ir para o login com email e senha →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Biometria */}
          {isCheckingBiometrics ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: cor.destaque }} />
            </div>
          ) : mode === 'login' && biometricUserEmail ? (
            <div className="mb-5 space-y-3">
              <div className="text-center p-3 rounded-2xl border" style={{ borderColor: cor.borda, backgroundColor: cor.fundo }}>
                <p className="text-xs mb-1" style={{ color: cor.tintaMuted }}>Entrar como</p>
                <p className="font-bold" style={{ color: cor.tinta }}>{biometricUserEmail}</p>
              </div>

              <button
                onClick={handleBiometricLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                style={{ backgroundColor: cor.destaque, color: cor.fundo }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {biometricType === 'face' ? <Smile className="w-6 h-6" /> : <Fingerprint className="w-6 h-6" />}
                    <span>{biometricType === 'face' ? 'Entrar com Rosto' : 'Entrar com Digital'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setBiometricUserEmail(null)}
                className="w-full text-sm hover:opacity-70 transition-colors"
                style={{ color: cor.tintaMuted }}
              >
                Entrar com outra conta
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: cor.borda }} />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2" style={{ backgroundColor: cor.fundoCard, color: cor.tintaMuted }}>ou use seu e-mail</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Formulário */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: cor.tinta }}>
                  Nome Completo
                </label>
                <input
                  type="text" id="name" name="name" required={mode === 'signup'}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                  style={{ backgroundColor: cor.fundo, borderColor: cor.borda, color: cor.tinta, ['--tw-ring-color' as any]: cor.destaque }}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: cor.tinta }}>
                Email
              </label>
              <input
                type="email" id="email" name="email" required
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                style={{ backgroundColor: cor.fundo, borderColor: cor.borda, color: cor.tinta, ['--tw-ring-color' as any]: cor.destaque }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: cor.tinta }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password" name="password" required
                  placeholder="••••••••" minLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                  style={{ backgroundColor: cor.fundo, borderColor: cor.borda, color: cor.tinta, ['--tw-ring-color' as any]: cor.destaque }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                  style={{ color: cor.tintaMuted }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Turnstile invisível */}
            <div
              ref={containerRef}
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
              aria-hidden="true"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
              style={{ backgroundColor: cor.destaque, color: cor.fundo }}
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: cor.borda }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2" style={{ backgroundColor: cor.fundoCard, color: cor.tintaMuted }}>ou</span>
            </div>
          </div>

          {/* OAuth */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full px-6 py-2.5 rounded-xl border hover:opacity-80 transition flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ borderColor: cor.borda }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium" style={{ color: cor.tinta }}>Continuar com Google</span>
            </button>

            <button
              onClick={handleFacebookLogin}
              disabled={loading}
              className="w-full px-6 py-2.5 rounded-xl border hover:opacity-80 transition flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ borderColor: cor.borda }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="font-medium" style={{ color: cor.tinta }}>Continuar com Facebook</span>
            </button>
          </div>

          {/* Trocar modo */}
          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
              className="text-sm font-medium transition-colors hover:underline"
              style={{ color: cor.destaque }}
            >
              {mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Fazer login'}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: cor.borda }}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/consultatec/termos" className="hover:opacity-70 transition-colors" style={{ color: cor.tintaMuted }}>
                Termos de Uso
              </Link>
              <span className="hidden sm:inline" style={{ color: cor.borda }}>•</span>
              <Link href="/consultatec/aviso" className="hover:opacity-70 transition-colors" style={{ color: cor.tintaMuted }}>
                Aviso de Privacidade
              </Link>
            </div>
            <p className="mt-3 text-center text-xs" style={{ color: cor.tintaMuted }}>
              Powered by{' '}
              <a
                href="https://minhai.app" target="_blank" rel="noopener noreferrer"
                className="font-semibold hover:underline"
                style={{ color: cor.destaque }}
              >
                minhAi.app
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
