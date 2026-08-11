// ---------------------------------------------------------------------------
// Temas de cor. Espelha conviteria.temas no banco.
//
// Os tons de `bloco` foram escurecidos ate 4,5:1 contra `blocoTexto`. Os
// valores originais, mais claros, reprovavam entre 2,26 e 3,65 — as linhas
// pequenas do bloco da data ficavam ilegiveis no celular sob sol.
//
// `acentoTexto` existe separado de `acento` porque o acento passa em 3:1
// (serve para titulo grande) mas nao em 4,5:1 (texto pequeno).
// ---------------------------------------------------------------------------

export interface Tema {
  id: string;
  nome: string;
  fora: string;
  papel: string;
  acento: string;
  acentoTexto: string;
  tinta: string;
  tintaSuave: string;
  bloco: string;
  blocoTexto: string;
  /** Ornamentos florais. Escuro o bastante para nao sumir no papel. */
  floral: { petalaClara: string; petalaMedia: string; petalaEscura: string; folha: string; caule: string };
}

const floralRose = {
  petalaClara: '#f2d5cd', petalaMedia: '#e3b5ae', petalaEscura: '#b4767c',
  folha: '#afae9b', caule: '#9a9784',
};

export const TEMAS: Tema[] = [
  { id: 'rose', nome: 'Rosê', fora: '#ffffff', papel: '#faeee9',
    acento: '#b4767c', acentoTexto: '#936065', tinta: '#5e4348', tintaSuave: '#81676a',
    bloco: '#896762', blocoTexto: '#fdf3ef', floral: floralRose },

  { id: 'marca', nome: 'Convite IA', fora: '#ffffff', papel: '#fdf0f3',
    acento: '#c06078', acentoTexto: '#a04a63', tinta: '#40232c', tintaSuave: '#7c5560',
    bloco: '#b34f77', blocoTexto: '#fff5f8',
    floral: { petalaClara: '#f7c8d8', petalaMedia: '#e8a0bc', petalaEscura: '#c06078', folha: '#b9aeae', caule: '#a09292' } },

  { id: 'sage', nome: 'Sage & Creme', fora: '#ffffff', papel: '#fbfaf5',
    acento: '#7d8b6a', acentoTexto: '#657155', tinta: '#3f4436', tintaSuave: '#66705a',
    bloco: '#6f7463', blocoTexto: '#fbfaf5',
    floral: { petalaClara: '#eae7da', petalaMedia: '#cdd0bb', petalaEscura: '#7d8b6a', folha: '#a4ac92', caule: '#8c9479' } },

  { id: 'terracota', nome: 'Terracota', fora: '#ffffff', papel: '#fdf4ef',
    acento: '#a8563a', acentoTexto: '#8e4830', tinta: '#4a2c1f', tintaSuave: '#7d5340',
    bloco: '#9b624a', blocoTexto: '#fdf4ef',
    floral: { petalaClara: '#f2d9c9', petalaMedia: '#dfb197', petalaEscura: '#a8563a', folha: '#b4a48e', caule: '#9c8b76' } },

  { id: 'azul', nome: 'Azul Sereno', fora: '#ffffff', papel: '#f4f7fa',
    acento: '#4a6d86', acentoTexto: '#3f5c72', tinta: '#26333d', tintaSuave: '#556873',
    bloco: '#5e7381', blocoTexto: '#f4f7fa',
    floral: { petalaClara: '#dbe6ee', petalaMedia: '#b2c6d5', petalaEscura: '#4a6d86', folha: '#9fb0b8', caule: '#87999f' } },

  { id: 'borgonha', nome: 'Borgonha', fora: '#ffffff', papel: '#faf3f3',
    acento: '#7d2e3c', acentoTexto: '#7d2e3c', tinta: '#3a1d22', tintaSuave: '#6b4149',
    bloco: '#9c4a58', blocoTexto: '#faf3f3',
    floral: { petalaClara: '#efd6d8', petalaMedia: '#d3a3aa', petalaEscura: '#7d2e3c', folha: '#a9a094', caule: '#93897d' } },

  { id: 'dourado', nome: 'Dourado & Marfim', fora: '#ffffff', papel: '#fdfaf2',
    acento: '#8a7038', acentoTexto: '#755f2f', tinta: '#3d3524', tintaSuave: '#6b5c3c',
    bloco: '#827149', blocoTexto: '#fdfaf2',
    floral: { petalaClara: '#f0e6cd', petalaMedia: '#d9c79c', petalaEscura: '#8a7038', folha: '#b0aa8e', caule: '#999377' } },

  { id: 'lavanda', nome: 'Lavanda', fora: '#ffffff', papel: '#f8f5fb',
    acento: '#6b5a85', acentoTexto: '#5c4d73', tinta: '#332b40', tintaSuave: '#615572',
    bloco: '#776c8b', blocoTexto: '#f8f5fb',
    floral: { petalaClara: '#e5dcf0', petalaMedia: '#c3b4d8', petalaEscura: '#6b5a85', folha: '#a9a3b5', caule: '#928ca0' } },

  { id: 'menta', nome: 'Menta', fora: '#ffffff', papel: '#f2f8f6',
    acento: '#3f7d6c', acentoTexto: '#366b5c', tinta: '#213b34', tintaSuave: '#4e6b62',
    bloco: '#54776d', blocoTexto: '#f2f8f6',
    floral: { petalaClara: '#d8ebe4', petalaMedia: '#a9d0c3', petalaEscura: '#3f7d6c', folha: '#9db8ad', caule: '#86a197' } },

  { id: 'noite', nome: 'Noite', fora: '#0f0e11', papel: '#1d1a1f',
    acento: '#e0a3b8', acentoTexto: '#e0a3b8', tinta: '#f4eef0', tintaSuave: '#c3b3ba',
    bloco: '#312a33', blocoTexto: '#f4eef0',
    floral: { petalaClara: '#4a3b44', petalaMedia: '#7a5c69', petalaEscura: '#e0a3b8', folha: '#5a5651', caule: '#6d6862' } },
];

export const TEMA_PADRAO = TEMAS[0];

export function acharTema(id: string): Tema {
  return TEMAS.find((t) => t.id === id) ?? TEMA_PADRAO;
}
