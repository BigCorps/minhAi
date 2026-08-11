import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, ipDaRequisicao, validarTurnstile } from '@/lib/conviteria/servidor';
import { calcularTaxa } from '@/lib/conviteria/precos';

export const runtime = 'nodejs';

/**
 * Gera a cobranca PIX de um presente.
 *
 * O valor NUNCA vem do cliente para item de valor fixo: vem do banco. Aceitar
 * valor do corpo deixaria qualquer um "presentear" R$ 0,01 e marcar a cota
 * como vendida.
 */
export async function POST(req: NextRequest) {
  const ip = ipDaRequisicao(req);
  const corpo = (await req.json().catch(() => null)) as {
    eventoId?: string; presenteId?: string; valorCentavos?: number;
    pagadorNome?: string; mensagem?: string; turnstile?: string;
  } | null;

  if (!corpo?.eventoId || !corpo.presenteId) {
    return NextResponse.json({ erro: 'Escolha um presente.' }, { status: 400 });
  }
  if (!(await validarTurnstile(corpo.turnstile, ip))) {
    return NextResponse.json({ erro: 'Verificação falhou.' }, { status: 403 });
  }

  const admin = adminConviteria();

  const { data: presente } = await admin
    .from('presentes')
    .select('id, titulo, valor_centavos, permite_valor_livre, cotas_total, cotas_vendidas, evento_id')
    .eq('id', corpo.presenteId)
    .eq('evento_id', corpo.eventoId)
    .eq('ativo', true)
    .maybeSingle();

  if (!presente) return NextResponse.json({ erro: 'Presente indisponível.' }, { status: 404 });

  if (
    presente.cotas_total != null &&
    (presente.cotas_vendidas as number) >= (presente.cotas_total as number)
  ) {
    return NextResponse.json({ erro: 'Essa cota já foi presenteada.' }, { status: 409 });
  }

  const valor = presente.permite_valor_livre
    ? Math.round(corpo.valorCentavos ?? 0)
    : (presente.valor_centavos as number);

  if (valor < 500 || valor > 5_000_00) {
    return NextResponse.json({ erro: 'Valor fora do permitido (R$ 5 a R$ 5.000).' }, { status: 400 });
  }

  const { taxa, liquido } = calcularTaxa(valor);

  const { data: pagamento, error } = await admin
    .from('presente_pagamentos')
    .insert({
      evento_id: corpo.eventoId,
      presente_id: presente.id,
      valor_centavos: valor,
      taxa_centavos: taxa,
      liquido_centavos: liquido,
      pagador_nome: corpo.pagadorNome?.trim().slice(0, 80) ?? null,
      mensagem: corpo.mensagem?.trim().slice(0, 400) ?? null,
      status: 'pendente',
    })
    .select('id')
    .single();

  if (error || !pagamento) {
    return NextResponse.json({ erro: 'Não foi possível gerar a cobrança.' }, { status: 500 });
  }

  // Reusa a edge function de PIX do minhAi. O txid volta dela e amarra o
  // webhook a este registro.
  const r = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-pix-assistente`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        origem: 'conviteria',
        referencia_id: pagamento.id,
        valor_centavos: valor,
        descricao: `Presente: ${presente.titulo}`,
      }),
    }
  );

  if (!r.ok) {
    await admin.from('presente_pagamentos').update({ status: 'expirado' }).eq('id', pagamento.id);
    return NextResponse.json({ erro: 'Não foi possível gerar o PIX.' }, { status: 502 });
  }

  const pix = (await r.json()) as { txid?: string; qrcode?: string; copia_e_cola?: string };
  if (pix.txid) {
    await admin.from('presente_pagamentos').update({ txid: pix.txid }).eq('id', pagamento.id);
  }

  return NextResponse.json({
    pagamentoId: pagamento.id,
    valorCentavos: valor,
    qrcode: pix.qrcode,
    copiaECola: pix.copia_e_cola,
  });
}
