import { acharTipo } from './tiposEvento';

export type OrnamentoTemaId =
  | 'floral'
  | 'classico'
  | 'geometrico'
  | 'minimal'
  | 'festivo'
  | 'rustico';

export interface Tema {
  id: string;
  nome: string;
  descricao: string;
  fora: string;
  papel: string;
  acento: string;
  acentoTexto: string;
  tinta: string;
  tintaSuave: string;
  bloco: string;
  blocoTexto: string;
  floral: {
    petalaClara: string;
    petalaMedia: string;
    petalaEscura: string;
    folha: string;
    caule: string;
  };
  grupos: string[];
  tipos: string[];
  tags: string[];
  ornamentoSugerido: OrnamentoTemaId;
}

function criarTema(
  id: string,
  nome: string,
  descricao: string,
  cores: {
    fora: string; papel: string; acento: string; acentoTexto: string;
    tinta: string; tintaSuave: string; bloco: string; blocoTexto: string;
  },
  floral: [string, string, string, string, string],
  grupos: string[],
  tipos: string[],
  tags: string[],
  ornamentoSugerido: OrnamentoTemaId,
): Tema {
  return {
    id, nome, descricao, ...cores,
    floral: {
      petalaClara: floral[0],
      petalaMedia: floral[1],
      petalaEscura: floral[2],
      folha: floral[3],
      caule: floral[4],
    },
    grupos, tipos, tags, ornamentoSugerido,
  };
}

