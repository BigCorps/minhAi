'use client';

import type { PropsSecao } from '@/lib/conviteria/tipos';

export default function DataHora({ cfg, secao }: PropsSecao) {
  const c = secao.config ?? {};
  const { dataExtenso, diaSemana, horario } = cfg.evento;

  return (
    <section className="cv-bloco">
      <p className="cv-rotulo cv-rotulo-claro">
        {c.titulo ?? 'A realizar-se no dia'}
      </p>
      <p className="cv-data">{dataExtenso}</p>
      <p className="cv-hora">
        {diaSemana}, {horario}
      </p>
      {c.destaque && <p className="cv-aviso">{String(c.destaque)}</p>}
    </section>
  );
}
