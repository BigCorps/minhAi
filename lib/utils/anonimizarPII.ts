// ============================================================
// FASE 1C — UTILITÁRIO: anonimizarPII
// Arquivo: lib/utils/anonimizarPII.ts
// ============================================================
// Executa inteiramente no browser, ANTES de qualquer envio
// para a Edge Function. Garante conformidade LGPD.
// ============================================================

// ── Padrões de PII brasileiros ───────────────────────────────
const PII_PATTERNS: { nome: string; regex: RegExp; substituto: string }[] = [
  {
    nome: 'CPF',
    // 000.000.000-00 ou 00000000000
    regex: /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/g,
    substituto: '***.***.***-**',
  },
  {
    nome: 'CNPJ',
    // 00.000.000/0000-00 ou 00000000000000
    regex: /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}\b/g,
    substituto: '**.***.***\/****-**',
  },
  {
    nome: 'Email',
    regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    substituto: '***@***.***',
  },
  {
    nome: 'Telefone BR',
    // (11) 99999-9999 ou 11999999999 etc.
    regex: /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)(?:9\s?)?\d{4}[-\s]?\d{4}\b/g,
    substituto: '(**) *****-****',
  },
  {
    nome: 'RG',
    // Padrão simples: 9 dígitos com pontos e hífen
    regex: /\b\d{1,2}[.\s]\d{3}[.\s]\d{3}[-\s]?\d{1}\b/g,
    substituto: '*.***.***-*',
  },
  {
    nome: 'Cartão de crédito',
    regex: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,
    substituto: '**** **** **** ****',
  },
];

// Colunas cujo NOME sugere dados sensíveis (anonimiza o valor inteiro)
const PII_COLUMN_NAMES = [
  'cpf', 'cnpj', 'email', 'e-mail', 'telefone', 'celular', 'fone',
  'rg', 'senha', 'password', 'token', 'cartao', 'cartão', 'card',
  'nascimento', 'data_nasc', 'aniversario', 'endereco', 'endereço',
  'logradouro', 'cep', 'passaporte',
];

/**
 * Anonimiza uma string aplicando todos os padrões PII.
 */
function anonimizarString(valor: string): string {
  let resultado = valor;
  for (const { regex, substituto } of PII_PATTERNS) {
    resultado = resultado.replace(regex, substituto);
  }
  return resultado;
}

/**
 * Verifica se o nome de uma coluna é sensível.
 */
function colunaEhSensivel(nomeColuna: string): boolean {
  const normalizado = nomeColuna
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return PII_COLUMN_NAMES.some((pii) => normalizado.includes(pii));
}

/**
 * Anonimiza um array de objetos (linhas da planilha).
 * - Colunas com nome sensível: substitui por '***'
 * - Colunas string: aplica regex PII
 * - Números e datas: mantém intactos (não são PII por si só)
 *
 * Retorna também um relatório de campos anonimizados.
 */
export function anonimizarPII(dados: Record<string, unknown>[]): {
  dadosLimpos: Record<string, unknown>[];
  camposAnonimizados: string[];
  totalOcorrencias: number;
} {
  if (!dados.length) {
    return { dadosLimpos: [], camposAnonimizados: [], totalOcorrencias: 0 };
  }

  const camposAnonimizados = new Set<string>();
  let totalOcorrencias = 0;

  const dadosLimpos = dados.map((linha) => {
    const linhaLimpa: Record<string, unknown> = {};

    for (const [chave, valor] of Object.entries(linha)) {
      // Coluna com nome sensível → anonimiza inteiro
      if (colunaEhSensivel(chave)) {
        linhaLimpa[chave] = '***';
        camposAnonimizados.add(chave);
        totalOcorrencias++;
        continue;
      }

      // String → aplica regex PII
      if (typeof valor === 'string') {
        const valorLimpo = anonimizarString(valor);
        linhaLimpa[chave] = valorLimpo;
        if (valorLimpo !== valor) {
          camposAnonimizados.add(chave);
          totalOcorrencias++;
        }
        continue;
      }

      // Número, boolean, null → mantém
      linhaLimpa[chave] = valor;
    }

    return linhaLimpa;
  });

  return {
    dadosLimpos,
    camposAnonimizados: Array.from(camposAnonimizados),
    totalOcorrencias,
  };
}

/**
 * Detecta o tipo de uma coluna com base em sample de valores.
 */
export function detectarTipoColuna(
  valores: unknown[]
): 'numero' | 'data' | 'texto' | 'booleano' {
  const amostra = valores.filter((v) => v !== null && v !== undefined && v !== '');

  if (!amostra.length) return 'texto';

  // Booleano
  const bools = amostra.filter(
    (v) => v === true || v === false || v === 'true' || v === 'false' || v === 'sim' || v === 'não'
  );
  if (bools.length / amostra.length > 0.8) return 'booleano';

  // Número
  const numeros = amostra.filter((v) => {
    const n = typeof v === 'string'
      ? parseFloat(v.replace(/[R$.\s]/g, '').replace(',', '.'))
      : Number(v);
    return !isNaN(n);
  });
  if (numeros.length / amostra.length > 0.8) return 'numero';

  // Data — padrões comuns brasileiros
  const reData = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$|^\d{4}-\d{2}-\d{2}/;
  const datas = amostra.filter((v) => typeof v === 'string' && reData.test(v.trim()));
  if (datas.length / amostra.length > 0.7) return 'data';

  return 'texto';
}

/**
 * Constrói o schema a partir de um array de linhas.
 * Retorna até 3 valores de amostra por coluna (já anonimizados).
 */
export function construirSchema(
  dados: Record<string, unknown>[]
): { coluna: string; tipo: 'numero' | 'data' | 'texto' | 'booleano'; sample: (string | number)[] }[] {
  if (!dados.length) return [];

  const colunas = Object.keys(dados[0]);

  return colunas.map((coluna) => {
    const valores = dados.slice(0, 50).map((linha) => linha[coluna]);
    const tipo = detectarTipoColuna(valores);

    // Amostra: 3 valores únicos não-nulos
    const sample = Array.from(
      new Set(
        valores
          .filter((v) => v !== null && v !== undefined && v !== '')
          .map((v) => (typeof v === 'number' ? v : String(v)))
      )
    ).slice(0, 3) as (string | number)[];

    return { coluna, tipo, sample };
  });
}
