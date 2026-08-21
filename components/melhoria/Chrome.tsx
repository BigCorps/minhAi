'use client';

// components/melhoria/Chrome.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Cabeçalho, rodapé e ícones compartilhados por todas as telas da MelhorIA.
//
// O cabeçalho é o mesmo em toda página: logo à esquerda, sempre clicável para
// voltar ao início. Para quem se perde no aplicativo, um logo que sempre leva
// para casa vale mais que qualquer botão "voltar".
//
// O rodapé segue o padrão das outras verticais — no PixWiki:
//   "PixWiki · ... · Tecnologia minhAi / BigCorps"
// ─────────────────────────────────────────────────────────────────────────────

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';

// ── Ícone do Google ─────────────────────────────────────────────────────────
// Mesmo SVG de quatro cores usado nos logins da minhAi, do ConsultaTec, da
// ArteFinal e do Pix Wiki. Não trocar por ícone genérico: as diretrizes de
// marca do Google exigem o logotipo oficial em botão "Continuar com Google",
// e o público reconhece as cores mesmo sem ler o texto.
export function IconeGoogle({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/** Botão "Continuar com Google", padronizado. Use em qualquer conexão Google. */
export function BotaoGoogle({
  onClick, rotulo = 'Continuar com Google', carregando = false, desabilitado = false,
}: {
  onClick: () => void; rotulo?: string; carregando?: boolean; desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado || carregando}
      style={{
        minHeight: toque.confortavel, width: '100%',
        borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
        background: '#FFFFFF', color: cor.tinta,
        fontSize: 21, fontWeight: 700,
        cursor: desabilitado || carregando ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.sm,
        opacity: desabilitado ? 0.6 : 1,
      }}
    >
      <IconeGoogle />
      {carregando ? 'Abrindo...' : rotulo}
    </button>
  );
}

// ── Ícone BigCorps ──────────────────────────────────────────────────────────
// Mesmo path usado no app/arte/perfil/page.tsx.
export function IconeBigCorps({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 30 30" fill="currentColor" aria-hidden="true">
      <path d="M 2.589 26.923c3.905 4.641 19.9 4.741 24.488 .154 4.465-4.465 4.465-19.689 0-24.154s-19.689-4.465-24.154 0c-4.236 4.236-4.443 19.117-.334 24zm0.411-12.146c0-10.652 1.147-11.777 12-11.777 6.667 0 8.333 .333 10 2s2 3.333 2 10c0 10.995-1.042 12-12.443 12-10.698 0-11.557-.908-11.557-12.223zm3.667-6.111c-1.06 1.06-.772 12.15 .333 12.833 .631.39 1-1.99 1-6.441 0-7.097-.109-7.617-1.333-6.392zm4.333 .333v12.121l3.75-.31c4.302-.356 5.123-2.708 1.5-4.297-2.258-.991-3.059-2.513-1.321-2.513 1.49 0 4.143-3.075 3.522-4.081-.313-.506-2.117-.919-4.009-.919zm9.526 4.331c-1.299 1.299-1.299 1.542 0 2.04 .88.338 1.48 1.89 1.49 3.847 .012 2.487 .25 2.918 .985 1.781 .533-.825.969-3.525 .969-6s-.436-5.175-.969-6c-.789-1.221-.972-1.095-.985.679-.008 1.198-.679 2.842-1.49 3.653z" />
    </svg>
  );
}

// ── Cabeçalho ───────────────────────────────────────────────────────────────
export function Cabecalho({
  voltarPara,
  titulo,
}: {
  /** Se informado, mostra "Voltar" grande à esquerda do logo. */
  voltarPara?: string;
  titulo?: string;
}) {
  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: cor.fundo,
        borderBottom: `2px solid ${cor.borda}`,
        // Estica até as bordas mesmo dentro do container de 640px.
        marginLeft: `-${espaco.md}px`,
        marginRight: `-${espaco.md}px`,
        marginTop: `-${espaco.lg}px`,
        marginBottom: espaco.lg,
        padding: `${espaco.sm}px ${espaco.md}px`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: espaco.sm }}>
        {voltarPara && (
          <Link
            href={voltarPara}
            aria-label="Voltar"
            style={{
              minWidth: toque.min, minHeight: toque.min,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: raio.botao, color: cor.destaqueTexto,
              textDecoration: 'none', flexShrink: 0,
            }}
          >
            <ArrowLeft size={32} strokeWidth={2.5} />
          </Link>
        )}

        <Link
          href="/melhoria"
          aria-label="MelhorIA, ir para o início"
          style={{
            display: 'flex', alignItems: 'center', gap: espaco.xs,
            textDecoration: 'none', minHeight: toque.min, flexShrink: 0,
          }}
        >
          <Image
            src="/brands/melhoria/logo.png"
            alt=""
            width={48}
            height={48}
            style={{ borderRadius: 12 }}
            priority
          />
          <span style={{ fontSize: 25, fontWeight: 800, color: cor.tinta, lineHeight: 1 }}>
            MelhorIA
          </span>
        </Link>

        {titulo && (
          <span style={{
            marginLeft: 'auto', fontSize: 19, fontWeight: 700,
            color: cor.tintaMuted, textAlign: 'right', lineHeight: 1.2,
          }}>
            {titulo}
          </span>
        )}
      </div>
    </header>
  );
}

