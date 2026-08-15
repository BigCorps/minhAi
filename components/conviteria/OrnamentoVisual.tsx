'use client';

import { useId } from 'react';

const stroke = {
  fill: 'none',
  stroke: 'var(--cv-acento)',
  strokeWidth: 1.25,
} as const;

/* ==========================================================================
   CASAMENTO ORIGINAL
   Geometria portada do repositório BigCorps/convite, usado no casamento
   Miriam & Ithiel. As cores continuam vindo do tema atual da ConviteIA.
   ========================================================================== */

const PETALA =
  'M0 0 C -12 -5 -14 -17 -6 -21 C -2 -23 2 -23 6 -21 C 14 -17 12 -5 0 0 Z';

const CAMADAS: Array<[number, number, 'claro' | 'medio', number]> = [
  [6, 1.0, 'claro', 0],
  [5, 0.72, 'medio', 30],
  [4, 0.46, 'medio', 58],
];

const CLARO_2 =
  'color-mix(in srgb, var(--cv-petala-clara) 76%, var(--cv-papel) 24%)';
const MEDIO_2 =
  'color-mix(in srgb, var(--cv-petala-media) 78%, var(--cv-papel) 22%)';
const FOLHA_CLARA =
  'color-mix(in srgb, var(--cv-folha) 72%, var(--cv-papel) 28%)';
const BROTO =
  'color-mix(in srgb, var(--cv-petala-media) 58%, var(--cv-papel) 42%)';

function RosaOriginal({
  prefixo,
  id,
  x,
  y,
  s = 1,
  rot = 0,
  claro = 'var(--cv-petala-clara)',
  medio = 'var(--cv-petala-media)',
  escuro = 'var(--cv-petala-escura)',
}: {
  prefixo: string;
  id: number;
  x: number;
  y: number;
  s?: number;
  rot?: number;
  claro?: string;
  medio?: string;
  escuro?: string;
}) {
  const tons = { claro, medio };
  const semente = id * 37;

  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle r="21" fill={`url(#${prefixo}-rosa-${id})`} />

      {CAMADAS.map(([n, escala, tom, deslocamento], ci) =>
        Array.from({ length: n }, (_, k) => {
          // Mesma assimetria proposital do convite original.
          const ang =
            deslocamento +
            (k * 360) / n +
            (((semente + k * 17 + ci * 11) % 13) - 6);

          const esc =
            escala *
            (1 + (((semente + k * 7 + ci * 5) % 11) - 5) / 90);

          return (
            <path
              key={`${ci}-${k}`}
              d={PETALA}
              fill={tons[tom]}
              stroke={escuro}
              strokeOpacity="0.16"
              strokeWidth="0.7"
              transform={`rotate(${ang.toFixed(1)}) scale(${esc.toFixed(3)})`}
            />
          );
        })
      )}

      <path
        d="M0 -4.5 A4.5 4.5 0 1 1 -3.9 2.2 A6.2 6.2 0 1 0 5.6 -2.8"
        fill="none"
        stroke={escuro}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.62"
      />
    </g>
  );
}

function DefsRosaOriginal({ prefixo }: { prefixo: string }) {
  return (
    <defs>
      {[0, 1, 2, 3].map((i) => (
        <radialGradient
          key={i}
          id={`${prefixo}-rosa-${i}`}
          cx="42%"
          cy="34%"
          r="70%"
        >
          <stop
            offset="55%"
            stopColor="var(--cv-petala-media)"
            stopOpacity="0"
          />
          <stop
            offset="100%"
            stopColor="var(--cv-petala-escura)"
            stopOpacity="0.22"
          />
        </radialGradient>
      ))}
    </defs>
  );
}

