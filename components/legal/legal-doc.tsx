'use client';

// Primitivas compartilhadas das páginas legais (aviso / termos / exclusão) das
// marcas servidas por este repositório.
//
// Por que não reusar as classes `prose` das páginas do ArteFinal: o plugin
// @tailwindcss/typography NÃO está instalado neste projeto (tailwind.config.ts
// carrega só tailwindcss-animate). Sem ele, `prose` é uma classe inexistente e
// o preflight do Tailwind deixa h2 sem tamanho/peso e ul sem marcador. Aqui a
// tipografia é explícita, então renderiza igual em qualquer marca.

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type LegalTheme = {
  /** wrapper da página inteira */
  pageBg: string;
  /** h1 do cabeçalho */
  title: string;
  /** botão voltar */
  backBtn: string;
  /** card branco/escuro que envolve o texto */
  card: string;
  /** corpo de texto */
  body: string;
  /** texto secundário */
  muted: string;
  /** h2 e h3 */
  heading: string;
  /** marcador de lista */
  marker: string;
  /** links inline */
  link: string;
  /** botão de ação principal */
  primaryBtn: string;
  /** botão secundário/contorno */
  ghostBtn: string;
  /** botão destrutivo */
  dangerBtn: string;
  /** caixa informativa */
  infoBox: string;
  /** caixa de atenção */
  warnBox: string;
  /** caixa de perigo */
  dangerBox: string;
  /** caixa neutra (contato, prazos) */
  neutralBox: string;
  /** input de texto */
  input: string;
  /** cor do spinner */
  spinner: string;
};

export const LEGAL_THEMES: Record<
  'conviteia' | 'consultatec' | 'pix' | 'melhoria',
  LegalTheme
