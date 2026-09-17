import { NextResponse, type NextRequest } from 'next/server';
import type { ConviteConfig, InformacaoItem, ProgramacaoItem, SecaoConfig } from '@/lib/conviteria/tipos';
import { exigirEventoDoUsuario, texto } from '@/lib/conviteria/gestao-servidor';

export const runtime = 'nodejs';

function urlHttp(valor: unknown) {
  const s = String(valor ?? '').trim();
  if (!s) return undefined;
  try { const u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.toString().slice(0, 1000) : undefined; }
  catch { return undefined; }
}

function normalizarProgramacao(valor: unknown): ProgramacaoItem[] {
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, 30).map((x: any, i) => ({
    id: texto(x?.id, 80) || `programacao-${i + 1}`,
    horario: texto(x?.horario, 20),
    titulo: texto(x?.titulo, 120),
    descricao: texto(x?.descricao, 260) || undefined,
  })).filter((x) => x.titulo);
}

function normalizarInformacoes(valor: unknown): InformacaoItem[] {
  const tipos = new Set(['traje','criancas','estacionamento','transporte','hospedagem','fotos','outro']);
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, 30).map((x: any, i) => ({
    id: texto(x?.id, 80) || `informacao-${i + 1}`,
    tipo: (tipos.has(x?.tipo) ? x.tipo : 'outro') as InformacaoItem['tipo'],
    titulo: texto(x?.titulo, 120),
    texto: texto(x?.texto, 500),
  })).filter((x) => x.titulo && x.texto);
}

function assegurarSecao(secoes: SecaoConfig[], tipo: 'programacao' | 'informacoes', ativo: boolean) {
  const existente = secoes.find((s) => s.tipo === tipo);
  if (existente) return secoes.map((s) => s.tipo === tipo ? { ...s, ativo } : s);
  const maior = secoes.reduce((m, s) => Math.max(m, Number(s.ordem) || 0), 0);
  return [...secoes, { tipo, ordem: maior + (tipo === 'programacao' ? 5 : 6), ativo, config: {} }];
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  const { data: gestao } = await r.admin.from('evento_gestao_config').select('rsvp_restrito,qr_modo').eq('evento_id', eventoId).maybeSingle();
  const cfg = r.evento.config as ConviteConfig;
  return NextResponse.json({
    evento: { id: r.evento.id, slug: r.evento.slug, publicado: !!r.evento.publicado_em, config: cfg },
    gestao: { rsvpRestrito: !!gestao?.rsvp_restrito, qrModo: gestao?.qr_modo === 'individual' ? 'individual' : 'familia' },
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const cfgAtual = (r.evento.config ?? {}) as ConviteConfig;
  const programacao = normalizarProgramacao(body?.programacao);
  const informacoes = normalizarInformacoes(body?.informacoes);
  let secoes = Array.isArray(cfgAtual.secoes) ? [...cfgAtual.secoes] : [];
  secoes = assegurarSecao(secoes, 'programacao', programacao.length > 0);
  secoes = assegurarSecao(secoes, 'informacoes', informacoes.length > 0);

  const cfgNovo: ConviteConfig = {
    ...cfgAtual,
    programacao,
    informacoes,
    listaPresentesExternaUrl: urlHttp(body?.listaPresentesExternaUrl),
    secoes,
  };

  const { error: e1 } = await r.admin.from('eventos').update({ config: cfgNovo, updated_at: new Date().toISOString() }).eq('id', eventoId);
  if (e1) return NextResponse.json({ erro: 'Não foi possível salvar os detalhes.' }, { status: 500 });

  const secProg = secoes.find((s) => s.tipo === 'programacao')!;
  const secInfo = secoes.find((s) => s.tipo === 'informacoes')!;
  const { error: e2 } = await r.admin.from('evento_secoes').upsert([
    { evento_id: eventoId, tipo: 'programacao', ordem: secProg.ordem, ativo: secProg.ativo, config: secProg.config ?? {} },
    { evento_id: eventoId, tipo: 'informacoes', ordem: secInfo.ordem, ativo: secInfo.ativo, config: secInfo.config ?? {} },
  ], { onConflict: 'evento_id,tipo' });
  if (e2) return NextResponse.json({ erro: 'Os dados foram salvos, mas as novas seções não foram sincronizadas.' }, { status: 500 });

  const { error: e3 } = await r.admin.from('evento_gestao_config').upsert({
    evento_id: eventoId,
    rsvp_restrito: !!body?.rsvpRestrito,
    qr_modo: body?.qrModo === 'individual' ? 'individual' : 'familia',
  }, { onConflict: 'evento_id' });
  if (e3) return NextResponse.json({ erro: 'Os detalhes foram salvos, mas a configuração do RSVP não.' }, { status: 500 });

  return NextResponse.json({ ok: true, config: cfgNovo });
}