function RamoOriginal({
  d,
  folhas,
  cor = 'var(--cv-folha)',
}: {
  d: string;
  folhas: Array<[number, number, number, number]>;
  cor?: string;
}) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="var(--cv-caule)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {folhas.map(([fx, fy, fr, fs], i) => (
        <g
          key={i}
          transform={`translate(${fx} ${fy}) rotate(${fr}) scale(${fs})`}
        >
          <ellipse rx="6.5" ry="12" fill={cor} opacity="0.88" />
          <path
            d="M0 -10 L0 10"
            stroke="var(--cv-caule)"
            strokeWidth="0.6"
            opacity="0.4"
          />
        </g>
      ))}
    </g>
  );
}

function CasamentoOriginalCanto({ className = '' }: { className?: string }) {
  const prefixo = useId().replace(/:/g, '');

  return (
    <svg
      className={className}
      viewBox="0 0 220 220"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <DefsRosaOriginal prefixo={prefixo} />

      <RamoOriginal
        d="M4 118 C 40 112 66 92 84 62 C 96 42 104 24 106 6"
        folhas={[
          [18, 112, -28, 1],
          [36, 104, -34, 0.92],
          [54, 90, -44, 1.05],
          [70, 72, -52, 0.9],
          [84, 50, -62, 1],
          [95, 28, -70, 0.85],
          [30, 122, 148, 0.8],
          [58, 104, 140, 0.75],
        ]}
      />

      <RamoOriginal
        d="M2 74 C 30 70 52 54 64 30 C 70 18 74 10 76 2"
        folhas={[
          [14, 70, -20, 0.8],
          [32, 60, -36, 0.85],
          [50, 42, -50, 0.78],
          [64, 20, -66, 0.7],
        ]}
        cor={FOLHA_CLARA}
      />

      <RamoOriginal
        d="M60 150 C 46 128 30 116 6 106"
        folhas={[
          [50, 138, 40, 0.7],
          [34, 124, 30, 0.66],
          [18, 112, 18, 0.6],
        ]}
        cor={FOLHA_CLARA}
      />

      <RosaOriginal
        prefixo={prefixo}
        id={0}
        x={34}
        y={38}
        s={1.35}
        rot={-12}
      />

      <RosaOriginal
        prefixo={prefixo}
        id={1}
        x={74}
        y={82}
        s={1}
        rot={22}
        claro={CLARO_2}
        medio={MEDIO_2}
      />

      <RosaOriginal
        prefixo={prefixo}
        id={2}
        x={14}
        y={92}
        s={0.78}
        rot={40}
      />

      <RosaOriginal
        prefixo={prefixo}
        id={3}
        x={64}
        y={16}
        s={0.62}
        rot={-30}
        claro={CLARO_2}
        medio={MEDIO_2}
      />

      {[
        [96, 60],
        [104, 74],
        [90, 96],
        [30, 132],
        [46, 118],
        [12, 60],
      ].map(([bx, by], i) => (
        <circle
          key={i}
          cx={bx}
          cy={by}
          r={3.4}
          fill={BROTO}
          opacity="0.85"
        />
      ))}
    </svg>
  );
}

function CasamentoOriginalDivisor() {
  const prefixo = useId().replace(/:/g, '');

  const direita: Array<[number, number, number, number]> = [
    [128, 20, 62, 0.62],
    [148, 17, 74, 0.54],
    [166, 15, 86, 0.46],
    [136, 26, 116, 0.5],
    [156, 24, 104, 0.42],
  ];

  const esquerda = direita.map(
    ([x, y, r, e]) =>
      [220 - x, y, -r, e] as [number, number, number, number]
  );

  return (
    <svg
      className="cv-orn-divisor"
      viewBox="0 0 220 44"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <DefsRosaOriginal prefixo={prefixo} />

      <path
        d="M120 21 C 140 19 164 18 186 21"
        fill="none"
        stroke="var(--cv-caule)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M100 21 C 80 19 56 18 34 21"
        fill="none"
        stroke="var(--cv-caule)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />

      {[...direita, ...esquerda].map(([x, y, r, e], i) => (
        <ellipse
          key={i}
          rx="6.5"
          ry="12"
          fill={i % 3 === 0 ? 'var(--cv-folha)' : FOLHA_CLARA}
          opacity="0.85"
          transform={`translate(${x} ${y}) rotate(${r}) scale(${e})`}
        />
      ))}

      <circle cx="196" cy="21" r="2.6" fill={BROTO} />
      <circle cx="24" cy="21" r="2.6" fill={BROTO} />

      <RosaOriginal
        prefixo={prefixo}
        id={0}
        x={110}
        y={21}
        s={0.62}
        rot={-8}
      />
    </svg>
  );
}

