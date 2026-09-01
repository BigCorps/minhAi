'use client';

import { Loader2, Play, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FUNCIONARIA_VOICES,
  VOICE_SAMPLE_TEXT,
  getFuncionarIAVoice,
} from '@/lib/funcionaria-voices';

type Props = {
  value?: string | null;
  onChange: (id: string) => void;
  className?: string;
};

/**
 * Seletor de voz com prévia.
 *
 * A prévia existe porque descrição escrita não resolve escolha de voz — "mais
 * grave e pausada" não diz nada até você ouvir. Sem poder ouvir, a empresa
 * escolhe no escuro e descobre no primeiro atendimento.
 *
 * As quatro opções estão todas na família Neural2, então trocar de voz não
 * muda o custo por atendimento.
 */
export default function VoiceSelector({ value, onChange, className = '' }: Props) {
  const selected = getFuncionarIAVoice(value);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const preview = useCallback(
    async (id: string) => {
      const voice = getFuncionarIAVoice(id);
      cleanup();
      setFailedId(null);
      setPlayingId(id);

      try {
        const response = await fetch('/api/google-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: VOICE_SAMPLE_TEXT,
            voice: voice.voice,
            pitch: voice.pitch,
            speed: voice.speed,
          }),
        });
        if (!response.ok) throw new Error(`TTS ${response.status}`);

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
          setPlayingId(null);
          setFailedId(id);
        };
        await audio.play();
      } catch {
        setPlayingId(null);
        setFailedId(id);
      }
    },
    [cleanup],
  );

  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm font-black text-slate-950">Voz da FuncionarIA</span>
        <span className="text-xs font-bold text-slate-500">{selected.label}</span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Toque para ouvir antes de escolher. Todas custam o mesmo por atendimento.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {FUNCIONARIA_VOICES.map(voice => {
          const active = voice.id === selected.id;
          const playing = playingId === voice.id;

          return (
            <div
              key={voice.id}
              className={`rounded-2xl border p-3 transition ${
                active ? 'border-violet-500 bg-violet-50/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onChange(voice.id)}
                  className="min-w-0 flex-1 text-left"
                  aria-pressed={active}
                >
                  <div className="flex items-center gap-1.5 text-sm font-black text-slate-950">
                    {active && <Volume2 className="h-3.5 w-3.5 text-violet-600" />}
                    {voice.label}
                  </div>
                  <div className="mt-0.5 text-xs leading-snug text-slate-500">
                    {voice.description}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => void preview(voice.id)}
                  disabled={playing}
                  aria-label={`Ouvir a voz ${voice.label}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400 disabled:opacity-60"
                >
                  {playing
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Play className="h-4 w-4" />}
                </button>
              </div>

              {failedId === voice.id && (
                <div className="mt-2 text-[11px] font-bold text-rose-500">
                  Não foi possível ouvir agora. Tente novamente.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
