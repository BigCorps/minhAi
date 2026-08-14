import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, hashIp, ipDaRequisicao } from '@/lib/conviteria/servidor';
import { calcularTaxa } from '@/lib/conviteria/precos';

export const runtime = 'nodejs';

type ItemPedido = {
  presenteId?: string;
  valorCentavos?: number;
};

const MAX_ITENS = 12;
const MAX_CHECKOUTS_10_MIN = 6;

export async function POST(req: NextRequest) {
  const ip = ipDaRequisicao(req);
  const ipHash = hashIp(ip);

  const corpo = (await req.json().catch(() => null)) as {
    eventoId?: string;
    itens?: ItemPedido[];
    pagadorNome?: string;
    mensagem?: string;
  } | null;

  const eventoId = corpo?.eventoId?.trim();
  const recebidos = Array.isArray(corpo?.itens) ? corpo!.itens! : [];

  if (!eventoId || recebidos.length === 0) {
    return NextResponse.json({ erro: 'Escolha pelo menos um presente.' }, { status: 400 });
  }

  // Um presente só pode entrar uma vez no mesmo carrinho.
  const unicos = new Map<string, ItemPedido>();
  for (const item of recebidos) {
    if (item?.presenteId) unicos.set(item.presenteId, item);
  }
  const itens = [...unicos.values()].slice(0, MAX_ITENS);

  if (itens.length === 0 || itens.length > MAX_ITENS) {
    return NextResponse.json({ erro: `Escolha até ${MAX_ITENS} presentes por pagamento.` }, { status: 400 });
  }

  const admin = adminConviteria();

  // Rate-limit server-side. O convidado não precisa resolver CAPTCHA para pagar,
  // mas um robô também não pode gerar cobranças ilimitadas.
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('presente_checkouts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', desde);

  if ((count ?? 0) >= MAX_CHECKOUTS_10_MIN) {
    return NextResponse.json(
      { erro: 'Muitas tentativas de pagamento. Aguarde alguns minutos e tente novamente.' },
      { status: 429 }
    );
  }

  const ids = itens.map((i) => i.presenteId!) as string[];

  const { data: evento } = await admin
    .from('eventos')
    .select('id, config')
    .eq('id', eventoId)
    .not('publicado_em', 'is', null)
    .eq('arquivado', false)
    .maybeSingle();

  if (!evento) {
    return NextResponse.json({ erro: 'Convite indisponível.' }, { status: 404 });
  }

  const { data: presentes, error: erroPresentes } = await admin
    .from('presentes')
    .select('id,titulo,valor_centavos,permite_valor_livre,cotas_total,cotas_vendidas')
    .eq('evento_id', eventoId)
    .eq('ativo', true)
    .in('id', ids);

  if (erroPresentes || !presentes || presentes.length !== ids.length) {
    return NextResponse.json({ erro: 'Um ou mais presentes não estão mais disponíveis.' }, { status: 409 });
  }

  const porId = new Map(presentes.map((p: any) => [p.id as string, p]));
  const linhas: Array<{
    presente_id: string;
    valor_centavos: number;
    taxa_centavos: number;
    liquido_centavos: number;
  }> = [];

  let total = 0;
  let taxaTotal = 0;
  let liquidoTotal = 0;

  for (const pedido of itens) {
    const presente: any = porId.get(pedido.presenteId!);
    if (!presente) {
      return NextResponse.json({ erro: 'Presente indisponível.' }, { status: 409 });
    }

    if (
      presente.cotas_total != null &&
      Number(presente.cotas_vendidas ?? 0) >= Number(presente.cotas_total)
    ) {
      return NextResponse.json(
        { erro: `“${presente.titulo}” já foi presenteado.` },
        { status: 409 }
      );
    }

    const valor = presente.permite_valor_livre
      ? Math.round(Number(pedido.valorCentavos ?? 0))
      : Number(presente.valor_centavos);

    if (!Number.isSafeInteger(valor) || valor < 500 || valor > 500_000) {
      return NextResponse.json(
        { erro: `Valor inválido para “${presente.titulo}”.` },
        { status: 400 }
      );
    }

    const { taxa, liquido } = calcularTaxa(valor);
    linhas.push({
      presente_id: presente.id,
      valor_centavos: valor,
      taxa_centavos: taxa,
      liquido_centavos: liquido,
    });

    total += valor;
    taxaTotal += taxa;
    liquidoTotal += liquido;
  }

  if (total <= 0 || total > 6_000_000) {
    return NextResponse.json({ erro: 'Valor total fora do permitido.' }, { status: 400 });
  }

  const nome = corpo?.pagadorNome?.trim().slice(0, 80) || null;
  const mensagem = corpo?.mensagem?.trim().slice(0, 400) || null;

  const { data: checkout, error: erroCheckout } = await admin
    .from('presente_checkouts')
    .insert({
      evento_id: eventoId,
      total_centavos: total,
      taxa_centavos: taxaTotal,
      liquido_centavos: liquidoTotal,
      pagador_nome: nome,
      mensagem,
      ip_hash: ipHash,
      status: 'pendente',
    })
    .select('id')
    .single();

  if (erroCheckout || !checkout) {
    return NextResponse.json({ erro: 'Não foi possível preparar o checkout.' }, { status: 500 });
  }

  const { error: erroItens } = await admin
    .from('presente_pagamentos')
    .insert(
      linhas.map((l) => ({
        checkout_id: checkout.id,
        evento_id: eventoId,
        presente_id: l.presente_id,
        valor_centavos: l.valor_centavos,
        taxa_centavos: l.taxa_centavos,
        liquido_centavos: l.liquido_centavos,
        pagador_nome: nome,
        mensagem,
        status: 'pendente',
      }))
    );

  if (erroItens) {
    await admin.from('presente_checkouts').update({ status: 'expirado' }).eq('id', checkout.id);
    return NextResponse.json({ erro: 'Não foi possível registrar os presentes.' }, { status: 500 });
  }

  const cfg = (evento.config ?? {}) as any;
  const casal =
    cfg?.anfitrioes?.exibicao ||
    cfg?.anfitrioes?.completo ||
    'os anfitriões';

  // Mesmo backend do checkout da minhAi. A diferença é que o dinheiro do
  // ConviteIA fica na BigCorps para formar evento_saldo e posterior repasse.
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
        referencia_id: checkout.id,
        valor_centavos: total,
        descricao: `${itens.length} presente${itens.length === 1 ? '' : 's'} para ${casal}`,
        tipo: 'presente',
        purpose: 'conviteria_presente',
        brand: 'conviteia',
      }),
    }
  );

  const pix = await r.json().catch(() => null);

  if (!r.ok || !pix?.transaction_id) {
    await Promise.all([
      admin.from('presente_checkouts').update({ status: 'expirado' }).eq('id', checkout.id),
      admin.from('presente_pagamentos').update({ status: 'expirado' }).eq('checkout_id', checkout.id),
    ]);
    return NextResponse.json(
      { erro: pix?.message || pix?.error || 'Não foi possível gerar o PIX.' },
      { status: 502 }
    );
  }

  await admin
    .from('presente_checkouts')
    .update({
      pix_transaction_id: pix.transaction_id,
      txid: pix.txid ?? null,
    })
    .eq('id', checkout.id);

  return NextResponse.json({
    checkoutId: checkout.id,
    transactionId: pix.transaction_id,
    quantidade: itens.length,
    valorCentavos: total,
    qrcode: pix.qrcode ?? pix.qr_code_url,
    copiaECola: pix.copia_e_cola ?? pix.pix_code,
    expiresAt: pix.expires_at ?? null,
  });
}
