'use client';

import { useState, useEffect } from 'react';
import CategoryCarousel from '@/components/assistant/CategoryCarousel';
import { DemoFunctionModal } from './DemoFunctionModal';

interface LandingDemoFooterProps {
  theme?: 'dark' | 'light';
}

export function LandingDemoFooter({ theme = 'dark' }: LandingDemoFooterProps) {
  const [time, setTime] = useState<string>('');
  const [selectedFunction, setSelectedFunction] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulação de clique na função
  const handleFunctionClick = (functionKey: string) => {
    // Aqui você pode mapear as descrições reais ou deixar genérico
    // Para a demo, vamos pegar o nome formatado da key
    const name = functionKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    setSelectedFunction({
      name: name,
      description: `A função ${name} integra inteligência artificial para otimizar o fluxo de trabalho da sua empresa, permitindo comandos rápidos por voz ou texto.`,
      category: 'Demonstração'
    });
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

        {/* Barra de Status Inferior */}
        <div className={`h-8 border-t backdrop-blur-xl flex items-center justify-between px-4 text-[10px] font-medium ${
          isDark ? 'bg-slate-950/90 border-white/5 text-slate-400' : 'bg-slate-50/90 border-slate-200 text-slate-500'
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