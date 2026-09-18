'use client';

import { collectOrderClientAuth } from '@/lib/orders-client';

export type DeliveryQuote = {
  success: true;
  quote_token: string;
  quotation_id: string;
  price_cents: number;
  price_original_cents: number;
  price_brl: string;
  eta_minutes: number | null;
  distance_km: number | null;
  expires_at: string | null;
  customer_pays: boolean;
};

async function requestDelivery<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const { accessToken, profileTokens } = await collectOrderClientAuth();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    cache: 'no-store',
    body: JSON.stringify({ ...payload, profile_tokens: profileTokens }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'delivery_request_failed');
  return data as T;
}

export async function requestDeliveryQuote(input: {
  companyId: string;
  deliveryAddress: string;
  items?: Array<{ produto_id: string; quantidade: number }>;
  orderTotalCents?: number;
}): Promise<DeliveryQuote> {
  return requestDelivery<DeliveryQuote>('/api/delivery/quote', {
    company_id: input.companyId,
    delivery_address: input.deliveryAddress,
    ...(input.items?.length ? { items: input.items } : {}),
    ...(Number.isFinite(input.orderTotalCents) ? { order_total_cents: input.orderTotalCents } : {}),
  });
}

export async function requestDeliveryDispatch(input: {
  companyId: string;
  pedidoId: string;
  manual?: boolean;
}) {
  return requestDelivery<any>('/api/delivery/dispatch', {
    company_id: input.companyId,
    pedido_id: input.pedidoId,
    manual: input.manual === true,
  });
}

export async function getDeliverySettings(companyId: string) {
  return requestDelivery<any>('/api/delivery/settings', {
    action: 'get',
    company_id: companyId,
  });
}

export async function saveDeliverySettings(companyId: string, settings: Record<string, unknown>) {
  return requestDelivery<any>('/api/delivery/settings', {
    action: 'save',
    company_id: companyId,
    settings,
  });
}