export const TEMAS: Tema[] = [
  criarTema(
    "rose",
    "Rosê",
    "Romântico e delicado",
    {
      fora: '#ffffff', papel: '#faeee9', acento: '#b4767c', acentoTexto: '#936065',
      tinta: '#5e4348', tintaSuave: '#81676a', bloco: '#896762', blocoTexto: '#fdf3ef',
    },
    ["#f2d5cd", "#e3b5ae", "#b4767c", "#afae9b", "#9a9784"],
    ["casamento"],
    [],
    ["romântico", "delicado", "rosa", "clássico"],
    "floral" as OrnamentoTemaId,
  ),
  criarTema(
    "marca",
    "Convite IA",
    "Rosa moderno e versátil",
    {
      fora: '#ffffff', papel: '#fdf0f3', acento: '#c06078', acentoTexto: '#a04a63',
      tinta: '#40232c', tintaSuave: '#7c5560', bloco: '#b34f77', blocoTexto: '#fff5f8',
    },
    ["#f7c8d8", "#e8a0bc", "#c06078", "#b9aeae", "#a09292"],
    ["todos"],
    [],
    ["moderno", "rosa", "leve"],
    "minimal" as OrnamentoTemaId,
  ),
  criarTema(
    "sage",
    "Sage & Creme",
    "Natural, leve e sofisticado",
    {
      fora: '#ffffff', papel: '#fbfaf5', acento: '#7d8b6a', acentoTexto: '#657155',
      tinta: '#3f4436', tintaSuave: '#66705a', bloco: '#6f7463', blocoTexto: '#fbfaf5',
    },
    ["#eae7da", "#cdd0bb", "#7d8b6a", "#a4ac92", "#8c9479"],
    ["casamento"],
    ["aniversario"],
    ["natural", "campo", "botânico", "leve"],
    "rustico" as OrnamentoTemaId,
  ),
  criarTema(
    "terracota",
    "Terracota",
    "Boho, acolhedor e adulto",
    {
      fora: '#ffffff', papel: '#fdf4ef', acento: '#a8563a', acentoTexto: '#8e4830',
      tinta: '#4a2c1f', tintaSuave: '#7d5340', bloco: '#9b624a', blocoTexto: '#fdf4ef',
    },
    ["#f2d9c9", "#dfb197", "#a8563a", "#b4a48e", "#9c8b76"],
    ["casamento", "happy_hour"],
    ["aniversario"],
    ["boho", "rústico", "adulto", "quente"],
    "rustico" as OrnamentoTemaId,
  ),
  criarTema(
    "azul",
    "Azul Sereno",
    "Neutro, elegante e tranquilo",
    {
      fora: '#ffffff', papel: '#f4f7fa', acento: '#4a6d86', acentoTexto: '#3f5c72',
      tinta: '#26333d', tintaSuave: '#556873', bloco: '#5e7381', blocoTexto: '#f4f7fa',
    },
    ["#dbe6ee", "#b2c6d5", "#4a6d86", "#9fb0b8", "#87999f"],
    ["casamento", "aniversario", "happy_hour", "vaquinha"],
    [],
    ["azul", "neutro", "sereno", "elegante"],
    "classico" as OrnamentoTemaId,
  ),
  criarTema(
    "borgonha",
    "Borgonha",
    "Elegante, intenso e noturno",
    {
      fora: '#ffffff', papel: '#faf3f3', acento: '#7d2e3c', acentoTexto: '#7d2e3c',
      tinta: '#3a1d22', tintaSuave: '#6b4149', bloco: '#9c4a58', blocoTexto: '#faf3f3',
    },
    ["#efd6d8", "#d3a3aa", "#7d2e3c", "#a9a094", "#93897d"],
    ["casamento", "debutante"],
    ["aniversario"],
    ["vinho", "elegante", "noturno", "sofisticado"],
    "classico" as OrnamentoTemaId,
  ),
  criarTema(
    "dourado",
    "Dourado & Marfim",
    "Clássico, luxuoso e comemorativo",
    {
      fora: '#ffffff', papel: '#fdfaf2', acento: '#8a7038', acentoTexto: '#755f2f',
      tinta: '#3d3524', tintaSuave: '#6b5c3c', bloco: '#827149', blocoTexto: '#fdfaf2',
    },
    ["#f0e6cd", "#d9c79c", "#8a7038", "#b0aa8e", "#999377"],
    ["casamento", "debutante", "happy_hour"],
    ["formatura"],
    ["dourado", "luxo", "clássico", "elegante", "formatura"],
    "classico" as OrnamentoTemaId,
  ),
  criarTema(
    "lavanda",
    "Lavanda",
    "Delicado, jovem e elegante",
    {
      fora: '#ffffff', papel: '#f8f5fb', acento: '#6b5a85', acentoTexto: '#5c4d73',
      tinta: '#332b40', tintaSuave: '#615572', bloco: '#776c8b', blocoTexto: '#f8f5fb',
    },
    ["#e5dcf0", "#c3b4d8", "#6b5a85", "#a9a3b5", "#928ca0"],
    ["casamento", "debutante"],
    ["aniversario"],
    ["lavanda", "delicado", "feminino", "15 anos"],
    "floral" as OrnamentoTemaId,
  ),
  criarTema(
    "menta",
    "Menta",
    "Fresco, leve e descontraído",
    {
      fora: '#ffffff', papel: '#f2f8f6', acento: '#3f7d6c', acentoTexto: '#366b5c',
      tinta: '#213b34', tintaSuave: '#4e6b62', bloco: '#54776d', blocoTexto: '#f2f8f6',
    },
    ["#d8ebe4", "#a9d0c3", "#3f7d6c", "#9db8ad", "#86a197"],
    ["casamento"],
    ["cha-de-panela", "aniversario-infantil"],
    ["menta", "leve", "fresco", "chá"],
    "festivo" as OrnamentoTemaId,
  ),
  criarTema(
    "noite",
    "Noite",
    "Escuro, sofisticado e dramático",
    {
      fora: '#0f0e11', papel: '#1d1a1f', acento: '#e0a3b8', acentoTexto: '#e0a3b8',
      tinta: '#f4eef0', tintaSuave: '#c3b3ba', bloco: '#312a33', blocoTexto: '#f4eef0',
    },
    ["#4a3b44", "#7a5c69", "#e0a3b8", "#5a5651", "#6d6862"],
    ["debutante", "happy_hour"],
    ["aniversario"],
    ["escuro", "preto", "noturno", "sofisticado"],
    "minimal" as OrnamentoTemaId,
  ),
  criarTema(
    "champagne",
    "Champagne",
    "Romântico, claro e sofisticado",
    {
      fora: '#ffffff', papel: '#fdf9f0', acento: '#a7834f', acentoTexto: '#7a5d33',
      tinta: '#3d3427', tintaSuave: '#6c604f', bloco: '#7f6746', blocoTexto: '#fffaf0',
    },
    ["#f2e4cc", "#dcc39d", "#a7834f", "#a7a184", "#8e886f"],
    ["casamento", "debutante"],
    ["noivado"],
    ["champagne", "elegante", "romântico", "claro"],
    "floral" as OrnamentoTemaId,
  ),
  criarTema(
    "prata",
    "Prata Elegante",
    "Clássico, neutro e refinado",
    {
      fora: '#ffffff', papel: '#f7f8fa', acento: '#69727d', acentoTexto: '#545c66',
      tinta: '#292f35', tintaSuave: '#5d6670', bloco: '#59616b', blocoTexto: '#ffffff',
    },
    ["#e7eaed", "#c8ced4", "#69727d", "#9ba3aa", "#858e96"],
    ["happy_hour"],
    ["bodas-prata"],
    ["prata", "cinza", "elegante", "bodas"],
    "classico" as OrnamentoTemaId,
  ),
  criarTema(
    "preto-marfim",
    "Preto & Marfim",
    "Minimalista, adulto e marcante",
    {
      fora: '#faf8f2', papel: '#fffdf7', acento: '#222222', acentoTexto: '#222222',
      tinta: '#211f1a', tintaSuave: '#59544a', bloco: '#26231f', blocoTexto: '#fffdf7',
    },
    ["#eee7d9", "#cfc3ad", "#4a4338", "#8e897d", "#716c62"],
    ["casamento", "happy_hour"],
    ["aniversario", "formatura"],
    ["preto", "marfim", "minimalista", "masculino", "adulto", "formatura"],
    "minimal" as OrnamentoTemaId,
  ),
  criarTema(
    "rosa-preto",
    "Rosa & Preto",
    "Jovem, forte e glamouroso",
    {
      fora: '#ffffff', papel: '#fff5f8', acento: '#b44770', acentoTexto: '#96395d',
      tinta: '#241c20', tintaSuave: '#654d57', bloco: '#31262c', blocoTexto: '#ffffff',
    },
    ["#f6cad9", "#dd91ad", "#b44770", "#81777b", "#655c60"],
    ["debutante"],
    ["aniversario"],
    ["rosa", "preto", "glamour", "15 anos", "moderno"],
    "festivo" as OrnamentoTemaId,
  ),
  criarTema(
    "royal-prata",
    "Royal & Prata",
    "Azul intenso, festivo e elegante",
    {
      fora: '#ffffff', papel: '#f5f7fc', acento: '#31579b', acentoTexto: '#294a84',
      tinta: '#1e2940', tintaSuave: '#53617b', bloco: '#3b527b', blocoTexto: '#f8faff',
    },
    ["#dce5f7", "#a9bce0", "#31579b", "#8f9cad", "#778492"],
    ["debutante", "happy_hour"],
    ["aniversario", "formatura"],
    ["azul royal", "prata", "festa", "elegante", "formatura"],
    "geometrico" as OrnamentoTemaId,
  ),
  criarTema(
    "carvao-cobre",
    "Carvão & Cobre",
    "Adulto, masculino e sofisticado",
    {
      fora: '#ffffff', papel: '#f5f2ef', acento: '#a45f34', acentoTexto: '#844a28',
      tinta: '#26231f', tintaSuave: '#625b54', bloco: '#4d4038', blocoTexto: '#fff8f2',
    },
    ["#e9d5c6", "#c79a78", "#a45f34", "#7d786d", "#666158"],
    ["happy_hour"],
    ["aniversario"],
    ["masculino", "adulto", "churrasco", "bar", "cobre", "escuro"],
    "minimal" as OrnamentoTemaId,
  ),
  criarTema(
    "marinho",
    "Azul Marinho",
    "Sóbrio, masculino e versátil",
    {
      fora: '#ffffff', papel: '#f3f6f8', acento: '#274b66', acentoTexto: '#234158',
      tinta: '#162936', tintaSuave: '#4b6474', bloco: '#314e61', blocoTexto: '#f7fbfd',
    },
    ["#d7e1e7", "#a9bbc7", "#274b66", "#82949c", "#6c7e87"],
    ["happy_hour"],
    ["aniversario", "confraternizacao", "formatura"],
    ["masculino", "azul marinho", "sóbrio", "adulto", "formatura"],
    "geometrico" as OrnamentoTemaId,
  ),
  criarTema(
    "verde-noturno",
    "Verde Noturno",
    "Natural, adulto e contemporâneo",
    {
      fora: '#ffffff', papel: '#f3f6f2', acento: '#345e4a', acentoTexto: '#2f5141',
      tinta: '#1e3027', tintaSuave: '#4d675a', bloco: '#3f584c', blocoTexto: '#f7faf6',
    },
    ["#d9e4d8", "#afc5b5", "#345e4a", "#7e9885", "#687f6f"],
    ["happy_hour"],
    ["aniversario"],
    ["verde escuro", "adulto", "masculino", "natureza", "noturno"],
    "rustico" as OrnamentoTemaId,
  ),
  criarTema(
    "confete",
    "Confete",
    "Colorido, alegre e infantil",
    {
      fora: '#ffffff', papel: '#fff9f3', acento: '#e05f67', acentoTexto: '#b8444c',
      tinta: '#3f3140', tintaSuave: '#765b68', bloco: '#8c4d68', blocoTexto: '#ffffff',
    },
    ["#ffd56a", "#f39ab1", "#e05f67", "#69a97d", "#518c67"],
    [],
    ["aniversario-infantil"],
    ["infantil", "colorido", "alegre", "festa", "criança"],
    "festivo" as OrnamentoTemaId,
  ),
  criarTema(
    "candy",
    "Candy Pastel",
    "Doce, pastel e divertido",
    {
      fora: '#ffffff', papel: '#fff7fb', acento: '#c75c9a', acentoTexto: '#a74980',
      tinta: '#493445', tintaSuave: '#78606f', bloco: '#8d5976', blocoTexto: '#ffffff',
    },
    ["#f8d3e7", "#e7a8cf", "#c75c9a", "#8ec6a8", "#71a98c"],
    [],
    ["aniversario-infantil"],
    ["infantil", "pastel", "doce", "rosa", "lilás"],
    "festivo" as OrnamentoTemaId,
  ),
  criarTema(
    "ceu",
    "Céu Azul",
    "Leve, azul e infantil",
    {
      fora: '#ffffff', papel: '#f3fbff', acento: '#3c83af', acentoTexto: '#326f95',
      tinta: '#25404e', tintaSuave: '#577481', bloco: '#476f86', blocoTexto: '#ffffff',
    },
    ["#d6f0ff", "#9ed8f4", "#3c83af", "#83b99e", "#6aa187"],
    [],
    ["aniversario-infantil"],
    ["infantil", "azul", "céu", "leve", "menino"],
    "festivo" as OrnamentoTemaId,
  ),
  criarTema(
    "aventura",
    "Verde Aventura",
    "Natureza, aventura e infância",
    {
      fora: '#ffffff', papel: '#f7fbf1', acento: '#4f7f3d', acentoTexto: '#426d33',
      tinta: '#2d4027', tintaSuave: '#5d7554', bloco: '#567149', blocoTexto: '#ffffff',
    },
    ["#e4ef92", "#b9d56d", "#4f7f3d", "#7da765", "#688f53"],
    [],
    ["aniversario-infantil"],
    ["infantil", "aventura", "dinossauro", "selva", "natureza", "verde"],
    "rustico" as OrnamentoTemaId,
  ),
  criarTema(
    "grafite-ambar",
    "Grafite & Âmbar",
    "Bar, noite e happy hour",
    {
      fora: '#171717', papel: '#22201d', acento: '#e2a43e', acentoTexto: '#efbd6a',
      tinta: '#fff5e7', tintaSuave: '#d1c0a5', bloco: '#3b3329', blocoTexto: '#fff5e7',
    },
    ["#f3d48f", "#e2a43e", "#b9761f", "#7d8269", "#666a55"],
    [],
    ["happy-hour", "confraternizacao"],
    ["bar", "cerveja", "happy hour", "noturno", "grafite", "âmbar"],
    "geometrico" as OrnamentoTemaId,
  ),
  criarTema(
    "tropical",
    "Tropical",
    "Descontraído, quente e vibrante",
    {
      fora: '#ffffff', papel: '#fff8ee', acento: '#d96042', acentoTexto: '#b94d35',
      tinta: '#2f4436', tintaSuave: '#637261', bloco: '#47705a', blocoTexto: '#fff9f2',
    },
    ["#ffd166", "#f4a261", "#e76f51", "#4f9f6d", "#3f8258"],
    ["happy_hour"],
    ["aniversario"],
    ["tropical", "verão", "praia", "descontraído", "alegre"],
    "rustico" as OrnamentoTemaId,
  ),
  criarTema(
    "executivo",
    "Azul Executivo",
    "Corporativo, limpo e profissional",
    {
      fora: '#ffffff', papel: '#f7f9fb', acento: '#2d5d86', acentoTexto: '#294f70',
      tinta: '#202c36', tintaSuave: '#536879', bloco: '#3c5265', blocoTexto: '#ffffff',
    },
    ["#d9e5ef", "#a7bfd3", "#2d5d86", "#8297a5", "#6c808e"],
    [],
    ["confraternizacao", "formatura"],
    ["corporativo", "empresa", "executivo", "azul", "profissional", "formatura"],
    "geometrico" as OrnamentoTemaId,
  ),
  criarTema(
    "grafite",
    "Grafite Minimal",
    "Corporativo, neutro e moderno",
    {
      fora: '#ffffff', papel: '#f5f5f4', acento: '#555b61', acentoTexto: '#444a50',
      tinta: '#242628', tintaSuave: '#63686d', bloco: '#42474c', blocoTexto: '#ffffff',
    },
    ["#e1e2e2", "#babdc0", "#555b61", "#8b9092", "#757a7d"],
    [],
    ["confraternizacao"],
    ["corporativo", "grafite", "minimalista", "moderno", "neutro"],
    "minimal" as OrnamentoTemaId,
  ),
  criarTema(
    "azul-confianca",
    "Azul Confiança",
    "Acolhedor, confiável e claro",
    {
      fora: '#ffffff', papel: '#f3f8ff', acento: '#3978b7', acentoTexto: '#31669b',
      tinta: '#22384d', tintaSuave: '#577188', bloco: '#466985', blocoTexto: '#ffffff',
    },
    ["#d6e9fb", "#9bc5eb", "#3978b7", "#83a999", "#6e9382"],
    [],
    ["vaquinha"],
    ["vaquinha", "confiança", "azul", "solidário", "claro"],
    "minimal" as OrnamentoTemaId,
  ),
  criarTema(
    "verde-esperanca",
    "Verde Esperança",
    "Positivo, humano e acolhedor",
    {
      fora: '#ffffff', papel: '#f4faf5', acento: '#4a8a5b', acentoTexto: '#3d744c',
      tinta: '#263d2c', tintaSuave: '#5a725f', bloco: '#52705a', blocoTexto: '#ffffff',
    },
    ["#dcefdc", "#acd3b2", "#4a8a5b", "#7fa487", "#688d70"],
    [],
    ["vaquinha"],
    ["vaquinha", "esperança", "verde", "solidário", "acolhedor"],
    "minimal" as OrnamentoTemaId,
  ),
  criarTema(
    "coral",
    "Coral",
    "Humano, alegre e contemporâneo",
    {
      fora: '#ffffff', papel: '#fff6f2', acento: '#d66c59', acentoTexto: '#a84d3f',
      tinta: '#4b302b', tintaSuave: '#7d5b54', bloco: '#9b5f53', blocoTexto: '#ffffff',
    },
    ["#ffd9ce", "#efa795", "#d66c59", "#8fa884", "#748f6b"],
    ["vaquinha"],
    ["aniversario"],
    ["coral", "alegre", "adulto", "acolhedor", "moderno"],
    "festivo" as OrnamentoTemaId,
  )
];

