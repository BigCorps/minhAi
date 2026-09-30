import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { processarDisparoGravata } from '@/lib/conviteria/gravata-whatsapp-servidor';

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
  const agora = new Date().toISOString();
  const { data: candidatos, error } = await admin.from('evento_gravata_config')
    .select('evento_id,whatsapp_programado_em')
    .eq('status', 'ativo')
    .not('whatsapp_programado_em', 'is', null)
    .is('whatsapp_disparo_em', null)
    .lte('whatsapp_programado_em', agora)
    .order('whatsapp_programado_em', { ascending: true })
    .limit(5);

  if (error) {
    console.error('ConviteIA Hora da Gravata cron:', error);
    return NextResponse.json({ erro: 'Falha ao consultar os disparos.' }, { status: 500 });
  }

  const resultados: Array<Record<string, unknown>> = [];
  for (const item of candidatos ?? []) {
    let enviados = 0;
    let falhas = 0;
    let restantes = 0;
    try {
      for (let lote = 0; lote < 15; lote += 1) {
        const r = await processarDisparoGravata(String(item.evento_id), 40);
        enviados += Number(r.enviados ?? 0);
        falhas += Number(r.falhas ?? 0);
        restantes = Number(r.restantes ?? 0);
        if ((r as any).cancelado || r.restantes === 0 || r.processados === 0) break;
      }
      resultados.push({ eventoId: item.evento_id, enviados, falhas, restantes });
    } catch (e: any) {
      const mensagem = String(e?.message ?? e).slice(0, 500);
      await admin.from('evento_gravata_config').update({
        whatsapp_erro: mensagem,
        updated_at: new Date().toISOString(),
      }).eq('evento_id', item.evento_id);
      resultados.push({ eventoId: item.evento_id, erro: mensagem });
    }
  }

  return NextResponse.json({ ok: true, verificados: candidatos?.length ?? 0, resultados });
}
