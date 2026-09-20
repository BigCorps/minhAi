import { adminConviteria } from './servidor';
import type { NextRequest } from 'next/server';

export function tokenBearer(req: NextRequest) {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null;
}

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

export type PerfilAcessoCheckin = 'dono' | 'responsavel_checkin';

export async function exigirAcessoCheckin(req: NextRequest, eventoId: string) {
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

  if (!evento) return { erro: 'Convite não encontrado.', status: 404 as const };

  if (!evento.publicado_em) {
    return {
      erro: 'O check-in é liberado após a publicação definitiva do convite.',
      status: 403 as const,
    };
  }

  const dono = (evento as unknown as { contas?: { user_id?: string } })?.contas?.user_id;
  if (dono === auth.user.id) {
    return {
      admin,
      evento,
      user: auth.user,
      perfilAcesso: 'dono' as PerfilAcessoCheckin,
    };
  }

  const email = normalizarEmail(auth.user.email);
  if (!email) return { erro: 'Acesso de check-in não autorizado.', status: 403 as const };

  const { data: acesso, error: acessoErro } = await admin
    .from('checkin_acessos')
    .select('id,email,user_id,ativo')
    .eq('evento_id', eventoId)
    .eq('email', email)
    .eq('ativo', true)
    .maybeSingle();

  if (acessoErro) {
    console.error('[ConviteIA/checkin] Falha ao consultar acesso externo:', acessoErro);
    return { erro: 'Acesso de check-in não autorizado.', status: 403 as const };
  }

  if (!acesso) return { erro: 'Acesso de check-in não autorizado ou revogado.', status: 403 as const };

  const vinculado = (acesso as { user_id?: string | null }).user_id;
  if (vinculado && vinculado !== auth.user.id) {
    return { erro: 'Este acesso está vinculado a outra conta.', status: 403 as const };
  }

  const agora = new Date().toISOString();
  const atualizacao: Record<string, unknown> = { ultimo_acesso_em: agora, updated_at: agora };
  if (!vinculado) atualizacao.user_id = auth.user.id;

  void admin
    .from('checkin_acessos')
    .update(atualizacao)
    .eq('id', (acesso as { id: string }).id);

  return {
    admin,
    evento,
    user: auth.user,
    perfilAcesso: 'responsavel_checkin' as PerfilAcessoCheckin,
  };
}

export function extrairTokenQr(valor: string) {
  const limpo = valor.trim();
  const direto = limpo.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
  return direto ?? null;
}
