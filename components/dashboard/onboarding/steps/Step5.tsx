// components/dashboard/onboarding/steps/Step5.tsx
'use client';

import { ShieldOff, Tag, Lock } from 'lucide-react';
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
    { key: 'no_competitor_info' as const, icon: <ShieldOff size={16} />, label: 'Não falar sobre concorrentes',              description: 'O assistente evita comparações e não cita outras empresas.' },
    { key: 'no_prices'          as const, icon: <Tag size={16} />,       label: 'Não informar preços diretamente',           description: 'Redireciona o cliente para falar com a equipe para preços.' },
    { key: 'no_personal_data'   as const, icon: <Lock size={16} />,      label: 'Não solicitar dados pessoais sensíveis',    description: 'Não pede CPF, cartão ou senhas durante o atendimento.' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Alguma regra especial para o assistente?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-7 leading-relaxed">
        Totalmente opcional. Se quiser, marque o que o assistente <strong>não deve fazer</strong>.
      </p>

      <div className="flex flex-col gap-2.5 mb-6">
        {RULES.map(rule => {
          const checked = step5[rule.key] as boolean;
          return (
            <label
              key={rule.key}
              className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
                checked
                  ? 'border-blue-400 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10'
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(rule.key)}
                className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0 accent-blue-500"
              />
              <span className={`mt-0.5 flex-shrink-0 ${checked ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-white/30'}`}>
                {rule.icon}
              </span>
              <div>
                <p className={`text-sm font-semibold ${checked ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-white'}`}>
                  {rule.label}
                </p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">{rule.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Regra personalizada <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          rows={2}
          value={step5.custom_rule}
          placeholder="Ex: Sempre oferecer o combo do dia, nunca prometer prazo de entrega sem confirmar..."
          onChange={e => update({ step5: { ...step5, custom_rule: e.target.value } })}
          maxLength={200}
          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 outline-none resize-none font-[inherit] leading-relaxed focus:border-blue-500 transition-colors"
        />
        <p className="text-xs text-gray-400 dark:text-white/30 mt-1 text-right">{step5.custom_rule.length}/200</p>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} disableNext={false} nextLabel="Revisar e Criar →" />
    </div>
  );
}
