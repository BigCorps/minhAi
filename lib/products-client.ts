'use client';

import { collectOrderClientAuth } from '@/lib/orders-client';

async function requestProductMutation<T>(payload: Record<string, unknown>): Promise<T> {
  const { accessToken, profileTokens } = await collectOrderClientAuth();
  const response = await fetch('/api/products/manage', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ ...payload, profile_tokens: profileTokens }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'product_mutation_failed');
  return data as T;
}

export async function createProductManaged<T = Record<string, unknown>>(
  companyId: string,
  product: Record<string, unknown>,
): Promise<T> {
  const data = await requestProductMutation<{ product: T }>({
    action: 'create',
    company_id: companyId,
    product,
  });
  return data.product;
}

export async function updateProductManaged<T = Record<string, unknown>>(
  productId: string,
  companyId: string | null | undefined,
  patch: Record<string, unknown>,
): Promise<T> {
  const data = await requestProductMutation<{ product: T }>({
    action: 'update',
    product_id: productId,
    ...(companyId ? { company_id: companyId } : {}),
    patch,
  });
  return data.product;
}

export async function deleteProductManaged(
  productId: string,
  companyId?: string | null,
): Promise<void> {
  await requestProductMutation({
    action: 'delete',
    product_id: productId,
    ...(companyId ? { company_id: companyId } : {}),
  });
}

export async function bulkCreateProductsManaged<T = Record<string, unknown>>(
  companyId: string,
  products: Record<string, unknown>[],
): Promise<T[]> {
  const all: T[] = [];
  const CHUNK = 50;
  for (let i = 0; i < products.length; i += CHUNK) {
    const chunk = products.slice(i, i + CHUNK);
    const data = await requestProductMutation<{ products: T[] }>({
      action: 'bulk_create',
      company_id: companyId,
      products: chunk,
    });
    all.push(...(data.products ?? []));
  }
  return all;
}
