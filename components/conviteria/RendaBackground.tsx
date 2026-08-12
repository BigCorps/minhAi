// components/conviteria/RendaBackground.tsx
//
// Textura decorativa de "renda de papel": arcos escalopados com perolas, o
// mesmo desenho que aparece na borda vazada de convite de casamento impresso.
// E o analogo do guilhoche do ConsultaTec — la a referencia e gravacao de
// cedula, aqui e recorte de papel.
//
// Visivel so nos 4 cantos, esmaecendo para o centro via mascara radial, para
// nao competir com o texto. Fica atras de tudo (fixed, -z-10) e nao captura
// clique (pointer-events-none).
//
// NAO usar em /convite/[slug] nem dentro do cartao de previa: o convite tem
// tema proprio, e duas texturas sobrepostas viram sujeira.

export default function RendaBackground() {
  return (
    <svg
      className="fixed inset-0 -z-10 h-full w-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="rd-renda"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(8)"
        >
          {/* Fileiras de escalopes, deslocadas meia unidade entre si — e o
              deslocamento que produz o entrelacado da renda. */}
          <path
            d="M0 12 A 10 10 0 0 1 20 12 A 10 10 0 0 1 40 12"
            stroke="#c06078"
            strokeWidth="0.7"
            fill="none"
          />
          <path
            d="M-20 32 A 10 10 0 0 1 0 32 A 10 10 0 0 1 20 32 A 10 10 0 0 1 40 32"
            stroke="#c06078"
            strokeWidth="0.7"
            fill="none"
          />

          {/* Perolas: os furinhos do papel vazado. */}
          <circle cx="10" cy="7" r="1.1" fill="#c06078" />
          <circle cx="30" cy="7" r="1.1" fill="#c06078" />
          <circle cx="0"  cy="27" r="1.1" fill="#c06078" />
          <circle cx="20" cy="27" r="1.1" fill="#c06078" />
          <circle cx="40" cy="27" r="1.1" fill="#c06078" />
        </pattern>

        {/* Uma mascara radial por canto: opaca no canto, some ate o centro. */}
        <radialGradient id="rd-fade-tl" cx="0" cy="0" r="0.8">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rd-fade-tr" cx="1" cy="0" r="0.8">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rd-fade-bl" cx="0" cy="1" r="0.8">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rd-fade-br" cx="1" cy="1" r="0.8">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        <mask id="rd-mask-tl"><rect width="100%" height="100%" fill="url(#rd-fade-tl)" /></mask>
        <mask id="rd-mask-tr"><rect width="100%" height="100%" fill="url(#rd-fade-tr)" /></mask>
        <mask id="rd-mask-bl"><rect width="100%" height="100%" fill="url(#rd-fade-bl)" /></mask>
        <mask id="rd-mask-br"><rect width="100%" height="100%" fill="url(#rd-fade-br)" /></mask>
      </defs>

      {/* Papel: o mesmo #fdf0f3 do tema `marca`. */}
      <rect width="100%" height="100%" fill="#fdf0f3" />

      {/* Opacidade baixa de proposito: a renda e para ser percebida de canto
          de olho. Se voce "ve o padrao", ele esta forte demais. */}
      <rect width="100%" height="100%" fill="url(#rd-renda)" mask="url(#rd-mask-tl)" opacity="0.22" />
      <rect width="100%" height="100%" fill="url(#rd-renda)" mask="url(#rd-mask-tr)" opacity="0.22" />
      <rect width="100%" height="100%" fill="url(#rd-renda)" mask="url(#rd-mask-bl)" opacity="0.22" />
      <rect width="100%" height="100%" fill="url(#rd-renda)" mask="url(#rd-mask-br)" opacity="0.22" />
    </svg>
  );
}
