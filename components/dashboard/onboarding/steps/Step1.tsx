// components/dashboard/onboarding/steps/Step1.tsx
// Nome do assistente.

'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import type { StepProps } from './types';

const SUGGESTIONS = ['Sofia', 'Max', 'Luna', 'Alex', 'Nina', 'Theo'];

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Bot size={22} color="#3b82f6" />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Como vai se chamar seu assistente?
        </h2>
      </div>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
        Esse é o nome com que ele se apresentará para seus clientes. Pode ser qualquer nome — use o nome da empresa, um nome próprio, ou algo criativo.
      </p>

      <input
        type="text"
        autoFocus
        value={value}
        maxLength={40}
        placeholder='Ex: Sofia, Atendente Virtual, Assistente da Empresa...'
        onChange={e => update({ assistantName: e.target.value })}
        onKeyDown={e => { if (e.key === 'Enter') handleNext(); }}
        style={{
          width: '100%', padding: '14px 16px',
          fontSize: 16, border: `2px solid ${isError ? '#ef4444' : '#e2e8f0'}`,
          borderRadius: 10, outline: 'none', color: '#0f172a',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = isError ? '#ef4444' : '#3b82f6'; }}
        onBlur={e => {
          setTouched(true);
          e.currentTarget.style.borderColor = isError ? '#ef4444' : '#e2e8f0';
        }}
      />

      {isError && (
        <p style={{ fontSize: 13, color: '#ef4444', marginTop: 6 }}>
          Escolha um nome para o assistente antes de continuar.
        </p>
      )}

      {/* Sugestões rápidas */}
      <div style={{ marginTop: 16, marginBottom: 32 }}>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Sugestões:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => update({ assistantName: s })}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1px solid ${value === s ? '#3b82f6' : '#e2e8f0'}`,
                background: value === s ? '#eff6ff' : '#f8fafc',
                color: value === s ? '#2563eb' : '#475569',
                fontSize: 13, cursor: 'pointer', fontWeight: value === s ? 600 : 400,
              }}
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

export function NavButtons({
  onBack, onNext, disableNext, nextLabel = 'Continuar →',
}: {
  onBack: () => void;
  onNext: () => void;
  disableNext: boolean;
  nextLabel?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          flex: '0 0 auto', padding: '12px 20px',
          border: '1px solid #e2e8f0', borderRadius: 10,
          background: '#f8fafc', color: '#64748b',
          fontSize: 14, cursor: 'pointer', fontWeight: 500,
        }}
      >
        ← Voltar
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext}
        style={{
          flex: 1, padding: '12px',
          background: disableNext ? '#e2e8f0' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
          color: disableNext ? '#94a3b8' : 'white',
          border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 700,
          cursor: disableNext ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}