/* ==========================================================================
   NOVOS ESTILOS
   ========================================================================== */

function AltaCosturaCanto({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M8 104 C27 94 38 72 41 48 C44 25 57 12 78 8"
        {...stroke}
        strokeWidth="1"
        opacity=".55"
      />
      <path
        d="M18 108 C44 92 58 67 61 39 C63 23 74 14 98 8"
        {...stroke}
        strokeWidth=".75"
        opacity=".3"
      />
      <path
        d="M34 75 C41 59 50 49 64 42 C74 37 82 28 86 16"
        {...stroke}
        strokeWidth=".9"
        opacity=".58"
      />

      <path
        d="M57 45 C48 37 49 26 58 22 C67 19 75 27 72 36 C70 43 65 47 57 45 Z"
        fill="var(--cv-petala-clara)"
        stroke="var(--cv-acento)"
        strokeWidth=".65"
        opacity=".78"
      />
      <path
        d="M74 28 C70 19 76 12 84 14 C91 16 93 24 88 30 C84 35 78 34 74 28 Z"
        fill="var(--cv-petala-media)"
        opacity=".58"
      />

      {[32, 48, 68, 87].map((v, i) => (
        <circle
          key={v}
          cx={v}
          cy={95 - i * 23}
          r={i === 1 ? 2.8 : 2}
          fill="var(--cv-petala-media)"
          stroke="var(--cv-papel)"
          strokeWidth=".7"
          opacity=".88"
        />
      ))}
    </svg>
  );
}

function AltaCosturaDivisor() {
  return (
    <svg className="cv-orn-divisor" viewBox="0 0 240 42" aria-hidden="true">
      <path
        d="M27 25 C67 25 83 20 105 21"
        {...stroke}
        strokeWidth=".75"
        opacity=".35"
      />
      <path
        d="M213 25 C173 25 157 20 135 21"
        {...stroke}
        strokeWidth=".75"
        opacity=".35"
      />
      <path
        d="M28 19 C68 19 88 23 105 21 M212 19 C172 19 152 23 135 21"
        {...stroke}
        strokeWidth=".7"
        opacity=".25"
      />
      <ellipse
        cx="120"
        cy="21"
        rx="11"
        ry="7"
        fill="var(--cv-petala-clara)"
        stroke="var(--cv-acento)"
        strokeWidth=".8"
        opacity=".86"
      />
      <ellipse
        cx="120"
        cy="21"
        rx="5"
        ry="3"
        fill="var(--cv-petala-media)"
        opacity=".75"
      />
      {[97, 143].map((x) => (
        <circle
          key={x}
          cx={x}
          cy="21"
          r="2.2"
          fill="var(--cv-acento)"
          opacity=".55"
        />
      ))}
    </svg>
  );
}

function ImperialCanto({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M9 104 C18 82 23 59 20 40
           C19 27 27 19 39 22
           C51 25 50 41 39 43
           C30 45 27 35 33 31
           M20 61 C39 58 54 45 59 27
           C63 14 75 9 87 13
           C101 18 99 35 88 38
           C77 41 73 29 80 24"
        {...stroke}
        strokeWidth="1.1"
        opacity=".65"
        strokeLinecap="round"
      />
      <path
        d="M48 62 C57 52 69 48 83 50
           C72 55 67 63 68 74
           C61 66 55 63 48 62 Z"
        fill="var(--cv-petala-clara)"
        stroke="var(--cv-acento)"
        strokeWidth=".65"
        opacity=".62"
      />
      <path
        d="M18 92 C40 84 58 72 73 55"
        {...stroke}
        strokeWidth=".8"
        opacity=".38"
      />
      <path
        d="M58 28 L63 19 L68 28 L63 37 Z"
        fill="var(--cv-petala-media)"
        opacity=".72"
      />
    </svg>
  );
}

