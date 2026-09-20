import { NextResponse, type NextRequest } from 'next/server';
import {
  exigirEventoDoUsuario,
  normalizarEmail,
  normalizarTelefone,
  texto,
  variantesTelefoneBusca,
} from '@/lib/conviteria/gestao-servidor';
import { sincronizarConfirmacoesEvento } from '@/lib/conviteria/convidados-sync';

export const runtime = 'nodejs';

const MAX_IMPORTACAO = 600;

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
    const chave = nomeChave(nome);
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    nomes.push(nome);
    if (nomes.length >= 20) break;
  }
  return nomes;
}

async function familiasPorContato(admin: any, eventoId: string, emailN: string | null, telefone: string | null) {
  const candidatos = new Map<string, any>();
  if (emailN) {
    const { data } = await admin.from('convidado_familias')
      .select('*').eq('evento_id', eventoId).eq('email_normalizado', emailN).limit(3);
    for (const item of data ?? []) candidatos.set(item.id, item);
  }
  const variantes = variantesTelefoneBusca(telefone);
  if (variantes.length) {
    const { data } = await admin.from('convidado_familias')
      .select('*').eq('evento_id', eventoId).in('telefone_normalizado', variantes).limit(3);
    for (const item of data ?? []) candidatos.set(item.id, item);
  }
  return [...candidatos.values()];
}

