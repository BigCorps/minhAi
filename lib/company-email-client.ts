'use client';

import { collectOrderClientAuth } from '@/lib/orders-client';

export class CompanyEmailError extends Error {}

export async function sendCompanyEmail(input: {
  company_id: string;
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; content: string; encoding: string; contentType: string }>;
}): Promise<void> {
  const { accessToken, profileTokens } = await collectOrderClientAuth();
  if (!accessToken && !profileTokens.length) {
    throw new CompanyEmailError('Entre na sua conta para enviar por e-mail.');
  }
  let response: Response;
  try {
    response = await fetch('/api/company/email', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        company_id: input.company_id, to: input.to, subject: input.subject, body: input.body,
        ...(input.attachments ? { attachments: input.attachments } : {}),
        profile_tokens: profileTokens,
      }),
    });
  } catch {
    throw new CompanyEmailError('Não foi possível enviar o email. Tente novamente.');
  }
  const data = await response.json().catch(() => ({}));
  if (response.ok && data?.ok === true) return;
  const messages: Record<string, string> = {
    unauthorized: 'Entre na sua conta para enviar por e-mail.',
    forbidden: 'Entre na sua conta para enviar por e-mail.',
    invalid_email: 'Informe um endereço de e-mail válido.',
    invalid_subject: 'Informe um assunto válido com até 200 caracteres.',
    invalid_body: 'Informe o conteúdo do email com até 50 KB.',
    invalid_attachments: 'Não foi possível enviar o anexo.',
    payload_too_large: 'O conteúdo do email ou anexo excede o limite permitido.',
    rate_limited: 'Limite temporário de emails atingido. Tente novamente mais tarde.',
  };
  throw new CompanyEmailError(messages[data?.reason] || 'Não foi possível enviar o email. Tente novamente.');
}
