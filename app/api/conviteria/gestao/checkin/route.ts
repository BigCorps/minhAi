import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario, extrairTokenQr, texto } from '@/lib/conviteria/gestao-servidor';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId); if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  const [{ data: convidados }, { data: checkins }, { data: familias }] = await Promise.all([
    r.admin.from('convidados_lista').select('id,nome,tipo,status,familia_id,qr_token').eq('evento_id', eventoId).order('nome'),
    r.admin.from('checkins').select('id,convidado_lista_id,familia_id,origem,checked_in_at').eq('evento_id', eventoId).order('checked_in_at', { ascending: false }),
    r.admin.from('convidado_familias').select('id,nome,qr_token').eq('evento_id', eventoId),
  ]);
  const esperados = (convidados ?? []).filter((p: any) => p.status === 'confirmado').length;
  const presentes = (checkins ?? []).length;
  return NextResponse.json({ convidados: convidados ?? [], checkins: checkins ?? [], familias: familias ?? [], resumo: { cadastrados: (convidados ?? []).length, esperados, presentes, faltam: Math.max(0, esperados - presentes) } });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as any; const eventoId = texto(b?.eventoId, 80); const acao = texto(b?.acao, 40);
  if (!eventoId || !acao) return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId); if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  if (acao === 'resolver') {
    const token = extrairTokenQr(String(b?.codigo ?? '')); if (!token) return NextResponse.json({ erro: 'QR Code inválido.' }, { status: 400 });
    const { data: fam } = await r.admin.from('convidado_familias').select('id,nome').eq('evento_id', eventoId).eq('qr_token', token).maybeSingle();
    if (fam) {
      const { data: pessoas } = await r.admin.from('convidados_lista').select('id,nome,tipo,status').eq('evento_id', eventoId).eq('familia_id', fam.id).order('created_at');
      return NextResponse.json({ ok: true, alvo: { tipo: 'familia', token, id: fam.id, nome: fam.nome, pessoas: pessoas ?? [] } });
    }
    const { data: pessoa } = await r.admin.from('convidados_lista').select('id,nome,tipo,status,familia_id').eq('evento_id', eventoId).eq('qr_token', token).maybeSingle();
    if (!pessoa) return NextResponse.json({ erro: 'QR Code não pertence a este evento.' }, { status: 404 });
    return NextResponse.json({ ok: true, alvo: { tipo: 'individual', token, id: pessoa.id, nome: pessoa.nome, pessoas: [pessoa] } });
  }

  if (acao === 'registrar') {
    const token = extrairTokenQr(String(b?.codigo ?? '')); const ids: string[] = Array.isArray(b?.convidadoIds) ? Array.from(new Set<string>(b.convidadoIds.map((x: unknown) => String(x)))).slice(0, 50) : [];
    if (!token || !ids.length) return NextResponse.json({ erro: 'Selecione quem chegou.' }, { status: 400 });
    let familiaId: string | null = null; let origem: 'familia' | 'individual' = 'individual'; let permitidos: string[] = [];
    const { data: fam } = await r.admin.from('convidado_familias').select('id').eq('evento_id', eventoId).eq('qr_token', token).maybeSingle();
    if (fam) {
      familiaId = fam.id as string; origem = 'familia';
      const { data: pessoas } = await r.admin.from('convidados_lista').select('id').eq('evento_id', eventoId).eq('familia_id', familiaId); permitidos = (pessoas ?? []).map((p: any) => p.id);
    } else {
      const { data: p } = await r.admin.from('convidados_lista').select('id,familia_id').eq('evento_id', eventoId).eq('qr_token', token).maybeSingle();
      if (!p) return NextResponse.json({ erro: 'QR Code inválido.' }, { status: 404 }); permitidos = [p.id as string]; familiaId = p.familia_id as string | null;
    }
    if (ids.some((id) => !permitidos.includes(id))) return NextResponse.json({ erro: 'A seleção não corresponde ao QR Code.' }, { status: 400 });
    const linhas = ids.map((id) => ({ evento_id: eventoId, convidado_lista_id: id, familia_id: familiaId, origem }));
    const { error } = await r.admin.from('checkins').upsert(linhas, { onConflict: 'evento_id,convidado_lista_id' });
    if (error) return NextResponse.json({ erro: 'Não foi possível registrar a entrada.' }, { status: 500 });
    return NextResponse.json({ ok: true, total: ids.length });
  }

  if (acao === 'manual') {
    const id = texto(b?.convidadoId, 80);
    const { data: p } = await r.admin.from('convidados_lista').select('id,familia_id').eq('evento_id', eventoId).eq('id', id).maybeSingle();
    if (!p) return NextResponse.json({ erro: 'Convidado inválido.' }, { status: 404 });
    const { error } = await r.admin.from('checkins').upsert({ evento_id: eventoId, convidado_lista_id: id, familia_id: p.familia_id, origem: 'manual' }, { onConflict: 'evento_id,convidado_lista_id' });
    if (error) return NextResponse.json({ erro: 'Não foi possível registrar a entrada.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (acao === 'desfazer') {
    const id = texto(b?.convidadoId, 80);
    const { error } = await r.admin.from('checkins').delete().eq('evento_id', eventoId).eq('convidado_lista_id', id);
    if (error) return NextResponse.json({ erro: 'Não foi possível desfazer.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 });
}
