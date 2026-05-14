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

// Categorias do minhAi Smart para o carrossel showcase
const SMART_CATEGORIES = [
  { key: 'ai_assistant',  name: 'Conhecimento' },
  { key: 'products',      name: 'Comercial' },
  { key: 'payment',       name: 'Financeiro' },
  { key: 'information',   name: 'Informação' },
  { key: 'video',         name: 'Multimídia' },
  { key: 'schedule',      name: 'Agendamento' },
  { key: 'contact',       name: 'Contato' },
  { key: 'configuration', name: 'Localização' },
  { key: 'knowledge',     name: 'Consultas' },
  { key: 'biometry',      name: 'Identificação' },
  { key: 'images',        name: 'Arquivos' },
  { key: 'utylities',     name: 'Utilitários' },
  { key: 'codes',         name: 'Câmera' },
  { key: 'services',      name: 'Serviços' },
];

function calcSmartScrollDuration(isMobile: boolean): number {
  const perItem = isMobile ? 3.5 : 2.5;
  return Math.max(8, Math.min(60, SMART_CATEGORIES.length * perItem));
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
  const [showToast, setShowToast] = useState(false);
  const [smartFunctions, setSmartFunctions] = useState<Record<string, {function_key: string; function_name: string; short_description?: string}[]>>({});
  const [activeShowcaseCategory, setActiveShowcaseCategory] = useState<string | null>(null);
  const [showcasePanelPos, setShowcasePanelPos] = useState<{left: number; bottom: number} | null>(null);
  const showcaseChipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const showcasePanelRef = useRef<HTMLDivElement>(null);
  const [allSmartFunctions, setAllSmartFunctions] = useState<VendasFunction[]>([]);
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
    if (!activeShowcaseCategory) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const outsidePanel = showcasePanelRef.current && !showcasePanelRef.current.contains(target);
      const outsideChips = !Array.from(showcaseChipRefs.current.values()).some(el => el.contains(target));
      if (outsidePanel && outsideChips) {
        setActiveShowcaseCategory(null);
        setShowcasePanelPos(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeShowcaseCategory]);

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

// Carrega funções Smart agrupadas por categoria para o showcase
    supabase
      .from('assistant_functions')
      .select('function_key, function_name, short_description, function_category')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        if (!data) return;
        const grouped: Record<string, typeof data> = {};
        data.forEach(fn => {
          if (!grouped[fn.function_category]) grouped[fn.function_category] = [];
          grouped[fn.function_category].push(fn);
        });
        setSmartFunctions(grouped);
      });
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

      {/* Toast de upsell */}
      {showToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-0.5 px-5 py-3 rounded-xl shadow-xl bg-slate-900 dark:bg-slate-800 border border-white/10"
          style={{ animation: 'fadeInUp 0.2s ease-out' }}
        >
          <p className="text-sm font-semibold text-white whitespace-nowrap">
            Função disponível na versão Smart
          </p>
          <p className="text-xs text-white/50">
            saiba mais em minhai.app
          </p>
        </div>
      )}

{/* Painel flutuante do showcase */}
      {activeShowcaseCategory && showcasePanelPos && (
        <div
          ref={showcasePanelRef}
          className="z-[100]"
          style={{
            position: 'fixed',
            left: `${showcasePanelPos.left}px`,
            bottom: `${showcasePanelPos.bottom}px`,
          }}
        >
          <div
            className="rounded-2xl border-2 backdrop-blur-xl overflow-hidden"
            style={{
              width: '280px',
              maxHeight: '350px',
              background: isDark
                ? 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(51,65,85,0.98))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
              borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
              boxShadow: isDark
                ? '0 -10px 40px rgba(0,0,0,0.5)'
                : '0 -10px 40px rgba(0,0,0,0.15)',
            }}
          >
            <div
              className="px-3 py-1.5 font-semibold border-b text-xs"
              style={{
                borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
                color: isDark ? 'rgb(226,232,240)' : 'rgb(30,41,59)',
              }}
            >
              {SMART_CATEGORIES.find(c => c.key === activeShowcaseCategory)?.name}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
              {(smartFunctions[activeShowcaseCategory] ?? []).map(fn => (
                <div
                  key={fn.function_key}
                  className="px-3 py-1.5 border-b border-white/5 cursor-pointer transition-all"
                  style={{
                    background: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(241,245,249,0.8)',
                    color: isDark ? 'rgb(226,232,240)' : 'rgb(30,41,59)',
                  }}
                  onClick={() => {
                    setActiveShowcaseCategory(null);
                    setShowcasePanelPos(null);
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2500);
                  }}
                >
                  <span className="font-medium text-[11px] leading-tight block">
                    {fn.function_name}
                  </span>
                  {fn.short_description && (
                    <span className="text-[9px] leading-tight opacity-60 block mt-0.5">
                      {fn.short_description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Carrossel showcase — categorias Smart, semi-opaco */}
      <div className="w-full overflow-hidden mt-1 no-scrollbar" style={{ opacity: 0.45 }}>
        <div
          className="flex gap-3 pl-3 w-max"
          style={{
            animation: `scroll-infinite ${calcSmartScrollDuration(isMobile)}s linear infinite`,
            willChange: 'transform',
          }}
        >
          {[...SMART_CATEGORIES, ...SMART_CATEGORIES].map((cat, index) => {
            const borderColor = index % 2 === 0 ? '#3B82F6' : '#10B981';
            return (
              <button
                key={`showcase-${cat.key}-${index}`}
                ref={el => {
                  if (el && index < SMART_CATEGORIES.length) {
                    showcaseChipRefs.current.set(cat.key, el);
                  }
                }}
                onClick={(e) => {
                  const chip = showcaseChipRefs.current.get(cat.key);
                  const rect = chip?.getBoundingClientRect();
                  if (!rect) return;
                  const panelWidth = 280;
                  const vw = window.innerWidth;
                  let left = rect.left + rect.width / 2 - panelWidth / 2;
                  if (left < 10) left = 10;
                  if (left + panelWidth > vw - 10) left = vw - panelWidth - 10;
                  if (activeShowcaseCategory === cat.key) {
                    setActiveShowcaseCategory(null);
                    setShowcasePanelPos(null);
                  } else {
                    setActiveShowcaseCategory(cat.key);
                    setShowcasePanelPos({ left, bottom: window.innerHeight - rect.top + 8 });
                  }
                }}
                className={`flex-shrink-0 px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  isDark ? 'bg-white/10 text-white' : 'bg-white text-gray-900'
                }`}
                style={{
                  borderLeft: `4px solid ${borderColor}`,
                  boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <span className="text-sm font-semibold whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
