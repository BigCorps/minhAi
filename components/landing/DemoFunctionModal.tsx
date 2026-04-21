'use client';

import { X, CheckCircle2, Zap, Info, ArrowRight } from 'lucide-react';

interface DemoFunctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  functionData: {
    name: string;
    description: string;
    category: string;
    icon?: string;
  } | null;
  theme?: 'dark' | 'light';
}

export function DemoFunctionModal({ isOpen, onClose, functionData, theme = 'dark' }: DemoFunctionModalProps) {
  if (!isOpen || !functionData) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 border ${
          isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'
        }`}
      >
        {/* Header com Badge */}
        <div className={`px-6 py-5 border-b ${isDark ? 'border-white/10' : 'border-gray-100'} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Função Ativa</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-gray-100 text-slate-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl ${
            isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <Info className="w-10 h-10" />
          </div>
          
          <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {functionData.name}
          </h2>
          
          <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {functionData.description || "Esta função permite automatizar processos e facilitar o dia a dia do seu negócio através de inteligência artificial nativa."}
          </p>

          <div className={`w-full p-4 rounded-2xl border mb-8 flex items-start gap-3 text-left ${
            isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
          }`}>
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className={`text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Como funciona?</p>
              <p className={`text-[11px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Basta solicitar ao assistente por voz ou texto. A IA processa o comando e abre a interface específica para você em segundos.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group"
          >
            Entendi, quero usar
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}