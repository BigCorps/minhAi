'use client';

// components/conviteria/Texturas.tsx
//
// Seis texturas de fundo, no molde do RendaBackground: um <pattern> SVG com
// mascara radial nos cantos, esmaecendo para o centro para nao competir com o
// texto.
//
// Por que SVG e nao imagem: recolore sozinho pelos tokens do tema, escala sem
// perder nitidez, e pesa alguns bytes em vez de alguns kilobytes. Seis imagens
// de fundo em WebP custariam mais que todo o resto do convite.
//
// Todas usam `currentColor`, e a cor vem do container. Assim a mesma textura
// serve a um convite rose e a um convite azul sem duplicar codigo.
//
// `absolute`, NUNCA `fixed`. Com fixed a textura se ancora na viewport e
// escapa de qualquer container: na previa do wizard ela cobria a tela inteira,
// inclusive o formulario, e quebrava a tela de edicao. Absolute se ancora no
// ancestral posicionado — .cv-fora no convite, o cartao na amostra — e funciona
// nos dois contextos sem truque de transform no ancestral.

export const TEXTURAS = [
  { id: 'nenhuma',   nome: 'Sem textura' },
  { id: 'renda',     nome: 'Renda' },
  { id: 'pontos',    nome: 'Poás' },
  { id: 'folhagem',  nome: 'Folhagem' },
  { id: 'linhas',    nome: 'Linhas finas' },
  { id: 'losango',   nome: 'Losangos' },
  { id: 'confete',   nome: 'Confete' },
] as const;

export type TexturaId = (typeof TEXTURAS)[number]['id'];
export const TEXTURA_PADRAO: TexturaId = 'renda';

/** Conteudo de cada <pattern>. Fora do componente para nao recriar por render. */
function desenho(id: string) {
  switch (id) {
    // Escalopes entrelacados com perolas. Recorte de papel vazado de convite.
    case 'renda':
      return (
        <>
          <path d="M0 12 A 10 10 0 0 1 20 12 A 10 10 0 0 1 40 12"
                stroke="currentColor" strokeWidth="0.7" fill="none" />
          <path d="M-20 32 A 10 10 0 0 1 0 32 A 10 10 0 0 1 20 32 A 10 10 0 0 1 40 32"
                stroke="currentColor" strokeWidth="0.7" fill="none" />
          <circle cx="10" cy="7" r="1.1" fill="currentColor" />
          <circle cx="30" cy="7" r="1.1" fill="currentColor" />
          <circle cx="0" cy="27" r="1.1" fill="currentColor" />
          <circle cx="20" cy="27" r="1.1" fill="currentColor" />
          <circle cx="40" cy="27" r="1.1" fill="currentColor" />
        </>
      );

    // Poas em grade deslocada. O deslocamento e o que evita a leitura de
    // "tabela de bolinhas".
    case 'pontos':
      return (
        <>
          <circle cx="10" cy="10" r="2.2" fill="currentColor" />
          <circle cx="30" cy="30" r="2.2" fill="currentColor" />
          <circle cx="30" cy="10" r="1" fill="currentColor" />
          <circle cx="10" cy="30" r="1" fill="currentColor" />
        </>
      );

    // Ramo com folhas alternadas — o mesmo desenho da aba do envelope, para o
    // fundo e a capa conversarem quando as duas estao ligadas.
    case 'folhagem':
      return (
        <>
          <path d="M8 36 C 20 28 27 16 29 6" stroke="currentColor"
                strokeWidth="0.9" fill="none" strokeLinecap="round" />
          {([[12, 31, -32], [18, 24, -46], [24, 16, -60], [27, 9, -74],
             [15, 33, 140], [21, 25, 132]] as const).map(([x, y, r], i) => (
            <ellipse key={i} rx="3" ry="6" fill="currentColor"
                     transform={`translate(${x} ${y}) rotate(${r})`} />
          ))}
        </>
      );

    // Diagonais duplas. A mais discreta das seis: serve a tema minimal, em que
    // qualquer motivo figurativo brigaria com a tipografia.
    case 'linhas':
      return (
        <>
          <path d="M0 40 L40 0" stroke="currentColor" strokeWidth="0.6" fill="none" />
          <path d="M0 20 L20 0" stroke="currentColor" strokeWidth="0.6" fill="none" />
          <path d="M20 40 L40 20" stroke="currentColor" strokeWidth="0.6" fill="none" />
        </>
      );

    // Losangos vazados com ponto no centro. Referencia art deco.
    case 'losango':
      return (
        <>
          <path d="M20 6 L34 20 L20 34 L6 20 Z" stroke="currentColor"
                strokeWidth="0.8" fill="none" />
          <circle cx="20" cy="20" r="1.4" fill="currentColor" />
        </>
      );

    // Tracos curtos em angulos variados. Festivo sem ser infantil.
    case 'confete':
      return (
        <>
          {([[7, 9, 24], [28, 6, -38], [34, 24, 62], [13, 30, -18],
             [22, 18, 78], [3, 22, -66]] as const).map(([x, y, r], i) => (
            <rect key={i} width="5.5" height="1.8" rx="0.9" fill="currentColor"
                  transform={`translate(${x} ${y}) rotate(${r})`} />
          ))}
        </>
      );

    default:
      return null;
  }
}

export default function Textura({
  texturaId = TEXTURA_PADRAO,
  cor = '#c06078',
  papel = '#fdf0f3',
  opacidade = 0.22,
}: {
  texturaId?: string;
  cor?: string;
  papel?: string;
  opacidade?: number;
}) {
  if (texturaId === 'nenhuma') {
    // Ainda pinta o papel: quem escolheu "sem textura" quer o fundo liso, nao
    // o branco do navegador.
    return (
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{ backgroundColor: papel }}
        aria-hidden="true"
      />
    );
  }

  // Ids unicos por textura: duas <svg> na mesma pagina com o mesmo id de
  // pattern fariam a segunda usar o desenho da primeira.
  const pid = `tx-${texturaId}`;

  return (
    <svg
      className="absolute inset-0 -z-10 h-full w-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      style={{ color: cor }}
      aria-hidden="true"
    >
      <defs>
        <pattern id={pid} width="40" height="40" patternUnits="userSpaceOnUse"
                 patternTransform="rotate(8)">
          {desenho(texturaId)}
        </pattern>

        {([['tl', 0, 0], ['tr', 1, 0], ['bl', 0, 1], ['br', 1, 1]] as const).map(
          ([nome, cx, cy]) => (
            <radialGradient key={nome} id={`${pid}-${nome}`} cx={cx} cy={cy} r="0.8">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          )
        )}
        {(['tl', 'tr', 'bl', 'br'] as const).map((n) => (
          <mask key={n} id={`${pid}-m-${n}`}>
            <rect width="100%" height="100%" fill={`url(#${pid}-${n})`} />
          </mask>
        ))}
      </defs>

      <rect width="100%" height="100%" fill={papel} />
      {(['tl', 'tr', 'bl', 'br'] as const).map((n) => (
        <rect key={n} width="100%" height="100%" fill={`url(#${pid})`}
              mask={`url(#${pid}-m-${n})`} opacity={opacidade} />
      ))}
    </svg>
  );
}
