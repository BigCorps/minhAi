'use client';

import { useEffect, useState } from 'react';
import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';
import ModalRSVP from '../ModalRSVP';
import '../rsvp.css';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function RSVP({ cfg, secao, modo }: PropsSecao) {
  const [aberto, setAberto] = useState(false);
  const [tokenInicial, setTokenInicial] = useState<string | null>(null);
  const [tokenContexto, setTokenContexto] = useState<string | null>(null);
  const [prazo, setPrazo] = useState<string | null>(null);
  const [encerrado, setEncerrado] = useState(false);
  const c = secao.config ?? {};

  useEffect(() => {
    if (modo.previa || !modo.eventoId || typeof window === 'undefined') return;

    void fetch(`/api/conviteria/rsvp?eventoId=${encodeURIComponent(modo.eventoId)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setPrazo(typeof d?.prazo === 'string' ? d.prazo : null);
        setEncerrado(Boolean(d?.encerrado));
      })
      .catch(() => undefined);

    const urlAtual = new URL(window.location.href);
    const tokenConvite = urlAtual.searchParams.get('convite')?.trim() ?? '';
    if (UUID_RE.test(tokenConvite)) setTokenContexto(tokenConvite);

    const tokenRsvp = urlAtual.searchParams.get('rsvp')?.trim() ?? '';
    if (!UUID_RE.test(tokenRsvp)) return;
    setTokenInicial(tokenRsvp);
    setAberto(true);
  }, [modo.eventoId, modo.previa]);

  function fechar() {
    setAberto(false);
    if (!tokenInicial || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('rsvp');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setTokenInicial(null);
  }

  const prazoFormatado = prazo ? prazo.split('-').reverse().join('/') : null;

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Confirmação de presença'}</h2>
      <p className="cv-texto">
        {c.texto ?? 'Sua presença é muito importante para nós. Confirme seu nome e quem da sua família irá ao evento.'}
      </p>
      {prazoFormatado && !encerrado && (
        <p className="cv-rsvp-previa"><strong>Confirme até {prazoFormatado}.</strong></p>
      )}
      {encerrado ? (
        <p className="cv-rsvp-previa"><strong>O prazo de confirmação online foi encerrado.</strong> Em caso de dúvida, entre em contato com os anfitriões.</p>
      ) : (
        <button
          type="button"
          className="cv-botao"
          disabled={modo.previa || !modo.eventoId}
          onClick={() => { setTokenInicial(tokenContexto); setAberto(true); }}
        >
          {c.rotuloBotao ?? 'Confirmar presença'}
        </button>
      )}

      {modo.previa && <p className="cv-rsvp-previa">O formulário fica disponível depois que o convite é publicado.</p>}

      {aberto && modo.eventoId && (
        <ModalRSVP
          eventoId={modo.eventoId}
          temaId={cfg.temaId}
          fonteId={cfg.fonteId}
          tokenInicial={tokenInicial}
          aoFechar={fechar}
        />
      )}
    </section>
  );
}
