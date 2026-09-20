import 'server-only';
import { adminConviteria } from './servidor';
import { normalizarEmail, variantesTelefoneBusca } from './gestao-servidor';

function mapaUnicoPorCampo(linhas: any[], campo: string) {
  const mapa = new Map<string, any | null>();
  for (const linha of linhas) {
    const chave = String(linha?.[campo] ?? '').trim();
    if (!chave) continue;
    if (!mapa.has(chave)) mapa.set(chave, linha);
    else if (mapa.get(chave)?.id !== linha.id) mapa.set(chave, null);
  }
  return mapa;
}

function mapaUnicoPorTelefone(linhas: any[]) {
  const mapa = new Map<string, any | null>();
  for (const linha of linhas) {
    for (const variante of variantesTelefoneBusca(linha.telefone_normalizado)) {
      if (!mapa.has(variante)) mapa.set(variante, linha);
      else if (mapa.get(variante)?.id !== linha.id) mapa.set(variante, null);
    }
  }
  return mapa;
}

function acharPorTelefone(mapa: Map<string, any | null>, valor: unknown) {
  const encontrados = new Map<string, any>();
  for (const variante of variantesTelefoneBusca(String(valor ?? ''))) {
    const achado = mapa.get(variante);
    if (achado?.id) encontrados.set(achado.id, achado);
  }
  return encontrados.size === 1 ? [...encontrados.values()][0] : null;
}

/**
 * Faz a ponte entre o histórico de RSVP (`convidados`) e a lista operacional
 * (`convidados_lista`) sem usar nome como identidade.
 *
 * Regras de identidade:
 * - pessoa = convidados_lista.id;
 * - família = convidado_familias.id;
 * - telefone/e-mail só podem auxiliar quando apontam para um único cadastro;
 * - nome nunca escolhe pessoa ou família.
 *
 * Confirmações familiares positivas antigas sem IDs de membros permanecem
 * pendentes para revisão manual. É preferível revisar uma confirmação antiga
 * a marcar a pessoa errada só porque dois convidados possuem o mesmo nome.
 */
