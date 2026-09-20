import { adminConviteria } from './servidor';
import type { NextRequest } from 'next/server';

export function tokenBearer(req: NextRequest) {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null;
}

/**
 * Normalização usada para comparação e novos cadastros.
 *
 * Brasil: armazenamos somente DDD + número (10 ou 11 dígitos). Assim
 * 51 99207-8290, (51) 99207-8290, +55 51 99207-8290 e 5551992078290
 * resultam na mesma chave: 51992078290.
 *
 * Outros países: quando há um + explícito diferente de +55, preservamos o
 * código internacional em dígitos. Não tentamos adivinhar país/DDD.
 */
export function normalizarTelefone(valor?: string | null) {
  const bruto = String(valor ?? '').trim();
  const digitos = bruto.replace(/\D/g, '');
  if (digitos.length < 8) return null;

  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return digitos.slice(2);
  }

  if (digitos.length === 10 || digitos.length === 11) return digitos;

  return digitos.slice(0, 15);
}

/**
 * Variantes somente para LEITURA/compatibilidade. Não migra nem regrava dados
 * antigos. Permite localizar registros brasileiros que tenham sido salvos
 * antes com o 55 e registros novos sem o 55.
 */
export function variantesTelefoneBusca(valor?: string | null) {
  const bruto = String(valor ?? '').trim();
  const digitos = bruto.replace(/\D/g, '');
  const normalizado = normalizarTelefone(bruto);
  if (!normalizado) return [] as string[];

  const variantes = new Set<string>([normalizado]);
  const internacionalExplicitoNaoBr = bruto.startsWith('+') && !digitos.startsWith('55');

  if (!internacionalExplicitoNaoBr && (normalizado.length === 10 || normalizado.length === 11)) {
    variantes.add(`55${normalizado}`);
  }

  if (digitos.length >= 8 && digitos.length <= 15) variantes.add(digitos);
  return [...variantes];
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
