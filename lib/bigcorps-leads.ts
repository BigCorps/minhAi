export const BR_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const BR_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

export function isValidBrazilPhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  return (digits.length === 10 || digits.length === 11) && BR_DDDS.has(digits.slice(0, 2));
}

export const BIGCORPS_CONSENT_TEXT =
  'Concordo em receber o contato da BigCorps sobre esta análise e com a Política de Privacidade.';

export const TIPO_EMPRESA_OPTIONS = [
  'Empresa física',
  'Empresa digital',
  'Empresa híbrida',
] as const;

export const SEGMENTO_OPTIONS = [
  'Comércio',
  'Serviços',
  'Alimentação',
  'Saúde e beleza',
  'Indústria',
  'Outro',
] as const;

export const PORTE_OPTIONS = [
  'MEI',
  'Microempresa (até 9 pessoas)',
  'Pequena (10 a 49)',
  'Média ou maior',
] as const;

export const TEMPO_EMPRESA_OPTIONS = [
  'Menos de 1 ano',
  '1 a 3 anos',
  '3 a 5 anos',
  'Mais de 5 anos',
] as const;

export const AREA_OPTIONS = [
  'Vendas',
  'Novas receitas',
  'Custos',
  'Automação',
  'Atendimento',
  'Marketing',
  'Cobrança',
  'Operação',
  'Presença digital',
] as const;

export type Area = (typeof AREA_OPTIONS)[number];
export type SymptomAnswer = 'sim' | 'as_vezes' | 'nao';

export const AREA_QUESTIONS: Record<Area, string> = {
  Vendas: 'Você sente que perde vendas por falta de acompanhamento ou organização dos contatos?',
  'Novas receitas': 'Seu negócio poderia ganhar dinheiro com produtos, serviços ou canais que hoje ainda não explora?',
  Custos: 'Você tem despesas recorrentes que parecem maiores do que deveriam ou difíceis de acompanhar?',
  Automação: 'Sua equipe repete tarefas manuais que poderiam acontecer automaticamente?',
  Atendimento: 'Você demora para responder clientes no WhatsApp ou em outros canais?',
  Marketing: 'Você investe tempo ou dinheiro em divulgação sem saber claramente o que traz clientes?',
  Cobrança: 'Clientes atrasam pagamentos com frequência?',
  Operação: 'Erros, retrabalho ou falta de informação atrapalham a rotina da empresa?',
  'Presença digital': 'Você sente que seus clientes têm dificuldade para encontrar sua empresa no Google e na internet?',
};

export const AREA_RESULT_COPY: Record<Area, string> = {
  Vendas: 'Há espaço para organizar melhor oportunidades, acompanhar contatos e reduzir vendas perdidas.',
  'Novas receitas': 'Seu negócio pode testar novos canais, serviços ou formas de monetização sem depender só do que já vende hoje.',
  Custos: 'Mapear despesas e automatizar controles pode revelar economia recorrente sem cortar o que realmente gera resultado.',
  Automação: 'Tarefas repetitivas podem ser automatizadas para liberar tempo da equipe e reduzir erros.',
  Atendimento: 'Velocidade e organização no atendimento podem aumentar conversão e evitar clientes esquecidos.',
  Marketing: 'Medição e automação podem ajudar a concentrar investimento nos canais que realmente trazem retorno.',
  Cobrança: 'Lembretes, conciliação e automações podem reduzir atrasos e trabalho manual de cobrança.',
  Operação: 'Fluxos mais claros e informação centralizada podem diminuir retrabalho e gargalos do dia a dia.',
  'Presença digital': 'Melhorar descoberta, confiança e conversão online pode facilitar que novos clientes encontrem a empresa.',
};

export const GESTAO_OPTIONS = [
  'Caderno ou planilha',
  'Sistema de gestão',
  'WhatsApp Business',
  'Nenhum',
] as const;


export const INFRAESTRUTURA_OPTIONS = [
  'Sistema de câmeras ou monitoramento',
  'Loja virtual ou e-commerce',
  'Tela, TV ou painel para propaganda',
  'Checkout ou confirmação automática de pagamentos',
  'Nenhum destes',
] as const;

export const CHECKOUT_PROVIDER_OPTIONS = [
  'Mercado Pago',
  'PagBank / PagSeguro',
  'Stone',
  'InfinitePay',
  'Stripe',
  'Pagar.me',
  'Asaas',
  'Outro / sistema próprio',
  'Não sei',
] as const;

export const PRODUCT_LABELS = {
  monitoria: 'MonitorIA',
  funcionaria: 'FuncionarIA',
  midia: 'Midia.Pro',
  pixwiki: 'PixWiki',
} as const;

export type ProductOpportunityKey = keyof typeof PRODUCT_LABELS;

