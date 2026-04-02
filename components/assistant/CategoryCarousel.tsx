// components/assistant/CategoryCarousel.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
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
}

interface Category {
  key: string;
  name: string;
  functions: AssistantFunction[];
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
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredFunction, setHoveredFunction] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  // Carregar funções e agrupar por categoria
  useEffect(() => {
    async function loadFunctions() {
      // 1. Buscar todas as funções ativas
      const { data: functions } = await supabase
        .from('assistant_functions')
        .select('*')
        .eq('is_active', true)
        .not('function_key', 'in', '("pix_confirm","pix_cancel")')
        .order('display_order');

      if (!functions) return;

      // 2. Buscar settings da empresa
      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('function_key, is_enabled')
        .eq('company_id', companyId);

      const settingsMap = new Map(
        settings?.map((s) => [s.function_key, s.is_enabled]) || []
      );

      // 3. Filtrar funções desabilitadas se necessário
      let filteredFunctions = functions;
      if (hideDisabledFunctions) {
        filteredFunctions = functions.filter(
          (fn) => settingsMap.get(fn.function_key) !== false
        );
      }

      // 4. Agrupar por categoria
      const grouped = CATEGORIES.map((cat) => ({
        ...cat,
        functions: filteredFunctions.filter(
          (fn) => fn.function_category === cat.key
        ),
      })).filter((cat) => cat.functions.length > 0);

      setCategories(grouped);
    }

    loadFunctions();
  }, [companyId, hideDisabledFunctions, supabase]);

  // Click outside detection
  useEffect(() => {
    if (!activeCategory) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        carouselRef.current &&
        !carouselRef.current.contains(e.target as Node)
      ) {
        setActiveCategory(null);
        setIsPaused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCategory]);

  // Calcular duração do scroll baseado no número de categorias
  const scrollDuration = categories.length * 3; // 3s por categoria

  // Chips duplicados 2x para scroll infinito
  const duplicatedCategories = [...categories, ...categories];

  // Alternar cores dos chips
  const getChipColor = (index: number) => {
    return index % 2 === 0 ? '#3B82F6' : '#10B981'; // azul / verde
  };

  // Handler de click no chip
  const handleCategoryClick = (categoryKey: string) => {
    setActiveCategory(categoryKey);
    setIsPaused(true);
  };

  // Handler de click na função
  const handleFunctionClick = (functionKey: string) => {
    onFunctionClick(functionKey);
    setActiveCategory(null);
    setIsPaused(false);
  };

  const styles = {
    container: {
      background: isDark
        ? 'linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))'
        : 'linear-gradient(to bottom, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.95))',
    },
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

  return (
    <div className="relative">
      {/* Painel flutuante de funções */}
      {activeCategory && (
        <div
          ref={panelRef}
          className="absolute bottom-full left-0 right-0 mb-2 z-40"
          style={styles.panel}
        >
          <div
            className="mx-auto rounded-2xl border-2 backdrop-blur-xl overflow-hidden"
            style={{
              ...styles.panel,
              width: '280px',
              maxWidth: '100vw',
              maxHeight: '60vh',
            }}
          >
            {/* Header do painel */}
            <div
              className="px-4 py-3 font-semibold border-b"
              style={{
                borderColor: styles.panel.borderColor,
                color: isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)',
              }}
            >
              {CATEGORIES.find((c) => c.key === activeCategory)?.name}
            </div>

            {/* Lista de funções */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 52px)' }}>
              {categories
                .find((c) => c.key === activeCategory)
                ?.functions.map((fn) => (
                  <div
                    key={fn.function_key}
                    className="px-4 py-3 cursor-pointer transition-all border-b border-white/5"
                    style={
                      hoveredFunction === fn.function_key
                        ? styles.functionItemHover
                        : styles.functionItem
                    }
                    onMouseEnter={() => setHoveredFunction(fn.function_key)}
                    onMouseLeave={() => setHoveredFunction(null)}
                    onClick={() => handleFunctionClick(fn.function_key)}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '20px' }}>{fn.icon}</span>
                      <span className="font-medium text-sm">{fn.function_name}</span>
                    </div>
                    {hoveredFunction === fn.function_key && fn.short_description && (
                      <div
                        className="mt-2 text-xs opacity-70"
                        style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)' }}
                      >
                        {fn.short_description}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Container do carrossel */}
      <div
        ref={carouselRef}
        className="relative overflow-hidden py-3 backdrop-blur-xl"
        style={styles.container}
        onMouseEnter={() => autoScroll && setIsPaused(true)}
        onMouseLeave={() => autoScroll && !activeCategory && setIsPaused(false)}
      >
        <div
          className="flex gap-3 px-4"
          style={{
            animation:
              autoScroll && !isPaused
                ? `scroll-infinite ${scrollDuration}s linear infinite`
                : 'none',
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {duplicatedCategories.map((category, index) => (
            <button
              key={`${category.key}-${index}`}
              className="flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all hover:scale-105"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: getChipColor(index),
                color: getChipColor(index),
                background: activeCategory === category.key ? getChipColor(index) : 'transparent',
                ...(activeCategory === category.key && {
                  color: '#ffffff',
                }),
              }}
              onClick={() => handleCategoryClick(category.key)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* CSS da animação */}
      <style jsx>{`
        @keyframes scroll-infinite {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
