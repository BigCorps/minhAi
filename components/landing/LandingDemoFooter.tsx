'use client';

// components/landing/LandingDemoFooter.tsx

import { useState, useEffect } from 'react';
import CategoryCarousel from '@/components/assistant/CategoryCarousel';
import { DemoFunctionModal } from './DemoFunctionModal';

interface LandingDemoFooterProps {
  theme?: 'dark' | 'light';
}

export interface DemoFunctionData {
  function_key: string;
  name: string;
  description: string;
  short_description: string;
  icon?: string;
  color?: string;
  category: string;
}

// Cache global das funções carregadas pelo carrossel
let functionCache: Map<string, DemoFunctionData> = new Map();

export function LandingDemoFooter({ theme = 'dark' }: LandingDemoFooterProps) {
  const [selectedFunction, setSelectedFunction] = useState<DemoFunctionData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ouvir evento de cache de funções emitido pelo CategoryCarousel
  useEffect(() => {
    const handleFunctionsLoaded = (e: CustomEvent) => {
      if (Array.isArray(e.detail)) {
        functionCache = new Map(
          e.detail.map((fn: any) => [fn.function_key, {
            function_key: fn.function_key,
            name: fn.function_name,
            description: fn.description || fn.short_description || '',
            short_description: fn.short_description || '',
            icon: fn.icon,
            color: fn.color,
            category: fn.function_category,
          }])
        );
      }
    };
    window.addEventListener('eai:functionsLoaded', handleFunctionsLoaded as EventListener);
    return () => window.removeEventListener('eai:functionsLoaded', handleFunctionsLoaded as EventListener);
  }, []);

  const handleFunctionClick = (functionKey: string) => {
    const cached = functionCache.get(functionKey);

    if (cached) {
      setSelectedFunction(cached);
    } else {
      // Fallback enquanto o cache ainda não foi populado
      const name = functionKey
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      setSelectedFunction({
        function_key: functionKey,
        name,
        description: 'Esta função integra inteligência artificial para otimizar o fluxo de trabalho da sua empresa, permitindo comandos rápidos por voz ou texto.',
        short_description: '',
        category: 'Demonstração',
      });
    }

    setIsModalOpen(true);
  };

  const isDark = theme === 'dark';

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[50] flex flex-col">

        {/* Carrossel de Funções */}
        <div className={`w-full border-t backdrop-blur-xl ${
          isDark ? 'bg-transparent border-white/5' : 'bg-transparent border-slate-200/60'
        }`}>
          <CategoryCarousel
            companyId="demo"
            onFunctionClick={handleFunctionClick}
            theme={theme}
            autoScroll={true}
          />
        </div>

        {/* Barra inferior — só frase centralizada */}
        <div className={`h-7 border-t backdrop-blur-xl flex items-center justify-center px-4 ${
          isDark
            ? 'bg-transparent border-white/5'
            : 'bg-transparent border-slate-200/60'
        }`}>
          <span className={`text-[10px] font-medium tracking-wide ${
            isDark ? 'text-white/25' : 'text-slate-400'
          }`}>
            minhAi.app — Uma IA pra chamar de sua!
          </span>
        </div>
      </div>

      <DemoFunctionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        functionData={selectedFunction}
        theme={theme}
      />
    </>
  );
}
