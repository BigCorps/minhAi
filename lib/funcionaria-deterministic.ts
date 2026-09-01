export type FuncionarIACompanyPublicInfo = {
  id: string;
  name: string;
  slug: string;
  business_hours?: string | null;
  business_address?: string | null;
  website?: string | null;
  whatsapp_number?: string | null;
  instagram_username?: string | null;
  facebook?: string | null;
};

export type FuncionarIADeterministicResult =
  | { kind: 'answer'; text: string; source: 'company' }
  | { kind: 'human'; text: string }
  | { kind: 'navigate'; text: string; href: string; label: string; source: 'skill' }
  | { kind: 'none' };

function normalize(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term));
}

export function resolveFuncionarIADeterministic(
  input: string,
  company: FuncionarIACompanyPublicInfo,
  activeSkillKeys: string[],
): FuncionarIADeterministicResult {
  const text = normalize(input);
  if (!text) return { kind: 'none' };

  if (containsAny(text, [
    'chamar gerente', 'chamar responsavel', 'falar com gerente', 'falar com responsavel',
    'quero uma pessoa', 'atendimento humano', 'falar com atendente',
  ])) {
    return {
      kind: 'human',
      text: 'Claro. Vou abrir a chamada para um responsável da empresa.',
    };
  }

  if (company.business_hours && containsAny(text, [
    'horario', 'horarios', 'que horas abre', 'que horas fecha', 'quando abre', 'quando fecha',
    'funcionamento', 'esta aberto', 'estao abertos',
  ])) {
    return { kind: 'answer', text: `O horário informado pela ${company.name} é: ${company.business_hours}.`, source: 'company' };
  }

  if (company.business_address && containsAny(text, [
    'endereco', 'onde fica', 'localizacao', 'localização', 'como chegar', 'onde voces ficam', 'onde vocês ficam',
  ])) {
    return { kind: 'answer', text: `A ${company.name} fica em ${company.business_address}.`, source: 'company' };
  }

  if (company.website && containsAny(text, ['site', 'website', 'pagina da empresa', 'página da empresa'])) {
    return { kind: 'answer', text: `O site informado pela ${company.name} é ${company.website}.`, source: 'company' };
  }

  if (company.whatsapp_number && containsAny(text, ['whatsapp', 'whats', 'zap', 'numero de contato', 'número de contato'])) {
    return { kind: 'answer', text: `O WhatsApp informado pela ${company.name} é ${company.whatsapp_number}.`, source: 'company' };
  }

  if (company.instagram_username && containsAny(text, ['instagram', 'insta'])) {
    const handle = company.instagram_username.startsWith('@') ? company.instagram_username : `@${company.instagram_username}`;
    return { kind: 'answer', text: `O Instagram informado pela ${company.name} é ${handle}.`, source: 'company' };
  }

  if (activeSkillKeys.includes('sales_orders') && containsAny(text, [
    'quero comprar', 'comprar', 'fazer pedido', 'ver produtos', 'catalogo', 'catálogo', 'cardapio', 'cardápio',
  ])) {
    return {
      kind: 'navigate',
      text: 'Posso abrir o catálogo e o modo de vendas para você.',
      href: '/vendas',
      label: 'Abrir produtos',
      source: 'skill',
    };
  }

  if (activeSkillKeys.includes('queue_service') && containsAny(text, [
    'pegar senha', 'retirar senha', 'gerar senha', 'entrar na fila', 'fila de atendimento', 'quero uma senha',
  ])) {
    return {
      kind: 'navigate',
      text: 'Posso abrir a fila de atendimento para você retirar sua senha.',
      href: '/fila',
      label: 'Abrir fila',
      source: 'skill',
    };
  }

  return { kind: 'none' };
}

export function functionKeyRoute(functionKey?: string | null): { href: string; label: string } | null {
  if (!functionKey) return null;
  if (['modo_venda', 'ver_produtos', 'procurar_produto', 'fazer_pedido', 'registrar_venda', 'meu_cupom'].includes(functionKey)) {
    return { href: '/vendas', label: 'Abrir produtos' };
  }
  if (['modo_fila', 'fila_atendimento', 'gerar_senha', 'painel_fila'].includes(functionKey)) {
    return { href: '/fila', label: 'Abrir fila' };
  }
  return null;
}
