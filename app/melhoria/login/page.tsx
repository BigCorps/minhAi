'use client';

// app/melhoria/login/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Porte do app/consultatec/login/page.tsx. A infraestrutura de auth é
// compartilhada e o /auth/callback já é genérico — só muda `next=/melhoria`,
// a marca e o tema.
//
// O que muda em relação ao ConsultaTec, e por quê:
//   - Entrar vem ANTES de criar conta. No ConsultaTec o padrão é cadastro; aqui
//     quem instala geralmente já foi cadastrado pelo filho.
//   - A biometria é o caminho de destaque, não um atalho discreto: digitar
//     senha é a maior barreira deste público, e o WebAuthn já está pronto.
//   - Sem "esqueci a senha" escondido em letra miúda.
//   - Turnstile continua invisível, como nas outras marcas.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Fingerprint, ScanFace, Loader2, Mail, Lock, User } from 'lucide-react';
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { createClient } from '@/lib/supabase-browser';
import { useTurnstile } from '@/hooks/useTurnstile';
import { cor, fonte, px, toque, raio, espaco } from '@/lib/melhoria/tema';

const DESTINO = '/melhoria';

export default function LoginMelhorIA() {
  const router   = useRouter();
  const supabase = createClient();
  const { containerRef, getToken } = useTurnstile();

  const [modo, setModo]         = useState<'login' | 'cadastro'>('login');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  const [emailBio, setEmailBio] = useState<string | null>(null);
  const [tipoBio, setTipoBio]   = useState<'face' | 'digital'>('digital');
  const [checandoBio, setChecandoBio] = useState(true);

  // ── Biometria disponível? ─────────────────────────────────────────────────
  useEffect(() => {
    // Rede ruim não pode deixar a tela travada em "verificando". 2,5s e segue.
    const guarda = setTimeout(() => setChecandoBio(false), 3000);

    (async () => {
      try {
        if (!browserSupportsWebAuthn()) return;
        setTipoBio(/iPhone|iPad/i.test(navigator.userAgent) ? 'face' : 'digital');

        const ultimo =
          localStorage.getItem('lastLoggedInUser') ||
          document.cookie.match(/lastLoggedInUser=([^;]+)/)?.[1] ||
          null;
        if (!ultimo) return;

        const rpc = supabase.rpc('has_webauthn_credential_by_email', { p_email: ultimo });
        const limite = new Promise<{ data: null; error: Error }>((r) =>
          setTimeout(() => r({ data: null, error: new Error('timeout') }), 2500)
        );

        const { data, error } = await Promise.race([rpc, limite]);
        if (!error && data === true) setEmailBio(ultimo);
      } catch (e) {
        console.error('biometria:', e);
      } finally {
        clearTimeout(guarda);
        setChecandoBio(false);
      }
    })();

    return () => clearTimeout(guarda);
  }, [supabase]);

  // ── E-mail e senha ────────────────────────────────────────────────────────
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
      const email = dados.get('email') as string;
      const senha = dados.get('senha') as string;
      const nome  = dados.get('nome')  as string;

      if (modo === 'cadastro') {
        const { data, error } = await supabase.auth.signUp({
          email, password: senha, options: { data: { name: nome } },
        });
        if (error) throw error;

        if (data.session) {
          localStorage.setItem('lastLoggedInUser', email);
          // Conta nova vai para o consentimento, não direto para o app.
          router.push('/melhoria/consentimento');
        } else {
          setErro('Cadastro feito! Confira seu e-mail para confirmar e depois entre.');
          setModo('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        localStorage.setItem('lastLoggedInUser', email);
        router.push(DESTINO);
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

  // ── Biometria ─────────────────────────────────────────────────────────────
  async function entrarComBiometria() {
    if (!emailBio) return;
    setCarregando(true);
    setErro(null);

    try {
      const { data: opcoes, error: e1 } = await supabase.functions.invoke(
        'webauthn-authentication-options', { body: { email: emailBio } });
      if (e1) throw new Error('inicio');

      const resposta = await startAuthentication(opcoes);

      const { data: verif, error: e2 } = await supabase.functions.invoke(
        'webauthn-verify-authentication',
        { body: { expectedChallenge: opcoes.challenge, authenticationResponse: resposta } });
      if (e2 || !verif?.success) throw new Error('verificacao');

      const { data: sessao, error: e3 } = await supabase.functions.invoke(
        'webauthn-create-session',
        { body: { email: verif.email, user_id: verif.user_id } });
      if (e3 || !sessao?.success) throw new Error('sessao');

      const { error: e4 } = await supabase.auth.setSession({
        access_token:  sessao.session.access_token,
        refresh_token: sessao.session.refresh_token,
      });
      if (e4) throw e4;

      localStorage.setItem('lastLoggedInUser', verif.email);
      router.push(DESTINO);
    } catch (e: any) {
      const m: string = e?.message ?? '';
      setErro(
        m.includes('timed out') || m.includes('not allowed') || m.includes('cancel')
          ? 'Não deu certo. Tente de novo ou entre com e-mail e senha.'
          : 'Não consegui reconhecer. Entre com e-mail e senha.'
      );
    } finally {
      setCarregando(false);
    }
  }

  // ── Google ────────────────────────────────────────────────────────────────
  async function entrarComGoogle() {
    setCarregando(true);
    setErro(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${DESTINO}` },
      });
      if (error) throw error;
    } catch {
      setErro('Não consegui entrar com o Google. Tente de novo.');
      setCarregando(false);
    }
  }

  return (
    <main style={{
      background: cor.fundo, minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: espaco.md,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Marca dupla: MelhorIA | minhAi, igual às outras verticais */}
        <div style={{ textAlign: 'center', marginBottom: espaco.lg }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.sm }}>
            <Image src="/brands/melhoria/logo.png" alt="MelhorIA" width={80} height={80}
                   style={{ borderRadius: 18 }} />
            <span style={{ fontSize: 30, color: cor.borda, fontWeight: 200 }} aria-hidden="true">|</span>
            <Image src="/icon.png" alt="minhAi" width={44} height={44}
                   style={{ borderRadius: 10 }} />
          </div>

          <h1 style={{ fontSize: 40, fontWeight: 800, color: cor.tinta, margin: `${espaco.md}px 0 0` }}>
            MelhorIA
          </h1>
          <p style={{ fontSize: 22, color: cor.destaqueTexto, fontWeight: 700, margin: '4px 0 0' }}>
            a IA da Melhor Idade!
          </p>
        </div>

        {/* Biometria em destaque */}
        {checandoBio ? (
          <div style={{ textAlign: 'center', padding: espaco.md }}>
            <Loader2 size={36} className="animate-spin" style={{ color: cor.destaque }} />
          </div>
        ) : emailBio ? (
          <>
            <button
              type="button"
              onClick={entrarComBiometria}
              disabled={carregando}
              style={{
                minHeight: toque.critico, width: '100%',
                borderRadius: raio.botao, border: 'none',
                background: cor.destaque, color: '#FFFFFF',
                fontSize: 26, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.sm,
                marginBottom: espaco.md,
              }}
            >
              {tipoBio === 'face'
                ? <ScanFace size={40} aria-hidden="true" />
                : <Fingerprint size={40} aria-hidden="true" />}
              {tipoBio === 'face' ? 'Entrar com o rosto' : 'Entrar com a digital'}
            </button>

            <p style={{
              textAlign: 'center', fontSize: 18, color: cor.tintaMuted,
              margin: `0 0 ${espaco.md}px`,
            }}>
              ou entre com e-mail e senha
            </p>
          </>
        ) : null}

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
          onClick={entrarComGoogle}
          disabled={carregando}
          style={{
            minHeight: toque.confortavel, width: '100%', marginTop: espaco.md,
            borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
            background: cor.fundo, color: cor.tinta,
            fontSize: 21, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Entrar com o Google
        </button>

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

        {/* Turnstile invisível */}
        <div ref={containerRef} />

        <p style={{
          textAlign: 'center', fontSize: 18, color: cor.tintaMuted,
          margin: `${espaco.lg}px 0 0`, lineHeight: 1.5,
        }}>
          Ao entrar você aceita os{' '}
          <a href="/termos" style={{ color: cor.destaqueTexto, fontWeight: 700 }}>termos de uso</a>
          {' '}e o{' '}
          <a href="/aviso" style={{ color: cor.destaqueTexto, fontWeight: 700 }}>aviso de privacidade</a>.
        </p>
      </div>
    </main>
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
        color: cor.tinta, marginBottom: espaco.xs,
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