export const TEMA_PADRAO = TEMAS[0];

const PADRAO_VISUAL_POR_TIPO: Record<
  string,
  { temaId: string; ornamentoId: OrnamentoTemaId }
> = {
  casamento: { temaId: 'rose', ornamentoId: 'floral' },
  'bodas-prata': { temaId: 'prata', ornamentoId: 'classico' },
  'bodas-ouro': { temaId: 'dourado', ornamentoId: 'classico' },
  noivado: { temaId: 'champagne', ornamentoId: 'floral' },
  'cha-de-panela': { temaId: 'menta', ornamentoId: 'festivo' },
  debutante: { temaId: 'lavanda', ornamentoId: 'festivo' },
  aniversario: { temaId: 'azul', ornamentoId: 'festivo' },
  'aniversario-infantil': { temaId: 'confete', ornamentoId: 'festivo' },
  formatura: { temaId: 'preto-marfim', ornamentoId: 'geometrico' },
  'happy-hour': { temaId: 'grafite-ambar', ornamentoId: 'geometrico' },
  confraternizacao: { temaId: 'executivo', ornamentoId: 'geometrico' },
  vaquinha: { temaId: 'azul-confianca', ornamentoId: 'minimal' },
};

export function acharTema(id: string): Tema {
  return TEMAS.find((t) => t.id === id) ?? TEMA_PADRAO;
}

