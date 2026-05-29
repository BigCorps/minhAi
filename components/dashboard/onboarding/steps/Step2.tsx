// components/dashboard/onboarding/steps/Step2.tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { NavButtons } from './Step1';
import type { StepProps } from './types';

interface DbSegment {
  segment_key: string;
  label:       string;
  description: string | null;
}

export function Step2({ state, update, onNext, onBack }: StepProps) {
  const [segments, setSegments] = useState<DbSegment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState(false);

  useEffect(() => {
    async function fetchSegments() {
      try {
        const { createClient } = await import('@/lib/supabase-browser');
        const supabase = createClient();
        const { data, error } = await supabase
          .from('assistant_segments')
          .select('segment_key, label, description')
          .eq('is_active', true)
          .order('sort_order');

        if (error) throw error;
        setSegments(data ?? []);
      } catch {
        setFetchErr(true);
      } finally {
        setLoading(false);
      }
    }
    fetchSegments();
  }, []);

  function select(seg: DbSegment) {
    update({
      segmentKey:   seg.segment_key,
      segmentLabel: seg.label,
      segmentEmoji: '',
    });
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        O que melhor descreve seu negócio?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-7 leading-relaxed">
        Isso nos ajuda a pré-configurar as funções mais úteis para você automaticamente.
        Você pode ativar ou desativar qualquer função depois.
      </p>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      )}

      {fetchErr && !loading && (
        <p className="text-sm text-red-500 dark:text-red-400 text-center py-6">
          Não foi possível carregar os segmentos. Recarregue a página.
        </p>
      )}

      {!loading && !fetchErr && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {segments.map(seg => {
            const isSelected = state.segmentKey === seg.segment_key;
            return (
              <button
                key={seg.segment_key}
                type="button"
                onClick={() => select(seg)}
                title={seg.description ?? seg.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20'
                }`}
              >
                <span className={`text-[13px] font-medium leading-tight flex-1 ${
                  isSelected
                    ? 'text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {seg.label}
                </span>
                {isSelected && (
                  <CheckCircle2
                    size={14}
                    className="flex-shrink-0 text-blue-500 dark:text-blue-400"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {state.segmentKey && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl text-sm text-blue-700 dark:text-blue-300 mb-6">
          <CheckCircle2 size={15} className="flex-shrink-0" />
          <span>
            <strong>{state.segmentLabel}</strong> selecionado — funções relevantes serão
            ativadas automaticamente.
          </span>
        </div>
      )}

      <NavButtons
        onBack={onBack}
        onNext={() => { if (state.segmentKey) onNext(); }}
        disableNext={!state.segmentKey}
      />
    </div>
  );
}
