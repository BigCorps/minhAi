// components/layout/AssistantSelectorHeader.tsx
'use client';
import { useState } from 'react';
import { Bot, ChevronDown, Plus } from 'lucide-react';
import { useAssistant } from '@/contexts/AssistantContext';
import Link from 'next/link';

export function AssistantSelectorHeader() {
  const {
    selectedAssistantId,
    setSelectedAssistant,
    availableAssistants,
    loadingAssistants,
  } = useAssistant();
  const [isOpen, setIsOpen] = useState(false);

  if (loadingAssistants) {
    return <div className="animate-pulse h-9 w-9 sm:w-44 rounded-lg bg-gray-200 dark:bg-slate-800" />;
  }

  // ── Caso: nenhum assistente criado ──────────────────────────────────────────
  if (availableAssistants.length === 0) {
    return (
      <div className="relative z-50">
        {/* Mobile: só ícone */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex sm:hidden items-center justify-center w-9 h-9 rounded-lg border transition-all
            bg-white dark:bg-slate-800
            border-gray-300 dark:border-slate-700
            hover:bg-gray-50 dark:hover:bg-slate-700"
          aria-label="Assistentes"
        >
          <Bot className="w-4 h-4 text-blue-500" />
        </button>

        {/* Desktop: botão com texto */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
            bg-white dark:bg-slate-800
            border-gray-300 dark:border-slate-700
            text-gray-500 dark:text-gray-400
            hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          <Bot className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span>Nenhum assistente</span>
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-lg border shadow-xl z-50 overflow-hidden
              bg-white dark:bg-slate-800
              border-gray-300 dark:border-slate-700">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Você ainda não criou nenhum assistente.
                </p>
              </div>
              <Link
                href="/dashboard/assistentes/create"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                  text-blue-600 dark:text-blue-400
                  hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-blue-500" />
                </div>
                Crie seu assistente
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Caso normal: com assistentes ────────────────────────────────────────────
  const current = availableAssistants.find(a => a.id === selectedAssistantId);
  const currentIsVendas = current?.assistant_type === 'vendas';

  return (
    <div className="relative z-50">
      {/* Mobile: só ícone do bot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex sm:hidden items-center justify-center w-9 h-9 rounded-lg border transition-all
          bg-white dark:bg-slate-800
          border-gray-300 dark:border-slate-700
          hover:bg-gray-50 dark:hover:bg-slate-700"
        aria-label={current?.name || 'Selecione Assistente'}
      >
        <Bot className={`w-4 h-4 ${currentIsVendas ? 'text-lime-500' : 'text-blue-500'}`} />
      </button>

      {/* Desktop: botão completo com nome */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
          bg-white dark:bg-slate-800
          border-gray-300 dark:border-slate-700
          text-gray-900 dark:text-white
          hover:bg-gray-50 dark:hover:bg-slate-700"
      >
        <Bot className={`w-4 h-4 flex-shrink-0 ${currentIsVendas ? 'text-lime-500' : 'text-blue-500'}`} />
        <span className="truncate max-w-[120px]">
          {current?.name || 'Selecione Assistente'}
        </span>
        {currentIsVendas && (
          <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-lime-400 text-black font-bold text-[9px]">
            V
          </span>
        )}
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown — igual para mobile e desktop */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-lg border shadow-xl z-50 overflow-hidden
            bg-white dark:bg-slate-800
            border-gray-300 dark:border-slate-700">
            <div className="max-h-72 overflow-y-auto">
              {availableAssistants.map((assistant) => {
                const isVendas = assistant.assistant_type === 'vendas';
                const isSelected = assistant.id === selectedAssistantId;
                return (
                  <button
                    key={assistant.id}
                    onClick={() => {
                      setSelectedAssistant(assistant.id, assistant.name);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors text-left
                      ${isSelected
                        ? isVendas
                          ? 'bg-lime-500/20 text-lime-900 dark:text-white'
                          : 'bg-blue-500/20 text-blue-900 dark:text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isSelected
                        ? isVendas ? 'bg-lime-500/30' : 'bg-blue-500/30'
                        : 'bg-gray-100 dark:bg-slate-700'
                      }`}>
                      <Bot className={`w-4 h-4 ${isVendas ? 'text-lime-500' : 'text-blue-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium truncate">{assistant.name}</p>
                        {isVendas && (
                          <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-lime-400 text-black font-bold text-[9px]">
                            V
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">/{assistant.slug}</p>
                    </div>
                    {isSelected && (
                      <svg
                        className={`w-4 h-4 flex-shrink-0 ${isVendas ? 'text-lime-500' : 'text-blue-500'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Rodapé com atalho para criar novo assistente */}
            <div className="border-t border-gray-100 dark:border-white/5">
              <Link
                href="/dashboard/assistentes/create"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                  text-blue-600 dark:text-blue-400
                  hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-blue-500" />
                </div>
                Crie seu assistente
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
