'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Code, Palette, Type, Layout } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface WidgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySlug?: string;
  initialConfig?: {
    color: string;
    text: string;
    position: 'left' | 'right';
  };
  company?: {
    id: string;
    slug: string;
    widget_color?: string;
    widget_text?: string;
    widget_position?: 'left' | 'right';
    widget_popup_size?: 'small' | 'medium' | 'large';
    widget_button_size?: 'small' | 'medium' | 'large';
  };
  onUpdateSuccess?: () => void;
}

export default function WidgetConfigModal({ 
  isOpen, 
  onClose, 
  companySlug, 
  initialConfig, 
  company: initialCompany, 
  onUpdateSuccess 
}: WidgetConfigModalProps) {
  
  const supabase = createClient();
  
  // Estados para dados de identificação da empresa
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string>('');

  // Estados das configurações dos inputs controlados da UI
  const [color, setColor] = useState('#3b82f6');
  const [text, setText] = useState('💬 Assistente');
  const [position, setPosition] = useState<'left' | 'right'>('right');
  const [buttonSize, setButtonSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [popupSize, setPopupSize] = useState<'small' | 'medium' | 'large'>('medium');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [copied, setCopied] = useState(false);

  // Carrega os dados apenas uma vez quando a modal abre
  useEffect(() => {
    if (!isOpen) return;

    async function initializeData() {
      // Cenário 1: O objeto completo da empresa já foi fornecido pela página pai
      if (initialCompany?.id) {
        setCompanyId(initialCompany.id);
        setSlug(initialCompany.slug);
        setColor(initialCompany.widget_color || '#3b82f6');
        setText(initialCompany.widget_text || '💬 Assistente');
        setPosition(initialCompany.widget_position || 'right');
        setButtonSize(initialCompany.widget_button_size || 'medium');
        setPopupSize(initialCompany.widget_popup_size || 'medium');
        return;
      }

      // Cenário 2: Fornecido apenas o slug, busca o restante das propriedades no banco
      const targetSlug = companySlug || initialCompany?.slug;
      if (targetSlug) {
        setFetching(true);
        try {
          const { data, error } = await supabase
            .from('companies')
            .select('id, slug, widget_color, widget_text, widget_position, widget_button_size, widget_popup_size')
            .eq('slug', targetSlug)
            .single();

          if (data && !error) {
            setCompanyId(data.id);
            setSlug(data.slug);
            setColor(data.widget_color || '#3b82f6');
            setText(data.widget_text || '💬 Assistente');
            setPosition(data.widget_position || 'right');
            setButtonSize((data.widget_button_size as any) || 'medium');
            setPopupSize((data.widget_popup_size as any) || 'medium');
            return;
          }
        } catch (err) {
          console.error('Erro ao buscar dados complementares da empresa:', err);
        } finally {
          setFetching(false);
        }
      }

      // Cenário 3: Fallback final para os configs estáticos legados do pai
      if (initialConfig) {
        setColor(initialConfig.color);
        setText(initialConfig.text);
        setPosition(initialConfig.position);
      }
      if (companySlug) setSlug(companySlug);
    }

    initializeData();
  }, [isOpen]); // ATENÇÃO: Executa estritamente na abertura do Modal para liberar digitação livre nos inputs

  if (!isOpen) return null;

  const snippet = `<script 
  src="https://minhai.app/widget.js" 
  data-slug="${slug}" 
  data-cor="${color}" 
  data-texto="${text}" 
  data-posicao="${position}"
  data-button-size="${buttonSize}"
  data-popup-size="${popupSize}"
></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buttonPreviewStyles = {
    small: { padding: '8px 16px', fontSize: '12px' },
    medium: { padding: '10px 20px', fontSize: '14px' },
    large: { padding: '14px 28px', fontSize: '16px' }
  };

  const handleSave = async () => {
    if (!companyId) {
      alert('Aviso: ID da empresa não localizado. Configurações salvas apenas localmente.');
      onClose();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          widget_color: color,
          widget_text: text,
          widget_position: position,
          widget_button_size: buttonSize,
          widget_popup_size: popupSize
        })
        .eq('id', companyId);

      if (error) throw error;

      if (onUpdateSuccess) onUpdateSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar configurações no Supabase:', err);
      alert('Erro ao salvar no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[95vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-500" />
              Configurar Widget do Cliente
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {fetching ? 'Carregando dados sincronizados...' : 'Ajuste as dimensões e o comportamento visual'}
            </p>
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
                  <Palette className="w-4 h-4" /> Estilização e Escala
                </h3>
                
                {/* Cor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor do Botão</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 w-20 rounded cursor-pointer bg-transparent border-none"
                    />
                    <input 
                      type="text" 
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-mono"
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
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Tamanho do Botão (Launcher) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tamanho do Botão</label>
                  <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['small', 'medium', 'large'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setButtonSize(s)}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${buttonSize === s ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        {s === 'small' ? 'Pequeno' : s === 'medium' ? 'Médio' : 'Grande'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tamanho do Popup (Janela) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tamanho da Janela (Popup)</label>
                  <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['small', 'medium', 'large'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPopupSize(s)}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${popupSize === s ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        {s === 'small' ? '320x560' : s === 'medium' ? '420x720' : '520x860'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Posição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Posição na Tela</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setPosition('left')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${position === 'left' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-500/30' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-500'}`}
                    >
                      Esquerda
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPosition('right')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${position === 'right' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-500/30' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-500'}`}
                    >
                      Direita
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna de Preview e Código */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-4 h-4" /> Código do Snippet
              </h3>
              
              <div className="relative group">
                <pre className="p-4 bg-slate-950 text-blue-300 rounded-xl text-[12px] font-mono overflow-x-auto border border-white/10 min-h-[180px] leading-relaxed">
                  {snippet}
                </pre>
                <button 
                  type="button"
                  onClick={copyToClipboard}
                  className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all flex items-center gap-2 text-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar Snippet'}
                </button>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-white/10 relative min-h-[140px] flex items-center justify-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 absolute top-3 left-4 tracking-widest">Preview do Botão</span>
                <button 
                  type="button"
                  style={{ 
                    backgroundColor: color,
                    padding: buttonPreviewStyles[buttonSize].padding,
                    fontSize: buttonPreviewStyles[buttonSize].fontSize
                  }}
                  className="rounded-full text-white font-bold shadow-xl flex items-center gap-2 pointer-events-none transition-all duration-300"
                >
                  {text || '💬 Assistente'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex justify-end">
          <button 
            type="button"
            onClick={handleSave}
            disabled={loading || fetching}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold transition-all flex items-center gap-2"
          >
            {loading ? 'Salvando...' : 'Salvar e Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
}
