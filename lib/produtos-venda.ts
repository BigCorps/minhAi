// lib/produtos-venda.ts
// Queries Supabase para o Modo Venda

import { createClient } from '@/lib/supabase-browser';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProdutoVenda {
  id: string;
  company_id: string;
  ingrediente_id?: string | null;
  ficha_id?: string | null;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  imagem_url?: string | null;
  ean?: string | null;
  preco_custo: number;
  preco_venda: number;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  controla_estoque: boolean;
  is_active: boolean;
  is_favorito: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  ml_item_id?: string | null;
  ml_category_id?: string | null;
  ml_listing_type?: string | null;
  ml_status?: string | null;
  ml_published_at?: string | null;
  marca?: string | null;
}

export interface ProdutoVendaInput {
  company_id: string;
  ingrediente_id?: string | null;
  ficha_id?: string | null;
  nome: string;
  descricao?: string;
  categoria?: string;
  marca?: string;
  imagem_url?: string;
  ean?: string;
  preco_custo?: number;
  preco_venda: number;
  unidade?: string;
  estoque_atual?: number;
  estoque_minimo?: number;
  controla_estoque?: boolean;
  is_active?: boolean;
  is_favorito?: boolean;       // ← ADICIONADO
  display_order?: number;
}

export interface ItemCarrinho {
  produto: ProdutoVenda;
  quantidade: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  company_id: string;
  session_id?: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  subtotal: number;
  desconto: number;
  total: number;
  cobranca_id?: string | null;
  metodo_pagamento?: string | null;
  status: 'aberto' | 'aguardando_pagamento' | 'pago' | 'cancelado' | 'entregue';
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  paid_at?: string | null;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string;
  nome_snapshot: string;
  preco_unitario: number;
  quantidade: number;
  subtotal: number;
}

export interface CriarPedidoInput {
  company_id: string;
  session_id?: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  itens: ItemCarrinho[];
  metodo_pagamento: 'pix' | 'nfc' | 'tef' | 'dinheiro' | 'fiado';
  observacoes?: string;
  desconto?: number;
}

// ─── Produtos ─────────────────────────────────────────────────────────────────

