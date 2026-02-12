// components/CreditsProgressChartWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const CreditsProgressChart = dynamic(
  () => import('./CreditsProgressChart').then(mod => ({ default: mod.CreditsProgressChart })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }
);

export function CreditsProgressChartWrapper({ userId }: { userId: string }) {
  const [mounted, setMounted] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    // Observar mudanças no tema e forçar remontagem
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // Incrementa o key para forçar remontagem completa do componente
          setThemeKey(prev => prev + 1);
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Key dinâmica força remontagem quando tema mudar
  return <CreditsProgressChart key={themeKey} userId={userId} />;
}