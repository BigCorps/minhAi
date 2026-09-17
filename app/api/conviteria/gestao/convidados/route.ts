import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario, normalizarEmail, normalizarTelefone, texto } from '@/lib/conviteria/gestao-servidor';

export const runtime = 'nodejs';

const LADOS = new Set(['noiva','noivo','ambos','outro']);
const STATUS = new Set(['pendente','confirmado','nao_vai']);

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  const [{ data: familias, error: ef }, { data: convidados, error: ec }, { data: confirmacoes }] = await Promise.all([
    r.admin.from('convidado_familias').select('*').eq('evento_id', eventoId).order('created_at'),
    r.admin.from('convidados_lista').select('*').eq('evento_id', eventoId).order('created_at'),
    r.admin.from('convidados').select('id,nome,email,contato,comparecera,adultos,criancas,acompanhantes,familia_lista_id,convidado_lista_id,created_at,teste_id').eq('evento_id', eventoId).order('created_at', { ascending: false }),
  ]);
  if (ef || ec) return NextResponse.json({ erro: 'Não foi possível carregar os convidados.' }, { status: 500 });
  return NextResponse.json({ familias: familias ?? [], convidados: convidados ?? [], confirmacoes: confirmacoes ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  const acao = texto(body?.acao, 40);
  if (!eventoId || !acao) return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  if (acao === 'salvar_familia') {
    const id = texto(body?.id, 80) || null;
    const nome = texto(body?.nome, 120);
    if (!nome) return NextResponse.json({ erro: 'Informe o nome da família/grupo.' }, { status: 400 });
    const dados = {
      evento_id: eventoId,
      nome,
      telefone: texto(body?.telefone, 40) || null,
      telefone_normalizado: normalizarTelefone(body?.telefone),
      email: texto(body?.email, 180) || null,
      email_normalizado: normalizarEmail(body?.email),
      lado: LADOS.has(body?.lado) ? body.lado : 'ambos',
      max_acompanhantes: Math.max(0, Math.min(50, Number(body?.maxAcompanhantes) || 0)),
      observacoes: texto(body?.observacoes, 1000) || null,
    };
    const q = id
      ? r.admin.from('convidado_familias').update(dados).eq('evento_id', eventoId).eq('id', id).select('*').single()
      : r.admin.from('convidado_familias').insert(dados).select('*').single();
    const { data, error } = await q;
    if (error) return NextResponse.json({ erro: 'Não foi possível salvar a família.' }, { status: 500 });
    return NextResponse.json({ ok: true, familia: data });
  }

  if (acao === 'salvar_convidado') {
    const id = texto(body?.id, 80) || null;
    const nome = texto(body?.nome, 120);
    if (!nome) return NextResponse.json({ erro: 'Informe o nome do convidado.' }, { status: 400 });
    const familiaId = texto(body?.familiaId, 80) || null;
    if (familiaId) {
      const { data: fam } = await r.admin.from('convidado_familias').select('id').eq('evento_id', eventoId).eq('id', familiaId).maybeSingle();
      if (!fam) return NextResponse.json({ erro: 'Família inválida.' }, { status: 400 });
    }
    const dados = {
      evento_id: eventoId,
      familia_id: familiaId,
      nome,
      telefone: texto(body?.telefone, 40) || null,
      telefone_normalizado: normalizarTelefone(body?.telefone),
      email: texto(body?.email, 180) || null,
      email_normalizado: normalizarEmail(body?.email),
      tipo: body?.tipo === 'crianca' ? 'crianca' : 'adulto',
      lado: LADOS.has(body?.lado) ? body.lado : 'ambos',
      observacoes: texto(body?.observacoes, 1000) || null,
      status: STATUS.has(body?.status) ? body.status : 'pendente',
    };
    const q = id
      ? r.admin.from('convidados_lista').update(dados).eq('evento_id', eventoId).eq('id', id).select('*').single()
      : r.admin.from('convidados_lista').insert(dados).select('*').single();
    const { data, error } = await q;
    if (error) return NextResponse.json({ erro: 'Não foi possível salvar o convidado.' }, { status: 500 });
    return NextResponse.json({ ok: true, convidado: data });
  }

  if (acao === 'confirmar_manual') {
    const ids: string[] = Array.isArray(body?.convidadoIds) ? Array.from(new Set<string>(body.convidadoIds.map((x: unknown) => texto(x, 80)).filter((x: string) => Boolean(x)))).slice(0, 50) : [];
    if (!ids.length) return NextResponse.json({ erro: 'Selecione ao menos uma pessoa.' }, { status: 400 });
    const { data: pessoas } = await r.admin.from('convidados_lista').select('id,nome,email,email_normalizado,tipo,familia_id').eq('evento_id', eventoId).in('id', ids);
    if (!pessoas || pessoas.length !== ids.length) return NextResponse.json({ erro: 'Há convidados inválidos na seleção.' }, { status: 400 });
    const familiaIds = [...new Set(pessoas.map((p: any) => p.familia_id).filter(Boolean))];
    const familiaId = familiaIds.length === 1 ? familiaIds[0] : null;
    const principal = pessoas[0] as any;
    const email = principal.email_normalizado || null;
    let existente: any = null;
    if (familiaId) {
      const { data } = await r.admin.from('convidados').select('id').eq('evento_id', eventoId).eq('familia_lista_id', familiaId).is('teste_id', null).maybeSingle();
      existente = data;
    } else if (ids.length === 1) {
      const { data } = await r.admin.from('convidados').select('id').eq('evento_id', eventoId).eq('convidado_lista_id', ids[0]).is('teste_id', null).maybeSingle();
      existente = data;
    } else if (email) {
      const { data } = await r.admin.from('convidados').select('id').eq('evento_id', eventoId).eq('email_normalizado', email).is('teste_id', null).maybeSingle();
      existente = data;
    }
    const acompanhantes = pessoas.slice(1).map((p: any) => p.nome);
    const adultos = pessoas.filter((p: any) => p.tipo !== 'crianca').length;
    const criancas = pessoas.filter((p: any) => p.tipo === 'crianca').length;
    const dados = {
      evento_id: eventoId,
      nome: principal.nome,
      email: principal.email || null,
      contato: principal.email || null,
      comparecera: true,
      adultos,
      criancas,
      acompanhantes,
      familia_lista_id: familiaId,
      convidado_lista_id: familiaId ? null : (ids.length === 1 ? ids[0] : null),
      teste_id: null,
      updated_at: new Date().toISOString(),
    };
    let resp = existente
      ? await r.admin.from('convidados').update(dados).eq('id', existente.id).select('id').single()
      : await r.admin.from('convidados').insert(dados).select('id').single();
    if (resp.error?.code === '23505' && email) {
      resp = await r.admin.from('convidados').update(dados)
        .eq('evento_id', eventoId).eq('email_normalizado', email)
        .select('id').single();
    }
    if (resp.error || !resp.data) return NextResponse.json({ erro: 'Não foi possível registrar a confirmação.' }, { status: 500 });
    await r.admin.from('convidado_confirmacoes_membros').delete().eq('confirmacao_id', resp.data.id);
    await r.admin.from('convidado_confirmacoes_membros').insert(ids.map((id: string) => ({ evento_id: eventoId, confirmacao_id: resp.data.id, convidado_lista_id: id })));
    await r.admin.from('convidados_lista').update({ status: 'confirmado' }).eq('evento_id', eventoId).in('id', ids);
    return NextResponse.json({ ok: true, confirmacaoId: resp.data.id });
  }

  if (acao === 'status') {
    const id = texto(body?.id, 80);
    const status = STATUS.has(body?.status) ? body.status : null;
    if (!id || !status) return NextResponse.json({ erro: 'Status inválido.' }, { status: 400 });
    const { error } = await r.admin.from('convidados_lista').update({ status }).eq('evento_id', eventoId).eq('id', id);
    if (error) return NextResponse.json({ erro: 'Não foi possível alterar o status.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const u = new URL(req.url);
  const eventoId = u.searchParams.get('eventoId')?.trim();
  const tipo = u.searchParams.get('tipo');
  const id = u.searchParams.get('id')?.trim();
  if (!eventoId || !id || !['familia','convidado'].includes(tipo ?? '')) return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });
  if (tipo === 'familia') {
    const { error } = await r.admin.from('convidado_familias').delete().eq('evento_id', eventoId).eq('id', id);
    if (error) return NextResponse.json({ erro: 'Não foi possível excluir a família.' }, { status: 500 });
  } else {
    const { error } = await r.admin.from('convidados_lista').delete().eq('evento_id', eventoId).eq('id', id);
    if (error) return NextResponse.json({ erro: 'Não foi possível excluir o convidado.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
