// components/dashboard/functions/FunctionCard.tsx
'use client';

import { Settings, CreditCard } from 'lucide-react';
import { Switch } from '@/components/ui/switch'; // Supondo o uso de um componente de UI como ShadCN

interface FunctionCardProps {
  function: {
    id: string;
    function_key: string;
    function_name: string;
    function_category: string;
    description: string;
    short_description: string;
    icon: string;
    color: string;
    requires_payment: boolean;
    is_premium: boolean;
    save_to_history: boolean;
    consumes_credits: boolean;
    credits_per_use: number;
    example_phrases?: string[];
    edit_modal_component?: string;
  };
  isEnabled: boolean;
  stats: {
    usageCount: number;
    creditsConsumed: number;
    lastUsed: string | null;
  };
  onToggle: () => void;
  onEdit?: () => void;
  isUpdating: boolean;
  theme?: 'dark' | 'light';
}

export default function FunctionCard({
  function: fn,
  isEnabled,
  stats,
  onToggle,
  onEdit,
  isUpdating,
  theme = 'dark'
}: FunctionCardProps) {
  
  // Proteção contra undefined para evitar o erro TypeError
  if (!fn) return null;
  
  const hasEditModal = !!fn.edit_modal_component;

  return (
    <div
      className={`relative border rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between h-full ${
        isEnabled
          ? 'bg-white dark:bg-slate-900 shadow-sm'
          : 'bg-gray-50 dark:bg-slate-900/50'
      }`}
    >
      <div className="flex-grow">
        {/* Header com Categoria e Cor */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: fn.color || '#6B7280' }}
            />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              {fn.function_category}
            </span>
          </div>
        </div>

        {/* Título e Descrição */}
        <h3 className="font-bold text-md text-gray-900 dark:text-white mb-1.5 truncate">
          {fn.function_name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 h-[40px]">
          {fn.short_description}
        </p>
      </div>

      {/* Footer com Créditos e Ações */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          {fn.consumes_credits && (
            <>
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span className="font-medium">
                {fn.credits_per_use} crédito{fn.credits_per_use !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            disabled={isUpdating}
            aria-label={isEnabled ? 'Desativar função' : 'Ativar função'}
          />
          {hasEditModal && onEdit && (
            <button
              onClick={onEdit}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              disabled={isUpdating}
              aria-label="Configurar função"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Overlay de Loading */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-2xl">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}