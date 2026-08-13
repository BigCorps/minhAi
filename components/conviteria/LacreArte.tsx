'use client';

// components/conviteria/LacreArte.tsx
//
// Lacre de cera como IMAGEM, com as iniciais sobrepostas em texto.
//
// Por que assim, e nao o SVG gerado que existia antes: o monograma vetorial
// dependia das variaveis do tema chegarem ao contexto, e quando nao chegavam o
// `fill` caia para o valor inicial — preto — e o lacre virava um borrao. A arte
// como imagem sai identica em qualquer navegador. Sobra de dinamico apenas as
// duas letras, que e o pedaco que precisa variar por casal.
//
// A area livre no centro das artes tem raio ~80px em 464 (a mais apertada e a
// floral). Por isso o texto e limitado a 34% do lado: passar disso encosta no
// desenho e a leitura morre.

import Image from 'next/image';

export const LACRES = [
  { id: 'liso',        nome: 'Liso' },
  { id: 'classico',    nome: 'Clássico' },
  { id: 'ornamentado', nome: 'Ornamentado' },
  { id: 'floral',      nome: 'Floral' },
  { id: 'geometrico',  nome: 'Geométrico' },
  { id: 'louro',       nome: 'Louro' },
] as const;

export type LacreId = (typeof LACRES)[number]['id'];

export const LACRE_PADRAO: LacreId = 'classico';

export function urlLacre(id: string) {
  return `/brands/convite/lacres/lacre-${id}.webp`;
}

export default function LacreArte({
  lacreId = LACRE_PADRAO,
  iniciais = '',
  logoUrl,
  tamanho = 116,
}: {
  lacreId?: string;
  iniciais?: string;
  /** Logo do cliente. Quando presente, substitui as iniciais. */
  logoUrl?: string | null;
  tamanho?: number;
}) {
  return (
    <div className="cv-lacre" style={{ width: tamanho, height: tamanho }}>
      <Image
        src={urlLacre(lacreId)}
        alt=""
        width={tamanho}
        height={tamanho}
        priority
        className="cv-lacre-arte"
      />

      {logoUrl ? (
        // Logo do cliente ocupa o miolo. As iniciais NAO aparecem junto: o
        // logo ja e a marca, e as duas coisas competiriam no mesmo espaco.
        <img src={logoUrl} alt="" className="cv-lacre-logo" />
      ) : (
        iniciais && (
          <span
            className="cv-lacre-iniciais"
            style={{ fontSize: tamanho * 0.34 }}
            aria-label={`Lacre com as iniciais ${iniciais}`}
          >
            {iniciais}
          </span>
        )
      )}
    </div>
  );
}
