import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityDetectorOptions {
  timeoutSeconds?: number; // Tempo de inatividade em segundos (padrão: 300s = 5 minutos)
  onInactivity: () => void; // Callback a ser executado quando a inatividade é detectada
  onActivity?: () => void; // Callback opcional a ser executado quando a atividade é detectada
}

export function useInactivityDetector({
  timeoutSeconds = 300,
  onInactivity,
  onActivity,
}: UseInactivityDetectorOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInactiveRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      isInactiveRef.current = true;
      onInactivity();
    }, timeoutSeconds * 1000);

    if (isInactiveRef.current) {
      isInactiveRef.current = false;
      onActivity?.();
    }
  }, [timeoutSeconds, onInactivity, onActivity]);

  // Inicia o timer na montagem — sem listeners globais.
  // O reset acontece apenas via chamadas explícitas a resetTimer()
  // nas interações relevantes: carrossel, wake word, microfone e text input.
  useEffect(() => {
    resetTimer();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);

  return { resetTimer };
}
