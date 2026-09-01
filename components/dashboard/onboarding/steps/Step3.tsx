// components/dashboard/onboarding/steps/Step3.tsx
'use client';

import { useState } from 'react';
import { NavButtons } from './Step1';
import type { StepProps } from './types';
import type { Step3Data } from '../AssistantOnboarding';

const QUESTIONS: {
  key:         keyof Step3Data;
  question:    string;
  placeholder: string;
  required:    boolean;
  hint?:       string;
}[] = [
  { key: 'company_name', question: 'Qual é o nome da sua empresa?',                       placeholder: 'Ex: Pizzaria do João, Clínica Saúde Bem-estar...',                          required: true },
  { key: 'what_offers',  question: 'O que você oferece para seus clientes?',               placeholder: 'Ex: Pizzas artesanais e pratos italianos, atendimento de segunda a sábado...', required: true,  hint: 'Descreva seus produtos, serviços ou o que torna seu negócio especial.' },
  { key: 'location',     question: 'Qual o endereço ou cidade onde você atende?',          placeholder: 'Ex: Rua das Flores, 123 - Centro, São Paulo ou São Paulo - SP',               required: false, hint: 'Pode ser só a cidade se preferir. Pule se não quiser informar.' },
  { key: 'hours',        question: 'Quais são seus horários de funcionamento?',            placeholder: 'Ex: Seg a Sex das 8h às 18h, Sáb das 9h às 13h',                             required: false, hint: 'Pule se não quiser informar agora.' },
  { key: 'extra_info',   question: 'Tem alguma informação importante que o assistente deve sempre saber?', placeholder: 'Ex: Aceitamos delivery, temos estacionamento gratuito...', required: false, hint: 'Qualquer detalhe relevante: diferenciais, formas de pagamento, políticas, etc. Pode pular.' },
];

export function Step3({ state, update, onNext, onBack }: StepProps) {
  const [qIndex, setQIndex]     = useState(0);
  const [touched, setTouched]   = useState(false);
  const [inputValue, setInputValue] = useState(state.step3[QUESTIONS[0].key] ?? '');

  const current = QUESTIONS[qIndex];
  const isLast  = qIndex === QUESTIONS.length - 1;
  const isEmpty = !inputValue.trim();
  const isError = touched && current.required && isEmpty;

  function advanceQuestion() {
    setTouched(true);
    if (current.required && isEmpty) return;
    update({ step3: { ...state.step3, [current.key]: inputValue.trim() } });
    if (isLast) { onNext(); return; }
    const nextQ = QUESTIONS[qIndex + 1];
    setInputValue(state.step3[nextQ.key] ?? '');
    setQIndex(i => i + 1);
    setTouched(false);
  }

  function skip() {
    update({ step3: { ...state.step3, [current.key]: '' } });
    if (isLast) { onNext(); return; }
    const nextQ = QUESTIONS[qIndex + 1];
    setInputValue(state.step3[nextQ.key] ?? '');
    setQIndex(i => i + 1);
    setTouched(false);
  }

  function prevQuestion() {
    if (qIndex === 0) { onBack(); return; }
    const prevQ = QUESTIONS[qIndex - 1];
    setInputValue(state.step3[prevQ.key] ?? '');
    setQIndex(i => i - 1);
    setTouched(false);
  }

  const isTextarea = current.key === 'what_offers' || current.key === 'extra_info';
  const inputClass = `w-full px-4 py-3.5 text-[15px] rounded-xl border-2 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 transition-colors focus:border-blue-500 font-[inherit] leading-relaxed resize-none ${
    isError ? 'border-red-400' : 'border-gray-200 dark:border-white/10'
  }`;

  return (
    <div>
      {/* Mini progress */}
      <div className="flex gap-1.5 mb-7">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < qIndex ? 'bg-green-400' : i === qIndex ? 'bg-blue-500' : 'bg-gray-200 dark:bg-white/10'
            }`}
          />
        ))}
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">{current.question}</h2>
      {current.hint && (
        <p className="text-[13px] text-gray-400 dark:text-white/40 mb-5 leading-relaxed">{current.hint}</p>
      )}

      {isTextarea ? (
        <textarea
          autoFocus rows={3}
          value={inputValue}
          placeholder={current.placeholder}
          onChange={e => setInputValue(e.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          autoFocus type="text"
          value={inputValue}
          placeholder={current.placeholder}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') advanceQuestion(); }}
          className={inputClass}
        />
      )}

      {isError && (
        <p className="text-sm text-red-500 mt-1.5">Esta informação é necessária para configurar seu assistente.</p>
      )}

      <p className="text-xs text-gray-400 dark:text-white/30 mt-2 mb-7">
        Pergunta {qIndex + 1} de {QUESTIONS.length}{!current.required && ' · opcional'}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={prevQuestion}
          className="flex-shrink-0 px-5 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition"
        >
          ← Voltar
        </button>
        {!current.required && (
          <button
            type="button"
            onClick={skip}
            className="flex-shrink-0 px-5 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            Pular
          </button>
        )}
        <button
          type="button"
          onClick={advanceQuestion}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-bold hover:opacity-90 transition"
        >
          {isLast ? 'Continuar →' : 'Próxima →'}
        </button>
      </div>
    </div>
  );
}
