import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario, texto } from '@/lib/conviteria/gestao-servidor';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId); if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  const [{ data: mesas, error: em }, { data: vinculos, error: ev }, { data: convidados }] = await Promise.all([
    r.admin.from('mesas').select('*').eq('evento_id', eventoId).order('ordem').order('created_at'),
    r.admin.from('mesa_convidados').select('mesa_id,convidado_lista_id').eq('evento_id', eventoId),
    r.admin.from('convidados_lista').select('id,nome,familia_id,status').eq('evento_id', eventoId).order('nome'),
  ]);
  if (em || ev) return NextResponse.json({ erro: 'Não foi possível carregar as mesas.' }, { status: 500 });
  return NextResponse.json({ mesas: mesas ?? [], vinculos: vinculos ?? [], convidados: convidados ?? [] });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as any; const eventoId = texto(b?.eventoId, 80); const acao = texto(b?.acao, 40);
  if (!eventoId || !acao) return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId); if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  if (acao === 'salvar_mesa') {
    const id = texto(b?.id, 80) || null; const nome = texto(b?.nome, 100); const capacidade = Math.max(1, Math.min(100, Number(b?.capacidade) || 8));
    if (!nome) return NextResponse.json({ erro: 'Informe o nome ou número da mesa.' }, { status: 400 });
    if (id) {
      const { count } = await r.admin.from('mesa_convidados').select('*', { count: 'exact', head: true }).eq('evento_id', eventoId).eq('mesa_id', id);
      if ((count ?? 0) > capacidade) return NextResponse.json({ erro: 'A capacidade não pode ficar abaixo do número de pessoas já atribuídas.' }, { status: 400 });
    }
    const dados = { evento_id: eventoId, nome, capacidade, ordem: Number(b?.ordem) || 0, observacoes: texto(b?.observacoes, 500) || null };
    const resp = id
      ? await r.admin.from('mesas').update(dados).eq('evento_id', eventoId).eq('id', id).select('*').single()
      : await r.admin.from('mesas').insert(dados).select('*').single();
    if (resp.error) return NextResponse.json({ erro: 'Não foi possível salvar a mesa.' }, { status: 500 });
    return NextResponse.json({ ok: true, mesa: resp.data });
  }

  if (acao === 'atribuir') {
    const mesaId = texto(b?.mesaId, 80); const convidadoId = texto(b?.convidadoId, 80);
    const [{ data: mesa }, { data: convidado }] = await Promise.all([
      r.admin.from('mesas').select('id,capacidade').eq('evento_id', eventoId).eq('id', mesaId).maybeSingle(),
      r.admin.from('convidados_lista').select('id').eq('evento_id', eventoId).eq('id', convidadoId).maybeSingle(),
    ]);
    if (!mesa || !convidado) return NextResponse.json({ erro: 'Mesa ou convidado inválido.' }, { status: 400 });
    const { count } = await r.admin.from('mesa_convidados').select('*', { count: 'exact', head: true }).eq('evento_id', eventoId).eq('mesa_id', mesaId);
    const { data: atual } = await r.admin.from('mesa_convidados').select('mesa_id').eq('convidado_lista_id', convidadoId).maybeSingle();
    if (atual?.mesa_id !== mesaId && (count ?? 0) >= Number(mesa.capacidade)) return NextResponse.json({ erro: 'Esta mesa já atingiu a capacidade.' }, { status: 400 });
    await r.admin.from('mesa_convidados').delete().eq('convidado_lista_id', convidadoId);
    const { error } = await r.admin.from('mesa_convidados').insert({ evento_id: eventoId, mesa_id: mesaId, convidado_lista_id: convidadoId });
    if (error) return NextResponse.json({ erro: 'Não foi possível atribuir a pessoa.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (acao === 'remover_atribuicao') {
    const convidadoId = texto(b?.convidadoId, 80);
    const { error } = await r.admin.from('mesa_convidados').delete().eq('evento_id', eventoId).eq('convidado_lista_id', convidadoId);
    if (error) return NextResponse.json({ erro: 'Não foi possível remover da mesa.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const u = new URL(req.url); const eventoId = u.searchParams.get('eventoId')?.trim(); const id = u.searchParams.get('id')?.trim();
  if (!eventoId || !id) return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId); if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  const { error } = await r.admin.from('mesas').delete().eq('evento_id', eventoId).eq('id', id);
  if (error) return NextResponse.json({ erro: 'Não foi possível excluir a mesa.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
