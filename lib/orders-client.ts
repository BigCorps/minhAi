'use client';

import { createClient } from '@/lib/supabase-browser';

export async function collectOrderClientAuth() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const profileTokens: string[] = [];

  if (typeof window !== 'undefined') {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith('profile_session_')) continue;
      const value = window.localStorage.getItem(key);
      if (value && !profileTokens.includes(value)) profileTokens.push(value);
      if (profileTokens.length >= 12) break;
    }
  }

  return {
    accessToken: session?.access_token || null,
    profileTokens,
  };
}

export async function registrarVendaManual(input: {
  companyId: string;
  profileId?: string | null;
  valor: number;
  metodoPagamento: 'pix' | 'nfc' | 'tef' | 'dinheiro' | 'fiado';
  descricao?: string | null;
}) {
  const auth = await collectOrderClientAuth();
  const response = await fetch('/api/orders/manual-sale', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
    },
    cache: 'no-store',
    body: JSON.stringify({
      company_id: input.companyId,
      profile_id: input.profileId || null,
      profile_tokens: auth.profileTokens,
      valor: input.valor,
      metodo_pagamento: input.metodoPagamento,
      descricao: input.descricao || null,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.pedido_id) throw new Error(data?.error || 'manual_sale_failed');
  return String(data.pedido_id);
}

export async function criarPedidoPagamentoPorValor(input: {
  companyId: string;
  valor: number;
  functionKey: string;
}) {
  const response = await fetch('/api/orders/value-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      company_id: input.companyId,
      valor: input.valor,
      function_key: input.functionKey,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.pedido_id) return null;
  return String(data.pedido_id);
}

export async function vincularPerfilAposPix(input: {
  pedidoId: string;
  transactionId: string;
  profileToken?: string | null;
}) {
  const response = await fetch('/api/orders/post-pix-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      pedido_id: input.pedidoId,
      transaction_id: input.transactionId,
      profile_token: input.profileToken || null,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'post_pix_profile_failed');
  return data as {
    linked?: boolean;
    profile_id?: string | null;
    cliente_nome?: string | null;
  };
}


async function requestOrderRead<T>(payload: Record<string, unknown>): Promise<T> {
  const { accessToken, profileTokens } = await collectOrderClientAuth();
  const response = await fetch('/api/orders/read', {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}) },
    body: JSON.stringify({ ...payload, profile_tokens: profileTokens }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'order_read_failed');
  return data as T;
}

export async function listCustomerOrdersManaged(companyId: string): Promise<any[]> {
  const data = await requestOrderRead<{ orders: any[] }>({ mode: 'customer', company_id: companyId });
  return data.orders || [];
}

export async function listCompanyClientsManaged(companyId: string): Promise<any[]> {
  const data = await requestOrderRead<{ clients: any[] }>({ mode: 'clients', company_id: companyId });
  return data.clients || [];
}
