'use client';
import type { PropsSecao } from '@/lib/conviteria/tipos';

export default function Marca({ cfg, secao }: PropsSecao) {
  const src = cfg.midia?.logoEventoUrl;
  if (!src) return null;
  const altura = Number(secao.config?.altura ?? 64);
  return (
    <section className="cv-secao cv-secao-marca">
      <img
        src={src}
        alt={String(secao.config?.alt ?? 'Logo do evento')}
        className="cv-marca-evento"
        style={{ maxHeight: Math.max(40, Math.min(96, altura)) }}
      />
    </section>
  );
}
