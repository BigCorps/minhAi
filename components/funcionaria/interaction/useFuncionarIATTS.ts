'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFuncionarIAVoice } from '@/lib/funcionaria-voices';

type Options = {
  /**
   * Id da personalidade escolhida pela empresa. Ver FUNCIONARIA_VOICES.
   */
  voiceId?: string | null;
  /**
   * Legado. Antes recebia o nome da voz no Google direto. Hoje a voz vem da
   * personalidade escolhida pela empresa; este campo e aceito e ignorado para
   * que chamadas antigas nao quebrem.
   */
  voice?: string | null;
  /**
   * Sobrepõe o ritmo da personalidade. Raramente necessário — cada voz já traz
   * o ritmo que combina com ela.
   */
  speed?: number | null;
};

export function useFuncionarIATTS({ voiceId, speed }: Options = {}) {
  const voice = getFuncionarIAVoice(voiceId);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    const audio = currentAudioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
    }
    currentAudioRef.current = null;
    setAudioElement(null);
    setSpeaking(false);
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
  }, []);

  const playText = useCallback(async (text: string) => {
    const cleanText = String(text || '').trim();
    if (!cleanText) return;

    stop();

    const response = await fetch('/api/google-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        voice: voice.voice,
        pitch: voice.pitch,
        speed: typeof speed === 'number' && speed > 0 ? speed : voice.speed,
      }),
    });

    if (!response.ok) throw new Error(`TTS ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    currentObjectUrlRef.current = objectUrl;

    const audio = new Audio(objectUrl);
    currentAudioRef.current = audio;
    setAudioElement(audio);

    await new Promise<void>((resolve, reject) => {
      audio.onplay = () => setSpeaking(true);
      audio.onended = () => {
        setSpeaking(false);
        currentAudioRef.current = null;
        setAudioElement(null);
        if (currentObjectUrlRef.current === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          currentObjectUrlRef.current = null;
        }
        resolve();
      };
      audio.onerror = () => {
        setSpeaking(false);
        currentAudioRef.current = null;
        setAudioElement(null);
        if (currentObjectUrlRef.current === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          currentObjectUrlRef.current = null;
        }
        reject(new Error('Erro ao reproduzir TTS'));
      };
      audio.play().catch(reject);
    });
  }, [speed, stop, voice.voice, voice.pitch, voice.speed]);

  useEffect(() => stop, [stop]);

  return { playText, stop, speaking, audioElement, currentAudioRef };
}
