import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { adminConviteria } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

function segredoConfere(recebido: string | null) {
  const esperado = process.env.CONVITERIA_WEBHOOK_SEGREDO ?? '';
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  // Comparacao de tempo constante: `===` vaza o tamanho do prefixo correto.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Confirma pagamento. Dois casos:
 *   'convite'  -> publica o evento (plano avulso)
 *   'presente' -> credita saldo do evento
 */
export async function POST(req: NextRequest) {
  if (!segredoConfere(req.headers.get('x-conviteria-segredo'))) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  const corpo = (await req.json().catch(() => null)) as {
    tipo?: 'convite' | 'presente';
    referenciaId?: string;
    txid?: string;
    status?: string;
  } | null;

  if (!corpo?.tipo || !corpo.referenciaId) {
    return NextResponse.json({ erro: 'Payload inválido' }, { status: 400 });
  }
  if (corpo.status !== 'pago') return NextResponse.json({ ok: true, ignorado: true });

  const admin = adminConviteria();

  if (corpo.tipo === 'convite') {
    // Idempotente: `is('publicado_em', null)` faz reentrega do webhook nao
    // reescrever a data de publicacao.
    const { data } = await admin
      .from('eventos')
      .update({ publicado_em: new Date().toISOString() })
      .eq('id', corpo.referenciaId)
      .is('publicado_em', null)
      .select('id, slug')
      .maybeSingle();

    return NextResponse.json({ ok: true, publicado: Boolean(data), slug: data?.slug });
  }

  // Presente. Idempotente pelo status: so sai de 'pendente'.
  const { data: pg } = await admin
    .from('presente_pagamentos')
    .update({ status: 'pago', pago_em: new Date().toISOString() })
    .eq('id', corpo.referenciaId)
    .eq('status', 'pendente')
    .select('id, evento_id, presente_id, liquido_centavos')
    .maybeSingle();

  if (!pg) return NextResponse.json({ ok: true, jaProcessado: true });

  // Saldo por EVENTO, nao por conta: no plano mensal o revendedor cria o
  // convite mas nao pode alcancar o dinheiro dos presentes dos anfitrioes.
  await admin.rpc('creditar_saldo_evento', {
    p_evento_id: pg.evento_id,
    p_centavos: pg.liquido_centavos,
  });

  if (pg.presente_id) {
    await admin.rpc('incrementar_cota', { p_presente_id: pg.presente_id });
  }

  return NextResponse.json({ ok: true });
}
