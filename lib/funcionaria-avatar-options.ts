export type FuncionarIAAvatarOptionId = 'piloto' | 'option-1' | 'option-2' | 'option-3';

export type FuncionarIAAvatarRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type FuncionarIAAvatarOption = {
  id: FuncionarIAAvatarOptionId;
  label: string;
  basePath: string;
  canvas: { width: number; height: number };
  mouthRect: FuncionarIAAvatarRect;
  eyesRect: FuncionarIAAvatarRect;
  badgeRect: FuncionarIAAvatarRect;
  /**
   * Legado, mantido em 1 nas três opções.
   *
   * Os valores anteriores (1,08 e 1,05) existiam para compensar enquadramentos
   * que se imaginava diferentes entre as bases. Medindo a silhueta: as três
   * ocupam 98,5% a 98,9% da altura do canvas — são praticamente idênticas. A
   * escala extra, com origem no rodapé, empurrava o topo para fora do
   * contêiner, e era ela que cortava a cabeça das opções 1 e 3.
   */
  displayScale: number;
  /**
   * Nem todo pack tem todas as camadas. O piloto não tem `shirt-shade.png` nem
   * `hair-front.png` — a primeira ficou desnecessária porque a camiseta já
   * carrega as próprias dobras, a segunda porque o cabelo está preso. Pedir
   * esses arquivos sempre gerava dois 404, e o navegador desenha o ícone de
   * imagem quebrada no canto do avatar.
   */
  hasShirtShade: boolean;
  hasHairFront: boolean;
};

/**
 * Os rects são em pixels da base de 1400×2020 e foram conferidos recortando a
 * base neles: os três enquadram boca e olhos corretamente. Se um frame novo não
 * encaixar, o problema está no frame, não aqui.
 *
 * Valores arredondados para inteiro — `extract` do sharp e `background-position`
 * do CSS trabalham em pixel cheio, e a fração só criava divergência de meio
 * pixel entre o que o script recorta e o que o navegador desenha.
 */
export const FUNCIONARIA_AVATAR_OPTIONS: FuncionarIAAvatarOption[] = [
  /**
   * Piloto. Todos os retângulos foram medidos por
   * scripts/build-pack-from-fullframes.mjs a partir dos próprios frames — nada
   * aqui foi digitado à mão, que era a origem dos desencontros anteriores.
   */
  {
    id: 'piloto',
    label: 'Piloto',
    basePath: '/funcionaria/avatar-packs/raw/piloto',
    canvas: { width: 1400, height: 2020 },
    mouthRect: { left: 527, top: 468, width: 280, height: 271 },
    eyesRect: { left: 505, top: 259, width: 396, height: 205 },
    badgeRect: { left: 317, top: 988, width: 191, height: 267 },
    displayScale: 1,
    hasShirtShade: false,
    hasHairFront: false,
  },
  {
    id: 'option-1',
    label: 'Opção 1',
    basePath: '/funcionaria/avatar-packs/raw/option-1',
    canvas: { width: 1400, height: 2020 },
    mouthRect: { left: 615, top: 536, width: 180, height: 101 },
    eyesRect: { left: 491, top: 319, width: 449, height: 113 },
    badgeRect: { left: 645, top: 1645, width: 112, height: 155 },
    displayScale: 1,
    hasShirtShade: true,
    hasHairFront: true,
  },
  {
    id: 'option-2',
    label: 'Opção 2',
    basePath: '/funcionaria/avatar-packs/raw/option-2',
    canvas: { width: 1400, height: 2020 },
    mouthRect: { left: 634, top: 539, width: 180, height: 101 },
    eyesRect: { left: 516, top: 293, width: 394, height: 91 },
    badgeRect: { left: 637, top: 1750, width: 116, height: 160 },
    displayScale: 1,
    hasShirtShade: true,
    hasHairFront: true,
  },
  {
    id: 'option-3',
    label: 'Opção 3',
    basePath: '/funcionaria/avatar-packs/raw/option-3',
    canvas: { width: 1400, height: 2020 },
    mouthRect: { left: 646, top: 609, width: 184, height: 103 },
    eyesRect: { left: 488, top: 358, width: 503, height: 129 },
    badgeRect: { left: 665, top: 1745, width: 116, height: 170 },
    displayScale: 1,
    hasShirtShade: true,
    hasHairFront: true,
  },
];

export const FUNCIONARIA_VISEMES = [
  'sil', 'PP', 'FF', 'DD', 'kk', 'SS', 'nn', 'aa', 'E', 'I', 'O', 'U',
] as const;

export function normalizeFuncionarIAAvatarOptionId(value?: string | null): FuncionarIAAvatarOptionId {
  return FUNCIONARIA_AVATAR_OPTIONS.some((item) => item.id === value)
    ? (value as FuncionarIAAvatarOptionId)
    : 'piloto';
}

export function getFuncionarIAAvatarOption(value?: string | null): FuncionarIAAvatarOption {
  const id = normalizeFuncionarIAAvatarOptionId(value);
  return FUNCIONARIA_AVATAR_OPTIONS.find((item) => item.id === id) || FUNCIONARIA_AVATAR_OPTIONS[0];
}

export function getFuncionarIAAvatarPaths(value?: string | null) {
  const option = getFuncionarIAAvatarOption(value);
  const root = option.basePath;
  const processed = `/funcionaria/avatar-packs/processed-v3/${option.id}`;

  return {
    ...option,
    baseFull: `${root}/base-full.png`,
    base: `${root}/base.png`,
    hairFront: `${root}/hair-front.png`,
    shirtShade: `${root}/shirt-shade.png`,
    shirtMask: `${processed}/masks/shirt.png`,
    shirtDetailMask: `${processed}/masks/shirt-detail.png`,

    /**
     * `sil` aponta para o recorte processado como os demais. Antes ele vinha de
     * `raw/`, que tem outro tamanho de recorte — misturar as duas origens fazia
     * o frame de repouso não bater com os frames de fala.
     */
    mouth: Object.fromEntries(
      FUNCIONARIA_VISEMES.map((key) => [key, `${processed}/mouth/${key}.png`]),
    ) as Record<string, string>,

    /**
     * Estes caminhos apontavam para `processed-v3/<id>/eyes/`, pasta que não
     * existia no repositório — os `<img>` davam 404 em silêncio e a piscada
     * simplesmente nunca acontecia. Os frames agora são gerados ali por
     * `scripts/build-blink-frames.mjs`.
     */
    eyes: {
      open: `${processed}/eyes/open.png`,
      half: `${processed}/eyes/half.png`,
      closed: `${processed}/eyes/closed.png`,
    },
  };
}
