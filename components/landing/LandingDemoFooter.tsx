'use client';

// components/landing/LandingDemoFooter.tsx
// Footer fixo da landing com carrossel de funções e modal de demonstração.
// Usa companyId="demo" no CategoryCarousel — carrega todas as funções ativas
// sem vínculo com empresa real e sem executar nenhuma ação.

import { useState, useEffect } from 'react';
import CategoryCarousel from '@/components/assistant/CategoryCarousel';
import { DemoFunctionModal } from './DemoFunctionModal';

interface LandingDemoFooterProps {
  theme?: 'dark' | 'light';
}

// Tipo que o CategoryCarousel passa via onFunctionClick
// O carrossel chama com a function_key, mas precisamos dos dados completos.
// A solução: interceptar no nível do footer usando um evento customizado
// que o CategoryCarousel já emite internamente ao selecionar uma função.
// Como o CategoryCarousel só expõe function_key no callback,
// mantemos um cache local das funções carregadas via evento customizado.

export interface DemoFunctionData {
  function_key: string;
  name: string;
  description: string;
  short_description: string;
  icon?: string;
  color?: string;
  category: string;
}

// Cache global das funções carregadas pelo carrossel (populado via evento)
let functionCache: Map<string, DemoFunctionData> = new Map();

export function LandingDemoFooter({ theme = 'dark' }: LandingDemoFooterProps) {
  const [time, setTime] = useState<string>('');
  const [selectedFunction, setSelectedFunction] = useState<DemoFunctionData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Relógio em tempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ouvir o evento de cache de funções emitido pelo CategoryCarousel
  // O carrossel emite 'eai:functionsLoaded' com a lista completa de funções
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

  // Handler de clique na função — busca dados reais do cache
  const handleFunctionClick = (functionKey: string) => {
    // Tenta buscar do cache primeiro (dados reais do banco)
    const cached = functionCache.get(functionKey);

    if (cached) {
      setSelectedFunction(cached);
    } else {
      // Fallback: formata o nome da key enquanto o cache carrega
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
          isDark ? 'bg-slate-950/80 border-white/5' : 'bg-white/80 border-slate-200'
        }`}>
          <CategoryCarousel
            companyId="demo"
            onFunctionClick={handleFunctionClick}
            theme={theme}
            autoScroll={true}
          />
        </div>

        {/* Barra de Status */}
        <div className={`h-8 border-t backdrop-blur-xl flex items-center justify-between px-4 text-[10px] font-medium ${
          isDark
            ? 'bg-slate-950/90 border-white/5 text-slate-400'
            : 'bg-slate-50/90 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Sistema Online</span>
            </div>
            <span className="hidden md:inline opacity-50">|</span>
            <span className="hidden md:inline">minhAi.app — Uma IA pra chamar de sua!</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono tabular-nums text-xs">{time}</span>
          </div>
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
