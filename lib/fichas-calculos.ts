export type Source = 'user_input' | 'ai_estimate' | 'ai_default' | 'system_calculated';
export type Confianca = 'alta' | 'media' | 'baixa';
export type Unidade = 'kg' | 'g' | 'l' | 'ml' | 'un';

export interface ItemCalculo {
  quantidade: number;
  unidade: Unidade;
  preco_por_unidade: number;
  perda_percentual: number;
  source: Source;
}

export interface ResultadoItem {
  custo_ingrediente: number;
  quantidade_real: number;
  source: Source;
}

export interface ResultadoFicha {
  custo_total: number;
  custo_por_unidade: number;
  peso_total_kg: number;
  margem_bruta: number;
  preco_sugerido: number;
  tem_estimativas: boolean;
}

// ------------------------------------------------------------
// Fator de normalização por unidade
// Tudo é convertido para a unidade-base (kg ou l)
// ------------------------------------------------------------
function fatorNormalizacao(unidade: Unidade): number {
  switch (unidade) {
    case 'g':
    case 'ml':
      return 0.001;
    case 'kg':
    case 'l':
    case 'un':
    default:
      return 1;
  }
}

// ------------------------------------------------------------
// Custo de um ingrediente com perda
// ------------------------------------------------------------
export function calcularCustoIngrediente(item: ItemCalculo): ResultadoItem {
  const fator = fatorNormalizacao(item.unidade);
  const qtd_normalizada = item.quantidade * fator;

  // Evita divisão por zero se perda for 100%
  const perda = Math.min(item.perda_percentual, 99.99);
  const qtd_real = qtd_normalizada / (1 - perda / 100);

  return {
    custo_ingrediente: qtd_real * item.preco_por_unidade,
    quantidade_real: qtd_real,
    source: 'system_calculated',
  };
}

// ------------------------------------------------------------
// Custo total da ficha
// ------------------------------------------------------------
export function calcularCustoFicha(itens: ItemCalculo[]): number {
  return itens.reduce((acc, item) => {
    return acc + calcularCustoIngrediente(item).custo_ingrediente;
  }, 0);
}

// ------------------------------------------------------------
// Peso total em kg (apenas ingredientes sólidos/líquidos)
// ------------------------------------------------------------
export function calcularPesoTotal(itens: ItemCalculo[]): number {
  return itens
    .filter(i => ['kg', 'g'].includes(i.unidade))
    .reduce((acc, i) => acc + i.quantidade * fatorNormalizacao(i.unidade as Unidade), 0);
}

// ------------------------------------------------------------
// Margem bruta percentual
// ------------------------------------------------------------
export function calcularMargem(custo: number, preco_venda: number): number {
  if (!preco_venda || preco_venda <= 0) return 0;
  return ((preco_venda - custo) / preco_venda) * 100;
}

// ------------------------------------------------------------
// Preço sugerido com markup (padrão alimentício: 3x)
// ------------------------------------------------------------
export function sugerirPrecoVenda(custo: number, markup = 3): number {
  return custo * markup;
}

// ------------------------------------------------------------
// Custo por unidade rendida
// ------------------------------------------------------------
export function calcularCustoPorUnidade(custo_total: number, rendimento_qtd: number): number {
  if (!rendimento_qtd || rendimento_qtd <= 0) return custo_total;
  return custo_total / rendimento_qtd;
}

// ------------------------------------------------------------
// Verifica se item pode ser recalculado pela IA
// NUNCA recalcular source = user_input
// ------------------------------------------------------------
export function podeRecalcular(source: Source): boolean {
  return source !== 'user_input';
}

// ------------------------------------------------------------
// Verifica se a ficha contém alguma estimativa de IA
// ------------------------------------------------------------
export function fichaTemEstimativas(itens: Array<{ source: Source }>): boolean {
  return itens.some(i => i.source === 'ai_estimate' || i.source === 'ai_default');
}

// ------------------------------------------------------------
// Resultado completo da ficha (helper combinado)
// ------------------------------------------------------------
export function calcularResultadoFicha(
  itens: ItemCalculo[],
  rendimento_qtd: number,
  preco_venda?: number
): ResultadoFicha {
  const custo_total = calcularCustoFicha(itens);
  const custo_por_unidade = calcularCustoPorUnidade(custo_total, rendimento_qtd);
  const peso_total_kg = calcularPesoTotal(itens);
  const margem_bruta = calcularMargem(custo_total, preco_venda ?? 0);
  const preco_sugerido = sugerirPrecoVenda(custo_total);
  const tem_estimativas = fichaTemEstimativas(itens);

  return {
    custo_total,
    custo_por_unidade,
    peso_total_kg,
    margem_bruta,
    preco_sugerido,
    tem_estimativas,
  };
}