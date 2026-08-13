'use client';

import { useState } from 'react';
import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';
import ModalPresentes from '../ModalPresentes';

/**
 * A secao agora e um convite para abrir a lista, nao a lista.
 *
 * Antes os cartoes vinham inline: com 24 itens de casamento, a lista empurrava
 * o resto do convite para muito baixo, e o botao "Presentear" nem tinha
 * onClick — era decoracao. Agora um botao abre o modal, onde o PIX acontece.
 */
export default function Presentes({ cfg, secao, modo }: PropsSecao) {
  const [aberto, setAberto] = useState(false);
  const lista = cfg.presentes ?? [];
  const c = secao.config ?? {};

  if (lista.length === 0) return null;

  const disponiveis = lista.filter((p) => !p.esgotado).length;

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Lista de presentes'}</h2>
      <p className="cv-texto">
        {c.texto ??
          'O maior presente é dividir esse dia com você. Mas, se quiser nos presentear, escolha uma cota.'}
      </p>

      <button
        type="button"
        className="cv-botao"
        // Na previa nao ha evento, entao nao ha o que pagar. Desabilitar pelo
        // eventoId dispensa uma flag separada.
        disabled={modo.previa || !modo.eventoId}
        onClick={() => setAberto(true)}
      >
        Ver lista de presentes
      </button>

      <p className="cv-presentes-contagem">
        {disponiveis === 0
          ? 'Todas as cotas já foram presenteadas'
          : `${disponiveis} ${disponiveis === 1 ? 'opção disponível' : 'opções disponíveis'}`}
      </p>

      {aberto && modo.eventoId && (
        <ModalPresentes
          eventoId={modo.eventoId}
          presentes={lista}
          aoFechar={() => setAberto(false)}
        />
      )}
    </section>
  );
}
