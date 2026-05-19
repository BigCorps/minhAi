// components/dashboard/onboarding/steps/Step6.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Loader2, Rocket,
  ShoppingCart, Sparkles, Bot, Building2, Package,
  MapPin, Clock, MessageSquare, Zap,
} from 'lucide-react';
import type { OnboardingState } from '../AssistantOnboarding';

interface Step6Props {
  state:      OnboardingState;
  onBack:     () => void;
  onCreate:   () => void;
  isCreating: boolean;
}

const TONE_LABELS = {
  formal:       'Formal e Profissional',
  amigavel:     'Amigável e Acolhedor',
  descontraido: 'Descontraído e Divertido',
};

export function Step6({ state, onBack, onCreate, isCreating }: Step6Props) {
  const [fnCount, setFnCount] = useState<number | null>(null);

  useEffect(() => {
    if (!state.segmentKey) return;
    fetch(`/api/assistant/segment-functions?segment=${state.segmentKey}&type=${state.assistantType}`)
      .then(r => r.json())
      .then(d => setFnCount(d.count ?? 0))
      .catch(() => setFnCount(null));
  }, [state.segmentKey, state.assistantType]);

  const isVendas = state.assistantType === 'vendas';

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
        Tudo pronto! Revise antes de criar. 🎉
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">
        Confirme as informações abaixo. Você poderá editar tudo depois no dashboard.
      </p>

      <div className="flex flex-col gap-2.5 mb-6">
        <ReviewCard icon={isVendas ? <ShoppingCart size={16} /> : <Sparkles size={16} />}
          label="Tipo" value={isVendas ? 'minhAi Vendas' : 'minhAi Smart'} />
        <ReviewCard icon={<Bot size={16} />}
          label="Nome do assistente" value={state.assistantName} />
        <ReviewCard icon={<span className="text-base leading-none">{state.segmentEmoji || '🏢'}</span>}
          label="Segmento" value={state.segmentLabel} />
        <ReviewCard icon={<Building2 size={16} />}
          label="Empresa" value={state.step3.company_name} />
        {state.step3.what_offers && (
          <ReviewCard icon={<Package size={16} />} label="O que oferece" value={state.step3.what_offers} />
        )}
        {state.step3.location && (
          <ReviewCard icon={<MapPin size={16} />} label="Localização" value={state.step3.location} />
        )}
        {state.step3.hours && (
          <ReviewCard icon={<Clock size={16} />} label="Horários" value={state.step3.hours} />
        )}
        <ReviewCard icon={<MessageSquare size={16} />}
          label="Tom de voz" value={TONE_LABELS[state.step4.tone]} />
        <ReviewCard
          icon={<Zap size={16} />}
          label="Funções configuradas"
          value={fnCount !== null
            ? `${fnCount} funções ativadas automaticamente para ${state.segmentLabel}`
            : 'Carregando...'}
          highlight
        />
      </div>

      {/* Preview do prompt */}
      {state.generatedPrompt && (
        <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl mb-6">
          <p className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-2">
            Como seu assistente vai se apresentar
          </p>
          <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
            {state.generatedPrompt.length > 220
              ? `${state.generatedPrompt.slice(0, 220)}...`
              : state.generatedPrompt}
          </p>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isCreating}
          className="flex-shrink-0 px-5 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={isCreating}
          className={`flex-1 py-3.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition ${
            isCreating
              ? 'bg-gray-300 dark:bg-white/10 text-gray-400 dark:text-white/30 cursor-not-allowed'
              : isVendas
                ? 'bg-gradient-to-r from-violet-600 to-purple-500 hover:opacity-90'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90'
          }`}
        >
          {isCreating ? (
            <><Loader2 size={17} className="animate-spin" /> Criando assistente...</>
          ) : (
            <><Rocket size={17} /> Criar Assistente</>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400 dark:text-white/30 mt-4 text-center">
        Após criar, você poderá configurar funções individuais, alterar o visual e testar o assistente.
      </p>
    </div>
  );
}

function ReviewCard({ icon, label, value, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
      highlight
        ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
        : 'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/10'
    }`}>
      <span className={`flex-shrink-0 mt-0.5 ${highlight ? 'text-green-500' : 'text-gray-400 dark:text-white/30'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-sm font-medium leading-snug ${highlight ? 'text-green-700 dark:text-green-300' : 'text-gray-800 dark:text-white'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
