// components/dashboard/onboarding/steps/Step5.tsx
// Regras e limites — checkboxes opcionais + campo livre.
// Padrão: nenhuma regra marcada. Pode avançar sem preencher.

'use client';

import { NavButtons } from './Step1';
import type { StepProps } from './types';

export function Step5({ state, update, onNext, onBack }: StepProps) {
  const { step5 } = state;

  function toggle(key: keyof typeof step5) {
    if (typeof step5[key] === 'boolean') {
      update({ step5: { ...step5, [key]: !step5[key] } });
    }
  }

  const RULES = [
    {
      key:         'no_competitor_info' as const,
      label:       'Não falar sobre concorrentes',
      description: 'O assistente evita comparações e não cita outras empresas.',
    },
    {
      key:         'no_prices' as const,
      label:       'Não informar preços diretamente',
      description: 'Redireciona o cliente para falar com a equipe para preços.',
    },
    {
      key:         'no_personal_data' as const,
      label:       'Não solicitar dados pessoais sensíveis',
      description: 'Não pede CPF, cartão ou senhas durante o atendimento.',
    },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        Alguma regra especial para o assistente?
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
        Totalmente opcional. Se quiser, marque o que o assistente <strong>não deve fazer</strong>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {RULES.map(rule => {
          const checked = step5[rule.key] as boolean;
          return (
            <label
              key={rule.key}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${checked ? '#3b82f6' : '#e2e8f0'}`,
                background: checked ? '#eff6ff' : '#f8fafc',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(rule.key)}
                style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
              />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: '0 0 2px' }}>
                  {rule.label}
                </p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  {rule.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Regra personalizada */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
          Regra personalizada (opcional)
        </label>
        <textarea
          rows={2}
          value={step5.custom_rule}
          placeholder='Ex: Sempre oferecer o combo do dia, nunca prometer prazo de entrega sem confirmar...'
          onChange={e => update({ step5: { ...step5, custom_rule: e.target.value } })}
          maxLength={200}
          style={{
            width: '100%', padding: '12px 14px',
            fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 10,
            outline: 'none', resize: 'none', color: '#0f172a',
            boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
        />
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
          {step5.custom_rule.length}/200
        </p>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} disableNext={false} nextLabel="Revisar e Criar →" />
    </div>
  );
}
