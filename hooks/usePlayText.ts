// hooks/usePlayText.ts
'use client';

import { useRef, useCallback } from 'react';

/**
 * Hook reutilizável de TTS — mesma lógica do useAudioPlayer,
 * mas standalone para uso fora do assistente (ex: dashboard).
 * Chama /api/google-tts e toca o áudio retornado.
 */
export function usePlayText() {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const playText = useCallback(async (text: string): Promise<void> => {
    // Para áudio anterior se estiver tocando
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    if (!text?.trim()) return;

    try {
      const response = await fetch('/api/google-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed: 1.05 }),
      });

      if (!response.ok) throw new Error(`TTS error: ${response.status}`);

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.05;
      currentAudioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          reject(new Error('Audio playback error'));
        };
        audio.play().catch(reject);
      });
    } catch (err) {
      console.error('usePlayText error:', err);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  return { playText, stopAudio };
}
