'use client';

import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';

/** Serve para versiculo, frase de abertura e dress code. */
export default function Frase({ cfg, secao }: PropsSecao) {
  const c = secao.config ?? {};
  const texto: string = c.texto ?? cfg.textos?.[secao.tipo] ?? '';
  if (!texto && !c.titulo) return null;

  const comTitulo = Boolean(c.titulo);

  return (
    <section className="cv-secao">
      {comTitulo && <Broto className="cv-broto" />}
      {comTitulo && <h2 className="cv-titulo">{c.titulo}</h2>}
      {secao.tipo === 'frase' ? (
        <blockquote className="cv-frase">
          {/* white-space: pre-line no CSS: a quebra vem do proprio texto,
              sem <br />, que o editor web do GitHub costuma engolir. */}
          <p>{texto}</p>
          {c.autor && <cite>{c.autor}</cite>}
        </blockquote>
      ) : (
        <p className="cv-texto">{texto}</p>
      )}
      {c.destaque && <p className="cv-destaque">{c.destaque}</p>}
    </section>
  );
}
