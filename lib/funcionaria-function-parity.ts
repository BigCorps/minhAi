// lib/funcionaria-function-parity.ts
//
// Ponte fina entre as habilidades da FuncionarIA e os fluxos já validados
// na minhAi. Não executa cobrança, não altera RLS e não recria motores.
// Apenas classifica ações client-facing já existentes em:
// - rota existente;
// - modal legado existente;
// - atendimento humano.

export type FuncionarIAParityAction =
  | {
      key: string;
      kind: 'route';
      href: string;
      label: string;
      text: string;
    }
  | {
      key: string;
      kind: 'modal';
      modalType: string;
      label: string;
      text: string;
    }
  | {
      key: string;
      kind: 'legacy';
      functionKey: string;
      label: string;
      text: string;
    }
  | {
      key: string;
      kind: 'human';
      label: string;
      text: string;
    };

const ROUTE_ACTIONS: Record<string, Omit<Extract<FuncionarIAParityAction, { kind: 'route' }>, 'key'>> = {
  // Vendas/Pedidos: usa a página/checkout existente.
  modo_venda: {
    kind: 'route',
    href: '/vendas',
    label: 'Ver produtos',
    text: 'Posso abrir os produtos e o modo de vendas para você.',
  },
  ver_produtos: {
    kind: 'route',
    href: '/vendas',
    label: 'Ver produtos',
    text: 'Posso abrir os produtos para você.',
  },
  procurar_produto: {
    kind: 'route',
    href: '/vendas',
    label: 'Procurar produto',
    text: 'Posso abrir os produtos para você procurar o que precisa.',
  },
  fazer_pedido: {
    kind: 'route',
    href: '/vendas',
    label: 'Fazer pedido',
    text: 'Posso abrir o modo de vendas para você montar seu pedido.',
  },
  registrar_venda: {
    kind: 'route',
    href: '/vendas',
    label: 'Abrir vendas',
    text: 'Posso abrir o modo de vendas.',
  },
  meu_cupom: {
    kind: 'route',
    href: '/vendas',
    label: 'Abrir compra',
    text: 'Posso abrir sua compra para continuar.',
  },

  // Fila: mantém o fluxo público já existente.
  modo_fila: {
    kind: 'route',
    href: '/fila',
    label: 'Abrir fila',
    text: 'Posso abrir a fila de atendimento.',
  },
  fila_atendimento: {
    kind: 'route',
    href: '/fila',
    label: 'Abrir fila',
    text: 'Posso abrir a fila de atendimento.',
  },
  gerar_senha: {
    kind: 'route',
    href: '/fila',
    label: 'Retirar senha',
    text: 'Posso abrir a fila para você retirar sua senha.',
  },
  painel_fila: {
    kind: 'route',
    href: '/fila',
    label: 'Acompanhar fila',
    text: 'Posso abrir a fila para você acompanhar o atendimento.',
  },

  // Caixa/Cobrança: NÃO recria Point, PIX ou InfinitePay.
  // O cliente entra no mesmo checkout existente em /vendas.
  pix_generate: {
    kind: 'route',
    href: '/vendas',
    label: 'Pagar pedido',
    text: 'Posso abrir o checkout para você continuar o pagamento por Pix.',
  },
  tef_debito: {
    kind: 'route',
    href: '/vendas',
    label: 'Pagar pedido',
    text: 'Posso abrir o checkout para você continuar o pagamento.',
  },
  tef_credito: {
    kind: 'route',
    href: '/vendas',
    label: 'Pagar pedido',
    text: 'Posso abrir o checkout para você continuar o pagamento.',
  },
  nfc_debito: {
    kind: 'route',
    href: '/vendas',
    label: 'Pagar pedido',
    text: 'Posso abrir o checkout para você continuar o pagamento.',
  },
  nfc_credito: {
    kind: 'route',
    href: '/vendas',
    label: 'Pagar pedido',
    text: 'Posso abrir o checkout para você continuar o pagamento.',
  },
  link_pagamento: {
    kind: 'route',
    href: '/vendas',
    label: 'Pagar pedido',
    text: 'Posso abrir o checkout para você continuar o pagamento.',
  },
  impressao_recibo: {
    kind: 'route',
    href: '/vendas',
    label: 'Abrir compra',
    text: 'O comprovante fica disponível no fluxo da compra.',
  },
};

