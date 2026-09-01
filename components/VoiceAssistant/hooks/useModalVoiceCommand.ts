// components/VoiceAssistant/hooks/useModalVoiceCommand.ts
import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';

interface UseModalVoiceCommandOptions {
  onTranscript: (text: string) => void;
  active?: boolean;
}

export function useModalVoiceCommand({ onTranscript, active = true }: UseModalVoiceCommandOptions) {
  const isMobile = useIsMobile();
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRunningRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  // Mantém ref atualizada sem recriar o effect
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    if (isMobile) {
      startMobile();
    } else {
      startDesktop();
    }

    return () => stop();
  }, [active, isMobile]);

  // ── MOBILE: reutiliza GoogleSpeechWebSocket com VAD ───────
  async function startMobile() {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      const gs = new GoogleSpeechWebSocket({
        onTranscript: (text, isFinal) => {
          if (isFinal && text.trim()) {
            const clean = text.toLowerCase().trim()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/[.,!?;:]+/g, '');
            console.log('🎤 [Modal/Mobile] Ouviu:', clean);
            onTranscriptRef.current(clean);
          }
        },
        onError: (err) => {
          console.error('❌ [Modal/Mobile] Erro:', err);
          isRunningRef.current = false;
        },
        // Mobile: thresholds iguais ao assistente principal
        volumeThreshold: 0.030,
        silenceThreshold: 60,
      });

      googleSpeechRef.current = gs;
      await gs.connect();
      await gs.startRecording();
      console.log('👂 [Modal/Mobile] Ouvindo via GoogleSpeech...');
    } catch (err) {
      console.error('❌ [Modal/Mobile] Falha ao iniciar:', err);
      isRunningRef.current = false;
    }
  }

  // ── DESKTOP: webkitSpeechRecognition ─────────────────────
  function startDesktop() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
        .toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?;:]+/g, '');
      console.log('🎤 [Modal/Desktop] Ouviu:', text);
      onTranscriptRef.current(text);
      restartDesktop();
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') restartDesktop();
    };

    recognition.onend = () => {
      if (isRunningRef.current) restartDesktop();
    };

    recognition.start();
    console.log('👂 [Modal/Desktop] Ouvindo via Webkit...');
  }

  function restartDesktop() {
    if (!isRunningRef.current) return;
    try { recognitionRef.current?.stop(); } catch (e) {}
    setTimeout(() => {
      if (!isRunningRef.current) return;
      try { recognitionRef.current?.start(); } catch (e) {}
    }, 300);
  }

  function stop() {
    isRunningRef.current = false;

    // Parar desktop
    try { recognitionRef.current?.stop(); } catch (e) {}
    recognitionRef.current = null;

    // Parar mobile
    if (googleSpeechRef.current) {
      googleSpeechRef.current.stopRecording().catch(() => {});
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
    }

    console.log('🔇 [Modal] Recognition parado');
  }
}