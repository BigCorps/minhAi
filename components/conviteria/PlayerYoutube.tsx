'use client';

// components/conviteria/PlayerYoutube.tsx
//
// Toca a musica do YouTube com os controles da propria marca, em vez do player
// de video. A maioria dos casais quer musica de fundo, nao um video para
// assistir no meio do convite.
//
// O iframe NAO usa `display: none`: navegador movel pausa media em elemento
// sem layout. Ele fica com 1px, fora da area visivel, mas presente e
// renderizado — e o que mantem o audio tocando de forma confiavel.
//
// Se `mostrarVideo` vier true, o iframe aparece em tamanho normal e os
// controles proprios saem de cena: quem escolheu ver o video quer o player do
// YouTube, com legenda, qualidade e tela cheia.

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Carrega a IFrame API uma vez por pagina, mesmo com varios players. */
let promessaApi: Promise<void> | null = null;
function carregarApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  if (!promessaApi) {
    promessaApi = new Promise<void>((resolve) => {
      const anterior = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        anterior?.();
        resolve();
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
  }
  return promessaApi;
}

function formata(s: number) {
  if (!Number.isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function PlayerYoutube({
  videoId,
  titulo,
  mostrarVideo = false,
  autoIniciar = false,
}: {
  videoId: string;
  titulo?: string;
  mostrarVideo?: boolean;
  autoIniciar?: boolean;
}) {
  const alvo = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const arrastando = useRef(false);

  const [pronto, setPronto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [repetir, setRepetir] = useState(true);

  // Lido dentro do callback da IFrame API, que e criado uma vez. Sem o ref, o
  // handler ficaria preso ao valor de `repetir` do primeiro render.
  const repetirRef = useRef(true);

  useEffect(() => { repetirRef.current = repetir; }, [repetir]);

  useEffect(() => {
    let vivo = true;

    void carregarApi().then(() => {
      if (!vivo || !alvo.current || !window.YT?.Player) return;

      player.current = new window.YT.Player(alvo.current, {
        videoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: mostrarVideo ? 1 : 0,
        },
        events: {
          onReady: (e: any) => {
            if (!vivo) return;
            setDur(e.target.getDuration() || 0);
            setPronto(true);
            // So funciona apos gesto do usuario. Falha em silencio quando o
            // navegador recusa, e a pessoa usa o botao de play.
            if (autoIniciar) e.target.playVideo();
          },
          onStateChange: (e: any) => {
            if (!vivo) return;
            const S = window.YT.PlayerState;
            setTocando(e.data === S.PLAYING);
            // Repete: musica de convite e trilha, nao faixa unica.
            if (e.data === S.ENDED && repetirRef.current) e.target.playVideo();
          },
        },
      });
    });

    return () => {
      vivo = false;
      try { player.current?.destroy(); } catch { /* já destruído */ }
    };
  }, [videoId, mostrarVideo, autoIniciar]);

  // Relogio proprio: a IFrame API nao emite evento de progresso.
  useEffect(() => {
    if (!tocando) return;
    const id = setInterval(() => {
      if (arrastando.current) return;
      const p = player.current;
      if (p?.getCurrentTime) setPos(p.getCurrentTime() || 0);
    }, 500);
    return () => clearInterval(id);
  }, [tocando]);

  function alternar() {
    const p = player.current;
    if (!p) return;
    if (tocando) p.pauseVideo();
    else p.playVideo();
  }

  function buscar(v: number) {
    setPos(v);
    player.current?.seekTo(v, true);
  }

  const progresso = dur > 0 ? (pos / dur) * 100 : 0;

  if (mostrarVideo) {
    return (
      <div className="cv-video">
        <div ref={alvo} />
      </div>
    );
  }

  return (
    <>
      {/* 1px fora da tela, nao display:none — ver comentario do topo. */}
      <div className="cv-yt-oculto" aria-hidden="true">
        <div ref={alvo} />
      </div>

      <div className="cv-player">
        <input
          type="range"
          min={0}
          max={dur || 0}
          step={0.1}
          value={pos}
          disabled={!pronto}
          aria-label="Posição da música"
          onPointerDown={() => (arrastando.current = true)}
          onPointerUp={() => (arrastando.current = false)}
          onChange={(e) => buscar(Number(e.target.value))}
          style={{ ['--cv-progresso' as string]: `${progresso}%` }}
        />
        <div className="cv-player-tempos">
          <span>{formata(pos)}</span>
          <span>{formata(dur)}</span>
        </div>
        <div className="cv-player-controles">
          <button
            type="button"
            className="cv-player-btn"
            disabled={!pronto}
            onClick={() => buscar(0)}
            aria-label="Reiniciar"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 5v14M19 5l-9 7 9 7z" fill="none" stroke="currentColor"
                    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="cv-player-btn cv-player-principal"
            disabled={!pronto}
            onClick={alternar}
            aria-label={tocando ? 'Pausar' : 'Tocar'}
          >
            {tocando ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6v12M15 6v12" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className={`cv-player-btn${repetir ? ' ativo' : ''}`}
            disabled={!pronto}
            onClick={() => setRepetir((v) => !v)}
            aria-pressed={repetir}
            aria-label="Repetir música"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9a4 4 0 0 1 4-4h9m0 0l-3-3m3 3l-3 3M20 15a4 4 0 0 1-4 4H7m0 0l3 3m-3-3l3-3"
                    fill="none" stroke="currentColor" strokeWidth="1.7"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {titulo && <p className="cv-player-titulo">{titulo}</p>}
      </div>
    </>
  );
}
