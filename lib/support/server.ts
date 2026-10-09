import 'server-only';

import { createHash, createHmac, randomBytes } from 'node:crypto';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { OPENAI_MODELS } from '@/lib/openai-models';
import { openai } from '@/lib/openai';
import { resolveSupportProduct, SUPPORT_PRODUCTS, type SupportProduct } from './product-context';

const HUMAN_RE = /\b(humano|atendente|pessoa|suporte humano|falar com algu[eé]m|falar com uma pessoa)\b/i;
const SENSITIVE_RE = /\b(senha|password|token|secret|chave privada|service[_ -]?role|api key)\b/i;

export function cleanSupportText(value: unknown, max = 4000) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

export function supportTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function newSupportToken() {
  return randomBytes(32).toString('base64url');
}

export function supportVisitorHash(req: Request) {
  const raw = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const ua = req.headers.get('user-agent') || '';
  const secret = process.env.SUPPORT_TOKEN_SECRET || process.env.SDR_TOKEN_SECRET || 'bigcorps-support';
  return createHmac('sha256', secret).update(`${raw}|${ua.slice(0, 180)}`).digest('hex');
}

export function requestHost(req: Request) {
  return (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim().slice(0, 255);
}

export async function supportIdentity() {
  try {
    const client = createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { userId: null, companyId: null };
    const admin = createAdminClient();
    const { data } = await admin
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(2);
    return {
      userId: user.id,
      companyId: data?.length === 1 ? data[0].id : null,
    };
  } catch {
    return { userId: null, companyId: null };
  }
}

export async function findSupportThread(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from('bigcorps_support_threads')
    .select('*')
    .eq('token_hash', supportTokenHash(token))
    .maybeSingle();
  return data || null;
}

async function canCreateThread(visitorHash: string) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('bigcorps_support_threads')
    .select('id', { count: 'exact', head: true })
    .eq('visitor_hash', visitorHash)
    .gte('created_at', since);
  return (count || 0) < 5;
}

async function canSend(threadId: string) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('bigcorps_support_messages')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', threadId)
    .eq('role', 'user')
    .gte('created_at', since);
  return (count || 0) < 30;
}

