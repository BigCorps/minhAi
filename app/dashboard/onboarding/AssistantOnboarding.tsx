// components/dashboard/onboarding/AssistantOnboarding.tsx
// Orquestrador principal do fluxo de criação de assistente.
// Gerencia estado global, navegação entre etapas e chamadas às APIs.

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Step0 } from './steps/Step0';
import { Step1 } from './steps/Step1';
import { Step2 } from './steps/Step2';
import { Step3 } from './steps/Step3';
import { Step4 } from './steps/Step4';
import { Step5 } from './steps/Step5';
import { Step6 } from './steps/Step6';

// ── Tipos ────────────────────────────────────────────────────

export type AssistantType = 'smart' | 'vendas';
export type Tone = 'formal' | 'amigavel' | 'descontraido';

export interface Step3Data {
  company_name: string;
  what_offers:  string;
  location:     string;
  hours:        string;
  extra_info:   string;
}

export interface Step4Data {
  tone: Tone;
}

export interface Step5Data {
  no_competitor_info: boolean;
  no_prices:          boolean;
  no_personal_data:   boolean;
  custom_rule:        string;
}

export interface OnboardingState {
  // Step 0
  assistantType:  AssistantType;
  // Step 1
  assistantName:  string;
  // Step 2
  segmentKey:     string;
  segmentLabel:   string;
  segmentEmoji:   string;
  // Step 3
  step3:          Step3Data;
  // Step 4
  step4:          Step4Data;
  // Step 5
  step5:          Step5Data;
  // Gerado na transição 5→6
  generatedPrompt: string;
  // Resultado final
  createdSlug:    string;
  createdId:      string;
}

const INITIAL_STATE: OnboardingState = {
  assistantType:   'smart',
  assistantName:   '',
  segmentKey:      '',
  segmentLabel:    '',
  segmentEmoji:    '',
  step3: {
    company_name: '',
    what_offers:  '',
    location:     '',
    hours:        '',
    extra_info:   '',
  },
  step4: { tone: 'amigavel' },
  step5: {
    no_competitor_info: false,
    no_prices:          false,
    no_personal_data:   false,
    custom_rule:        '',
  },
  generatedPrompt: '',
  createdSlug:     '',
  createdId:       '',
};

// Total de etapas visíveis na barra (0 a 6 = 7 etapas)
const TOTAL_STEPS = 7;

// Labels da barra de progresso
const STEP_LABELS = [
  'Tipo',
  'Nome',
  'Segmento',
  'Empresa',
  'Tom de voz',
  'Regras',
  'Revisão',
];

// ── Componente principal ─────────────────────────────────────

