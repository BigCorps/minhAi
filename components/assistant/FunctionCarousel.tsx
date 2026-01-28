// components/assistant/FunctionCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { getFunctionDemo } from '@/components/VoiceAssistant/functions';

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
  onFunctionClick: (functionKey: string, isEnabled: boolean) => void;
  theme?: 'dark' | 'light';
}

export default function FunctionCarousel({
  companyId,
  onFunctionClick,
  theme = 'dark'
}: FunctionCarouselProps) {
  const [functions, setFunctions] = useState<AssistantFunction[]>([]);
  const [enabledKeys, setEnabledKeys] = useState<string[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  
  useEffect(() => {
    loadFunctions();
  }, [companyId]);
  
  async function loadFunctions() {
    try {
      // 1. Buscar todas as funções ativas (exceto confirm/cancel PIX)
      const { data: allFunctions } = await supabase
        .from('assistant_functions')
        .select('*')
        .eq('is_active', true)
        .not('function_key', 'in', '("pix_confirm","pix_cancel")')
        .order('display_order');
      
      // 2. Buscar quais estão ativadas para esta empresa
      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('function_key, is_enabled')
        .eq('company_id', companyId)
        .eq('is_enabled', true);
      
      const enabled = settings?.map(s => s.function_key) || [];
      
      // Se não tem settings, todas estão ativadas por padrão
      const finalEnabled = settings && settings.length > 0 
        ? enabled 
        : allFunctions?.map(f => f.function_key) || [];
      
      setFunctions(allFunctions || []);
      setEnabledKeys(finalEnabled);
      
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function handleClick(fn: AssistantFunction) {
    const isEnabled = enabledKeys.includes(fn.function_key);
    
    if (isEnabled) {
      // Função ativada: executar
      onFunctionClick(fn.function_key, true);
    } else {
      // Função desativada: mostrar demo
      setSelectedFunction(fn.function_key);
    }
  }
  
  const demo = selectedFunction ? getFunctionDemo(selectedFunction) : null;
  const demoFunction = functions.find(f => f.function_key === selectedFunction);
  
  // Triplicar funções para garantir loop infinito suave
  const triplicatedFunctions = [...functions, ...functions, ...functions];
  
  // Cores alternadas azul/verde eAi
  const getCardColor = (index: number, isEnabled: boolean) => {
    const colors = ['#3B82F6', '#10B981']; // Azul e Verde eAi
    const color = colors[index % 2];
    return isEnabled ? color : '#6B7280';
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
      {/* Carrossel SEM FUNDO - usa fundo do contexto */}
      <div className="w-full py-4 overflow-hidden">
        <div className="relative w-full">
          {/* Carrossel com animação CSS */}
          <div className="flex gap-3 animate-scroll">
            {triplicatedFunctions.map((fn, idx) => {
              const isEnabled = enabledKeys.includes(fn.function_key);
              const originalIndex = idx % functions.length;
              const borderColor = getCardColor(originalIndex, isEnabled);
              
              return (
                <button
                  key={`${fn.function_key}-${idx}`}
                  onClick={() => handleClick(fn)}
                  className={`flex-shrink-0 px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 hover:scale-105 ${
                    isEnabled
                      ? theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white shadow-md'
                        : 'bg-white hover:bg-gray-50 text-gray-900 shadow-lg'
                      : theme === 'dark'
                        ? 'bg-gray-700/50 text-gray-400 hover:bg-gray-700/70'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
                  style={{
                    borderLeft: `4px solid ${borderColor}`
                  }}
                >
                  <span className="text-sm font-semibold whitespace-nowrap">{fn.function_name}</span>
                  {!isEnabled && (
                    <span className="text-xs opacity-60">(Demo)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Modal de Demo */}
      {selectedFunction && demo && demoFunction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedFunction(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{demo.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {demoFunction.short_description}
                </p>
              </div>
              <button
                onClick={() => setSelectedFunction(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              {demo.description}
            </p>
            
            {demo.image && (
              <img
                src={demo.image}
                alt={demo.title}
                className="w-full rounded-lg mb-6 border border-gray-200 dark:border-gray-700"
              />
            )}
            
            <div className="space-y-3 mb-6">
              <p className="font-semibold text-lg">Como funciona:</p>
              {demo.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">
                    {step.replace(/^\d+\.\s*/, '')}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                Função Desativada
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Esta função está desativada no momento. Ative na página de Configurações para usar!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS para animação */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-33.333%));
          }
        }
        
        .animate-scroll {
          animation: scroll 36s linear infinite;
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }
        
        @media (max-width: 768px) {
          .animate-scroll {
            animation: scroll 24s linear infinite;
          }
        }
      `}</style>
    </>
  );
}
