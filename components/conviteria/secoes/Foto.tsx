'use client';

import Image from 'next/image';
import type { PropsSecao } from '@/lib/conviteria/tipos';

/**
 * Acabamentos da foto principal.
 *
 * Tudo por CSS, sem processar a imagem: o mesmo arquivo serve a todos os
 * acabamentos, e trocar de opcao e instantaneo na previa. Processar geraria um
 * arquivo por escolha no Storage, com custo e sem ganho visual.
 *
 * `moldura` e o primeiro porque e o que ja existia — convite publicado antes
 * desta mudanca nao tem `acabamento` e cai aqui, sem mudar de aparencia.
 */
export const ACABAMENTOS = [
  { id: 'moldura',   nome: 'Moldura' },
  { id: 'arredondado', nome: 'Cantos suaves' },
  { id: 'circulo',   nome: 'Círculo' },
  { id: 'arco',      nome: 'Arco' },
  { id: 'desfoque',  nome: 'Bordas suaves' },
  { id: 'vinheta',   nome: 'Vinheta' },
  { id: 'polaroid',  nome: 'Polaroid' },
  { id: 'limpo',     nome: 'Sem moldura' },
] as const;

export type AcabamentoId = (typeof ACABAMENTOS)[number]['id'];
export const ACABAMENTO_PADRAO: AcabamentoId = 'moldura';

export default function Foto({ cfg }: PropsSecao) {
  const src = cfg.midia?.fotoPrincipal;
  if (!src) return null;

  const acabamento = cfg.midia?.acabamento ?? ACABAMENTO_PADRAO;

  return (
    <section className="cv-secao cv-secao-foto">
      <div className={`cv-moldura cv-acab-${acabamento}`}>
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