> = {
  // MelhorIA — mesma paleta do aplicativo. Sem dark mode, igual ao ConsultaTec.
  //
  // Aqui a régua é WCAG AAA (7:1), não AA: o público é presbita e boa parte
  // tem catarata. Por isso o corpo usa slate-800 e não slate-600, e a borda é
  // slate-400 e não slate-200 — borda clara demais simplesmente some.
  //
  // O tamanho do texto destas páginas é aumentado no LegalShell quando o tema
  // é este (ver `textoGrande`): aviso de privacidade em 14px é letra miúda de
  // contrato, exatamente o que este público não consegue ler.
  melhoria: {
    pageBg: 'min-h-screen bg-white',
    title: 'text-slate-900',
    backBtn: 'text-slate-900 hover:bg-slate-100',
    card: 'bg-white border-2 border-slate-300 shadow-sm',
    body: 'text-slate-800',
    muted: 'text-slate-600',
    heading: 'text-slate-900',
    marker: 'text-teal-700',
    link: 'text-teal-800 underline underline-offset-2 hover:text-teal-900 font-semibold',
    primaryBtn: 'bg-teal-700 text-white hover:bg-teal-800',
    ghostBtn: 'bg-white border-2 border-slate-400 text-slate-900 hover:bg-slate-50',
    dangerBtn: 'bg-white text-red-800 border-2 border-red-300 hover:bg-red-50',
    infoBox: 'bg-teal-50 border-2 border-teal-200',
    warnBox: 'bg-amber-50 border-2 border-amber-300',
    dangerBox: 'bg-red-50 border-2 border-red-300',
    neutralBox: 'bg-slate-50 border-2 border-slate-300',
    input: 'bg-white border-2 border-slate-400 text-slate-900 focus:ring-2 focus:ring-teal-700',
    spinner: 'text-teal-700',
  },

  // Convite IA — rosa da paleta do manifest (#c06078 / #fdf0f3 / #40232c)
  conviteia: {
    pageBg: 'min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50',
    title: 'text-[#40232c]',
    backBtn: 'text-[#40232c] hover:bg-[#40232c]/5',
    card: 'bg-white border border-rose-100 shadow-xl',
    body: 'text-[#4a3a3f]',
    muted: 'text-[#8a6b74]',
    heading: 'text-[#40232c]',
    marker: 'text-[#c06078]',
    link: 'text-[#c06078] underline underline-offset-2 hover:text-[#a84f66]',
    primaryBtn: 'bg-[#c06078] text-white hover:bg-[#a84f66]',
    ghostBtn: 'bg-white border border-rose-200 text-[#40232c] hover:bg-rose-50',
    dangerBtn: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
    infoBox: 'bg-rose-50 border border-rose-200',
    warnBox: 'bg-amber-50 border border-amber-200',
    dangerBox: 'bg-red-50 border border-red-200',
    neutralBox: 'bg-[#fdf0f3] border border-rose-100',
    input: 'bg-white border border-rose-200 text-[#40232c] focus:ring-2 focus:ring-[#c06078]',
    spinner: 'text-[#c06078]',
  },

  // ConsultaTec — "papel moeda antigo". Não tem dark mode: é a única paleta.
  consultatec: {
    pageBg: 'min-h-screen bg-[#F2EAD3]',
    title: 'text-[#1C1A14]',
    backBtn: 'text-[#1C1A14] hover:bg-[#1C1A14]/5',
    card: 'bg-[#FBF6E9] border border-[#C9BFA0] shadow-md',
    body: 'text-[#1C1A14]',
    muted: 'text-[#6B6350]',
    heading: 'text-[#1C1A14]',
    marker: 'text-[#7A6142]',
    link: 'text-[#7A6142] underline underline-offset-2 hover:text-[#5d4931]',
    primaryBtn: 'bg-[#7A6142] text-[#FBF6E9] hover:bg-[#5d4931]',
    ghostBtn: 'bg-[#FBF6E9] border border-[#C9BFA0] text-[#1C1A14] hover:bg-[#F2EAD3]',
    dangerBtn: 'bg-[#FBF6E9] text-[#8f2d2d] border border-[#c9a0a0] hover:bg-[#f7ebe6]',
    infoBox: 'bg-[#F2EAD3] border border-[#C9BFA0]',
    warnBox: 'bg-[#F5E6C8] border border-[#C9A96A]',
    dangerBox: 'bg-[#F7E6E2] border border-[#C9A0A0]',
    neutralBox: 'bg-[#F2EAD3] border border-[#C9BFA0]',
    input: 'bg-[#FBF6E9] border border-[#C9BFA0] text-[#1C1A14] focus:ring-2 focus:ring-[#7A6142]',
    spinner: 'text-[#7A6142]',
  },

  // Pix Wiki — fundo escuro (#020617) com acento teal do logo
  pix: {
    pageBg: 'min-h-screen bg-[#020617]',
    title: 'text-slate-50',
    backBtn: 'text-slate-200 hover:bg-white/5',
    card: 'bg-slate-900/70 border border-slate-800 shadow-xl',
    body: 'text-slate-300',
    muted: 'text-slate-400',
    heading: 'text-slate-50',
    marker: 'text-teal-400',
    link: 'text-teal-400 underline underline-offset-2 hover:text-teal-300',
    primaryBtn: 'bg-teal-500 text-slate-950 hover:bg-teal-400',
    ghostBtn: 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800',
    dangerBtn: 'bg-red-950/60 text-red-300 border border-red-900 hover:bg-red-900/60',
    infoBox: 'bg-teal-950/40 border border-teal-900',
    warnBox: 'bg-amber-950/40 border border-amber-900',
    dangerBox: 'bg-red-950/40 border border-red-900',
    neutralBox: 'bg-slate-900/60 border border-slate-800',
    input: 'bg-slate-900 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-teal-500',
    spinner: 'text-teal-400',
  },
};

const ThemeCtx = createContext<LegalTheme>(LEGAL_THEMES.conviteia);
export const useLegalTheme = () => useContext(ThemeCtx);

/* ─────────────────────────── tipografia ─────────────────────────── */

