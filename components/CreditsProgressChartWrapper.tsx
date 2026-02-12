// components/CreditsProgressChartWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext'; // 🔥 Usando ThemeContext customizado

const CreditsProgressChart = dynamic(
  () => import('./CreditsProgressChart').then(mod => ({ default: mod.CreditsProgressChart })),
  { 
    ssr: false,
    loading: () => {
      // Loading state simples sem tema
      return (
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-700 rounded w-48"></div>
            <div className="h-64 bg-slate-700 rounded"></div>
          </div>
        </div>
      );
    }
  }
);

export function CreditsProgressChartWrapper({ userId }: { userId: string }) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme(); // 🔥 Mudança aqui
  
  // Força remontagem quando tema mudar
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Atualiza key quando tema mudar
  useEffect(() => {
    if (mounted) {
      setThemeKey(prev => prev + 1);
    }
  }, [theme, mounted]);

  // Evita erro de hidratação
  if (!mounted) {
    return (
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-48"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  const isDark = theme === 'dark'; // 🔥 Mudança aqui

  // Passa o tema e key para o componente
  return <CreditsProgressChart key={themeKey} userId={userId} isDark={isDark} />;
}