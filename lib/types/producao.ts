// =========================================================
// TYPES - Sistema de Produção com Tags
// Arquivo: lib/types/producao.ts
// =========================================================

export type OrigemTag = 
  | 'origem:comprado' 
  | 'origem:produzido' 
  | 'origem:beneficiado' 
  | 'origem:montado';

export type FuncaoTag = 
  | 'função:insumo' 
  | 'função:preparo' 
  | 'função:produto' 
  | 'função:combo';

export type VendavelTag = 
  | 'vendável:sim' 
  | 'vendável:não';

export type ProducaoTag = OrigemTag | FuncaoTag | VendavelTag;

export interface ProducaoItemBase {
  id: string;
  company_id: string;
  nome: string;
  tags: ProducaoTag[];
  created_at: string;
  updated_at: string;
}

export interface ProducaoFicha extends ProducaoItemBase {
  custo_total: number;
  preco_venda?: number;
  preco_venda_sugerido: number;
  margem_lucro?: number;
  is_ficha_preparo: boolean;
  rendimento_qtd: number;
  rendimento_unid: string;
  categoria?: string;
  markup_base: number;
}

export interface ProducaoIngrediente extends ProducaoItemBase {
  preco_por_unidade: number;
  unidade: string;
  tipo: 'direto' | 'beneficiado' | 'produzido';
  ficha_origem_id?: string;
}

export interface ItemComposicao {
  item_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  perda_percentual: number;
}

// =========================================================
// HELPERS - Utilitários para trabalhar com tags
// =========================================================

export function hasTag(item: { tags: ProducaoTag[] }, tag: ProducaoTag): boolean {
  return item.tags.includes(tag);
}

export function getTagValue(item: { tags: ProducaoTag[] }, prefix: string): string | null {
  const tag = item.tags.find(t => t.startsWith(prefix));
  return tag ? tag.split(':')[1] : null;
}

export function isVendavel(item: { tags: ProducaoTag[] }): boolean {
  return hasTag(item, 'vendável:sim');
}

export function isPreparo(item: { tags: ProducaoTag[] }): boolean {
  return hasTag(item, 'função:preparo');
}

export function isCombo(item: { tags: ProducaoTag[] }): boolean {
  return hasTag(item, 'função:combo');
}

export function getOrigem(item: { tags: ProducaoTag[] }): string | null {
  return getTagValue(item, 'origem');
}

export function getFuncao(item: { tags: ProducaoTag[] }): string | null {
  return getTagValue(item, 'função');
}

// =========================================================
// TAG COLORS - Cores para badges de tags
// =========================================================

export function getTagColor(tag: ProducaoTag, isDark: boolean = true): string {
  const [prefix, value] = tag.split(':');
  
  if (prefix === 'origem') {
    const colors = {
      comprado: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      produzido: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)',
      beneficiado: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
      montado: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
    };
    return colors[value as keyof typeof colors] || colors.comprado;
  }
  
  if (prefix === 'função') {
    const colors = {
      insumo: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
      preparo: isDark ? 'rgba(251, 146, 60, 0.2)' : 'rgba(251, 146, 60, 0.1)',
      produto: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
      combo: isDark ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.1)',
    };
    return colors[value as keyof typeof colors] || colors.produto;
  }
  
  if (prefix === 'vendável') {
    return value === 'sim' 
      ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)')
      : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)');
  }
  
  return isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)';
}

export function getTagTextColor(tag: ProducaoTag, isDark: boolean = true): string {
  const [prefix, value] = tag.split(':');
  
  if (prefix === 'origem') {
    const colors = {
      comprado: '#3b82f6',
      produzido: '#a855f7',
      beneficiado: '#f59e0b',
      montado: '#22c55e',
    };
    return colors[value as keyof typeof colors] || colors.comprado;
  }
  
  if (prefix === 'função') {
    const colors = {
      insumo: '#64748b',
      preparo: '#fb923c',
      produto: '#22c55e',
      combo: '#ec4899',
    };
    return colors[value as keyof typeof colors] || colors.produto;
  }
  
  if (prefix === 'vendável') {
    return value === 'sim' ? '#22c55e' : '#ef4444';
  }
  
  return '#64748b';
}

// =========================================================
// TAG LABELS - Labels amigáveis em português
// =========================================================

export function getTagLabel(tag: ProducaoTag): string {
  const labels: Record<ProducaoTag, string> = {
    'origem:comprado': 'Comprado',
    'origem:produzido': 'Produzido',
    'origem:beneficiado': 'Beneficiado',
    'origem:montado': 'Montado',
    'função:insumo': 'Insumo',
    'função:preparo': 'Preparo',
    'função:produto': 'Produto',
    'função:combo': 'Combo',
    'vendável:sim': 'Vendável',
    'vendável:não': 'Não Vendável',
  };
  
  return labels[tag] || tag;
}

// =========================================================
// VALIDATION - Validar combinações de tags
// =========================================================

export function validateTags(tags: ProducaoTag[]): { valid: boolean; error?: string } {
  // Deve ter pelo menos uma tag de função
  const hasFuncao = tags.some(t => t.startsWith('função:'));
  if (!hasFuncao) {
    return { valid: false, error: 'Deve ter pelo menos uma função' };
  }
  
  // Deve ter exatamente uma tag de cada grupo
  const grupos = ['origem', 'função', 'vendável'];
  for (const grupo of grupos) {
    const count = tags.filter(t => t.startsWith(`${grupo}:`)).length;
    if (count > 1) {
      return { valid: false, error: `Apenas uma tag de ${grupo} permitida` };
    }
  }
  
  // Combos e preparos não podem ser vendáveis
  if (tags.includes('função:combo') && tags.includes('vendável:sim')) {
    // Na verdade combos PODEM ser vendáveis, remover validação
  }
  
  if (tags.includes('função:preparo') && tags.includes('vendável:sim')) {
    return { valid: false, error: 'Preparos não podem ser vendáveis' };
  }
  
  return { valid: true };
}
