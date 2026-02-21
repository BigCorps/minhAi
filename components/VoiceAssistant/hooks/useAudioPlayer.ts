// ============================================================
// hooks/useAudioPlayer.ts
// Caminho: components/assistant/VoiceAssistant/hooks/useAudioPlayer.ts
// ============================================================

import { useRef } from 'react';

interface UseAudioPlayerResult {
  currentAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  feedbackAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  playText: (text: string, onPlay?: () => void, onEnd?: () => void) => Promise<void>;
  stopAudioImmediately: () => void;
}

/**
 * Gerencia reprodução de áudio TTS via /api/voice/tts.
 * Expõe playText() e stopAudioImmediately() para uso no componente principal.
 */
export function useAudioPlayer(
  setIsPlayingAudio: (v: boolean) => void
): UseAudioPlayerResult {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);

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

        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
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