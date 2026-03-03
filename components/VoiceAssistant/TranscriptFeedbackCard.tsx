'use client';

// ============================================================
// components/assistant/VoiceAssistant/TranscriptFeedbackCard.tsx
//
// Card de feedback visual em tempo real da transcrição de voz.
// Mostra o interimTranscript (o que o Google Speech está ouvindo
// agora) e o lastTranscript (última frase finalizada).
// ============================================================

import { useEffect, useRef, useState } from 'react';

interface TranscriptFeedbackCardProps {
  /** Transcrição parcial em tempo real (não final) */
  interimTranscript: string;
  /** Última transcrição finalizada pelo Google Speech */
  lastTranscript: string;
  /** Se o assistente está ouvindo ativamente */
  isListening: boolean;
  /** Se está processando ou reproduzindo áudio */
  isProcessing: boolean;
  isPlayingAudio: boolean;
  theme?: 'dark' | 'light';
}

export default function TranscriptFeedbackCard({
  interimTranscript,
  lastTranscript,
  isListening,
  isProcessing,
  isPlayingAudio,
  theme = 'dark',
}: TranscriptFeedbackCardProps) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dotPhase = useRef(0);
  const [dots, setDots] = useState('');

  // Animação de "ouvindo..." com pontinhos
  useEffect(() => {
    if (!isListening || isProcessing || isPlayingAudio) {
      setDots('');
      return;
    }
    const interval = setInterval(() => {
      dotPhase.current = (dotPhase.current + 1) % 4;
      setDots('.'.repeat(dotPhase.current));
    }, 400);
    return () => clearInterval(interval);
  }, [isListening, isProcessing, isPlayingAudio]);

  // Controla visibilidade e texto exibido
  useEffect(() => {
    // Prioridade 1: transcrição em tempo real (interim)
    if (interimTranscript && !isProcessing && !isPlayingAudio) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setDisplayText(interimTranscript);
      setIsFinal(false);
      setVisible(true);
      return;
    }

    // Prioridade 2: última transcrição final (fica visível por 4s)
    if (lastTranscript && !interimTranscript && !isProcessing && !isPlayingAudio) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setDisplayText(lastTranscript);
      setIsFinal(true);
      setVisible(true);

      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        hideTimerRef.current = null;
      }, 4000);
      return;
    }

    // Ocultar quando processando ou tocando áudio
    if (isProcessing || isPlayingAudio) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setVisible(false);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [interimTranscript, lastTranscript, isProcessing, isPlayingAudio]);

  // Estado: ouvindo mas sem texto ainda
  const showListeningIndicator =
    isListening && !interimTranscript && !isProcessing && !isPlayingAudio;

  const isDark = theme === 'dark';

  return (
    <div
      className={`w-full overflow-hidden transition-all duration-300 ease-out ${
        visible || showListeningIndicator
          ? 'max-h-20 opacity-100 mb-1'
          : 'max-h-0 opacity-0 mb-0'
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`w-full px-3 py-2 rounded-xl border text-xs flex items-start gap-2 transition-all duration-300 ${
          isFinal
            ? isDark
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300/80'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : isDark
            ? 'bg-blue-500/10 border-blue-500/25 text-blue-300/90'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}
      >
        {/* Ícone dinâmico */}
        <div className="flex-shrink-0 mt-0.5">
          {isFinal && !interimTranscript ? (
            <svg
              className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : showListeningIndicator ? (
            <svg
              className={`w-3.5 h-3.5 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072M12 18.364a9 9 0 000-12.728M8.464 15.536a5 5 0 010-7.072" />
            </svg>
          ) : (
            <svg
              className={`w-3.5 h-3.5 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          {showListeningIndicator ? (
            <span className={`italic ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
              Ouvindo{dots}
            </span>
          ) : (
            <span
              className={`block leading-snug ${!isFinal ? 'italic opacity-80' : 'font-medium'}`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {displayText}
            </span>
          )}
        </div>

        {/* Badge de status */}
        <span
          className={`flex-shrink-0 text-[10px] uppercase tracking-wider font-semibold opacity-50 mt-0.5 ${
            isFinal
              ? isDark ? 'text-emerald-300' : 'text-emerald-600'
              : isDark ? 'text-blue-300' : 'text-blue-600'
          }`}
        >
          {isFinal && !interimTranscript ? 'entendido' : 'ouvindo'}
        </span>
      </div>
    </div>
  );
}
