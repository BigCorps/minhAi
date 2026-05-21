'use client';

import { useState } from 'react';
import { X, Copy, Check, ExternalLink, Code, Palette, Type, Layout } from 'lucide-react';

interface WidgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySlug: string;
  initialConfig: {
    color: string;
    text: string;
    position: 'left' | 'right';
  };
}

export default function WidgetConfigModal({ isOpen, onClose, companySlug, initialConfig }: WidgetConfigModalProps) {
  const [config, setConfig] = useState(initialConfig);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const snippet = `<script 
  src="https://minhai.app/widget.js" 
  data-slug="${companySlug}" 
  data-cor="${config.color}" 
  data-texto="${config.text}" 
  data-posicao="${config.position}"
></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-500" />
              Inserir Widget no Site
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Personalize e copie o código para seu site</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Coluna de Configuração */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Personalização
                </h3>
                
                {/* Cor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor do Botão</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={config.color}
                      onChange={(e) => setConfig({...config, color: e.target.value})}
                      className="h-10 w-20 rounded cursor-pointer bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={config.color}
                      onChange={(e) => setConfig({...config, color: e.target.value})}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Texto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Texto do Botão</label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      value={config.text}
                      onChange={(e) => setConfig({...config, text: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                      placeholder="Ex: Falar com Especialista"
                    />
                  </div>
                </div>

                {/* Posição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Posição na Tela</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setConfig({...config, position: 'left'})}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${config.position === 'left' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-500/30' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400'}`}
                    >
                      Esquerda
                    </button>
                    <button 
                      onClick={() => setConfig({...config, position: 'right'})}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${config.position === 'right' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-500/30' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400'}`}
                    >
                      Direita
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase mb-1">Instruções</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Copie o código ao lado e cole antes da tag <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">&lt;/head&gt;</code> ou <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">&lt;/body&gt;</code> do seu site. O widget aparecerá automaticamente.
                </p>
              </div>
            </div>

            {/* Coluna de Preview e Código */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-4 h-4" /> Código do Snippet
              </h3>
              
              <div className="relative group">
                <pre className="p-4 bg-slate-950 text-blue-400 rounded-xl text-[13px] font-mono overflow-x-auto border border-white/10 min-h-[160px]">
                  {snippet}
                </pre>
                <button 
                  onClick={copyToClipboard}
                  className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all flex items-center gap-2 text-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              <div className="p-6 bg-gray-100 dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-white/10 relative min-h-[120px] flex items-center justify-center">
                <span className="text-xs text-gray-400 absolute top-2 left-3">Preview do Botão</span>
                <button 
                  style={{ backgroundColor: config.color }}
                  className="px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-lg flex items-center gap-2 pointer-events-none"
                >
                  {config.text}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
}
