import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, adminPublic } from '@/lib/conviteria/servidor';
import { PLANOS } from '@/lib/conviteria/precos';
import { MEMORIAS_PRECO_CENTAVOS } from '@/lib/conviteria/memorias-config';
import { garantirPacote, pacoteDoEvento } from '@/lib/conviteria/memorias-servidor';
import {
  WHATSAPP_EVENTO_LIMITE,
  WHATSAPP_EVENTO_PRECO_CENTAVOS,
} from '@/lib/conviteria/whatsapp-servidor';

export const runtime = 'nodejs';

function qrDoPix(copiaECola: string) {
  const logo = 'https://conviteia.com/brands/convite/icone-512.png';
  return `/api/qrcode?size=400&data=${encodeURIComponent(copiaECola)}&color=%23a04a63&logo_url=${encodeURIComponent(logo)}`;
}

async function pixPendente(transactionId: string | null | undefined) {
  if (!transactionId) return null;
  const { data } = await adminPublic()
    .from('pix_transactions')
    .select('id,txid,pix_code,status,expires_at,amount_cents')
    .eq('id', transactionId)
    .maybeSingle();

  if (!data || data.status !== 'pending') return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  if (!data.pix_code || data.pix_code === 'pending') return null;
  return data;
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
    incluirWhatsApp?: boolean;
    consentimentoWhatsApp?: boolean;
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

  const { data: whatsappAtual } = await admin.from('evento_whatsapp_config')
    .select('*')
    .eq('evento_id', evento.id)
    .maybeSingle();
  const whatsappAtivo = whatsappAtual?.status === 'ativo';

  const incluirMemorias = Boolean(corpo.incluirMemorias) && !memoriasAtivas;
  const incluirWhatsApp = Boolean(corpo.incluirWhatsApp) && !whatsappAtivo;
  if (incluirWhatsApp && corpo.consentimentoWhatsApp !== true) {
    return NextResponse.json({ erro: 'Confirme a autorização para envio de mensagens antes de adicionar o WhatsApp do Evento.' }, { status: 400 });
  }

  const memoriasCentavos = incluirMemorias ? MEMORIAS_PRECO_CENTAVOS : 0;
  const whatsappCentavos = incluirWhatsApp ? WHATSAPP_EVENTO_PRECO_CENTAVOS : 0;
  const total = conviteCentavos + memoriasCentavos + whatsappCentavos;

  if (total === 0) {
    return NextResponse.json({
      semCobranca: true,
      valorCentavos: 0,
      publicado: Boolean(evento.publicado_em),
      memoriasAtivas,
      whatsappAtivo,
    });
  }

  // Um único PIX pendente sempre vence novas escolhas. Isso evita que duas abas
  // gerem cobranças diferentes para o mesmo convite enquanto uma delas ainda é pagável.
  const candidatos = Array.from(new Set([
    evento.pix_transaction_id as string | null,
    pacote?.status === 'aguardando_pagamento' ? pacote.pix_transaction_id : null,
    whatsappAtual?.status === 'aguardando_pagamento' ? whatsappAtual.pix_transaction_id : null,
  ].filter(Boolean) as string[]));

  for (const transactionId of candidatos) {
    const existente = await pixPendente(transactionId);
    if (!existente) continue;

    const incluiConviteExistente = conviteCentavos > 0 && evento.pix_transaction_id === transactionId;
    const incluiMemoriasExistente = pacote?.status === 'aguardando_pagamento' && pacote.pix_transaction_id === transactionId;
    const incluiWhatsAppExistente = whatsappAtual?.status === 'aguardando_pagamento' && whatsappAtual.pix_transaction_id === transactionId;

    if (conviteCentavos > 0 && !incluiConviteExistente) {
      return NextResponse.json({ erro: 'Já existe outro PIX válido para este evento. Conclua ou aguarde a expiração antes de publicar o convite.' }, { status: 409 });
    }
    if (incluirMemorias && !incluiMemoriasExistente) {
      return NextResponse.json({ erro: 'Já existe um PIX válido sem Memórias. Conclua esse pagamento e ative Memórias depois pela Gestão do Evento.' }, { status: 409 });
    }
    if (incluirWhatsApp && !incluiWhatsAppExistente) {
      return NextResponse.json({ erro: 'Já existe um PIX válido sem WhatsApp do Evento. Conclua esse pagamento e ative o WhatsApp depois em Gestão → Comunicações.' }, { status: 409 });
    }

    return NextResponse.json({
      eventoId: evento.id,
      valorCentavos: Number(existente.amount_cents),
      conviteCentavos: incluiConviteExistente ? avulso.centavos : 0,
      memoriasCentavos: incluiMemoriasExistente ? MEMORIAS_PRECO_CENTAVOS : 0,
      whatsappCentavos: incluiWhatsAppExistente ? WHATSAPP_EVENTO_PRECO_CENTAVOS : 0,
      incluiMemorias: incluiMemoriasExistente,
      incluiWhatsApp: incluiWhatsAppExistente,
      reutilizado: true,
      transactionId: existente.id,
      txid: existente.txid,
      copiaECola: existente.pix_code,
      qrcode: qrDoPix(existente.pix_code),
    });
  }

  if (incluirMemorias) pacote = pacote ?? await garantirPacote(evento.id as string);

  const partesDescricao = [`Convite ${evento.slug}`];
  if (memoriasCentavos > 0) partesDescricao.push('Memórias do Evento');
  if (whatsappCentavos > 0) partesDescricao.push('WhatsApp do Evento');
  const descricao = partesDescricao.join(' + ');

  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-pix-assistente`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      origem: 'conviteria',
      // O webhook de convite também ativa os adicionais ligados ao mesmo PIX.
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
    expires_at?: string;
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
      status: 'aguardando_pagamento',
      compra_valor_centavos: MEMORIAS_PRECO_CENTAVOS,
      pix_transaction_id: pix.transaction_id,
      pix_txid: pix.txid ?? null,
      updated_at: new Date().toISOString(),
    }).eq('evento_id', evento.id).neq('status', 'ativo');
  }

  if (incluirWhatsApp) {
    await admin.from('evento_whatsapp_config').upsert({
      evento_id: evento.id,
      status: 'aguardando_pagamento',
      preco_centavos: WHATSAPP_EVENTO_PRECO_CENTAVOS,
      limite_mensagens: WHATSAPP_EVENTO_LIMITE,
      consentimento_declarado_em: new Date().toISOString(),
      pix_transaction_id: pix.transaction_id,
      pix_txid: pix.txid ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'evento_id' });
  }

  return NextResponse.json({
    eventoId: evento.id,
    valorCentavos: total,
    conviteCentavos,
    memoriasCentavos,
    whatsappCentavos,
    incluiMemorias,
    incluiWhatsApp,
    txid: pix.txid,
    transactionId: pix.transaction_id,
    qrcode: pix.qrcode ?? qrDoPix(pix.copia_e_cola),
    copiaECola: pix.copia_e_cola,
    expiresAt: pix.expires_at ?? null,
  });
}