export function inferProductOpportunities(input: {
  infraestrutura: string[];
  checkoutProvider?: string | null;
}): { keys: ProductOpportunityKey[]; labels: string[]; reasons: Record<string, string> } {
  const selected = new Set(input.infraestrutura);
  const keys: ProductOpportunityKey[] = [];
  const reasons: Record<string, string> = {};

  if (selected.has('Sistema de câmeras ou monitoramento')) {
    keys.push('monitoria');
    reasons.monitoria = 'Já possui câmeras ou monitoramento: oportunidade de adicionar análise inteligente às imagens existentes.';
  }
  if (selected.has('Loja virtual ou e-commerce')) {
    keys.push('funcionaria');
    reasons.funcionaria = 'Opera uma loja virtual/e-commerce: oportunidade de automatizar atendimento e operação comercial.';
  }
  if (selected.has('Tela, TV ou painel para propaganda')) {
    keys.push('midia');
    reasons.midia = 'Já possui tela de propaganda: oportunidade de gerenciar conteúdo e monetizar espaços com a Midia.Pro.';
  }
  if (selected.has('Checkout ou confirmação automática de pagamentos')) {
    keys.push('pixwiki');
    reasons.pixwiki = input.checkoutProvider
      ? `Usa ${input.checkoutProvider}: oportunidade de comparar custos e automações com a PixWiki.`
      : 'Já usa checkout ou confirmação automática: oportunidade de comparar custos e automações com a PixWiki.';
  }

  return { keys, labels: keys.map((key) => PRODUCT_LABELS[key]), reasons };
}

export const FATURAMENTO_OPTIONS = [
  'Até R$ 10 mil',
  'R$ 10 a 50 mil',
  'R$ 50 a 200 mil',
  'Acima de R$ 200 mil',
  'Prefiro não dizer',
] as const;

export const MELHOR_HORARIO_OPTIONS = [
  'Manhã',
  'Almoço',
  'Tarde',
  'Noite',
  'Qualquer horário comercial',
] as const;

export const STATUS_OPTIONS = ['novo', 'contatado', 'proposta', 'cliente', 'descartado'] as const;
export const PRIORIDADE_OPTIONS = ['alta', 'media', 'baixa'] as const;

export type LeadStatus = (typeof STATUS_OPTIONS)[number];
export type LeadPriority = (typeof PRIORIDADE_OPTIONS)[number];

export type DiagnosticAnswers = {
  sintomas: Partial<Record<Area, SymptomAnswer>>;
  gestao: string[];
};

function symptomWeight(answer: SymptomAnswer | undefined) {
  if (answer === 'sim') return 3;
  if (answer === 'as_vezes') return 2;
  return 0;
}

/**
 * Regra de prioridade comercial do lead.
 *
 * Porte: MEI=0, Micro=1, Pequena=2, Média+=3.
 * Faturamento: até 10k=0, 10–50k=1, 50–200k=2, acima de 200k=3,
 * "prefiro não dizer"=0.
 * Cada sintoma respondido "sim" vale +2. "Às vezes" e "não" não entram
 * na prioridade comercial (mas influenciam a ordem das áreas do diagnóstico).
 *
 * alta  >= 7 pontos
 * média >= 3 pontos
 * baixa  < 3 pontos
 */
export function calculateLeadPriority(input: {
  porte: string;
  faturamentoFaixa: string;
  sintomas: Partial<Record<Area, SymptomAnswer>>;
}): { prioridade: LeadPriority; score: number; sintomasSim: number } {
  const porteScore: Record<string, number> = {
    MEI: 0,
    'Microempresa (até 9 pessoas)': 1,
    'Pequena (10 a 49)': 2,
    'Média ou maior': 3,
  };

  const faturamentoScore: Record<string, number> = {
    'Até R$ 10 mil': 0,
    'R$ 10 a 50 mil': 1,
    'R$ 50 a 200 mil': 2,
    'Acima de R$ 200 mil': 3,
    'Prefiro não dizer': 0,
  };

  const sintomasSim = Object.values(input.sintomas).filter((value) => value === 'sim').length;
  const score =
    (porteScore[input.porte] ?? 0) +
    (faturamentoScore[input.faturamentoFaixa] ?? 0) +
    sintomasSim * 2;

  return {
    score,
    sintomasSim,
    prioridade: score >= 7 ? 'alta' : score >= 3 ? 'media' : 'baixa',
  };
}

/**
 * Retorna sempre até 3 áreas. As escolhidas pelo usuário vêm primeiro, ordenadas
 * pela intensidade do sintoma (sim > às vezes > não). Se ele marcou só 1 ou 2,
 * completamos com oportunidades amplas (Vendas, Automação e Presença digital),
 * sem repetir itens, para que o resultado tenha três frentes úteis.
 */
export function calculatePriorityAreas(input: {
  areas: string[];
  sintomas: Partial<Record<Area, SymptomAnswer>>;
}): Area[] {
  const chosen = input.areas
    .filter((area): area is Area => (AREA_OPTIONS as readonly string[]).includes(area))
    .map((area, index) => ({
      area,
      score: 1 + symptomWeight(input.sintomas[area]),
      index,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.area);

  const fallback: Area[] = ['Vendas', 'Automação', 'Presença digital', 'Novas receitas', 'Custos'];
  const merged = [...chosen];
  for (const area of fallback) {
    if (merged.length >= 3) break;
    if (!merged.includes(area)) merged.push(area);
  }
  return merged.slice(0, 3);
}

export function areaResultText(area: Area, answer?: SymptomAnswer) {
  const prefix =
    answer === 'sim'
      ? 'Prioridade alta neste ponto. '
      : answer === 'as_vezes'
        ? 'Há sinais de oportunidade aqui. '
        : answer === 'nao'
          ? 'Mesmo sem um problema forte hoje, vale acompanhar. '
          : 'Oportunidade complementar identificada. ';
  return `${prefix}${AREA_RESULT_COPY[area]}`;
}
