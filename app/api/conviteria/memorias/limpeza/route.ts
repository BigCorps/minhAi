import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, adminPublic } from '@/lib/conviteria/servidor';
import { MEMORIAS_BUCKET } from '@/lib/conviteria/memorias-config';
import { limparDadosDoTeste } from '@/lib/conviteria/teste-servidor';

export const runtime = 'nodejs';
export const maxDuration = 60;

function autorizado(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${segredo}`;
}

async function removerCaminhos(caminhos: string[]) {
  const storage = adminPublic().storage.from(MEMORIAS_BUCKET);
  for (let i = 0; i < caminhos.length; i += 100) {
    const lote = caminhos.slice(i, i + 100);
    const { error } = await storage.remove(lote);
    if (error) throw error;
  }
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  const admin = adminConviteria();
  const agora = new Date().toISOString();
  let eventosExpirados = 0;
  let reservasLimpas = 0;
  let testesLimpos = 0;

  // Retenção normal de Memórias compradas: regra já existente, preservada.
  const { data: pacotes } = await admin.from('evento_memorias_config')
    .select('evento_id')
    .eq('status', 'ativo')
    .lt('expira_em', agora)
    .limit(30);

  for (const pacote of pacotes ?? []) {
    const { data: midias } = await admin.from('evento_memorias')
      .select('id,storage_path')
      .eq('evento_id', pacote.evento_id)
      .neq('status', 'excluido');
    const caminhos = (midias ?? []).map((m: any) => m.storage_path as string);
    try {
      if (caminhos.length) await removerCaminhos(caminhos);
      await admin.from('evento_memorias').update({ status: 'excluido', updated_at: agora })
        .eq('evento_id', pacote.evento_id).neq('status', 'excluido');
      await admin.from('evento_memorias_config').update({ status: 'expirado', updated_at: agora })
        .eq('evento_id', pacote.evento_id).eq('status', 'ativo');
      eventosExpirados++;
    } catch (e) {
      console.error('Falha ao limpar evento de Memórias:', pacote.evento_id, e);
    }
  }

  // Trial expirado: o acesso público já é bloqueado pelo timestamp. Este trecho
  // apenas remove os dados de demonstração e devolve Memórias ao estado normal.
  const { data: testes } = await admin.from('evento_testes')
    .select('id,evento_id')
    .is('convertido_em', null)
    .is('limpo_em', null)
    .lt('expira_em', agora)
    .limit(30);

  for (const teste of testes ?? []) {
    try {
      if (teste.evento_id) {
        await limparDadosDoTeste({ eventoId: teste.evento_id as string, testeId: teste.id as string });
      } else {
        await admin.from('evento_testes').update({ limpo_em: agora, updated_at: agora }).eq('id', teste.id);
      }
      testesLimpos++;
    } catch (e) {
      console.error('Falha ao limpar trial ConviteIA:', teste.id, e);
    }
  }

  const { data: reservas } = await admin.from('evento_memorias')
    .select('id,storage_path')
    .eq('status', 'reservado')
    .lt('reserva_expira_em', agora)
    .limit(200);

  for (const r of reservas ?? []) {
    try { await removerCaminhos([r.storage_path]); } catch { /* objeto pode nem ter sido enviado */ }
    await admin.from('evento_memorias').update({ status: 'excluido', updated_at: agora }).eq('id', r.id);
    reservasLimpas++;
  }

  return NextResponse.json({ ok: true, eventosExpirados, testesLimpos, reservasLimpas });
}
