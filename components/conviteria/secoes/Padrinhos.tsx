'use client';

import Image from 'next/image';
import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';

export default function Padrinhos({ cfg, secao }: PropsSecao) {
  const lista = cfg.padrinhos ?? [];
  if (lista.length === 0) return null;

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{secao.config?.titulo ?? 'Padrinhos'}</h2>
      {secao.config?.texto && <p className="cv-texto">{secao.config.texto}</p>}
      <ul className="cv-padrinhos">
        {lista.map((p) => (
          <li key={p.nome}>
            {p.fotoUrl && (
              <div className="cv-padrinho-foto">
                <Image src={p.fotoUrl} alt={p.nome} width={200} height={200}
                       loading="lazy" sizes="120px" />
              </div>
            )}
            <span className="cv-padrinho-nome">{p.nome}</span>
            {p.papel && <span className="cv-padrinho-papel">{p.papel}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
