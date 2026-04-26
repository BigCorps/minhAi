// ============================================================
// hooks/useAudioPlayer.ts
// Caminho: components/assistant/VoiceAssistant/hooks/useAudioPlayer.ts
// ============================================================
import { useRef, useEffect } from 'react';

interface UseAudioPlayerResult {
  currentAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  feedbackAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  playText: (text: string, onPlay?: () => void, onEnd?: () => void) => Promise<void>;
  stopAudioImmediately: () => void;
}

/**
 * Gerencia reprodução de áudio TTS via /api/voice/tts.
 * Expõe playText() e stopAudioImmediately() para uso no componente principal.
 *
 * @param setIsPlayingAudio - setter de estado para controle de UI
 * @param voiceName - nome da voz Google TTS (ex: 'pt-BR-Neural2-A').
 *                   Opcional — fallback para masculina padrão na rota.
 */
export function useAudioPlayer(
  setIsPlayingAudio: (v: boolean) => void,
  voiceName?: string
): UseAudioPlayerResult {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  // Ref garante que playText sempre lê o voiceName mais atual,
  // mesmo que o banco ainda não tenha respondido na montagem
  const voiceNameRef = useRef(voiceName);
  useEffect(() => { voiceNameRef.current = voiceName; }, [voiceName]);

  async function playText(
    text: string,
    onPlay?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }

        const body: Record<string, string> = { text };
        if (voiceNameRef.current) body.voice = voiceNameRef.current;

        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`TTS ${response.status}`);

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        currentAudioRef.current = audio;

        audio.onplay = () => {
          setIsPlayingAudio(true);
          onPlay?.();
        };

        audio.onended = () => {
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
          onEnd?.();
          resolve();
        };

        audio.onerror = () => {
          setIsPlayingAudio(false);
          currentAudioRef.current = null;
          reject(new Error('Erro reproduzir'));
        };

        await audio.play();
      } catch (err) {
        setIsPlayingAudio(false);
        reject(err);
      }
    });
  }

  function stopAudioImmediately() {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      } catch (e) {}
    }

    if (feedbackAudioRef.current) {
      try {
        feedbackAudioRef.current.pause();
        feedbackAudioRef.current.currentTime = 0;
        feedbackAudioRef.current = null;
      } catch (e) {}
    }

    setIsPlayingAudio(false);
  }

  return { currentAudioRef, feedbackAudioRef, playText, stopAudioImmediately };
}
