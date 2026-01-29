// components/assistant/FunctionCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface AssistantFunction {
  id: string;
  function_key: string;
  function_name: string;
  function_category: string;
  description: string;
  short_description: string;
  demo_text: string;
  icon: string;
  color: string;
  is_active: boolean;
  display_order: number;
}

interface FunctionCarouselProps {
  companyId: string;
  onFunctionClick: (functionKey: string) => void;
  theme?: 'dark' | 'light';
}

export default function FunctionCarousel({
  companyId,
  onFunctionClick,
  theme = 'dark'
}: FunctionCarouselProps) {
  const [functions, setFunctions] = useState<AssistantFunction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  
  useEffect(() => {
    loadFunctions();
  }, [companyId]);
  
  async function loadFunctions() {
    try {
      // Buscar todas as funções ativas (exceto confirm/cancel PIX)
      const { data: allFunctions } = await supabase
        .from('assistant_functions')
        .select('*')
        .eq('is_active', true)
        .not('function_key', 'in', '("pix_confirm","pix_cancel")')
        .order('display_order');
      
      setFunctions(allFunctions || []);
      
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function handleClick(fn: AssistantFunction) {
    console.log('🎯 Função clicada:', fn.function_key);
    onFunctionClick(fn.function_key);
  }
  
  // Quadruplicar funções para garantir loop infinito PERFEITO
  const quadruplicatedFunctions = [...functions, ...functions, ...functions, ...functions];
  
  // Cores alternadas azul/verde eAi
  const getCardColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981']; // Azul e Verde eAi
    return colors[index % 2];
  };
  
  if (loading) {
    return (
      <div className="w-full py-4">
        <div className="flex gap-3 px-4 justify-center">
          <div className="animate-pulse bg-blue-500/20 h-12 w-32 rounded-xl"></div>
          <div className="animate-pulse bg-green-500/20 h-12 w-32 rounded-xl"></div>
          <div className="animate-pulse bg-blue-500/20 h-12 w-32 rounded-xl"></div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* Carrossel de PONTA A PONTA */}
      {/* ATUALIZAÇÃO: overflow-x-auto no mobile permite arrastar, overflow-hidden no desktop mantém padrão */}
      <div className="w-full py-4 overflow-x-auto md:overflow-hidden no-scrollbar">
        <div className="relative w-full">
          {/* Carrossel com animação CSS - QUADRUPLICADO para loop perfeito */}
          {/* w-max garante que o container estique para permitir o scroll manual horizontal */}
          <div className="flex gap-3 pl-3 animate-scroll-infinite w-max">
            {quadruplicatedFunctions.map((fn, idx) => {
              const originalIndex = idx % functions.length;
              const borderColor = getCardColor(originalIndex);
              
              return (
                <button
                  key={`${fn.function_key}-${idx}`}
                  onClick={() => handleClick(fn)}
                  className={`flex-shrink-0 px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 hover:scale-105 active:scale-95 ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-white hover:bg-gray-50 text-gray-900'
                  }`}
                  style={{
                    borderLeft: `4px solid ${borderColor}`,
                    boxShadow: theme === 'dark' 
                      ? '0 2px 4px rgba(0, 0, 0, 0.2)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <span className="text-sm font-semibold whitespace-nowrap">{fn.function_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* CSS para animação */}
      <style jsx>{`
        @keyframes scroll-infinite {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-25%));
          }
        }
        
        .animate-scroll-infinite {
          animation: scroll-infinite 24s linear infinite;
        }
        
        /* Pausa a animação ao passar o mouse ou tocar e segurar no mobile */
        .animate-scroll-infinite:hover, .animate-scroll-infinite:active {
          animation-play-state: paused;
        }
        
        @media (max-width: 768px) {
          .animate-scroll-infinite {
            /* Velocidade aumentada em ~30% (16s -> 12s) */
            animation: scroll-infinite 12s linear infinite;
          }
        }

        /* Utilitário para esconder a barra de rolagem no mobile */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE e Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </>
  );
}
