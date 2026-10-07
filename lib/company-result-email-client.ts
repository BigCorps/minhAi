'use client';

import { collectOrderClientAuth } from '@/lib/orders-client';

export async function sendCompanyResultEmail(input: {
  company_id: string;
  subject: string;
  body: string;
}): Promise<void> {
  // A falta de sessão não impede o fluxo público. Empresas privadas são
  // autorizadas pela rota; dados opcionais de auth nunca chegam à Edge.
  const auth = await collectOrderClientAuth().catch(() => ({ accessToken: null, profileTokens: [] }));
  const response = await fetch('/api/public/company-result-email', {
    method: 'POST', cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
    },
    body: JSON.stringify({
      company_id: input.company_id, subject: input.subject, body: input.body,
      profile_tokens: auth.profileTokens,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) {
    throw new Error('Não foi possível enviar o resultado por email.');
  }
}
