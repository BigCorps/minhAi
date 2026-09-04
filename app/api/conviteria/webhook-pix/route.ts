import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { ativarMemorias } from '@/lib/conviteria/memorias-servidor';

export const runtime = 'nodejs';

function segredoConfere(recebido: string | null) {
  const esperado = process.env.CONVITERIA_WEBHOOK_SEGREDO ?? '';
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

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
    // Um mesmo PIX pode publicar o convite avulso e ativar o add-on. No plano
    // mensal o evento já está publicado e apenas a segunda operação acontece.
    const { data: publicado } = await admin.from('eventos')
      .update({ publicado_em: new Date().toISOString() })
      .eq('id', corpo.referenciaId)
      .is('publicado_em', null)
      .select('id,slug')
      .maybeSingle();

    const memoriasAtivadas = await ativarMemorias(corpo.referenciaId, corpo.txid ?? null);
    let slug = publicado?.slug as string | undefined;
    if (!slug) {
      const { data: evento } = await admin.from('eventos').select('slug').eq('id', corpo.referenciaId).maybeSingle();
      slug = evento?.slug as string | undefined;
    }

    return NextResponse.json({
      ok: true,
      publicado: Boolean(publicado),
      memoriasAtivadas,
      slug,
    });
  }

  // Checkout/carrinho atual de presentes. referenciaId é o checkout_id.
  const { data: checkout } = await admin.from('presente_checkouts')
    .select('id').eq('id', corpo.referenciaId).maybeSingle();

  if (checkout) {
    const { data: processado, error } = await admin.rpc('processar_checkout_presente', {
      p_checkout_id: checkout.id,
    });
    if (error) {
      console.error('Erro ao processar checkout de presentes:', error);
      return NextResponse.json({ erro: 'Falha ao processar presentes.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, checkout: true, jaProcessado: processado !== true });
  }

  // Compatibilidade com cobranças antigas de um único presente.
  const { data: pg } = await admin.from('presente_pagamentos')
    .update({ status: 'pago', pago_em: new Date().toISOString() })
    .eq('id', corpo.referenciaId).eq('status', 'pendente')
    .select('id,evento_id,presente_id,liquido_centavos').maybeSingle();
  if (!pg) return NextResponse.json({ ok: true, jaProcessado: true });

  await admin.rpc('creditar_saldo_evento', { p_evento_id: pg.evento_id, p_centavos: pg.liquido_centavos });
  if (pg.presente_id) await admin.rpc('incrementar_cota', { p_presente_id: pg.presente_id });
  return NextResponse.json({ ok: true, legado: true });
}
