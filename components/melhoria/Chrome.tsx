'use client';

// components/melhoria/Chrome.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Cabeçalho, rodapé, carregamento e ícones compartilhados.
//
// ⚠️ POR QUE EXISTE O <IconeCentral>
// O projeto usa `@tailwind base`, e o preflight do Tailwind aplica:
//
//     svg { display: block; vertical-align: middle; }
//
// Com `display: block`, um `textAlign: 'center'` no container NÃO centraliza o
// ícone — ele encosta na esquerda. Era o que acontecia nos estados vazios
// ("Nenhum remédio cadastrado") e no rodapé. A correção é centralizar por
// flexbox ou `margin: 0 auto`, nunca por alinhamento de texto.
// ─────────────────────────────────────────────────────────────────────────────

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Loader2, Menu } from 'lucide-react';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';
import { R } from '@/lib/melhoria/rotas';
import BotaoAjuda from '@/components/melhoria/BotaoAjuda';
import MenuLateral from '@/components/melhoria/MenuLateral';

// ── Ícones ──────────────────────────────────────────────────────────────────

/** SVG oficial de quatro cores. O mesmo dos outros logins da minhAi. */
export function IconeGoogle({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

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

/** Ícone da BigCorps. Laranja da marca (#F97316), como nas outras verticais. */
export function IconeBigCorps({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho} height={tamanho} viewBox="0 0 30 30"
      fill="#F97316" aria-hidden="true"
      // display:block do preflight + flexShrink garantem que ele não deforme
      // nem desalinhe dentro do flex do rodapé.
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path d="M 2.589 26.923c3.905 4.641 19.9 4.741 24.488 .154 4.465-4.465 4.465-19.689 0-24.154s-19.689-4.465-24.154 0c-4.236 4.236-4.443 19.117-.334 24zm0.411-12.146c0-10.652 1.147-11.777 12-11.777 6.667 0 8.333 .333 10 2s2 3.333 2 10c0 10.995-1.042 12-12.443 12-10.698 0-11.557-.908-11.557-12.223zm3.667-6.111c-1.06 1.06-.772 12.15 .333 12.833 .631.39 1-1.99 1-6.441 0-7.097-.109-7.617-1.333-6.392zm4.333 .333v12.121l3.75-.31c4.302-.356 5.123-2.708 1.5-4.297-2.258-.991-3.059-2.513-1.321-2.513 1.49 0 4.143-3.075 3.522-4.081-.313-.506-2.117-.919-4.009-.919zm9.526 4.331c-1.299 1.299-1.299 1.542 0 2.04 .88.338 1.48 1.89 1.49 3.847 .012 2.487 .25 2.918 .985 1.781 .533-.825.969-3.525 .969-6s-.436-5.175-.969-6c-.789-1.221-.972-1.095-.985.679-.008 1.198-.679 2.842-1.49 3.653z" />
    </svg>
  );
}

/**
 * Centraliza um ícone. Use sempre que o ícone precisar ficar no meio —
 * `textAlign: center` não funciona por causa do preflight do Tailwind.
 */
export function IconeCentral({
  children, margemAbaixo = espaco.md,
}: {
  children: React.ReactNode; margemAbaixo?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        marginBottom: margemAbaixo,
      }}
    >
      {children}
    </span>
  );
}

// ── Carregamento ────────────────────────────────────────────────────────────
/**
 * Spinner centralizado de verdade — horizontal e verticalmente.
 *
 * A versão anterior usava `textAlign: center` com `paddingTop`, então o
 * spinner (um SVG, portanto display:block pelo preflight) encostava na
 * esquerda e ficava colado no topo.
 */
export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '50dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: espaco.md,
      }}
    >
      <Loader2 size={56} className="animate-spin" style={{ color: cor.destaque }} aria-hidden="true" />
      <p style={{ fontSize: 21, color: cor.tintaMuted, margin: 0, textAlign: 'center' }}>
        {texto}
      </p>
    </div>
  );
}

/** Bloco cinza que ocupa o lugar do conteúdo enquanto ele chega. */
export function Esqueleto({ altura = 120 }: { altura?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height: altura, borderRadius: raio.card,
        background: cor.fundoCard, border: `2px solid ${cor.borda}`,
        marginBottom: espaco.md,
      }}
    />
  );
}

