import { adminConviteria } from './servidor';
import type { NextRequest } from 'next/server';

export function tokenBearer(req: NextRequest) {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null;
}

export function normalizarTelefone(valor?: string | null) {
  const d = String(valor ?? '').replace(/\D/g, '');
  return d.length >= 8 ? d.slice(-13) : null;
}

export function normalizarEmail(valor?: string | null) {
  const e = String(valor ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e.slice(0, 180) : null;
}

export function texto(valor: unknown, max = 180) {
  return String(valor ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

export function slugSeguro(valor: unknown) {
  return texto(valor, 120)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 60);
}

/**
 * Todas as rotas da Gestão do Evento usam este helper.
 * A gestão é um benefício do convite publicado definitivamente: trial ativo,
 * trial expirado e convite aguardando pagamento continuam pertencendo ao
 * usuário, mas não liberam as ferramentas operacionais.
 */
export async function exigirEventoDoUsuario(req: NextRequest, eventoId: string) {
  const token = tokenBearer(req);
  if (!token) return { erro: 'Faça login.', status: 401 as const };

  const admin = adminConviteria();
  const { data: auth, error } = await admin.auth.getUser(token);
  if (error || !auth.user) return { erro: 'Sessão inválida.', status: 401 as const };

  const { data: evento } = await admin
    .from('eventos')
    .select('id,slug,config,publicado_em,data_evento,arquivado,contas!inner(user_id)')
    .eq('id', eventoId)
    .maybeSingle();

  const dono = (evento as unknown as { contas?: { user_id?: string } } | null)?.contas?.user_id;
  if (!evento || dono !== auth.user.id) {
    return { erro: 'Convite não encontrado.', status: 404 as const };
  }

  if (!evento.publicado_em) {
    return {
      erro: 'A Gestão do Evento é liberada após a publicação definitiva do convite.',
      status: 403 as const,
    };
  }

  return { admin, evento, user: auth.user };
}

export function extrairTokenQr(valor: string) {
  const limpo = valor.trim();
  const direto = limpo.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
  return direto ?? null;
}
