'use client';

// components/conviteria/RecortesEnvelope.tsx
//
// Recortes das abas e das bases dos envelopes, como <clipPath> SVG.
//
// Por que SVG e nao `clip-path` no CSS:
//
//   polygon()  so liga pontos por RETAS. Era por isso que "onda" saia como
//              zigue-zague anguloso e "organico" parecia um cristal.
//   path()     aceita curvas, mas NAO escala: as coordenadas sao pixels
//              absolutos, entao um desenho feito para 1000px de largura
//              apareceria cortado num celular de 380px.
//   <clipPath clipPathUnits="objectBoundingBox">  aceita curvas E escala,
//              porque as coordenadas vao de 0 a 1 e sao proporcionais a caixa
//              do elemento. E a unica das tres que atende os dois requisitos.
//
// Renderizado uma vez por pagina. Os ids sao globais, entao varias capas na
// mesma tela (os cartoes de amostra do wizard) compartilham os mesmos defs sem
// duplicar nada.

export const RECORTES_ENVELOPE = {
  // Aba de cima. (0,0) e o canto superior esquerdo da aba.
  abas: {
    classico: 'M0,0 L1,0 L0.5,1 Z',

    arco: 'M0,0 L1,0 L1,0.3 C1,0.3 0.78,0.88 0.5,0.88 C0.22,0.88 0,0.3 0,0.3 Z',

    diamante: 'M0,0 L1,0 L0.72,0.58 L0.5,1 L0.28,0.58 Z',

    reto: 'M0,0 L1,0 L1,0.62 L0.5,0.92 L0,0.62 Z',

    // Cinco ondulacoes com curvas cubicas. Amplitudes desiguais de proposito:
    // ondas identicas leem como serrilha de maquina.
    onda:
      'M0,0 L1,0 L1,0.50 C0.93,0.66 0.86,0.49 0.78,0.58 ' +
      'C0.70,0.67 0.63,0.49 0.55,0.63 C0.47,0.77 0.41,0.54 0.33,0.68 ' +
      'C0.25,0.82 0.18,0.57 0.10,0.67 C0.06,0.72 0.03,0.70 0,0.64 Z',

    // Assimetrico de proposito: a assimetria e o que separa "organico" de
    // "arco". Simetrico, vira so um arco mal feito.
    organico:
      'M0,0 L1,0 L1,0.44 C0.96,0.61 0.88,0.68 0.80,0.66 ' +
      'C0.72,0.64 0.70,0.54 0.63,0.62 C0.56,0.71 0.545,0.87 0.50,0.94 ' +
      'C0.455,0.86 0.42,0.71 0.35,0.62 C0.29,0.55 0.27,0.66 0.19,0.66 ' +
      'C0.10,0.66 0.04,0.59 0,0.42 Z',
  },

  // Painel de baixo. (0,0) e o canto superior esquerdo do painel.
  // A base acompanha o vocabulario da aba: sem isso, uma aba ondulada sobre uma
  // base de triangulo reto entrega que sao dois desenhos diferentes colados.
  bases: {
    classico: 'M0,1 L0.5,0 L1,1 Z',
    arco: 'M0,1 C0,1 0.2,0.06 0.5,0.06 C0.8,0.06 1,1 1,1 Z',
    diamante: 'M0,1 L0.28,0.42 L0.5,0 L0.72,0.42 L1,1 Z',
    reto: 'M0,1 L0,0.38 L0.5,0.08 L1,0.38 L1,1 Z',
    onda:
      'M0,1 L0,0.36 C0.06,0.28 0.10,0.43 0.18,0.33 ' +
      'C0.26,0.23 0.32,0.46 0.40,0.32 C0.48,0.18 0.54,0.41 0.62,0.27 ' +
      'C0.70,0.13 0.76,0.36 0.84,0.26 C0.90,0.19 0.95,0.30 1,0.36 L1,1 Z',
    organico:
      'M0,1 L0,0.44 C0.06,0.30 0.14,0.24 0.22,0.30 ' +
      'C0.30,0.36 0.34,0.22 0.42,0.14 C0.47,0.09 0.50,0.04 0.52,0.10 ' +
      'C0.58,0.24 0.66,0.30 0.74,0.26 C0.84,0.21 0.93,0.28 1,0.42 L1,1 Z',
  },
} as const;

export default function RecortesEnvelope() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute' }}
    >
      <defs>
        {Object.entries(RECORTES_ENVELOPE.abas).map(([id, d]) => (
          <clipPath key={id} id={`env-aba-${id}`} clipPathUnits="objectBoundingBox">
            <path d={d} />
          </clipPath>
        ))}
        {Object.entries(RECORTES_ENVELOPE.bases).map(([id, d]) => (
          <clipPath key={id} id={`env-base-${id}`} clipPathUnits="objectBoundingBox">
            <path d={d} />
          </clipPath>
        ))}
      </defs>
    </svg>
  );
}