function ImperialDivisor() {
  return (
    <svg className="cv-orn-divisor" viewBox="0 0 240 42" aria-hidden="true">
      <path
        d="M24 22 C50 22 70 22 91 21
           C104 20 106 10 113 9
           C108 18 112 22 120 22
           C128 22 132 18 127 9
           C134 10 136 20 149 21
           C170 22 190 22 216 22"
        {...stroke}
        opacity=".58"
      />
      <path
        d="M81 27 C96 27 103 32 110 37
           C112 31 115 27 120 27
           C125 27 128 31 130 37
           C137 32 144 27 159 27"
        {...stroke}
        strokeWidth=".9"
        opacity=".38"
      />
      <path
        d="M120 12 l7 9 -7 9 -7-9z"
        fill="var(--cv-petala-media)"
        stroke="var(--cv-acento)"
        strokeWidth=".55"
        opacity=".66"
      />
    </svg>
  );
}

function ArtDecoCanto({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M10 104 L10 56 L56 10"
        {...stroke}
        strokeWidth="1"
        opacity=".42"
      />
      <path
        d="M21 104 L21 63 L63 21"
        {...stroke}
        strokeWidth="1"
        opacity=".5"
      />
      <path
        d="M33 104 L33 71 L71 33"
        {...stroke}
        strokeWidth="1"
        opacity=".58"
      />
      <path
        d="M13 70 L42 70 L70 42 L70 13"
        {...stroke}
        strokeWidth=".85"
        opacity=".4"
      />
      <path
        d="M53 52 L65 40 L77 52 L65 64 Z"
        fill="var(--cv-petala-media)"
        stroke="var(--cv-acento)"
        strokeWidth=".7"
        opacity=".72"
      />
      <path
        d="M65 16 L69 24 L65 32 L61 24 Z"
        fill="var(--cv-acento)"
        opacity=".55"
      />
    </svg>
  );
}

function ArtDecoDivisor() {
  return (
    <svg className="cv-orn-divisor" viewBox="0 0 240 42" aria-hidden="true">
      <path
        d="M25 21 H78 L91 10 L104 21 L120 6 L136 21 L149 10 L162 21 H215"
        {...stroke}
        opacity=".58"
      />
      <path
        d="M53 27 H91 L104 16 M187 27 H149 L136 16"
        {...stroke}
        strokeWidth=".75"
        opacity=".32"
      />
      <path
        d="M120 11 l9 10 -9 10 -9-10z"
        fill="var(--cv-petala-media)"
        stroke="var(--cv-acento)"
        strokeWidth=".65"
        opacity=".72"
      />
      <circle
        cx="120"
        cy="21"
        r="2.1"
        fill="var(--cv-papel)"
        opacity=".9"
      />
    </svg>
  );
}

function OrganicoCanto({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M-3 94 C23 70 20 43 47 26 C64 15 77 12 101 4"
        {...stroke}
        strokeWidth="1.1"
        opacity=".48"
      />
      <path
        d="M8 113 C37 91 47 70 49 45 C51 24 67 17 92 15"
        {...stroke}
        strokeWidth=".75"
        opacity=".3"
      />
      <path
        d="M22 79 C10 67 15 52 30 53 C42 54 47 68 38 77 C34 81 28 82 22 79 Z"
        fill="var(--cv-petala-clara)"
        opacity=".68"
      />
      <path
        d="M49 49 C41 38 48 27 60 29 C70 31 73 43 66 51 C61 56 54 55 49 49 Z"
        fill="var(--cv-folha)"
        opacity=".62"
      />
      <path
        d="M73 25 C68 17 74 10 83 12 C91 14 92 23 86 28 C81 32 76 30 73 25 Z"
        fill="var(--cv-petala-media)"
        opacity=".55"
      />
      <circle cx="47" cy="83" r="3.1" fill="var(--cv-acento)" opacity=".5" />
    </svg>
  );
}

