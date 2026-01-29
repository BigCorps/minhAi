// components/dashboard/functions/FunctionCard.tsx
'use client';

import { CheckCircle2, XCircle, TrendingUp, Clock, Settings } from 'lucide-react';

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
  
  const hasEditModal = !!fn.edit_modal_component;
  
  return (
    <div
      className={`border rounded-2xl p-6 transition-all ${
        isEnabled
          ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 shadow-lg'
          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800'
      }`}
    >
      {/* Header do Card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ backgroundColor: `${fn.color}20` }}
          >
            {fn.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
              {fn.function_name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              {fn.short_description}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 ml-3">
          <button
            onClick={onToggle}
            disabled={isUpdating}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              isEnabled
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>...</span>
              </>
            ) : isEnabled ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Ativa</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Inativa</span>
              </>
            )}
          </button>
          
          {hasEditModal && onEdit && (
            <button
              onClick={onEdit}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                theme === 'dark'
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Editar</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Descrição */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
        {fn.description}
      </p>
      
      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {fn.requires_payment && (
          <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
            💳 Requer Pagamento
          </span>
        )}
        {fn.is_premium && (
          <span className="px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
            ⭐ Premium
          </span>
        )}
        {fn.consumes_credits && (
          <span className="px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium">
            🔥 {fn.credits_per_use} crédito{fn.credits_per_use > 1 ? 's' : ''}
          </span>
        )}
        {!fn.save_to_history && (
          <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium">
            👻 Privado
          </span>
        )}
      </div>
      
      {/* Stats - Só mostra se função está ativa E tem uso */}
      {isEnabled && stats.usageCount > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Usos</p>
              <p className="font-semibold text-gray-900 dark:text-white">{stats.usageCount}</p>
            </div>
          </div>
          {stats.lastUsed && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Último uso</p>
                <p className="font-semibold text-gray-900 dark:text-white text-xs">
                  {new Date(stats.lastUsed).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Exemplos de uso */}
      {fn.example_phrases && fn.example_phrases.length > 0 && (
        <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            💬 Exemplos de uso:
          </p>
          <ul className="space-y-1">
            {fn.example_phrases.slice(0, 2).map((phrase, i) => (
              <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
                • "{phrase}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
