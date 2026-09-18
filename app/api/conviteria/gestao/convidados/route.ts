import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario, normalizarEmail, normalizarTelefone, texto } from '@/lib/conviteria/gestao-servidor';

export const runtime = 'nodejs';

const LADOS = new Set(['noiva','noivo','ambos','outro']);
const STATUS = new Set(['pendente','confirmado','nao_vai']);
const MAX_IMPORTACAO = 600;

function nomeChave(valor: unknown) {
  return texto(valor, 120)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function dependentesDo(valor: unknown) {
  const itens = Array.isArray(valor)
    ? valor
    : String(valor ?? '').split('|');
  const vistos = new Set<string>();
  const nomes: string[] = [];
  for (const item of itens) {
    const nome = texto(item, 120);
    if (!nome) continue;
    const k = nomeChave(nome);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    nomes.push(nome);
    if (nomes.length >= 20) break;
  }
  return nomes;
}

async function sincronizarConfirmacoes(admin: any, eventoId: string) {
  const [famsR, pessoasR, confsR, membrosR] = await Promise.all([
    admin.from('convidado_familias').select('id,nome,email_normalizado,telefone_normalizado').eq('evento_id', eventoId),
    admin.from('convidados_lista').select('id,familia_id,nome,email_normalizado,telefone_normalizado,status').eq('evento_id', eventoId),
    admin.from('convidados').select('id,nome,email,contato,comparecera,acompanhantes,familia_lista_id,convidado_lista_id').eq('evento_id', eventoId).is('teste_id', null),
    admin.from('convidado_confirmacoes_membros').select('confirmacao_id,convidado_lista_id').eq('evento_id', eventoId),
  ]);

  const familias = famsR.data ?? [];
  const pessoas = pessoasR.data ?? [];
  const confirmacoes = confsR.data ?? [];
  const membros = membrosR.data ?? [];
  let vinculadas = 0;
  let statusAtualizados = 0;

  const porEmailFamilia = new Map(familias.filter((f: any) => f.email_normalizado).map((f: any) => [f.email_normalizado, f]));
  const porTelFamilia = new Map(familias.filter((f: any) => f.telefone_normalizado).map((f: any) => [f.telefone_normalizado, f]));
  const porEmailPessoa = new Map(pessoas.filter((p: any) => p.email_normalizado).map((p: any) => [p.email_normalizado, p]));
  const porTelPessoa = new Map(pessoas.filter((p: any) => p.telefone_normalizado).map((p: any) => [p.telefone_normalizado, p]));

  for (const c of confirmacoes as any[]) {
    let familiaId = c.familia_lista_id as string | null;
    let pessoaId = c.convidado_lista_id as string | null;

    if (!familiaId && !pessoaId) {
      const email = normalizarEmail(c.email || c.contato);
      const tel = normalizarTelefone(c.contato);
      const fam = (email && porEmailFamilia.get(email)) || (tel && porTelFamilia.get(tel));
      const pes = !fam ? ((email && porEmailPessoa.get(email)) || (tel && porTelPessoa.get(tel))) : null;

      if (fam) {
        familiaId = (fam as any).id;
        await admin.from('convidados').update({ familia_lista_id: familiaId }).eq('id', c.id);
        vinculadas += 1;
      } else if (pes) {
        pessoaId = (pes as any).id;
        await admin.from('convidados').update({ convidado_lista_id: pessoaId }).eq('id', c.id);
        vinculadas += 1;
      }
    }

    const novoStatus = c.comparecera === false ? 'nao_vai' : 'confirmado';

    if (pessoaId) {
      await admin.from('convidados_lista').update({ status: novoStatus }).eq('evento_id', eventoId).eq('id', pessoaId);
      statusAtualizados += 1;
      continue;
    }

    if (familiaId) {
      const idsRegistrados = membros
        .filter((m: any) => m.confirmacao_id === c.id)
        .map((m: any) => m.convidado_lista_id);

      if (idsRegistrados.length) {
        await admin.from('convidados_lista').update({ status: novoStatus }).eq('evento_id', eventoId).in('id', idsRegistrados);
        statusAtualizados += idsRegistrados.length;
        continue;
      }

      const nomesConfirmados = new Set([
        nomeChave(c.nome),
        ...(Array.isArray(c.acompanhantes) ? c.acompanhantes.map(nomeChave) : []),
      ].filter(Boolean));
      const ids = pessoas
        .filter((p: any) => p.familia_id === familiaId && nomesConfirmados.has(nomeChave(p.nome)))
        .map((p: any) => p.id);
      if (ids.length) {
        await admin.from('convidados_lista').update({ status: novoStatus }).eq('evento_id', eventoId).in('id', ids);
        statusAtualizados += ids.length;
      }
    }
  }

  return { vinculadas, statusAtualizados, confirmacoes: confirmacoes.length };
}

async function registrarConfirmacaoManual(r: any, eventoId: string, ids: string[]) {
  const { data: pessoas } = await r.admin
    .from('convidados_lista')
    .select('id,nome,email,email_normalizado,telefone,tipo,familia_id')
    .eq('evento_id', eventoId)
    .in('id', ids);
  if (!pessoas || pessoas.length !== ids.length) {
    return { erro: 'Há convidados inválidos na seleção.', status: 400 as const };
  }

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
    contato: principal.email || principal.telefone || null,
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
  if (resp.error || !resp.data) return { erro: 'Não foi possível registrar a confirmação.', status: 500 as const };

  await r.admin.from('convidado_confirmacoes_membros').delete().eq('confirmacao_id', resp.data.id);
  await r.admin.from('convidado_confirmacoes_membros').insert(
    ids.map((id: string) => ({ evento_id: eventoId, confirmacao_id: resp.data.id, convidado_lista_id: id })),
  );
  await r.admin.from('convidados_lista').update({ status: 'confirmado' }).eq('evento_id', eventoId).in('id', ids);
  return { ok: true, confirmacaoId: resp.data.id };
}

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

  if (acao === 'importar_csv') {
    const linhas = Array.isArray(body?.linhas) ? body.linhas.slice(0, MAX_IMPORTACAO) : [];
    if (!linhas.length) return NextResponse.json({ erro: 'O CSV não possui convidados válidos.' }, { status: 400 });

    let familiasCriadas = 0;
    let convidadosCriados = 0;
    let atualizados = 0;
    let ignorados = 0;

    for (const linha of linhas) {
      const nome = texto(linha?.nome, 120);
      if (!nome) { ignorados += 1; continue; }
      const deps = dependentesDo(linha?.dependentes);
      const email = texto(linha?.email, 180) || null;
      const telefone = texto(linha?.telefone, 40) || null;
      const emailN = normalizarEmail(email);
      const telN = normalizarTelefone(telefone);

      if (deps.length > 0) {
        let familia: any = null;
        if (emailN) {
          const { data } = await r.admin.from('convidado_familias').select('*').eq('evento_id', eventoId).eq('email_normalizado', emailN).limit(1).maybeSingle();
          familia = data;
        }
        if (!familia && telN) {
          const { data } = await r.admin.from('convidado_familias').select('*').eq('evento_id', eventoId).eq('telefone_normalizado', telN).limit(1).maybeSingle();
          familia = data;
        }
        if (!familia) {
          const { data } = await r.admin.from('convidado_familias').select('*').eq('evento_id', eventoId).ilike('nome', `Família / grupo de ${nome}`).limit(1).maybeSingle();
          familia = data;
        }

        const dadosFamilia = {
          evento_id: eventoId,
          nome: `Família / grupo de ${nome}`.slice(0, 120),
          telefone,
          telefone_normalizado: telN,
          email,
          email_normalizado: emailN,
          lado: 'ambos',
          max_acompanhantes: deps.length,
        };

        if (familia) {
          const { data } = await r.admin.from('convidado_familias').update(dadosFamilia).eq('id', familia.id).select('*').single();
          familia = data ?? familia;
          atualizados += 1;
        } else {
          const { data, error } = await r.admin.from('convidado_familias').insert(dadosFamilia).select('*').single();
          if (error || !data) { ignorados += 1; continue; }
          familia = data;
          familiasCriadas += 1;
        }

        const { data: existentes } = await r.admin.from('convidados_lista').select('*').eq('evento_id', eventoId).eq('familia_id', familia.id);
        const lista = existentes ?? [];
        let principal = lista.find((p: any) => (emailN && p.email_normalizado === emailN) || (telN && p.telefone_normalizado === telN) || nomeChave(p.nome) === nomeChave(nome));
        const dadosPrincipal = {
          evento_id: eventoId,
          familia_id: familia.id,
          nome,
          telefone,
          telefone_normalizado: telN,
          email,
          email_normalizado: emailN,
          tipo: 'adulto',
          lado: 'ambos',
          status: principal?.status ?? 'pendente',
        };
        if (principal) {
          await r.admin.from('convidados_lista').update(dadosPrincipal).eq('id', principal.id);
          atualizados += 1;
        } else {
          const { data } = await r.admin.from('convidados_lista').insert(dadosPrincipal).select('*').single();
          if (data) { principal = data; convidadosCriados += 1; }
        }

        for (const dep of deps) {
          if (lista.some((p: any) => nomeChave(p.nome) === nomeChave(dep))) continue;
          const { error } = await r.admin.from('convidados_lista').insert({
            evento_id: eventoId,
            familia_id: familia.id,
            nome: dep,
            tipo: 'adulto',
            lado: 'ambos',
            status: 'pendente',
          });
          if (!error) convidadosCriados += 1;
        }
      } else {
        let pessoa: any = null;
        if (emailN) {
          const { data } = await r.admin.from('convidados_lista').select('*').eq('evento_id', eventoId).eq('email_normalizado', emailN).limit(1).maybeSingle();
          pessoa = data;
        }
        if (!pessoa && telN) {
          const { data } = await r.admin.from('convidados_lista').select('*').eq('evento_id', eventoId).eq('telefone_normalizado', telN).limit(1).maybeSingle();
          pessoa = data;
        }
        if (!pessoa) {
          const { data } = await r.admin.from('convidados_lista').select('*').eq('evento_id', eventoId).is('familia_id', null).ilike('nome', nome).limit(1).maybeSingle();
          pessoa = data;
        }

        const dados = {
          evento_id: eventoId,
          familia_id: null,
          nome,
          telefone,
          telefone_normalizado: telN,
          email,
          email_normalizado: emailN,
          tipo: 'adulto',
          lado: 'ambos',
          status: pessoa?.status ?? 'pendente',
        };
        if (pessoa) {
          await r.admin.from('convidados_lista').update(dados).eq('id', pessoa.id);
          atualizados += 1;
        } else {
          const { error } = await r.admin.from('convidados_lista').insert(dados);
          if (error) ignorados += 1; else convidadosCriados += 1;
        }
      }
    }

    const sync = await sincronizarConfirmacoes(r.admin, eventoId);
    return NextResponse.json({
      ok: true,
      importados: linhas.length - ignorados,
      ignorados,
      familiasCriadas,
      convidadosCriados,
      atualizados,
      sincronizacao: sync,
    });
  }

  if (acao === 'sincronizar') {
    const resultado = await sincronizarConfirmacoes(r.admin, eventoId);
    return NextResponse.json({ ok: true, ...resultado });
  }

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
    const ids: string[] = Array.isArray(body?.convidadoIds)
      ? Array.from(new Set<string>(body.convidadoIds.map((x: unknown) => texto(x, 80)).filter(Boolean))).slice(0, 50)
      : [];
    if (!ids.length) return NextResponse.json({ erro: 'Selecione ao menos uma pessoa.' }, { status: 400 });
    const resultado = await registrarConfirmacaoManual(r, eventoId, ids);
    if ('erro' in resultado) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
    return NextResponse.json(resultado);
  }

  if (acao === 'status') {
    const id = texto(body?.id, 80);
    const status = STATUS.has(body?.status) ? body.status : null;
    if (!id || !status) return NextResponse.json({ erro: 'Status inválido.' }, { status: 400 });
    if (status === 'confirmado') {
      const resultado = await registrarConfirmacaoManual(r, eventoId, [id]);
      if ('erro' in resultado) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
      return NextResponse.json(resultado);
    }
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
  if (!eventoId || !id || !['familia','convidado'].includes(tipo ?? '')) {
    return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 });
  }
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
