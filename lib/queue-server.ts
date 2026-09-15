import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cleanText, cleanUuid, resolveCompanyActor, type OrderActor } from '@/lib/orders-server';

export const QUEUE_OPERATIONAL_PROFILE_TYPES = [
  'frentista',
  'atendente',
  'caixa',
  'gerente',
  'colaborador',
  'administrador',
];

const QUEUE_CONFIG_PROFILE_TYPES = new Set(['gerente', 'administrador']);

function queueMutationSecret(): string {
  return String(
    process.env.QUEUE_MUTATION_SECRET ||
    process.env.ORDER_MUTATION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '',
  );
}

export function signQueueCancelToken(ticketId: string, companyId: string, ttlSeconds = 6 * 60 * 60): string {
  const secret = queueMutationSecret();
  if (!secret) throw new Error('queue_mutation_secret_missing');
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${ticketId}.${companyId}.${exp}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyQueueCancelToken(token: unknown, ticketId: string, companyId: string): boolean {
  const secret = queueMutationSecret();
  const raw = String(token || '').trim();
  if (!secret || !raw) return false;

  const parts = raw.split('.');
  if (parts.length !== 4) return false;
  const [tokenTicketId, tokenCompanyId, expRaw, signature] = parts;
  if (tokenTicketId !== ticketId || tokenCompanyId !== companyId) return false;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const payload = `${tokenTicketId}.${tokenCompanyId}.${expRaw}`;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function resolveQueueActor(
  request: { headers: { get(name: string): string | null } },
  body: Record<string, any>,
  companyId: string,
) {
  return resolveCompanyActor(request, body, companyId, QUEUE_OPERATIONAL_PROFILE_TYPES);
}

export function canConfigureQueue(actor: OrderActor): boolean {
  if (actor.kind === 'supabase_user') return true;
  return QUEUE_CONFIG_PROFILE_TYPES.has(String(actor.profileType || ''));
}

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = cleanText(value, max);
  return text || null;
}

function integer(value: unknown, field: string, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`invalid_${field}`);
  return n;
}

function bool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`invalid_${field}`);
  return value;
}

export type QueueConfigPatch = {
  prefixo_senha?: string;
  nome_tipo_atendimento?: string;
  cor_fila?: string | null;
  tempo_medio_atendimento?: number;
  max_senhas_dia?: number;
  reiniciar_numeracao_diariamente?: boolean;
  fila_ativa?: boolean;
  mensagem_fila_pausada?: string | null;
};

export function sanitizeQueueConfig(input: unknown): QueueConfigPatch {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_config');
  const raw = input as Record<string, unknown>;
  const out: QueueConfigPatch = {};

  if (raw.prefixo_senha !== undefined) {
    const prefix = String(raw.prefixo_senha || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(prefix)) throw new Error('invalid_prefixo_senha');
    out.prefixo_senha = prefix;
  }

  if (raw.nome_tipo_atendimento !== undefined) {
    const name = cleanText(raw.nome_tipo_atendimento, 120);
    if (!name) throw new Error('invalid_nome_tipo_atendimento');
    out.nome_tipo_atendimento = name;
  }

  if (raw.cor_fila !== undefined) {
    const color = String(raw.cor_fila || '').trim();
    if (color && !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('invalid_cor_fila');
    out.cor_fila = color || null;
  }

  out.tempo_medio_atendimento = integer(raw.tempo_medio_atendimento, 'tempo_medio_atendimento', 1, 240);
  out.max_senhas_dia = integer(raw.max_senhas_dia, 'max_senhas_dia', 1, 5000);
  out.reiniciar_numeracao_diariamente = bool(raw.reiniciar_numeracao_diariamente, 'reiniciar_numeracao_diariamente');
  out.fila_ativa = bool(raw.fila_ativa, 'fila_ativa');
  out.mensagem_fila_pausada = optionalText(raw.mensagem_fila_pausada, 500);

  for (const key of Object.keys(out) as (keyof QueueConfigPatch)[]) {
    if (out[key] === undefined) delete out[key];
  }

  return out;
}

export function queueId(value: unknown): string {
  return cleanUuid(value);
}
