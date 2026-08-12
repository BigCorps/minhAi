'use client';

// app/convite/entrar/page.tsx
//
// Mesma base do login do ArteFinal (Supabase auth + Turnstile), na paleta do
// tema `marca` da ConviteIA. Duas diferencas de comportamento:
//
// 1. `?destino=publicar` — o wizard manda a pessoa para ca no fim do fluxo,
//    com o estado do convite em sessionStorage. Depois do login, publicamos
//    aqui mesmo. Sem isso o usuario termina o convite, faz cadastro e cai
//    numa tela vazia sem entender que perdeu o trabalho.
// 2. Biometria (WebAuthn) ficou de fora de proposito: quem chega aqui esta
//    criando conta agora, no meio de um fluxo, e nao tem credencial
//    registrada. O botao so apareceria para nunca funcionar.

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import RendaBackground from '@/components/conviteria/RendaBackground';
import { useTurnstile } from '@/hooks/useTurnstile';
import { MARCA, SLOGAN } from '@/lib/conviteria/marca';

// Tema `marca` de lib/conviteria/temas.ts. Valores literais, e nao
// `acharTema('marca')`, porque esta pagina nao renderiza convite nenhum —
// puxar o modulo de temas aqui so para quatro cores acopla o login ao
// catalogo.
const cor = {
  fora: '#ffffff',
  papel: '#fdf0f3',
  acento: '#c06078',
  acentoTexto: '#a04a63',
  tinta: '#40232c',
  tintaSuave: '#7c5560',
  bloco: '#b34f77',
  blocoTexto: '#fff5f8',
  erroBg: '#f7e2e6',
  erroTexto: '#8c2f43',
};

const CHAVE_PUBLICAR = 'conviteia:publicar';
const CHAVE_RASCUNHO = 'conviteia:rascunho';

