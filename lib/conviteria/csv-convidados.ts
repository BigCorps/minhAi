export const MAX_CSV_CONVIDADOS_BYTES = 2 * 1024 * 1024;
export const MAX_CSV_CONVIDADOS_LINHAS = 600;

export type LinhaCsvConvidado = {
  nome: string;
  membros: string[];
  email: string;
  telefone: string;
};

export type ResultadoCsvConvidados = {
  linhas: LinhaCsvConvidado[];
  ignoradas: number;
  totalDados: number;
  encoding: 'utf-8' | 'windows-1252' | 'utf-16le' | 'utf-16be';
  delimitador: ';' | ',' | '\t';
};

const MENSAGEM_COLUNAS =
  'Não conseguimos identificar as colunas do arquivo. Use o modelo de convidados fornecido pelo ConviteIA ou confira se a primeira linha contém Nome, Membros, E-mail e Telefone.';

export class CsvConvidadosErro extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvConvidadosErro';
  }
}

function removerBom(texto: string) {
  return texto.replace(/^\uFEFF/, '');
}

function pareceBinario(bytes: Uint8Array) {
  if (!bytes.length) return false;
  let controles = 0;
  const amostra = bytes.subarray(0, Math.min(bytes.length, 16_384));
  for (const b of amostra) {
    if (b === 0) controles += 5;
    else if (b < 9 || (b > 13 && b < 32)) controles += 1;
  }
  return controles / amostra.length > 0.02;
}

export function decodificarCsvConvidados(bytes: Uint8Array): {
  texto: string;
  encoding: ResultadoCsvConvidados['encoding'];
} {
  if (!bytes.length) throw new CsvConvidadosErro('O arquivo está vazio.');
  if (bytes.length > MAX_CSV_CONVIDADOS_BYTES) {
    throw new CsvConvidadosErro('O arquivo é muito grande. Use um CSV de até 2 MB.');
  }

  // Excel também pode salvar texto Unicode com BOM UTF-16. Aceitamos sem
  // alterar o formato oficial, que continua sendo UTF-8 com BOM.
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      texto: removerBom(new TextDecoder('utf-16le').decode(bytes)),
      encoding: 'utf-16le',
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return {
      texto: removerBom(new TextDecoder('utf-16be').decode(bytes)),
      encoding: 'utf-16be',
    };
  }

  // NUL em arquivos sem BOM é um forte sinal de conteúdo binário, não CSV.
  if (pareceBinario(bytes)) {
    throw new CsvConvidadosErro('O arquivo enviado não parece ser um CSV de texto válido.');
  }

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return {
      texto: removerBom(new TextDecoder('utf-8').decode(bytes)),
      encoding: 'utf-8',
    };
  }

  try {
    return {
      texto: removerBom(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
      encoding: 'utf-8',
    };
  } catch {
    // CSV salvo pelo Excel no Windows costuma sair em ANSI/Windows-1252.
    return {
      texto: removerBom(new TextDecoder('windows-1252').decode(bytes)),
      encoding: 'windows-1252',
    };
  }
}

function contarForaDeAspas(linha: string, delimitador: string) {
  let aspas = false;
  let total = 0;
  for (let i = 0; i < linha.length; i += 1) {
    if (linha[i] === '"') {
      if (aspas && linha[i + 1] === '"') i += 1;
      else aspas = !aspas;
    } else if (!aspas && linha[i] === delimitador) {
      total += 1;
    }
  }
  return total;
}

export function detectarDelimitadorCsv(texto: string): ';' | ',' | '\t' {
  const amostra = removerBom(texto)
    .split(/\r\n|\n|\r/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)
    .slice(0, 8);

  if (!amostra.length) throw new CsvConvidadosErro('O arquivo está vazio.');

  const candidatos = [';', ',', '\t'] as const;
  let melhor: { delimitador: (typeof candidatos)[number]; score: number } | null = null;

  for (const delimitador of candidatos) {
    const contagens = amostra.map((linha) => contarForaDeAspas(linha, delimitador));
    const header = contagens[0] ?? 0;
    if (header <= 0) continue;

    // Premia o delimitador presente no cabeçalho e que mantém uma quantidade
    // semelhante de colunas nas linhas seguintes. Isso evita escolher vírgulas
    // que estejam dentro de um conteúdo textual.
    const consistentes = contagens.filter((n) => n === header).length;
    const score = header * 100 + consistentes * 10 + contagens.reduce((a, b) => a + b, 0);
    if (!melhor || score > melhor.score) melhor = { delimitador, score };
  }

  if (!melhor) throw new CsvConvidadosErro(MENSAGEM_COLUNAS);
  return melhor.delimitador;
}

