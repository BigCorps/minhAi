'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import RendaBackground from '@/components/conviteria/RendaBackground';
import { useTurnstile } from '@/hooks/useTurnstile';
import { MARCA, SLOGAN } from '@/lib/conviteria/marca';

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
const COOKIE_RASCUNHO = 'conviteia_rascunho_pendente';

type EstadoPendente = {
  etapa?: number;
  cfg?: Record<string, any>;
};

type ConvitePendente = {
  estado: EstadoPendente;
  token: string;
};

function lerLocal(chave: string): string | null {
  try { return localStorage.getItem(chave); } catch { return null; }
}

function gravarLocal(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor); } catch { /* noop */ }
}

function removerLocal(chave: string) {
  try { localStorage.removeItem(chave); } catch { /* noop */ }
}

function lerSessao(chave: string): string | null {
  try { return sessionStorage.getItem(chave); } catch { return null; }
}

function gravarSessao(chave: string, valor: string) {
  try { sessionStorage.setItem(chave, valor); } catch { /* noop */ }
}

function removerSessao(chave: string) {
  try { sessionStorage.removeItem(chave); } catch { /* noop */ }
}

function lerCookie(nome: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefixo = `${nome}=`;
  const item = document.cookie.split('; ').find((p) => p.startsWith(prefixo));
  if (!item) return null;
  try { return decodeURIComponent(item.slice(prefixo.length)); } catch { return null; }
}

