/**
 * Hook: useWakeWordState
 * 
 * Gerencia o estado de detecção da wake word com transição visual instantânea.
 * Quando a wake word é detectada, dispara:
 * - Mudança de cor do Avatar (roxo/violeta)
 * - Mudança de cor do Microfone (roxo)
 * - Captura imediata do áudio sem delay
 * 
 * Mantém a estrutura existente intacta, apenas adiciona um novo layer de UX.
 */

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

  /**
   * Dispara quando a wake word é detectada com confiança suficiente
   */
  const onWakeWordDetected = useCallback((keyword: string, confidence: number) => {
    console.log(`🟣 WAKE WORD DETECTADA: "${keyword}" (${(confidence * 100).toFixed(0)}%)`);
    
    setWakeWordState({
      isWakeWordDetected: true,
      wakeWordKeyword: keyword,
      wakeWordConfidence: confidence,
      detectedAt: Date.now(),
    });

    // Disparar evento customizado para componentes externos
    window.dispatchEvent(
      new CustomEvent('wakeWordDetected', {
        detail: { keyword, confidence, timestamp: Date.now() }
      })
    );
  }, []);

  /**
   * Reseta o estado da wake word (quando comando termina ou é cancelado)
   */
  const resetWakeWordState = useCallback(() => {
    console.log('🔄 Resetando wake word state');
    setWakeWordState({
      isWakeWordDetected: false,
      wakeWordKeyword: null,
      wakeWordConfidence: 0,
      detectedAt: null,
    });

    window.dispatchEvent(new CustomEvent('wakeWordReset'));
  }, []);

  /**
   * Verifica se a wake word ainda está "ativa" (dentro de uma janela de tempo)
   * Útil para saber se estamos no contexto de um comando
   */
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
