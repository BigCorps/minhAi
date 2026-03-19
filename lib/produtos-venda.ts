// lib/produtos-venda.ts
// Queries Supabase para o Modo Venda
// Usa createClient de @/lib/supabase-browser (padrão do projeto)

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
  display_order: number;
  created_at: string;
  updated_at: string;
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

/** Cria produto (admin) */
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

/** Atualiza produto (admin) */
export async function atualizarProduto(
  id: string,
  input: Partial<ProdutoVendaInput>,
): Promise<ProdutoVenda> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('produtos_venda')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Importa ingrediente da linha de produção como produto de venda */
export async function importarDeProducao(
  companyId: string,
  ingredienteId: string,
): Promise<ProdutoVenda> {
  const supabase = createClient();

  // Busca o ingrediente
  const { data: ing, error: ingErr } = await supabase
    .from('producao_ingredientes')
    .select('*')
    .eq('id', ingredienteId)
    .single();

  if (ingErr || !ing) throw new Error('Ingrediente não encontrado');

  // Cria produto de venda vinculado
  return criarProduto({
    company_id: companyId,
    ingrediente_id: ingredienteId,
    nome: ing.nome,
    unidade: ing.unidade,
    preco_custo: ing.preco_por_unidade,
    preco_venda: ing.preco_por_unidade * 2, // sugestão inicial de markup 2x
    categoria: ing.categoria || undefined,
    estoque_atual: 0,
    controla_estoque: true,
  });
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────

/** Cria pedido + itens em transação (insert sequencial) */
export async function criarPedido(input: CriarPedidoInput): Promise<Pedido> {
  const supabase = createClient();

  const subtotal = input.itens.reduce((acc, i) => acc + i.subtotal, 0);
  const desconto = input.desconto || 0;
  const total = Math.max(0, subtotal - desconto);

  // 1. Inserir cabeçalho do pedido
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

  // 2. Inserir itens
  const itensInsert = input.itens.map((i) => ({
    pedido_id: pedido.id,
    produto_id: i.produto.id,
    nome_snapshot: i.produto.nome,
    preco_unitario: i.produto.preco_venda,
    quantidade: i.quantidade,
    subtotal: i.subtotal,
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
  const update: Record<string, unknown> = { status };
  if (cobrancaId) update.cobranca_id = cobrancaId;
  if (status === 'pago') update.paid_at = new Date().toISOString();
  if (status === 'cancelado') update.cancelled_at = new Date().toISOString();

  const { error } = await supabase
    .from('pedidos')
    .update(update)
    .eq('id', pedidoId);

  if (error) throw error;
}

/** Consulta estoque atual de um produto */
export async function consultarEstoque(
  companyId: string,
  nomeProduto: string,
): Promise<{ produto: ProdutoVenda | null; abaixoMinimo: boolean }> {
  const produtos = await buscarProdutoPorNome(companyId, nomeProduto);
  if (!produtos.length) return { produto: null, abaixoMinimo: false };
  const p = produtos[0];
  return {
    produto: p,
    abaixoMinimo: p.controla_estoque && p.estoque_atual <= p.estoque_minimo,
  };
}

/** Formata preço em BRL */
export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
