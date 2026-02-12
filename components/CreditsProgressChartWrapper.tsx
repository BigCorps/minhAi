// components/CreditsProgressChartWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

console.log('📦 [CreditsProgressChartWrapper] Módulo carregado');

const CreditsProgressChart = dynamic(
  () => {
    console.log('⚡ [Dynamic Import] Iniciando importação do CreditsProgressChart...');
    return import('./CreditsProgressChart').then(mod => {
      console.log('✅ [Dynamic Import] CreditsProgressChart importado com sucesso');
      return { default: mod.CreditsProgressChart };
    });
  },
  { 
    ssr: false,
    loading: () => {
      console.log('⏳ [Dynamic Import] Mostrando loading state...');
      return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      );
    }
  }
);

export function CreditsProgressChartWrapper({ userId }: { userId: string }) {
  console.log('🎁 [Wrapper] Renderizando wrapper para userId:', userId);
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('🔌 [Wrapper] Componente montado no cliente');
    setMounted(true);
    
    // Verificar tema atual
    const isDark = document.documentElement.classList.contains('dark');
    console.log('🌓 [Wrapper] Tema detectado:', isDark ? 'DARK' : 'LIGHT');
    
    // Monitorar mudanças no tema
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDarkNow = document.documentElement.classList.contains('dark');
          console.log('🔄 [Wrapper] Tema alterado para:', isDarkNow ? 'DARK' : 'LIGHT');
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => {
      console.log('🔌 [Wrapper] Componente desmontado');
      observer.disconnect();
    };
  }, []);

  if (!mounted) {
    console.log('⏳ [Wrapper] Aguardando montagem no cliente...');
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  console.log('✅ [Wrapper] Renderizando CreditsProgressChart');
  return <CreditsProgressChart userId={userId} />;
}
