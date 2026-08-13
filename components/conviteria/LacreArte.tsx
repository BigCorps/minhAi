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

/**
 * Fontes do monograma, independentes da fonte do convite.
 *
 * Precisa ser escolha separada: a fonte display do convite e pensada para
 * frases, e algumas ficam ilegiveis reduzidas a duas letras dentro de um
 * circulo de 40px. Aqui interessa peso de traco e largura, nao elegancia em
 * texto corrido.
 */
export const FONTES_LACRE = [
  { id: 'pinyon',    nome: 'Pinyon',    familia: "'Pinyon Script', cursive" },
  { id: 'greatvibes',nome: 'Great Vibes', familia: "'Great Vibes', cursive" },
  { id: 'cormorant', nome: 'Cormorant', familia: "'Cormorant Garamond', serif" },
  { id: 'playfair',  nome: 'Playfair',  familia: "'Playfair Display', serif" },
  { id: 'jost',      nome: 'Jost',      familia: "'Jost', sans-serif" },
  { id: 'archivo',   nome: 'Archivo',   familia: "'Archivo', sans-serif" },
] as const;

export type FonteLacreId = (typeof FONTES_LACRE)[number]['id'];
export const FONTE_LACRE_PADRAO: FonteLacreId = 'pinyon';

/**
 * Familias do Google que o seletor de fonte do lacre precisa.
 *
 * O wizard carrega apenas as fontes do grupo do evento. Sem somar estas, num
 * aniversario o seletor mostraria Pinyon e Great Vibes na fonte do sistema —
 * seis opcoes visualmente identicas.
 */
export const FAMILIAS_LACRE = [
  'Pinyon Script',
  'Great Vibes',
  'Cormorant Garamond',
  'Playfair Display',
  'Jost',
  'Archivo',
];

export function familiaLacre(id?: string) {
  return (FONTES_LACRE.find((f) => f.id === id) ?? FONTES_LACRE[0]).familia;
}

/** Ajuste fino do monograma. Valores em % do lado do lacre. */
export interface AjusteLacre {
  fonte?: string;
  /** Tamanho da letra, em % do lado. Padrao 34. */
  escala?: number;
  /** Deslocamento horizontal e vertical, em % do lado. Padrao 0. */
  x?: number;
  y?: number;
}

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
  ajuste,
}: {
  lacreId?: string;
  iniciais?: string;
  /** Logo do cliente. Quando presente, substitui as iniciais. */
  logoUrl?: string | null;
  tamanho?: number;
  ajuste?: AjusteLacre;
}) {
  // Fontes cursivas nao tem metrica previsivel: o "J" desce abaixo da linha de
  // base e empurra o par para cima, o "M" e largo e desloca o centro optico.
  // Nao ha formula que acerte para todo par de letras — por isso o ajuste e
  // manual, e o padrao e so um ponto de partida decente.
  const escala = (ajuste?.escala ?? 34) / 100;
  const dx = ajuste?.x ?? 0;
  const dy = ajuste?.y ?? 0;
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
            style={{
              fontSize: tamanho * escala,
              fontFamily: familiaLacre(ajuste?.fonte),
              // translate em % do proprio elemento manteria o passo dependente
              // do tamanho do texto; em px do lado do lacre o ajuste vale
              // igual na previa de 72px e no convite de 116px.
              transform: `translate(${(dx / 100) * tamanho}px, ${(dy / 100) * tamanho}px)`,
            }}
            aria-label={`Lacre com as iniciais ${iniciais}`}
          >
            {iniciais}
          </span>
        )
      )}
    </div>
  );
}