/** Lista todos os produtos ativos de uma empresa */
export async function listarProdutos(companyId: string): Promise<ProdutoVenda[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('produtos_venda')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('nome', { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Lista categorias únicas de produtos ativos */
export async function listarCategorias(companyId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('produtos_venda')
    .select('categoria')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .not('categoria', 'is', null);

  if (error) throw error;

  const cats = (data || [])
    .map((r) => r.categoria as string)
    .filter(Boolean);

  return [...new Set(cats)].sort();
}

/** Busca produto por ID */
export async function buscarProduto(produtoId: string): Promise<ProdutoVenda | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('produtos_venda')
    .select('*')
    .eq('id', produtoId)
    .single();

  if (error) return null;
  return data;
}

/** Busca produto por nome (fuzzy, para o voice assistant) */
export async function buscarProdutoPorNome(
  companyId: string,
  termo: string,
): Promise<ProdutoVenda[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('produtos_venda')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .ilike('nome', `%${termo}%`)
    .order('display_order', { ascending: true })
    .limit(5);

  if (error) return [];
  return data || [];
}

/** Busca produto por EAN */
export async function buscarProdutoPorEan(
  companyId: string,
  ean: string,
): Promise<ProdutoVenda | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('produtos_venda')
    .select('*')
    .eq('company_id', companyId)
    .eq('ean', ean)
    .single();

  if (error) return null;
  return data;
}

/** Cria produto */
export async function criarProduto(input: ProdutoVendaInput): Promise<ProdutoVenda> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('produtos_venda')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Atualiza produto */
export async function atualizarProduto(
  id: string,
  input: Partial<ProdutoVendaInput>,
): Promise<ProdutoVenda> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('produtos_venda')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Exclui produto */
export async function excluirProduto(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('produtos_venda')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/** Importa ingrediente da linha de produção como produto de venda */
export async function importarDeProducao(
  companyId: string,
  ingredienteId: string,
): Promise<ProdutoVenda> {
  const supabase = createClient();

  const { data: ing, error: ingErr } = await supabase
    .from('producao_ingredientes')
    .select('*')
    .eq('id', ingredienteId)
    .single();

  if (ingErr || !ing) throw new Error('Ingrediente não encontrado');

  return criarProduto({
    company_id: companyId,
    ingrediente_id: ingredienteId,
    nome: ing.nome,
    unidade: ing.unidade,
    preco_custo: ing.preco_por_unidade,
    preco_venda: ing.preco_por_unidade * 2,
    categoria: ing.categoria || undefined,
    estoque_atual: 0,
    controla_estoque: true,
    is_active: false,
  });
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────

/** Cria pedido + itens via servidor, com preço/opcionais recalculados no backend */
const pedidoMutationTokens = new Map<string, string>();

export async function criarPedido(input: CriarPedidoInput): Promise<Pedido> {
  const response = await fetch('/api/orders/public-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      company_id: input.company_id,
      session_id: input.session_id,
      cliente_nome: input.cliente_nome,
      cliente_telefone: input.cliente_telefone,
      metodo_pagamento: input.metodo_pagamento,
      observacoes: input.observacoes,
      itens: input.itens.map((i) => ({
        produto_id: i.produto.id,
        quantidade: i.quantidade,
        opcoes_selecionadas: (i.produto as any)._opcoes_selecionadas ?? [],
      })),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.order?.id || !data?.mutation_token) {
    throw new Error(data?.error || 'order_create_failed');
  }

  pedidoMutationTokens.set(String(data.order.id), String(data.mutation_token));
  return data.order as Pedido;
}

export async function atualizarPedidoCheckout(
  pedidoId: string,
  update: {
    company_id: string;
    delivery_requested: boolean;
    delivery_address?: string | null;
    delivery_fee_cents?: number | null;
    delivery_fee_original_cents?: number | null;
  },
): Promise<void> {
  const mutationToken = pedidoMutationTokens.get(pedidoId);
  if (!mutationToken) throw new Error('order_mutation_token_missing');

  const response = await fetch('/api/orders/public-mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      action: 'delivery',
      pedido_id: pedidoId,
      company_id: update.company_id,
      mutation_token: mutationToken,
      ...update,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'order_update_failed');
}

/** Atualiza status do pedido somente pela rota server-side ligada ao pedido recém-criado */
export async function atualizarStatusPedido(
  pedidoId: string,
  status: Pedido['status'],
  cobrancaId?: string,
  companyId?: string,
): Promise<void> {
  const mutationToken = pedidoMutationTokens.get(pedidoId);
  if (!mutationToken) throw new Error('order_mutation_token_missing');
  if (!companyId) throw new Error('order_company_id_required');

  const response = await fetch('/api/orders/public-mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      action: 'status',
      pedido_id: pedidoId,
      company_id: companyId,
      mutation_token: mutationToken,
      status,
      cobranca_id: cobrancaId || null,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'order_status_update_failed');
}

// ─── Estoque ──────────────────────────────────────────────────────────────────

/**
 * Consulta estoque atual de um produto por nome.
 * Tenta busca fuzzy completa, depois fallback com primeira palavra relevante.
 */
export async function consultarEstoque(
  companyId: string,
  nomeProduto: string,
): Promise<{ produto: ProdutoVenda | null; abaixoMinimo: boolean }> {
  const resultados = await buscarProdutoPorNome(companyId, nomeProduto);

  if (resultados.length > 0) {
    const p = resultados[0];
    return {
      produto: p,
      abaixoMinimo: p.controla_estoque && p.estoque_atual <= p.estoque_minimo,
    };
  }

  // Fallback: primeira palavra com 3+ caracteres
  const primeiraPalavra = nomeProduto
    .split(' ')
    .find((w) => w.length >= 3);

  if (primeiraPalavra && primeiraPalavra !== nomeProduto) {
    const fallback = await buscarProdutoPorNome(companyId, primeiraPalavra);
    if (fallback.length > 0) {
      const p = fallback[0];
      return {
        produto: p,
        abaixoMinimo: p.controla_estoque && p.estoque_atual <= p.estoque_minimo,
      };
    }
  }

  return { produto: null, abaixoMinimo: false };
}

/**
 * Baixa estoque de um pedido após confirmação de pagamento.
 * Chama a função SQL baixar_estoque_pedido via RPC.
 */
export async function baixarEstoquePedido(pedidoId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('baixar_estoque_pedido', {
    p_pedido_id: pedidoId,
  });
  if (error) throw error;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formata preço em BRL */
export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Calcula markup percentual entre custo e venda */
export function calcularMarkup(precoCusto: number, precoVenda: number): number {
  if (!precoCusto || precoCusto <= 0) return 0;
  return ((precoVenda / precoCusto) - 1) * 100;
}
