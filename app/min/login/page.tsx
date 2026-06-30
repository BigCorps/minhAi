'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle, Moon, Sun } from 'lucide-react';
import { useTurnstile } from '@/hooks/useTurnstile';

const BRAND = { blue: '#3B82F6', green: '#10B981' };
const GRAD = `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.green} 100%)`;

export default function MinLoginPage() {
  // ── Guard de hidratação do tema — mesmo fix aplicado em /min/page.tsx ──
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [loading, setLoading]           = useState(false);
  const [mode, setMode]                 = useState<'login' | 'signup'>('login');
  const [error, setError]               = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { getToken, containerRef } = useTurnstile();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlError = searchParams.get('error');
    if (urlError === 'auth_error')     setError('Erro na autenticação. Tente novamente.');
    if (urlError === 'callback_error') setError('Erro inesperado no login. Tente novamente.');
  }, []);

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
          router.push('/min');
        } else {
          alert('Cadastro realizado! Verifique seu email para confirmar.');
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/min');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao autenticar. Tente novamente.');
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
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/min` },
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
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/min` },
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login com Facebook.');
      setLoading(false);
    }
  }

  // Evita flash de tema errado — mesmo padrão usado em /min/page.tsx
  if (!mounted) {
    return <div className="min-h-screen" style={{ background: 'rgb(248,250,252)' }} />;
  }

  const T = {
    pageBg: isDark
      ? 'linear-gradient(135deg, rgb(2,6,23) 0%, rgb(15,23,42) 100%)'
      : 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #ecfdf5 100%)',
    card:       isDark ? 'rgb(15,23,42)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    text:       isDark ? '#f1f5f9' : '#0f172a',
    subtext:    isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
    inputBg:    isDark ? 'rgba(30,41,59,0.6)' : '#ffffff',
    inputBorder:isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb',
    divider:    isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6" style={{ background: T.pageBg }}>
      <div className="max-w-md w-full">
        <div className="rounded-2xl shadow-xl p-5 sm:p-8 border" style={{ background: T.card, borderColor: T.cardBorder }}>

          {/* Toggle de tema */}
          <div className="flex justify-end mb-2 -mt-2 -mr-2">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-full transition-colors"
              style={{ color: T.subtext }}
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Logos */}
          <div className="text-center mb-6 -mt-4">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-16 h-16 overflow-hidden rounded-full flex-shrink-0">
                <Image src="/minia/logo.png" alt="Min.IA" width={64} height={64} className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-thin select-none flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db' }}>|</span>
              <div className="w-10 h-10 overflow-hidden rounded-full flex-shrink-0">
                <Image src="/icon.png" alt="minhAi" width={40} height={40} className="w-full h-full object-cover" />
              </div>
            </div>

            <h1 className="text-xl font-bold mb-1" style={{ color: T.text }}>
              {mode === 'login' ? 'Entrar no Min.IA' : 'Criar sua conta'}
            </h1>
            <p className="text-sm" style={{ color: T.subtext }}>
              {mode === 'login'
                ? 'Entre com sua conta minhAi para utilizar o Min.IA'
                : 'Crie sua conta minhAi para utilizar o Min.IA'}
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div
              className="mb-5 p-4 rounded-lg flex items-start gap-3 border"
              style={{ background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca' }}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>{error}</p>
                {(error.includes('já possui cadastro') || error.includes('já tem cadastro')) && (
                  <button
                    onClick={() => { setError(null); setMode('login'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="mt-2 text-xs font-semibold underline underline-offset-2 hover:no-underline"
                    style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}
                  >
                    Ir para o login com email e senha →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: T.text }}>
                  Nome Completo
                </label>
                <input
                  type="text" id="name" name="name" required={mode === 'signup'}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                  style={{ background: T.inputBg, color: T.text, borderColor: T.inputBorder, '--tw-ring-color': BRAND.blue } as any}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: T.text }}>
                Email
              </label>
              <input
                type="email" id="email" name="email" required
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                style={{ background: T.inputBg, color: T.text, borderColor: T.inputBorder, '--tw-ring-color': BRAND.blue } as any}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: T.text }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password" name="password" required
                  placeholder="••••••••" minLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
                  style={{ background: T.inputBg, color: T.text, borderColor: T.inputBorder, '--tw-ring-color': BRAND.blue } as any}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: T.subtext }}
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
              className="w-full px-6 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50"
              style={{ background: GRAD }}
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: T.divider }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2" style={{ background: T.card, color: T.subtext }}>ou</span>
            </div>
          </div>

          {/* OAuth */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full px-6 py-2.5 rounded-xl border transition flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ borderColor: T.inputBorder }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium" style={{ color: T.text }}>Continuar com Google</span>
            </button>

            <button
              onClick={handleFacebookLogin}
              disabled={loading}
              className="w-full px-6 py-2.5 rounded-xl border transition flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ borderColor: T.inputBorder }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="font-medium" style={{ color: T.text }}>Continuar com Facebook</span>
            </button>
          </div>

          {/* Trocar modo */}
          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
              className="text-sm font-medium transition-colors hover:underline"
              style={{ color: BRAND.blue }}
            >
              {mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Fazer login'}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: T.divider }}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/min/termos" className="transition-colors hover:underline" style={{ color: T.subtext }}>
                Termos de Uso
              </Link>
              <span className="hidden sm:inline" style={{ color: isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb' }}>•</span>
              <Link href="/min/aviso" className="transition-colors hover:underline" style={{ color: T.subtext }}>
                Aviso de Privacidade
              </Link>
            </div>
            <p className="mt-3 text-center text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#d1d5db' }}>
              Powered by{' '}
              <a
                href="https://minhai.app" target="_blank" rel="noopener noreferrer"
                className="font-semibold hover:underline"
                style={{ color: BRAND.blue }}
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