function OrganicoDivisor() {
  return (
    <svg className="cv-orn-divisor" viewBox="0 0 240 42" aria-hidden="true">
      <path
        d="M25 25 C61 12 91 15 112 22 C132 29 162 30 215 17"
        {...stroke}
        strokeWidth=".8"
        opacity=".32"
      />
      <path
        d="M25 17 C67 29 91 28 112 20 C133 12 167 12 215 25"
        {...stroke}
        strokeWidth=".8"
        opacity=".32"
      />
      <ellipse
        cx="112"
        cy="21"
        rx="10"
        ry="5.2"
        transform="rotate(-26 112 21)"
        fill="var(--cv-folha)"
        opacity=".66"
      />
      <ellipse
        cx="129"
        cy="21"
        rx="10"
        ry="5.2"
        transform="rotate(26 129 21)"
        fill="var(--cv-petala-clara)"
        opacity=".72"
      />
      <circle cx="120" cy="21" r="3" fill="var(--cv-acento)" opacity=".65" />
    </svg>
  );
}

function RadicalCanto({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M8 103 L31 73 L23 66 L56 31 L48 23 L83 8"
        {...stroke}
        strokeWidth="2"
        opacity=".72"
        strokeLinejoin="bevel"
      />
      <path
        d="M17 108 L45 76 L37 68 L73 34"
        {...stroke}
        strokeWidth=".75"
        opacity=".35"
      />
      <path
        d="M34 88 L47 65 L57 70 L69 48 L77 53 L91 29"
        fill="none"
        stroke="var(--cv-petala-media)"
        strokeWidth="3.2"
        opacity=".52"
        strokeLinecap="square"
      />
      <path
        d="M61 25 L72 21 L68 33 Z"
        fill="var(--cv-acento)"
        opacity=".72"
      />
      <circle cx="87" cy="20" r="4.2" fill="var(--cv-petala-media)" opacity=".7" />
      <circle cx="24" cy="94" r="2.6" fill="var(--cv-acento)" opacity=".55" />
    </svg>
  );
}

function RadicalDivisor() {
  return (
    <svg className="cv-orn-divisor" viewBox="0 0 240 42" aria-hidden="true">
      <path
        d="M24 23 H82 L94 13 L105 25 L120 8 L136 26 L147 15 L160 23 H216"
        fill="none"
        stroke="var(--cv-acento)"
        strokeWidth="1.8"
        opacity=".65"
        strokeLinejoin="bevel"
      />
      <path
        d="M73 29 H99 M141 29 H167"
        stroke="var(--cv-petala-media)"
        strokeWidth="3"
        opacity=".42"
      />
      <path
        d="M120 10 L128 21 L120 32 L112 21 Z"
        fill="var(--cv-petala-media)"
        opacity=".72"
      />
    </svg>
  );
}

/* ==========================================================================
   MOTOR
   ========================================================================== */

