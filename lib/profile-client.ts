'use client';
import { collectOrderClientAuth } from '@/lib/orders-client';

export async function getCurrentProfileManaged(companyId: string) {
  const { accessToken, profileTokens } = await collectOrderClientAuth();
  const response = await fetch('/api/profile/current', {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}) },
    body: JSON.stringify({ company_id: companyId, profile_tokens: profileTokens }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  return data?.profile || null;
}
