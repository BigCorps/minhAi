// lib/melhoria/boleto.ts
// ─────────────────────────────────────────────────────────────────────────────
// Validação de linha digitável — 100% OFFLINE, SEM IA, SEM CUSTO.
//
// Isto roda no navegador e não gasta crédito nenhum. É a função que pega o
// golpe mais comum contra idoso — boleto adulterado ou de banco inexistente —
// de graça e ilimitado. Só a FOTO do boleto, para quem não consegue digitar 47
// dígitos, consome crédito.
//
// O que dá para saber sem consultar ninguém:
//   · dígitos verificadores (módulo 10 nos campos, módulo 11 no geral)
//   · banco emissor (3 primeiros dígitos)
//   · data de vencimento (fator de vencimento)
//   · valor (10 últimos dígitos do código de barras)
//
// Se qualquer dígito for adulterado, os DVs quebram. É aritmética, não
// adivinhação.
// ─────────────────────────────────────────────────────────────────────────────

// ── Bancos ───────────────────────────────────────────────────────────────────
// Se o código não estiver aqui, NÃO significa golpe: significa que não
// conhecemos. A distinção importa — dizer "banco inexistente" de um banco
// pequeno e real seria um falso positivo grave.
const BANCOS: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '036': 'Banco Bradesco BBI',
  '037': 'Banpará',
  '041': 'Banrisul',
  '047': 'Banco do Estado de Sergipe',
  '070': 'BRB — Banco de Brasília',
  '077': 'Banco Inter',
  '084': 'Uniprime',
  '085': 'Via Credi / Ailos',
  '097': 'Credisis',
  '099': 'Uniprime Central',
  '104': 'Caixa Econômica Federal',
  '107': 'Banco BOCOM BBM',
  '121': 'Agibank',
  '133': 'Cresol',
  '136': 'Unicred',
  '197': 'Stone',
  '208': 'Banco BTG Pactual',
  '212': 'Banco Original',
  '218': 'Banco BS2',
  '237': 'Bradesco',
  '246': 'Banco ABC Brasil',
  '260': 'Nu Pagamentos (Nubank)',
  '274': 'Money Plus',
  '290': 'PagBank / PagSeguro',
  '318': 'Banco BMG',
  '323': 'Mercado Pago',
  '336': 'Banco C6',
  '341': 'Itaú Unibanco',
  '380': 'PicPay',
  '389': 'Banco Mercantil do Brasil',
  '399': 'HSBC / Kirton',
  '403': 'Cora',
  '422': 'Banco Safra',
  '461': 'Asaas',
  '473': 'Banco Caixa Geral',
  '479': 'Banco ItauBank',
  '600': 'Banco Luso Brasileiro',
  '604': 'Banco Industrial do Brasil',
  '611': 'Banco Paulista',
  '613': 'Omni Banco',
  '623': 'Banco PAN',
  '629': 'Banco Crefisa',
  '633': 'Banco Rendimento',
  '637': 'Banco Sofisa',
  '643': 'Banco Pine',
  '652': 'Itaú Unibanco Holding',
  '653': 'Banco Voiter',
  '655': 'Banco Votorantim / BV',
  '707': 'Banco Daycoval',
  '735': 'Banco Neon',
  '739': 'Banco Cetelem',
  '741': 'Banco Ribeirão Preto',
  '743': 'Banco Semear',
  '745': 'Citibank',
  '746': 'Banco Modal',
  '748': 'Sicredi',
  '751': 'Scotiabank Brasil',
  '755': 'Bank of America Merrill Lynch',
  '756': 'Sicoob',
  '757': 'Banco KEB HANA',
};

// Segmentos de conta de consumo / arrecadação (48 dígitos)
const SEGMENTOS: Record<string, string> = {
  '1': 'Prefeitura',
  '2': 'Saneamento (água/esgoto)',
  '3': 'Energia elétrica ou gás',
  '4': 'Telecomunicações',
  '5': 'Órgão governamental',
  '6': 'Carnê ou mensalidade',
  '7': 'Multa de trânsito',
  '9': 'Uso exclusivo do banco',
};

