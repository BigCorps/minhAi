'use client';

import { useState } from 'react';
import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';
import ModalPresentes from '../ModalPresentes';

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
          temaId={cfg.temaId}
          fonteId={cfg.fonteId}
          aoFechar={() => setAberto(false)}
        />
      )}
    </section>
  );
}
