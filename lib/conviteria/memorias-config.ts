import { DOMINIO } from './marca';

export const MEMORIAS_BUCKET = 'conviteria-memorias';
export const MEMORIAS_PRECO_CENTAVOS = 1990;
export const MEMORIAS_LIMITE_FOTOS = 300;
export const MEMORIAS_LIMITE_VIDEOS = 30;
export const MEMORIAS_LIMITE_BYTES = 300 * 1024 * 1024;
export const MEMORIAS_VIDEO_MAX_SEGUNDOS = 30;
export const MEMORIAS_ARQUIVO_MAX_BYTES = 8 * 1024 * 1024;
export const MEMORIAS_VIDEO_MAX_BYTES = MEMORIAS_ARQUIVO_MAX_BYTES;
export const MEMORIAS_VIDEO_ALVO_BYTES = 7 * 1024 * 1024;
export const MEMORIAS_VIDEO_ORIGINAL_MAX_BYTES = 250 * 1024 * 1024;
export const MEMORIAS_RESERVA_MINUTOS = 30;
export const MEMORIAS_RETENCAO_DIAS = 90;
export const MEMORIAS_MINIMO_POS_COMPRA_DIAS = 30;
export const MEMORIAS_FESTA_ATE_HORA_DIA_SEGUINTE = 6;

export const MEMORIAS_MIMES_FOTO = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export const MEMORIAS_MIMES_VIDEO = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export type MemoriaTipo = 'foto' | 'video';
export type MemoriaStatus = 'reservado' | 'pendente' | 'aprovado' | 'oculto' | 'excluido';
export type MemoriasPacoteStatus = 'nao_contratado' | 'aguardando_pagamento' | 'ativo' | 'expirado';

export function urlMemorias(slug: string) {
  return `https://${slug}.${DOMINIO}/memorias`;
}

export function urlAlbum(slug: string) {
  return `https://${slug}.${DOMINIO}/album`;
}

export function centavosParaBrl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * O pacote dura ate 90 dias depois do evento. Se for comprado tarde, preserva
 * pelo menos 30 dias apos a compra para o cliente conseguir usar e baixar.
 */
export function calcularExpiracaoMemorias(
  dataEvento: string | null | undefined,
  compradoEm = new Date(),
) {
  const minimo = new Date(compradoEm);
  minimo.setDate(minimo.getDate() + MEMORIAS_MINIMO_POS_COMPRA_DIAS);

  if (!dataEvento) {
    const semData = new Date(compradoEm);
    semData.setDate(semData.getDate() + MEMORIAS_RETENCAO_DIAS);
    return semData.toISOString();
  }

  // data_evento e DATE no ConviteIA. Meio-dia evita mudanca de dia por UTC.
  const evento = new Date(`${dataEvento.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(evento.getTime())) return minimo.toISOString();

  const eventoMais90 = new Date(evento);
  eventoMais90.setDate(eventoMais90.getDate() + MEMORIAS_RETENCAO_DIAS);

  return new Date(Math.max(minimo.getTime(), eventoMais90.getTime())).toISOString();
}

/**
 * Modo Festa: o dia inteiro do evento e a madrugada ate 06:00 do dia seguinte.
 * A conta e feita no timezone do browser; no Brasil isso coincide com o evento.
 */
export function festaEstaAtiva(dataEvento: string | null | undefined, agora = new Date()) {
  if (!dataEvento) return false;
  const inicio = new Date(`${dataEvento.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(inicio.getTime())) return false;
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  fim.setHours(MEMORIAS_FESTA_ATE_HORA_DIA_SEGUINTE, 0, 0, 0);
  return agora >= inicio && agora < fim;
}
