import { NextResponse, type NextRequest } from 'next/server';
import {
  exigirEventoDoUsuario,
  normalizarEmail,
  normalizarTelefone,
  texto,
  variantesTelefoneBusca,
} from '@/lib/conviteria/gestao-servidor';
import { sincronizarConfirmacoesEvento } from '@/lib/conviteria/convidados-sync';
import {
  agendamentoDepoisDoPrazo,
  dataCalendarioSaoPaulo,
  normalizarDataRsvp,
  prazoRsvpEncerrado,
} from '@/lib/conviteria/rsvp-prazo';

export const runtime = 'nodejs';

const LADOS = new Set(['noiva', 'noivo', 'ambos', 'outro']);
const STATUS = new Set(['pendente', 'confirmado', 'nao_vai']);
const MAX_IMPORTACAO = 600;
const MAX_MEMBROS = 50;

function idadeCrianca(tipo: 'adulto' | 'crianca', valor: unknown, obrigatoria = true) {
  if (tipo !== 'crianca') return { idade: null as number | null, erro: null as string | null };
  if (valor === '' || valor == null) return obrigatoria
    ? { idade: null, erro: 'Informe a idade da criança (de 1 a 12 anos).' }
    : { idade: null, erro: null };
  const idade = Number(valor);
  if (!Number.isInteger(idade) || idade < 1 || idade > 12) return { idade: null, erro: 'A idade da criança deve ficar entre 1 e 12 anos.' };
  return { idade, erro: null };
}

