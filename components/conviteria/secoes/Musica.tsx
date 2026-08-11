'use client';

import { useEffect, useRef, useState } from 'react';
import type { PropsSecao } from '@/lib/conviteria/tipos';

function formata(s: number) {
  if (!Number.isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/**
 * Duas origens.
 *
 * upload  -> <audio> com arquivo do Storage. Controle proprio.
 * youtube -> iframe VISIVEL. Os termos do YouTube exigem player aparente;
 *            player oculto para tocar so o audio e violacao de politica, e o
 *            risco aqui e coletivo — uma key limitada derruba a musica de
 *            todos os convites de uma vez. Por isso existe o fallbackUrl.
 */
export default function Musica({ cfg, secao, modo }: PropsSecao) {
  const m = cfg.midia?.musica;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const arrastando = useRef(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setTocando(true);
    const onPause = () => setTocando(false);
    const onTime = () => { if (!arrastando.current) setPos(a.currentTime); };
    const onMeta = () => setDur(a.duration || 0);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    if (a.readyState >= 1) onMeta();
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
    };
  }, [m?.arquivoUrl]);

  if (!m) return null;
  const rotulo = secao.config?.titulo ?? 'Dê o play na nossa música';

  if (m.origem === 'youtube' && m.youtubeVideoId) {
    return (
      <section className="cv-secao">
        <p className="cv-rotulo">{rotulo}</p>
        <div className="cv-video">
          {modo.previa ? (
            <div className="cv-video-marca">Vídeo aparece no convite publicado</div>
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${m.youtubeVideoId}?rel=0&modestbranding=1&playsinline=1`}
              title={m.titulo ?? 'Música do convite'}
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          )}
        </div>
      </section>
    );
  }

  const fonte = m.arquivoUrl ?? m.fallbackUrl;
  if (!fonte) return null;
  const progresso = dur > 0 ? (pos / dur) * 100 : 0;

  const alternar = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => undefined);
    else a.pause();
  };

  return (
    <section className="cv-secao">
      <p className="cv-rotulo">{tocando ? 'Tocando agora' : rotulo}</p>
      {/* Sem metadados de Media Session de proposito: o titulo apareceria
          na tela de bloqueio do celular. */}
      <audio ref={audioRef} src={fonte} loop preload="metadata" />

      <div className="cv-player">
        <input
          type="range" min={0} max={dur || 0} step={0.1} value={pos}
          aria-label="Posição da música"
          onPointerDown={() => (arrastando.current = true)}
          onPointerUp={() => (arrastando.current = false)}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = v;
            setPos(v);
          }}
          style={{ ['--cv-progresso' as string]: `${progresso}%` }}
        />
        <div className="cv-player-tempos">
          <span>{formata(pos)}</span>
          <span>{formata(dur)}</span>
        </div>
        <div className="cv-player-controles">
          <button
            type="button" className="cv-player-btn"
            onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; setPos(0); } }}
            aria-label="Reiniciar"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 5v14M19 5l-9 7 9 7z" fill="none" stroke="currentColor"
                    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button" className="cv-player-btn cv-player-principal"
            onClick={alternar} aria-label={tocando ? 'Pausar' : 'Tocar'}
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
        </div>
      </div>
    </section>
  );
}
