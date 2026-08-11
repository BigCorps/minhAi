'use client';

import Image from 'next/image';
import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Presentes({ cfg, secao, modo }: PropsSecao) {
  const lista = cfg.presentes ?? [];
  const c = secao.config ?? {};

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Lista de presentes'}</h2>
      <p className="cv-texto">
        {c.texto ??
          'O maior presente é dividir esse dia com você. Mas, se quiser nos presentear, escolha uma cota abaixo.'}
      </p>

      <div className="cv-presentes">
        {lista.map((p) => (
          <article className="cv-presente" key={p.id}>
            <div className="cv-presente-img">
              {p.imagemUrl ? (
                <Image src={p.imagemUrl} alt="" width={300} height={300}
                       loading="lazy" sizes="150px" />
              ) : (
                // Item sem arquivo no catalogo continua funcionando.
                <svg viewBox="0 0 60 60" aria-hidden="true">
                  <rect x="9" y="24" width="42" height="28" rx="4"
                        fill="var(--cv-petala-clara)" stroke="var(--cv-petala-escura)" strokeWidth="2" />
                  <path d="M9 33h42M30 24v28" stroke="var(--cv-petala-escura)" strokeWidth="2" />
                  <path d="M30 24c-6-10-16-8-16-2 0 4 8 4 16 2zM30 24c6-10 16-8 16-2 0 4-8 4-16 2z"
                        fill="var(--cv-petala-media)" />
                </svg>
              )}
            </div>
            <p className="cv-presente-titulo">{p.titulo}</p>
            <p className="cv-presente-valor">
              {p.valorCentavos > 0 ? brl(p.valorCentavos) : 'Valor livre'}
            </p>
            <button
              type="button"
              className="cv-botao cv-botao-pequeno"
              disabled={p.esgotado || modo.previa}
            >
              {p.esgotado ? 'Já presenteado' : 'Presentear'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