export type Veredito = 'sem_indicios' | 'atencao' | 'alto_risco' | 'digitacao';

/**
 * De onde vieram os números. Isto MUDA O VEREDITO, e é a parte mais
 * importante do desenho desta função.
 *
 * Quando os dígitos verificadores não fecham, offline não há como distinguir
 * "a pessoa errou ao digitar" de "alguém adulterou o boleto" — os dois
 * produzem exatamente o mesmo sintoma. Mas a ORIGEM distingue:
 *
 *   digitado → 47 números na mão. Errar é o normal, não a exceção. O primeiro
 *              aviso tem que ser "confira os números", nunca "isto é golpe".
 *   colado   → veio do WhatsApp, do e-mail ou da câmera. Não existe erro de
 *              digitação aqui. Se não fecha, alguém mexeu.
 *
 * Acusar golpe onde houve typo tem custo alto: assusta à toa e, pior, ensina
 * que o alerta é exagerado — o que estraga o alerta na hora que ele importa.
 */
export type Origem = 'digitado' | 'colado' | 'camera';

export interface OpcoesVerificacao {
  origem?: Origem;
  /** true depois que a pessoa conferiu e digitou de novo. Aí sim escala. */
  jaConferiu?: boolean;
}

export interface ResultadoBoleto {
  valido: boolean;
  veredito: Veredito;
  tipo: 'bancario' | 'arrecadacao' | 'desconhecido';

  banco?: string;
  bancoCodigo?: string;
  segmento?: string;

  vencimento?: Date | null;
  vencimentoTexto?: string;
  valor?: number | null;
  valorTexto?: string;

  /** Frases prontas, em português claro, para mostrar na tela. */
  motivos: string[];
  /** O que a pessoa deve fazer. Nunca "pode pagar". */
  orientacao: string;
  codigoBarras?: string;
}

// ── Dígitos verificadores ────────────────────────────────────────────────────

/** Módulo 10 — usado nos três campos da linha digitável bancária. */
export function mod10(bloco: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = bloco.length - 1; i >= 0; i--) {
    let p = Number(bloco[i]) * peso;
    if (p > 9) p = Math.floor(p / 10) + (p % 10);
    soma += p;
    peso = peso === 2 ? 1 : 2;
  }
  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

