'use client';

import Image from 'next/image';
import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';

export default function Galeria({ cfg, secao }: PropsSecao) {
  const fotoPrincipalAtiva = cfg.secoes.some((s) => s.tipo === 'foto' && s.ativo);
  const principal = cfg.midia?.fotoPrincipal;
  const fotos = Array.from(new Set(cfg.midia?.galeria ?? []))
    .filter((src) => !(fotoPrincipalAtiva && principal && src === principal))
    .slice(0, 5);

  if (fotos.length === 0) return null;

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{secao.config?.titulo ?? 'Nossos momentos'}</h2>
      <div className="cv-galeria">
        {fotos.map((src, i) => (
          <div className="cv-galeria-item" key={src}>
            <Image
              src={src}
              alt={`Foto ${i + 1}`}
              width={400}
              height={400}
              loading="lazy"
              sizes="(max-width: 480px) 44vw, 190px"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
