'use client';

import { collectOrderClientAuth } from '@/lib/orders-client';

export type QueueTicket = {
  id: string;
  company_id: string;
  fila_config_id: string;
  senha_completa: string;
  numero: number;
  prefixo: string;
  status: string;
  gerada_em: string;
  chamada_em?: string | null;
  atendimento_iniciado_em?: string | null;
  finalizada_em?: string | null;
};

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'queue_request_failed');
  return data;
}

export async function generatePublicQueueTicket(companyId: string): Promise<{
  ticket: QueueTicket;
  cancelToken: string;
  tempoMedioAtendimento: number;
}> {
  const response = await fetch('/api/queue/public', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generate', company_id: companyId }),
  });
  const data = await parseResponse(response);
  return {
    ticket: data.ticket as QueueTicket,
    cancelToken: String(data.cancel_token || ''),
    tempoMedioAtendimento: Number(data.tempo_medio_atendimento || 0),
  };
}

export async function cancelPublicQueueTicket(companyId: string, ticketId: string, cancelToken: string) {
  const response = await fetch('/api/queue/public', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'cancel',
      company_id: companyId,
      ticket_id: ticketId,
      cancel_token: cancelToken,
    }),
  });
  return parseResponse(response);
}

async function managedQueueRequest(payload: Record<string, unknown>) {
  const auth = await collectOrderClientAuth();
  const response = await fetch('/api/queue/manage', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
    },
    body: JSON.stringify({ ...payload, profile_tokens: auth.profileTokens }),
  });
  return parseResponse(response);
}


export async function authorizeQueueManaged(companyId: string) {
  return managedQueueRequest({ action: 'authorize', company_id: companyId });
}

export async function callNextQueueManaged(companyId: string): Promise<{ ticket: QueueTicket | null }> {
  const data = await managedQueueRequest({ action: 'call_next', company_id: companyId });
  return { ticket: (data.ticket || null) as QueueTicket | null };
}

export async function startQueueServiceManaged(companyId: string, ticketId: string) {
  return managedQueueRequest({ action: 'start_service', company_id: companyId, ticket_id: ticketId });
}

export async function finalizeQueueManaged(companyId: string, ticketId?: string | null): Promise<{ ticket: QueueTicket | null }> {
  const data = await managedQueueRequest({
    action: 'finalize',
    company_id: companyId,
    ...(ticketId ? { ticket_id: ticketId } : {}),
  });
  return { ticket: (data.ticket || null) as QueueTicket | null };
}

export async function cancelQueueManaged(
  companyId: string,
  input: { ticketId?: string | null; senhaCompleta?: string | null },
): Promise<{ ticket: QueueTicket | null }> {
  const data = await managedQueueRequest({
    action: 'cancel',
    company_id: companyId,
    ...(input.ticketId ? { ticket_id: input.ticketId } : {}),
    ...(input.senhaCompleta ? { senha_completa: input.senhaCompleta } : {}),
  });
  return { ticket: (data.ticket || null) as QueueTicket | null };
}

export async function setQueueActiveManaged(
  companyId: string,
  active: boolean,
  configId?: string | null,
) {
  return managedQueueRequest({
    action: 'set_active',
    company_id: companyId,
    active,
    ...(configId ? { config_id: configId } : {}),
  });
}

export async function saveQueueConfigManaged(
  companyId: string,
  config: Record<string, unknown>,
  configId?: string | null,
) {
  return managedQueueRequest({
    action: 'save_config',
    company_id: companyId,
    config,
    ...(configId ? { config_id: configId } : {}),
  });
}
