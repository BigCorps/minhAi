'use client';

import Image from 'next/image';

export const FONTES_LACRE = [
  { id: 'pinyon', nome: 'Pinyon', familia: "'Pinyon Script', cursive" },
  { id: 'greatvibes', nome: 'Great Vibes', familia: "'Great Vibes', cursive" },
  { id: 'cormorant', nome: 'Cormorant', familia: "'Cormorant Garamond', serif" },
  { id: 'playfair', nome: 'Playfair', familia: "'Playfair Display', serif" },
  { id: 'jost', nome: 'Jost', familia: "'Jost', sans-serif" },
  { id: 'archivo', nome: 'Archivo', familia: "'Archivo', sans-serif" },
] as const;

export type FonteLacreId = (typeof FONTES_LACRE)[number]['id'];
export const FONTE_LACRE_PADRAO: FonteLacreId = 'pinyon';

export const FAMILIAS_LACRE = [
  'Pinyon Script', 'Great Vibes', 'Cormorant Garamond',
  'Playfair Display', 'Jost', 'Archivo',
];

export function familiaLacre(id?: string) {
  return (FONTES_LACRE.find((f) => f.id === id) ?? FONTES_LACRE[0]).familia;
}

export interface AjusteLacre {
  fonte?: string;
  escala?: number;
  x?: number;
  y?: number;
}

export const LACRES = [
  { id: 'nenhum', nome: 'Sem carimbo' },
  { id: 'liso', nome: 'Liso' },
  { id: 'classico', nome: 'Clássico' },
  { id: 'ornamentado', nome: 'Ornamentado' },
  { id: 'floral', nome: 'Floral' },
  { id: 'geometrico', nome: 'Geométrico' },
  { id: 'louro', nome: 'Louro' },
] as const;

export type LacreId = (typeof LACRES)[number]['id'];
export const LACRE_PADRAO: LacreId = 'classico';

export const LACRE_CORES = [
  { id: 'vermelho', nome: 'Vermelho', amostra: '#9d1f27', filtro: 'none' },
  { id: 'vinho', nome: 'Vinho', amostra: '#6f1d33', filtro: 'hue-rotate(-12deg) saturate(.9) brightness(.72)' },
  { id: 'rosa', nome: 'Rosa', amostra: '#c05b78', filtro: 'hue-rotate(330deg) saturate(.58) brightness(1.28)' },
  { id: 'dourado', nome: 'Dourado', amostra: '#b88932', filtro: 'sepia(.7) hue-rotate(350deg) saturate(1.55) brightness(1.08)' },
  { id: 'verde', nome: 'Verde', amostra: '#477455', filtro: 'hue-rotate(95deg) saturate(.78) brightness(.82)' },
  { id: 'azul', nome: 'Azul', amostra: '#355f86', filtro: 'hue-rotate(190deg) saturate(.8) brightness(.84)' },
] as const;

export type LacreCorId = (typeof LACRE_CORES)[number]['id'];
export const LACRE_COR_PADRAO: LacreCorId = 'vermelho';

export function filtroLacre(cor?: string) {
  return (LACRE_CORES.find((c) => c.id === cor) ?? LACRE_CORES[0]).filtro;
}

export function urlLacre(id: string) {
  return `/brands/convite/lacres/lacre-${id}.webp`;
}

export default function LacreArte({
  lacreId = LACRE_PADRAO,
  lacreCor = LACRE_COR_PADRAO,
  iniciais = '',
  logoUrl,
  tamanho = 116,
  ajuste,
}: {
  lacreId?: string;
  lacreCor?: string;
  iniciais?: string;
  logoUrl?: string | null;
  tamanho?: number;
  ajuste?: AjusteLacre;
}) {
  const semCera = lacreId === 'nenhum';
  const escala = (ajuste?.escala ?? 34) / 100;
  const dx = ajuste?.x ?? 0;
  const dy = ajuste?.y ?? 0;
  const escalaLogo = semCera ? Math.min(.82, escala * 1.8) : escala;

  return (
    <div className={`cv-lacre${semCera ? ' cv-lacre-sem-cera' : ''}`}
      style={{ width: tamanho, height: tamanho }}>
      {!semCera && (
        <Image
          src={urlLacre(lacreId)}
          alt=""
          width={tamanho}
          height={tamanho}
          priority
          className="cv-lacre-arte"
          style={{ filter: filtroLacre(lacreCor) }}
        />
      )}

      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="cv-lacre-logo"
          style={{
            width: tamanho * escalaLogo,
            maxHeight: semCera ? '82%' : '46%',
            filter: semCera
              ? 'drop-shadow(0 4px 8px rgba(0,0,0,.18))'
              : undefined,
            transform: `translate(${(dx / 100) * tamanho}px, ${(dy / 100) * tamanho}px)`,
          }}
        />
      ) : (
        !semCera && iniciais && (
          <span
            className="cv-lacre-iniciais"
            style={{
              fontSize: tamanho * escala,
              fontFamily: familiaLacre(ajuste?.fonte),
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
