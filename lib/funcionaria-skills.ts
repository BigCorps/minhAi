export type FuncionarIAWorkplaceMode = 'presencial' | 'online' | 'ambos';
export type FuncionarIAWhatsAppMode = 'redirect' | 'native' | 'hybrid';
export type FuncionarIAEquipmentMode = 'own' | 'rental';
export type FuncionarIASkillStatus = 'selected' | 'active' | 'cancel_pending' | 'canceled';

export interface FuncionarIASkill {
  skill_key: string;
  name: string;
  description: string;
  category: string;
  monthly_price_cents: number;
  is_free: boolean;
  display_order: number;
  internal_function_keys: string[];
  dashboard_modules: string[];
  applicable_workplaces: string[];
  business_tags: string[];
  is_active: boolean;
  company_status?: FuncionarIASkillStatus | null;
}

export interface FuncionarIASettings {
  company_id: string;
  workplace_mode: FuncionarIAWorkplaceMode;
  business_type: string | null;
  primary_color: string;
  secondary_color: string;
  shirt_color: string;
  shirt_detail_color: string;
  uniform_logo_url: string | null;
  background_preset: string;

  /** Balcao na frente da atendente. Ver COUNTERS em lib/funcionaria-avatar. */
  counter: string | null;

  /** Personalidade de voz. Ver FUNCIONARIA_VOICES em lib/funcionaria-voices. */
  voice_id: string | null;

  /** Onde o logo aparece. Ver LOGO_PLACEMENTS em lib/funcionaria-avatar. */
  logo_placement: string | null;
  background_url: string | null;
  avatar_option_id?: 'option-1' | 'option-2' | 'option-3' | string | null;
  ai_enabled: boolean;
  voice_input_enabled: boolean;
  equipment_mode: FuncionarIAEquipmentMode;
  terminal_rental_requested: boolean;
  whatsapp_mode: FuncionarIAWhatsAppMode;
  onboarding_step: number;
  onboarding_completed: boolean;
}

export interface FuncionarIAQuote {
  skill_count: number;
  subtotal_cents: number;
  discount_percent: number;
  discount_cents: number;
  total_cents: number;
  items: Array<{ skill_key: string; name: string; monthly_price_cents: number }>;
}

export interface FuncionarIAState {
  company: { id: string; name: string; slug: string; logo_url?: string | null } | null;
  settings: FuncionarIASettings | null;
  skills: FuncionarIASkill[];
  active_skill_keys: string[];
  selected_skill_keys: string[];
  active_modules: string[];
  quote: FuncionarIAQuote;
}

export const FUNCIONARIA_MODULES: Record<string, {
  label: string;
  description: string;
}> = {
  atendimentos: {
    label: 'Atendimentos',
    description: 'Recepção, respostas rápidas e histórico da sua FuncionarIA.',
  },
  fila: {
    label: 'Fila',
    description: 'Senhas, pré-atendimento e acompanhamento da fila presencial.',
  },
  agenda: {
    label: 'Agenda',
    description: 'Horários, agendamentos, confirmações e reagendamentos.',
  },
  produtos: {
    label: 'Produtos',
    description: 'Catálogo, estoque e apresentação dos produtos da empresa.',
  },
  pedidos: {
    label: 'Pedidos',
    description: 'Pedidos recebidos e acompanhamento do fluxo de venda.',
  },
  caixa: {
    label: 'Caixa',
    description: 'Checkout, códigos de venda e formas de pagamento.',
  },
  recebimentos: {
    label: 'Recebimentos',
    description: 'Pagamentos confirmados, pendentes e comprovantes.',
  },
  canais: {
    label: 'Canais',
    description: 'Site, Instagram, Facebook e configurações multicanal.',
  },
  whatsapp: {
    label: 'WhatsApp',
    description: 'Modo de atendimento, redirecionamento e consumo do canal.',
  },
  mercado_livre: {
    label: 'Mercado Livre',
    description: 'Produtos e perguntas dos compradores do Mercado Livre.',
  },
  fiscal: {
    label: 'Notas Fiscais',
    description: 'NFC-e, NF-e, NFS-e e histórico fiscal contratado.',
  },
};

export function formatBrlCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((Number(cents) || 0) / 100);
}

export function localDiscountPercent(skillCount: number): number {
  if (skillCount >= 6) return 15;
  if (skillCount >= 4) return 10;
  if (skillCount >= 2) return 5;
  return 0;
}

export function calculateLocalQuote(skills: FuncionarIASkill[], selectedKeys: string[]): FuncionarIAQuote {
  const selected = skills
    .filter(skill => selectedKeys.includes(skill.skill_key) && !skill.is_free && skill.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  const subtotal = selected.reduce((sum, skill) => sum + Number(skill.monthly_price_cents || 0), 0);
  const discountPercent = localDiscountPercent(selected.length);
  const discountCents = Math.round(subtotal * discountPercent / 100);
  return {
    skill_count: selected.length,
    subtotal_cents: subtotal,
    discount_percent: discountPercent,
    discount_cents: discountCents,
    total_cents: subtotal - discountCents,
    items: selected.map(skill => ({
      skill_key: skill.skill_key,
      name: skill.name,
      monthly_price_cents: Number(skill.monthly_price_cents || 0),
    })),
  };
}

export function slugifyCompanyName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54);
}
