// components/dashboard/onboarding/steps/Step4.tsx
'use client';

import { Briefcase, Smile, PartyPopper } from 'lucide-react';
import { NavButtons } from './Step1';
import type { StepProps } from './types';
import type { Tone } from '../AssistantOnboarding';

const TONES: { key: Tone; label: string; icon: React.ReactNode; description: string; example: string }[] = [
  {
    key:         'formal',
    label:       'Formal e Profissional',
    icon:        <Briefcase size={20} />,
    description: 'Linguagem cuidadosa e respeitosa. Ideal para clínicas, escritórios de advocacia, contabilidade e serviços corporativos.',
    example:     '"Bom dia. Estou à disposição para auxiliá-lo com o que precisar."',
  },
  {
    key:         'amigavel',
    label:       'Amigável e Acolhedor',
    icon:        <Smile size={20} />,
    description: 'Simpático e próximo, sem ser informal demais. Funciona bem para a maioria dos negócios.',
    example:     '"Olá! Tudo bem? Posso te ajudar com alguma coisa hoje?"',
  },
  {
    key:         'descontraido',
    label:       'Descontraído e Divertido',
    icon:        <PartyPopper size={20} />,
    description: 'Leve, com personalidade e bom humor. Ótimo para academias, salões, bares e negócios jovens.',
    example:     '"Ei! Que bom te ver por aqui 😄 Qual é a boa hoje?"',
  },
];

export function Step4({ state, update, onNext, onBack }: StepProps) {
  const selected = state.step4.tone;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Como seu assistente vai se comunicar?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-7 leading-relaxed">
        Escolha o tom de voz. Isso define a personalidade do assistente nas respostas. Você pode mudar depois.
      </p>

      <div className="flex flex-col gap-3 mb-8">
        {TONES.map(tone => {
          const isSelected = selected === tone.key;
          return (
            <button
              key={tone.key}
              type="button"
              onClick={() => update({ step4: { tone: tone.key } })}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className={isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-white/30'}>
                  {tone.icon}
                </span>
                <span className={`font-bold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-white'}`}>
                  {tone.label}
                </span>
                {isSelected && (
                  <span className="ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500 text-white">
                    Selecionado
                  </span>
                )}
              </div>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">{tone.description}</p>
              <p className={`text-xs italic px-3 py-2 rounded-lg ${
                isSelected ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
              }`}>
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