export function AssistantOnboarding() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [state, setState]     = useState<OnboardingState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // ── Atualizar estado parcialmente ────────────────────────
  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  // ── Avançar etapa ────────────────────────────────────────
  const next = useCallback(async () => {
    setError(null);

    // Na transição 5 → 6: gerar prompt antes de exibir revisão
    if (step === 5) {
      setIsLoading(true);
      try {
        const res = await fetch('/api/assistant/generate-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantName: state.assistantName,
            segmentKey:    state.segmentKey,
            assistantType: state.assistantType,
            step3:         state.step3,
            step4:         state.step4,
            step5:         state.step5,
          }),
        });
        const data = await res.json();
        if (data.prompt) {
          update({ generatedPrompt: data.prompt });
        }
      } catch (err) {
        // Não bloqueia o avanço — fallback já está no backend
        console.warn('generate-prompt falhou no cliente:', err);
      } finally {
        setIsLoading(false);
      }
    }

    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  }, [step, state, update]);

  // ── Voltar etapa ─────────────────────────────────────────
  const back = useCallback(() => {
    setError(null);
    setStep(s => Math.max(s - 1, 0));
  }, []);

  // ── Criar assistente (Step 6) ────────────────────────────
  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const slugBase = state.step3.company_name || state.assistantName;
      const res = await fetch('/api/assistant/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantName:  state.assistantName,
          assistantType:  state.assistantType,
          segmentKey:     state.segmentKey,
          step3:          state.step3,
          systemPrompt:   state.generatedPrompt,
          slug: slugBase
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60),
          is_public: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erro ao criar assistente. Tente novamente.');
        return;
      }

      update({ createdSlug: data.slug, createdId: data.id });
      setStep(TOTAL_STEPS); // etapa "concluído" (além do range normal)

    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [state, update]);

  // ── Ir para o dashboard após criação ────────────────────
  const goToDashboard = useCallback(() => {
    router.push(`/dashboard/assistentes?novo=${state.createdSlug}`);
    router.refresh();
  }, [router, state.createdSlug]);

  // ── Props compartilhadas para todos os Steps ─────────────
  const sharedProps = { state, update, onNext: next, onBack: back };

  // ── Tela de concluído ────────────────────────────────────
  if (step >= TOTAL_STEPS) {
    return (
      <ConclusionScreen
        slug={state.createdSlug}
        assistantName={state.assistantName}
        onGo={goToDashboard}
      />
    );
  }

  return (
    <div style={{
      maxWidth: 600,
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: 16,
      boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
      overflow: 'hidden',
    }}>

      {/* ── Barra de progresso ── */}
      <ProgressBar current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />

      {/* ── Conteúdo da etapa ── */}
      <div style={{ padding: '32px 32px 24px' }}>

        {error && (
          <div style={{
            marginBottom: 20, padding: '12px 16px',
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, fontSize: 14, color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {step === 0 && <Step0 {...sharedProps} />}
        {step === 1 && <Step1 {...sharedProps} />}
        {step === 2 && <Step2 {...sharedProps} />}
        {step === 3 && <Step3 {...sharedProps} />}
        {step === 4 && <Step4 {...sharedProps} />}
        {step === 5 && <Step5 {...sharedProps} />}
        {step === 6 && (
          <Step6
            state={state}
            onBack={back}
            onCreate={handleCreate}
            isCreating={isLoading}
          />
        )}

        {/* Spinner de geração de prompt (transição 5→6) */}
        {isLoading && step < 6 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 16,
          }}>
            <div style={{ textAlign: 'center' }}>
              <Loader2 size={32} className="animate-spin" color="#3b82f6" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: '#64748b' }}>
                Preparando sua revisão...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Barra de progresso ───────────────────────────────────────

function ProgressBar({
  current, total, labels,
}: { current: number; total: number; labels: string[] }) {
  return (
    <div style={{ padding: '20px 32px 0', background: '#f8fafc' }}>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        {labels.map((label, i) => (
          <span key={i} style={{
            fontSize: 10, fontWeight: i === current ? 700 : 400,
            color: i < current ? '#22c55e' : i === current ? '#3b82f6' : '#94a3b8',
            textAlign: 'center', flex: 1,
          }}>
            {label}
          </span>
        ))}
      </div>
      {/* Barra */}
      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginBottom: 20 }}>
        <div style={{
          height: '100%',
          width: `${(current / (total - 1)) * 100}%`,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

// ── Tela de conclusão ────────────────────────────────────────

function ConclusionScreen({
  slug, assistantName, onGo,
}: { slug: string; assistantName: string; onGo: () => void }) {
  return (
    <div style={{
      maxWidth: 600, margin: '0 auto',
      background: '#ffffff', borderRadius: 16,
      boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
      padding: '48px 32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        {assistantName} está pronto!
      </h2>
      <p style={{ fontSize: 15, color: '#64748b', marginBottom: 24 }}>
        Seu assistente foi criado com sucesso e já está configurado para começar a atender.
      </p>

      <div style={{
        padding: '12px 20px', background: '#f1f5f9',
        borderRadius: 8, marginBottom: 32,
        fontSize: 14, color: '#475569', fontFamily: 'monospace',
      }}>
        minhai.app/ia/{slug}
      </div>

      <button
        onClick={onGo}
        style={{
          width: '100%', padding: '14px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: 'white', border: 'none', borderRadius: 10,
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
        }}
      >
        Ir para o Dashboard →
      </button>

      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
        Você pode configurar mais funções, editar o comportamento e personalizar o visual a qualquer momento.
      </p>
    </div>
  );
}
