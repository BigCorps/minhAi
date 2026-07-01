// components/landing/StaticAvatarFace.tsx
// Versão estática do avatar, usada SOMENTE na exportação em PDF.
// O LandingAvatarFace original usa filtros SVG (feGaussianBlur, feColorMatrix
// "gooey") e animações complexas que o html2canvas não captura de forma
// confiável — resultam num blob sólido sem rosto na captura. Esta versão
// usa só formas básicas e um radialGradient simples, que são bem suportados.

export function StaticAvatarFace() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        <defs>
          <radialGradient id="static-avatar-bg" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
        </defs>

        {/* Corpo */}
        <circle cx="100" cy="100" r="85" fill="url(#static-avatar-bg)" />

        {/* Olhos */}
        <circle cx="72" cy="92" r="11" fill="#1e3a8a" />
        <circle cx="128" cy="92" r="11" fill="#1e3a8a" />
        <circle cx="75.5" cy="88" r="3.5" fill="#ffffff" opacity="0.9" />
        <circle cx="131.5" cy="88" r="3.5" fill="#ffffff" opacity="0.9" />

        {/* Sorriso */}
        <path
          d="M 64 128 Q 100 150 136 128"
          stroke="#1e3a8a"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}