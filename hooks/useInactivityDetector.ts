import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityDetectorOptions {
  timeoutSeconds?: number;
  onInactivity: () => void;
  onActivity?: () => void;
}

export function useInactivityDetector({
  timeoutSeconds = 300,
  onInactivity,
  onActivity,
}: UseInactivityDetectorOptions) {
  const timeoutRef         = useRef<NodeJS.Timeout | null>(null);
  const isInactiveRef      = useRef(false);

  // Todos os valores voláteis ficam em refs — o timer sempre lê o valor
  // atual no momento do disparo, não o valor do render em que foi criado.
  const timeoutSecondsRef  = useRef(timeoutSeconds);
  const onInactivityRef    = useRef(onInactivity);
  const onActivityRef      = useRef(onActivity);

  // Sincroniza refs a cada render — sem custo, sem recriar o timer.
  useEffect(() => { timeoutSecondsRef.current = timeoutSeconds; }, [timeoutSeconds]);
  useEffect(() => { onInactivityRef.current   = onInactivity;   }, [onInactivity]);
  useEffect(() => { onActivityRef.current     = onActivity;     }, [onActivity]);

  // resetTimer é estável (deps []) — nunca causa re-renders em cascata.
  // Sempre lê o timeout correto via ref no momento da execução.
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const seconds = timeoutSecondsRef.current;
    console.log('[Timer] resetTimer chamado — timeout:', seconds, 's');

    timeoutRef.current = setTimeout(() => {
      console.log('[Timer] DISPAROU após', seconds, 's');
      isInactiveRef.current = true;
      onInactivityRef.current();
    }, seconds * 1000);

    if (isInactiveRef.current) {
      isInactiveRef.current = false;
      onActivityRef.current?.();
    }
  }, []); // estável — lê valor atual via ref

  // Inicia o timer na montagem.
  useEffect(() => {
    resetTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);

  // Reinicia o timer quando timeoutSeconds muda (banco respondeu com valor configurado).
  // Segundo useEffect separado para não interferir com o ciclo de vida do resetTimer.
  useEffect(() => {
    console.log('[Timer] timeoutSeconds mudou para:', timeoutSeconds, '— reiniciando timer');
    resetTimer();
  }, [timeoutSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  return { resetTimer };
}
