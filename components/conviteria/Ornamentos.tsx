// ---------------------------------------------------------------------------
// Ornamentos SVG originais. Nada aqui é copiado de terceiros.
// Cores vindas de tokensDoConvite(), prefixo --cv-.
// ---------------------------------------------------------------------------

const PETALA =
  "M0 0 C -12 -5 -14 -17 -6 -21 C -2 -23 2 -23 6 -21 C 14 -17 12 -5 0 0 Z";

// Camadas da rosa: quantidade de pétalas, escala, tom, rotação inicial.
const CAMADAS: Array<[number, number, "claro" | "medio", number]> = [
  [6, 1.0, "claro", 0],
  [5, 0.72, "medio", 30],
  [4, 0.46, "medio", 58],
];

function Rosa({
  id,
  x,
  y,
  s = 1,
  rot = 0,
  claro = "var(--cv-petala-clara)",
  medio = "var(--cv-petala-media)",
  escuro = "var(--cv-petala-escura)",
}: {
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
      <circle r="21" fill={`url(#rosa-sombra-${id})`} />
      {CAMADAS.map(([n, escala, tom, deslocamento], ci) =>
        Array.from({ length: n }, (_, k) => {
          // Assimetria proposital: pétala perfeitamente regular parece adesivo.
          const ang =
            deslocamento + (k * 360) / n + (((semente + k * 17 + ci * 11) % 13) - 6);
          const esc = escala * (1 + (((semente + k * 7 + ci * 5) % 11) - 5) / 90);
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

function SombrasRosa() {
  return (
    <defs>
      {[0, 1, 2, 3].map((i) => (
        <radialGradient
          key={i}
          id={`rosa-sombra-${i}`}
          cx="42%"
          cy="34%"
          r="70%"
        >
          <stop offset="55%" stopColor="var(--cv-petala-media)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--cv-petala-escura)" stopOpacity="0.22" />
        </radialGradient>
      ))}
    </defs>
  );
}

function Ramo({
  d,
  folhas,
  cor = "var(--cv-folha)",
}: {
  d: string;
  folhas: Array<[number, number, number, number]>; // x, y, rotação, escala
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
        <g key={i} transform={`translate(${fx} ${fy}) rotate(${fr}) scale(${fs})`}>
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

/** Arranjo de canto. Espelhe com CSS (scaleX/scaleY) para os outros cantos. */
export function ArranjoCanto({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 220"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <SombrasRosa />
      <Ramo
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
      <Ramo
        d="M2 74 C 30 70 52 54 64 30 C 70 18 74 10 76 2"
        folhas={[
          [14, 70, -20, 0.8],
          [32, 60, -36, 0.85],
          [50, 42, -50, 0.78],
          [64, 20, -66, 0.7],
        ]}
        cor="var(--cv-folha)"
      />
      <Ramo
        d="M60 150 C 46 128 30 116 6 106"
        folhas={[
          [50, 138, 40, 0.7],
          [34, 124, 30, 0.66],
          [18, 112, 18, 0.6],
        ]}
        cor="var(--cv-folha)"
      />

      <Rosa id={0} x={34} y={38} s={1.35} rot={-12} />
      <Rosa
        id={1} x={74} y={82} s={1} rot={22}
        claro="var(--cv-petala-clara)"
        medio="var(--cv-petala-media)"
      />
      <Rosa id={2} x={14} y={92} s={0.78} rot={40} />
      <Rosa
        id={3} x={64} y={16} s={0.62} rot={-30}
        claro="var(--cv-petala-clara)"
        medio="var(--cv-petala-media)"
      />

      {[
        [96, 60], [104, 74], [90, 96], [30, 132], [46, 118], [12, 60],
      ].map(([bx, by], i) => (
        <circle key={i} cx={bx} cy={by} r={3.4} fill="var(--cv-petala-media)" opacity="0.85" />
      ))}
    </svg>
  );
}

// O "M" do Pinyon Script tem entrada fina a esquerda e o "I" um floreio pesado
// a direita, entao o centro de massa da tinta cai 1,91 a direita e 3,79 acima
// do centro geometrico. Valores medidos, nao estimados.
const MONOGRAMA_X = -1.91;
const MONOGRAMA_Y = 3.79;
const MONOGRAMA_TAMANHO = 36;

// Deliberadamente inline, e nao via classe CSS: atributo de apresentacao perde
// para regra de classe, e tamanho e deslocamento precisam andar juntos. Assim o
// lacre nao depende do estado do globals.css.
const ESTILO_MONOGRAMA: React.CSSProperties = {
  fontFamily: "var(--fonte-script), 'Snell Roundhand', cursive",
  fontSize: MONOGRAMA_TAMANHO,
};

/** Raminho horizontal usado entre as seções, com uma rosa ao centro. */
export function RaminhoDivisor() {
  const direita: Array<[number, number, number, number]> = [
    [128, 20, 62, 0.62],
    [148, 17, 74, 0.54],
    [166, 15, 86, 0.46],
    [136, 26, 116, 0.5],
    [156, 24, 104, 0.42],
  ];
  const esquerda = direita.map(
    ([x, y, r, e]) => [220 - x, y, -r, e] as [number, number, number, number]
  );

  return (
    <svg
      className="cv-raminho"
      viewBox="0 0 220 44"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <SombrasRosa />
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
          fill={i % 3 === 0 ? "var(--cv-folha)" : "var(--cv-folha)"}
          opacity="0.85"
          transform={`translate(${x} ${y}) rotate(${r}) scale(${e})`}
        />
      ))}
      <circle cx="196" cy="21" r="2.6" fill="var(--cv-petala-media)" />
      <circle cx="24" cy="21" r="2.6" fill="var(--cv-petala-media)" />
      <Rosa id={0} x={110} y={21} s={0.62} rot={-8} />
    </svg>
  );
}

/** Acento pequeno: um botão de rosa com duas folhas. */
export function Broto({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <SombrasRosa />
      <path
        d="M30 52 C 30 42 30 36 30 30"
        fill="none"
        stroke="var(--cv-caule)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <ellipse
        rx="5.5"
        ry="10"
        fill="var(--cv-folha)"
        opacity="0.85"
        transform="translate(21 44) rotate(-34)"
      />
      <ellipse
        rx="5.5"
        ry="10"
        fill="var(--cv-folha)"
        opacity="0.85"
        transform="translate(39 44) rotate(34)"
      />
      <Rosa id={1} x={30} y={24} s={0.8} rot={10} />
    </svg>
  );
}