// ── Cabeçalho ───────────────────────────────────────────────────────────────
export function Cabecalho({
  voltarPara, titulo, comAjuda = true,
}: {
  voltarPara?: string;
  titulo?: string;
  /** false na tela de login e na landing: ali não há a quem avisar. */
  comAjuda?: boolean;
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <>
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: cor.fundo,
          borderBottom: `2px solid ${cor.borda}`,
          marginLeft: `-${espaco.md}px`,
          marginRight: `-${espaco.md}px`,
          marginTop: `-${espaco.lg}px`,
          marginBottom: espaco.lg,
          padding: `${espaco.sm}px ${espaco.sm}px`,
        }}
      >
        {/*
          Logo à ESQUERDA, sem o nome ao lado.

          O nome saiu porque, no tamanho gigante, "MelhorIA" + botão de ajuda
          não cabiam na mesma linha e o botão era cortado. Só o símbolo
          resolve, e o nome continua no rodapé e no menu.
        */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: espaco.xs,
        }}>
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              minHeight: toque.min, padding: `0 ${espaco.xs}px 0 0`,
              background: 'none', border: 'none', cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Image
              src="/brands/melhoria/logo.png" alt="" width={46} height={46}
              style={{ borderRadius: 11, display: 'block', flexShrink: 0 }} priority
            />
            {/* O traço de menu ao lado do logo não é enfeite: logo sozinho lê
                como marca, não como botão, e ninguém descobre que dá para
                tocar. */}
            <Menu size={24} strokeWidth={2.5} style={{ color: cor.tintaMuted }} aria-hidden="true" />
          </button>

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
              <ArrowLeft size={30} strokeWidth={2.5} />
            </Link>
          )}

          {/* espaçador: empurra a ajuda para a direita */}
          <span style={{ flex: 1, minWidth: 0 }} />

          {comAjuda ? <BotaoAjuda /> : (
            titulo ? (
              <span style={{
                fontSize: 18, fontWeight: 700, color: cor.tintaMuted,
                lineHeight: 1.2, whiteSpace: 'nowrap',
              }}>
                {titulo}
              </span>
            ) : null
          )}
        </div>
      </header>

      <MenuLateral aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
    </>
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
      }}
    >
      <p style={{
        fontSize: 19, fontWeight: 700, color: cor.tinta,
        margin: `0 0 ${espaco.xs}px`, lineHeight: 1.4, textAlign: 'center',
      }}>
        MelhorIA — a IA da Melhor Idade!
      </p>

      <p style={{
        fontSize: 18, color: cor.tintaMuted,
        margin: `0 0 ${espaco.md}px`, lineHeight: 1.5, textAlign: 'center',
      }}>
        Lembra, organiza e registra.
        <br />
        Não substitui seu médico.
      </p>

      {/* Uma linha de flex com alinhamento vertical no centro. A versão
          anterior misturava <Image>, texto e <svg> dentro de um <span>, e o
          display:block do preflight jogava o ícone da BigCorps para fora da
          linha de base. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, flexWrap: 'wrap', marginBottom: espaco.md,
        fontSize: 17, color: cor.tintaMuted, lineHeight: 1,
      }}>
        <Image
          src="/logo-circle.png" alt="" width={22} height={22}
          style={{ borderRadius: 6, display: 'block', flexShrink: 0 }}
        />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          Tecnologia
          <a
            href="https://minhai.app" target="_blank" rel="noopener noreferrer"
            style={{ color: cor.destaqueTexto, fontWeight: 700 }}
          >
            minhAi
          </a>
        </span>

        <span aria-hidden="true" style={{ color: cor.borda }}>·</span>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          Desenvolvido por
          <a
            href="https://bigcorps.com.br" target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: cor.destaqueTexto, fontWeight: 700,
            }}
          >
            <IconeBigCorps tamanho={20} />
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
          [R.termos(), 'Termos de uso'],
          [R.aviso(), 'Privacidade'],
          [R.exclusao(), 'Apagar conta'],
        ].map(([href, texto]) => (
          <Link
            key={href} href={href}
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
export function Pagina({
  children, voltarPara, titulo, semRodape = false, comAjuda = true,
}: {
  children: React.ReactNode;
  voltarPara?: string;
  titulo?: string;
  semRodape?: boolean;
  comAjuda?: boolean;
}) {
  return (
    <main
      className="mel-centro"
      style={{
        background: cor.fundo,
        minHeight: '100dvh',
        maxWidth: 640,
        margin: '0 auto',
        padding: `${espaco.lg}px ${espaco.md}px 0`,
        color: cor.tinta,
        fontSize: 20,
        display: 'flex',
        flexDirection: 'column',
        // A centralização de todo o texto vem da classe `mel-centro`,
        // definida no layout. Ver o comentário lá sobre o porquê e sobre as
        // duas exceções (campos de digitação e páginas legais).
        textAlign: 'center',
      }}
    >
      <Cabecalho voltarPara={voltarPara} titulo={titulo} comAjuda={comAjuda} />
      {/* flex:1 faz o conteúdo ocupar a altura livre — é isso que permite ao
          <Carregando> ficar centralizado de verdade, e não colado no topo. */}
      <div style={{ flex: 1 }}>{children}</div>
      {!semRodape && <Rodape />}
    </main>
  );
}