function removerCookieRascunho() {
  if (typeof document === 'undefined') return;
  const hostname = window.location.hostname.toLowerCase();
  const dominio = hostname === 'conviteia.com' || hostname.endsWith('.conviteia.com')
    ? '; Domain=.conviteia.com'
    : '';
  const seguro = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_RASCUNHO}=; Max-Age=0; Path=/; SameSite=Lax${seguro}${dominio}`;
}

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

  /**
   * Ordem de recuperacao:
   * 1) sessionStorage (mais rapido);
   * 2) cookie compartilhado entre www/apex + rascunho no Supabase;
   * 3) localStorage + rascunho no Supabase (compatibilidade com rascunhos antigos).
   */
  const carregarPendente = useCallback(async (): Promise<ConvitePendente | null> => {
    const bruto = lerSessao(CHAVE_PUBLICAR);
    if (bruto) {
      try {
        const estado = JSON.parse(bruto) as EstadoPendente;
        if (estado?.cfg) {
          return {
            estado,
            token: lerCookie(COOKIE_RASCUNHO) ?? lerLocal(CHAVE_RASCUNHO) ?? '',
          };
        }
      } catch {
        removerSessao(CHAVE_PUBLICAR);
      }
    }

    const candidatos = Array.from(new Set([
      lerCookie(COOKIE_RASCUNHO),
      destino === 'publicar' ? lerLocal(CHAVE_RASCUNHO) : null,
    ].filter((v): v is string => !!v)));

    for (const token of candidatos) {
      try {
        const r = await fetch(`/api/conviteria/rascunho?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        if (!r.ok) continue;
        const j = await r.json();
        if (!j?.estado?.cfg) continue;

        const estado = j.estado as EstadoPendente;
        gravarLocal(CHAVE_RASCUNHO, token);
        gravarSessao(CHAVE_PUBLICAR, JSON.stringify(estado));
        return { estado, token };
      } catch {
        // Tenta o proximo backup.
      }
    }

    return null;
  }, [destino]);

  /** Publica o rascunho somente depois de confirmar que existe uma sessao. */
  const publicarPendente = useCallback(async (
    carregado?: ConvitePendente | null,
  ): Promise<boolean> => {
    const pendente = carregado ?? await carregarPendente();

    if (!pendente?.estado?.cfg) {
      setErro(
        'Seu login foi concluído, mas não consegui localizar o convite que estava em finalização. '
        + 'Não vamos mandar você para um painel vazio. Volte ao convite para retomar o rascunho salvo.'
      );
      return false;
    }

    const cfg = pendente.estado.cfg;
    const publicacao = cfg.publicacao ?? {};

    if (!publicacao.slug) {
      setErro('O endereço do convite não foi definido. Volte ao convite e escolha um endereço.');
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
        rascunhoToken: pendente.token,
        slug: publicacao.slug,
        planoId: publicacao.planoId ?? 'avulso',
        cfg,
      }),
    });

    const dados = await r.json().catch(() => null);

    if (!r.ok) {
      setErro(dados?.erro ?? 'Não foi possível finalizar o convite. Seu rascunho continua salvo.');
      return false;
    }

    // So limpa os backups DEPOIS que o servidor criou o evento.
    removerSessao(CHAVE_PUBLICAR);
    removerLocal(CHAVE_RASCUNHO);
    removerCookieRascunho();

    if (dados.publicado) {
      window.location.href = dados.url;
      return true;
    }

    router.replace(`/convite/pagar?evento=${dados.eventoId}`);
    return true;
  }, [carregarPendente, router, supabase]);

  // Detecta o convite pendente mesmo se sessionStorage tiver sumido.
  // Se o OAuth acabou de voltar com sessao valida, continua automaticamente.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      const pendente = await carregarPendente();
      if (cancelado) return;
      setTemConvitePendente(!!pendente);

      const { data } = await supabase.auth.getSession();
      if (cancelado || !data.session || !pendente) return;

      setCarregando(true);
      await publicarPendente(pendente);
      if (!cancelado) setCarregando(false);
    })();

    return () => { cancelado = true; };
  }, [carregarPendente, publicarPendente, supabase]);

  async function entrarCom(provedor: 'google') {
    setErro(null);
    setCarregando(true);

    try {
      const pendente = await carregarPendente();
      const devePublicar = destino === 'publicar' || !!pendente;
      const volta = devePublicar
        ? '/convite/entrar?destino=publicar'
        : '/convite';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provedor,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(volta)}`,
        },
      });

      if (error) {
        const m = error.message ?? '';
        if (m.includes('already registered') || m.includes('already exists') || m.includes('user_already_exists')) {
          setErro('Este e-mail já tem cadastro com senha. Entre com e-mail e senha.');
        } else {
          setErro(m || 'Não foi possível entrar com o Google.');
        }
        setCarregando(false);
      }
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível iniciar o login com Google.');
      setCarregando(false);
    }
  }

  async function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        const pendenteAntesDoCadastro = await carregarPendente();
        const voltaAposConfirmacao = destino === 'publicar' || pendenteAntesDoCadastro
          ? '/convite/entrar?destino=publicar'
          : '/convite/painel';

        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { name: nome },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(voltaAposConfirmacao)}`,
          },
        });

        if (error) {
          const m = error.message ?? '';
          if (m.includes('already registered') || m.includes('already exists') || m.includes('User already')) {
            setModo('login');
            setErro('Você já tem conta minhAi com esse e-mail. Entre com sua senha, ou use o Google se foi assim que criou.');
            return;
          }
          throw error;
        }

        if (!data.session) {
          setErro(null);
          setModo('login');
          alert('Cadastro criado! Confirme seu e-mail e volte a esta tela. Seu convite continuará salvo para finalizar.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) {
          const m = error.message ?? '';
          if (m.includes('Invalid login credentials')) {
            setErro('E-mail ou senha incorretos. Se você criou sua conta minhAi pelo Google, entre pelo botão do Google acima.');
            return;
          }
          throw error;
        }
      }

      gravarLocal('lastLoggedInUser', email);

      const pendente = await carregarPendente();
      if (destino === 'publicar' || pendente) {
        await publicarPendente(pendente);
        // Nunca cai no dashboard se veio da finalizacao e algo falhou.
        return;
      }

      router.push('/convite/painel');
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao autenticar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <RendaBackground />

      <div
        className="w-full max-w-md rounded-2xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: cor.fora, borderColor: cor.acento + '33' }}
      >
        <header className="px-6 py-6 text-center border-b" style={{ borderColor: cor.acento + '22' }}>
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

            <span className="text-2xl font-thin select-none flex-shrink-0" style={{ color: cor.acento + '66' }}>|</span>

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

          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: cor.tinta }}>{MARCA}</h1>
          <p className="text-sm mt-1" style={{ color: cor.tintaSuave }}>{SLOGAN}</p>
        </header>

        <div className="px-6 py-6">
          {temConvitePendente && (
            <div
              className="mb-5 rounded-lg px-4 py-3 text-sm"
              style={{ backgroundColor: cor.papel, color: cor.acentoTexto }}
            >
              <strong>Seu convite está salvo.</strong><br />
              Entre na sua conta e continuaremos automaticamente para a finalização.
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
              {carregando ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z" />
                </svg>
              )}
              Continuar com Google
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
                <label htmlFor="nome" className="block text-sm font-medium mb-1" style={{ color: cor.tinta }}>Seu nome</label>
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
              <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: cor.tinta }}>E-mail</label>
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
              <label htmlFor="senha" className="block text-sm font-medium mb-1" style={{ color: cor.tinta }}>Senha</label>
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

            <div
              ref={containerRef}
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
              aria-hidden="true"
            />

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}
            >
              {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
              {modo === 'cadastro' ? 'Criar conta e continuar' : 'Entrar e continuar'}
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

export default function EntrarPage() {
  return (
    <Suspense fallback={null}>
      <EntrarConteudo />
    </Suspense>
  );
}
