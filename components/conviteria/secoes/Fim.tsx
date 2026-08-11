'use client';

import type { PropsSecao } from '@/lib/conviteria/tipos';

export default function Fim({ cfg, secao }: PropsSecao) {
  const c = secao.config ?? {};
  return (
    <section className="cv-secao cv-secao-fim">
      <p className="cv-despedida">{c.texto ?? 'Esperamos por você!'}</p>
      {cfg.anfitrioes.completo && (
        <p className="cv-assinatura">{cfg.anfitrioes.completo}</p>
      )}
    </section>
  );
}