/** Módulo 11 — DV geral do código de barras. Pesos 2..9 da direita. */
export function mod11(codigo: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = codigo.length - 1; i >= 0; i--) {
    soma += Number(codigo[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const dv = 11 - (soma % 11);
  return dv === 0 || dv > 9 ? 1 : dv;
}

/** Módulo 11 para arrecadação: resto 0 ou 1 → DV 0; resto 10 → DV 1. */
function mod11Arrecadacao(codigo: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = codigo.length - 1; i >= 0; i--) {
    soma += Number(codigo[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  if (resto === 0 || resto === 1) return 0;
  if (resto === 10) return 1;
  return 11 - resto;
}

// ── Fator de vencimento ──────────────────────────────────────────────────────
// ⚠️ ARMADILHA ATUAL. O fator estourou 9999 em 21/02/2025 e a FEBRABAN
// reiniciou a contagem em 1000 no dia 22/02/2025.
//
//   ciclo antigo: fator 1000 = 03/07/2000 ... fator 9999 = 21/02/2025
//   ciclo novo:   fator 1000 = 22/02/2025 em diante
//
// Um boleto vencendo hoje tem fator por volta de 1544. Quem usar só a base
// antiga (07/10/1997) vai calcular 01/01/2002 e mostrar uma data absurda para
// todo boleto atual.

const DIA = 86_400_000;
const BASE_ANTIGA = Date.UTC(1997, 9, 7);   // fator 1000 = 03/07/2000
const BASE_NOVA   = Date.UTC(2025, 1, 22);  // fator 1000 = 22/02/2025

function calcularVencimento(fator: number): Date | null {
  // 0000 = boleto sem data de vencimento. É legítimo.
  if (!fator || fator < 1000) return null;

  const novo   = new Date(BASE_NOVA + (fator - 1000) * DIA);
  const antigo = new Date(BASE_ANTIGA + fator * DIA);

  const agora = Date.now();
  const cincoAnos = 5 * 365 * DIA;

  // Preferimos o ciclo novo. Só caímos no antigo se a data nova ficar
  // absurdamente longe e a antiga fizer sentido — cenário de boleto muito
  // velho que alguém guardou.
  const plausivelNovo =
    novo.getTime() > agora - cincoAnos && novo.getTime() < agora + cincoAnos;

  if (plausivelNovo) return novo;

  const plausivelAntigo =
    antigo.getTime() > agora - cincoAnos && antigo.getTime() < agora + cincoAnos;

  return plausivelAntigo ? antigo : novo;
}

// ── Formatação ───────────────────────────────────────────────────────────────

function formatarData(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  }).format(d);
}

function formatarValor(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function limpar(entrada: string): string {
  return (entrada || '').replace(/\D/g, '');
}

/** Máscara visual enquanto a pessoa digita. */
export function mascarar(digitos: string): string {
  const d = limpar(digitos);
  if (d.length > 47) {
    // arrecadação: 4 blocos de 12
    return (d.match(/.{1,12}/g) ?? []).join(' ').trim();
  }
  const p: string[] = [];
  if (d.length > 0)  p.push(d.slice(0, 5) + (d.length > 5 ? '.' : '') + d.slice(5, 10));
  if (d.length > 10) p.push(d.slice(10, 15) + (d.length > 15 ? '.' : '') + d.slice(15, 21));
  if (d.length > 21) p.push(d.slice(21, 26) + (d.length > 26 ? '.' : '') + d.slice(26, 32));
  if (d.length > 32) p.push(d.slice(32, 33));
  if (d.length > 33) p.push(d.slice(33, 47));
  return p.join(' ').trim();
}

// ── Verificação principal ────────────────────────────────────────────────────

export function verificarBoleto(
  entrada: string,
  opcoes: OpcoesVerificacao = {},
): ResultadoBoleto {
  const { origem = 'digitado', jaConferiu = false } = opcoes;
  const d = limpar(entrada);
  const motivos: string[] = [];

  // Só faz sentido pedir para conferir quando havia o que digitar errado.
  const podeSerTypo = origem === 'digitado' && !jaConferiu;

  // ── Tamanho ────────────────────────────────────────────────────────────
  if (d.length === 0) {
    return {
      valido: false, veredito: 'digitacao', tipo: 'desconhecido',
      motivos: ['Digite os números do boleto.'],
      orientacao: 'Os números ficam na parte de cima do boleto, em uma linha comprida.',
    };
  }

  if (d.length !== 47 && d.length !== 48) {
    return {
      valido: false,
      veredito: 'digitacao',
      tipo: 'desconhecido',
      motivos: [
        d.length < 47
          ? `Faltam números: você digitou ${d.length}, e o boleto tem 47 ou 48.`
          : `Sobram números: você digitou ${d.length}, e o boleto tem 47 ou 48.`,
      ],
      orientacao: 'Confira a linha de números na parte de cima do boleto e digite de novo.',
    };
  }

  return d.length === 47
    ? bancario(d, motivos, podeSerTypo)
    : arrecadacao(d, motivos, podeSerTypo);
}

// ── Boleto bancário (47 dígitos) ─────────────────────────────────────────────
function bancario(d: string, motivos: string[], podeSerTypo: boolean): ResultadoBoleto {
  const campo1 = d.slice(0, 9),  dv1 = Number(d[9]);
  const campo2 = d.slice(10, 20), dv2 = Number(d[20]);
  const campo3 = d.slice(21, 31), dv3 = Number(d[31]);
  const dvGeral = Number(d[32]);

  const erros: string[] = [];
  if (mod10(campo1) !== dv1) erros.push('primeiro');
  if (mod10(campo2) !== dv2) erros.push('segundo');
  if (mod10(campo3) !== dv3) erros.push('terceiro');

  // Remonta o código de barras a partir da linha digitável.
  const barras =
    d.slice(0, 4) + d[32] + d.slice(33, 47) +
    d.slice(4, 9) + d.slice(10, 20) + d.slice(21, 31);

  const dvGeralOk = mod11(barras.slice(0, 4) + barras.slice(5)) === dvGeral;

  const codigoBanco = d.slice(0, 3);
  const banco = BANCOS[codigoBanco];
  const fator = Number(d.slice(33, 37));
  const centavos = Number(d.slice(37, 47));
  const valor = centavos > 0 ? centavos / 100 : null;
  const vencimento = calcularVencimento(fator);

  const contasNaoFecham = erros.length > 0 || !dvGeralOk;

  // ── Digitado e ainda não conferido: peça para conferir ─────────────────
  // Ninguém digita 47 números sem errar. Este caminho NÃO acusa golpe.
  if (contasNaoFecham && podeSerTypo) {
    return {
      valido: false,
      veredito: 'digitacao',
      tipo: 'bancario',
      bancoCodigo: codigoBanco,
      banco,
      motivos: erros.length > 0 && erros.length <= 2
        ? [`Algum número do ${erros.join(' e ')} bloco parece estar errado.`]
        : ['Os números não fecham. É bem provável que tenha faltado ou sobrado algum dígito.'],
      orientacao: 'Confira com calma e digite de novo. Se você digitar certo e continuar dando erro, aí sim é motivo para desconfiar.',
    };
  }

  // ── Colado/câmera, ou já conferido: agora é suspeita de verdade ────────
  if (contasNaoFecham) {
    motivos.push('Os números de conferência do boleto não fecham.');
    if (!dvGeralOk) motivos.push('O código de barras não confere com a linha digitada.');
    if (!banco) motivos.push(`O código ${codigoBanco} não corresponde a um banco que conhecemos.`);

    return {
      valido: false,
      veredito: 'alto_risco',
      tipo: 'bancario',
      bancoCodigo: codigoBanco,
      banco,
      vencimento,
      vencimentoTexto: vencimento ? formatarData(vencimento) : undefined,
      valor,
      valorTexto: valor ? formatarValor(valor) : undefined,
      motivos,
      orientacao: 'Não pague. Ligue para quem enviou a cobrança, usando um telefone que você já conhece, e confirme.',
      codigoBarras: barras,
    };
  }

  // ── Contas fecham ──────────────────────────────────────────────────────
  let veredito: Veredito = 'sem_indicios';

  if (banco) {
    motivos.push(`Banco emissor: ${banco}.`);
  } else {
    // Não conhecer o código não é prova de golpe — existem bancos pequenos e
    // códigos novos. Mas merece um olhar.
    motivos.push(`O código do banco (${codigoBanco}) não está na nossa lista. Pode ser um banco pequeno, mas vale confirmar.`);
    veredito = 'atencao';
  }

  if (vencimento) {
    motivos.push(`Vencimento: ${formatarData(vencimento)}.`);
    const diasVencido = Math.floor((Date.now() - vencimento.getTime()) / DIA);
    if (diasVencido > 90) {
      motivos.push('Este boleto venceu há mais de três meses.');
      veredito = 'atencao';
    }
  } else {
    motivos.push('Este boleto não tem data de vencimento.');
  }

  if (valor) {
    motivos.push(`Valor: ${formatarValor(valor)}.`);
  } else {
    // Valor zerado é legítimo em alguns casos, mas é usado em golpe de
    // "preencha o valor" — e o idoso não tem como saber disso.
    motivos.push('Este boleto não tem valor definido — quem for pagar é que digita o valor.');
    veredito = 'atencao';
  }

  return {
    valido: true,
    veredito,
    tipo: 'bancario',
    bancoCodigo: codigoBanco,
    banco,
    vencimento,
    vencimentoTexto: vencimento ? formatarData(vencimento) : undefined,
    valor,
    valorTexto: valor ? formatarValor(valor) : undefined,
    motivos,
    // NUNCA "é seguro" nem "pode pagar".
    orientacao: veredito === 'sem_indicios'
      ? 'Não encontramos indícios de adulteração. Mesmo assim, se você não estava esperando esta cobrança, confirme por telefone com quem enviou.'
      : 'Confirme por telefone com quem enviou a cobrança antes de pagar.',
    codigoBarras: barras,
  };
}

// ── Conta de consumo / arrecadação (48 dígitos) ──────────────────────────────
function arrecadacao(d: string, motivos: string[], podeSerTypo: boolean): ResultadoBoleto {
  const produto = d[0];
  const segmentoCod = d[1];
  const idValor = d[2];

  if (produto !== '8') {
    return {
      valido: false, veredito: 'alto_risco', tipo: 'arrecadacao',
      motivos: ['Este código tem 48 números mas não segue o padrão de conta de consumo.'],
      orientacao: 'Não pague. Confirme com a empresa por um telefone que você já conhece.',
    };
  }

  // A linha digitável são 4 blocos de 12 (11 dígitos + 1 DV cada). O DV de
  // cada bloco é módulo 10 ou módulo 11 conforme o 3º dígito.
  const usaMod10 = idValor === '6' || idValor === '7';
  const blocos = [d.slice(0, 12), d.slice(12, 24), d.slice(24, 36), d.slice(36, 48)];

  const errados: number[] = [];
  blocos.forEach((b, i) => {
    const corpo = b.slice(0, 11);
    const dv = Number(b[11]);
    const calc = usaMod10 ? mod10(corpo) : mod11Arrecadacao(corpo);
    if (calc !== dv) errados.push(i + 1);
  });

  const segmento = SEGMENTOS[segmentoCod];
  // No código de barras (44), o valor ocupa as posições 5 a 15.
  const barras = blocos.map((b) => b.slice(0, 11)).join('');
  const centavos = Number(barras.slice(4, 15));
  const valor = centavos > 0 ? centavos / 100 : null;

  if (errados.length > 0 && podeSerTypo) {
    return {
      valido: false, veredito: 'digitacao', tipo: 'arrecadacao',
      segmento,
      motivos: errados.length <= 2
        ? [`Algum número do ${errados.join('º e ')}º bloco parece estar errado.`]
        : ['Os números não fecham. Deve ter faltado ou sobrado algum dígito.'],
      orientacao: 'Confira com calma e digite de novo.',
    };
  }

  if (errados.length > 0) {
    return {
      valido: false, veredito: 'alto_risco', tipo: 'arrecadacao',
      segmento, valor, valorTexto: valor ? formatarValor(valor) : undefined,
      motivos: ['Os números de conferência não fecham.'],
      orientacao: 'Não pague. Ligue para a empresa por um telefone que você já conhece e confirme.',
    };
  }

  let veredito: Veredito = 'sem_indicios';
  motivos.push(segmento ? `Tipo de conta: ${segmento}.` : 'Tipo de conta não identificado.');
  if (!segmento) veredito = 'atencao';

  if (valor) motivos.push(`Valor: ${formatarValor(valor)}.`);
  else {
    motivos.push('Esta conta não tem valor definido.');
    veredito = 'atencao';
  }

  // Conta de consumo não carrega vencimento no código: é uma limitação do
  // padrão, não uma falha da verificação. Melhor dizer do que omitir.
  motivos.push('Contas de consumo não trazem a data de vencimento nos números.');

  return {
    valido: true, veredito, tipo: 'arrecadacao',
    segmento, valor, valorTexto: valor ? formatarValor(valor) : undefined,
    motivos,
    orientacao: veredito === 'sem_indicios'
      ? 'Não encontramos indícios de adulteração. Se você não estava esperando esta conta, confirme com a empresa antes de pagar.'
      : 'Confirme com a empresa por telefone antes de pagar.',
    codigoBarras: barras,
  };
}
