// components/layout/AssistantSelectorHeader.tsx
'use client';
import { useState } from 'react';
import { Bot, ChevronDown } from 'lucide-react';
import { useAssistant } from '@/contexts/AssistantContext';

export function AssistantSelectorHeader() {
  const {
    selectedAssistantId,
    selectedAssistantName,
    setSelectedAssistant,
    availableAssistants,
    loadingAssistants,
  } = useAssistant();
  const [isOpen, setIsOpen] = useState(false);

  if (loadingAssistants) {
    return <div className="animate-pulse h-9 w-44 rounded-lg bg-gray-200 dark:bg-slate-800" />;
  }

  if (availableAssistants.length === 0) return null;

  const current = availableAssistants.find(a => a.id === selectedAssistantId);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
          bg-white dark:bg-slate-800
          border-gray-300 dark:border-slate-700
          text-gray-900 dark:text-white
          hover:bg-gray-50 dark:hover:bg-slate-700"
      >
        <Bot className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="truncate max-w-[120px]">
          {current?.name || 'Selecione Assistente'}
        </span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute left-0 mt-2 w-64 rounded-lg border shadow-xl z-50 overflow-hidden
            bg-white dark:bg-slate-800
            border-gray-300 dark:border-slate-700">
            <div className="max-h-72 overflow-y-auto">
              {availableAssistants.map((assistant) => (
                <button
                  key={assistant.id}
                  onClick={() => {
                    setSelectedAssistant(assistant.id, assistant.name);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors text-left
                    ${assistant.id === selectedAssistantId
                      ? 'bg-blue-500/20 text-blue-900 dark:text-white'
                      : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${assistant.id === selectedAssistantId ? 'bg-blue-500/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
                    <Bot className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{assistant.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">/{assistant.slug}</p>
                  </div>
                  {assistant.id === selectedAssistantId && (
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
