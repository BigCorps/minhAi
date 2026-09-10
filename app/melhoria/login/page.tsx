'use client';

// app/melhoria/login/page.tsx
// Login do MelhorIA sem WebAuthn/biometria.
// A biometria continua disponível nos produtos que a usam; esta tela não
// importa nem chama nenhum recurso webauthn-*.

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { melhoriaAuth } from '@/lib/melhoria/supabase';
import { useTurnstile } from '@/hooks/useTurnstile';
import { BotaoGoogle, Rodape } from '@/components/melhoria/Chrome';
import { cor, fonte, px, toque, raio, espaco } from '@/lib/melhoria/tema';
import { R } from '@/lib/melhoria/rotas';

function destinoInterno(valor: string | null): string {
  if (!valor) return R.app();
  try {
    const decodificado = decodeURIComponent(valor);
    if (!decodificado.startsWith('/') || decodificado.startsWith('//')) return R.app();
    if (decodificado.includes('\\')) return R.app();
    return decodificado;
  } catch {
    return R.app();
  }
}

function LoginConteudo() {
  const router   = useRouter();
  const params   = useSearchParams();
  const supabase = melhoriaAuth();
  const { containerRef, getToken } = useTurnstile();

  // ?next= é usado pelo convite de cuidador, mas só aceitamos rota interna.
  const destino = destinoInterno(params.get('next'));

  const [modo, setModo] = useState<'login' | 'cadastro'>('login');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrarComEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setCarregando(true);
    setErro(null);

    try {
      const token = await getToken();
      if (token) {
        const { data: td, error: te } = await supabase.functions.invoke('validate-turnstile', {
          body: { token },
        });
        if (te || !td?.success) {
          setErro('A verificação de segurança falhou. Tente de novo.');
          return;
        }
      }

      const dados = new FormData(form);
      const email = String(dados.get('email') ?? '').trim();
      const senha = String(dados.get('senha') ?? '');
      const nome  = String(dados.get('nome') ?? '').trim();

      if (modo === 'cadastro') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { name: nome } },
        });
        if (error) throw error;

        if (data.session) {
          router.push(R.consentimento());
        } else {
          setErro('Cadastro feito! Confira seu e-mail para confirmar e depois entre.');
          setModo('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        router.push(destino);
      }
    } catch (e: any) {
      const m: string = e?.message ?? '';
      setErro(
        m.includes('Invalid login credentials')
          ? 'E-mail ou senha não conferem. Tente de novo.'
          : m.includes('Email not confirmed')
            ? 'Confirme seu e-mail antes de entrar. Procure a mensagem que enviamos.'
            : 'Não consegui entrar. Tente de novo em instantes.'
      );
    } finally {
      setCarregando(false);
    }
  }

  async function entrarComGoogle() {
    setCarregando(true);
    setErro(null);
    try {
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', destino);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.toString() },
      });
      if (error) throw error;
    } catch {
      setErro('Não consegui entrar com o Google. Tente de novo.');
      setCarregando(false);
    }
  }

  return (
    <main className="mel-centro" style={{
      background: cor.fundo, minHeight: '100dvh',
      maxWidth: 520, margin: '0 auto',
      padding: `${espaco.xl}px ${espaco.md}px 0`,
      color: cor.tinta, textAlign: 'center',
    }}>
      <div style={{ textAlign: 'center', marginBottom: espaco.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.sm }}>
          <Image
            src="/brands/melhoria/logo.png"
            alt="MelhorIA"
            width={80}
            height={80}
            style={{ borderRadius: 18 }}
            priority
          />
          <span style={{ fontSize: 30, color: cor.borda, fontWeight: 200 }} aria-hidden="true">|</span>
          <Image src="/logo-circle.png" alt="minhAi" width={44} height={44} style={{ borderRadius: 10 }} />
        </div>

        <h1 style={{ fontSize: 40, fontWeight: 800, color: cor.tinta, margin: `${espaco.md}px 0 0` }}>
          MelhorIA
        </h1>
        <p style={{ fontSize: 22, color: cor.destaqueTexto, fontWeight: 700, margin: '4px 0 0' }}>
          a IA da Melhor Idade!
        </p>
      </div>

      <div style={{ marginBottom: espaco.md }}>
        <BotaoGoogle onClick={entrarComGoogle} carregando={carregando} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: espaco.sm, margin: `${espaco.md}px 0` }}>
        <span style={{ flex: 1, height: 2, background: cor.borda }} />
        <span style={{ fontSize: 18, color: cor.tintaMuted, fontWeight: 600 }}>ou com e-mail</span>
        <span style={{ flex: 1, height: 2, background: cor.borda }} />
      </div>

      <form onSubmit={entrarComEmail}>
        {modo === 'cadastro' && (
          <Campo icone={<User size={26} />} nome="nome" tipo="text"
                 rotulo="Seu nome" exemplo="Maria" autoComplete="name" />
        )}

        <Campo icone={<Mail size={26} />} nome="email" tipo="email"
               rotulo="E-mail" exemplo="maria@email.com" autoComplete="email" />

        <Campo icone={<Lock size={26} />} nome="senha" tipo="password"
               rotulo="Senha" exemplo="••••••••"
               autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'} />

        {erro && (
          <p role="alert" style={{
            background: cor.perigoBg, color: cor.perigoTexto,
            border: `2px solid ${cor.perigo}`, borderRadius: raio.campo,
            padding: espaco.sm, fontSize: 19, fontWeight: 600,
            margin: `0 0 ${espaco.md}px`, lineHeight: 1.4,
          }}>
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          style={{
            minHeight: toque.critico, width: '100%',
            borderRadius: raio.botao, border: 'none',
            background: cor.destaque, color: '#FFFFFF',
            fontSize: 26, fontWeight: 800,
            cursor: carregando ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
          }}
        >
          {carregando && <Loader2 size={30} className="animate-spin" aria-hidden="true" />}
          {modo === 'login' ? 'Entrar' : 'Criar minha conta'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro(null); }}
        style={{
          minHeight: toque.min, width: '100%', marginTop: espaco.md,
          background: 'none', border: 'none',
          color: cor.destaqueTexto, fontSize: 20, fontWeight: 700,
          cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        {modo === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta'}
      </button>

      <div ref={containerRef} />
      <Rodape />
    </main>
  );
}

export default function LoginMelhorIA() {
  return (
    <Suspense fallback={
      <main style={{ background: cor.fundo, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={56} className="animate-spin" style={{ color: cor.destaque }} />
      </main>
    }>
      <LoginConteudo />
    </Suspense>
  );
}

function Campo({
  icone, nome, tipo, rotulo, exemplo, autoComplete,
}: {
  icone: React.ReactNode; nome: string; tipo: string;
  rotulo: string; exemplo: string; autoComplete: string;
}) {
  return (
    <div style={{ marginBottom: espaco.md }}>
      <label htmlFor={nome} style={{
        display: 'block', fontSize: 20, fontWeight: 700,
        color: cor.tinta, marginBottom: espaco.xs, textAlign: 'center',
      }}>
        {rotulo}
      </label>
      <div style={{ position: 'relative' }}>
        <span aria-hidden="true" style={{
          position: 'absolute', left: espaco.sm, top: '50%',
          transform: 'translateY(-50%)', color: cor.tintaMuted, display: 'flex',
        }}>
          {icone}
        </span>
        <input
          id={nome} name={nome} type={tipo} required
          placeholder={exemplo} autoComplete={autoComplete}
          style={{
            minHeight: toque.min, width: '100%',
            padding: `${espaco.sm}px ${espaco.md}px ${espaco.sm}px 52px`,
            borderRadius: raio.campo, border: `2px solid ${cor.borda}`,
            background: cor.fundo, color: cor.tinta,
            fontSize: px(fonte.corpo, 'grande'),
          }}
        />
      </div>
    </div>
  );
}
