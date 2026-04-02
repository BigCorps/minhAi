// components/assistant/CategoryCarousel.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface CategoryCarouselProps {
  companyId: string;
  onFunctionClick: (functionKey: string) => void;
  theme?: 'dark' | 'light';
  hideDisabledFunctions?: boolean;
  autoScroll?: boolean;
}

interface AssistantFunction {
  function_key: string;
  function_name: string;
  short_description: string;
  function_category: string;
  icon: string;
  color: string;
  display_order: number;
  is_enabled_for_company?: boolean;
}

interface Category {
  key: string;
  name: string;
  functions: AssistantFunction[];
  hasEnabledFunctions: boolean;
}

const CATEGORIES = [
  { key: 'ai_assistant', name: 'Conhecimento' },
  { key: 'products', name: 'Comercial' },
  { key: 'payment', name: 'Financeiro' },
  { key: 'information', name: 'Informação' },
  { key: 'video', name: 'Multimídia' },
  { key: 'schedule', name: 'Agendamento' },
  { key: 'contact', name: 'Contato' },
  { key: 'configuration', name: 'Localização' },
  { key: 'knowledge', name: 'Consultas' },
  { key: 'biometry', name: 'Identificação' },
  { key: 'images', name: 'Arquivos' },
  { key: 'utylities', name: 'Utilitários' },
  { key: 'codes', name: 'Câmera' },
  { key: 'services', name: 'Serviços' },
];

function calcScrollDuration(count: number, isMobile: boolean): number {
  const perItem = isMobile ? 3.5 : 2.5;
  return Math.max(8, Math.min(60, count * perItem));
}

