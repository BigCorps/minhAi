'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    console.log('🔐 Tentando autenticação:', { email, mode });

    try {
      if (mode === 'signup') {
        console.log('📝 Criando nova conta...');
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (error) {
          console.error('❌ Erro no signup:', error);
          throw error;
        }

        console.log('✅ Conta criada com sucesso!', data);
        alert('Cadastro realizado! Verifique seu email para confirmar.');
        setMode('login');
      } else {
        console.log('🔑 Fazendo login...');
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('❌ Erro no login:', error);
          throw error;
        }

        console.log('✅ Login bem-sucedido!', data);
        console.log('🔄 Redirecionando para /...');
        
        // Redirecionar para raiz (dashboard)
        router.push('/');
        router.refresh();
      }
    } catch (error: any) {
      console.error('❌ Erro na autenticação:', error);
      setError(error.message || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    console.log('🔐 Iniciando login com Google...');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('❌ Erro no Google OAuth:', error);
        throw error;
      }

      console.log('✅ Redirecionando para Google...');
    } catch (error: any) {
      console.error('❌ Erro no Google login:', error);
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
      
      {/* Botão de Toggle de Tema */}
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
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

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
              <input
                type="password"
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
              {mode === 'signup' && (
                <p className={`mt-1 text-xs transition-colors ${
                  theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                }`}>Mínimo 6 caracteres</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-primary-green text-white rounded-lg hover:bg-primary-green-dark transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
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

          {/* Termos e Privacidade */}
          <div className="mt-6 text-center">
            <p
              className={`text-xs transition-colors ${
                theme === 'dark' ? 'text-white/50' : 'text-gray-500'
              }`}
            >
              Ao continuar, estou de acordo com os
              <br />
              <Link
                href="/termos"
                className={`underline transition-colors ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Termos de Uso
              </Link>{' '}
              e{' '}
              <Link
                href="/aviso"
                className={`underline transition-colors ${
                  theme === 'dark'
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Aviso de Privacidade
              </Link>
              .
            </p>
          </div>

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