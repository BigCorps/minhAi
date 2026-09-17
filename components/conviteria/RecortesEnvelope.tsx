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

    // A silhueta geral tem de DESCER ate o centro, como qualquer aba de
    // envelope: as ondas sao decoracao ao longo da borda, nao a forma.
    //
    // A versao anterior ondulava na horizontal e parava perto de 0.63 no meio.
    // Como a base comeca mais abaixo e os paineis laterais sao finissimos
    // naquela altura, sobrava uma faixa de fundo atravessando o envelope.
    // Agora o centro afunda ate 0.96 e o encontro fica garantido.
    //
    // Amplitudes desiguais de proposito: ondas identicas leem como serrilha
    // de maquina.
    onda:
      'M0,0 L1,0 L1,0.30 C0.92,0.44 0.86,0.34 0.78,0.47 ' +
      'C0.70,0.60 0.64,0.52 0.585,0.70 C0.548,0.82 0.523,0.90 0.5,0.96 ' +
      'C0.477,0.90 0.452,0.82 0.415,0.70 C0.36,0.52 0.30,0.60 0.22,0.47 ' +
      'C0.14,0.34 0.08,0.44 0,0.30 Z',

    // Mesma correcao da onda: desce ao centro. A assimetria e o que separa
    // "organico" de "arco" — simetrico, vira so um arco mal feito.
    organico:
      'M0,0 L1,0 L1,0.34 C0.955,0.52 0.875,0.60 0.795,0.57 ' +
      'C0.715,0.54 0.695,0.47 0.625,0.58 C0.558,0.69 0.542,0.86 0.50,0.95 ' +
      'C0.452,0.85 0.425,0.66 0.352,0.55 C0.295,0.47 0.272,0.60 0.192,0.60 ' +
      'C0.102,0.60 0.042,0.50 0,0.32 Z',
    // Aba reta na horizontal: a dobra e uma linha, sem bico. E o envelope
    // comercial, e tambem o que melhor acomoda logo largo no lugar do lacre.
    'reto-horizontal': 'M0,0 L1,0 L1,1 L0,1 Z',

    // Costura vertical: a aba vem da esquerda e para no meio. O lacre fica
    // sobre a emenda, como nas pecas de papelaria que dobram o cartao em vez
    // de envelopar. Ver --cv-lacre-left no CSS.
    'reto-vertical': 'M0,0 L1,0 L1,1 L0,1 Z',

    // Classico deitado: o bico aponta para o lado em vez de para baixo.
    'classico-lateral': 'M0,0 L1,0.5 L0,1 Z',
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

    // Os tres novos usam base retangular: o desenho deles esta na aba, e um
    // bico embaixo brigaria com a linha reta de cima.
    'reto-horizontal': 'M0,0 L1,0 L1,1 L0,1 Z',
    'reto-vertical': 'M0,0 L1,0 L1,1 L0,1 Z',
    'classico-lateral': 'M0,0 L1,0 L1,1 L0,1 Z',
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
