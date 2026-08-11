'use client';

import { TIPOS_EVENTO } from '@/lib/conviteria/tiposEvento';
import { Cartoes } from '../Campos';
import type { PropsEtapa } from '../Wizard';

export default function EscolherTipo({ estado, despachar }: PropsEtapa) {
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
