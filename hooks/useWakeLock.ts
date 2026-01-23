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

    // Cleanup APENAS ao desmontar o componente (não ao mudar isActive)
    return () => {
      console.log('🧹 Componente desmontando - liberando Wake Lock');
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []); // ⚡ Array vazio - só roda uma vez!

  const requestWakeLock = async () => {
    console.log('🔒 Tentando ativar Wake Lock...');
    
    if (!isSupported) {
      const msg = 'Wake Lock não é suportado neste navegador';
      console.warn('⚠️', msg);
      setError(msg);
      return false;
    }

    // Se já está ativo, não fazer nada
    if (wakeLockRef.current !== null && !wakeLockRef.current.released) {
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

      // Listener para quando o Wake Lock for liberado PELO SISTEMA
      wakeLockRef.current.addEventListener('release', () => {
        console.log('⚠️ Wake Lock foi liberado pelo sistema');
        setIsActive(false);
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
    console.log('🔓 Desativando Wake Lock manualmente...');
    
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
      
      // Se a página voltou a ficar visível E o Wake Lock deveria estar ativo
      if (document.visibilityState === 'visible' && isActive) {
        // Se o Wake Lock foi liberado (released = true), reativar
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          console.log('🔄 Reativando Wake Lock...');
          await requestWakeLock();
        } else {
          console.log('✅ Wake Lock ainda está ativo, não precisa reativar');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]); // ⚡ Só depende de isActive

  return {
    isSupported,
    isActive,
    error,
    requestWakeLock,
    releaseWakeLock,
  };
}
