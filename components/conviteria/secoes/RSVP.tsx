'use client';

import { useState } from 'react';
import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';
import ModalRSVP from '../ModalRSVP';
import '../rsvp.css';

export default function RSVP({ cfg, secao, modo }: PropsSecao) {
  const [aberto, setAberto] = useState(false);
  const c = secao.config ?? {};

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">
        {c.titulo ?? 'Confirmação de presença'}
      </h2>

      <p className="cv-texto">
        {c.texto ??
          'Sua presença é muito importante para nós. Confirme seu nome e quem da sua família irá ao evento.'}
      </p>

      <button
        type="button"
        className="cv-botao"
        disabled={modo.previa || !modo.eventoId}
        onClick={() => setAberto(true)}
      >
        {c.rotuloBotao ?? 'Confirmar presença'}
      </button>

      {modo.previa && (
        <p className="cv-rsvp-previa">
          O formulário fica disponível depois que o convite é publicado.
        </p>
      )}

      {aberto && modo.eventoId && (
        <ModalRSVP
          eventoId={modo.eventoId}
          temaId={cfg.temaId}
          fonteId={cfg.fonteId}
          aoFechar={() => setAberto(false)}
        />
      )}
    </section>
  );
}
