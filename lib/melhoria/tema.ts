// lib/melhoria/tema.ts
// ─────────────────────────────────────────────────────────────────────────────
// Paleta ÚNICA da MelhorIA. Não existe dark mode aqui, de propósito: é mais
// uma decisão que o usuário não vai entender, e alternar tema é a origem de
// metade dos bugs de contraste. Mesma escolha do ConsultaTec.
//
// A régua desta marca é WCAG AAA (7:1), não AA (4,5:1). O público tem
// presbiopia e frequentemente catarata: 4,5:1 é legível num teste de
// laboratório e ilegível na cozinha às 6h da manhã.
//
// Todos os pares abaixo foram calculados. Se trocar uma cor, recalcule —
// a razão de contraste não é intuitiva.
// ─────────────────────────────────────────────────────────────────────────────

export const cor = {
  // Fundos
  fundo:       '#FFFFFF',
  fundoCard:   '#F1F5F9',
  fundoSuave:  '#F8FAFC',

  // Bordas — mais escuras que o padrão de mercado. Borda de #E2E8F0 é
  // invisível para quem tem catarata.
  borda:       '#94A3B8',
  bordaForte:  '#64748B',

  // Texto
  tinta:       '#0F172A',  // 17,9:1 sobre branco
  tintaMuted:  '#475569',  //  7,5:1 sobre branco — ainda AAA
  tintaFraca:  '#64748B',  //  5,3:1 — só para rótulo grande (≥24px)

  // Marca
  destaque:      '#0F766E', //  5,9:1 como fundo de botão com texto branco
  destaqueHover: '#115E59',
  destaqueTexto: '#115E59', //  7,7:1 como texto sobre branco
  destaqueSuave: '#CCFBF1',
  turquesa:      '#2DD4BF', // só decorativo — NUNCA sob texto

  // Estados
   okBg:      '#DCFCE7',
  okTexto:   '#14532D',
  atencaoBg: '#FEF3C7',
  atencaoTexto: '#78350F',
  perigo:      '#B91C1C',   //  6,4:1 com branco
  perigoHover: '#991B1B',
  perigoBg:    '#FEE2E2',
  perigoTexto: '#7F1D1D',
} as const;

// ── Tipografia ───────────────────────────────────────────────────────────────
// Base 20px. Nada abaixo de 18px em lugar nenhum do app, nunca — nem rodapé,
// nem legenda, nem aviso legal.
export type TamanhoFonte = 'normal' | 'grande' | 'gigante';

export const ESCALA: Record<TamanhoFonte, number> = {
  normal:  1.00,   // base 20px
  grande:  1.20,   // base 24px
  gigante: 1.40,   // base 28px
};

export const fonte = {
  base:     20,
  corpo:    20,
  rotulo:   18,
  titulo:   30,
  tituloG:  38,
  numero:   44,   // horário no cartão de dose
} as const;

/** Aplica a escala do perfil a um tamanho em px. */
export function px(valor: number, escala: TamanhoFonte = 'grande'): number {
  return Math.round(valor * ESCALA[escala]);
}

// ── Toque ────────────────────────────────────────────────────────────────────
// O padrão do setor é 44px (Apple HIG). Presbiopia + tremor essencial pedem
// mais: 64px é o mínimo aqui, 72px no que é crítico.
export const toque = {
  min:      64,
  confortavel: 72,
  critico:  88,   // "Tomei", botão de emergência
} as const;

export const raio = {
  card:   16,
  botao:  14,
  campo:  12,
} as const;

export const espaco = {
  xs: 8, sm: 12, md: 20, lg: 28, xl: 40,
} as const;

// ── Helpers de estilo ────────────────────────────────────────────────────────

export function estiloBotaoPrimario(escala: TamanhoFonte = 'grande') {
  return {
    minHeight: toque.confortavel,
    padding: `${espaco.sm}px ${espaco.lg}px`,
    borderRadius: raio.botao,
    background: cor.destaque,
    color: '#FFFFFF',
    fontSize: px(fonte.corpo, escala),
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    lineHeight: 1.3,
  } as const;
}

export function estiloBotaoSecundario(escala: TamanhoFonte = 'grande') {
  return {
    minHeight: toque.confortavel,
    padding: `${espaco.sm}px ${espaco.lg}px`,
    borderRadius: raio.botao,
    background: cor.fundo,
    color: cor.destaqueTexto,
    fontSize: px(fonte.corpo, escala),
    fontWeight: 700,
    border: `2px solid ${cor.borda}`,
    cursor: 'pointer',
    width: '100%',
    lineHeight: 1.3,
  } as const;
}

export function estiloCampo(escala: TamanhoFonte = 'grande') {
  return {
    minHeight: toque.min,
    width: '100%',
    padding: `${espaco.sm}px ${espaco.md}px`,
    borderRadius: raio.campo,
    border: `2px solid ${cor.borda}`,
    background: cor.fundo,
    color: cor.tinta,
    fontSize: px(fonte.corpo, escala),
    lineHeight: 1.4,
    // 16px+ evita o zoom automático do Safari iOS ao focar o campo, que
    // desloca o layout inteiro e assusta quem não sabe desfazer.
  } as const;
}

// ── Formatação em português claro ────────────────────────────────────────────

export function horaCurta(iso: string, tz = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: tz,
  }).format(new Date(iso));
}

export function diaPorExtenso(iso: string, tz = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: tz,
  }).format(new Date(iso));
}

export const NOMES_DIAS = [
  'domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado',
] as const;

export const NOMES_DIAS_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/** "todos os dias" / "segunda, quarta e sexta" — nunca "1,3,5". */
export function descreverDias(dias: number[]): string {
  if (dias.length === 7) return 'todos os dias';
  if (dias.length === 0) return 'nenhum dia';

  const nomes = [...dias].sort((a, b) => a - b).map((d) => NOMES_DIAS[d]);
  if (nomes.length === 1) return `toda ${nomes[0]}`;

  const ultimo = nomes.pop()!;
  return `${nomes.join(', ')} e ${ultimo}`;
}

/**
 * "restam 12 créditos".
 *
 * Eu tinha escolhido "usos" achando que seria mais claro que "créditos".
 * Estava errado: "crédito" é a palavra que a pessoa já conhece de recarga de
 * celular, e é a mesma usada no resto do ecossistema minhAi. Inventar um termo
 * próprio só cria uma tradução mental a mais.
 */
export function descreverCreditos(n: number): string {
  if (n <= 0) return 'sem créditos';
  if (n === 1) return 'resta 1 crédito';
  return `restam ${n} créditos`;
}

/** "1 crédito" / "3 créditos" — para o custo de uma função. */
export function custoEmCreditos(n: number): string {
  return n === 1 ? '1 crédito' : `${n} créditos`;
}