export async function sincronizarConfirmacoesEvento(eventoId: string) {
  const admin = adminConviteria();
  const [famsR, pessoasR, confsR, membrosR] = await Promise.all([
    admin.from('convidado_familias')
      .select('id,nome,email_normalizado,telefone_normalizado')
      .eq('evento_id', eventoId),
    admin.from('convidados_lista')
      .select('id,familia_id,nome,email_normalizado,telefone_normalizado,status,rsvp_extra')
      .eq('evento_id', eventoId),
    admin.from('convidados')
      .select('id,nome,email,contato,comparecera,acompanhantes,familia_lista_id,convidado_lista_id,conciliacao_ignorada_em')
      .eq('evento_id', eventoId)
      .is('teste_id', null)
      .is('conciliacao_ignorada_em', null),
    admin.from('convidado_confirmacoes_membros')
      .select('confirmacao_id,convidado_lista_id')
      .eq('evento_id', eventoId),
  ]);

  const familias = famsR.data ?? [];
  const pessoas = pessoasR.data ?? [];
  const confirmacoes = confsR.data ?? [];
  const membros = membrosR.data ?? [];
  let vinculadas = 0;
  let statusAtualizados = 0;

  const porEmailFamilia = mapaUnicoPorCampo(familias, 'email_normalizado');
  const porTelFamilia = mapaUnicoPorTelefone(familias);
  const pessoasFixas = pessoas.filter((p: any) => !p.rsvp_extra);
  const porEmailPessoa = mapaUnicoPorCampo(pessoasFixas, 'email_normalizado');
  const porTelPessoa = mapaUnicoPorTelefone(pessoasFixas);

  for (const c of confirmacoes as any[]) {
    let familiaId = c.familia_lista_id as string | null;
    let pessoaId = c.convidado_lista_id as string | null;

    // Se uma confirmação já apontava para uma pessoa que depois foi movida
    // para uma família, a promoção usa o ID da pessoa — nunca o nome.
    if (!familiaId && pessoaId) {
      const pessoaLigada = pessoas.find((p: any) => p.id === pessoaId) as any;
      if (pessoaLigada?.familia_id) {
        familiaId = pessoaLigada.familia_id;
        pessoaId = null;
        await admin.from('convidados')
          .update({ familia_lista_id: familiaId, convidado_lista_id: null })
          .eq('id', c.id);
        vinculadas += 1;
      }
    }

    const idsRegistradosAntes = membros
      .filter((m: any) => m.confirmacao_id === c.id)
      .map((m: any) => m.convidado_lista_id as string);

    if (!familiaId && !pessoaId) {
      const email = normalizarEmail(c.email || c.contato);
      const fam = (email && porEmailFamilia.get(email)) || acharPorTelefone(porTelFamilia, c.contato);
      const pes = !fam
        ? ((email && porEmailPessoa.get(email)) || acharPorTelefone(porTelPessoa, c.contato))
        : null;

      if (fam) {
        const idsDaFamilia = new Set(
          pessoas.filter((p: any) => p.familia_id === (fam as any).id).map((p: any) => p.id as string),
        );
        const idsSeguros = idsRegistradosAntes.filter((id) => idsDaFamilia.has(id));
        if (c.comparecera === false || idsSeguros.length > 0) {
          familiaId = (fam as any).id;
          await admin.from('convidados')
            .update({ familia_lista_id: familiaId, convidado_lista_id: null })
            .eq('id', c.id);
          vinculadas += 1;
        }
      } else if (pes) {
        if ((pes as any).familia_id) {
          const familiaPessoa = (pes as any).familia_id as string;
          const idsDaFamilia = new Set(
            pessoas.filter((p: any) => p.familia_id === familiaPessoa).map((p: any) => p.id as string),
          );
          const idsSeguros = idsRegistradosAntes.filter((id) => idsDaFamilia.has(id));
          if (c.comparecera === false || idsSeguros.length > 0) {
            familiaId = familiaPessoa;
            await admin.from('convidados')
              .update({ familia_lista_id: familiaId, convidado_lista_id: null })
              .eq('id', c.id);
            vinculadas += 1;
          }
        } else {
          pessoaId = (pes as any).id;
          await admin.from('convidados')
            .update({ convidado_lista_id: pessoaId, familia_lista_id: null })
            .eq('id', c.id);
          vinculadas += 1;
        }
      }
    }

    const novoStatus = c.comparecera === false ? 'nao_vai' : 'confirmado';

    if (pessoaId) {
      await admin.from('convidados_lista')
        .update({ status: novoStatus })
        .eq('evento_id', eventoId)
        .eq('id', pessoaId);
      statusAtualizados += 1;
      continue;
    }

    if (!familiaId) continue;

    const pessoasFamilia = pessoas.filter((p: any) => p.familia_id === familiaId);
    if (!pessoasFamilia.length) continue;

    if (c.comparecera === false) {
      const ids = pessoasFamilia.map((p: any) => p.id);
      await admin.from('convidados_lista')
        .update({ status: 'nao_vai' })
        .eq('evento_id', eventoId)
        .in('id', ids);
      statusAtualizados += ids.length;
      continue;
    }

    const idsRegistrados = idsRegistradosAntes
      .filter((id: string) => pessoasFamilia.some((p: any) => p.id === id));

    if (idsRegistrados.length) {
      const todosIds = pessoasFamilia.map((p: any) => p.id);
      await admin.from('convidados_lista')
        .update({ status: 'nao_vai' })
        .eq('evento_id', eventoId)
        .in('id', todosIds);
      await admin.from('convidados_lista')
        .update({ status: 'confirmado' })
        .eq('evento_id', eventoId)
        .in('id', idsRegistrados);
      statusAtualizados += idsRegistrados.length;
    }

    // Sem IDs de membros não há tentativa por nome. A confirmação permanece
    // no histórico para revisão manual na Central de convidados.
  }

  return { vinculadas, statusAtualizados, confirmacoes: confirmacoes.length };
}
