'use client';

import { createClient } from '@/lib/supabase-browser';
import type { ProdutoVenda } from '@/lib/produtos-venda';

export type FuncionarIAStatus =
  | 'aguardando_pagamento'
  | 'em_pagamento'
  | 'aguardando_dinheiro'
  | 'aguardando_troco'
  | 'pago'
  | 'cancelado'
  | 'expirado';

export interface FuncionarIACarrinhoItem { produto: ProdutoVenda; quantidade: number; subtotal: number; }
export interface FuncionarIACheckoutCriado { checkout_id: string; pedido_id: string; codigo: string; total: number; status: FuncionarIAStatus; expira_em: string; qr_url: string; }
export interface FuncionarIACheckoutItem { id: string; produto_id: string; nome: string; preco_unitario: number; quantidade: number; subtotal: number; }
export interface FuncionarIACheckoutDetalhe {
  checkout_id: string; pedido_id: string; codigo: string; status: FuncionarIAStatus; expira_em: string; criado_em: string;
  company_id: string; empresa_nome: string; empresa_slug: string; empresa_logo?: string | null; cliente_nome?: string | null;
  subtotal: number; desconto: number; total: number; metodo_pagamento?: 'pix' | 'nfc' | 'tef' | 'dinheiro' | null;
  receipt_token?: string | null; pix_transaction_id?: string | null; pix_payment_mode?: 'free' | 'mercadopago' | null;
  card_provider?: string | null; card_reference_id?: string | null; card_payment_type?: 'debit' | 'credit' | null; card_installments?: number | null; card_deep_link?: string | null;
  cash_tendered_cents?: number | null; cash_change_cents?: number | null; cash_banknotes?: Record<string, number>; cash_requested_at?: string | null;
  itens: FuncionarIACheckoutItem[];
}

function rpcData<T>(data: T | T[] | null): T {
  if (Array.isArray(data)) { if (!data.length) throw new Error('Resposta vazia do servidor.'); return data[0] as T; }
  if (!data) throw new Error('Resposta vazia do servidor.');
  return data;
}

export function normalizarCodigoFuncionarIA(valor: string): string {
  const bruto = valor.trim();
  if (!bruto) return '';
  try {
    const url = new URL(bruto);
    const viaQuery = url.searchParams.get('codigo');
    if (viaQuery) return viaQuery.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  } catch {}
  return bruto.replace(/^FUNCIONARIA\s*:/i, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export async function criarCheckoutFuncionarIA(input: { companyId: string; itens: FuncionarIACarrinhoItem[]; clienteNome?: string; observacoes?: string; }): Promise<FuncionarIACheckoutCriado> {
  const supabase = createClient();
  const itens = input.itens.map(item => ({ produto_id: item.produto.id, quantidade: item.quantidade }));
  const { data, error } = await supabase.rpc('funcionaria_criar_checkout', {
    p_company_id: input.companyId, p_itens: itens, p_cliente_nome: input.clienteNome?.trim() || null, p_observacoes: input.observacoes?.trim() || null,
  });
  if (error) throw new Error(error.message || 'Não foi possível criar a cobrança.');
  return rpcData(data as any);
}

export async function resolverCheckoutFuncionarIA(codigoOuQr: string, options: { allowPaid?: boolean } = {}): Promise<FuncionarIACheckoutDetalhe> {
  const codigo = normalizarCodigoFuncionarIA(codigoOuQr);
  if (codigo.length !== 8) throw new Error('Digite ou leia um código de 8 caracteres.');
  const supabase = createClient();
  const { data, error } = await supabase.rpc('funcionaria_resolver_checkout', { p_codigo: codigo });
  if (error) throw new Error(error.message || 'Não foi possível localizar a cobrança.');
  const detalhe = rpcData<FuncionarIACheckoutDetalhe>(data as any);
  if (detalhe.status === 'expirado') throw new Error('Este código expirou. Gere uma nova cobrança.');
  if (detalhe.status === 'cancelado') throw new Error('Esta cobrança foi cancelada.');
  if (detalhe.status === 'pago' && !options.allowPaid) throw new Error('Esta cobrança já foi paga.');
  return detalhe;
}

export async function cancelarCheckoutFuncionarIA(codigoOuQr: string): Promise<void> {
  const codigo = normalizarCodigoFuncionarIA(codigoOuQr);
  if (codigo.length !== 8) throw new Error('Código inválido.');
  const supabase = createClient();
  const { error } = await supabase.rpc('funcionaria_cancelar_checkout', { p_codigo: codigo });
  if (error) throw new Error(error.message || 'Não foi possível cancelar a cobrança.');
}

export function formatarBRL(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
