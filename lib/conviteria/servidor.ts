import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import type { ConviteConfig, SecaoConfig } from './tipos';

/** Cliente admin. O schema conviteria nao e exposto ao PostgREST publico. */
export function adminConviteria() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'conviteria' }, auth: { persistSession: false } }
  );
}

/** IP nunca e gravado em claro: LGPD. Serve so para anti-flood. */
export function hashIp(ip: string) {
  return createHash('sha256')
    .update(ip + (process.env.CONVITERIA_SAL_IP ?? 'sal-padrao'))
    .digest('hex')
    .slice(0, 32);
}

export function ipDaRequisicao(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconhecido';
}

/** Turnstile: reusa a edge function `validate-turnstile` do minhAi. */
export async function validarTurnstile(token: string | undefined, ip: string) {
  if (process.env.NODE_ENV !== 'production') return true;
  if (!token) return false;
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate-turnstile`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ token, ip }),
      }
    );
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}

export interface EventoPublico {
  id: string;
  slug: string;
  cfg: ConviteConfig;
}

/**
 * Le o convite publicado. Filtra por `publicado_em`, NUNCA pelo status do
 * plano: quem tem o link e o convidado, e derrubar o convite quebraria o
 * evento de alguem que nem e cliente.
 */
export async function buscarEventoPublicado(slug: string): Promise<EventoPublico | null> {
  const admin = adminConviteria();

  const { data: evento } = await admin
    .from('eventos')
    .select('id, slug, config')
    .eq('slug', slug)
    .not('publicado_em', 'is', null)
    .eq('arquivado', false)
    .maybeSingle();

  if (!evento) return null;

  const [{ data: secoes }, { data: presentes }] = await Promise.all([
    admin.from('evento_secoes').select('tipo, ordem, ativo, config')
      .eq('evento_id', evento.id).eq('ativo', true).order('ordem'),
    admin.from('presentes')
      .select('id, titulo, valor_centavos, imagem_url, cotas_total, cotas_vendidas')
      .eq('evento_id', evento.id).eq('ativo', true).order('ordem'),
  ]);

  const cfg = evento.config as ConviteConfig;

  return {
    id: evento.id as string,
    slug: evento.slug as string,
    cfg: {
      ...cfg,
      secoes: (secoes ?? []) as unknown as SecaoConfig[],
      presentes: (presentes ?? []).map((p) => ({
        id: p.id as string,
        titulo: p.titulo as string,
        valorCentavos: p.valor_centavos as number,
        imagemUrl: (p.imagem_url as string | null) ?? undefined,
        esgotado:
          p.cotas_total != null &&
          (p.cotas_vendidas as number) >= (p.cotas_total as number),
      })),
    },
  };
}