export default function CategoryCarousel({
  companyId,
  onFunctionClick,
  theme = 'dark',
  hideDisabledFunctions = false,
  autoScroll = true,
}: CategoryCarouselProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredFunction, setHoveredFunction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [clickedChipRect, setClickedChipRect] = useState<DOMRect | null>(null);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const isDark = theme === 'dark';

  // Detectar mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Carregar funções e agrupar por categoria
  useEffect(() => {
    async function loadFunctions() {
      const { data: functions } = await supabase
        .from('assistant_functions')
        .select('*')
        .eq('is_active', true)
        .not('function_key', 'in', '("pix_confirm","pix_cancel")')
        .order('display_order');

      if (!functions) return;

      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('function_key, is_enabled')
        .eq('company_id', companyId);

      const settingsMap = new Map(
        settings?.map((s) => [s.function_key, s.is_enabled]) || []
      );

      // Marcar funções como enabled/disabled
      const processedFunctions = functions.map((fn) => ({
        ...fn,
        is_enabled_for_company: settingsMap.get(fn.function_key) ?? true,
      }));

      // Filtrar funções desabilitadas se necessário
      let filteredFunctions = processedFunctions;
      if (hideDisabledFunctions) {
        filteredFunctions = processedFunctions.filter((fn) => fn.is_enabled_for_company);
      }

      // Agrupar por categoria
      const grouped = CATEGORIES.map((cat) => {
        const categoryFunctions = filteredFunctions.filter(
          (fn) => fn.function_category === cat.key
        );
        const hasEnabledFunctions = categoryFunctions.some((fn) => fn.is_enabled_for_company);
        
        return {
          ...cat,
          functions: categoryFunctions,
          hasEnabledFunctions,
        };
      }).filter((cat) => cat.functions.length > 0);

      setCategories(grouped);
    }

    loadFunctions();
  }, [companyId, hideDisabledFunctions, supabase]);

  // Click outside detection
  useEffect(() => {
    if (!activeCategory) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedOutsidePanel = panelRef.current && !panelRef.current.contains(target);
      const clickedOutsideChips = carouselRef.current && !carouselRef.current.contains(target);
      
      if (clickedOutsidePanel && clickedOutsideChips) {
        setActiveCategory(null);
        setClickedChipRect(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCategory]);

  const scrollDuration = calcScrollDuration(categories.length, isMobile);
  const duplicatedCategories = autoScroll ? [...categories, ...categories] : categories;

  const getChipColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981'];
    return colors[index % 2];
  };

  const handleCategoryClick = (category: Category, e: React.MouseEvent<HTMLButtonElement>) => {
    // Não abrir se todas as funções estão desabilitadas
    if (!category.hasEnabledFunctions) return;
    
    const chipElement = chipRefs.current.get(category.key);
    
    if (activeCategory === category.key) {
      setActiveCategory(null);
      setClickedChipRect(null);
    } else {
      setActiveCategory(category.key);
      if (chipElement) {
        setClickedChipRect(chipElement.getBoundingClientRect());
      }
    }
  };

  const handleFunctionClick = (fn: AssistantFunction) => {
    if (!fn.is_enabled_for_company) return;
    onFunctionClick(fn.function_key);
    setActiveCategory(null);
    setClickedChipRect(null);
  };

  // Handlers centralizados de pause/resume
  const pauseAnimation = useCallback(() => {
    if (carouselRef.current && autoScroll) {
      carouselRef.current.style.animationPlayState = 'paused';
    }
  }, [autoScroll]);

  const resumeAnimation = useCallback(() => {
    if (carouselRef.current && autoScroll && !activeCategory) {
      carouselRef.current.style.animationPlayState = 'running';
    }
  }, [activeCategory, autoScroll]);

  const styles = {
    panel: {
      background: isDark
        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(51, 65, 85, 0.98))'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98))',
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
      boxShadow: isDark
        ? '0 -10px 40px rgba(0, 0, 0, 0.5), 0 -2px 10px rgba(59, 130, 246, 0.3)'
        : '0 -10px 40px rgba(0, 0, 0, 0.15), 0 -2px 10px rgba(59, 130, 246, 0.2)',
    },
    functionItem: {
      background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.8)',
      color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)',
    },
    functionItemHover: {
      background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    },
  };

  const getPanelPosition = () => {
    if (!clickedChipRect) return {};
    
    const panelWidth = 280;
    const viewportWidth = window.innerWidth;
    
    let left = clickedChipRect.left + (clickedChipRect.width / 2) - (panelWidth / 2);
    
    if (left < 10) left = 10;
    if (left + panelWidth > viewportWidth - 10) left = viewportWidth - panelWidth - 10;
    
    return {
      position: 'fixed' as const,
      left: `${left}px`,
      bottom: `${window.innerHeight - clickedChipRect.top + 8}px`,
    };
  };

  return (
    <div className="relative w-full">
      {/* Painel flutuante de funções */}
      {activeCategory && (
        <div
          ref={panelRef}
          className="z-[100]"
          style={getPanelPosition()}
        >
          <div
            className="rounded-2xl border-2 backdrop-blur-xl overflow-hidden"
            style={{
              ...styles.panel,
              width: '280px',
              maxHeight: '350px',
            }}
          >
            <div
              className="px-3 py-1.5 font-semibold border-b text-xs"
              style={{
                borderColor: styles.panel.borderColor,
                color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)',
              }}
            >
              {CATEGORIES.find((c) => c.key === activeCategory)?.name}
            </div>

            <div className="overflow-hidden">
              {categories
                .find((c) => c.key === activeCategory)
                ?.functions.map((fn) => {
                  const isEnabled = fn.is_enabled_for_company;
                  
                  return (
                    <div
                      key={fn.function_key}
                      className={`px-3 py-1.5 transition-all border-b border-white/5 ${
                        isEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                      }`}
                      style={
                        isEnabled && hoveredFunction === fn.function_key
                          ? styles.functionItemHover
                          : styles.functionItem
                      }
                      onMouseEnter={() => isEnabled && setHoveredFunction(fn.function_key)}
                      onMouseLeave={() => setHoveredFunction(null)}
                      onClick={() => handleFunctionClick(fn)}
                    >
                      <span className="font-medium text-[11px] leading-tight block">
                        {fn.function_name}
                      </span>
                      
                      {isEnabled && hoveredFunction === fn.function_key && fn.short_description && (
                        <div
                          className="mt-0.5 text-[9px] leading-tight opacity-70"
                          style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)' }}
                        >
                          {fn.short_description}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Container do carrossel */}
      <div className="w-full py-4 overflow-x-auto md:overflow-hidden no-scrollbar">
        <div className="relative w-full">
          <div
            onMouseEnter={pauseAnimation}
            onMouseLeave={resumeAnimation}
            onTouchStart={pauseAnimation}
            onTouchEnd={resumeAnimation}
            onTouchCancel={resumeAnimation}
          >
            <div
              ref={carouselRef}
              className={autoScroll
                ? 'flex gap-3 pl-3 w-max'
                : 'flex gap-3 flex-wrap justify-center w-full px-4'
              }
              style={autoScroll ? {
                animation: `scroll-infinite ${scrollDuration}s linear infinite`,
                animationPlayState: activeCategory ? 'paused' : 'running',
                willChange: 'transform',
              } : undefined}
            >
              {duplicatedCategories.map((category, index) => {
                const borderColor = getChipColor(index);
                const isActive = activeCategory === category.key;
                const hasEnabled = category.hasEnabledFunctions;

                return (
                  <button
                    key={`${category.key}-${index}`}
                    ref={(el) => {
                      if (el && (!autoScroll || index < categories.length)) {
                        chipRefs.current.set(category.key, el);
                      }
                    }}
                    onClick={(e) => handleCategoryClick(category, e)}
                    disabled={!hasEnabled}
                    className={`flex-shrink-0 px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 hover:scale-105 active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-900'
                    } ${!hasEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    style={{
                      borderLeft: `4px solid ${borderColor}`,
                      boxShadow: theme === 'dark'
                        ? '0 2px 4px rgba(0, 0, 0, 0.2)'
                        : '0 2px 8px rgba(0, 0, 0, 0.05)',
                      ...(isActive && {
                        transform: 'scale(1.05)',
                        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.05)',
                      }),
                    }}
                  >
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-infinite {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