function nomeChave(valor: unknown) {
  return texto(valor, 120)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function dependentesDo(valor: unknown) {
  const itens = Array.isArray(valor) ? valor : String(valor ?? '').split('|');
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

async function primeiraFamiliaPorTelefone(admin: any, eventoId: string, telefone: unknown) {
  const variantes = variantesTelefoneBusca(String(telefone ?? ''));
  if (!variantes.length) return null;
  const { data } = await admin.from('convidado_familias')
    .select('*').eq('evento_id', eventoId).in('telefone_normalizado', variantes)
    .order('created_at').limit(1).maybeSingle();
  return data ?? null;
}

async function primeiraPessoaPorTelefone(admin: any, eventoId: string, telefone: unknown) {
  const variantes = variantesTelefoneBusca(String(telefone ?? ''));
  if (!variantes.length) return null;
  const { data } = await admin.from('convidados_lista')
    .select('*').eq('evento_id', eventoId).in('telefone_normalizado', variantes)
    .order('created_at').limit(1).maybeSingle();
  return data ?? null;
}

async function registrarConfirmacaoManual(r: any, eventoId: string, ids: string[], idadesCriancas: Record<string, unknown> = {}) {
  const { data: pessoas } = await r.admin
    .from('convidados_lista')
    .select('id,nome,email,email_normalizado,telefone,tipo,idade,familia_id')
    .eq('evento_id', eventoId)
    .in('id', ids);
  if (!pessoas || pessoas.length !== ids.length) {
    return { erro: 'Há convidados inválidos na seleção.', status: 400 as const };
  }
  for (const pessoa of pessoas as any[]) {
    if (pessoa.tipo !== 'crianca') continue;
    const validacao = idadeCrianca('crianca', idadesCriancas[pessoa.id] ?? pessoa.idade, true);
    if (validacao.erro) return { erro: `${pessoa.nome}: ${validacao.erro}`, status: 400 as const };
    pessoa.idade = validacao.idade;
    const { error } = await r.admin.from('convidados_lista').update({ idade: validacao.idade }).eq('evento_id', eventoId).eq('id', pessoa.id).eq('tipo', 'crianca');
    if (error) return { erro: `Não foi possível salvar a idade de ${pessoa.nome}.`, status: 500 as const };
  }

  const familiaIds = [...new Set(pessoas.map((p: any) => p.familia_id).filter(Boolean))];
  const familiaId = familiaIds.length === 1 ? familiaIds[0] : null;
  if (ids.length > 1) {
    if (!familiaId || !pessoas.every((p: any) => p.familia_id === familiaId)) {
      return { erro: 'Confirme pessoas de uma única família por vez.', status: 400 as const };
    }
  }
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

  let extrasConfirmados: any[] = [];
  if (familiaId) {
    const { data } = await r.admin.from('convidados_lista')
      .select('id,nome,tipo,idade')
      .eq('evento_id', eventoId)
      .eq('familia_id', familiaId)
      .eq('rsvp_extra', true)
      .eq('status', 'confirmado');
    extrasConfirmados = data ?? [];
  }

  const acompanhantesDetalhes = [
    ...pessoas.slice(1).map((p: any) => ({ nome: p.nome, tipo: p.tipo === 'crianca' ? 'crianca' : 'adulto', idade: p.tipo === 'crianca' ? (p.idade ?? null) : null })),
    ...extrasConfirmados.map((p: any) => ({ nome: p.nome, tipo: p.tipo === 'crianca' ? 'crianca' : 'adulto', idade: p.tipo === 'crianca' ? (p.idade ?? null) : null })),
  ];
  const acompanhantes = acompanhantesDetalhes.map((p) => p.nome);
  const adultos = pessoas.filter((p: any) => p.tipo !== 'crianca').length
    + extrasConfirmados.filter((p: any) => p.tipo !== 'crianca').length;
  const criancas = pessoas.filter((p: any) => p.tipo === 'crianca').length
    + extrasConfirmados.filter((p: any) => p.tipo === 'crianca').length;
  const dados = {
    evento_id: eventoId,
    nome: principal.nome,
    email: principal.email || null,
    contato: principal.email || principal.telefone || null,
    comparecera: true,
    adultos,
    criancas,
    acompanhantes,
    acompanhantes_detalhes: acompanhantesDetalhes,
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
  const idsDaConfirmacao = [...ids, ...extrasConfirmados.map((p: any) => p.id)];
  await r.admin.from('convidado_confirmacoes_membros').insert(
    idsDaConfirmacao.map((id: string) => ({
      evento_id: eventoId,
      confirmacao_id: resp.data.id,
      convidado_lista_id: id,
    })),
  );

  if (familiaId) {
    // A confirmação manual controla somente os membros fixos do grupo.
    // Acompanhantes extras já materializados pelo RSVP não são apagados nem
    // marcados como "não vai" por uma revisão feita pelos anfitriões.
    const { data: todos } = await r.admin.from('convidados_lista')
      .select('id,rsvp_extra')
      .eq('evento_id', eventoId)
      .eq('familia_id', familiaId);
    const membrosFixosIds = (todos ?? [])
      .filter((p: any) => !p.rsvp_extra)
      .map((p: any) => p.id);
    if (membrosFixosIds.length) {
      await r.admin.from('convidados_lista')
        .update({ status: 'nao_vai' })
        .eq('evento_id', eventoId)
        .in('id', membrosFixosIds);
    }
  }
  await r.admin.from('convidados_lista').update({ status: 'confirmado' }).eq('evento_id', eventoId).in('id', ids);
  return { ok: true, confirmacaoId: resp.data.id };
}

export async function GET(req: NextRequest) {
  const eventoId = new URL(req.url).searchParams.get('eventoId')?.trim();
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const [
    { data: familias, error: ef },
    { data: convidados, error: ec },
    { data: gestao },
  ] = await Promise.all([
    r.admin.from('convidado_familias').select('*').eq('evento_id', eventoId).order('created_at'),
    r.admin.from('convidados_lista').select('*').eq('evento_id', eventoId).order('created_at'),
    r.admin.from('evento_gestao_config').select('rsvp_prazo').eq('evento_id', eventoId).maybeSingle(),
  ]);
  if (ef || ec) return NextResponse.json({ erro: 'Não foi possível carregar os convidados.' }, { status: 500 });
  const rsvpPrazo = normalizarDataRsvp(gestao?.rsvp_prazo);
  return NextResponse.json({
    familias: familias ?? [],
    convidados: convidados ?? [],
    rsvpPrazo,
    rsvpEncerrado: prazoRsvpEncerrado(rsvpPrazo),
    dataEvento: dataCalendarioSaoPaulo(r.evento.data_evento as string | null),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  const acao = texto(body?.acao, 40);
  if (!eventoId || !acao) return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });
  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  if (acao === 'salvar_prazo_rsvp') {
    const bruto = String(body?.prazo ?? '').trim();
    const prazo = bruto ? normalizarDataRsvp(bruto) : null;
    if (bruto && !prazo) {
      return NextResponse.json({ erro: 'Informe uma data válida para o prazo de confirmação.' }, { status: 400 });
    }

    const dataEvento = dataCalendarioSaoPaulo(r.evento.data_evento as string | null);
    if (prazo && dataEvento && prazo > dataEvento) {
      return NextResponse.json({ erro: 'O prazo de confirmação não pode ficar depois da data do evento.' }, { status: 400 });
    }

    const { data: existente } = await r.admin.from('evento_gestao_config')
      .select('evento_id')
      .eq('evento_id', eventoId)
      .maybeSingle();
    const salvo = existente
      ? await r.admin.from('evento_gestao_config').update({ rsvp_prazo: prazo }).eq('evento_id', eventoId)
      : await r.admin.from('evento_gestao_config').insert({ evento_id: eventoId, rsvp_prazo: prazo });
    if (salvo.error) {
      return NextResponse.json({ erro: 'Não foi possível salvar o prazo de confirmação.' }, { status: 500 });
    }

    let agendamentoWhatsAppRemovido = false;
    if (prazo) {
      const { data: whatsapp } = await r.admin.from('evento_whatsapp_config')
        .select('segundo_programado_em,segundo_disparo_em')
        .eq('evento_id', eventoId)
        .maybeSingle();
      if (
        whatsapp?.segundo_programado_em
        && !whatsapp.segundo_disparo_em
        && agendamentoDepoisDoPrazo(whatsapp.segundo_programado_em, prazo)
      ) {
        const { error } = await r.admin.from('evento_whatsapp_config')
          .update({ segundo_programado_em: null })
          .eq('evento_id', eventoId);
        agendamentoWhatsAppRemovido = !error;
      }
    }

    return NextResponse.json({
      ok: true,
      rsvpPrazo: prazo,
      rsvpEncerrado: prazoRsvpEncerrado(prazo),
      agendamentoWhatsAppRemovido,
    });
  }

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
      const deps = dependentesDo(linha?.membros ?? linha?.dependentes).filter((dep) => nomeChave(dep) !== nomeChave(nome));
      const email = texto(linha?.email, 180) || null;
      const telefone = texto(linha?.telefone, 40) || null;
      const emailN = normalizarEmail(email);
      const telN = normalizarTelefone(telefone);

      if (deps.length > 0) {
        let familia: any = null;
        if (emailN) {
          const { data } = await r.admin.from('convidado_familias').select('*').eq('evento_id', eventoId).eq('email_normalizado', emailN).order('created_at').limit(1).maybeSingle();
          familia = data;
        }
        if (!familia && telefone) familia = await primeiraFamiliaPorTelefone(r.admin, eventoId, telefone);
        if (!familia) {
          const { data } = await r.admin.from('convidado_familias').select('*').eq('evento_id', eventoId).ilike('nome', `Família / grupo de ${nome}`).order('created_at').limit(1).maybeSingle();
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
        };

        if (familia) {
          const { data } = await r.admin.from('convidado_familias').update(dadosFamilia).eq('id', familia.id).select('*').single();
          familia = data ?? familia;
          atualizados += 1;
        } else {
          const { data, error } = await r.admin.from('convidado_familias').insert({ ...dadosFamilia, extras_permitidos: 0 }).select('*').single();
          if (error || !data) { ignorados += 1; continue; }
          familia = data;
          familiasCriadas += 1;
        }

        const { data: existentes } = await r.admin.from('convidados_lista').select('*').eq('evento_id', eventoId).eq('familia_id', familia.id);
        const lista = existentes ?? [];
        let principal = lista.find((p: any) =>
          (emailN && p.email_normalizado === emailN)
          || variantesTelefoneBusca(telefone).includes(p.telefone_normalizado)
          || nomeChave(p.nome) === nomeChave(nome));

        const dadosPrincipal: any = {
          evento_id: eventoId,
          familia_id: familia.id,
          nome,
          telefone,
          telefone_normalizado: telN,
          email,
          email_normalizado: emailN,
          tipo: 'adulto',
          idade: null,
          lado: 'ambos',
          status: principal?.status ?? 'pendente',
          rsvp_extra: false,
        };
        if (principal) {
          await r.admin.from('convidados_lista').update(dadosPrincipal).eq('id', principal.id);
          atualizados += 1;
        } else {
          const { data } = await r.admin.from('convidados_lista').insert(dadosPrincipal).select('*').single();
          if (data) { principal = data; lista.push(data); convidadosCriados += 1; }
        }

        for (const dep of deps) {
          const existente = lista.find((p: any) => nomeChave(p.nome) === nomeChave(dep));
          if (existente) {
            if (existente.rsvp_extra) {
              await r.admin.from('convidados_lista').update({ rsvp_extra: false, status: existente.status ?? 'pendente' }).eq('id', existente.id);
              atualizados += 1;
            }
            continue;
          }
          const { data, error } = await r.admin.from('convidados_lista').insert({
            evento_id: eventoId,
            familia_id: familia.id,
            nome: dep,
            tipo: 'adulto',
            idade: null,
            lado: 'ambos',
            status: 'pendente',
            rsvp_extra: false,
          }).select('*').single();
          if (!error && data) { lista.push(data); convidadosCriados += 1; }
        }
      } else {
        let pessoa: any = null;
        if (emailN) {
          const { data } = await r.admin.from('convidados_lista').select('*').eq('evento_id', eventoId).eq('email_normalizado', emailN).order('created_at').limit(1).maybeSingle();
          pessoa = data;
        }
        if (!pessoa && telefone) pessoa = await primeiraPessoaPorTelefone(r.admin, eventoId, telefone);
        if (!pessoa) {
          const { data } = await r.admin.from('convidados_lista').select('*').eq('evento_id', eventoId).is('familia_id', null).ilike('nome', nome).order('created_at').limit(1).maybeSingle();
          pessoa = data;
        }

        const dados: any = {
          evento_id: eventoId,
          familia_id: null,
          nome,
          telefone,
          telefone_normalizado: telN,
          email,
          email_normalizado: emailN,
          tipo: 'adulto',
          idade: null,
          lado: 'ambos',
          status: pessoa?.status ?? 'pendente',
        };
        if (pessoa) {
          if (!pessoa.rsvp_extra) dados.rsvp_extra = false;
          await r.admin.from('convidados_lista').update(dados).eq('id', pessoa.id);
          atualizados += 1;
        } else {
          const { error } = await r.admin.from('convidados_lista').insert({ ...dados, rsvp_extra: false });
          if (error) ignorados += 1; else convidadosCriados += 1;
        }
      }
    }

    const sync = await sincronizarConfirmacoesEvento(eventoId);
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
    const resultado = await sincronizarConfirmacoesEvento(eventoId);
    return NextResponse.json({ ok: true, ...resultado });
  }

  if (acao === 'salvar_familia') {
    const id = texto(body?.id, 80) || null;
    const nome = texto(body?.nome, 120);
    if (!nome) return NextResponse.json({ erro: 'Informe o nome da família/grupo.' }, { status: 400 });

    const membrosEntrada = Array.isArray(body?.membros)
      ? body.membros.slice(0, MAX_MEMBROS).map((m: any) => ({
          id: texto(m?.id, 80) || null,
          nome: texto(m?.nome, 120),
          tipo: (m?.tipo === 'crianca' ? 'crianca' : 'adulto') as 'adulto' | 'crianca',
          idadeBruta: m?.idade,
          idade: null as number | null,
        })).filter((m: any) => m.nome)
      : [];
    if (!membrosEntrada.length) {
      return NextResponse.json({ erro: 'Cadastre pelo menos uma pessoa neste grupo. O nome da família não cria membros automaticamente.' }, { status: 400 });
    }
    for (const membro of membrosEntrada) {
      const validacao = idadeCrianca(membro.tipo, membro.idadeBruta, true);
      if (validacao.erro) return NextResponse.json({ erro: `${membro.nome}: ${validacao.erro}` }, { status: 400 });
      membro.idade = validacao.idade;
    }

    const nomes = new Set<string>();
    for (const m of membrosEntrada) {
      const chave = nomeChave(m.nome);
      if (nomes.has(chave)) return NextResponse.json({ erro: `O membro “${m.nome}” está repetido no grupo.` }, { status: 400 });
      nomes.add(chave);
    }

    const removerIds: string[] = Array.isArray(body?.removerMembroIds)
      ? Array.from(new Set<string>(body.removerMembroIds.map((x: unknown) => texto(x, 80)).filter(Boolean))).slice(0, MAX_MEMBROS)
      : [];

    let existente: any = null;
    let existentesMembros: any[] = [];
    if (id) {
      const [{ data: fam }, { data: ms }] = await Promise.all([
        r.admin.from('convidado_familias').select('*').eq('evento_id', eventoId).eq('id', id).maybeSingle(),
        r.admin.from('convidados_lista').select('id,rsvp_extra').eq('evento_id', eventoId).eq('familia_id', id),
      ]);
      if (!fam) return NextResponse.json({ erro: 'Família não encontrada.' }, { status: 404 });
      existente = fam;
      existentesMembros = ms ?? [];
      const permitidos = new Set(existentesMembros.filter((m: any) => !m.rsvp_extra).map((m: any) => m.id));
      if (membrosEntrada.some((m: any) => m.id && !permitidos.has(m.id))) {
        return NextResponse.json({ erro: 'Há um membro inválido nesta família.' }, { status: 400 });
      }
      if (removerIds.some((x) => !permitidos.has(x))) {
        return NextResponse.json({ erro: 'Não foi possível validar um membro removido.' }, { status: 400 });
      }
    } else if (membrosEntrada.some((m: any) => m.id)) {
      return NextResponse.json({ erro: 'Um novo grupo não pode reutilizar IDs de convidados.' }, { status: 400 });
    }

    const telefone = texto(body?.telefone, 40) || null;
    const email = texto(body?.email, 180) || null;
    const lado = LADOS.has(body?.lado) ? body.lado : 'ambos';
    const dadosFamilia: any = {
      evento_id: eventoId,
      nome,
      telefone,
      telefone_normalizado: normalizarTelefone(telefone),
      email,
      email_normalizado: normalizarEmail(email),
      lado,
      extras_permitidos: Math.max(0, Math.min(50, Number(body?.extrasPermitidos) || 0)),
      observacoes: texto(body?.observacoes, 1000) || null,
    };

    const respostaFamilia = id
      ? await r.admin.from('convidado_familias').update(dadosFamilia).eq('evento_id', eventoId).eq('id', id).select('*').single()
      : await r.admin.from('convidado_familias').insert(dadosFamilia).select('*').single();
    if (respostaFamilia.error || !respostaFamilia.data) {
      return NextResponse.json({ erro: 'Não foi possível salvar a família.' }, { status: 500 });
    }
    const familiaId = respostaFamilia.data.id as string;

    for (const m of membrosEntrada) {
      if (m.id) {
        const { error } = await r.admin.from('convidados_lista').update({ nome: m.nome, tipo: m.tipo, idade: m.idade, lado })
          .eq('evento_id', eventoId).eq('familia_id', familiaId).eq('id', m.id).eq('rsvp_extra', false);
        if (error) return NextResponse.json({ erro: `A família foi salva, mas não foi possível atualizar ${m.nome}.` }, { status: 500 });
      } else {
        const { error } = await r.admin.from('convidados_lista').insert({
          evento_id: eventoId,
          familia_id: familiaId,
          nome: m.nome,
          tipo: m.tipo,
          idade: m.idade,
          lado,
          status: 'pendente',
          rsvp_extra: false,
        });
        if (error) return NextResponse.json({ erro: `A família foi salva, mas não foi possível adicionar ${m.nome}.` }, { status: 500 });
      }
    }

    if (removerIds.length) {
      const { error } = await r.admin.from('convidados_lista').delete()
        .eq('evento_id', eventoId).eq('familia_id', familiaId).eq('rsvp_extra', false).in('id', removerIds);
      if (error) return NextResponse.json({ erro: 'A família foi salva, mas não foi possível remover um dos membros.' }, { status: 500 });
    }

    const { data: membrosSalvos } = await r.admin.from('convidados_lista').select('*')
      .eq('evento_id', eventoId).eq('familia_id', familiaId).eq('rsvp_extra', false).order('created_at');
    return NextResponse.json({ ok: true, familia: respostaFamilia.data, membros: membrosSalvos ?? [], legadoPreservado: existente?.max_acompanhantes ?? 0 });
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
    const telefone = texto(body?.telefone, 40) || null;
    const email = texto(body?.email, 180) || null;
    const tipoPessoa: 'adulto' | 'crianca' = body?.tipo === 'crianca' ? 'crianca' : 'adulto';
    const idadePessoa = idadeCrianca(tipoPessoa, body?.idade, true);
    if (idadePessoa.erro) return NextResponse.json({ erro: idadePessoa.erro }, { status: 400 });
    const dados: any = {
      evento_id: eventoId,
      familia_id: familiaId,
      nome,
      telefone,
      telefone_normalizado: normalizarTelefone(telefone),
      email,
      email_normalizado: normalizarEmail(email),
      tipo: tipoPessoa,
      idade: idadePessoa.idade,
      lado: LADOS.has(body?.lado) ? body.lado : 'ambos',
      observacoes: texto(body?.observacoes, 1000) || null,
      status: STATUS.has(body?.status) ? body.status : 'pendente',
    };
    if (!id) dados.rsvp_extra = false;
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
    const idadesCriancas = body?.idadesCriancas && typeof body.idadesCriancas === 'object'
      ? body.idadesCriancas as Record<string, unknown>
      : {};
    const resultado = await registrarConfirmacaoManual(r, eventoId, ids, idadesCriancas);
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
  if (!eventoId || !id || !['familia', 'convidado'].includes(tipo ?? '')) {
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
