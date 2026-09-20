import { NextResponse, type NextRequest } from 'next/server';
import {
  exigirEventoDoUsuario,
  normalizarEmail,
  texto,
  variantesTelefoneBusca,
} from '@/lib/conviteria/gestao-servidor';
import {
  membrosProvaveisDaFamilia,
  sugerirPorNome,
  type ConfirmacaoReconciliacao,
  type FamiliaReconciliacao,
  type PessoaReconciliacao,
  type SugestaoReconciliacao,
} from '@/lib/conviteria/reconciliacao-convidados';

export const runtime = 'nodejs';

function telefoneBate(valor: unknown, armazenado: unknown) {
  const alvo = String(armazenado ?? '').trim();
  if (!alvo) return false;
  return variantesTelefoneBusca(String(valor ?? '')).includes(alvo);
}

async function carregar(admin: any, eventoId: string) {
  const [famsR, pessoasR, confsR] = await Promise.all([
    admin.from('convidado_familias')
      .select('id,nome,email_normalizado,telefone_normalizado')
      .eq('evento_id', eventoId),
    admin.from('convidados_lista')
      .select('id,familia_id,nome,email_normalizado,telefone_normalizado,status,rsvp_extra')
      .eq('evento_id', eventoId),
    admin.from('convidados')
      .select('id,nome,email,contato,comparecera,acompanhantes,created_at,familia_lista_id,convidado_lista_id')
      .eq('evento_id', eventoId)
      .is('teste_id', null)
      .is('familia_lista_id', null)
      .is('convidado_lista_id', null)
      .order('created_at'),
  ]);

  if (famsR.error || pessoasR.error || confsR.error) {
    throw new Error('Não foi possível analisar as confirmações antigas.');
  }

  return {
    familias: (famsR.data ?? []) as FamiliaReconciliacao[],
    pessoas: (pessoasR.data ?? []) as PessoaReconciliacao[],
    confirmacoes: (confsR.data ?? []) as ConfirmacaoReconciliacao[],
  };
}

function sugestaoPorContato(
  c: ConfirmacaoReconciliacao,
  familias: FamiliaReconciliacao[],
  pessoas: PessoaReconciliacao[],
): SugestaoReconciliacao | null {
  const email = normalizarEmail(c.email || c.contato);
  const fams = familias.filter((f) =>
    Boolean(email && f.email_normalizado === email)
    || telefoneBate(c.contato, f.telefone_normalizado),
  );
  if (fams.length === 1) {
    return {
      tipo: 'familia',
      alvoId: fams[0].id,
      alvoNome: fams[0].nome,
      membroIds: membrosProvaveisDaFamilia(c, fams[0].id, pessoas),
      confianca: 'alta',
      motivo: 'contato único corresponde ao grupo',
    };
  }

  const pes = pessoas.filter((p) =>
    Boolean(email && p.email_normalizado === email)
    || telefoneBate(c.contato, p.telefone_normalizado),
  );
  if (pes.length !== 1) return null;
  const p = pes[0];
  if (p.familia_id) {
    const familia = familias.find((f) => f.id === p.familia_id);
    if (!familia) return null;
    return {
      tipo: 'familia',
      alvoId: familia.id,
      alvoNome: familia.nome,
      membroIds: membrosProvaveisDaFamilia(c, familia.id, pessoas),
      confianca: 'alta',
      motivo: 'contato único corresponde a um membro deste grupo',
    };
  }
  return {
    tipo: 'individual',
    alvoId: p.id,
    alvoNome: p.nome,
    membroIds: [p.id],
    confianca: 'alta',
    motivo: 'contato único corresponde ao convidado',
  };
}