const MODAL_ACTIONS: Record<string, Omit<Extract<FuncionarIAParityAction, { kind: 'modal' }>, 'key'>> = {
  // Pré-atendimento & Cadastro — reaproveita os modais minhAi.
  cadastro: {
    kind: 'modal',
    modalType: 'RegistrationDisplay',
    label: 'Fazer cadastro',
    text: 'Vou abrir o cadastro para você.',
  },
  pre_atendimento: {
    kind: 'modal',
    modalType: 'PreAtendimentoDisplay',
    label: 'Pré-atendimento',
    text: 'Vou abrir o pré-atendimento para você.',
  },

  // Agenda — reaproveita os modais minhAi/Google Agenda.
  ver_agenda: {
    kind: 'modal',
    modalType: 'ViewAgendaModal',
    label: 'Ver agenda',
    text: 'Vou abrir a agenda.',
  },
  horarios_disponiveis: {
    kind: 'modal',
    modalType: 'ViewAgendaModal',
    label: 'Ver horários',
    text: 'Vou abrir os horários disponíveis.',
  },
  agendar_compromisso: {
    kind: 'modal',
    modalType: 'CreateEventModal',
    label: 'Agendar horário',
    text: 'Vou abrir o agendamento.',
  },
  reagendar_compromisso: {
    kind: 'modal',
    modalType: 'RescheduleModal',
    label: 'Reagendar',
    text: 'Vou abrir o reagendamento.',
  },
  cancelar_agendamento: {
    kind: 'modal',
    modalType: 'CancelAppointmentModal',
    label: 'Cancelar agendamento',
    text: 'Vou abrir o cancelamento do agendamento.',
  },
  confirmar_presenca: {
    kind: 'modal',
    modalType: 'ConfirmPresenceModal',
    label: 'Confirmar presença',
    text: 'Vou abrir a confirmação de presença.',
  },
};

const LEGACY_ACTIONS: Record<string, Omit<Extract<FuncionarIAParityAction, { kind: 'legacy' }>, 'key'>> = {
  // Pesquisa precisa descobrir qual pesquisa ativa está vigente antes de abrir
  // o modal. Essa regra já existe na minhAi, então reutilizamos o handler legado.
  responder_pesquisa: {
    kind: 'legacy',
    functionKey: 'responder_pesquisa',
    label: 'Responder pesquisa',
    text: 'Vou abrir a pesquisa de atendimento disponível.',
  },
};

const HUMAN_ACTIONS: Record<string, Omit<Extract<FuncionarIAParityAction, { kind: 'human' }>, 'key'>> = {
  chamar_gerente: {
    kind: 'human',
    label: 'Chamar responsável',
    text: 'Claro. Vou chamar um responsável para ajudar.',
  },
};

export function getFuncionarIAFunctionAction(functionKey?: string | null): FuncionarIAParityAction | null {
  const key = String(functionKey || '').trim();
  if (!key) return null;

  const route = ROUTE_ACTIONS[key];
  if (route) return { key, ...route };

  const modal = MODAL_ACTIONS[key];
  if (modal) return { key, ...modal };

  const legacy = LEGACY_ACTIONS[key];
  if (legacy) return { key, ...legacy };

  const human = HUMAN_ACTIONS[key];
  if (human) return { key, ...human };

  return null;
}

function normalize(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term));
}

function firstActiveAction(activeFunctionKeys: string[], keys: string[]): FuncionarIAParityAction | null {
  for (const key of keys) {
    if (!activeFunctionKeys.includes(key)) continue;
    const action = getFuncionarIAFunctionAction(key);
    if (action) return action;
  }
  return null;
}

/**
 * Reconhece somente intenções client-facing que já possuem fluxo validado
 * na minhAi. Não chama o detector legado inteiro e não registra consumo de
 * créditos: a regra de créditos continua sendo a regra própria da FuncionarIA.
 */
