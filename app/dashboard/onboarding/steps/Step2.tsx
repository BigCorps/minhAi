// components/dashboard/onboarding/steps/Step2.tsx
// Seleção do segmento de negócio — grid de cards com emoji.
// Busca os segmentos da API (tabela assistant_segments).

'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { NavButtons } from './Step1';
import type { StepProps } from './types';

interface Segment {
  segment_key:  string;
  label:        string;
  emoji:        string;
  description:  string;
}

export function Step2({ state, update, onNext, onBack }: StepProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function fetchSegments() {
      try {
        // Lê direto da tabela via Supabase client-side
        const { createClient } = await import('@/lib/supabase-browser');
        const supabase = createClient();
        const { data } = await supabase
          .from('assistant_segments')
          .select('segment_key, label, emoji, description')
          .eq('is_active', true)
          .order('sort_order');
        setSegments(data ?? []);
      } catch {
        // Fallback hardcoded se a query falhar
        setSegments([
          { segment_key: 'restaurante', label: 'Restaurante / Food',   emoji: '🍽️', description: 'Restaurantes, lanchonetes, food trucks, bares' },
          { segment_key: 'clinica',     label: 'Clínica / Saúde',      emoji: '🏥', description: 'Clínicas, consultórios, psicólogos, fisioterapeutas' },
          { segment_key: 'loja',        label: 'Loja / Varejo',         emoji: '🛍️', description: 'Lojas físicas, farmácias, pet shops, papelarias' },
          { segment_key: 'servicos',    label: 'Serviços / Escritório', emoji: '💼', description: 'Advocacia, contabilidade, imobiliárias, consultorias' },
          { segment_key: 'academia',    label: 'Academia / Bem-estar',  emoji: '💪', description: 'Academias, pilates, salões, barbearias, spas' },
          { segment_key: 'educacao',    label: 'Escola / Educação',     emoji: '📚', description: 'Escolas, cursos, reforço escolar, faculdades' },
          { segment_key: 'outro',       label: 'Outro',                  emoji: '⚙️', description: 'Qualquer outro tipo de negócio' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchSegments();
  }, []);

  function select(seg: Segment) {
    update({
      segmentKey:   seg.segment_key,
      segmentLabel: seg.label,
      segmentEmoji: seg.emoji,
    });
  }

  function handleNext() {
    if (!state.segmentKey) return;
    onNext();
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        O que melhor descreve seu negócio?
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
        Isso nos ajuda a pré-configurar as funções mais úteis para você automaticamente. Não se preocupe — você pode ativar ou desativar qualquer função depois.
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Loader2 size={28} className="animate-spin" color="#3b82f6" />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 32,
        }}>
          {segments.map(seg => {
            const isSelected = state.segmentKey === seg.segment_key;
            return (
              <button
                key={seg.segment_key}
                type="button"
                onClick={() => select(seg)}
                title={seg.description}
                style={{
                  padding: '18px 12px',
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                  background: isSelected ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 30 }}>{seg.emoji}</span>
                <span style={{
                  fontSize: 12, fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#2563eb' : '#1e293b',
                  textAlign: 'center', lineHeight: 1.3,
                }}>
                  {seg.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {state.segmentKey && (
        <div style={{
          padding: '10px 14px', background: '#eff6ff',
          border: '1px solid #bfdbfe', borderRadius: 8,
          fontSize: 13, color: '#1d4ed8', marginBottom: 24,
        }}>
          ✅ {state.segmentEmoji} <strong>{state.segmentLabel}</strong> selecionado —
          funções relevantes serão ativadas automaticamente.
        </div>
      )}

      <NavButtons
        onBack={onBack}
        onNext={handleNext}
        disableNext={!state.segmentKey}
      />
    </div>
  );
}
