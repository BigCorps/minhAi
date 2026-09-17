'use client';

import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';

export default function Programacao({ cfg, secao }: PropsSecao) {
  const itens = (cfg.programacao ?? []).filter((x) => x.titulo?.trim());
  if (!itens.length) return null;
  const c = secao.config ?? {};
  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Programação'}</h2>
      {c.texto && <p className="cv-texto">{c.texto}</p>}
      <div style={{ display: 'grid', gap: 12, marginTop: 18, textAlign: 'left' }}>
        {itens.map((item) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 12, alignItems: 'start', padding: '12px 14px', border: '1px solid color-mix(in srgb, var(--cv-acento) 24%, transparent)', borderRadius: 14, background: 'color-mix(in srgb, var(--cv-papel) 88%, white)' }}>
            <strong style={{ color: 'var(--cv-acento-texto)', fontFamily: 'var(--cv-corpo)' }}>{item.horario}</strong>
            <div>
              <strong style={{ color: 'var(--cv-tinta)', fontFamily: 'var(--cv-corpo)' }}>{item.titulo}</strong>
              {item.descricao && <p style={{ margin: '4px 0 0', color: 'var(--cv-tinta-suave)', fontFamily: 'var(--cv-corpo)', lineHeight: 1.45 }}>{item.descricao}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
