'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Mail, Lock, Eye, EyeOff, Loader2, 
  Fingerprint, Smile, AlertCircle 
} from 'lucide-react';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showPassword, setShowPassword] = useState(false);
  
  // Biometrics states
  const [biometricUserEmail, setBiometricUserEmail] = useState<string | null>(null);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'unknown'>('unknown');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');

    const checkBiometricAvailability = async () => {
      if (browserSupportsWebAuthn()) {
        const isLikelyFaceID = /iPhone/i.test(navigator.userAgent);
        setBiometricType(isLikelyFaceID ? 'face' : 'fingerprint');

        const lastUserEmail = localStorage.getItem('lastLoggedInUser') 
          || document.cookie.match(/lastLoggedInUser=([^;]+)/)?.[1] 
          || null;
        if (lastUserEmail) {
          try {
            // Check if user has biometric credential via RPC (same as poupeja)
            const { data, error } = await supabase.rpc('has_webauthn_credential_by_email', { p_email: lastUserEmail });
            if (!error && data === true) {
              setBiometricUserEmail(lastUserEmail);
            }
          } catch (err) {
            console.error("Falha ao verificar disponibilidade de biometria:", err);
          }
        }
      }
      setIsCheckingBiometrics(false);
    };
    checkBiometricAvailability();
  }, [supabase]);

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (error) throw error;
        alert('Cadastro realizado! Verifique seu email para confirmar.');
        setMode('login');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        localStorage.setItem('lastLoggedInUser', email);
        router.push('/dashboard');
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
      // 1. Get authentication options from Edge Function
      const { data: options, error: optionsError } = await supabase.functions.invoke('webauthn-authentication-options');
      if (optionsError) throw new Error('Não foi possível iniciar a biometria.');

      // 2. Start browser authentication
      const authResponse = await startAuthentication(options);

      // 3. Verify authentication via Edge Function
      const { data: verification, error: verificationError } = await supabase.functions.invoke(
        'webauthn-verify-authentication', 
        { 
          body: { 
            expectedChallenge: options.challenge, 
            authenticationResponse: authResponse 
          } 
        }
      );

      if (verificationError || !verification.success) {
        throw new Error(verification.error || 'Falha na verificação biométrica.');
      }

      // 4. Create session via Edge Function
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'webauthn-create-session', 
        { 
          body: { 
            email: verification.email, 
            user_id: verification.user_id 
          } 
        }
      );

      if (sessionError || !sessionData.success) {
        throw new Error('Falha ao estabelecer a sessão.');
      }

      // 5. Set session in Supabase client
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      });

      if (setSessionError) throw setSessionError;

      localStorage.setItem('lastLoggedInUser', verification.email);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Erro no login biométrico:', error);
      setError(error.message);
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
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login com Google.');
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={`fixed top-6 right-6 z-50 p-3 rounded-full backdrop-blur-xl border transition-all hover:scale-110 ${
          theme === 'dark'
            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
        }`}
      >
        {theme === 'dark' ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="max-w-md w-full">
        <div className={`rounded-2xl shadow-xl p-8 transition-colors ${
          theme === 'dark' 
            ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10' 
            : 'bg-white'
        }`}>
          <div className="text-center mb-8">
            <Image 
              src="/logo.png" 
              alt="eAi" 
              width={190} 
              height={98}
              className="mx-auto mb-4 rounded-xl"
            />
            <h1 className={`text-2xl font-bold mb-2 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </h1>
            <p className={`transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              {mode === 'login' 
                ? 'Acesse sua conta' 
                : 'Crie sua conta para começar'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {isCheckingBiometrics ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : mode === 'login' && biometricUserEmail ? (
            <div className="mb-6 space-y-4">
              <div className={`text-center p-4 rounded-2xl border ${
  theme === 'dark' 
    ? 'bg-slate-700/50 border-white/10' 
    : 'bg-blue-50 border-blue-100'
}`}>
  <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>Entrar como</p>
  <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{biometricUserEmail}</p>
</div>

              <button
                onClick={handleBiometricLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
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
                className={`w-full text-sm transition-colors ${
                  theme === 'dark' ? 'text-white/40 hover:text-white/60' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Entrar com outra conta
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className={`px-2 ${theme === 'dark' ? 'bg-slate-800/50 text-white/40' : 'bg-white text-gray-500'}`}>ou use seu e-mail</span>
                </div>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className={`block text-sm font-medium mb-2 transition-colors ${
                  theme === 'dark' ? 'text-white/90' : 'text-gray-700'
                }`}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required={mode === 'signup'}
                  placeholder="Seu nome"
                  className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 border border-white/10 text-white placeholder-white/40'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className={`block text-sm font-medium mb-2 transition-colors ${
                theme === 'dark' ? 'text-white/90' : 'text-gray-700'
              }`}>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="seu@email.com"
                className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-700/50 border border-white/10 text-white placeholder-white/40'
                    : 'bg-white border border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium mb-2 transition-colors ${
                theme === 'dark' ? 'text-white/90' : 'text-gray-700'
              }`}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 border border-white/10 text-white placeholder-white/40'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-[#b0cb1f] text-white rounded-lg hover:bg-[#8ca214] transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t transition-colors ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-300'
              }`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-2 transition-colors ${
                theme === 'dark' ? 'bg-slate-800/50 text-white/40' : 'bg-white text-gray-500'
              }`}>ou</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
              theme === 'dark'
                ? 'bg-slate-700/50 border border-white/10 hover:bg-slate-700/70'
                : 'border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className={`font-medium transition-colors ${
              theme === 'dark' ? 'text-white/90' : 'text-gray-700'
            }`}>Continuar com Google</span>
          </button>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className={`text-sm transition-colors ${
                theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {mode === 'login' 
                ? 'Não tem conta? Criar conta' 
                : 'Já tem conta? Fazer login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
