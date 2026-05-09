'use client';

import { useState, useEffect } from 'react';
import CategoryCarousel from '@/components/assistant/CategoryCarousel';

// Funções fixas da versão Vendas — mesma lista do VendasConfigPanel
const VENDAS_FUNCTION_KEYS = [
  'modo_venda',
  'ver_produtos',
  'fazer_pedido',
  'registrar_venda',
  'cardapio',
  'minha_conta',
  'cadastrar_produto',
  'pix_generate',
  'nfc_debito',
  'nfc_credito',
  'link_pagamento',
  'tef_debito',
  'tef_credito',
  'agendar_compromisso',
  'ver_agenda',
  'chatgpt',
  'nossa_marca',
  'meu_sistema',
];

interface CategoryCarouselWrapperProps {
  companyId: string;
  hideDisabledFunctions?: boolean;
  autoScroll?: boolean;
  onFunctionClick?: (functionKey: string) => void;
  theme?: 'dark' | 'light';
  isVendas?: boolean;
}

export default function CategoryCarouselWrapper({
  companyId,
  hideDisabledFunctions = false,
  autoScroll = true,
  onFunctionClick,
  theme = 'dark',
  isVendas = false,
}: CategoryCarouselWrapperProps) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleKeyboardOpen  = () => setIsKeyboardOpen(true);
    const handleKeyboardClose = () => setIsKeyboardOpen(false);
    window.addEventListener('eai:virtualKeyboardOpen',  handleKeyboardOpen);
    window.addEventListener('eai:virtualKeyboardClose', handleKeyboardClose);
    return () => {
      window.removeEventListener('eai:virtualKeyboardOpen',  handleKeyboardOpen);
      window.removeEventListener('eai:virtualKeyboardClose', handleKeyboardClose);
    };
  }, []);

  if (isKeyboardOpen) return null;

  if (isVendas) {
    return (
      <VendasFunctionCarousel
        companyId={companyId}
        onFunctionClick={onFunctionClick}
        theme={theme}
        autoScroll={autoScroll}
        hideDisabledFunctions={hideDisabledFunctions}
      />
    );
  }

  return (
    <CategoryCarousel
      companyId={companyId}
      hideDisabledFunctions={hideDisabledFunctions}
      autoScroll={autoScroll}
      onFunctionClick={onFunctionClick}
      theme={theme}
    />
  );
}

// ── Carrossel flat para versão Vendas ─────────────────────────────────────────

import { createClient } from '@/lib/supabase-browser';
import { useCallback, useRef } from 'react';

interface VendasFunction {
  function_key: string;
  function_name: string;
  color: string;
  is_enabled: boolean;
}

function VendasFunctionCarousel({
  companyId,
  onFunctionClick,
  theme = 'dark',
  autoScroll = true,
  hideDisabledFunctions = false,
}: {
  companyId: string;
  onFunctionClick?: (key: string) => void;
  theme?: 'dark' | 'light';
  autoScroll?: boolean;
  hideDisabledFunctions?: boolean;
}) {
  const supabase = createClient();
  const [functions, setFunctions] = useState<VendasFunction[]>([]);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: fns } = await supabase
        .from('assistant_functions')
        .select('function_key, function_name, color')
        .in('function_key', VENDAS_FUNCTION_KEYS)
        .eq('is_active', true);

      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('function_key, is_enabled')
        .eq('company_id', companyId)
        .in('function_key', VENDAS_FUNCTION_KEYS);

      const settingsMap = new Map(
        (settings || []).map(s => [s.function_key, s.is_enabled])
      );

      const ordered = VENDAS_FUNCTION_KEYS
        .map(key => {
          const fn = (fns || []).find(f => f.function_key === key);
          if (!fn) return null;
          return {
            ...fn,
            is_enabled: settingsMap.get(key) ?? false,
          };
        })
        .filter(Boolean) as VendasFunction[];

      setFunctions(ordered);
    }
    load();
  }, [companyId]);

  // Filtrar funções desativadas se hideDisabledFunctions estiver ativo
  const visibleFunctions = hideDisabledFunctions
    ? functions.filter(fn => fn.is_enabled)
    : functions;

  const scrollDuration = Math.max(8, Math.min(60, visibleFunctions.length * (isMobile ? 3.5 : 2.5)));
  const duplicated = autoScroll ? [...visibleFunctions, ...visibleFunctions] : visibleFunctions;

  const pauseAnimation = useCallback(() => {
    if (carouselRef.current && autoScroll) {
      carouselRef.current.style.animationPlayState = 'paused';
    }
  }, [autoScroll]);

  const resumeAnimation = useCallback(() => {
    if (carouselRef.current && autoScroll) {
      carouselRef.current.style.animationPlayState = 'running';
    }
  }, [autoScroll]);

  // Verde limão no lugar do laranja
  const colors = ['#84cc16', '#65a30d'];

  if (visibleFunctions.length === 0) return null;

  return (
    <div className="w-full py-4 overflow-x-auto md:overflow-hidden no-scrollbar">
      <div
        onMouseEnter={pauseAnimation}
        onMouseLeave={resumeAnimation}
        onTouchStart={(e) => { e.stopPropagation(); pauseAnimation(); }}
        onTouchEnd={(e) => { e.stopPropagation(); resumeAnimation(); }}
        onTouchCancel={(e) => { e.stopPropagation(); resumeAnimation(); }}
      >
        <div
          ref={carouselRef}
          className={autoScroll ? 'flex gap-3 pl-3 w-max' : 'flex gap-3 flex-wrap justify-center w-full px-4'}
          style={autoScroll ? {
            animation: `scroll-infinite ${scrollDuration}s linear infinite`,
            willChange: 'transform',
          } : undefined}
        >
          {duplicated.map((fn, index) => {
            const borderColor = colors[index % 2];
            const isEnabled = fn.is_enabled;
            const isHovered = hoveredKey === fn.function_key;

            return (
              <button
                key={`${fn.function_key}-${index}`}
                disabled={!isEnabled}
                onClick={() => isEnabled && onFunctionClick?.(fn.function_key)}
                onMouseEnter={() => setHoveredKey(fn.function_key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`flex-shrink-0 px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 hover:scale-105 active:scale-95 ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-white hover:bg-gray-50 text-gray-900'
                } ${!isEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{
                  borderLeft: `4px solid ${borderColor}`,
                  boxShadow: isDark
                    ? '0 2px 4px rgba(0,0,0,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.05)',
                  ...(isHovered && isEnabled && {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.05)',
                  }),
                }}
              >
                <span className="text-sm font-semibold whitespace-nowrap">{fn.function_name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-infinite {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