function analisar(
  confirmacoes: ConfirmacaoReconciliacao[],
  familias: FamiliaReconciliacao[],
  pessoas: PessoaReconciliacao[],
) {
  const itens = confirmacoes.map((c) => ({
    ...c,
    acompanhantes: Array.isArray(c.acompanhantes) ? c.acompanhantes.map(String) : [],
    sugestao: sugestaoPorContato(c, familias, pessoas) ?? sugerirPorNome(c, familias, pessoas),
  }));

  const chavesAltas = itens
    .filter((x) => x.sugestao?.confianca === 'alta')
    .map((x) => `${x.sugestao!.tipo}:${x.sugestao!.alvoId}`);
  const frequencia = new Map<string, number>();
  for (const chave of chavesAltas) frequencia.set(chave, (frequencia.get(chave) ?? 0) + 1);

  const automaticas = itens.filter((x) => {
    const s = x.sugestao;
    if (!s || s.confianca !== 'alta') return false;
    if ((frequencia.get(`${s.tipo}:${s.alvoId}`) ?? 0) !== 1) return false;
    if (x.comparecera !== false && s.tipo === 'familia' && s.membroIds.length === 0) return false;
    return true;
  });

  return { itens, automaticas };
}

async function alvoJaUsado(admin: any, eventoId: string, tipo: 'familia' | 'individual', alvoId: string, ignorarId: string) {
  const q = tipo === 'familia'
    ? admin.from('convidados').select('id').eq('evento_id', eventoId).eq('familia_lista_id', alvoId).is('teste_id', null).neq('id', ignorarId)
    : admin.from('convidados').select('id').eq('evento_id', eventoId).eq('convidado_lista_id', alvoId).is('teste_id', null).neq('id', ignorarId);
  const { data } = await q.limit(1);
  return Boolean(data?.length);
}

