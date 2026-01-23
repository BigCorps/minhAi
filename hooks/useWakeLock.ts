// hooks/useWakeLock.ts
'use client';

import { useState, useEffect, useRef } from 'react';

export function useWakeLock() {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // Verificar se o navegador suporta Wake Lock API
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = async () => {
    if (!isSupported) {
      console.warn('Wake Lock API não é suportada neste navegador');
      return false;
    }

    try {
      // Solicitar Wake Lock
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);

      console.log('✅ Wake Lock ativado - tela permanecerá ligada');

      // Listener para quando o Wake Lock for liberado
      wakeLockRef.current.addEventListener('release', () => {
        console.log('Wake Lock foi liberado');
        setIsActive(false);
      });

      return true;
    } catch (err: any) {
      console.error('Erro ao ativar Wake Lock:', err.message);
      setIsActive(false);
      return false;
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log('Wake Lock desativado');
      } catch (err) {
        console.error('Erro ao desativar Wake Lock:', err);
      }
    }
  };

  // Reativar Wake Lock se a página voltar a ficar visível
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isActive) {
        // Se a página voltou a ficar visível e estava ativo, reativa
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isActive]);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock,
  };
}
