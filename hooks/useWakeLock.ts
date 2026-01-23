// hooks/useWakeLock.ts
'use client';

import { useState, useEffect, useRef } from 'react';

export function useWakeLock() {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // Verificar se o navegador suporta Wake Lock API
    const supported = 'wakeLock' in navigator;
    setIsSupported(supported);
    
    console.log('🔍 Wake Lock suportado:', supported);
    console.log('🌐 User Agent:', navigator.userAgent);
  }, []);

  const requestWakeLock = async () => {
    console.log('🔒 Tentando ativar Wake Lock...');
    
    if (!isSupported) {
      const msg = 'Wake Lock não é suportado neste navegador';
      console.warn('⚠️', msg);
      setError(msg);
      return false;
    }

    // Se já está ativo, não fazer nada
    if (wakeLockRef.current !== null) {
      console.log('✅ Wake Lock já está ativo');
      return true;
    }

    try {
      // Solicitar Wake Lock
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);
      setError(null);

      console.log('✅ Wake Lock ATIVADO com sucesso!');
      console.log('📱 Tipo:', wakeLockRef.current.type);
      console.log('📱 Released:', wakeLockRef.current.released);

      // Listener para quando o Wake Lock for liberado
      wakeLockRef.current.addEventListener('release', () => {
        console.log('⚠️ Wake Lock foi liberado automaticamente');
        setIsActive(false);
        wakeLockRef.current = null;
      });

      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro desconhecido';
      console.error('❌ Erro ao ativar Wake Lock:', errorMsg);
      console.error('📋 Detalhes:', err);
      
      setIsActive(false);
      setError(errorMsg);
      wakeLockRef.current = null;
      
      return false;
    }
  };

  const releaseWakeLock = async () => {
    console.log('🔓 Tentando desativar Wake Lock...');
    
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        setError(null);
        console.log('✅ Wake Lock DESATIVADO com sucesso');
      } catch (err: any) {
        console.error('❌ Erro ao desativar Wake Lock:', err);
        setError(err.message);
      }
    } else {
      console.log('⚠️ Wake Lock já estava inativo');
    }
  };

  // Reativar Wake Lock se a página voltar a ficar visível
  useEffect(() => {
    const handleVisibilityChange = async () => {
      console.log('👁️ Visibilidade mudou:', document.visibilityState);
      
      if (document.visibilityState === 'visible' && isActive && !wakeLockRef.current) {
        console.log('🔄 Reativando Wake Lock...');
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup ao desmontar
    return () => {
      console.log('🧹 Limpando Wake Lock...');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        releaseWakeLock();
      }
    };
  }, [isActive]);

  return {
    isSupported,
    isActive,
    error,
    requestWakeLock,
    releaseWakeLock,
  };
}
