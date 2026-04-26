import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityDetectorOptions {
  timeoutSeconds?: number; // Tempo de inatividade em segundos (padrão: 300s = 5 minutos)
  onInactivity: () => void; // Callback a ser executado quando a inatividade é detectada
  onActivity?: () => void;  // Callback opcional a ser executado quando a atividade é detectada
}

export function useInactivityDetector({
  timeoutSeconds = 300,
  onInactivity,
  onActivity,
}: UseInactivityDetectorOptions) {
  const timeoutRef      = useRef<NodeJS.Timeout | null>(null);
  const isInactiveRef   = useRef(false);

  // Guardamos os callbacks em refs para que resetTimer nunca precise
  // deles como deps — evita o ciclo onde onInactivity estável impede
  // a recriação do resetTimer e portanto impede o useEffect de rodar.
  const onInactivityRef = useRef(onInactivity);
  const onActivityRef   = useRef(onActivity);
  useEffect(() => { onInactivityRef.current = onInactivity; }, [onInactivity]);
  useEffect(() => { onActivityRef.current   = onActivity;   }, [onActivity]);

  // resetTimer só depende de timeoutSeconds — sempre recriado quando o
  // banco responde com o valor configurado no dashboard.
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      isInactiveRef.current = true;
      onInactivityRef.current();
    }, timeoutSeconds * 1000);

    if (isInactiveRef.current) {
      isInactiveRef.current = false;
      onActivityRef.current?.();
    }
  }, [timeoutSeconds]); // ← única dep: quando timeout muda, resetTimer muda

  // Roda na montagem E sempre que timeoutSeconds muda (via resetTimer).
  useEffect(() => {
    resetTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]); // resetTimer muda → useEffect roda → timer reinicia com novo valor

  return { resetTimer };
}
