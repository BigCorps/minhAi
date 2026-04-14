'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

interface ModoToggleProps {
  companyId: string;
  modoType: 'fila' | 'vendas' | 'link';
  initialEnabled: boolean;
  onToggle?: (enabled: boolean) => void;
}

const CONFIG = {
  fila: {
    label: 'Modo Fila',
    description: 'Habilita o módulo de gerenciamento de fila de atendimento',
    column: 'modo_fila_enabled',
    color: 'blue',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  vendas: {
    label: 'Modo Vendas',
    description: 'Habilita a loja virtual e o módulo de pedidos',
    column: 'modo_vendas_enabled',
    color: 'emerald',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  link: {
    label: 'Link na Bio',
    description: 'Habilita a página pública de links da empresa',
    column: 'modo_links_enabled',
    color: 'violet',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
};

export default function ModoToggle({ companyId, modoType, initialEnabled, onToggle }: ModoToggleProps) {
  const supabase = createClient();
  const cfg = CONFIG[modoType];
  const isBlue   = cfg.color === 'blue';
  const isViolet = cfg.color === 'violet';

  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(true); // true enquanto busca valor real

  // Busca o valor atual do banco ao montar
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('companies')
      .select(cfg.column)
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        if (data) setEnabled(data[cfg.column] ?? false);
        setLoading(false);
      });
  }, [companyId]);

  async function handleToggle() {
    setLoading(true);
    const next = !enabled;
    try {
      const { error } = await supabase
        .from('companies')
        .update({ [cfg.column]: next })
        .eq('id', companyId);
      if (error) throw error;
      setEnabled(next);
      onToggle?.(next);
    } catch (e) {
      console.error('Erro ao atualizar modo:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-row items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900">

      {/* Esquerda: ícone + label + descrição (descrição só desktop) */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={`flex-shrink-0 ${
          isBlue   ? 'text-blue-500 dark:text-blue-400'
          : isViolet ? 'text-violet-500 dark:text-violet-400'
          : 'text-emerald-500 dark:text-emerald-400'
        }`}>
          {cfg.icon}
        </span>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">
          {cfg.label}
        </span>
        <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 truncate">
          — {cfg.description}
        </span>
      </div>

      {/* Direita: status + toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-medium ${
            enabled
              ? isBlue
                ? 'text-blue-600 dark:text-blue-400'
                : isViolet
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-emerald-600 dark:text-emerald-400'
              : 'text-gray-400 dark:text-gray-500'
        }`}>
          {loading ? '...' : enabled ? 'Ativo' : 'Inativo'}
        </span>

        <button
          type="button"
          disabled={loading}
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            enabled
              ? isBlue ? 'bg-blue-500' : isViolet ? 'bg-violet-500' : 'bg-emerald-500'
              : 'bg-gray-300 dark:bg-slate-600'
          }`}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
          ) : (
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          )}
        </button>
      </div>
    </div>
  );
}
