// components/consultatec/PapelMoedaBackground.tsx
// Efeito decorativo de "cédula antiga": linhas onduladas (padrão guilhoché,
// o mesmo tipo de gravação que aparece nos cantos de dinheiro de verdade)
// numa cor bege mais escura que o fundo, visíveis só nos 4 cantos e
// esmaecendo suavemente pro centro via máscara radial. Puramente decorativo
// — fica atrás de tudo (fixed, -z-10) e não captura clique (pointer-events-none).

export default function PapelMoedaBackground() {
  return (
    <svg
      className="fixed inset-0 -z-10 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="pm-ondas"
          width="34"
          height="34"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(12)"
        >
          <path d="M-5 8 Q 3.5 -2, 12 8 T 29 8 T 46 8" stroke="#8A7A54" strokeWidth="0.6" fill="none" />
          <path d="M-5 17 Q 3.5 7, 12 17 T 29 17 T 46 17" stroke="#8A7A54" strokeWidth="0.6" fill="none" />
          <path d="M-5 26 Q 3.5 16, 12 26 T 29 26 T 46 26" stroke="#8A7A54" strokeWidth="0.6" fill="none" />
        </pattern>

        {/* Uma máscara radial por canto: branco (visível) no canto, some até o centro */}
        <radialGradient id="pm-fade-tl" cx="0" cy="0" r="0.75">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pm-fade-tr" cx="1" cy="0" r="0.75">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pm-fade-bl" cx="0" cy="1" r="0.75">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pm-fade-br" cx="1" cy="1" r="0.75">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        <mask id="pm-mask-tl"><rect width="100%" height="100%" fill="url(#pm-fade-tl)" /></mask>
        <mask id="pm-mask-tr"><rect width="100%" height="100%" fill="url(#pm-fade-tr)" /></mask>
        <mask id="pm-mask-bl"><rect width="100%" height="100%" fill="url(#pm-fade-bl)" /></mask>
        <mask id="pm-mask-br"><rect width="100%" height="100%" fill="url(#pm-fade-br)" /></mask>
      </defs>

      <rect width="100%" height="100%" fill="url(#pm-ondas)" mask="url(#pm-mask-tl)" opacity="0.5" />
      <rect width="100%" height="100%" fill="url(#pm-ondas)" mask="url(#pm-mask-tr)" opacity="0.5" />
      <rect width="100%" height="100%" fill="url(#pm-ondas)" mask="url(#pm-mask-bl)" opacity="0.5" />
      <rect width="100%" height="100%" fill="url(#pm-ondas)" mask="url(#pm-mask-br)" opacity="0.5" />
    </svg>
  );
}
