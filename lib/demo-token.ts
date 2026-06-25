// lib/demo-token.ts
//
// Gerador de token para demo_sessions, no mesmo espírito de
// lib/short-links.ts (generateSlug), mas com 3 diferenças propositais:
//
// 1. Alfabeto sem caracteres visualmente ambíguos (sem 0/O/o, 1/l/I).
//    short_links não precisa disso porque o slug só é clicado, nunca
//    digitado; o token de demo pode aparecer no wa.me?text=...[token]
//    e em mensagens que um humano eventualmente lê/copia manualmente.
// 2. 8 caracteres (vs 6 em short_links) — espaço maior, já que o token
//    vive em URLs públicas (cadastro?demo=, wa.me) por até 24h.
// 3. Usa createAdminClient (service role), não createClient (browser).
//    demo_sessions tem RLS habilitado sem nenhuma policy — só service
//    role escreve. Se isso rodasse com o client anônimo, o insert
//    falharia silenciosamente por RLS.

import { createAdminClient } from '@/lib/supabase-server';

const DEMO_TOKEN_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'; // sem 0,1,o,O,l,I
const DEMO_TOKEN_LENGTH = 8;
const MAX_ATTEMPTS = 3;

function generateDemoToken(): string {
  let result = '';
  for (let i = 0; i < DEMO_TOKEN_LENGTH; i++) {
    result += DEMO_TOKEN_ALPHABET.charAt(
      Math.floor(Math.random() * DEMO_TOKEN_ALPHABET.length)
    );
  }
  return result;
}

export interface CreateDemoSessionInput {
  ramo: string;
  nomeNegocio: string;
  produto: string;
  preco: number;
  ipAddress?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  origemSimples?: string | null;
}

export interface DemoSessionRecord {
  id: string;
  token: string;
  ramo: string;
  nome_negocio: string;
  produto: string;
  preco: number;
  nome_lead: string | null;
  email: string | null;
  phone: string | null;
  horario_marcado: string | null;
  objetivo_cumprido_whatsapp: boolean;
  horario_marcado_whatsapp: string | null;
  status: string;
  canal_atual: string;
  objetivo_cumprido: boolean;
  context: Array<{ role: 'user' | 'assistant'; content: string; channel: string; at: string }>;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  origem_simples: string | null;
  expires_at: string;
  created_at: string;
}

/**
 * Cria uma demo_session com token único. Tenta até MAX_ATTEMPTS vezes
 * em caso de colisão (extremamente improvável com 8 chars / 32^8 combinações,
 * mas seguro, no mesmo espírito do retry de createShortLink).
 *
 * Deve ser chamada apenas server-side (route handler / server action).
 */
export async function createDemoSession(
  input: CreateDemoSessionInput
): Promise<DemoSessionRecord> {
  const supabase = createAdminClient();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const token = generateDemoToken();

    const { data, error } = await supabase
      .from('demo_sessions')
      .insert({
        token,
        ramo: input.ramo,
        nome_negocio: input.nomeNegocio,
        produto: input.produto,
        preco: input.preco,
        ip_address: input.ipAddress ?? null,
        utm_source: input.utmSource ?? null,
        utm_medium: input.utmMedium ?? null,
        utm_campaign: input.utmCampaign ?? null,
        origem_simples: input.origemSimples ?? null,
      })
      .select()
      .single();

    if (!error && data) {
      return data as DemoSessionRecord;
    }

    // Colisão de token (unique constraint) → tenta de novo.
    // Qualquer outro erro → falha de verdade, propaga.
    if (!error?.message?.includes('unique')) {
      throw new Error(`Erro ao criar demo_session: ${error?.message ?? 'desconhecido'}`);
    }
  }

  throw new Error('Não foi possível gerar um token único para demo_session após múltiplas tentativas.');
}

/**
 * Busca uma demo_session ativa (não expirada) pelo token.
 * Retorna null se não encontrar ou se já expirou.
 */
export async function getDemoSessionByToken(
  token: string
): Promise<DemoSessionRecord | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('demo_sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('[demo-token] Erro ao buscar demo_session:', error.message);
    return null;
  }

  return (data as DemoSessionRecord) ?? null;
}