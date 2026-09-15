import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import type { ConviteConfig, SecaoConfig } from './tipos';
import { expiracaoEfetivaTeste } from './teste';

/** Cliente admin. O schema conviteria nao e exposto ao PostgREST publico. */
export function adminConviteria() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'conviteria' }, auth: { persistSession: false } }
  );
}

/** Cliente admin para tabelas do schema public, como pix_transactions. */
export function adminPublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
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

type AdminConviteria = ReturnType<typeof adminConviteria>;

type EventoBaseAcesso = {
  id: string;
  slug: string;
  config: unknown;
  publicado_em: string | null;
  arquivado: boolean;
  data_evento: string | null;
};

type TesteAcesso = {
  id: string;
  expira_em: string;
  convertido_em: string | null;
};

export type AcessoEventoPublico = {
  modo: 'publicado' | 'teste';
  testeId: string | null;
  testeExpiraEm: string | null;
};

export type SituacaoEventoPublico =
  | ({ eventoId: string; slug: string; estado: 'publicado' } & AcessoEventoPublico)
  | ({ eventoId: string; slug: string; estado: 'teste' } & AcessoEventoPublico)
  | { eventoId: string; slug: string; estado: 'teste_expirado'; testeId: string; testeExpiraEm: string }
  | { eventoId: string; slug: string; estado: 'indisponivel'; testeId: null; testeExpiraEm: null };

async function testeDoEvento(admin: AdminConviteria, eventoId: string): Promise<TesteAcesso | null> {
  const { data } = await admin
    .from('evento_testes')
    .select('id,expira_em,convertido_em')
    .eq('evento_id', eventoId)
    .maybeSingle();
  return (data as TesteAcesso | null) ?? null;
}

function acessoDoTeste(
  teste: TesteAcesso | null,
  dataEvento: string | null | undefined,
  agora = Date.now(),
): AcessoEventoPublico | null {
  if (!teste || teste.convertido_em) return null;
  const expiraEfetiva = expiracaoEfetivaTeste(teste.expira_em, dataEvento);
  if (new Date(expiraEfetiva).getTime() <= agora) return null;
  return {
    modo: 'teste',
    testeId: teste.id,
    testeExpiraEm: expiraEfetiva,
  };
}

async function resolverAcesso(
  admin: AdminConviteria,
  evento: Pick<EventoBaseAcesso, 'id' | 'publicado_em' | 'arquivado' | 'data_evento'>,
): Promise<AcessoEventoPublico | null> {
  if (evento.arquivado) return null;
  if (evento.publicado_em) {
    return { modo: 'publicado', testeId: null, testeExpiraEm: null };
  }
  return acessoDoTeste(await testeDoEvento(admin, evento.id), evento.data_evento);
}

/**
 * Retorna um convite quando ele pode ser usado por um convidado: publicação
 * definitiva OU trial de 24 h ainda válido. `publicado_em` continua sendo a
 * verdade exclusiva da publicação paga; o trial fica em `evento_testes`.
 */
export async function buscarEventoAcessivelPorId(eventoId: string) {
  const admin = adminConviteria();
  const { data: evento } = await admin
    .from('eventos')
    .select('id,slug,config,publicado_em,arquivado,data_evento')
    .eq('id', eventoId)
    .maybeSingle();

  if (!evento) return null;
  const acesso = await resolverAcesso(admin, evento as EventoBaseAcesso);
  if (!acesso) return null;
  return { evento, acesso };
}

/** Trial ativo de um evento. Utilizado também pelo módulo de Memórias. */
export async function buscarTesteAtivoEvento(eventoId: string) {
  const admin = adminConviteria();
  const { data: evento } = await admin
    .from('eventos')
    .select('data_evento,publicado_em,arquivado')
    .eq('id', eventoId)
    .maybeSingle();
  // Publicação definitiva sempre vence o trial, inclusive se uma limpeza
  // pós-pagamento precisar ser repetida depois pelo cron.
  if (!evento || evento.arquivado || evento.publicado_em) return null;
  const teste = await testeDoEvento(admin, eventoId);
  const acesso = acessoDoTeste(teste, evento.data_evento as string | null);
  return acesso?.modo === 'teste'
    ? { id: acesso.testeId!, expiraEm: acesso.testeExpiraEm! }
    : null;
}

/**
 * Estado leve para a página do subdomínio diferenciar trial expirado de slug
 * inexistente. Não libera conteúdo por si só.
 */
export async function buscarSituacaoEventoPorSlug(slug: string): Promise<SituacaoEventoPublico | null> {
  const admin = adminConviteria();
  const { data: evento } = await admin
    .from('eventos')
    .select('id,slug,publicado_em,arquivado,data_evento')
    .eq('slug', slug)
    .maybeSingle();
  if (!evento || evento.arquivado) return null;

  if (evento.publicado_em) {
    return {
      eventoId: evento.id as string,
      slug: evento.slug as string,
      estado: 'publicado',
      modo: 'publicado',
      testeId: null,
      testeExpiraEm: null,
    };
  }

  const teste = await testeDoEvento(admin, evento.id as string);
  if (teste && !teste.convertido_em) {
    const expiraEfetiva = expiracaoEfetivaTeste(
      teste.expira_em,
      evento.data_evento as string | null,
    );
    if (new Date(expiraEfetiva).getTime() > Date.now()) {
      return {
        eventoId: evento.id as string,
        slug: evento.slug as string,
        estado: 'teste',
        modo: 'teste',
        testeId: teste.id,
        testeExpiraEm: expiraEfetiva,
      };
    }
    return {
      eventoId: evento.id as string,
      slug: evento.slug as string,
      estado: 'teste_expirado',
      testeId: teste.id,
      testeExpiraEm: expiraEfetiva,
    };
  }

  return {
    eventoId: evento.id as string,
    slug: evento.slug as string,
    estado: 'indisponivel',
    testeId: null,
    testeExpiraEm: null,
  };
}

export interface EventoPublico {
  id: string;
  slug: string;
  cfg: ConviteConfig;
  modoTeste: boolean;
  testeExpiraEm: string | null;
}

/**
 * Le o convite definitivamente publicado ou temporariamente liberado pelo
 * trial. O estado financeiro continua separado: `publicado_em` só é gravado
 * pelo fluxo já existente de publicação/pagamento.
 */
export async function buscarEventoPublicado(slug: string): Promise<EventoPublico | null> {
  const admin = adminConviteria();

  const { data: evento } = await admin
    .from('eventos')
    .select('id,slug,config,publicado_em,arquivado,data_evento')
    .eq('slug', slug)
    .eq('arquivado', false)
    .maybeSingle();

  if (!evento) return null;
  const acesso = await resolverAcesso(admin, evento as EventoBaseAcesso);
  if (!acesso) return null;

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
    modoTeste: acesso.modo === 'teste',
    testeExpiraEm: acesso.testeExpiraEm,
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
