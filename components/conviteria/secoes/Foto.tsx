'use client';

import Image from 'next/image';
import type { PropsSecao } from '@/lib/conviteria/tipos';

export default function Foto({ cfg }: PropsSecao) {
  const src = cfg.midia?.fotoPrincipal;
  if (!src) return null;

  return (
    <section className="cv-secao cv-secao-foto">
      <div className="cv-moldura">
        <Image
          src={src}
          alt={cfg.anfitrioes.exibicao}
          width={900}
          height={1125}
          priority
          sizes="(max-width: 480px) 92vw, 400px"
          style={{ objectPosition: cfg.midia?.enquadramento ?? 'center' }}
        />
      </div>
    </section>
  );
}
