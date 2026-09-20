import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario, texto } from '@/lib/conviteria/gestao-servidor';
import { adminPublic } from '@/lib/conviteria/servidor';
import {
  calcularSegundoEnvio,
  processarRodada,
  reconciliarCompraWhatsApp,
  resumoWhatsApp,
  WHATSAPP_EVENTO_LIMITE,
  WHATSAPP_EVENTO_PRECO_CENTAVOS,
  type LembreteWhatsApp,
  telefonesPendentesParaTransmissao,
} from '@/lib/conviteria/whatsapp-servidor';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODOS = new Set<LembreteWhatsApp>(['2_meses', '1_mes', '15_dias']);

async function garantirConfig(admin: any, eventoId: string) {
  await admin.from('evento_whatsapp_config').upsert({
    evento_id: eventoId,
    status: 'nao_contratado',
    preco_centavos: WHATSAPP_EVENTO_PRECO_CENTAVOS,
    limite_mensagens: WHATSAPP_EVENTO_LIMITE,
  }, { onConflict: 'evento_id', ignoreDuplicates: true });
}

async function pixPendente(transactionId?: string | null) {
  if (!transactionId) return null;
  const { data } = await adminPublic().from('pix_transactions')
    .select('id,status,pix_code,qr_code_url,expires_at,txid,amount_cents')
    .eq('id', transactionId)
    .maybeSingle();
  if (!data || data.status !== 'pending') return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  await garantirConfig(r.admin, eventoId);
  const resumo = await resumoWhatsApp(eventoId);
  const telefonesTransmissao = await telefonesPendentesParaTransmissao(eventoId);
  const pendente = resumo.config?.status === 'aguardando_pagamento'
    ? await pixPendente(resumo.config.pix_transaction_id)
    : null;

  return NextResponse.json({
    ...resumo,
    telefonesTransmissao,
    precoCentavos: WHATSAPP_EVENTO_PRECO_CENTAVOS,
    limiteMensagens: WHATSAPP_EVENTO_LIMITE,
    pixPendente: pendente ? {
      transactionId: pendente.id,
      copiaECola: pendente.pix_code,
      qrcode: pendente.qr_code_url || (pendente.pix_code ? `/api/qrcode?size=400&no_logo=1&color=%23a04a63&data=${encodeURIComponent(pendente.pix_code)}` : null),
      expiresAt: pendente.expires_at,
    } : null,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  const acao = texto(body?.acao, 40);
  if (!eventoId || !acao) return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });

  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  await garantirConfig(r.admin, eventoId);

  if (acao === 'criar_pix') {
    if (body?.consentimento !== true) {
      return NextResponse.json({ erro: 'Confirme a autorização para envio aos contatos antes de contratar.' }, { status: 400 });
    }
    const modo = MODOS.has(body?.lembreteModo) ? body.lembreteModo as LembreteWhatsApp : null;
    if (!modo) return NextResponse.json({ erro: 'Escolha quando o segundo comunicado será enviado.' }, { status: 400 });

    const atual = await reconciliarCompraWhatsApp(eventoId);
    if (atual?.status === 'ativo') return NextResponse.json({ semCobranca: true, ativo: true });

    const segundo = calcularSegundoEnvio(r.evento.data_evento as string | null, modo);
    if (!segundo) return NextResponse.json({ erro: 'O evento precisa ter uma data válida para programar o lembrete.' }, { status: 400 });
    if (new Date(segundo).getTime() <= Date.now()) {
      return NextResponse.json({ erro: 'Esse prazo de lembrete já passou. Escolha uma opção mais próxima da data do evento.' }, { status: 400 });
    }

    if (atual?.status === 'aguardando_pagamento') {
      const existente = await pixPendente(atual.pix_transaction_id);
      if (existente) {
        await r.admin.from('evento_whatsapp_config').update({
          lembrete_modo: modo,
          segundo_programado_em: segundo,
          consentimento_declarado_em: atual.consentimento_declarado_em ?? new Date().toISOString(),
        }).eq('evento_id', eventoId);
        return NextResponse.json({
          reutilizado: true,
          valorCentavos: WHATSAPP_EVENTO_PRECO_CENTAVOS,
          transactionId: existente.id,
          copiaECola: existente.pix_code,
          qrcode: existente.qr_code_url,
          expiresAt: existente.expires_at,
        });
      }
    }

    const resposta = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gerar-pix-assistente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        origem: 'conviteria',
        tipo: 'presente',
        referencia_id: eventoId,
        valor_centavos: WHATSAPP_EVENTO_PRECO_CENTAVOS,
        descricao: `WhatsApp do Evento - ${r.evento.slug}`,
      }),
      cache: 'no-store',
    });
    const pix = await resposta.json().catch(() => null) as any;
    if (!resposta.ok || !pix?.transaction_id || !pix?.copia_e_cola) {
      console.error('ConviteIA WhatsApp — falha ao gerar PIX', pix);
      return NextResponse.json({ erro: 'Não foi possível gerar o PIX do WhatsApp do Evento.' }, { status: 502 });
    }

    await r.admin.from('evento_whatsapp_config').update({
      status: 'aguardando_pagamento',
      preco_centavos: WHATSAPP_EVENTO_PRECO_CENTAVOS,
      limite_mensagens: WHATSAPP_EVENTO_LIMITE,
      lembrete_modo: modo,
      segundo_programado_em: segundo,
      consentimento_declarado_em: new Date().toISOString(),
      pix_transaction_id: pix.transaction_id,
      pix_txid: pix.txid ?? null,
    }).eq('evento_id', eventoId);

    return NextResponse.json({
      valorCentavos: WHATSAPP_EVENTO_PRECO_CENTAVOS,
      transactionId: pix.transaction_id,
      txid: pix.txid,
      qrcode: pix.qrcode ?? pix.qr_code_url,
      copiaECola: pix.copia_e_cola ?? pix.pix_code,
      expiresAt: pix.expires_at ?? null,
    });
  }

  if (acao === 'agendar') {
    const cfg = await reconciliarCompraWhatsApp(eventoId);
    if (cfg?.status !== 'ativo') return NextResponse.json({ erro: 'Ative o WhatsApp do Evento primeiro.' }, { status: 403 });
    const modo = MODOS.has(body?.lembreteModo) ? body.lembreteModo as LembreteWhatsApp : null;
    if (!modo) return NextResponse.json({ erro: 'Opção de lembrete inválida.' }, { status: 400 });
    const segundo = calcularSegundoEnvio(r.evento.data_evento as string | null, modo);
    if (!segundo || new Date(segundo).getTime() <= Date.now()) {
      return NextResponse.json({ erro: 'Esse prazo de lembrete já passou para a data deste evento.' }, { status: 400 });
    }
    await r.admin.from('evento_whatsapp_config').update({
      lembrete_modo: modo,
      segundo_programado_em: segundo,
    }).eq('evento_id', eventoId);
    return NextResponse.json({ ok: true, segundoProgramadoEm: segundo });
  }

  if (acao === 'enviar_primeiro') {
    try {
      const resultado = await processarRodada(eventoId, 1, 40);
      return NextResponse.json({ ok: true, ...resultado });
    } catch (e: any) {
      return NextResponse.json({ erro: String(e?.message ?? e) }, { status: 400 });
    }
  }

  return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 });
}
