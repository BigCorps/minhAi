'use client';

import Image from 'next/image';

// A tabela mora em lib/conviteria/fontesLacre.ts para poder ser lida tambem
// pelo SERVIDOR: este arquivo e 'use client', e server component que importa
// de modulo cliente recebe uma referencia, nao a funcao. Chamar essa
// referencia no servidor derruba a pagina.
//
// Reexportado aqui para nao quebrar os imports que ja existem.
import { familiaLacre } from '@/lib/conviteria/fontesLacre';

export {
  FONTES_LACRE,
  FAMILIAS_LACRE,
  FONTE_LACRE_PADRAO,
  familiaLacre,
} from '@/lib/conviteria/fontesLacre';
export type { FonteLacreId } from '@/lib/conviteria/fontesLacre';

export interface AjusteLacre {
  fonte?: string;
  escala?: number;
  x?: number;
  y?: number;
}

export interface AjusteLogoLacre {
  /** Porcentagem da caixa do lacre. */
  escala?: number;
  /** Deslocamento em porcentagem do tamanho total do lacre. */
  x?: number;
  y?: number;
  /** Graus. */
  rotacao?: number;
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
  logoAjuste,
}: {
  lacreId?: string;
  lacreCor?: string;
  iniciais?: string;
  logoUrl?: string | null;
  tamanho?: number;
  ajuste?: AjusteLacre;
  logoAjuste?: AjusteLogoLacre;
}) {
  const semCera = lacreId === 'nenhum';

  const escalaMonograma = (ajuste?.escala ?? 34) / 100;
  const dxMonograma = ajuste?.x ?? 0;
  const dyMonograma = ajuste?.y ?? 0;

  // Configs antigos de logo usavam lacreAjuste. O fallback preserva a aparência
  // de convites já criados, enquanto os novos passam a ter ajuste independente.
  const escalaLogoPct =
    logoAjuste?.escala ??
    (logoUrl ? ajuste?.escala : undefined) ??
    (semCera ? 62 : 38);

  const dxLogo =
    logoAjuste?.x ??
    (logoUrl ? ajuste?.x : undefined) ??
    0;

  const dyLogo =
    logoAjuste?.y ??
    (logoUrl ? ajuste?.y : undefined) ??
    0;

  const rotacaoLogo = logoAjuste?.rotacao ?? 0;
  const escalaLogo = Math.max(0.12, Math.min(1.05, escalaLogoPct / 100));

  return (
    <div
      className={`cv-lacre${semCera ? ' cv-lacre-sem-cera' : ''}`}
      style={{ width: tamanho, height: tamanho }}
    >
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
            maxHeight: semCera ? '100%' : '88%',
            filter: semCera
              ? 'drop-shadow(0 4px 8px rgba(0,0,0,.18))'
              : undefined,
            transform: [
              `translate(${(dxLogo / 100) * tamanho}px, ${(dyLogo / 100) * tamanho}px)`,
              `rotate(${rotacaoLogo}deg)`,
            ].join(' '),
          }}
        />
      ) : (
        !semCera && iniciais && (
          <span
            className="cv-lacre-iniciais"
            style={{
              fontSize: tamanho * escalaMonograma,
              fontFamily: familiaLacre(ajuste?.fonte),
              transform: `translate(${(dxMonograma / 100) * tamanho}px, ${(dyMonograma / 100) * tamanho}px)`,
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
