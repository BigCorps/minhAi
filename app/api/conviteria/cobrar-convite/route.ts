import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, adminPublic } from '@/lib/conviteria/servidor';
import { PLANOS } from '@/lib/conviteria/precos';
import {
  MEMORIAS_PRECO_CENTAVOS,
} from '@/lib/conviteria/memorias-config';
import {
  garantirPacote,
  pacoteDoEvento,
} from '@/lib/conviteria/memorias-servidor';

export const runtime = 'nodejs';

function qrDoPix(copiaECola: string) {
  const logo = 'https://conviteia.com/brands/convite/icone-512.png';
  return `/api/qrcode?size=400&data=${encodeURIComponent(copiaECola)}&color=%23a04a63&logo_url=${encodeURIComponent(logo)}`;
}

async function pixPendente(transactionId: string | null | undefined, valorCentavos: number) {
  if (!transactionId) return null;
  const { data } = await adminPublic()
    .from('pix_transactions')
    .select('id,txid,pix_code,status,expires_at,amount_cents')
    .eq('id', transactionId)
    .maybeSingle();

  if (!data || data.status !== 'pending' || Number(data.amount_cents) !== valorCentavos) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  if (!data.pix_code || data.pix_code === 'pending') return null;
  return {
    transactionId: data.id as string,
    txid: data.txid as string | null,
    copiaECola: data.pix_code as string,
    qrcode: qrDoPix(data.pix_code as string),
  };
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ erro: 'Faça login para continuar.' }, { status: 401 });

  const admin = adminConviteria();
  const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
  if (erroAuth || !auth.user) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as {
    eventoId?: string;
    incluirMemorias?: boolean;
  } | null;
  if (!corpo?.eventoId) return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });

  const { data: evento } = await admin
    .from('eventos')
    .select('id,slug,publicado_em,origem_plano,pix_transaction_id,contas!inner(user_id)')
    .eq('id', corpo.eventoId)
    .maybeSingle();
  if (!evento) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });
  const dono = (evento as unknown as { contas: { user_id: string } }).contas?.user_id;
  if (dono !== auth.user.id) return NextResponse.json({ erro: 'Convite não encontrado.' }, { status: 404 });

  const avulso = PLANOS.find((p) => p.id === 'avulso')!;
  const conviteCentavos = !evento.publicado_em && evento.origem_plano === 'avulso' ? avulso.centavos : 0;

  let pacote = await pacoteDoEvento(evento.id as string);
  let memoriasAtivas = pacote?.status === 'ativo' && (!pacote.expira_em || new Date(pacote.expira_em) > new Date());
  if (pacote?.status === 'ativo' && !memoriasAtivas) {
    await admin.from('evento_memorias_config').update({ status: 'expirado', updated_at: new Date().toISOString() })
      .eq('evento_id', evento.id).eq('status', 'ativo');
    pacote = { ...pacote, status: 'expirado' };
  }
  const incluirMemorias = Boolean(corpo.incluirMemorias) && !memoriasAtivas;
  const memoriasCentavos = incluirMemorias ? MEMORIAS_PRECO_CENTAVOS : 0;
  const total = conviteCentavos + memoriasCentavos;

  if (total === 0) {
    return NextResponse.json({
      semCobranca: true,
      valorCentavos: 0,
      publicado: Boolean(evento.publicado_em),
      memoriasAtivas,
    });
  }

  // Idempotência entre abas/reloads: se já existe um PIX de Memórias válido,
  // ele sempre vence a escolha enviada pelo browser. Isso impede uma aba
  // antiga de gerar um segundo PIX só do convite enquanto o combinado está
  // aguardando pagamento.
  if (pacote?.status === 'aguardando_pagamento') {
    const totalPendente = conviteCentavos + MEMORIAS_PRECO_CENTAVOS;
    const existente = await pixPendente(pacote.pix_transaction_id, totalPendente);
    if (existente) {
      return NextResponse.json({
        eventoId: evento.id,
        valorCentavos: totalPendente,
        conviteCentavos,
        memoriasCentavos: MEMORIAS_PRECO_CENTAVOS,
        incluiMemorias: true,
        reutilizado: true,
        ...existente,
      });
    }
  }

  // Também bloqueia a situação inversa: um PIX antigo somente do convite
  // ainda está válido e uma aba nova tenta trocar para Convite + Memórias.
  // Como os dois QR continuariam pagáveis, gerar outro poderia cobrar o
  // convite duas vezes. O cliente conclui o PIX existente e compra o add-on
  // no painel em seguida.
  if (incluirMemorias && conviteCentavos > 0) {
    const convitePendente = await pixPendente(
      evento.pix_transaction_id as string | null,
      conviteCentavos,
    );
    if (convitePendente) {
      return NextResponse.json(
        { erro: 'Já existe um PIX válido somente do convite. Conclua esse pagamento e depois adicione Memórias pelo painel.' },
        { status: 409 },
      );
    }
  }

  if (incluirMemorias) {
    pacote = pacote ?? await garantirPacote(evento.id as string);
  } else if (conviteCentavos > 0) {
    const existente = await pixPendente(evento.pix_transaction_id as string | null, total);
    if (existente) {
      return NextResponse.json({
        eventoId: evento.id,
        valorCentavos: total,
        conviteCentavos,
        memoriasCentavos: 0,
        incluiMemorias: false,
        reutilizado: true,
        ...existente,
      });
    }
  }

  if (incluirMemorias) {
    await admin.from('evento_memorias_config').update({
      status: 'aguardando_pagamento',
      compra_valor_centavos: MEMORIAS_PRECO_CENTAVOS,
      pix_transaction_id: null,
      pix_txid: null,
      updated_at: new Date().toISOString(),
    }).eq('evento_id', evento.id).neq('status', 'ativo');
  }

  const descricao = conviteCentavos > 0 && memoriasCentavos > 0
    ? `Convite ${evento.slug} + Memórias do Evento`
    : memoriasCentavos > 0
      ? `Memórias do Evento - ${evento.slug}`
      : `Convite ${evento.slug}`;

  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-pix-assistente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      origem: 'conviteria',
      // Continua como conviteria_convite. O webhook decide se precisa apenas
      // publicar, apenas ativar Memórias, ou fazer as duas coisas.
      tipo: 'convite',
      referencia_id: evento.id,
      valor_centavos: total,
      descricao,
    }),
  });

  const pix = (await r.json().catch(() => null)) as {
    success?: boolean;
    error?: string;
    txid?: string;
    transaction_id?: string;
    qrcode?: string;
    copia_e_cola?: string;
  } | null;

  if (!r.ok || !pix?.transaction_id || !pix.copia_e_cola) {
    console.error('Falha ao gerar PIX ConviteIA:', pix);
    return NextResponse.json({ erro: 'Não foi possível gerar o PIX.' }, { status: 502 });
  }

  if (conviteCentavos > 0) {
    await admin.from('eventos').update({ pix_transaction_id: pix.transaction_id }).eq('id', evento.id);
  }
  if (incluirMemorias) {
    await admin.from('evento_memorias_config').update({
      pix_transaction_id: pix.transaction_id,
      pix_txid: pix.txid ?? null,
      updated_at: new Date().toISOString(),
    }).eq('evento_id', evento.id).eq('status', 'aguardando_pagamento');
  }

  return NextResponse.json({
    eventoId: evento.id,
    valorCentavos: total,
    conviteCentavos,
    memoriasCentavos,
    incluiMemorias: incluirMemorias,
    txid: pix.txid,
    transactionId: pix.transaction_id,
    qrcode: pix.qrcode ?? qrDoPix(pix.copia_e_cola),
    copiaECola: pix.copia_e_cola,
  });
}
