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
}

export interface ProdutoVendaInput {
  company_id: string;
  ingrediente_id?: string | null;
  ficha_id?: string | null;
  nome: string;
  descricao?: string;
  categoria?: string;
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

/** Cria pedido + itens */
export async function criarPedido(input: CriarPedidoInput): Promise<Pedido> {
  const supabase = createClient();

  const subtotal = input.itens.reduce((acc, i) => acc + i.subtotal, 0);
  const desconto = input.desconto || 0;
  const total = Math.max(0, subtotal - desconto);

  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .insert({
      company_id: input.company_id,
      session_id: input.session_id,
      cliente_nome: input.cliente_nome,
      cliente_telefone: input.cliente_telefone,
      subtotal,
      desconto,
      total,
      metodo_pagamento: input.metodo_pagamento,
      status: 'aberto',
      observacoes: input.observacoes,
    })
    .select()
    .single();

  if (pedidoErr) throw pedidoErr;

const itensInsert = input.itens.map((i) => ({
  pedido_id:             pedido.id,
  produto_id:            i.produto.id,
  nome_snapshot:         i.produto.nome,
  preco_unitario:        i.produto.preco_venda, // já inclui adicionais
  quantidade:            i.quantidade,
  subtotal:              i.subtotal,
  opcoes_selecionadas:   (i.produto as any)._opcoes_selecionadas ?? [],
}));

  const { error: itensErr } = await supabase
    .from('pedido_itens')
    .insert(itensInsert);

  if (itensErr) throw itensErr;

  return pedido;
}

/** Atualiza status do pedido */
export async function atualizarStatusPedido(
  pedidoId: string,
  status: Pedido['status'],
  cobrancaId?: string,
): Promise<void> {
  const supabase = createClient();
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (cobrancaId) update.cobranca_id = cobrancaId;
  if (status === 'pago') update.paid_at = new Date().toISOString();
  if (status === 'cancelado') update.cancelled_at = new Date().toISOString();

  const { error } = await supabase
    .from('pedidos')
    .update(update)
    .eq('id', pedidoId);

  if (error) throw error;
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
