'use client';

import { useEffect, useRef, useState } from 'react';
import PlayerYoutube from '../PlayerYoutube';
import { useAudio } from '../ContextoAudio';
import type { PropsSecao } from '@/lib/conviteria/tipos';

function formata(s: number) {
  if (!Number.isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/**
 * Duas origens.
 *
 * upload  -> <audio> do ConvitePublico, controlado por aqui via contexto.
 * youtube -> PlayerYoutube: IFrame API com os controles da propria marca, para
 *            a musica ser trilha de fundo e nao um video no meio do convite.
 *            `mostrarVideo` no config exibe o player do YouTube inteiro para
 *            quem preferir.
 *
 * O <audio> NAO e criado aqui. Antes era, e havia dois elementos no convite:
 * a capa dava play num e o botao pausava o outro — a musica comecava e nao
 * parava mais. Agora existe um so, dono no ConvitePublico.
 */
export default function Musica({ cfg, secao, modo }: PropsSecao) {
  const m = cfg.midia?.musica;
  const audio = useAudio();
  // useRef SEMPRE chamado: `audio?.ref ?? useRef(...)` faria curto-circuito e
  // deixaria o hook de fora em alguns renders, violando as regras dos hooks.
  const refLocal = useRef<HTMLAudioElement>(null);
  const audioRef = audio?.ref ?? refLocal;
  const [tocando, setTocando] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  // Comeca ligado: musica de convite e trilha de fundo, nao faixa unica.
  const [repetir, setRepetir] = useState(true);
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

  // O <audio> e do ConvitePublico e nasce com `loop`. Aqui so acompanhamos a
  // escolha do convidado.
  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = repetir;
  }, [repetir, audioRef]);

  if (!m) return null;
  const rotulo = secao.config?.titulo ?? 'Dê o play na nossa música';

  if (m.origem === 'youtube' && m.youtubeVideoId) {
    return (
      <section className="cv-secao">
        <p className="cv-rotulo">{rotulo}</p>
        {modo.previa ? (
          // A previa nao carrega a IFrame API: seria uma requisicao externa a
          // cada tecla digitada no wizard.
          <div className="cv-video-marca">
            {m.mostrarVideo ? 'Vídeo' : 'Player da música'} aparece no convite publicado
          </div>
        ) : (
          <PlayerYoutube
            videoId={m.youtubeVideoId}
            titulo={m.titulo}
            mostrarVideo={m.mostrarVideo ?? false}
          />
        )}
      </section>
    );
  }

  const fonte = m.arquivoUrl ?? m.fallbackUrl;
  if (!fonte) return null;
  const progresso = dur > 0 ? (pos / dur) * 100 : 0;

  // Delega ao dono do <audio>. Fora do ConvitePublico (previa do wizard) nao
  // ha audio, e o fallback local evita quebrar.
  const alternar = audio?.alternar ?? (() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => undefined);
    else a.pause();
  });

  return (
    <section className="cv-secao">
      <p className="cv-rotulo">{tocando ? 'Tocando agora' : rotulo}</p>
      {/* Sem metadados de Media Session de proposito: o titulo apareceria
          na tela de bloqueio do celular. */}
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
          {/* Terceiro botao tambem resolve o alinhamento: com dois, o par era
              centralizado como grupo e o botao principal ficava fora do centro
              real da caixa. */}
          <button
            type="button"
            className={`cv-player-btn${repetir ? ' ativo' : ''}`}
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
      </div>
    </section>
  );
}
