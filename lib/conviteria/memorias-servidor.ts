import { adminConviteria, adminPublic } from './servidor';
import {
  MEMORIAS_BUCKET,
  MEMORIAS_LIMITE_BYTES,
  MEMORIAS_LIMITE_FOTOS,
  MEMORIAS_LIMITE_VIDEOS,
  MEMORIAS_PRECO_CENTAVOS,
  MEMORIAS_VIDEO_MAX_BYTES,
  MEMORIAS_VIDEO_MAX_SEGUNDOS,
  calcularExpiracaoMemorias,
  festaEstaAtiva,
  urlAlbum,
  urlMemorias,
} from './memorias-config';

export interface EventoMemoriasPublico {
  id: string;
  slug: string;
  titulo: string;
  dataEvento: string | null;
  fotoCapa: string | null;
  memorias: {
    status: string;
    aprovacaoManual: boolean;
    expiraEm: string | null;
  };
}

export async function buscarEventoMemoriasPublicado(slug: string): Promise<EventoMemoriasPublico | null> {
  const admin = adminConviteria();
  const { data: evento } = await admin
    .from('eventos')
    .select('id,slug,config,data_evento,publicado_em,arquivado')
    .eq('slug', slug)
    .not('publicado_em', 'is', null)
    .eq('arquivado', false)
    .maybeSingle();

  if (!evento) return null;

  const { data: pacote } = await admin
    .from('evento_memorias_config')
    .select('status,aprovacao_manual,expira_em')
    .eq('evento_id', evento.id)
    .maybeSingle();

  if (!pacote || pacote.status !== 'ativo') return null;
  if (pacote.expira_em && new Date(pacote.expira_em) <= new Date()) return null;

  const cfg = (evento.config ?? {}) as Record<string, any>;
  return {
    id: evento.id as string,
    slug: evento.slug as string,
    titulo: cfg.anfitrioes?.exibicao || 'Nosso evento',
    dataEvento: (evento.data_evento as string | null) ?? null,
    fotoCapa: cfg.midia?.fotoCapa ?? cfg.midia?.fotoPrincipal ?? null,
    memorias: {
      status: pacote.status as string,
      aprovacaoManual: Boolean(pacote.aprovacao_manual),
      expiraEm: (pacote.expira_em as string | null) ?? null,
    },
  };
}

export async function buscarEventoDoDono(token: string, eventoId: string) {
  const admin = adminConviteria();
  const { data: auth, error } = await admin.auth.getUser(token);
  if (error || !auth.user) return null;

  const { data: evento } = await admin
    .from('eventos')
    .select('id,slug,config,data_evento,publicado_em,origem_plano,pix_transaction_id,conta_id,contas!inner(user_id)')
    .eq('id', eventoId)
    .maybeSingle();

  if (!evento) return null;
  const dono = (evento as unknown as { contas: { user_id: string } }).contas?.user_id;
  return dono === auth.user.id ? evento : null;
}

export async function usoMemorias(eventoId: string) {
  const admin = adminConviteria();
  const { data } = await admin
    .from('evento_memorias')
    .select('tipo,tamanho_bytes,status,reserva_expira_em')
    .eq('evento_id', eventoId)
    .neq('status', 'excluido');

  const agora = Date.now();
  const validas = (data ?? []).filter((m: any) =>
    m.status !== 'reservado' || !m.reserva_expira_em || new Date(m.reserva_expira_em).getTime() > agora
  );

  return {
    fotos: validas.filter((m: any) => m.tipo === 'foto').length,
    videos: validas.filter((m: any) => m.tipo === 'video').length,
    bytes: validas.reduce((s: number, m: any) => s + Number(m.tamanho_bytes || 0), 0),
  };
}

export async function pacoteDoEvento(eventoId: string) {
  const admin = adminConviteria();
  const { data } = await admin
    .from('evento_memorias_config')
    .select('*')
    .eq('evento_id', eventoId)
    .maybeSingle();
  return data;
}