function EntrarConteudo() {
  const [modo, setModo] = useState<'login' | 'cadastro'>('cadastro');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [verSenha, setVerSenha] = useState(false);
  const [temConvitePendente, setTemConvitePendente] = useState(false);

  const { getToken, containerRef } = useTurnstile();
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get('destino');

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (destino === 'publicar') {
      setTemConvitePendente(!!sessionStorage.getItem(CHAVE_PUBLICAR));
    }
  }, [destino]);

  /**
   * Entrada por Google ou Facebook.
   *
   * O `next` traz a propria pagina de volta com `destino=publicar`, e nao o
   * painel: OAuth e um redirect de pagina inteira, entao o codigo que publica
   * o convite morre no meio do caminho. Voltando para ca, o efeito abaixo
   * retoma. O sessionStorage sobrevive porque e a mesma aba e a mesma origem.
   */
  async function entrarCom(provedor: 'google' | 'facebook') {
    setErro(null);
    const volta =
      destino === 'publicar' ? '/convite/entrar?destino=publicar' : '/convite';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provedor,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(volta)}`,
      },
    });

    if (error) setErro(error.message);
  }

  /**
   * Publica o convite guardado pelo wizard. So roda com sessao valida: a rota
   * exige Bearer token e recusa qualquer user_id vindo do corpo.
   */
  const publicarPendente = useCallback(async (): Promise<boolean> => {
    const bruto = sessionStorage.getItem(CHAVE_PUBLICAR);
    if (!bruto) return false;

    let estado: { cfg?: Record<string, any> };
    try {
      estado = JSON.parse(bruto);
    } catch {
      sessionStorage.removeItem(CHAVE_PUBLICAR);
      setErro('Não foi possível recuperar o convite. Refaça a última etapa.');
      return false;
    }

    const cfg = estado.cfg;
    const publicacao = cfg?.publicacao ?? {};

    if (!publicacao.slug) {
      setErro('O endereço do convite não foi definido. Volte e escolha um.');
      return false;
    }

    const { data: sessao } = await supabase.auth.getSession();
    const acesso = sessao.session?.access_token;
    if (!acesso) {
      setErro('Sessão não iniciada. Tente entrar novamente.');
      return false;
    }

    const r = await fetch('/api/conviteria/publicar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${acesso}`,
      },
      body: JSON.stringify({
        rascunhoToken: localStorage.getItem(CHAVE_RASCUNHO) ?? '',
        slug: publicacao.slug,
        planoId: publicacao.planoId ?? 'avulso',
        cfg,
      }),
    });

    const dados = await r.json().catch(() => null);

    if (!r.ok) {
      setErro(dados?.erro ?? 'Não foi possível publicar o convite.');
      return false;
    }

    // So limpa depois do 200: se a publicacao falhar, o convite continua
    // recuperavel ao recarregar a pagina.
    sessionStorage.removeItem(CHAVE_PUBLICAR);

    if (dados.publicado) {
      localStorage.removeItem(CHAVE_RASCUNHO);
      window.location.href = dados.url;
      return true;
    }

    // Avulso: o convite existe mas so vai ao ar depois do PIX.
    router.push(`/convite/pagar?evento=${dados.eventoId}`);
    return true;
  }, [router, supabase]);

  // Retomada pos-OAuth. ⚠️ Precisa vir DEPOIS de `publicarPendente`:
  // `const` nao sofre hoisting, e declarar este efeito acima dela quebrava a
  // pagina inteira com "Cannot access 'publicarPendente' before
  // initialization" — o mesmo erro que derrubou o build no MESES.
  // se ja existe sessao e ha convite pendente, publica sem
  // pedir nada. Sem isto a pessoa volta do Google e ve o formulario de novo,
  // como se o login nao tivesse funcionado.
  useEffect(() => {
    if (destino !== 'publicar') return;

    let cancelado = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelado || !data.session) return;
      if (!sessionStorage.getItem(CHAVE_PUBLICAR)) return;

      setCarregando(true);
      await publicarPendente();
      if (!cancelado) setCarregando(false);
    })();

    return () => { cancelado = true; };
  }, [destino, supabase, publicarPendente]);


  async function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // ⚠️ Ler o formulario ANTES do primeiro await. O React reaproveita o
    // objeto de evento e zera `currentTarget` assim que o handler cede o
    // controle, entao fazer isto depois do Turnstile quebrava com
    // "Failed to construct 'FormData': parameter 1 is not of type
    // 'HTMLFormElement'".
    const dadosForm = new FormData(e.currentTarget);

    setCarregando(true);
    setErro(null);

    try {
      const token = await getToken();
      if (token) {
        const { data: td, error: te } = await supabase.functions.invoke(
          'validate-turnstile',
          { body: { token } }
        );
        if (te || !td?.success) {
          setErro(td?.error ?? 'Verificação de segurança falhou. Tente novamente.');
          return;
        }
      }

      const email = dadosForm.get('email') as string;
      const senha = dadosForm.get('senha') as string;
      const nome = dadosForm.get('nome') as string;

      if (modo === 'cadastro') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { name: nome } },
        });
        if (error) throw error;

        if (!data.session) {
          // Confirmacao por e-mail ligada no projeto. O convite fica em
          // sessionStorage e sera publicado quando a pessoa voltar e entrar.
          setErro(null);
          setModo('login');
          alert('Cadastro criado! Confirme seu e-mail e entre para publicar o convite.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
      }

      localStorage.setItem('lastLoggedInUser', email);

      if (destino === 'publicar' && (await publicarPendente())) return;

      router.push('/convite');
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao autenticar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: cor.papel }}
    >
      <RendaBackground />

      <div
        className="w-full max-w-md rounded-2xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: cor.fora, borderColor: cor.acento + '33' }}
      >
        <header
          className="px-6 py-6 text-center border-b"
          style={{ borderColor: cor.acento + '22' }}
        >
          {/* Logo duplo Convite IA | minhAi — mesma marcacao das outras
              marcas. Sinaliza que a conta e a mesma da minhAi, o que evita a
              pessoa criar cadastro duplicado achando que sao produtos
              separados. */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-16 h-16 overflow-hidden rounded-full flex-shrink-0">
              <Image
                src="/brands/convite/icone-512.png"
                alt="Convite IA"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>

            <span
              className="text-2xl font-thin select-none flex-shrink-0"
              style={{ color: cor.acento + '66' }}
            >
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

          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: cor.tinta }}
          >
            {MARCA}
          </h1>
          <p className="text-sm mt-1" style={{ color: cor.tintaSuave }}>
            {SLOGAN}
          </p>
        </header>

        <div className="px-6 py-6">
          {temConvitePendente && (
            <div
              className="mb-5 rounded-lg px-4 py-3 text-sm"
              style={{ backgroundColor: cor.papel, color: cor.acentoTexto }}
            >
              Seu convite está pronto. Crie sua conta para publicá-lo.
            </div>
          )}

          {erro && (
            <div
              className="mb-5 rounded-lg px-4 py-3 flex items-start gap-2 text-sm"
              style={{ backgroundColor: cor.erroBg, color: cor.erroTexto }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{erro}</p>
            </div>
          )}

          <div className="space-y-2 mb-5">
            <button
              type="button"
              onClick={() => entrarCom('google')}
              disabled={carregando}
              className="w-full py-3 rounded-lg border font-medium flex items-center justify-center gap-3 disabled:opacity-50"
              style={{ borderColor: cor.acento + '55', color: cor.tinta }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z" />
              </svg>
              Continuar com Google
            </button>

            <button
              type="button"
              onClick={() => entrarCom('facebook')}
              disabled={carregando}
              className="w-full py-3 rounded-lg border font-medium flex items-center justify-center gap-3 disabled:opacity-50"
              style={{ borderColor: cor.acento + '55', color: cor.tinta }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
              </svg>
              Continuar com Facebook
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <span className="h-px flex-1" style={{ backgroundColor: cor.acento + '33' }} />
            <span className="text-xs" style={{ color: cor.tintaSuave }}>ou com e-mail</span>
            <span className="h-px flex-1" style={{ backgroundColor: cor.acento + '33' }} />
          </div>

          <form onSubmit={aoEnviar} className="space-y-4">
            {modo === 'cadastro' && (
              <div>
                <label
                  htmlFor="nome"
                  className="block text-sm font-medium mb-1"
                  style={{ color: cor.tinta }}
                >
                  Seu nome
                </label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  autoComplete="name"
                  className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2"
                  style={{ borderColor: cor.acento + '55', color: cor.tinta }}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: cor.tinta }}
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2"
                style={{ borderColor: cor.acento + '55', color: cor.tinta }}
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                className="block text-sm font-medium mb-1"
                style={{ color: cor.tinta }}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  name="senha"
                  type={verSenha ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'}
                  className="w-full px-4 py-3 pr-12 rounded-lg border bg-transparent focus:outline-none focus:ring-2"
                  style={{ borderColor: cor.acento + '55', color: cor.tinta }}
                />
                <button
                  type="button"
                  onClick={() => setVerSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {verSenha ? (
                    <EyeOff className="w-4 h-4" style={{ color: cor.tintaSuave }} />
                  ) : (
                    <Eye className="w-4 h-4" style={{ color: cor.tintaSuave }} />
                  )}
                </button>
              </div>
            </div>

            <div ref={containerRef} />

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}
            >
              {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
              {modo === 'cadastro' ? 'Criar conta e publicar' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: cor.tintaSuave }}>
            {modo === 'cadastro' ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => { setModo(modo === 'cadastro' ? 'login' : 'cadastro'); setErro(null); }}
              className="font-semibold underline underline-offset-2"
              style={{ color: cor.acentoTexto }}
            >
              {modo === 'cadastro' ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

// useSearchParams exige Suspense no App Router; sem isso o build reclama na
// hora de pre-renderizar esta rota.
export default function EntrarPage() {
  return (
    <Suspense fallback={null}>
      <EntrarConteudo />
    </Suspense>
  );
}