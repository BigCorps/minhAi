import { adminConviteria } from './servidor';
import {
  HORA_GRAVATA_NOME_PADRAO,
  HORA_GRAVATA_PRECO_CENTAVOS,
  HORA_GRAVATA_TEMPLATE_WHATSAPP,
  HORA_GRAVATA_VALORES_PADRAO_CENTAVOS,
} from './gravata-config';

export async function pacoteHoraGravata(eventoId: string) {
  const admin = adminConviteria();
  const { data, error } = await admin
    .from('evento_gravata_config')
    .select('*')
    .eq('evento_id', eventoId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function garantirPacoteHoraGravata(eventoId: string) {
  const admin = adminConviteria();
  const agora = new Date().toISOString();

  const { data, error } = await admin
    .from('evento_gravata_config')
    .upsert({
      evento_id: eventoId,
      preco_centavos: HORA_GRAVATA_PRECO_CENTAVOS,
      nome_acao: HORA_GRAVATA_NOME_PADRAO,
      valores_sugeridos_centavos: [...HORA_GRAVATA_VALORES_PADRAO_CENTAVOS],
      whatsapp_template_nome: HORA_GRAVATA_TEMPLATE_WHATSAPP,
      updated_at: agora,
    }, {
      onConflict: 'evento_id',
      ignoreDuplicates: true,
    })
    .select('*')
    .single();

  if (error) {
    const existente = await pacoteHoraGravata(eventoId);
    if (existente) return existente;
    throw error;
  }

  return data;
}

export async function ativarHoraGravata(eventoId: string, txid?: string | null) {
  const admin = adminConviteria();
  const agora = new Date().toISOString();

  let query = admin
    .from('evento_gravata_config')
    .update({
      status: 'ativo',
      comprado_em: agora,
      updated_at: agora,
    })
    .eq('evento_id', eventoId)
    .eq('status', 'aguardando_pagamento');

  if (txid) query = query.eq('pix_txid', txid);

  const { data, error } = await query
    .select('evento_id')
    .maybeSingle();

  if (error) {
    console.error('ConviteIA: falha ao ativar Hora da Gravata:', error);
    return false;
  }

  return Boolean(data);
}
