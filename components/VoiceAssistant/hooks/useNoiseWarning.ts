// ============================================================
// hooks/useNoiseWarning.ts
// Caminho: components/assistant/VoiceAssistant/hooks/useNoiseWarning.ts
// ============================================================

import { useState, useRef } from 'react';

interface NoiseWarningResult {
  noiseWarning: boolean;
  repromptWarning: boolean;
  handleVolumeChange: (rms: number) => void;
  triggerRepromptWarning: () => void;
  clearRepromptWarning: () => void;
}

/**
 * Gerencia avisos visuais de ruído ambiente e de reprompt
 * (quando o assistente não entende o que foi dito).
 *
 * Lógica de debounce em 2 camadas para evitar efeito piscante:
 * - noiseWarning: exibido por 5s após detecção de RMS > 0.08
 * - repromptWarning: exibido por 5s após falha de entendimento
 */
export function useNoiseWarning(): NoiseWarningResult {
  const [noiseWarning, setNoiseWarning] = useState(false);
  const [repromptWarning, setRepromptWarning] = useState(false);

  const noiseWarningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const repromptWarningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleVolumeChange = (rms: number) => {
    if (rms > 0.08) {
      setNoiseWarning(prev => {
        if (!prev) {
          if (noiseWarningTimerRef.current) clearTimeout(noiseWarningTimerRef.current);
          noiseWarningTimerRef.current = setTimeout(() => {
            setNoiseWarning(false);
            noiseWarningTimerRef.current = null;
          }, 5000);
          return true;
        }
        return prev; // já visível: não resetar timer
      });
    }
  };

  const triggerRepromptWarning = () => {
    setRepromptWarning(true);
    if (repromptWarningTimerRef.current) clearTimeout(repromptWarningTimerRef.current);
    repromptWarningTimerRef.current = setTimeout(() => {
      setRepromptWarning(false);
      repromptWarningTimerRef.current = null;
    }, 5000);
  };

  const clearRepromptWarning = () => {
    setRepromptWarning(false);
    if (repromptWarningTimerRef.current) {
      clearTimeout(repromptWarningTimerRef.current);
      repromptWarningTimerRef.current = null;
    }
  };

  return {
    noiseWarning,
    repromptWarning,
    handleVolumeChange,
    triggerRepromptWarning,
    clearRepromptWarning,
  };
}