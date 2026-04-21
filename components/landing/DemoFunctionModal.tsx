'use client';

// components/landing/DemoFunctionModal.tsx
// Modal de demonstração da landing page.
// Mostra os dados reais da função (nome, descrição, ícone, cor do banco)
// mas NÃO executa nenhuma ação — apenas apresenta e convida ao cadastro.

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X, ArrowRight, Zap, Lock } from 'lucide-react';
import Link from 'next/link';
import type { DemoFunctionData } from './LandingDemoFooter';

interface DemoFunctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  functionData: DemoFunctionData | null;
  theme?: 'dark' | 'light';
}

// Mapa de categorias para label amigável e emoji
const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  ai_assistant:  { label: 'Inteligência Artificial', emoji: '🤖' },
  payment:       { label: 'Financeiro',               emoji: '💳' },
  schedule:      { label: 'Agendamento',              emoji: '📅' },
  products:      { label: 'Comercial',                emoji: '🛍️' },
  biometry:      { label: 'Identificação',            emoji: '👤' },
  knowledge:     { label: 'Consultas',                emoji: '🔍' },
  codes:         { label: 'Câmera & Códigos',         emoji: '📷' },
  images:        { label: 'Arquivos & Imagens',       emoji: '🖼️' },
  video:         { label: 'Multimídia',               emoji: '▶️' },
  contact:       { label: 'Contatos',                 emoji: '🟢' },
  services:      { label: 'Serviços',                 emoji: '🟠' },
  configuration: { label: 'Localização',              emoji: '📍' },
  information:   { label: 'Informação',               emoji: '📡' },
  utylities:     { label: 'Utilitários',              emoji: '⏱️' },
};

export function DemoFunctionModal({
  isOpen,
  onClose,
  functionData,
  theme = 'dark',
}: DemoFunctionModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  // Disparar evento para o carrossel sumir enquanto modal está aberto
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    } else {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    }
  }, [isOpen]);

  if (!isOpen || !functionData || !mounted) return null;

  const isDark = theme === 'dark';
  const catInfo = CATEGORY_LABELS[functionData.category] ?? { label: 'Demonstração', emoji: '✨' };

  // Cor principal da função (do banco) ou fallback azul
  const accentColor = functionData.color && functionData.color !== '#' && functionData.color.startsWith('#')
    ? functionData.color
    : '#3B82F6';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border ${
          isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'
        }`}
        style={{ animation: 'demoModalIn 0.25s ease-out' }}
      >
        {/* Faixa colorida no topo com a cor da função */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }}
        />

        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-white/8' : 'border-gray-100'
        }`}>
          <div className="flex items-center gap-2">
            {/* Badge categoria */}
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isDark ? 'bg-white/8 text-white/60' : 'bg-gray-100 text-gray-500'
            }`}>
              <span aria-hidden="true">{catInfo.emoji}</span>
              {catInfo.label}
            </span>
            {/* Badge demo */}
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Zap className="w-3 h-3 fill-current" aria-hidden="true" />
              Demo
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors ${
              isDark ? 'hover:bg-white/8 text-slate-400' : 'hover:bg-gray-100 text-slate-500'
            }`}
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">

          {/* Ícone da função com cor do banco */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl shadow-lg"
            style={{
              backgroundColor: `${accentColor}20`,
              border: `1.5px solid ${accentColor}40`,
            }}
            aria-hidden="true"
          >
            {functionData.icon && functionData.icon !== '' ? functionData.icon : '⚡'}
          </div>

          {/* Nome real da função */}
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {functionData.name}
          </h2>

          {/* Descrição real do banco */}
          <p className={`text-xs leading-relaxed mb-5 max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {functionData.short_description || functionData.description}
          </p>

          {/* Aviso de modo demo */}
          <div className={`w-full px-4 py-3 rounded-2xl border mb-5 flex items-start gap-3 text-left ${
            isDark ? 'bg-amber-500/8 border-amber-500/20' : 'bg-amber-50 border-amber-200'
          }`}>
            <Lock className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} aria-hidden="true" />
            <div>
              <p className={`text-[11px] font-bold mb-0.5 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                Modo demonstração
              </p>
              <p className={`text-[10px] leading-snug ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>
                Esta é uma prévia da função. Crie sua conta grátis para ativá-la com dados reais do seu negócio.
              </p>
            </div>
          </div>

          {/* CTA principal — leva para /login */}
          <Link
            href="/login"
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 group transition-all hover:brightness-110 hover:scale-[1.02] shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
          >
            Ativar esta função no meu negócio
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>

          {/* Link secundário */}
          <button
            onClick={onClose}
            className={`mt-3 text-xs font-medium transition-colors ${
              isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Continuar explorando as funções
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes demoModalIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}
