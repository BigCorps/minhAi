'use client';

import type { CSSProperties } from 'react';
import type { PropsSecao } from '@/lib/conviteria/tipos';

export default function Marca({ cfg, secao }: PropsSecao) {
  const src = cfg.midia?.logoEventoUrl;
  if (!src) return null;

  const ajuste = cfg.midia?.logoEventoAjuste;
  const largura = Math.max(20, Math.min(92, Number(ajuste?.largura ?? 52)));
  const alinhamento = ajuste?.alinhamento ?? 'centro';

  const margem: CSSProperties =
    alinhamento === 'esquerda'
      ? { marginLeft: 0, marginRight: 'auto' }
      : alinhamento === 'direita'
        ? { marginLeft: 'auto', marginRight: 0 }
        : { marginLeft: 'auto', marginRight: 'auto' };

  // Convites antigos podem ter `altura` em config da seção. Mantemos como teto.
  const alturaLegada = Number(secao.config?.altura ?? 120);

  return (
    <section className="cv-secao cv-secao-marca">
      <img
        src={src}
        alt={String(secao.config?.alt ?? 'Logo do evento')}
        className="cv-marca-evento"
        style={{
          width: `${largura}%`,
          maxWidth: 340,
          maxHeight: Math.max(48, Math.min(180, alturaLegada)),
          ...margem,
        }}
      />
    </section>
  );
}