export async function garantirPacote(eventoId: string) {
  const admin = adminConviteria();
  const { data, error } = await admin
    .from('evento_memorias_config')
    .upsert({
      evento_id: eventoId,
      limite_fotos: MEMORIAS_LIMITE_FOTOS,
      limite_videos: MEMORIAS_LIMITE_VIDEOS,
      limite_bytes: MEMORIAS_LIMITE_BYTES,
      video_max_segundos: MEMORIAS_VIDEO_MAX_SEGUNDOS,
      video_max_bytes: MEMORIAS_VIDEO_MAX_BYTES,
      compra_valor_centavos: MEMORIAS_PRECO_CENTAVOS,
    }, { onConflict: 'evento_id', ignoreDuplicates: true })
    .select('*')
    .single();

  if (error) {
    const existente = await pacoteDoEvento(eventoId);
    if (existente) return existente;
    throw error;
  }
  return data;
}

export async function ativarMemorias(eventoId: string, txid?: string | null) {
  const admin = adminConviteria();
  const { data: evento } = await admin
    .from('eventos')
    .select('id,data_evento')
    .eq('id', eventoId)
    .maybeSingle();
  if (!evento) return false;

  const agora = new Date();
  const expiraEm = calcularExpiracaoMemorias(evento.data_evento as string | null, agora);

  let q = admin
    .from('evento_memorias_config')
    .update({
      status: 'ativo',
      comprado_em: agora.toISOString(),
      expira_em: expiraEm,
      updated_at: agora.toISOString(),
    })
    .eq('evento_id', eventoId)
    .eq('status', 'aguardando_pagamento');

  // Se o webhook recebeu txid, evita que um PIX antigo ative uma compra nova.
  if (txid) q = q.eq('pix_txid', txid);
  const { data, error } = await q.select('evento_id').maybeSingle();
  if (error) console.error('Falha ao ativar Memórias:', error);
  return Boolean(data);
}

export async function midiasAssinadas(eventoId: string, apenasAprovadas = true, expiraSegundos = 3600) {
  const admin = adminConviteria();
  let q = admin
    .from('evento_memorias')
    .select('id,tipo,storage_path,mime_type,tamanho_bytes,duracao_segundos,largura,altura,nome_convidado,status,created_at')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: true });
  if (apenasAprovadas) q = q.eq('status', 'aprovado');
  else q = q.in('status', ['pendente', 'aprovado', 'oculto']);

  const { data } = await q;
  const publicAdmin = adminPublic();
  const caminhos = (data ?? []).map((m: any) => m.storage_path as string);
  const assinadas = caminhos.length
    ? await publicAdmin.storage.from(MEMORIAS_BUCKET).createSignedUrls(caminhos, expiraSegundos)
    : { data: [] as any[] };

  const mapa = new Map<string, string>();
  for (const s of assinadas.data ?? []) {
    if (s.path && s.signedUrl) mapa.set(s.path, s.signedUrl);
  }

  return (data ?? []).map((m: any) => ({
    id: m.id,
    tipo: m.tipo,
    url: mapa.get(m.storage_path) ?? null,
    mimeType: m.mime_type,
    tamanhoBytes: Number(m.tamanho_bytes || 0),
    duracaoSegundos: m.duracao_segundos == null ? null : Number(m.duracao_segundos),
    largura: m.largura,
    altura: m.altura,
    nomeConvidado: m.nome_convidado,
    status: m.status,
    createdAt: m.created_at,
  })).filter((m: any) => Boolean(m.url));
}

export function resumoPublico(evento: EventoMemoriasPublico) {
  return {
    eventoId: evento.id,
    slug: evento.slug,
    titulo: evento.titulo,
    dataEvento: evento.dataEvento,
    fotoCapa: evento.fotoCapa,
    expiraEm: evento.memorias.expiraEm,
    aprovacaoManual: evento.memorias.aprovacaoManual,
    modoFestaAtivo: festaEstaAtiva(evento.dataEvento),
    urlMemorias: urlMemorias(evento.slug),
    urlAlbum: urlAlbum(evento.slug),
    limites: {
      fotos: MEMORIAS_LIMITE_FOTOS,
      videos: MEMORIAS_LIMITE_VIDEOS,
      bytes: MEMORIAS_LIMITE_BYTES,
      videoSegundos: MEMORIAS_VIDEO_MAX_SEGUNDOS,
      videoBytes: MEMORIAS_VIDEO_MAX_BYTES,
    },
  };
}
