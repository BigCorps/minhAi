// components/dashboard/onboarding/steps/Step6.tsx
// Revisão final antes de criar. Mostra resumo + preview do prompt gerado.
// Botão "Criar Assistente" chama handleCreate no orquestrador.

'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { OnboardingState } from '../AssistantOnboarding';

interface Step6Props {
  state:      OnboardingState;
  onBack:     () => void;
  onCreate:   () => void;
  isCreating: boolean;
}

const TONE_LABELS = {
  formal:       'Formal e Profissional',
  amigavel:     'Amigável e Acolhedor',
  descontraido: 'Descontraído e Divertido',
};

export function Step6({ state, onBack, onCreate, isCreating }: Step6Props) {
  const [fnCount, setFnCount] = useState<number | null>(null);

  // Busca contagem de funções do segmento para exibir no card
  useEffect(() => {
    if (!state.segmentKey) return;
    fetch(`/api/assistant/segment-functions?segment=${state.segmentKey}&type=${state.assistantType}`)
      .then(r => r.json())
      .then(d => setFnCount(d.count ?? 0))
      .catch(() => setFnCount(null));
  }, [state.segmentKey, state.assistantType]);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        Tudo pronto! Revise antes de criar. 🎉
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28 }}>
        Confirme as informações abaixo. Você poderá editar tudo depois no dashboard.
      </p>

      {/* Cards de revisão */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>

        <ReviewCard
          icon={state.assistantType === 'vendas' ? '🛒' : '✨'}
          label="Tipo"
          value={state.assistantType === 'vendas' ? 'minhAi Vendas' : 'minhAi Smart'}
        />
        <ReviewCard icon="🤖" label="Nome do assistente" value={state.assistantName} />
        <ReviewCard
          icon={state.segmentEmoji || '🏢'}
          label="Segmento"
          value={state.segmentLabel}
        />
        <ReviewCard icon="🏢" label="Empresa" value={state.step3.company_name} />
        {state.step3.what_offers && (
          <ReviewCard icon="📦" label="O que oferece" value={state.step3.what_offers} />
        )}
        {state.step3.location && (
          <ReviewCard icon="📍" label="Localização" value={state.step3.location} />
        )}
        {state.step3.hours && (
          <ReviewCard icon="🕐" label="Horários" value={state.step3.hours} />
        )}
        <ReviewCard
          icon="😊"
          label="Tom de voz"
          value={TONE_LABELS[state.step4.tone]}
        />
        <ReviewCard
          icon="⚡"
          label="Funções configuradas"
          value={
            fnCount !== null
              ? `${fnCount} funções ativadas automaticamente para ${state.segmentLabel}`
              : 'Carregando...'
          }
          highlight
        />

      </div>

      {/* Preview do prompt gerado */}
      {state.generatedPrompt && (
        <div style={{
          padding: '14px 16px', background: '#f8fafc',
          border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 24,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
          }}>
            Como seu assistente vai se apresentar
          </p>
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: 0 }}>
            {state.generatedPrompt.length > 220
              ? `${state.generatedPrompt.slice(0, 220)}...`
              : state.generatedPrompt}
          </p>
        </div>
      )}

      {/* Botões */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          disabled={isCreating}
          style={{
            flex: '0 0 auto', padding: '12px 20px',
            border: '1px solid #e2e8f0', borderRadius: 10,
            background: '#f8fafc', color: '#64748b',
            fontSize: 14, cursor: isCreating ? 'not-allowed' : 'pointer',
            fontWeight: 500, opacity: isCreating ? 0.5 : 1,
          }}
        >
          ← Voltar
        </button>

        <button
          type="button"
          onClick={onCreate}
          disabled={isCreating}
          style={{
            flex: 1, padding: '14px',
            background: isCreating
              ? '#e2e8f0'
              : state.assistantType === 'vendas'
                ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
                : 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: isCreating ? '#94a3b8' : 'white',
            border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700,
            cursor: isCreating ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {isCreating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Criando assistente...
            </>
          ) : (
            '🚀 Criar Assistente'
          )}
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16, textAlign: 'center' }}>
        Após criar, você poderá configurar funções individuais, alterar o visual e testar o assistente.
      </p>
    </div>
  );
}

// ── Card de revisão ──────────────────────────────────────────

function ReviewCard({
  icon, label, value, highlight = false,
}: {
  icon:       string;
  label:      string;
  value:      string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px', borderRadius: 10,
      background: highlight ? '#f0fdf4' : '#f8fafc',
      border: `1px solid ${highlight ? '#bbf7d0' : '#e2e8f0'}`,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </p>
        <p style={{ fontSize: 14, color: highlight ? '#166534' : '#1e293b', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
          {value}
        </p>
      </div>
    </div>
  );
}