export function OrnamentoCanto({
  id = 'casamento-original',
  className = '',
}: {
  id?: string;
  className?: string;
}) {
  if (id === 'casamento-original') {
    return <CasamentoOriginalCanto className={className} />;
  }

  if (id === 'alta-costura') {
    return <AltaCosturaCanto className={className} />;
  }

  if (id === 'imperial') {
    return <ImperialCanto className={className} />;
  }

  if (id === 'art-deco') {
    return <ArtDecoCanto className={className} />;
  }

  if (id === 'organico-chic') {
    return <OrganicoCanto className={className} />;
  }

  if (id === 'radical') {
    return <RadicalCanto className={className} />;
  }

  const comum = {
    fill: 'none',
    stroke: 'var(--cv-acento)',
    strokeWidth: 1.3,
  } as const;

  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      {id === 'minimal' && (
        <path
          d="M12 62 C34 44 45 26 56 8 M24 74 C47 61 67 43 84 18"
          {...comum}
          opacity=".48"
        />
      )}

      {id === 'geometrico' && (
        <>
          <path
            d="M8 72 L38 18 L64 64 L92 12"
            {...comum}
            opacity=".58"
          />
          <circle
            cx="38"
            cy="18"
            r="5"
            fill="var(--cv-petala-media)"
            opacity=".7"
          />
          <circle
            cx="64"
            cy="64"
            r="4"
            fill="var(--cv-acento)"
            opacity=".65"
          />
        </>
      )}

      {id === 'classico' && (
        <>
          <path
            d="M10 82 C26 31 66 26 74 8 C76 36 58 53 30 61 C54 62 78 49 98 27"
            {...comum}
            opacity=".6"
          />
          <path
            d="M29 60 C20 50 20 40 28 34 M51 48 C43 37 45 27 54 21"
            {...comum}
            opacity=".45"
          />
        </>
      )}

      {id === 'rustico' && (
        <>
          <path
            d="M8 88 C31 59 51 43 90 18"
            {...comum}
            opacity=".58"
          />
          {[26, 42, 58, 73].map((x, i) => (
            <ellipse
              key={x}
              cx={x}
              cy={74 - i * 13}
              rx="9"
              ry="4"
              transform={`rotate(-35 ${x} ${74 - i * 13})`}
              fill="var(--cv-folha)"
              opacity=".7"
            />
          ))}
        </>
      )}

      {id === 'festivo' && (
        <>
          <path
            d="M12 30 Q32 55 54 26 T98 28"
            {...comum}
            opacity=".55"
          />
          {[20, 38, 58, 78, 96].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={28 + (i % 2) * 11}
              r={3 + (i % 3)}
              fill="var(--cv-acento)"
              opacity=".66"
            />
          ))}
        </>
      )}

      {(id === 'floral' || !id) && (
        <>
          <path
            d="M10 92 C31 66 42 45 72 20"
            {...comum}
            opacity=".55"
          />
          <ellipse
            cx="38"
            cy="63"
            rx="10"
            ry="5"
            transform="rotate(-38 38 63)"
            fill="var(--cv-folha)"
            opacity=".7"
          />
          <ellipse
            cx="56"
            cy="45"
            rx="10"
            ry="5"
            transform="rotate(25 56 45)"
            fill="var(--cv-folha)"
            opacity=".7"
          />
          <circle
            cx="74"
            cy="20"
            r="11"
            fill="var(--cv-petala-media)"
            opacity=".75"
          />
          <circle
            cx="74"
            cy="20"
            r="5"
            fill="var(--cv-petala-clara)"
            opacity=".9"
          />
        </>
      )}
    </svg>
  );
}

