// components/assistant/FunctionCarousel.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
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
  is_enabled_for_company?: boolean;
}

interface FunctionCarouselProps {
  companyId: string;
  onFunctionClick: (functionKey: string) => void;
  theme?: 'dark' | 'light';
  hideDisabledFunctions?: boolean;
  autoScroll?: boolean;
}

function calcScrollDuration(count: number, isMobile: boolean): number {
  const perItem = isMobile ? 3.5 : 2.5;
  return Math.max(8, Math.min(60, count * perItem));
}

export default function FunctionCarousel({
  companyId,
  onFunctionClick,
  theme = 'dark',
  hideDisabledFunctions = false,
  autoScroll = true,
}: FunctionCarouselProps) {
  const [functions, setFunctions] = useState<AssistantFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    loadFunctions();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFunctions() {
    try {
      const { data: allFunctions, error: functionsError } = await supabase
        .from('assistant_functions')
        .select('*')
        .eq('is_active', true)
        .not('function_key', 'in', '("pix_confirm","pix_cancel")')
        .order('display_order');

      if (functionsError) {
        console.error('Erro ao carregar funções:', functionsError);
        setLoading(false);
        return;
      }

      const { data: companySettings, error: settingsError } = await supabase
        .from('company_function_settings')
        .select('function_key, is_enabled')
        .eq('company_id', companyId);

      if (settingsError) {
        console.error('Erro ao carregar settings:', settingsError);
      }

      const settingsMap = new Map(
        (companySettings || []).map(s => [s.function_key, s.is_enabled])
      );

      const processedFunctions = (allFunctions || []).map(fn => ({
        ...fn,
        is_enabled_for_company: settingsMap.get(fn.function_key) ?? fn.default_enabled,
      }));

      setFunctions(processedFunctions);
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleClick(fn: AssistantFunction) {
    if (!fn.is_enabled_for_company) return;
    console.log('🎯 Função clicada:', fn.function_key);
    onFunctionClick(fn.function_key);
  }

  function pauseAnimation() {
    if (carouselRef.current) {
      carouselRef.current.style.animationPlayState = 'paused';
    }
  }

  function resumeAnimation() {
    if (carouselRef.current) {
      carouselRef.current.style.animationPlayState = 'running';
    }
  }

  const filteredFunctions = hideDisabledFunctions
    ? functions.filter(fn => fn.is_enabled_for_company)
    : functions;

  const displayFunctions = autoScroll
    ? [...filteredFunctions, ...filteredFunctions, ...filteredFunctions, ...filteredFunctions]
    : filteredFunctions;

  const scrollDuration = calcScrollDuration(filteredFunctions.length, isMobile);

  const getCardColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981'];
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
      <div className="w-full py-4 overflow-x-auto md:overflow-hidden no-scrollbar">
        <div className="relative w-full">
          <div
            ref={carouselRef}
            className={autoScroll
              ? 'flex gap-3 pl-3 w-max'
              : 'flex gap-3 flex-wrap justify-center w-full px-4'
            }
            style={autoScroll ? {
              animation: `scroll-infinite ${scrollDuration}s linear infinite`,
            } : undefined}
          >
            {displayFunctions.map((fn, idx) => {
              const originalIndex = idx % filteredFunctions.length;
              const borderColor = getCardColor(originalIndex);
              const isEnabled = fn.is_enabled_for_company;

              return (
                <button
                  key={`${fn.function_key}-${idx}`}
                  onClick={() => handleClick(fn)}
                  onTouchStart={(e) => {
                    if (autoScroll) { e.preventDefault(); pauseAnimation(); }
                  }}
                  onTouchEnd={() => { if (autoScroll) resumeAnimation(); }}
                  onTouchCancel={() => { if (autoScroll) resumeAnimation(); }}
                  onMouseEnter={() => { if (autoScroll) pauseAnimation(); }}
                  onMouseLeave={() => { if (autoScroll) resumeAnimation(); }}
                  disabled={!isEnabled}
                  className={`flex-shrink-0 px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 hover:scale-105 active:scale-95 ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-white hover:bg-gray-50 text-gray-900'
                  } ${!isEnabled && !hideDisabledFunctions ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={{
                    borderLeft: `4px solid ${borderColor}`,
                    boxShadow: theme === 'dark'
                      ? '0 2px 4px rgba(0, 0, 0, 0.2)'
                      : '0 2px 8px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <span className="text-sm font-semibold whitespace-nowrap">{fn.function_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-infinite {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-25%)); }
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
