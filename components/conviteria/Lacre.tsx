'use client';

/**
 * Lacre de cera. O monograma vem como `<path>` pronto, gerado no servidor por
 * /api/conviteria/lacre e guardado no evento.
 *
 * Nao usa <text>: no convite do casamento o monograma dependia da fonte
 * carregar do Google Fonts, do font-size vir do CSS e do deslocamento vir do
 * componente. Bastava uma das tres falhar para sair torto. Como contorno,
 * sai identico em qualquer navegador, inclusive offline.
 */
export default function Lacre({
  path, tamanho = 116,
}: { path: string; tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Lacre do convite"
    >
      <defs>
        <radialGradient id="cv-cera" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="var(--cv-petala-clara)" />
          <stop offset="52%" stopColor="var(--cv-petala-media)" />
          <stop offset="100%" stopColor="var(--cv-petala-escura)" />
        </radialGradient>
        <radialGradient id="cv-cera-interna" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="var(--cv-petala-media)" />
          <stop offset="100%" stopColor="var(--cv-petala-escura)" />
        </radialGradient>
      </defs>

      <path
        d="M50 5 C 61 3 68 12 77 14 C 88 16 95 25 92 35 C 89 45 97 53 94 63
           C 91 73 81 77 75 85 C 69 93 57 97 47 93 C 37 89 27 93 19 87
           C 11 81 7 70 8 60 C 9 50 3 40 9 32 C 15 24 24 17 32 13 C 40 9 42 7 50 5 Z"
        fill="url(#cv-cera)"
      />
      <circle cx="50" cy="50" r="34" fill="url(#cv-cera-interna)" opacity="0.85" />
      <circle cx="50" cy="50" r="34" fill="none"
              stroke="var(--cv-petala-escura)" strokeWidth="1.6" opacity="0.55" />
      <circle cx="50" cy="49" r="31" fill="none"
              stroke="var(--cv-petala-clara)" strokeWidth="0.9" opacity="0.5" />

      {path && (
        <>
          <path d={path} fill="var(--cv-petala-escura)" opacity="0.75"
                transform="translate(0 0.8)" />
          <path d={path} fill="var(--cv-petala-clara)" opacity="0.92" />
        </>
      )}
    </svg>
  );
}