// ── Rodapé ──────────────────────────────────────────────────────────────────
export function Rodape() {
  return (
    <footer
      style={{
        marginTop: espaco.xl,
        paddingTop: espaco.lg,
        borderTop: `2px solid ${cor.borda}`,
        textAlign: 'center',
      }}
    >
      <p style={{
        fontSize: 19, fontWeight: 700, color: cor.tinta,
        margin: `0 0 ${espaco.xs}px`, lineHeight: 1.4,
      }}>
        MelhorIA — a IA da Melhor Idade!
      </p>

      <p style={{
        fontSize: 18, color: cor.tintaMuted,
        margin: `0 0 ${espaco.md}px`, lineHeight: 1.5,
      }}>
        Lembra, organiza e registra.
        <br />
        Não substitui seu médico.
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: espaco.xs, marginBottom: espaco.sm, flexWrap: 'wrap',
      }}>
        <Image
          src="/logo-circle.png"
          alt=""
          width={24}
          height={24}
          style={{ borderRadius: 6 }}
        />
        <span style={{ fontSize: 17, color: cor.tintaMuted }}>
          Tecnologia{' '}
          <a
            href="https://minhai.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: cor.destaqueTexto, fontWeight: 700 }}
          >
            minhAi
          </a>
          {' · '}
          Desenvolvido por{' '}
          <a
            href="https://bigcorps.com.br"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: cor.destaqueTexto, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <IconeBigCorps tamanho={16} />
            BigCorps
          </a>
        </span>
      </div>

      <nav
        aria-label="Links legais"
        style={{
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
          gap: espaco.md, paddingBottom: espaco.xl,
        }}
      >
        {[
          ['/melhoria/termos', 'Termos de uso'],
          ['/melhoria/aviso', 'Privacidade'],
          ['/melhoria/exclusao', 'Apagar conta'],
        ].map(([href, texto]) => (
          <Link
            key={href}
            href={href}
            style={{
              fontSize: 18, color: cor.tintaMuted, fontWeight: 600,
              textDecoration: 'underline', minHeight: 44,
              display: 'inline-flex', alignItems: 'center',
            }}
          >
            {texto}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

// ── Casca da página ─────────────────────────────────────────────────────────
/**
 * Envolve o conteúdo com cabeçalho e rodapé, e garante fundo branco.
 *
 * O `background` no `<main>` só pinta a coluna de 640px — no desktop as
 * laterais mostram o `<body>`, que na minhAi é escuro. Por isso o layout da
 * MelhorIA força o branco no body (ver app/melhoria/layout.tsx).
 */
export function Pagina({
  children, voltarPara, titulo, semRodape = false,
}: {
  children: React.ReactNode;
  voltarPara?: string;
  titulo?: string;
  semRodape?: boolean;
}) {
  return (
    <main
      style={{
        background: cor.fundo,
        minHeight: '100dvh',
        maxWidth: 640,
        margin: '0 auto',
        padding: `${espaco.lg}px ${espaco.md}px 0`,
        color: cor.tinta,
        fontSize: 20,
      }}
    >
      <Cabecalho voltarPara={voltarPara} titulo={titulo} />
      {children}
      {!semRodape && <Rodape />}
    </main>
  );
}
