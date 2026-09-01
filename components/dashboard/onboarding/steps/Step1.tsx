// components/dashboard/onboarding/steps/Step1.tsx
'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import type { StepProps } from './types';

const SUGGESTIONS = ['Alexa', 'Gerente', 'Assistente', 'Robô', 'Minha IA', 'Max'];

export function Step1({ state, update, onNext, onBack }: StepProps) {
  const [touched, setTouched] = useState(false);
  const value   = state.assistantName;
  const isEmpty = !value.trim();
  const isError = touched && isEmpty;

  function handleNext() {
    setTouched(true);
    if (isEmpty) return;
    onNext();
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <Bot size={22} className="text-blue-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Como vai se chamar seu assistente?
        </h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-7 leading-relaxed">
        Esse é o nome com que ele se apresentará para seus clientes. Pode ser qualquer nome — use o nome da empresa, um nome próprio, ou algo criativo.
      </p>

      <input
        type="text"
        autoFocus
        value={value}
        maxLength={40}
        placeholder="Ex: Sofia, Atendente Virtual, Assistente da Empresa..."
        onChange={e => update({ assistantName: e.target.value })}
        onKeyDown={e => { if (e.key === 'Enter') handleNext(); }}
        onBlur={() => setTouched(true)}
        className={`w-full px-4 py-3.5 text-base rounded-xl border-2 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 transition-colors focus:border-blue-500 ${
          isError ? 'border-red-400' : 'border-gray-200 dark:border-white/10'
        }`}
      />

      {isError && (
        <p className="text-sm text-red-500 mt-1.5">Escolha um nome para o assistente antes de continuar.</p>
      )}

      <div className="mt-4 mb-8">
        <p className="text-xs text-gray-400 dark:text-white/30 mb-2">Sugestões:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => update({ assistantName: s })}
              className={`px-4 py-1.5 rounded-full border text-sm transition-all ${
                value === s
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={handleNext} disableNext={false} />
    </div>
  );
}

// ── NavButtons — exportado e usado por todos os Steps ────────

export function NavButtons({
  onBack, onNext, disableNext, nextLabel = 'Continuar →',
}: {
  onBack: () => void;
  onNext: () => void;
  disableNext: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex-shrink-0 px-5 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition"
      >
        ← Voltar
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext}
        className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
          disableNext
            ? 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-white/30 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:opacity-90'
        }`}
      >
        {nextLabel}
      </button>
    </div>
  );
}
