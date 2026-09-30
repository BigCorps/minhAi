import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria, buscarEventoAcessivelPorId } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const slug = u.searchParams.get('slug')?.trim().toLowerCase();
  if (!slug) return NextResponse.json({ erro: 'Evento não informado.' }, { status: 400 });

  const admin = adminConviteria();
  const { data: evento } = await admin
    .from('eventos')
    .select('id,slug,arquivado')
    .eq('slug', slug)
    .eq('arquivado', false)
    .maybeSingle();

  if (!evento || !(await buscarEventoAcessivelPorId(evento.id as string))) {
    return NextResponse.json({ erro: 'Evento indisponível.' }, { status: 404 });
  }

  const { data: config } = await admin
    .from('evento_gravata_config')
    .select('status,nome_acao,mostrar_valor_individual,mostrar_total,meta_centavos')
    .eq('evento_id', evento.id)
    .maybeSingle();

  if (!config || config.status !== 'ativo') {
    return NextResponse.json({ ativo: false, contribuicoes: [] });
  }

  const { data: linhas, error } = await admin
    .from('evento_gravata_contribuicoes')
    .select('id,nome,anonimo,valor_centavos,pago_em')
    .eq('evento_id', evento.id)
    .eq('status', 'pago')
    .not('pago_em', 'is', null)
    .order('pago_em', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ erro: 'Não foi possível carregar as contribuições ao vivo.' }, { status: 500 });
  }

  let totalCentavos: number | null = null;
  let percentualMeta: number | null = null;
  const metaCentavos = config.meta_centavos == null ? null : Number(config.meta_centavos);

  if (config.mostrar_total) {
    const { data: resumo } = await admin.rpc('resumo_hora_gravata_evento', {
      p_evento_id: evento.id,
    });
    const linha = Array.isArray(resumo) ? resumo[0] : resumo;
    totalCentavos = Number(linha?.bruto_centavos ?? 0);
    if (metaCentavos && metaCentavos > 0) {
      percentualMeta = Math.min(100, (totalCentavos / metaCentavos) * 100);
    }
  }

  return NextResponse.json({
    ativo: true,
    nomeAcao: String(config.nome_acao || 'Hora da Gravata'),
    mostrarValorIndividual: Boolean(config.mostrar_valor_individual),
    totalCentavos,
    metaCentavos: config.mostrar_total ? metaCentavos : null,
    percentualMeta,
    contribuicoes: [...(linhas ?? [])].reverse().map((c: any) => ({
      id: c.id,
      nome: c.anonimo ? 'Convidado' : (String(c.nome || '').trim() || 'Convidado'),
      valorCentavos: config.mostrar_valor_individual ? Number(c.valor_centavos) : null,
      pagoEm: c.pago_em,
    })),
  });
}
