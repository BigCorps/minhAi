import 'server-only';
import { adminConviteria } from './servidor';
import { normalizarEmail, variantesTelefoneBusca } from './gestao-servidor';

function nomeChave(valor: unknown) {
  return String(valor ?? '').trim().replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function mapaPorTelefone(linhas: any[]) {
  const mapa = new Map<string, any>();
  for (const linha of linhas) {
    for (const variante of variantesTelefoneBusca(linha.telefone_normalizado)) {
      if (!mapa.has(variante)) mapa.set(variante, linha);
    }
  }
  return mapa;
}

function acharPorTelefone(mapa: Map<string, any>, valor: unknown) {
  for (const variante of variantesTelefoneBusca(String(valor ?? ''))) {
    const achado = mapa.get(variante);
    if (achado) return achado;
  }
  return null;
}

/**
 * Faz a ponte entre o RSVP (`convidados`) e a lista operacional da Gestão
 * (`convidados_lista`). É idempotente e pode ser chamada após RSVP, CSV ou
 * antes de disparos do WhatsApp sem criar uma segunda fonte de verdade.
 *
 * A leitura de telefones aceita tanto a forma antiga com 55 quanto a forma
 * brasileira canônica nova sem 55. Nenhum dado antigo é regravado aqui.
 */
export async function sincronizarConfirmacoesEvento(eventoId: string) {
  const admin = adminConviteria();
  const [famsR, pessoasR, confsR, membrosR] = await Promise.all([
    admin.from('convidado_familias').select('id,nome,email_normalizado,telefone_normalizado').eq('evento_id', eventoId),
    admin.from('convidados_lista').select('id,familia_id,nome,email_normalizado,telefone_normalizado,status,rsvp_extra').eq('evento_id', eventoId),
    admin.from('convidados').select('id,nome,email,contato,comparecera,acompanhantes,familia_lista_id,convidado_lista_id,conciliacao_ignorada_em').eq('evento_id', eventoId).is('teste_id', null).is('conciliacao_ignorada_em', null),
    admin.from('convidado_confirmacoes_membros').select('confirmacao_id,convidado_lista_id').eq('evento_id', eventoId),
  ]);

  const familias = famsR.data ?? [];
  const pessoas = pessoasR.data ?? [];
  const confirmacoes = confsR.data ?? [];
  const membros = membrosR.data ?? [];
  let vinculadas = 0;
  let statusAtualizados = 0;

  const porEmailFamilia = new Map(familias.filter((f: any) => f.email_normalizado).map((f: any) => [f.email_normalizado, f]));
  const porTelFamilia = mapaPorTelefone(familias);
  const porEmailPessoa = new Map(pessoas.filter((p: any) => p.email_normalizado).map((p: any) => [p.email_normalizado, p]));
  const porTelPessoa = mapaPorTelefone(pessoas);

  for (const c of confirmacoes as any[]) {
    let familiaId = c.familia_lista_id as string | null;
    let pessoaId = c.convidado_lista_id as string | null;

    // Confirmações antigas podiam apontar somente para um membro. Se ele agora
    // pertence a uma família, promovemos o vínculo para a família.
    if (!familiaId && pessoaId) {
      const pessoaLigada = pessoas.find((p: any) => p.id === pessoaId) as any;
      if (pessoaLigada?.familia_id) {
        familiaId = pessoaLigada.familia_id;
        pessoaId = null;
        await admin.from('convidados').update({ familia_lista_id: familiaId, convidado_lista_id: null }).eq('id', c.id);
        vinculadas += 1;
      }
    }

    if (!familiaId && !pessoaId) {
      const email = normalizarEmail(c.email || c.contato);
      const fam = (email && porEmailFamilia.get(email)) || acharPorTelefone(porTelFamilia, c.contato);
      const pes = !fam
        ? ((email && porEmailPessoa.get(email)) || acharPorTelefone(porTelPessoa, c.contato))
        : null;

      if (fam) {
        familiaId = (fam as any).id;
        await admin.from('convidados').update({ familia_lista_id: familiaId, convidado_lista_id: null }).eq('id', c.id);
        vinculadas += 1;
      } else if (pes) {
        if ((pes as any).familia_id) {
          familiaId = (pes as any).familia_id;
          await admin.from('convidados').update({ familia_lista_id: familiaId, convidado_lista_id: null }).eq('id', c.id);
        } else {
          pessoaId = (pes as any).id;
          await admin.from('convidados').update({ convidado_lista_id: pessoaId }).eq('id', c.id);
        }
        vinculadas += 1;
      }
    }

    const novoStatus = c.comparecera === false ? 'nao_vai' : 'confirmado';

    if (pessoaId) {
      await admin.from('convidados_lista').update({ status: novoStatus }).eq('evento_id', eventoId).eq('id', pessoaId);
      statusAtualizados += 1;
      continue;
    }

    if (!familiaId) continue;

    const pessoasFamilia = pessoas.filter((p: any) => p.familia_id === familiaId);
    if (!pessoasFamilia.length) continue;

    if (c.comparecera === false) {
      const ids = pessoasFamilia.map((p: any) => p.id);
      await admin.from('convidados_lista').update({ status: 'nao_vai' }).eq('evento_id', eventoId).in('id', ids);
      statusAtualizados += ids.length;
      continue;
    }

    const idsRegistrados = membros
      .filter((m: any) => m.confirmacao_id === c.id)
      .map((m: any) => m.convidado_lista_id)
      .filter((id: string) => pessoasFamilia.some((p: any) => p.id === id));

    if (idsRegistrados.length) {
      const todosIds = pessoasFamilia.map((p: any) => p.id);
      await admin.from('convidados_lista').update({ status: 'nao_vai' }).eq('evento_id', eventoId).in('id', todosIds);
      await admin.from('convidados_lista').update({ status: 'confirmado' }).eq('evento_id', eventoId).in('id', idsRegistrados);
      statusAtualizados += idsRegistrados.length;
      continue;
    }

    // Compatibilidade com confirmações antigas sem tabela de membros.
    const nomesConfirmados = new Set([
      nomeChave(c.nome),
      ...(Array.isArray(c.acompanhantes) ? c.acompanhantes.map(nomeChave) : []),
    ].filter(Boolean));
    const ids = pessoasFamilia
      .filter((p: any) => nomesConfirmados.has(nomeChave(p.nome)))
      .map((p: any) => p.id);

    if (ids.length) {
      const todosIds = pessoasFamilia.map((p: any) => p.id);
      await admin.from('convidados_lista').update({ status: 'nao_vai' }).eq('evento_id', eventoId).in('id', todosIds);
      await admin.from('convidados_lista').update({ status: 'confirmado' }).eq('evento_id', eventoId).in('id', ids);
      await admin.from('convidado_confirmacoes_membros').delete().eq('confirmacao_id', c.id);
      await admin.from('convidado_confirmacoes_membros').insert(
        ids.map((id: string) => ({ evento_id: eventoId, confirmacao_id: c.id, convidado_lista_id: id })),
      );
      statusAtualizados += ids.length;
    }
  }

  return { vinculadas, statusAtualizados, confirmacoes: confirmacoes.length };
}
