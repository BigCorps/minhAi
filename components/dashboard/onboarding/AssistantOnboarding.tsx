// components/dashboard/onboarding/AssistantOnboarding.tsx
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

export type AssistantType = 'smart' | 'vendas';
export type Tone = 'formal' | 'amigavel' | 'descontraido';

export interface Step3Data {
  company_name: string;
  what_offers:  string;
  location:     string;
  hours:        string;
  extra_info:   string;
}

export interface Step4Data { tone: Tone; }

export interface Step5Data {
  no_competitor_info: boolean;
  no_prices:          boolean;
  no_personal_data:   boolean;
  custom_rule:        string;
}

export interface OnboardingState {
  assistantType:   AssistantType;
  assistantName:   string;
  segmentKey:      string;
  segmentLabel:    string;
  segmentEmoji:    string;
  step3:           Step3Data;
  step4:           Step4Data;
  step5:           Step5Data;
  generatedPrompt: string;
  createdSlug:     string;
  createdId:       string;
}

const INITIAL_STATE: OnboardingState = {
  assistantType:   'smart',
  assistantName:   '',
  segmentKey:      '',
  segmentLabel:    '',
  segmentEmoji:    '',
  step3: { company_name: '', what_offers: '', location: '', hours: '', extra_info: '' },
  step4: { tone: 'amigavel' },
  step5: { no_competitor_info: false, no_prices: false, no_personal_data: false, custom_rule: '' },
  generatedPrompt: '',
  createdSlug:     '',
  createdId:       '',
};

const TOTAL_STEPS = 7;
const STEP_LABELS = ['Tipo', 'Nome', 'Segmento', 'Empresa', 'Tom de voz', 'Regras', 'Revisão'];

export function AssistantOnboarding() {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [state, setState]         = useState<OnboardingState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const next = useCallback(async () => {
    setError(null);
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
            step3: state.step3,
            step4: state.step4,
            step5: state.step5,
          }),
        });
        const data = await res.json();
        if (data.prompt) update({ generatedPrompt: data.prompt });
      } catch (err) {
        console.warn('generate-prompt falhou:', err);
      } finally {
        setIsLoading(false);
      }
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  }, [step, state, update]);

  const back = useCallback(() => {
    setError(null);
    setStep(s => Math.max(s - 1, 0));
  }, []);

  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const slugBase = state.step3.company_name || state.assistantName;
      const res = await fetch('/api/assistant/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantName: state.assistantName,
          assistantType: state.assistantType,
          segmentKey:    state.segmentKey,
          step3:         state.step3,
          systemPrompt:  state.generatedPrompt,
          slug: slugBase.toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '').slice(0, 60),
          is_public: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erro ao criar assistente. Tente novamente.');
        return;
      }
      update({ createdSlug: data.slug, createdId: data.id });
      setStep(TOTAL_STEPS);
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [state, update]);

  const goToDashboard = useCallback(() => {
    router.push(`/dashboard/assistentes?novo=${state.createdSlug}`);
    router.refresh();
  }, [router, state.createdSlug]);

  const sharedProps = { state, update, onNext: next, onBack: back };

  if (step >= TOTAL_STEPS) {
    return <ConclusionScreen slug={state.createdSlug} assistantName={state.assistantName} onGo={goToDashboard} />;
  }

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden relative">

        {/* Barra de progresso */}
        <div className="px-8 pt-5 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5">
          <div className="flex justify-between mb-2">
            {STEP_LABELS.map((label, i) => (
              <span key={i} className={`text-[10px] text-center flex-1 transition-colors ${
                i < step  ? 'text-green-500 font-semibold' :
                i === step ? 'text-blue-500 dark:text-blue-400 font-bold' :
                             'text-gray-400 dark:text-white/25'
              }`}>
                {label}
              </span>
            ))}
          </div>
          <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full mb-5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-8 py-8">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {step === 0 && <Step0 {...sharedProps} />}
          {step === 1 && <Step1 {...sharedProps} />}
          {step === 2 && <Step2 {...sharedProps} />}
          {step === 3 && <Step3 {...sharedProps} />}
          {step === 4 && <Step4 {...sharedProps} />}
          {step === 5 && <Step5 {...sharedProps} />}
          {step === 6 && <Step6 state={state} onBack={back} onCreate={handleCreate} isCreating={isLoading} />}
        </div>

        {/* Spinner overlay (transição 5→6) */}
        {isLoading && step < 6 && (
          <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Preparando sua revisão...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConclusionScreen({ slug, assistantName, onGo }: { slug: string; assistantName: string; onGo: () => void }) {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 px-8 py-12 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {assistantName} está pronto!
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Seu assistente foi criado com sucesso e já está configurado para começar a atender.
        </p>
        <div className="px-5 py-3 bg-gray-100 dark:bg-white/5 rounded-lg mb-8 text-sm text-gray-600 dark:text-gray-400 font-mono">
          minhai.app/ia/{slug}
        </div>
        <button
          onClick={onGo}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-base font-bold hover:opacity-90 transition"
        >
          Ir para o Dashboard →
        </button>
        <p className="text-xs text-gray-400 dark:text-white/30 mt-4">
          Você pode configurar mais funções, editar o comportamento e personalizar o visual a qualquer momento.
        </p>
      </div>
    </div>
  );
}