export function parseTabelaCsv(texto: string, delimitador: ';' | ',' | '\t'): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let aspas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto[i];
    if (ch === '"') {
      if (aspas && texto[i + 1] === '"') {
        campo += '"';
        i += 1;
      } else {
        aspas = !aspas;
      }
      continue;
    }

    if (!aspas && ch === delimitador) {
      linha.push(campo.trim());
      campo = '';
      continue;
    }

    if (!aspas && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && texto[i + 1] === '\n') i += 1;
      linha.push(campo.trim());
      campo = '';
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
      linha = [];
      continue;
    }

    campo += ch;
  }

  if (aspas) {
    throw new CsvConvidadosErro('Há uma célula com aspas abertas no arquivo. Revise o CSV e tente novamente.');
  }

  linha.push(campo.trim());
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
  return linhas;
}

export function normalizarCabecalhoCsv(valor: string) {
  return removerBom(String(valor ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const ALIASES = {
  nome: new Set(['nome', 'convidado', 'nome do convidado', 'membro principal']),
  membros: new Set([
    'membros',
    'dependentes',
    'acompanhantes',
    'integrantes',
    'familia',
    'familia/dependentes',
    'grupo',
  ]),
  email: new Set(['email', 'e-mail']),
  telefone: new Set(['telefone', 'celular', 'whatsapp', 'whats', 'telefone/whatsapp']),
};

function indiceAlias(cabecalhos: string[], aliases: Set<string>) {
  return cabecalhos.findIndex((x) => aliases.has(x));
}

export function parseCsvConvidadosTexto(
  texto: string,
  encoding: ResultadoCsvConvidados['encoding'] = 'utf-8',
): ResultadoCsvConvidados {
  const limpo = removerBom(texto);
  const delimitador = detectarDelimitadorCsv(limpo);
  const tabela = parseTabelaCsv(limpo, delimitador);
  if (tabela.length < 2) {
    throw new CsvConvidadosErro('O arquivo não possui linhas de convidados para importar.');
  }

  const cab = tabela[0].map(normalizarCabecalhoCsv);
  const iNome = indiceAlias(cab, ALIASES.nome);
  const iMembros = indiceAlias(cab, ALIASES.membros);
  const iEmail = indiceAlias(cab, ALIASES.email);
  const iTelefone = indiceAlias(cab, ALIASES.telefone);

  if (iNome < 0) throw new CsvConvidadosErro(MENSAGEM_COLUNAS);

  const conhecidas = [iNome, iMembros, iEmail, iTelefone].filter((x) => x >= 0).length;
  if (conhecidas < 2) throw new CsvConvidadosErro(MENSAGEM_COLUNAS);

  const linhas: LinhaCsvConvidado[] = [];
  let ignoradas = 0;
  let totalDados = 0;

  for (const row of tabela.slice(1)) {
    if (!row.some((x) => String(x ?? '').trim())) continue;
    totalDados += 1;

    const nome = String(row[iNome] ?? '').trim().replace(/\s+/g, ' ');
    if (!nome) {
      ignoradas += 1;
      continue;
    }

    const membros = String(iMembros >= 0 ? row[iMembros] ?? '' : '')
      .split('|')
      .map((x) => x.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .slice(0, 20);

    linhas.push({
      nome,
      membros,
      email: String(iEmail >= 0 ? row[iEmail] ?? '' : '').trim(),
      telefone: String(iTelefone >= 0 ? row[iTelefone] ?? '' : '').trim(),
    });

    if (linhas.length >= MAX_CSV_CONVIDADOS_LINHAS) break;
  }

  if (!linhas.length) {
    throw new CsvConvidadosErro('Não encontramos convidados válidos no arquivo. Confira se a coluna Nome está preenchida.');
  }

  return { linhas, ignoradas, totalDados, encoding, delimitador };
}

export function parseCsvConvidadosBytes(bytes: Uint8Array): ResultadoCsvConvidados {
  const { texto, encoding } = decodificarCsvConvidados(bytes);
  return parseCsvConvidadosTexto(texto, encoding);
}

export async function lerArquivoCsvConvidados(file: File): Promise<ResultadoCsvConvidados> {
  if (file.size > MAX_CSV_CONVIDADOS_BYTES) {
    throw new CsvConvidadosErro('O arquivo é muito grande. Use um CSV de até 2 MB.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return parseCsvConvidadosBytes(bytes);
}

/**
 * Use esta função se dados de convidados forem exportados futuramente para CSV.
 * Prefixar fórmulas impede que Excel/Sheets executem conteúdo iniciado por
 * =, +, -, @, TAB ou CR como fórmula ao abrir o arquivo exportado.
 */
export function protegerCelulaCsv(valor: unknown) {
  const s = String(valor ?? '');
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
