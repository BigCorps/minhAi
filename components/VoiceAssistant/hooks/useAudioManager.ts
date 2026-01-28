// components/VoiceAssistant/hooks/useAudioManager.ts
import { useState, useRef } from 'react';

export function useAudioManager() {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const stopAudioImmediately = () => {
    // Copiar lógica do stopAudioImmediately
  };
  
  const playText = async (text: string): Promise<void> => {
    // Copiar lógica do playText
  };
  
  const playProcessingFeedback = async (): Promise<HTMLAudioElement> => {
    // Copiar lógica do playProcessingFeedback
  };
  
  return {
    isPlayingAudio,
    currentAudioRef,
    feedbackAudioRef,
    stopAudioImmediately,
    playText,
    playProcessingFeedback,
  };
}
