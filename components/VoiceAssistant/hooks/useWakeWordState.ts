import { useState, useCallback } from 'react';

export interface WakeWordState {
  isWakeWordDetected: boolean;
  wakeWordKeyword: string | null;
  wakeWordConfidence: number;
  detectedAt: number | null;
}

export function useWakeWordState() {
  const [wakeWordState, setWakeWordState] = useState<WakeWordState>({
    isWakeWordDetected: false,
    wakeWordKeyword: null,
    wakeWordConfidence: 0,
    detectedAt: null,
  });

  const onWakeWordDetected = useCallback((keyword: string, confidence: number) => {
    setWakeWordState({
      isWakeWordDetected: true,
      wakeWordKeyword: keyword,
      wakeWordConfidence: confidence,
      detectedAt: Date.now(),
    });
  }, []);

  const resetWakeWordState = useCallback(() => {
    setWakeWordState({
      isWakeWordDetected: false,
      wakeWordKeyword: null,
      wakeWordConfidence: 0,
      detectedAt: null,
    });
  }, []);

  const isWakeWordActive = useCallback((timeoutMs: number = 5000): boolean => {
    if (!wakeWordState.isWakeWordDetected || !wakeWordState.detectedAt) {
      return false;
    }
    const elapsed = Date.now() - wakeWordState.detectedAt;
    return elapsed < timeoutMs;
  }, [wakeWordState]);

  return {
    wakeWordState,
    onWakeWordDetected,
    resetWakeWordState,
    isWakeWordActive,
  };
}