export function OrnamentoDivisor({
  id = 'casamento-original',
}: {
  id?: string;
}) {
  if (id === 'casamento-original') return <CasamentoOriginalDivisor />;
  if (id === 'alta-costura') return <AltaCosturaDivisor />;
  if (id === 'imperial') return <ImperialDivisor />;
  if (id === 'art-deco') return <ArtDecoDivisor />;
  if (id === 'organico-chic') return <OrganicoDivisor />;
  if (id === 'radical') return <RadicalDivisor />;

  return (
    <svg className="cv-orn-divisor" viewBox="0 0 240 42" aria-hidden="true">
      {id === 'geometrico' && (
        <path
          d="M30 21 H92 L106 8 L120 21 L134 8 L148 21 H210"
          fill="none"
          stroke="var(--cv-acento)"
          strokeWidth="1.2"
          opacity=".55"
        />
      )}

      {id === 'minimal' && (
        <>
          <path
            d="M36 21 H204"
            fill="none"
            stroke="var(--cv-acento)"
            opacity=".38"
          />
          <circle
            cx="120"
            cy="21"
            r="3"
            fill="var(--cv-acento)"
            opacity=".7"
          />
        </>
      )}

      {id === 'festivo' && (
        <>
          {[70, 88, 106, 124, 142, 160].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={21 + (i % 2 ? 5 : -5)}
              r="3"
              fill="var(--cv-acento)"
              opacity=".7"
            />
          ))}
          <path
            d="M30 21 H62 M178 21 H210"
            stroke="var(--cv-acento)"
            opacity=".38"
          />
        </>
      )}

      {(id === 'floral' || !id) && (
        <>
          <path
            d="M28 21 C58 21 78 20 99 21 M141 21 C162 20 182 21 212 21"
            fill="none"
            stroke="var(--cv-acento)"
            strokeWidth="1.15"
            opacity=".42"
          />
          <path
            d="M104 29 C111 26 116 21 120 13 C124 21 129 26 136 29"
            fill="none"
            stroke="var(--cv-acento)"
            strokeWidth="1.15"
            opacity=".6"
          />
          <ellipse
            cx="111"
            cy="24"
            rx="7"
            ry="3.2"
            transform="rotate(-34 111 24)"
            fill="var(--cv-folha)"
            opacity=".65"
          />
          <ellipse
            cx="129"
            cy="24"
            rx="7"
            ry="3.2"
            transform="rotate(34 129 24)"
            fill="var(--cv-folha)"
            opacity=".65"
          />
          <circle
            cx="120"
            cy="13"
            r="5.6"
            fill="var(--cv-petala-media)"
            opacity=".78"
          />
          <circle
            cx="120"
            cy="13"
            r="2.4"
            fill="var(--cv-petala-clara)"
            opacity=".95"
          />
        </>
      )}

      {id === 'classico' && (
        <>
          <path
            d="M28 22 C58 22 75 21 94 21
               C103 21 108 14 112 11
               C112 19 115 22 120 22
               C125 22 128 19 128 11
               C132 14 137 21 146 21
               C165 21 182 22 212 22"
            fill="none"
            stroke="var(--cv-acento)"
            strokeWidth="1.2"
            opacity=".5"
          />
          <path
            d="M103 26 C110 25 115 29 120 34 C125 29 130 25 137 26"
            fill="none"
            stroke="var(--cv-acento)"
            strokeWidth="1"
            opacity=".38"
          />
          <path
            d="M120 16 l5 5 -5 5 -5-5z"
            fill="var(--cv-petala-media)"
            opacity=".58"
          />
        </>
      )}

      {id === 'rustico' && (
        <>
          <path
            d="M28 22 H94 M146 22 H212"
            fill="none"
            stroke="var(--cv-acento)"
            strokeWidth="1.05"
            opacity=".36"
          />
          <path
            d="M101 31 C110 27 119 21 138 10"
            fill="none"
            stroke="var(--cv-acento)"
            strokeWidth="1.2"
            opacity=".58"
          />
          <ellipse
            cx="109"
            cy="26"
            rx="7"
            ry="3.3"
            transform="rotate(-28 109 26)"
            fill="var(--cv-folha)"
            opacity=".72"
          />
          <ellipse
            cx="119"
            cy="20"
            rx="7"
            ry="3.3"
            transform="rotate(26 119 20)"
            fill="var(--cv-folha)"
            opacity=".72"
          />
          <ellipse
            cx="129"
            cy="15"
            rx="7"
            ry="3.3"
            transform="rotate(-28 129 15)"
            fill="var(--cv-folha)"
            opacity=".72"
          />
        </>
      )}
    </svg>
  );
}
