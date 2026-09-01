'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, CheckCircle2, Circle, ChevronRight, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAssistant } from '@/contexts/AssistantContext';
import { createClient } from '@/lib/supabase-browser';

interface OnboardingStatus {
  criar_assistente: boolean;
  definir_funcoes: boolean;
  configuracao: boolean;
  servicos_google: boolean;
  servicos_meta: boolean;
  cadastro_produtos: boolean;
  cadastro_usuario: boolean;
  nota: boolean;
}

export default function SetupBanner() {
  const router = useRouter();
  const { selectedAssistantId, availableAssistants, loadingAssistants } = useAssistant();
  const [dismissed, setDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchStatus() {
      if (!selectedAssistantId) return;
      
      setLoadingStatus(true);
      try {
        const { data, error } = await supabase.rpc('get_company_onboarding_status', {
          p_company_id: selectedAssistantId
        });
        
        if (error) throw error;
        if (data) setStatus(data as OnboardingStatus);
      } catch (error) {
        console.error('Erro ao buscar status de onboarding:', error);
      } finally {
        setLoadingStatus(false);
      }
    }

    fetchStatus();
  }, [selectedAssistantId, supabase]);

  if (dismissed || loadingAssistants) return null;

  const hasAssistant = availableAssistants.length > 0;

  // ESTADO 1: Usuário não tem assistente (Banner Original)
  if (!hasAssistant) {
    return (
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        <div className="flex items-start sm:items-center gap-3 pr-6 sm:pr-0">
          <Sparkles className="w-4 h-4 flex-shrink-0 opacity-90 mt-0.5 sm:mt-0" />
          <p className="text-sm font-medium leading-snug text-center sm:text-left">
            <span className="font-bold">Crie agora</span>{' '}
            seu assistente facilmente, informando as características para a IA, que te recomenda as melhores funções especialmente para suas necessidades.
          </p>
        </div>
        <div className="flex items-center gap-2 justify-center sm:justify-start sm:flex-shrink-0 z-10">
          <button
            onClick={() => router.push('/dashboard/assistentes/create')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition whitespace-nowrap"
          >
            CRIAR ASSISTENTE
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded transition z-10"
          title="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ESTADO 2: Usuário tem assistente (Checklist de Onboarding)
  if (!status) return null;

  const steps = [
    { id: 'criar_assistente', label: 'Criar Assistente', done: status.criar_assistente, link: '/dashboard/assistentes' },
    { id: 'definir_funcoes', label: 'Definir Funções', done: status.definir_funcoes, link: '/dashboard/functions' },
    { id: 'configuracao', label: 'Configuração', done: status.configuracao, link: `/dashboard/assistentes/${selectedAssistantId}` },
    { id: 'servicos_google', label: 'Serviços Google', done: status.servicos_google, link: '/dashboard/agenda', optional: true },
    { id: 'servicos_meta', label: 'Serviços Meta', done: status.servicos_meta, link: '/dashboard/atendimentos', optional: true },
    { id: 'cadastro_produtos', label: 'Cadastro de Produtos', done: status.cadastro_produtos, link: '/dashboard/vendas', optional: true },
    { id: 'cadastro_usuario', label: 'Controle de Usuários', done: status.cadastro_usuario, link: '/dashboard/cadastros', optional: true },
    { id: 'nota', label: 'Nota Fiscal', done: status.nota, link: '/dashboard/arquivos', optional: true },
  ];

  // Conta todas as etapas que estão com status done = true
  const completedCount = steps.filter(s => s.done).length;
  
  // Pega o total absoluto de etapas no array
  const totalSteps = steps.length;
  
  // Calcula a porcentagem com base no total de etapas
  const progressPercentage = Math.round((completedCount / totalSteps) * 100);
  
  // Verifica se todas foram completadas
  const isAllCompleted = completedCount === totalSteps;

  // Quando 100%, não permite expandir e esconde o corpo
  const showContent = isExpanded && !isAllCompleted;

  if (isAllCompleted && dismissed) return null;

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
      {/* Header do Checklist */}
      <div 
        className={`px-5 py-4 flex items-center justify-between transition ${!isAllCompleted ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5' : ''}`}
        onClick={() => !isAllCompleted && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Configure seu Assistente
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden max-w-md">
                <div 
                  className={`h-full transition-all duration-500 ease-out ${isAllCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {progressPercentage}% concluído
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isAllCompleted && (
            isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition ml-2"
            title="Ocultar"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Corpo do Checklist (Expansível) */}
      {showContent && (
        <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-white/5">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Complete as etapas abaixo para extrair o máximo de potencial do seu assistente de IA.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                onClick={() => router.push(step.link)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${step.done 
                    ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' 
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-sm'
                  }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${step.done ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {index + 1}. {step.label}
                  </span>
                  {step.optional && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Opcional</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
