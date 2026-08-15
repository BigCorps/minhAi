export const ORNAMENTOS_ASSETS = [
  {
    id: 'casamento-original',
    nome: 'Casamento Original',
    descricao: 'Rosas e ramos do convite Miriam & Ithiel',
    ia: 'casamento romântico, rosas, cerimônia elegante, delicado, clássico floral',
  },
  {
    id: 'alta-costura',
    nome: 'Alta Costura',
    descricao: 'Fino, chique e sofisticado',
    ia: 'chique, sofisticado, moda, luxo moderno, debutante, feminino elegante',
  },
  {
    id: 'imperial',
    nome: 'Imperial',
    descricao: 'Clássico, formal e ornamentado',
    ia: 'clássico, tradicional, barroco, formal, bodas, cerimônia, luxo tradicional',
  },
  {
    id: 'art-deco',
    nome: 'Art Déco',
    descricao: 'Luxo geométrico e marcante',
    ia: 'art déco, gatsby, preto e dourado, formatura, luxo geométrico, noturno',
  },
  {
    id: 'organico-chic',
    nome: 'Orgânico',
    descricao: 'Contemporâneo, leve e estiloso',
    ia: 'orgânico, contemporâneo, design, boho moderno, tropical sofisticado, natureza',
  },
  {
    id: 'radical',
    nome: 'Radical',
    descricao: 'Urbano, angular e enérgico',
    ia: 'radical, urbano, rock, esporte, gamer, jovem, masculino, energético',
  },

  // Estilos já existentes — preservados.
  {
    id: 'floral',
    nome: 'Floral',
    descricao: 'Floral simples e delicado',
    ia: 'romântico, delicado, botânico',
  },
  {
    id: 'classico',
    nome: 'Clássico',
    descricao: 'Tradicional e discreto',
    ia: 'elegante, tradicional, cerimônia',
  },
  {
    id: 'geometrico',
    nome: 'Geométrico',
    descricao: 'Moderno e estruturado',
    ia: 'moderno, masculino, corporativo, urbano',
  },
  {
    id: 'minimal',
    nome: 'Minimalista',
    descricao: 'Clean e discreto',
    ia: 'clean, sóbrio, adulto, contemporâneo',
  },
  {
    id: 'festivo',
    nome: 'Festivo',
    descricao: 'Leve, alegre e descontraído',
    ia: 'aniversário, 15 anos, infantil, alegre',
  },
  {
    id: 'rustico',
    nome: 'Rústico',
    descricao: 'Natural, campo e boho',
    ia: 'campo, boho, natureza, tropical, aventura',
  },
] as const;

export type OrnamentoCatalogoId =
  (typeof ORNAMENTOS_ASSETS)[number]['id'];

export const ORNAMENTOS_IDS =
  ORNAMENTOS_ASSETS.map((o) => o.id) as OrnamentoCatalogoId[];

export function ehOrnamentoId(
  id?: string | null
): id is OrnamentoCatalogoId {
  return Boolean(
    id &&
    ORNAMENTOS_ASSETS.some((o) => o.id === id)
  );
}

export function assetOrnamento(id?: string) {
  return (
    ORNAMENTOS_ASSETS.find((o) => o.id === id) ??
    ORNAMENTOS_ASSETS[0]
  );
}

export function catalogoOrnamentosParaIA() {
  return ORNAMENTOS_ASSETS
    .map((o) => `${o.id}: ${o.nome} — ${o.ia}`)
    .join('; ');
}