export async function createSupportThread(req: Request, path: string) {
  const admin = createAdminClient();
  const token = newSupportToken();
  const visitorHash = supportVisitorHash(req);
  if (!(await canCreateThread(visitorHash))) throw new Error('support_rate_limit');

  const host = requestHost(req);
  const product = resolveSupportProduct(host, path);
  const identity = await supportIdentity();
  const { data, error } = await admin
    .from('bigcorps_support_threads')
    .insert({
      token_hash: supportTokenHash(token),
      visitor_hash: visitorHash,
      product,
      host,
      path: path.slice(0, 500),
      user_id: identity.userId,
      company_id: identity.companyId,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error('support_thread_create_failed');
  return { thread: data, token, product };
}

export async function supportMessages(threadId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bigcorps_support_messages')
    .select('id,role,source,content,created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error('support_messages_failed');
  return data || [];
}

async function addMessage(threadId: string, role: 'user'|'assistant'|'human'|'system', source: 'widget'|'ai'|'admin'|'system', content: string) {
  const admin = createAdminClient();
  const { error } = await admin.from('bigcorps_support_messages').insert({
    thread_id: threadId,
    role,
    source,
    content,
  });
  if (error) throw new Error('support_message_failed');
  await admin
    .from('bigcorps_support_threads')
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', threadId);
}

function deterministicReply(product: SupportProduct, message: string) {
  const label = SUPPORT_PRODUCTS[product].label;
  const lower = message.toLowerCase();

  if (SENSITIVE_RE.test(message)) {
    return {
      text: 'Por segurança, não envie senhas, tokens, chaves de API ou outros segredos aqui. Posso registrar o problema sem esses dados e encaminhar para a equipe.',
      human: true,
    };
  }
  if (HUMAN_RE.test(message)) {
    return {
      text: `Certo. Vou deixar esta conversa na fila da equipe de suporte da BigCorps para continuar o atendimento sobre ${label}.`,
      human: true,
    };
  }
  if (/\b(login|entrar|acesso|senha)\b/.test(lower)) {
    return { text: `Para problemas de acesso ao ${label}, diga qual mensagem de erro aparece e em qual tela. Não envie sua senha.`, human: false };
  }
  if (/\b(pagamento|pix|cobran[cç]a|cart[aã]o)\b/.test(lower)) {
    return { text: `Posso ajudar a identificar um problema de pagamento no ${label}. Informe apenas o tipo de pagamento, horário aproximado e o que apareceu na tela — sem enviar dados completos de cartão, senha ou token.`, human: false };
  }
  if (/\b(erro|bug|falha|n[aã]o funciona|travou)\b/.test(lower)) {
    return { text: `Entendi. Para investigar no ${label}, descreva o que você tentou fazer, o resultado esperado e a mensagem exibida. Se preferir, posso encaminhar para uma pessoa da equipe.`, human: false };
  }
  return null;
}

async function aiReply(product: SupportProduct, message: string, history: Array<{role:string;content:string}>) {
  if (process.env.BIGCORPS_SUPPORT_AI_ENABLED !== 'true') return null;
  const label = SUPPORT_PRODUCTS[product].label;
  const safeHistory = history.slice(-8).map((m) => ({
    role: m.role === 'user' ? 'user' as const : 'assistant' as const,
    content: m.content.slice(0, 1200),
  }));
  const response = await openai.chat.completions.create({
    model: OPENAI_MODELS.fast,
    temperature: 0.2,
    max_tokens: 280,
    messages: [
      {
        role: 'system',
        content: `Você é o suporte inicial da BigCorps para ${label}. Responda em português brasileiro, de forma curta e operacional. Nunca peça senha, token, chave privada, dados completos de cartão ou segredos. Não invente status de conta, pagamento ou recurso. Se faltar contexto ou a pergunta exigir acesso interno, diga que vai encaminhar para a equipe humana. Em MelhorIA, não forneça orientação médica, diagnóstico, dose ou interpretação clínica. Você só orienta o uso do produto.`,
      },
      ...safeHistory,
      { role: 'user', content: message.slice(0, 2000) },
    ],
  });
  return cleanSupportText(response.choices[0]?.message?.content, 1800) || null;
}

export async function handleSupportMessage(req: Request, input: { token?: string; message?: string; path?: string }) {
  const message = cleanSupportText(input.message, 4000);
  const path = cleanSupportText(input.path || '/', 500) || '/';
  if (!message) throw new Error('support_message_required');

  let token = cleanSupportText(input.token, 120);
  let thread = token ? await findSupportThread(token) : null;
  if (!thread) {
    const created = await createSupportThread(req, path);
    thread = created.thread;
    token = created.token;
  }
  if (!(await canSend(thread.id))) throw new Error('support_rate_limit');

  await addMessage(thread.id, 'user', 'widget', message);
  const deterministic = deterministicReply(thread.product as SupportProduct, message);
  let reply = deterministic?.text || null;
  let human = deterministic?.human || false;

  if (!reply) {
    const history = await supportMessages(thread.id);
    reply = await aiReply(thread.product as SupportProduct, message, history);
  }

  if (!reply) {
    reply = 'Recebi sua mensagem. Posso continuar coletando detalhes por aqui ou você pode pedir para falar com uma pessoa da equipe.';
  }

  if (human) {
    const admin = createAdminClient();
    await admin
      .from('bigcorps_support_threads')
      .update({
        human_requested: true,
        status: 'waiting_human',
        updated_at: new Date().toISOString(),
      })
      .eq('id', thread.id);
  }

  await addMessage(thread.id, 'assistant', 'ai', reply);
  return { token, threadId: thread.id, reply, humanRequested: human };
}

export async function requestHuman(threadId: string) {
  const admin = createAdminClient();
  await admin
    .from('bigcorps_support_threads')
    .update({
      human_requested: true,
      status: 'waiting_human',
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId);
}
