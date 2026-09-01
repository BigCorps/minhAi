'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const EVENTO_TROCAR_TEXTURA_CONVITEIA =
  'conviteia:trocar-textura-fundo';

type TexturaInstitucional =
  | 'renda'
  | 'pontos'
  | 'folhagem'
  | 'linhas'
  | 'losango'
  | 'confete';

const CHAVE_SESSAO = 'conviteia:textura-institucional';

const TEXTURAS: TexturaInstitucional[] = [
  'renda',
  'pontos',
  'folhagem',
  'linhas',
  'losango',
  'confete',
];

function sortear(diferenteDe?: string | null): TexturaInstitucional {
  const opcoes = TEXTURAS.filter((id) => id !== diferenteDe);
  const lista = opcoes.length ? opcoes : TEXTURAS;
  return lista[Math.floor(Math.random() * lista.length)];
}

function Desenho({ id }: { id: TexturaInstitucional }) {
  switch (id) {
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

    case 'pontos':
      return (
        <>
          <circle cx="10" cy="10" r="2.2" fill="currentColor" />
          <circle cx="30" cy="30" r="2.2" fill="currentColor" />
          <circle cx="30" cy="10" r="1" fill="currentColor" />
          <circle cx="10" cy="30" r="1" fill="currentColor" />
        </>
      );

    case 'folhagem':
      return (
        <>
          <path d="M8 36 C 20 28 27 16 29 6" stroke="currentColor"
            strokeWidth="0.9" fill="none" strokeLinecap="round" />
          {([
            [12, 31, -32], [18, 24, -46], [24, 16, -60],
            [27, 9, -74], [15, 33, 140], [21, 25, 132],
          ] as const).map(([x, y, r], i) => (
            <ellipse key={i} rx="3" ry="6" fill="currentColor"
              transform={`translate(${x} ${y}) rotate(${r})`} />
          ))}
        </>
      );

    case 'linhas':
      return (
        <>
          <path d="M0 40 L40 0" stroke="currentColor" strokeWidth="0.6" fill="none" />
          <path d="M0 20 L20 0" stroke="currentColor" strokeWidth="0.6" fill="none" />
          <path d="M20 40 L40 20" stroke="currentColor" strokeWidth="0.6" fill="none" />
        </>
      );

    case 'losango':
      return (
        <>
          <path d="M20 6 L34 20 L20 34 L6 20 Z"
            stroke="currentColor" strokeWidth="0.8" fill="none" />
          <circle cx="20" cy="20" r="1.4" fill="currentColor" />
        </>
      );

    case 'confete':
      return (
        <>
          {([
            [7, 9, 24], [28, 6, -38], [34, 24, 62],
            [13, 30, -18], [22, 18, 78], [3, 22, -66],
          ] as const).map(([x, y, r], i) => (
            <rect key={i} width="5.5" height="1.8" rx="0.9"
              fill="currentColor"
              transform={`translate(${x} ${y}) rotate(${r})`} />
          ))}
        </>
      );
  }
}

export default function RendaBackground() {
  // Valor estável no SSR/primeiro render. O sorteio real ocorre no cliente.
  const [textura, setTextura] = useState<TexturaInstitucional>('renda');
  const [visivel, setVisivel] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const texturaAtual = useRef<TexturaInstitucional>('renda');
  const etapaAnterior = useRef<string | null>(null);

  const aplicarNova = useCallback((comFade: boolean) => {
    const anteriorDaSessao = sessionStorage.getItem(CHAVE_SESSAO);
    const anterior = anteriorDaSessao ?? texturaAtual.current;
    const proxima = sortear(anterior);

    const aplicar = () => {
      texturaAtual.current = proxima;
      setTextura(proxima);
      sessionStorage.setItem(CHAVE_SESSAO, proxima);
      requestAnimationFrame(() => setVisivel(true));
    };

    if (!comFade) {
      aplicar();
      return;
    }

    setVisivel(false);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(aplicar, 170);
  }, []);

  useEffect(() => {
    // Em cada carregamento escolhe uma textura diferente da última da sessão.
    aplicarNova(false);

    const aoTrocar = () => aplicarNova(true);
    window.addEventListener(EVENTO_TROCAR_TEXTURA_CONVITEIA, aoTrocar);

    // No criador/editor, acompanha a etapa ativa sem acoplar o Wizard a este
    // componente. O MutationObserver também funciona quando o wizard monta
    // alguns milissegundos depois do fundo.
    const verificarEtapa = () => {
      const atual = document
        .querySelector('.wz-trilha li.atual')
        ?.textContent
        ?.replace(/\s+/g, ' ')
        .trim() ?? null;

      if (!atual) return;

      if (etapaAnterior.current === null) {
        etapaAnterior.current = atual;
        return;
      }

      if (atual !== etapaAnterior.current) {
        etapaAnterior.current = atual;
        aplicarNova(true);
      }
    };

    verificarEtapa();

    const observer = new MutationObserver(verificarEtapa);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
      window.removeEventListener(EVENTO_TROCAR_TEXTURA_CONVITEIA, aoTrocar);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [aplicarNova]);

  const pid = `cv-bg-${textura}`;

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ backgroundColor: '#fdf0f3' }}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        style={{
          color: '#c06078',
          opacity: visivel ? 1 : 0,
          transition: 'opacity 170ms ease',
        }}
      >
        <defs>
        <pattern
          id={pid}
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(8)"
        >
          <Desenho id={textura} />
        </pattern>

        {([
          ['tl', 0, 0], ['tr', 1, 0], ['bl', 0, 1], ['br', 1, 1],
        ] as const).map(([nome, cx, cy]) => (
          <radialGradient key={nome} id={`${pid}-${nome}`} cx={cx} cy={cy} r="0.8">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        ))}

        {(['tl', 'tr', 'bl', 'br'] as const).map((n) => (
          <mask key={n} id={`${pid}-m-${n}`}>
            <rect width="100%" height="100%" fill={`url(#${pid}-${n})`} />
          </mask>
        ))}
      </defs>

        {(['tl', 'tr', 'bl', 'br'] as const).map((n) => (
        <rect
          key={n}
          width="100%"
          height="100%"
          fill={`url(#${pid})`}
          mask={`url(#${pid}-m-${n})`}
          opacity="0.22"
        />
        ))}
      </svg>
    </div>
  );
}
