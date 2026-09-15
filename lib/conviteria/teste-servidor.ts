import { adminConviteria, adminPublic } from './servidor';
import {
  MEMORIAS_BUCKET,
  MEMORIAS_LIMITE_BYTES,
  MEMORIAS_LIMITE_FOTOS,
  MEMORIAS_LIMITE_VIDEOS,
  MEMORIAS_VIDEO_MAX_BYTES,
  MEMORIAS_VIDEO_MAX_SEGUNDOS,
} from './memorias-config';

async function removerStorage(caminhos: string[]) {
  if (!caminhos.length) return;
  const storage = adminPublic().storage.from(MEMORIAS_BUCKET);
  for (let i = 0; i < caminhos.length; i += 100) {
    const lote = caminhos.slice(i, i + 100);
    const { error } = await storage.remove(lote);
    // Falha de Storage não pode reabrir dados de teste. Marcamos as linhas como
    // excluídas mesmo assim; o objeto órfão continua privado e inacessível.
    if (error) console.error('ConviteIA trial: falha ao remover mídias de teste:', error);
  }
}

export async function limparDadosDoTeste({
  eventoId,
  testeId,
  convertido = false,
}: {
  eventoId: string;
  testeId: string;
  convertido?: boolean;
}) {
  const admin = adminConviteria();
  const agora = new Date().toISOString();

  const [convidados, recados] = await Promise.all([
    admin.from('convidados').delete().eq('evento_id', eventoId).eq('teste_id', testeId),
    admin.from('recados').delete().eq('evento_id', eventoId).eq('teste_id', testeId),
  ]);
  if (convidados.error) throw convidados.error;
  if (recados.error) throw recados.error;

  const { data: midias, error: midiasError } = await admin.from('evento_memorias')
    .select('id,storage_path')
    .eq('evento_id', eventoId)
    .eq('teste_id', testeId)
    .neq('status', 'excluido');
  if (midiasError) throw midiasError;

  const caminhos = (midias ?? []).map((m: any) => m.storage_path as string).filter(Boolean);
  await removerStorage(caminhos);

  const ids = (midias ?? []).map((m: any) => m.id as string);
  if (ids.length) {
    const { error } = await admin.from('evento_memorias').update({
      status: 'excluido',
      reserva_expira_em: null,
      updated_at: agora,
    }).eq('evento_id', eventoId).in('id', ids);
    if (error) throw error;
  }

  const { error: pacoteError } = await admin.from('evento_memorias_config').update({
    status: 'nao_contratado',
    limite_fotos: MEMORIAS_LIMITE_FOTOS,
    limite_videos: MEMORIAS_LIMITE_VIDEOS,
    limite_bytes: MEMORIAS_LIMITE_BYTES,
    video_max_segundos: MEMORIAS_VIDEO_MAX_SEGUNDOS,
    video_max_bytes: MEMORIAS_VIDEO_MAX_BYTES,
    comprado_em: null,
    expira_em: null,
    pix_transaction_id: null,
    pix_txid: null,
    updated_at: agora,
  }).eq('evento_id', eventoId).eq('status', 'teste');
  if (pacoteError) throw pacoteError;

  const patch: Record<string, string> = { limpo_em: agora, updated_at: agora };
  if (convertido) patch.convertido_em = agora;
  const { error: testeError } = await admin.from('evento_testes').update(patch).eq('id', testeId);
  if (testeError) throw testeError;
}