async function aplicarVinculo(
  admin: any,
  eventoId: string,
  confirmacaoId: string,
  tipo: 'familia' | 'individual',
  alvoId: string,
  convidadoIds: string[],
) {
  const { data: confirmacao } = await admin.from('convidados')
    .select('id,comparecera,familia_lista_id,convidado_lista_id')
    .eq('evento_id', eventoId)
    .eq('id', confirmacaoId)
    .is('teste_id', null)
    .maybeSingle();
  if (!confirmacao) return { erro: 'Confirmação histórica não encontrada.', status: 404 as const };
  if (confirmacao.familia_lista_id || confirmacao.convidado_lista_id) {
    return { erro: 'Esta confirmação já foi sincronizada.', status: 409 as const };
  }
  if (await alvoJaUsado(admin, eventoId, tipo, alvoId, confirmacaoId)) {
    return { erro: 'Este convidado/grupo já possui outra confirmação vinculada. Revise antes de continuar.', status: 409 as const };
  }

  if (tipo === 'individual') {
    const { data: pessoa } = await admin.from('convidados_lista')
      .select('id,familia_id')
      .eq('evento_id', eventoId)
      .eq('id', alvoId)
      .maybeSingle();
    if (!pessoa || pessoa.familia_id) return { erro: 'Convidado individual inválido.', status: 400 as const };

    const status = confirmacao.comparecera === false ? 'nao_vai' : 'confirmado';
    const atualizado = await admin.from('convidados')
      .update({ convidado_lista_id: alvoId, familia_lista_id: null })
      .eq('id', confirmacaoId);
    if (atualizado.error) return { erro: 'Não foi possível vincular a confirmação.', status: 500 as const };

    await admin.from('convidados_lista').update({ status }).eq('evento_id', eventoId).eq('id', alvoId);
    await admin.from('convidado_confirmacoes_membros').delete().eq('confirmacao_id', confirmacaoId);
    if (status === 'confirmado') {
      await admin.from('convidado_confirmacoes_membros').insert({
        evento_id: eventoId,
        confirmacao_id: confirmacaoId,
        convidado_lista_id: alvoId,
      });
    }
    return { ok: true };
  }

  const [{ data: familia }, { data: membros }] = await Promise.all([
    admin.from('convidado_familias').select('id').eq('evento_id', eventoId).eq('id', alvoId).maybeSingle(),
    admin.from('convidados_lista').select('id,rsvp_extra').eq('evento_id', eventoId).eq('familia_id', alvoId),
  ]);
  if (!familia) return { erro: 'Família/grupo inválido.', status: 400 as const };
  const fixos = (membros ?? []).filter((p: any) => !p.rsvp_extra).map((p: any) => p.id as string);
  if (!fixos.length) return { erro: 'Este grupo ainda não possui membros cadastrados.', status: 400 as const };

  const selecionados = [...new Set(convidadoIds)].filter((id) => fixos.includes(id));
  if (confirmacao.comparecera !== false && !selecionados.length) {
    return { erro: 'Marque ao menos uma pessoa confirmada deste grupo.', status: 400 as const };
  }

  const atualizado = await admin.from('convidados')
    .update({ familia_lista_id: alvoId, convidado_lista_id: null })
    .eq('id', confirmacaoId);
  if (atualizado.error) return { erro: 'Não foi possível vincular a confirmação.', status: 500 as const };

  await admin.from('convidado_confirmacoes_membros').delete().eq('confirmacao_id', confirmacaoId);
  await admin.from('convidados_lista').update({ status: 'nao_vai' }).eq('evento_id', eventoId).in('id', fixos);

  if (confirmacao.comparecera !== false && selecionados.length) {
    await admin.from('convidados_lista').update({ status: 'confirmado' }).eq('evento_id', eventoId).in('id', selecionados);
    await admin.from('convidado_confirmacoes_membros').insert(
      selecionados.map((id) => ({
        evento_id: eventoId,
        confirmacao_id: confirmacaoId,
        convidado_lista_id: id,
      })),
    );
  }
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  try {
    const dados = await carregar(r.admin, eventoId);
    const analise = analisar(dados.confirmacoes, dados.familias, dados.pessoas);
    return NextResponse.json({
      pendentes: analise.itens.length,
      automaticasSeguras: analise.automaticas.length,
      itens: analise.itens,
    });
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || 'Não foi possível analisar as confirmações.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  const acao = texto(body?.acao, 30);
  if (!eventoId || !acao) return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  if (acao === 'auto') {
    try {
      const dados = await carregar(r.admin, eventoId);
      const analise = analisar(dados.confirmacoes, dados.familias, dados.pessoas);
      let aplicadas = 0;
      for (const item of analise.automaticas) {
        const s = item.sugestao!;
        const resultado = await aplicarVinculo(r.admin, eventoId, item.id, s.tipo, s.alvoId, s.membroIds);
        if (!('erro' in resultado)) aplicadas += 1;
      }
      return NextResponse.json({ ok: true, aplicadas, restantes: Math.max(0, analise.itens.length - aplicadas) });
    } catch (e: any) {
      return NextResponse.json({ erro: e?.message || 'Não foi possível sincronizar automaticamente.' }, { status: 500 });
    }
  }

  if (acao === 'aplicar') {
    const confirmacaoId = texto(body?.confirmacaoId, 80);
    const tipo = body?.tipo === 'familia' ? 'familia' : body?.tipo === 'individual' ? 'individual' : null;
    const alvoId = texto(body?.alvoId, 80);
    const convidadoIds = Array.isArray(body?.convidadoIds)
      ? Array.from(new Set<string>(body.convidadoIds.map((x: unknown) => texto(x, 80)).filter(Boolean))).slice(0, 50)
      : [];
    if (!confirmacaoId || !tipo || !alvoId) {
      return NextResponse.json({ erro: 'Escolha a família ou convidado correspondente.' }, { status: 400 });
    }
    const resultado = await aplicarVinculo(r.admin, eventoId, confirmacaoId, tipo, alvoId, convidadoIds);
    if ('erro' in resultado) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
    return NextResponse.json(resultado);
  }

  return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 });
}
