import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { calcularSegundoEnvio, processarRodada, type LembreteWhatsApp } from '@/lib/conviteria/whatsapp-servidor';

export const runtime = 'nodejs';
export const maxDuration = 60;

function autorizado(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${segredo}`;
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });

  const admin = adminConviteria();
  const agoraMs = Date.now();
  const { data: candidatos, error } = await admin.from('evento_whatsapp_config')
    .select('evento_id,lembrete_modo,segundo_programado_em')
    .eq('status', 'ativo')
    .not('primeiro_disparo_em', 'is', null)
    .not('lembrete_modo', 'is', null)
    .is('segundo_disparo_em', null)
    .order('segundo_programado_em', { nullsFirst: true })
    .limit(25);

  if (error) {
    console.error('ConviteIA WhatsApp cron:', error);
    return NextResponse.json({ erro: 'Falha ao consultar lembretes.' }, { status: 500 });
  }

  let devido: { eventoId: string; programadoEm: string } | null = null;
  let recalculados = 0;

  // Recalcula a partir da data atual do evento. Assim, se o anfitrião mudou a
  // data depois de comprar o pacote, o lembrete acompanha o convite e não usa
  // um agendamento antigo.
  for (const item of candidatos ?? []) {
    const { data: evento } = await admin.from('eventos')
      .select('data_evento')
      .eq('id', item.evento_id)
      .maybeSingle();
    const programado = calcularSegundoEnvio(
      evento?.data_evento as string | null,
      item.lembrete_modo as LembreteWhatsApp,
    );
    if (!programado) continue;

    if (programado !== item.segundo_programado_em) {
      await admin.from('evento_whatsapp_config').update({ segundo_programado_em: programado }).eq('evento_id', item.evento_id);
      recalculados += 1;
    }

    if (!devido && new Date(programado).getTime() <= agoraMs) {
      devido = { eventoId: item.evento_id as string, programadoEm: programado };
    }
  }

  if (!devido) {
    return NextResponse.json({ ok: true, verificados: candidatos?.length ?? 0, recalculados, processado: null });
  }

  let enviados = 0;
  let falhas = 0;
  let restantes = 0;
  try {
    for (let lote = 0; lote < 8; lote += 1) {
      const r = await processarRodada(devido.eventoId, 2, 40);
      enviados += r.enviados;
      falhas += r.falhas;
      restantes = r.restantes;
      if (r.restantes === 0 || r.processados === 0) break;
    }
    return NextResponse.json({
      ok: true,
      verificados: candidatos?.length ?? 0,
      recalculados,
      processado: { eventoId: devido.eventoId, enviados, falhas, restantes },
    });
  } catch (e: any) {
    console.error('ConviteIA WhatsApp cron evento:', devido.eventoId, e);
    return NextResponse.json({
      ok: false,
      verificados: candidatos?.length ?? 0,
      recalculados,
      processado: { eventoId: devido.eventoId, erro: String(e?.message ?? e) },
    }, { status: 500 });
  }
}
