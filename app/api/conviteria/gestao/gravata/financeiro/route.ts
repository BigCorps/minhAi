import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario } from '@/lib/conviteria/gestao-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });

  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const [{ data: config }, { data: resumo }, { data: recentes }] = await Promise.all([
    r.admin.from('evento_gravata_config')
      .select('status,nome_acao,mostrar_valor_individual')
      .eq('evento_id', eventoId)
      .maybeSingle(),
    r.admin.rpc('resumo_hora_gravata_evento', { p_evento_id: eventoId }),
    r.admin.from('evento_gravata_contribuicoes')
      .select('id,nome,anonimo,origem,valor_centavos,taxa_centavos,liquido_centavos,pago_em,created_at')
      .eq('evento_id', eventoId)
      .eq('status', 'pago')
      .order('pago_em', { ascending: false })
      .limit(20),
  ]);

  const totais = Array.isArray(resumo) ? resumo[0] : resumo;
  const linhas = recentes ?? [];
  const brutoCentavos = Number(totais?.bruto_centavos ?? 0);
  const taxaCentavos = Number(totais?.taxa_centavos ?? 0);
  const liquidoCentavos = Number(totais?.liquido_centavos ?? 0);
  const quantidade = Number(totais?.quantidade ?? 0);

  return NextResponse.json({
    ativo: config?.status === 'ativo',
    nomeAcao: config?.nome_acao || 'Hora da Gravata',
    totais: {
      quantidade,
      brutoCentavos,
      taxaCentavos,
      liquidoCentavos,
    },
    pagamentos: linhas.slice(0, 20).map((x: any) => ({
      id: x.id,
      nome: x.anonimo ? 'Anônimo' : (x.nome || 'Convidado'),
      anonimo: x.anonimo === true,
      origem: x.origem || 'link',
      valorCentavos: Number(x.valor_centavos ?? 0),
      taxaCentavos: Number(x.taxa_centavos ?? 0),
      liquidoCentavos: Number(x.liquido_centavos ?? 0),
      pagoEm: x.pago_em ?? x.created_at,
    })),
  });
}
