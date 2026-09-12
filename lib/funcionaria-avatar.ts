/**
 * FuncionarIA — avatar unico.
 */

export const EXPRESSIONS = ['neutra', 'sorriso', 'sorriso-aberto', 'atenta'] as const;

export const BACKGROUND_KEYS = [
  'escritorio', 'corporativo', 'coworking', 'executivo', 'openspace', 'marca', 'custom',
] as const;

export type CounterOption = { key: string; label: string; description: string };

export const COUNTERS: CounterOption[] = [
  { key: 'nenhum', label: 'Sem balcão', description: 'Atendimento por vídeo.' },
  { key: 'madeira-ripada', label: 'Madeira ripada', description: 'Ripado claro com tampo pedra.' },
  { key: 'carvalho-claro', label: 'Carvalho claro', description: 'Madeira lisa e sóbria.' },
  { key: 'nogueira', label: 'Nogueira', description: 'Madeira escura com filete dourado.' },
  { key: 'branco-curvo', label: 'Branco curvo', description: 'Laca branca e rodapé metálico.' },
  { key: 'branco-luz', label: 'Branco iluminado', description: 'Branco com faixa de luz.' },
  { key: 'preto-ripado', label: 'Preto ripado', description: 'Preto fosco com ripas de madeira.' },
];

export function counterPath(key: string): string | null {
  if (!key || key === 'nenhum') return null;
  return `${FUNCIONARIA_AVATAR.root.replace('/avatar', '')}/counters/${key}.webp`;
}

export type Expression = typeof EXPRESSIONS[number];

export const FUNCIONARIA_AVATAR = {
  canvas: { width: 1044, height: 1295 },
  eyesRect: { left: 319, top: 210, width: 409, height: 148 },
  badgeRect: { left: 604, top: 769, width: 211, height: 133 },
  logoChestRect: { left: 622, top: 784, width: 181, height: 114 },
  logoCenterRect: { left: 305, top: 739, width: 458, height: 176 },
  mouthRect: { left: 394, top: 364, width: 272, height: 231 },
  blinkEnabled: true,
  root: '/funcionaria/avatar',
} as const;

export const BLINK_FRAMES = 6;

/**
 * Piscada V9.
 *
 * A principal mudança não é só de timing: o renderer V9 mostra UM quadro de
 * pálpebra por vez. A versão anterior misturava dois frames adjacentes por
 * opacidade para simular blur. Em fotografia isso criava uma segunda borda de
 * pálpebra por alguns milissegundos (o efeito de "olho fantasma").
 *
 * Os intervalos continuam aleatórios, mas o fechar é curto e o abrir é mais
 * lento. O primeiro blink também é retardado no componente para a pessoa não
 * "piscar assim que aparece".
 */
export const BLINK_TIMING = {
  closeMs: 96,
  closeJitterMs: 6,
  holdMs: 20,
  holdJitterMs: 8,
  holdSwapMs: 205,
  openMs: 150,
  openJitterMs: 18,
  gapSpeakingMs: [3600, 6800] as const,
  gapIdleMs: [4200, 7800] as const,
  doubleChance: 0.035,
  doubleGapMs: [115, 175] as const,
  firstBlinkMinMs: 1900,
} as const;

export function eyeFramePath(expression: Expression, frame: number): string {
  return `${FUNCIONARIA_AVATAR.root}/${expression}-eyes-${frame}.webp?v=9`;
}

export const EXPRESSION_CAROUSEL = false;

export const EXPRESSION_POOL: Expression[] = [
  'neutra', 'atenta', 'sorriso', 'neutra', 'atenta',
];

export const VISEMES = [
  'sil', 'PP', 'FF', 'DD', 'kk', 'SS', 'nn', 'aa', 'E', 'I', 'O', 'U',
] as const;

export type Viseme = typeof VISEMES[number];

export function layerPath(expression: Expression, layer: string): string {
  return `${FUNCIONARIA_AVATAR.root}/${expression}-${layer}.webp`;
}

export function mouthPath(viseme: Viseme): string {
  return `${FUNCIONARIA_AVATAR.root}/mouth-${viseme}.webp`;
}

export function expressionAssets(expression: Expression): string[] {
  const layers = [
    'base', 'shirt-mask', 'shirt-shadow', 'shirt-light',
    'trim-mask', 'trim-shadow', 'trim-light',
  ].map(layer => layerPath(expression, layer));

  const eyes: string[] = [];
  for (let i = 1; i <= BLINK_FRAMES; i++) eyes.push(eyeFramePath(expression, i));

  return [...layers, ...eyes];
}

export type LogoPlacement = {
  id: string;
  label: string;
  description: string;
};

export const LOGO_PLACEMENTS: LogoPlacement[] = [
  { id: 'nenhum', label: 'Sem logo', description: 'Uniforme liso, sem marca.' },
  { id: 'cracha', label: 'No crachá', description: 'Cartão branco preso à camiseta.' },
  { id: 'peito', label: 'No peito', description: 'Estampado, no lugar do crachá.' },
  { id: 'centro', label: 'Centralizado', description: 'Grande, abaixo da gola.' },
];

export function getLogoPlacement(id?: string | null): string {
  return LOGO_PLACEMENTS.some(item => item.id === id) ? (id as string) : 'cracha';
}

export type UniformColor = {
  id: string;
  label: string;
  shirt: string;
  trim: string;
};

export const UNIFORM_COLORS: UniformColor[] = [
  { id: 'branco',   label: 'Branco',   shirt: '#FFFFFF', trim: '#1F2937' },
  { id: 'preto',    label: 'Preto',    shirt: '#111827', trim: '#FFFFFF' },
  { id: 'marinho',  label: 'Marinho',  shirt: '#1E3A8A', trim: '#FFFFFF' },
  { id: 'azul',     label: 'Azul',     shirt: '#2563EB', trim: '#FFFFFF' },
  { id: 'verde',    label: 'Verde',    shirt: '#15803D', trim: '#FFFFFF' },
  { id: 'vermelho', label: 'Vermelho', shirt: '#DC2626', trim: '#FFFFFF' },
  { id: 'vinho',    label: 'Vinho',    shirt: '#881337', trim: '#FBBF24' },
  { id: 'laranja',  label: 'Laranja',  shirt: '#EA580C', trim: '#1F2937' },
  { id: 'roxo',     label: 'Roxo',     shirt: '#6D28D9', trim: '#FFFFFF' },
  { id: 'grafite',  label: 'Grafite',  shirt: '#374151', trim: '#F59E0B' },
];

export function getUniformColor(id?: string | null): UniformColor {
  return UNIFORM_COLORS.find(c => c.id === id) || UNIFORM_COLORS[2];
}
