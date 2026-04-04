'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface ModoToggleProps {
  companyId: string;
  modoType: 'vendas' | 'fila';
  initialEnabled: boolean;
  onToggle?: (enabled: boolean) => void;
}

export default function ModoToggle({
  companyId,
  modoType,
  initialEnabled,
  onToggle,
}: ModoToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [updating, setUpdating] = useState(false);

  const labels = {
    vendas: {
      title: 'Modo Vendas',
      description: 'Habilita o módulo de vendas com catálogo de produtos e carrinho de compras',
      icon: '🛒',
      enabledText: 'Modo Vendas está ativo',
      disabledText: 'Modo Vendas está desativado',
    },
    fila: {
      title: 'Modo Fila',
      description: 'Habilita o sistema de gerenciamento de filas e atendimento',
      icon: '👥',
      enabledText: 'Modo Fila está ativo',
      disabledText: 'Modo Fila está desativado',
    },
  };

  const config = labels[modoType];
  const columnName = `modo_${modoType}_enabled`;

  const handleToggle = async () => {
    setUpdating(true);

    try {
      const supabase = createClient();
      const newValue = !enabled;

      const { error } = await supabase
        .from('companies')
        .update({ [columnName]: newValue })
        .eq('id', companyId);

      if (error) throw error;

      setEnabled(newValue);
      onToggle?.(newValue);

      // Feedback visual de sucesso
      console.log(`✅ ${config.title} ${newValue ? 'ativado' : 'desativado'}`);
    } catch (error) {
      console.error(`Erro ao atualizar ${config.title}:`, error);
      alert(`Erro ao atualizar ${config.title}. Tente novamente.`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between">
        {/* Informações */}
        <div className="flex items-start gap-4 flex-1">
          <div className="text-4xl">{config.icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {config.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {config.description}
            </p>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  enabled ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  enabled
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {enabled ? config.enabledText : config.disabledText}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={updating}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            enabled
              ? 'bg-blue-600'
              : 'bg-gray-300 dark:bg-gray-600'
          } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className="sr-only">
            {enabled ? 'Desativar' : 'Ativar'} {config.title}
          </span>
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Mensagem de atualização */}
      {updating && (
        <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          <span>Atualizando...</span>
        </div>
      )}
    </div>
  );
}
