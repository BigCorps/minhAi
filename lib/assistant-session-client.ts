'use client';

export type AssistantSessionContext = {
  context_summary: string;
  last_function_keys: string[];
  messages: Array<{ role?: string; content?: string }>;
};

async function requestSession(payload: Record<string, unknown>) {
  const response = await fetch('/api/assistant/session', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  return data;
}

export async function getAssistantSessionContext(companyId: string, sessionId: string): Promise<AssistantSessionContext | null> {
  const data = await requestSession({ action: 'read', company_id: companyId, session_id: sessionId });
  return data?.session || null;
}

export async function setAssistantSessionLastFunctions(companyId: string, sessionId: string, keys: string[]): Promise<void> {
  await requestSession({ action: 'set_last_functions', company_id: companyId, session_id: sessionId, last_function_keys: keys });
}