export function detectFuncionarIAFunctionIntent(
  input: string,
  activeFunctionKeys: string[],
): FuncionarIAParityAction | null {
  const text = normalize(input);
  if (!text) return null;

  // Ordem importa: cancelar/reagendar antes de "agenda" genérico.
  if (hasAny(text, ['cancelar agendamento', 'cancelar horario', 'desmarcar', 'cancelar reserva'])) {
    return firstActiveAction(activeFunctionKeys, ['cancelar_agendamento']);
  }

  if (hasAny(text, ['reagendar', 'remarcar', 'mudar horario', 'trocar horario'])) {
    return firstActiveAction(activeFunctionKeys, ['reagendar_compromisso']);
  }

  if (hasAny(text, ['confirmar presenca', 'confirmar minha presenca', 'confirmar horario'])) {
    return firstActiveAction(activeFunctionKeys, ['confirmar_presenca']);
  }

  if (hasAny(text, [
    'agendar', 'marcar horario', 'marcar consulta', 'reservar horario',
    'fazer agendamento', 'fazer uma reserva',
  ])) {
    return firstActiveAction(activeFunctionKeys, ['agendar_compromisso']);
  }

  if (hasAny(text, [
    'ver agenda', 'horarios disponiveis', 'ver horarios', 'tem horario',
    'qual horario', 'agenda',
  ])) {
    return firstActiveAction(activeFunctionKeys, ['horarios_disponiveis', 'ver_agenda']);
  }

  if (hasAny(text, [
    'pre atendimento', 'preencher ficha', 'ficha de atendimento',
    'dados antes do atendimento',
  ])) {
    return firstActiveAction(activeFunctionKeys, ['pre_atendimento']);
  }

  if (hasAny(text, [
    'fazer cadastro', 'quero me cadastrar', 'novo cadastro',
    'me cadastrar', 'cadastrar cliente', 'cadastro',
  ])) {
    return firstActiveAction(activeFunctionKeys, ['cadastro']);
  }

  if (hasAny(text, [
    'responder pesquisa', 'responder a pesquisa', 'pesquisa de satisfacao',
    'avaliar atendimento', 'dar minha opiniao', 'deixar avaliacao',
  ])) {
    return firstActiveAction(activeFunctionKeys, ['responder_pesquisa']);
  }

  // Pagamento sempre continua pelo checkout validado da minhAi.
  if (hasAny(text, [
    'pagar pedido', 'fazer pagamento', 'pagar compra', 'pagar com pix',
    'pagamento pix', 'pagar no pix', 'cartao', 'cartao de credito',
    'cartao de debito', 'maquininha', 'link de pagamento',
  ])) {
    return firstActiveAction(activeFunctionKeys, [
      'pix_generate',
      'tef_debito',
      'tef_credito',
      'nfc_debito',
      'nfc_credito',
      'link_pagamento',
    ]);
  }

  return null;
}

const QUICK_PRIORITY = [
  'cadastro',
  'pre_atendimento',
  'responder_pesquisa',
  'agendar_compromisso',
  'horarios_disponiveis',
  'ver_agenda',
  'modo_venda',
  'ver_produtos',
  'modo_fila',
  'gerar_senha',
  'pix_generate',
  'tef_debito',
  'tef_credito',
  'chamar_gerente',
];

export function getFuncionarIAQuickActions(
  activeFunctionKeys: string[],
  limit = 4,
): FuncionarIAParityAction[] {
  const actions: FuncionarIAParityAction[] = [];
  const seen = new Set<string>();

  for (const key of QUICK_PRIORITY) {
    if (!activeFunctionKeys.includes(key)) continue;
    const action = getFuncionarIAFunctionAction(key);
    if (!action) continue;

    const identity =
      action.kind === 'route'
        ? `route:${action.href}`
        : action.kind === 'modal'
          ? `modal:${action.modalType}`
          : action.kind === 'legacy'
            ? `legacy:${action.functionKey}`
            : 'human';

    if (seen.has(identity)) continue;
    seen.add(identity);
    actions.push(action);
    if (actions.length >= limit) break;
  }

  return actions;
}