export function temaPadraoDoTipo(tipoEventoId: string): Tema {
  const id = PADRAO_VISUAL_POR_TIPO[tipoEventoId]?.temaId ?? TEMA_PADRAO.id;
  return acharTema(id);
}

export function ornamentoPadraoDoTipo(tipoEventoId: string): OrnamentoTemaId {
  return PADRAO_VISUAL_POR_TIPO[tipoEventoId]?.ornamentoId ?? 'floral';
}

function pontuacaoTema(tema: Tema, tipoEventoId: string) {
  const tipo = acharTipo(tipoEventoId);
  let pontos = 0;

  if (tema.tipos.includes(tipoEventoId)) pontos += 100;
  if (tema.grupos.includes(tipo.grupo)) pontos += 30;
  if (tema.grupos.includes('todos')) pontos += 5;
  if (tema.id === temaPadraoDoTipo(tipoEventoId).id) pontos += 500;

  return pontos;
}

export function temasRecomendados(tipoEventoId: string, limite = 8): Tema[] {
  return TEMAS
    .map((tema, ordem) => ({
      tema,
      ordem,
      pontos: pontuacaoTema(tema, tipoEventoId),
    }))
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem)
    .slice(0, limite)
    .map((x) => x.tema);
}

export function temaCombinaComTipo(temaId: string, tipoEventoId: string) {
  return pontuacaoTema(acharTema(temaId), tipoEventoId) > 0;
}

export function temaParaIA(tema: Tema) {
  const escopos = [
    ...tema.tipos,
    ...tema.grupos.filter((g) => g !== 'todos'),
  ];

  return `${tema.id}: ${tema.nome} — ${tema.descricao}; tags: ${tema.tags.join(', ')}${
    escopos.length ? `; indicado para: ${escopos.join(', ')}` : ''
  }; ornamento sugerido: ${tema.ornamentoSugerido}`;
}

export function catalogoTemasParaIA(tipoEventoId?: string) {
  const recomendados = tipoEventoId
    ? temasRecomendados(tipoEventoId, 12)
    : [];

  const lista = tipoEventoId
    ? [
        ...recomendados,
        ...TEMAS.filter((t) => !recomendados.some((r) => r.id === t.id)),
      ]
    : TEMAS;

  return lista.map(temaParaIA).join('\n');
}
