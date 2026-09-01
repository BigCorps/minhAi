'use client';

import type { PropsSecao } from '@/lib/conviteria/tipos';

export default function Nomes({ cfg, secao }: PropsSecao) {
  const c = secao.config ?? {};
  return (
    <section className="cv-secao">
      {c.texto && <p className="cv-chamada">{c.texto}</p>}
      <h1 className="cv-nomes">{cfg.anfitrioes.exibicao}</h1>
      {cfg.evento.convocacao && (
        <p className="cv-sub">{cfg.evento.convocacao}</p>
      )}
    </section>
  );
}
