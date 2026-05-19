// components/dashboard/onboarding/steps/Step3.tsx
// Informações da empresa — perguntas conversacionais, uma por vez.
// Sem formulário tradicional — parece uma conversa.

'use client';

import { useState } from 'react';
import { NavButtons } from './Step1';
import type { StepProps } from './types';
import type { Step3Data } from '../AssistantOnboarding';

// Definição das perguntas em ordem
const QUESTIONS: {
  key:         keyof Step3Data;
  question:    string;
  placeholder: string;
  required:    boolean;
  hint?:       string;
}[] = [
  {
    key:         'company_name',
    question:    'Qual é o nome da sua empresa?',
    placeholder: 'Ex: Pizzaria do João, Clínica Saúde Bem-estar...',
    required:    true,
  },
  {
    key:         'what_offers',
    question:    'O que você oferece para seus clientes?',
    placeholder: 'Ex: Pizzas artesanais e pratos italianos, atendimento de segunda a sábado...',
    required:    true,
    hint:        'Descreva seus produtos, serviços ou o que torna seu negócio especial.',
  },
  {
    key:         'location',
    question:    'Qual o endereço ou cidade onde você atende?',
    placeholder: 'Ex: Rua das Flores, 123 - Centro, São Paulo ou São Paulo - SP',
    required:    false,
    hint:        'Pode ser só a cidade se preferir. Pule se não quiser informar.',
  },
  {
    key:         'hours',
    question:    'Quais são seus horários de funcionamento?',
    placeholder: 'Ex: Seg a Sex das 8h às 18h, Sáb das 9h às 13h',
    required:    false,
    hint:        'Pule se não quiser informar agora.',
  },
  {
    key:         'extra_info',
    question:    'Tem alguma informação importante que o assistente deve sempre saber?',
    placeholder: 'Ex: Aceitamos delivery, temos estacionamento gratuito, somos especializados em...',
    required:    false,
    hint:        'Qualquer detalhe relevante: diferenciais, formas de pagamento, políticas, etc. Pode pular.',
  },
];

export function Step3({ state, update, onNext, onBack }: StepProps) {
  const [qIndex, setQIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [inputValue, setInputValue] = useState(state.step3[QUESTIONS[0].key] ?? '');

  const current = QUESTIONS[qIndex];
  const isLast  = qIndex === QUESTIONS.length - 1;
  const isEmpty = !inputValue.trim();
  const isError = touched && current.required && isEmpty;

  // Salva resposta atual e avança para próxima pergunta
  function advanceQuestion() {
    setTouched(true);
    if (current.required && isEmpty) return;

    // Salva no state global
    update({
      step3: { ...state.step3, [current.key]: inputValue.trim() },
    });

    if (isLast) {
      onNext();
      return;
    }

    // Próxima pergunta
    const nextQ = QUESTIONS[qIndex + 1];
    setInputValue(state.step3[nextQ.key] ?? '');
    setQIndex(i => i + 1);
    setTouched(false);
  }

  // Pula pergunta opcional
  function skip() {
    update({
      step3: { ...state.step3, [current.key]: '' },
    });
    if (isLast) {
      onNext();
      return;
    }
    const nextQ = QUESTIONS[qIndex + 1];
    setInputValue(state.step3[nextQ.key] ?? '');
    setQIndex(i => i + 1);
    setTouched(false);
  }

  // Volta para pergunta anterior
  function prevQuestion() {
    if (qIndex === 0) {
      onBack();
      return;
    }
    const prevQ = QUESTIONS[qIndex - 1];
    setInputValue(state.step3[prevQ.key] ?? '');
    setQIndex(i => i - 1);
    setTouched(false);
  }

  return (
    <div>
      {/* Mini indicador de progresso interno */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 2,
            background: i < qIndex ? '#22c55e' : i === qIndex ? '#3b82f6' : '#e2e8f0',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Pergunta */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
        {current.question}
      </h2>

      {current.hint && (
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, lineHeight: 1.5 }}>
          {current.hint}
        </p>
      )}

      {/* Input */}
      {current.key === 'what_offers' || current.key === 'extra_info' ? (
        <textarea
          autoFocus
          rows={3}
          value={inputValue}
          placeholder={current.placeholder}
          onChange={e => setInputValue(e.target.value)}
          style={{
            width: '100%', padding: '14px 16px',
            fontSize: 15, border: `2px solid ${isError ? '#ef4444' : '#e2e8f0'}`,
            borderRadius: 10, outline: 'none', color: '#0f172a',
            resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
          onBlur={e => { e.currentTarget.style.borderColor = isError ? '#ef4444' : '#e2e8f0'; }}
        />
      ) : (
        <input
          autoFocus
          type="text"
          value={inputValue}
          placeholder={current.placeholder}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') advanceQuestion(); }}
          style={{
            width: '100%', padding: '14px 16px',
            fontSize: 15, border: `2px solid ${isError ? '#ef4444' : '#e2e8f0'}`,
            borderRadius: 10, outline: 'none', color: '#0f172a',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
          onBlur={e => { e.currentTarget.style.borderColor = isError ? '#ef4444' : '#e2e8f0'; }}
        />
      )}

      {isError && (
        <p style={{ fontSize: 13, color: '#ef4444', marginTop: 6 }}>
          Esta informação é necessária para configurar seu assistente.
        </p>
      )}

      {/* Contagem */}
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, marginBottom: 28 }}>
        Pergunta {qIndex + 1} de {QUESTIONS.length}
        {!current.required && ' · opcional'}
      </p>

      {/* Botões */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={prevQuestion}
          style={{
            flex: '0 0 auto', padding: '12px 20px',
            border: '1px solid #e2e8f0', borderRadius: 10,
            background: '#f8fafc', color: '#64748b',
            fontSize: 14, cursor: 'pointer', fontWeight: 500,
          }}
        >
          ← Voltar
        </button>

        {!current.required && (
          <button
            type="button"
            onClick={skip}
            style={{
              flex: '0 0 auto', padding: '12px 20px',
              border: '1px solid #e2e8f0', borderRadius: 10,
              background: '#f8fafc', color: '#64748b',
              fontSize: 14, cursor: 'pointer', fontWeight: 500,
            }}
          >
            Pular
          </button>
        )}

        <button
          type="button"
          onClick={advanceQuestion}
          style={{
            flex: 1, padding: '12px',
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: 'white', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {isLast ? 'Continuar →' : 'Próxima →'}
        </button>
      </div>
    </div>
  );
}
