'use client';

// app/pix/login/page.tsx — login para usuário recorrente do Pix Wiki
// Mesmo padrão visual/tema do restante do fluxo /pix.

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const D = {
  pageBg: 'bg-[#020617]', cardBg: 'bg-[#0f172a]', border: 'border-white/10',
  text: 'text-white', textMuted: 'text-white/50', textFaint: 'text-white/25',
  inputBg: 'bg-white/5', inputBorder: 'border-white/10', inputText: 'text-white', inputPh: 'placeholder-white/25',
  divider: 'bg-white/8',
};
const L = {
  pageBg: 'bg-white', cardBg: 'bg-black/[0.03]', border: 'border-black/8',
  text: 'text-gray-900', textMuted: 'text-gray-500', textFaint: 'text-black/25',
  inputBg: 'bg-black/5', inputBorder: 'border-black/10', inputText: 'text-gray-900', inputPh: 'placeholder-black/25',
  divider: 'bg-black/8',
};

export default function PixLoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [dark, setDark] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('publicTheme') as 'dark' | 'light' | null;
    if (saved) { setDark(saved === 'dark'); return; }
    setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/pix/conta');
    });
  }, [supabase, router]);

  const p = dark ? D : L;

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/pix/conta')}` },
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !senha) { setError('Preencha e-mail e senha.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (err) { setError('E-mail ou senha incorretos.'); return; }
    router.replace('/pix/conta');
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-12 ${p.pageBg}`}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image src="/brands/pix/pixwiki.png" alt="Pix Wiki" width={90} height={36} className="object-contain h-9 w-auto" />
        </div>
        <h1 className={`text-xl font-bold text-center mb-6 ${p.text}`}>Entrar na sua conta</h1>

        <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${p.cardBg} ${p.border}`}>
          <button
            onClick={handleGoogleLogin}
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
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-2">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
            />
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="Senha"
              className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none ${p.inputBg} ${p.inputBorder} ${p.inputText} ${p.inputPh}`}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-400 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className={`text-center mt-4 text-xs ${p.textFaint}`}>
          Ainda não tem conta?{' '}
          <a href="/pix" className="text-green-500 hover:underline">Criar link Pix grátis</a>
        </p>
      </div>
    </div>
  );
}