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

  /** Metadados para recomendação no wizard/IA. */
  grupos: string[];
  tipos: string[];
  tags: string[];
  ornamentoSugerido: OrnamentoTemaId;
}

export const TEMAS: Tema[] = [
  {
    id: "rose",
    nome: "Rosê",
    descricao: "Romântico e delicado",
    fora: '#ffffff',
    papel: '#faeee9',
    acento: '#b4767c',
    acentoTexto: '#936065',
    tinta: '#5e4348',
    tintaSuave: '#81676a',
    bloco: '#896762',
    blocoTexto: '#fdf3ef',
    floral: {
      petalaClara: '#f2d5cd',
      petalaMedia: '#e3b5ae',
      petalaEscura: '#b4767c',
      folha: '#afae9b',
      caule: '#9a9784',
    },
    grupos: ["casamento"],
    tipos: [],
    tags: ["romântico", "delicado", "rosa", "clássico"],
    ornamentoSugerido: "floral",
  },
  {
    id: "marca",
    nome: "Convite IA",
    descricao: "Rosa moderno e versátil",
    fora: '#ffffff',
    papel: '#fdf0f3',
    acento: '#c06078',
    acentoTexto: '#a04a63',
    tinta: '#40232c',
    tintaSuave: '#7c5560',
    bloco: '#b34f77',
    blocoTexto: '#fff5f8',
    floral: {
      petalaClara: '#f7c8d8',
      petalaMedia: '#e8a0bc',
      petalaEscura: '#c06078',
      folha: '#b9aeae',
      caule: '#a09292',
    },
    grupos: ["todos"],
    tipos: [],
    tags: ["moderno", "rosa", "leve"],
    ornamentoSugerido: "minimal",
  },
  {
    id: "sage",
    nome: "Sage & Creme",
    descricao: "Natural, leve e sofisticado",
    fora: '#ffffff',
    papel: '#fbfaf5',
    acento: '#7d8b6a',
    acentoTexto: '#657155',
    tinta: '#3f4436',
    tintaSuave: '#66705a',
    bloco: '#6f7463',
    blocoTexto: '#fbfaf5',
    floral: {
      petalaClara: '#eae7da',
      petalaMedia: '#cdd0bb',
      petalaEscura: '#7d8b6a',
      folha: '#a4ac92',
      caule: '#8c9479',
    },
    grupos: ["casamento"],
    tipos: ["aniversario"],
    tags: ["natural", "campo", "botânico", "leve"],
    ornamentoSugerido: "rustico",
  },
  {
    id: "terracota",
    nome: "Terracota",
    descricao: "Boho, acolhedor e adulto",
    fora: '#ffffff',
    papel: '#fdf4ef',
    acento: '#a8563a',
    acentoTexto: '#8e4830',
    tinta: '#4a2c1f',
    tintaSuave: '#7d5340',
    bloco: '#9b624a',
    blocoTexto: '#fdf4ef',
    floral: {
      petalaClara: '#f2d9c9',
      petalaMedia: '#dfb197',
      petalaEscura: '#a8563a',
      folha: '#b4a48e',
      caule: '#9c8b76',
    },
    grupos: ["casamento", "happy_hour"],
    tipos: ["aniversario"],
    tags: ["boho", "rústico", "adulto", "quente"],
    ornamentoSugerido: "rustico",
  },
  {
    id: "azul",
    nome: "Azul Sereno",
    descricao: "Neutro, elegante e tranquilo",
    fora: '#ffffff',
    papel: '#f4f7fa',
    acento: '#4a6d86',
    acentoTexto: '#3f5c72',
    tinta: '#26333d',
    tintaSuave: '#556873',
    bloco: '#5e7381',
    blocoTexto: '#f4f7fa',
    floral: {
      petalaClara: '#dbe6ee',
      petalaMedia: '#b2c6d5',
      petalaEscura: '#4a6d86',
      folha: '#9fb0b8',
      caule: '#87999f',
    },
    grupos: ["casamento", "aniversario", "happy_hour", "vaquinha"],
    tipos: [],
    tags: ["azul", "neutro", "sereno", "elegante"],
    ornamentoSugerido: "classico",
  },
  {
    id: "borgonha",
    nome: "Borgonha",
    descricao: "Elegante, intenso e noturno",
    fora: '#ffffff',
    papel: '#faf3f3',
    acento: '#7d2e3c',
    acentoTexto: '#7d2e3c',
    tinta: '#3a1d22',
    tintaSuave: '#6b4149',
    bloco: '#9c4a58',
    blocoTexto: '#faf3f3',
    floral: {
      petalaClara: '#efd6d8',
      petalaMedia: '#d3a3aa',
      petalaEscura: '#7d2e3c',
      folha: '#a9a094',
      caule: '#93897d',
    },
    grupos: ["casamento", "debutante"],
    tipos: ["aniversario"],
    tags: ["vinho", "elegante", "noturno", "sofisticado"],
    ornamentoSugerido: "classico",
  },
  {
    id: "dourado",
    nome: "Dourado & Marfim",
    descricao: "Clássico, luxuoso e comemorativo",
    fora: '#ffffff',
    papel: '#fdfaf2',
    acento: '#8a7038',
    acentoTexto: '#755f2f',
    tinta: '#3d3524',
    tintaSuave: '#6b5c3c',
    bloco: '#827149',
    blocoTexto: '#fdfaf2',
    floral: {
      petalaClara: '#f0e6cd',
      petalaMedia: '#d9c79c',
      petalaEscura: '#8a7038',
      folha: '#b0aa8e',
      caule: '#999377',
    },
    grupos: ["casamento", "debutante", "happy_hour"],
    tipos: [],
    tags: ["dourado", "luxo", "clássico", "elegante"],
    ornamentoSugerido: "classico",
  },
  {
    id: "lavanda",
    nome: "Lavanda",
    descricao: "Delicado, jovem e elegante",
    fora: '#ffffff',
    papel: '#f8f5fb',
    acento: '#6b5a85',
    acentoTexto: '#5c4d73',
    tinta: '#332b40',
    tintaSuave: '#615572',
    bloco: '#776c8b',
    blocoTexto: '#f8f5fb',
    floral: {
      petalaClara: '#e5dcf0',
      petalaMedia: '#c3b4d8',
      petalaEscura: '#6b5a85',
      folha: '#a9a3b5',
      caule: '#928ca0',
    },
    grupos: ["casamento", "debutante"],
    tipos: ["aniversario"],
    tags: ["lavanda", "delicado", "feminino", "15 anos"],
    ornamentoSugerido: "floral",
  },
  {
    id: "menta",
    nome: "Menta",
    descricao: "Fresco, leve e descontraído",
    fora: '#ffffff',
    papel: '#f2f8f6',
    acento: '#3f7d6c',
    acentoTexto: '#366b5c',
    tinta: '#213b34',
    tintaSuave: '#4e6b62',
    bloco: '#54776d',
    blocoTexto: '#f2f8f6',
    floral: {
      petalaClara: '#d8ebe4',
      petalaMedia: '#a9d0c3',
      petalaEscura: '#3f7d6c',
      folha: '#9db8ad',
      caule: '#86a197',
    },
    grupos: ["casamento"],
    tipos: ["cha-de-panela", "aniversario-infantil"],
    tags: ["menta", "leve", "fresco", "chá"],
    ornamentoSugerido: "festivo",
  },
  {
    id: "noite",
    nome: "Noite",
    descricao: "Escuro, sofisticado e dramático",
    fora: '#0f0e11',
    papel: '#1d1a1f',
    acento: '#e0a3b8',
    acentoTexto: '#e0a3b8',
    tinta: '#f4eef0',
    tintaSuave: '#c3b3ba',
    bloco: '#312a33',
    blocoTexto: '#f4eef0',
    floral: {
      petalaClara: '#4a3b44',
      petalaMedia: '#7a5c69',
      petalaEscura: '#e0a3b8',
      folha: '#5a5651',
      caule: '#6d6862',
    },
    grupos: ["debutante", "happy_hour"],
    tipos: ["aniversario"],
    tags: ["escuro", "preto", "noturno", "sofisticado"],
    ornamentoSugerido: "minimal",
  },
  {
    id: "champagne",
    nome: "Champagne",
    descricao: "Romântico, claro e sofisticado",
    fora: '#ffffff',
    papel: '#fdf9f0',
    acento: '#a7834f',
    acentoTexto: '#7a5d33',
    tinta: '#3d3427',
    tintaSuave: '#6c604f',
    bloco: '#7f6746',
    blocoTexto: '#fffaf0',
    floral: {
      petalaClara: '#f2e4cc',
      petalaMedia: '#dcc39d',
      petalaEscura: '#a7834f',
      folha: '#a7a184',
      caule: '#8e886f',
    },
    grupos: ["casamento", "debutante"],
    tipos: ["noivado"],
    tags: ["champagne", "elegante", "romântico", "claro"],
    ornamentoSugerido: "floral",
  },
  {
    id: "prata",
    nome: "Prata Elegante",
    descricao: "Clássico, neutro e refinado",
    fora: '#ffffff',
    papel: '#f7f8fa',
    acento: '#69727d',
    acentoTexto: '#545c66',
    tinta: '#292f35',
    tintaSuave: '#5d6670',
    bloco: '#59616b',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#e7eaed',
      petalaMedia: '#c8ced4',
      petalaEscura: '#69727d',
      folha: '#9ba3aa',
      caule: '#858e96',
    },
    grupos: ["happy_hour"],
    tipos: ["bodas-prata"],
    tags: ["prata", "cinza", "elegante", "bodas"],
    ornamentoSugerido: "classico",
  },
  {
    id: "preto-marfim",
    nome: "Preto & Marfim",
    descricao: "Minimalista, adulto e marcante",
    fora: '#faf8f2',
    papel: '#fffdf7',
    acento: '#222222',
    acentoTexto: '#222222',
    tinta: '#211f1a',
    tintaSuave: '#59544a',
    bloco: '#26231f',
    blocoTexto: '#fffdf7',
    floral: {
      petalaClara: '#eee7d9',
      petalaMedia: '#cfc3ad',
      petalaEscura: '#4a4338',
      folha: '#8e897d',
      caule: '#716c62',
    },
    grupos: ["casamento", "happy_hour"],
    tipos: ["aniversario"],
    tags: ["preto", "marfim", "minimalista", "masculino", "adulto"],
    ornamentoSugerido: "minimal",
  },
  {
    id: "rosa-preto",
    nome: "Rosa & Preto",
    descricao: "Jovem, forte e glamouroso",
    fora: '#ffffff',
    papel: '#fff5f8',
    acento: '#b44770',
    acentoTexto: '#96395d',
    tinta: '#241c20',
    tintaSuave: '#654d57',
    bloco: '#31262c',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#f6cad9',
      petalaMedia: '#dd91ad',
      petalaEscura: '#b44770',
      folha: '#81777b',
      caule: '#655c60',
    },
    grupos: ["debutante"],
    tipos: ["aniversario"],
    tags: ["rosa", "preto", "glamour", "15 anos", "moderno"],
    ornamentoSugerido: "festivo",
  },
  {
    id: "royal-prata",
    nome: "Royal & Prata",
    descricao: "Azul intenso, festivo e elegante",
    fora: '#ffffff',
    papel: '#f5f7fc',
    acento: '#31579b',
    acentoTexto: '#294a84',
    tinta: '#1e2940',
    tintaSuave: '#53617b',
    bloco: '#3b527b',
    blocoTexto: '#f8faff',
    floral: {
      petalaClara: '#dce5f7',
      petalaMedia: '#a9bce0',
      petalaEscura: '#31579b',
      folha: '#8f9cad',
      caule: '#778492',
    },
    grupos: ["debutante", "happy_hour"],
    tipos: ["aniversario"],
    tags: ["azul royal", "prata", "festa", "elegante"],
    ornamentoSugerido: "geometrico",
  },
  {
    id: "carvao-cobre",
    nome: "Carvão & Cobre",
    descricao: "Adulto, masculino e sofisticado",
    fora: '#ffffff',
    papel: '#f5f2ef',
    acento: '#a45f34',
    acentoTexto: '#844a28',
    tinta: '#26231f',
    tintaSuave: '#625b54',
    bloco: '#4d4038',
    blocoTexto: '#fff8f2',
    floral: {
      petalaClara: '#e9d5c6',
      petalaMedia: '#c79a78',
      petalaEscura: '#a45f34',
      folha: '#7d786d',
      caule: '#666158',
    },
    grupos: ["happy_hour"],
    tipos: ["aniversario"],
    tags: ["masculino", "adulto", "churrasco", "bar", "cobre", "escuro"],
    ornamentoSugerido: "minimal",
  },
  {
    id: "marinho",
    nome: "Azul Marinho",
    descricao: "Sóbrio, masculino e versátil",
    fora: '#ffffff',
    papel: '#f3f6f8',
    acento: '#274b66',
    acentoTexto: '#234158',
    tinta: '#162936',
    tintaSuave: '#4b6474',
    bloco: '#314e61',
    blocoTexto: '#f7fbfd',
    floral: {
      petalaClara: '#d7e1e7',
      petalaMedia: '#a9bbc7',
      petalaEscura: '#274b66',
      folha: '#82949c',
      caule: '#6c7e87',
    },
    grupos: ["happy_hour"],
    tipos: ["aniversario", "confraternizacao"],
    tags: ["masculino", "azul marinho", "sóbrio", "adulto"],
    ornamentoSugerido: "geometrico",
  },
  {
    id: "verde-noturno",
    nome: "Verde Noturno",
    descricao: "Natural, adulto e contemporâneo",
    fora: '#ffffff',
    papel: '#f3f6f2',
    acento: '#345e4a',
    acentoTexto: '#2f5141',
    tinta: '#1e3027',
    tintaSuave: '#4d675a',
    bloco: '#3f584c',
    blocoTexto: '#f7faf6',
    floral: {
      petalaClara: '#d9e4d8',
      petalaMedia: '#afc5b5',
      petalaEscura: '#345e4a',
      folha: '#7e9885',
      caule: '#687f6f',
    },
    grupos: ["happy_hour"],
    tipos: ["aniversario"],
    tags: ["verde escuro", "adulto", "masculino", "natureza", "noturno"],
    ornamentoSugerido: "rustico",
  },
  {
    id: "confete",
    nome: "Confete",
    descricao: "Colorido, alegre e infantil",
    fora: '#ffffff',
    papel: '#fff9f3',
    acento: '#e05f67',
    acentoTexto: '#b8444c',
    tinta: '#3f3140',
    tintaSuave: '#765b68',
    bloco: '#8c4d68',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#ffd56a',
      petalaMedia: '#f39ab1',
      petalaEscura: '#e05f67',
      folha: '#69a97d',
      caule: '#518c67',
    },
    grupos: [],
    tipos: ["aniversario-infantil"],
    tags: ["infantil", "colorido", "alegre", "festa", "criança"],
    ornamentoSugerido: "festivo",
  },
  {
    id: "candy",
    nome: "Candy Pastel",
    descricao: "Doce, pastel e divertido",
    fora: '#ffffff',
    papel: '#fff7fb',
    acento: '#c75c9a',
    acentoTexto: '#a74980',
    tinta: '#493445',
    tintaSuave: '#78606f',
    bloco: '#8d5976',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#f8d3e7',
      petalaMedia: '#e7a8cf',
      petalaEscura: '#c75c9a',
      folha: '#8ec6a8',
      caule: '#71a98c',
    },
    grupos: [],
    tipos: ["aniversario-infantil"],
    tags: ["infantil", "pastel", "doce", "rosa", "lilás"],
    ornamentoSugerido: "festivo",
  },
  {
    id: "ceu",
    nome: "Céu Azul",
    descricao: "Leve, azul e infantil",
    fora: '#ffffff',
    papel: '#f3fbff',
    acento: '#3c83af',
    acentoTexto: '#326f95',
    tinta: '#25404e',
    tintaSuave: '#577481',
    bloco: '#476f86',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#d6f0ff',
      petalaMedia: '#9ed8f4',
      petalaEscura: '#3c83af',
      folha: '#83b99e',
      caule: '#6aa187',
    },
    grupos: [],
    tipos: ["aniversario-infantil"],
    tags: ["infantil", "azul", "céu", "leve", "menino"],
    ornamentoSugerido: "festivo",
  },
  {
    id: "aventura",
    nome: "Verde Aventura",
    descricao: "Natureza, aventura e infância",
    fora: '#ffffff',
    papel: '#f7fbf1',
    acento: '#4f7f3d',
    acentoTexto: '#426d33',
    tinta: '#2d4027',
    tintaSuave: '#5d7554',
    bloco: '#567149',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#e4ef92',
      petalaMedia: '#b9d56d',
      petalaEscura: '#4f7f3d',
      folha: '#7da765',
      caule: '#688f53',
    },
    grupos: [],
    tipos: ["aniversario-infantil"],
    tags: ["infantil", "aventura", "dinossauro", "selva", "natureza", "verde"],
    ornamentoSugerido: "rustico",
  },
  {
    id: "grafite-ambar",
    nome: "Grafite & Âmbar",
    descricao: "Bar, noite e happy hour",
    fora: '#171717',
    papel: '#22201d',
    acento: '#e2a43e',
    acentoTexto: '#efbd6a',
    tinta: '#fff5e7',
    tintaSuave: '#d1c0a5',
    bloco: '#3b3329',
    blocoTexto: '#fff5e7',
    floral: {
      petalaClara: '#f3d48f',
      petalaMedia: '#e2a43e',
      petalaEscura: '#b9761f',
      folha: '#7d8269',
      caule: '#666a55',
    },
    grupos: [],
    tipos: ["happy-hour", "confraternizacao"],
    tags: ["bar", "cerveja", "happy hour", "noturno", "grafite", "âmbar"],
    ornamentoSugerido: "geometrico",
  },
  {
    id: "tropical",
    nome: "Tropical",
    descricao: "Descontraído, quente e vibrante",
    fora: '#ffffff',
    papel: '#fff8ee',
    acento: '#d96042',
    acentoTexto: '#b94d35',
    tinta: '#2f4436',
    tintaSuave: '#637261',
    bloco: '#47705a',
    blocoTexto: '#fff9f2',
    floral: {
      petalaClara: '#ffd166',
      petalaMedia: '#f4a261',
      petalaEscura: '#e76f51',
      folha: '#4f9f6d',
      caule: '#3f8258',
    },
    grupos: ["happy_hour"],
    tipos: ["aniversario"],
    tags: ["tropical", "verão", "praia", "descontraído", "alegre"],
    ornamentoSugerido: "rustico",
  },
  {
    id: "executivo",
    nome: "Azul Executivo",
    descricao: "Corporativo, limpo e profissional",
    fora: '#ffffff',
    papel: '#f7f9fb',
    acento: '#2d5d86',
    acentoTexto: '#294f70',
    tinta: '#202c36',
    tintaSuave: '#536879',
    bloco: '#3c5265',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#d9e5ef',
      petalaMedia: '#a7bfd3',
      petalaEscura: '#2d5d86',
      folha: '#8297a5',
      caule: '#6c808e',
    },
    grupos: [],
    tipos: ["confraternizacao"],
    tags: ["corporativo", "empresa", "executivo", "azul", "profissional"],
    ornamentoSugerido: "geometrico",
  },
  {
    id: "grafite",
    nome: "Grafite Minimal",
    descricao: "Corporativo, neutro e moderno",
    fora: '#ffffff',
    papel: '#f5f5f4',
    acento: '#555b61',
    acentoTexto: '#444a50',
    tinta: '#242628',
    tintaSuave: '#63686d',
    bloco: '#42474c',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#e1e2e2',
      petalaMedia: '#babdc0',
      petalaEscura: '#555b61',
      folha: '#8b9092',
      caule: '#757a7d',
    },
    grupos: [],
    tipos: ["confraternizacao"],
    tags: ["corporativo", "grafite", "minimalista", "moderno", "neutro"],
    ornamentoSugerido: "minimal",
  },
  {
    id: "azul-confianca",
    nome: "Azul Confiança",
    descricao: "Acolhedor, confiável e claro",
    fora: '#ffffff',
    papel: '#f3f8ff',
    acento: '#3978b7',
    acentoTexto: '#31669b',
    tinta: '#22384d',
    tintaSuave: '#577188',
    bloco: '#466985',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#d6e9fb',
      petalaMedia: '#9bc5eb',
      petalaEscura: '#3978b7',
      folha: '#83a999',
      caule: '#6e9382',
    },
    grupos: [],
    tipos: ["vaquinha"],
    tags: ["vaquinha", "confiança", "azul", "solidário", "claro"],
    ornamentoSugerido: "minimal",
  },
  {
    id: "verde-esperanca",
    nome: "Verde Esperança",
    descricao: "Positivo, humano e acolhedor",
    fora: '#ffffff',
    papel: '#f4faf5',
    acento: '#4a8a5b',
    acentoTexto: '#3d744c',
    tinta: '#263d2c',
    tintaSuave: '#5a725f',
    bloco: '#52705a',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#dcefdc',
      petalaMedia: '#acd3b2',
      petalaEscura: '#4a8a5b',
      folha: '#7fa487',
      caule: '#688d70',
    },
    grupos: [],
    tipos: ["vaquinha"],
    tags: ["vaquinha", "esperança", "verde", "solidário", "acolhedor"],
    ornamentoSugerido: "minimal",
  },
  {
    id: "coral",
    nome: "Coral",
    descricao: "Humano, alegre e contemporâneo",
    fora: '#ffffff',
    papel: '#fff6f2',
    acento: '#d66c59',
    acentoTexto: '#a84d3f',
    tinta: '#4b302b',
    tintaSuave: '#7d5b54',
    bloco: '#9b5f53',
    blocoTexto: '#ffffff',
    floral: {
      petalaClara: '#ffd9ce',
      petalaMedia: '#efa795',
      petalaEscura: '#d66c59',
      folha: '#8fa884',
      caule: '#748f6b',
    },
    grupos: ["vaquinha"],
    tipos: ["aniversario"],
    tags: ["coral", "alegre", "adulto", "acolhedor", "moderno"],
    ornamentoSugerido: "festivo",
  },

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

/**
 * Paletas que fazem mais sentido para o tipo atual.
 * Mantém o catálogo completo disponível, mas evita despejar 29 opções de uma vez.
 */
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
  const lista = tipoEventoId
    ? [
        ...temasRecomendados(tipoEventoId, 12),
        ...TEMAS.filter(
          (t) => !temasRecomendados(tipoEventoId, 12).some((r) => r.id === t.id)
        ),
      ]
    : TEMAS;

  return lista.map(temaParaIA).join('\n');
}
