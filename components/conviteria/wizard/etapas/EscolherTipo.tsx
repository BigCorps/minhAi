'use client';

import { acharTipo, TIPOS_EVENTO } from '@/lib/conviteria/tiposEvento';
import { Cartoes } from '../Campos';
import type { PropsEtapa } from '../Wizard';

export default function EscolherTipo({ estado, despachar, modo }: PropsEtapa) {
  // Na edicao o tipo esta congelado: trocar redefine as secoes e, na pratica,
  // transforma um casamento pago em outro evento. Mostra o escolhido em vez
  // de esconder a etapa — assim a trilha do topo nao muda de tamanho entre os
  // dois modos, e a pessoa entende que a informacao existe e esta travada.
  if (modo === 'editar') {
    const t = acharTipo(estado.cfg.tipoEventoId);
    return (
      <>
        <p className="wz-intro">Tipo escolhido quando você criou o convite.</p>
        <p className="wz-bloqueado">{t.nome}</p>
        <p className="wz-aviso">
          O tipo não muda depois de publicado. Para um evento diferente, crie
          um convite novo.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="wz-intro">
        O tipo define quais seções o convite já vem com elas ligadas e qual
        catálogo de presentes aparece. Dá para mudar tudo depois.
      </p>
      <Cartoes
        itens={TIPOS_EVENTO}
        selecionado={estado.cfg.tipoEventoId}
        onSelecionar={(id) => despachar({ tipo: 'trocarTipoEvento', id })}
        render={(t) => <span className="wz-cartao-nome">{t.nome}</span>}
      />
      <p className="wz-aviso">
        Trocar o tipo redefine as seções ativas. Textos e datas não se perdem.
      </p>
    </>
  );
}
