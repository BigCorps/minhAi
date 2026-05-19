// components/dashboard/onboarding/steps/Step2.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Loader2, CheckCircle2,
  UtensilsCrossed, HeartPulse, ShoppingBag, Briefcase, Dumbbell, GraduationCap,
  Stethoscope, Scale, Scissors, Building2, Car, Hotel, Landmark, HardHat,
  Truck, Shirt, Pill, Baby, Paw, Cpu, Home, Wrench, Settings2,
} from 'lucide-react';
import { NavButtons } from './Step1';
import type { StepProps } from './types';

// ── Segmentos principais (ícones Lucide) ──────────────────────
const MAIN_SEGMENTS = [
  { segment_key: 'clinica',      label: 'Clínicas & Saúde',      icon: HeartPulse,       description: 'Clínicas, consultórios, psicólogos, fisioterapeutas' },
  { segment_key: 'restaurante',  label: 'Restaurantes',           icon: UtensilsCrossed,  description: 'Restaurantes, lanchonetes, food trucks, bares' },
  { segment_key: 'servicos',     label: 'Advocacia',              icon: Scale,            description: 'Escritórios de advocacia, jurídico' },
  { segment_key: 'estetica',     label: 'Beleza & Estética',      icon: Scissors,         description: 'Salões, barbearias, spas, estética' },
  { segment_key: 'academia',     label: 'Academias',              icon: Dumbbell,         description: 'Academias, pilates, crossfit, personal trainer' },
  { segment_key: 'franquia',     label: 'Franquias',              icon: Building2,        description: 'Redes de franquias e multiunidades' },
  { segment_key: 'ecommerce',    label: 'E-commerce',             icon: ShoppingBag,      description: 'Lojas online, marketplace, dropshipping' },
  { segment_key: 'construcao',   label: 'Construção',             icon: HardHat,          description: 'Construtoras, empreiteiras, reformas' },
  { segment_key: 'concessionaria', label: 'Concessionárias',      icon: Car,              description: 'Concessionárias de veículos, locadoras' },
  { segment_key: 'educacao',     label: 'Educação',               icon: GraduationCap,    description: 'Escolas, cursos, reforço escolar, faculdades' },
  { segment_key: 'hotelaria',    label: 'Hotelaria',              icon: Hotel,            description: 'Hotéis, pousadas, hostels, resorts' },
  { segment_key: 'financeiro',   label: 'Financeiro',             icon: Landmark,         description: 'Bancos, corretoras, contabilidade, fintech' },
] as const;

// ── Segmentos extras (emojis, conforme solicitado) ────────────
const EXTRA_SEGMENTS = [
  { segment_key: 'medico',       label: 'Médicos & Consultórios', emoji: '🩺' },
  { segment_key: 'loja',         label: 'Lojas & Varejo',         emoji: '🛍️' },
  { segment_key: 'farmacia',     label: 'Farmácias',              emoji: '💊' },
  { segment_key: 'pet',          label: 'Pet Shop & Vet',         emoji: '🐾' },
  { segment_key: 'infantil',     label: 'Infantil & Bebês',       emoji: '👶' },
  { segment_key: 'moda',         label: 'Moda & Vestuário',       emoji: '👗' },
  { segment_key: 'logistica',    label: 'Logística & Frete',      emoji: '🚚' },
  { segment_key: 'tech',         label: 'Tecnologia & TI',        emoji: '💻' },
  { segment_key: 'imoveis',      label: 'Imóveis',                emoji: '🏠' },
  { segment_key: 'manutencao',   label: 'Manutenção & Serviços',  emoji: '🔧' },
  { segment_key: 'outro',        label: 'Outro segmento',         emoji: '⚙️' },
] as const;

type MainSeg  = typeof MAIN_SEGMENTS[number];
type ExtraSeg = typeof EXTRA_SEGMENTS[number];
type AnySeg   = { segment_key: string; label: string; description?: string };

export function Step2({ state, update, onNext, onBack }: StepProps) {
  const [dbSegments, setDbSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function fetchSegments() {
      try {
        const { createClient } = await import('@/lib/supabase-browser');
        const supabase = createClient();
        const { data } = await supabase
          .from('assistant_segments')
          .select('segment_key, label, emoji, description')
          .eq('is_active', true)
          .order('sort_order');
        setDbSegments(data ?? []);
      } catch {
        // silently fall back to hardcoded list
      } finally {
        setLoading(false);
      }
    }
    fetchSegments();
  }, []);

  function selectMain(seg: MainSeg) {
    update({ segmentKey: seg.segment_key, segmentLabel: seg.label, segmentEmoji: '' });
  }

  function selectExtra(seg: ExtraSeg) {
    update({ segmentKey: seg.segment_key, segmentLabel: seg.label, segmentEmoji: seg.emoji });
  }

  const selectedMain  = MAIN_SEGMENTS.find(s => s.segment_key === state.segmentKey);
  const selectedExtra = EXTRA_SEGMENTS.find(s => s.segment_key === state.segmentKey);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        O que melhor descreve seu negócio?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-7 leading-relaxed">
        Isso nos ajuda a pré-configurar as funções mais úteis para você automaticamente. Você pode ativar ou desativar qualquer função depois.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* ── Grid principal ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {MAIN_SEGMENTS.map(seg => {
              const Icon = seg.icon;
              const isSelected = state.segmentKey === seg.segment_key;
              return (
                <button
                  key={seg.segment_key}
                  type="button"
                  onClick={() => selectMain(seg)}
                  title={seg.description}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                >
                  <Icon
                    size={18}
                    className={`flex-shrink-0 ${isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-white/30'}`}
                  />
                  <span className={`text-[13px] font-medium leading-tight ${
                    isSelected ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {seg.label}
                  </span>
                  {isSelected && (
                    <CheckCircle2 size={14} className="ml-auto flex-shrink-0 text-blue-500 dark:text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Divisor + segmentos extras (emojis) ── */}
          <div className="border-t border-gray-100 dark:border-white/10 pt-4 mb-5">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3">
              Outros segmentos
            </p>
            <div className="flex flex-wrap gap-2">
              {EXTRA_SEGMENTS.map(seg => {
                const isSelected = state.segmentKey === seg.segment_key;
                return (
                  <button
                    key={seg.segment_key}
                    type="button"
                    onClick={() => selectExtra(seg)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    <span>{seg.emoji}</span>
                    {seg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Confirmação */}
      {state.segmentKey && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm text-blue-700 dark:text-blue-300 mb-6">
          <CheckCircle2 size={15} className="flex-shrink-0" />
          <span>
            {state.segmentEmoji && <span className="mr-1">{state.segmentEmoji}</span>}
            <strong>{state.segmentLabel}</strong> selecionado — funções relevantes serão ativadas automaticamente.
          </span>
        </div>
      )}

      <NavButtons onBack={onBack} onNext={() => { if (state.segmentKey) onNext(); }} disableNext={!state.segmentKey} />
    </div>
  );
}
