import { useEffect, useRef, useCallback } from 'react';
 
// Chave no sessionStorage para persistir o timestamp da última atividade.
// Quando o modo muda (padrao→texto→full), o componente remonta mas o timer
// continua de onde parou — sem reiniciar do zero nem disparar saudação dupla.
const LAST_ACTIVITY_KEY = 'eai:lastActivityAt';
 
function readLastActivity(): number {
  try {
    return parseInt(sessionStorage.getItem(LAST_ACTIVITY_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
 
function writeLastActivity(ts: number) {
  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
  } catch { /* silencioso */ }
}
 
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
  const timeoutRef        = useRef<NodeJS.Timeout | null>(null);
  const isInactiveRef     = useRef(false);
 
  const timeoutSecondsRef = useRef(timeoutSeconds);
  const onInactivityRef   = useRef(onInactivity);
  const onActivityRef     = useRef(onActivity);
 
  useEffect(() => { timeoutSecondsRef.current = timeoutSeconds; }, [timeoutSeconds]);
  useEffect(() => { onInactivityRef.current   = onInactivity;   }, [onInactivity]);
  useEffect(() => { onActivityRef.current     = onActivity;     }, [onActivity]);
 
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
 
    const seconds = timeoutSecondsRef.current;
    const now = Date.now();
 
    // FIX: persiste o momento de atividade para sobreviver à remontagem
    writeLastActivity(now);
 
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
  }, []); // estável — lê valores via refs
 
  useEffect(() => {
    const seconds = timeoutSecondsRef.current;
    const lastActivity = readLastActivity();
    const now = Date.now();
 
    if (lastActivity > 0) {
      // FIX: calcula quanto tempo já passou desde a última atividade.
      // Se o componente remontou por troca de modo, desconta o tempo decorrido
      // em vez de reiniciar do zero — evita disparar onInactivity prematuramente.
      const elapsedMs   = now - lastActivity;
      const remainingMs = seconds * 1000 - elapsedMs;
 
      if (remainingMs <= 0) {
        // Tempo já esgotado enquanto estava em outro modo — dispara imediatamente
        isInactiveRef.current = true;
        onInactivityRef.current();
      } else {
        console.log('[Timer] montagem com tempo restante:', Math.round(remainingMs / 1000), 's');
        timeoutRef.current = setTimeout(() => {
          console.log('[Timer] DISPAROU após remontagem');
          isInactiveRef.current = true;
          onInactivityRef.current();
        }, remainingMs);
      }
    } else {
      // Primeira montagem — sem histórico, inicia normalmente
      resetTimer();
    }
 
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);
 
  // Reinicia quando timeoutSeconds muda (configuração carregada do banco)
  useEffect(() => {
    console.log('[Timer] timeoutSeconds mudou para:', timeoutSeconds, '— reiniciando timer');
    resetTimer();
  }, [timeoutSeconds]); // eslint-disable-line react-hooks/exhaustive-deps
 
  return { resetTimer };
}
