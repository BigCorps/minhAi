'use client';

// components/conviteria/EtiquetaCurva.tsx
//
// "Clique para abrir" curvado ao redor do lacre, em vez de uma caixinha reta
// embaixo dele.
//
// Feito com <textPath> sobre um arco: o texto segue a curva de verdade, letra
// por letra, em vez de cada letra ser rotacionada individualmente por
// transform. A diferenca aparece no espacamento — rotacao por letra abre
// buracos nas curvas fechadas, e num raio pequeno como este o defeito e
// visivel.
//
// O arco tem `fill="none"`: ele existe so como trilho para o texto.

export default function EtiquetaCurva({
  texto = 'clique para abrir',
  tamanho = 190,
  /** Posicao do texto no arco, 0 a 100. 50 = centro. */
  deslocamento = 50,
  /** 'cima' curva por cima do lacre, 'baixo' por baixo. */
  lado = 'baixo',
}: {
  texto?: string;
  tamanho?: number;
  deslocamento?: number;
  lado?: 'cima' | 'baixo';
}) {
  const id = `arco-${lado}`;
  const r = 40;
  const c = 50;

  // Arco superior desenhado da esquerda para a direita; inferior espelhado,
  // senao o texto sairia de cabeca para baixo.
  const d =
    lado === 'cima'
      ? `M ${c - r} ${c} A ${r} ${r} 0 0 1 ${c + r} ${c}`
      : `M ${c - r} ${c} A ${r} ${r} 0 0 0 ${c + r} ${c}`;

  return (
    <svg
      className="cv-etiqueta-curva"
      viewBox="0 0 100 100"
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={id} d={d} fill="none" />
      </defs>
      <text>
        <textPath
          href={`#${id}`}
          startOffset={`${deslocamento}%`}
          textAnchor="middle"
        >
          {texto}
        </textPath>
      </text>
    </svg>
  );
}