async function pessoasPorContato(admin: any, eventoId: string, emailN: string | null, telefone: string | null) {
  const candidatos = new Map<string, any>();
  if (emailN) {
    const { data } = await admin.from('convidados_lista')
      .select('*').eq('evento_id', eventoId).eq('email_normalizado', emailN).eq('rsvp_extra', false).limit(3);
    for (const item of data ?? []) candidatos.set(item.id, item);
  }
  const variantes = variantesTelefoneBusca(telefone);
  if (variantes.length) {
    const { data } = await admin.from('convidados_lista')
      .select('*').eq('evento_id', eventoId).in('telefone_normalizado', variantes).eq('rsvp_extra', false).limit(3);
    for (const item of data ?? []) candidatos.set(item.id, item);
  }
  return [...candidatos.values()];
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  if (!eventoId) return NextResponse.json({ erro: 'Convite não informado.' }, { status: 400 });

  const r = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in r) return NextResponse.json({ erro: r.erro }, { status: r.status });

  const linhas = Array.isArray(body?.linhas) ? body.linhas.slice(0, MAX_IMPORTACAO) : [];
  if (!linhas.length) return NextResponse.json({ erro: 'O CSV não possui convidados válidos.' }, { status: 400 });

  let familiasCriadas = 0;
  let convidadosCriados = 0;
  let atualizados = 0;
  let ignorados = 0;
  let ambiguos = 0;
  let semIdentificador = 0;

  for (const linha of linhas) {
    const nome = texto(linha?.nome, 120);
    if (!nome) { ignorados += 1; continue; }

    const deps = dependentesDo(linha?.membros ?? linha?.dependentes)
      .filter((dep) => nomeChave(dep) !== nomeChave(nome));
    const email = texto(linha?.email, 180) || null;
    const telefone = texto(linha?.telefone, 40) || null;
    const emailN = normalizarEmail(email);
    const telN = normalizarTelefone(telefone);
    const temIdentificador = Boolean(emailN || telN);

    if (deps.length > 0) {
      const candidatas = await familiasPorContato(r.admin, eventoId, emailN, telefone);
      if (candidatas.length > 1) {
        ambiguos += 1;
        ignorados += 1;
        continue;
      }

      let familia = candidatas[0] ?? null;
      if (!familia) {
        const { data, error } = await r.admin.from('convidado_familias').insert({
          evento_id: eventoId,
          nome: `Família / grupo de ${nome}`.slice(0, 120),
          telefone,
          telefone_normalizado: telN,
          email,
          email_normalizado: emailN,
          lado: 'ambos',
          extras_permitidos: 0,
        }).select('*').single();
        if (error || !data) { ignorados += 1; continue; }
        familia = data;
        familiasCriadas += 1;
        if (!temIdentificador) semIdentificador += 1;
      } else {
        const { data } = await r.admin.from('convidado_familias').update({
          telefone: telefone ?? familia.telefone,
          telefone_normalizado: telN ?? familia.telefone_normalizado,
          email: email ?? familia.email,
          email_normalizado: emailN ?? familia.email_normalizado,
        }).eq('evento_id', eventoId).eq('id', familia.id).select('*').single();
        familia = data ?? familia;
        atualizados += 1;
      }

      const { data: existentes } = await r.admin.from('convidados_lista')
        .select('*').eq('evento_id', eventoId).eq('familia_id', familia.id).order('created_at');
      const lista = existentes ?? [];
      const variantes = variantesTelefoneBusca(telefone);
      let principal = lista.find((p: any) =>
        !p.rsvp_extra && (
          (emailN && p.email_normalizado === emailN)
          || (variantes.length > 0 && variantes.includes(p.telefone_normalizado))
        ));

      // Uma vez que a família foi localizada por contato/ID, o nome pode ser
      // usado apenas dentro dela para evitar duplicar o mesmo membro no CSV.
      // Nunca usamos o nome para escolher uma família diferente.
      if (!principal) principal = lista.find((p: any) => !p.rsvp_extra && nomeChave(p.nome) === nomeChave(nome));

      const dadosPrincipal: any = {
        evento_id: eventoId,
        familia_id: familia.id,
        nome,
        telefone,
        telefone_normalizado: telN,
        email,
        email_normalizado: emailN,
        tipo: principal?.tipo === 'crianca' ? 'crianca' : 'adulto',
        idade: principal?.idade ?? null,
        lado: principal?.lado ?? 'ambos',
        status: principal?.status ?? 'pendente',
        rsvp_extra: false,
      };

      if (principal) {
        await r.admin.from('convidados_lista').update(dadosPrincipal).eq('evento_id', eventoId).eq('id', principal.id);
        atualizados += 1;
      } else {
        const { data, error } = await r.admin.from('convidados_lista').insert(dadosPrincipal).select('*').single();
        if (error || !data) { ignorados += 1; continue; }
        principal = data;
        lista.push(data);
        convidadosCriados += 1;
      }

      for (const dep of deps) {
        const existente = lista.find((p: any) => nomeChave(p.nome) === nomeChave(dep));
        if (existente) {
          if (existente.rsvp_extra) {
            await r.admin.from('convidados_lista').update({ rsvp_extra: false })
              .eq('evento_id', eventoId).eq('id', existente.id);
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
        if (!error && data) {
          lista.push(data);
          convidadosCriados += 1;
        }
      }
      continue;
    }

    const candidatas = temIdentificador
      ? await pessoasPorContato(r.admin, eventoId, emailN, telefone)
      : [];
    if (candidatas.length > 1) {
      ambiguos += 1;
      ignorados += 1;
      continue;
    }

    const pessoa = candidatas[0] ?? null;
    const dados: any = {
      evento_id: eventoId,
      nome,
      telefone,
      telefone_normalizado: telN,
      email,
      email_normalizado: emailN,
      tipo: pessoa?.tipo === 'crianca' ? 'crianca' : 'adulto',
      idade: pessoa?.idade ?? null,
      lado: pessoa?.lado ?? 'ambos',
      status: pessoa?.status ?? 'pendente',
      rsvp_extra: false,
    };

    if (pessoa) {
      // Não mexemos em familia_id aqui. Um contato já ligado a uma família
      // continua naquela família mesmo que o CSV tenha vindo sem dependentes.
      await r.admin.from('convidados_lista').update(dados).eq('evento_id', eventoId).eq('id', pessoa.id);
      atualizados += 1;
    } else {
      const { error } = await r.admin.from('convidados_lista').insert({ ...dados, familia_id: null });
      if (error) ignorados += 1;
      else {
        convidadosCriados += 1;
        if (!temIdentificador) semIdentificador += 1;
      }
    }
  }

  const sync = await sincronizarConfirmacoesEvento(eventoId);
  return NextResponse.json({
    ok: true,
    importados: linhas.length - ignorados,
    ignorados,
    ambiguos,
    semIdentificador,
    familiasCriadas,
    convidadosCriados,
    atualizados,
    sincronizacao: sync,
  });
}