export function H2({ children }: { children: ReactNode }) {
  const t = useLegalTheme();
  return (
    <h2 className={`text-lg md:text-xl font-bold mt-8 mb-3 first:mt-0 ${t.heading}`}>
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  const t = useLegalTheme();
  return <h3 className={`text-base font-semibold mt-5 mb-2 ${t.heading}`}>{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  const t = useLegalTheme();
  return <p className={`text-sm md:text-base leading-relaxed mb-3 ${t.body}`}>{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  const t = useLegalTheme();
  return <ul className={`mb-4 space-y-2 text-sm md:text-base ${t.body}`}>{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  const t = useLegalTheme();
  return (
    <li className="flex gap-2 leading-relaxed">
      <span className={`shrink-0 font-bold ${t.marker}`} aria-hidden="true">
        &bull;
      </span>
      <span>{children}</span>
    </li>
  );
}

export function OL({ children }: { children: ReactNode }) {
  const t = useLegalTheme();
  return (
    <ol className={`mb-4 space-y-2 text-sm md:text-base list-decimal pl-5 ${t.body}`}>
      {children}
    </ol>
  );
}

export function Box({
  variant = 'neutral',
  children,
}: {
  variant?: 'info' | 'warn' | 'danger' | 'neutral';
  children: ReactNode;
}) {
  const t = useLegalTheme();
  const cls =
    variant === 'info'
      ? t.infoBox
      : variant === 'warn'
        ? t.warnBox
        : variant === 'danger'
          ? t.dangerBox
          : t.neutralBox;
  return <div className={`rounded-xl p-4 my-4 ${cls}`}>{children}</div>;
}

/* ─────────────────────────── casca da página ─────────────────────────── */

export function LegalShell({
  theme,
  title,
  updatedAt,
  children,
  footer,
  scroll = true,
  textoGrande = false,
}: {
  theme: LegalTheme;
  title: string;
  updatedAt?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** false para páginas com formulário, que não devem viver dentro de um scroll interno */
  scroll?: boolean;
  /**
   * Aumenta o corpo do texto e desliga o scroll interno. Usado pela MelhorIA:
   * o público não consegue ler 14px, e caixa com rolagem própria dentro da
   * página confunde quem já tem dificuldade com rolagem.
   */
  textoGrande?: boolean;
}) {
  const router = useRouter();

  return (
    <ThemeCtx.Provider value={theme}>
      <div className={theme.pageBg}>
        <div className="container mx-auto py-6 md:py-12 w-full max-w-4xl px-4">
          <div className="flex items-center justify-between mb-6 gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Voltar"
              className={`p-2 rounded-lg transition-colors ${theme.backBtn}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <h1 className={`text-xl md:text-3xl font-bold text-center ${theme.title}`}>{title}</h1>
            <div className="w-9 shrink-0" />
          </div>

          <div className={`rounded-2xl p-5 md:p-8 ${theme.card}`}>
            {updatedAt && (
              <p className={`text-xs md:text-sm mb-5 ${theme.muted}`}>
                <strong>Última atualização:</strong> {updatedAt}
              </p>
            )}
            <div
              className={
                textoGrande
                  ? 'text-lg md:text-xl leading-relaxed'
                  : scroll
                    ? 'max-h-[70vh] overflow-y-auto pr-2 md:pr-4'
                    : ''
              }
            >
              {children}
            </div>
          </div>

          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/** Rodapé com os links cruzados entre as três páginas legais da marca. */
export function LegalFooterLinks({
  theme,
  links,
}: {
  theme: LegalTheme;
  links: { href: string; label: string; danger?: boolean }[];
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      {links.map((l) =>
        l.href.startsWith('mailto:') ? (
          <a key={l.href} href={l.href} className="w-full sm:w-auto">
            <button
              type="button"
              className={`w-full px-5 py-3 rounded-lg font-medium text-sm transition-colors ${
                l.danger ? theme.dangerBtn : theme.ghostBtn
              }`}
            >
              {l.label}
            </button>
          </a>
        ) : (
          <Link key={l.href} href={l.href} className="w-full sm:w-auto">
            <button
              type="button"
              className={`w-full px-5 py-3 rounded-lg font-medium text-sm transition-colors ${
                l.danger ? theme.dangerBtn : theme.ghostBtn
              }`}
            >
              {l.label}
            </button>
          </Link>
        )
      )}
    </div>
  );
}

/** Bloco de identificação do controlador, igual nas três marcas. */
export function ControladorBox({ produto }: { produto: string }) {
  return (
    <Box>
      <P>
        <strong>{produto}</strong> é um produto desenvolvido e operado por:
      </P>
      <P>
        <strong>BigCorps Tecnologia LTDA</strong>
        <br />
        CNPJ 14.282.244/0001-19
        <br />
        Rua Saguairu, 925 &mdash; São Paulo/SP &mdash; CEP 02514-000 &mdash; Brasil
      </P>
      <P>
        <strong>Contato para privacidade e LGPD:</strong> contato@bigcorps.com.br
        <br />
        <strong>Atendimento:</strong> segunda a sexta, 9h às 18h (horário de Brasília)
      </P>
    </Box>
  );
}
