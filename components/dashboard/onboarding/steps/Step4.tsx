// components/dashboard/onboarding/steps/Step4.tsx
// Tom de voz — 3 cards. Padrão: amigavel. Pode avançar sem selecionar.

'use client';

import { NavButtons } from './Step1';
import type { StepProps } from './types';
import type { Tone } from '../AssistantOnboarding';

const TONES: { key: Tone; label: string; emoji: string; description: string; example: string }[] = [
  {
    key:         'formal',
    label:       'Formal e Profissional',
    emoji:       '👔',
    description: 'Linguagem cuidadosa e respeitosa. Ideal para clínicas, escritórios de advocacia, contabilidade e serviços corporativos.',
    example:     '"Bom dia. Estou à disposição para auxiliá-lo com o que precisar."',
  },
  {
    key:         'amigavel',
    label:       'Amigável e Acolhedor',
    emoji:       '😊',
    description: 'Simpático e próximo, sem ser informal demais. Funciona bem para a maioria dos negócios.',
    example:     '"Olá! Tudo bem? Posso te ajudar com alguma coisa hoje?"',
  },
  {
    key:         'descontraido',
    label:       'Descontraído e Divertido',
    emoji:       '🎉',
    description: 'Leve, com personalidade e bom humor. Ótimo para academias, salões, bares e negócios jovens.',
    example:     '"Ei! Que bom te ver por aqui 😄 Qual é a boa hoje?"',
  },
];

export function Step4({ state, update, onNext, onBack }: StepProps) {
  const selected = state.step4.tone;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        Como seu assistente vai se comunicar?
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
        Escolha o tom de voz. Isso define a personalidade do assistente nas respostas. Você pode mudar depois.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {TONES.map(tone => {
          const isSelected = selected === tone.key;
          return (
            <button
              key={tone.key}
              type="button"
              onClick={() => update({ step4: { tone: tone.key } })}
              style={{
                textAlign: 'left', padding: '16px 20px',
                borderRadius: 12,
                border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                background: isSelected ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{tone.emoji}</span>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  color: isSelected ? '#2563eb' : '#1e293b',
                }}>
                  {tone.label}
                </span>
                {isSelected && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 20,
                    background: '#3b82f6', color: 'white',
                  }}>
                    Selecionado
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: '#475569', margin: '0 0 8px', lineHeight: 1.5 }}>
                {tone.description}
              </p>
              <p style={{
                fontSize: 12, color: '#64748b', margin: 0,
                fontStyle: 'italic', padding: '8px 12px',
                background: isSelected ? '#dbeafe' : '#f1f5f9',
                borderRadius: 6,
              }}>
                {tone.example}
              </p>
            </button>
          );
        })}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} disableNext={false} />
    </div>
  );
}
