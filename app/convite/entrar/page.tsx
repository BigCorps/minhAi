'use client';

// app/conviteia/entrar/page.tsx
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

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
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
   * Publica o convite guardado pelo wizard. So roda com sessao valida: a rota
   * exige Bearer token e recusa qualquer user_id vindo do corpo.
   */
  async function publicarPendente(): Promise<boolean> {
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
    router.push(`/conviteia/pagar?evento=${dados.eventoId}`);
    return true;
  }

  async function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

      const form = new FormData(e.currentTarget);
      const email = form.get('email') as string;
      const senha = form.get('senha') as string;
      const nome = form.get('nome') as string;

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

      router.push('/conviteia/painel');
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
      <div
        className="w-full max-w-md rounded-2xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: cor.fora, borderColor: cor.acento + '33' }}
      >
        <header
          className="px-6 py-6 text-center border-b"
          style={{ borderColor: cor.acento + '22' }}
        >
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