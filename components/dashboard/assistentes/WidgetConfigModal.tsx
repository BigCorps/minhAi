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

type Language = 'HTML' | 'React' | 'Next.js' | 'Vue' | 'Angular' | 'Svelte' | 'WordPress' | 'Webflow';

const LANGUAGES: Language[] = ['HTML', 'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'WordPress', 'Webflow'];

function buildSnippets(slug: string, color: string, text: string, position: string, buttonSize: string, popupSize: string): Record<Language, { code: string; note: string }> {
  const htmlTag = `<script\n  src="https://minhai.app/widget.js"\n  data-slug="${slug}"\n  data-cor="${color}"\n  data-texto="${text}"\n  data-posicao="${position}"\n  data-button-size="${buttonSize}"\n  data-popup-size="${popupSize}"\n><\/script>`;

  return {
    HTML: {
      note: 'Cole antes do </body>. O script detecta os data-attributes diretamente na tag.',
      code: `<!-- Cole antes do </body> -->\n${htmlTag}`,
    },
    React: {
      note: 'O document.currentScript é null em scripts dinâmicos. O widget usa querySelector como fallback automático. O guard evita duplicação no StrictMode.',
      code: `import { useEffect } from 'react';

export default function MinhAiWidget() {
  useEffect(() => {
    // Evita duplicação (React StrictMode / hot reload)
    if (document.getElementById('minhai-widget-button')) return;

    const script = document.createElement('script');
    script.src = 'https://minhai.app/widget.js';
    script.setAttribute('data-slug', '${slug}');
    script.setAttribute('data-cor', '${color}');
    script.setAttribute('data-texto', '${text}');
    script.setAttribute('data-posicao', '${position}');
    script.setAttribute('data-button-size', '${buttonSize}');
    script.setAttribute('data-popup-size', '${popupSize}');
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.getElementById('minhai-widget-button')?.remove();
      document.getElementById('minhai-widget-card')?.remove();
      document.querySelector(
        'script[src*="minhai.app/widget.js"]'
      )?.remove();
    };
  }, []);

  return null;
}`,
    },
    'Next.js': {
      note: "Use 'use client' obrigatório. Em Next.js 13+ com App Router, coloque o componente no layout.tsx ou page.tsx.",
      code: `'use client';

import { useEffect } from 'react';

export default function MinhAiWidget() {
  useEffect(() => {
    if (document.getElementById('minhai-widget-button')) return;

    const script = document.createElement('script');
    script.src = 'https://minhai.app/widget.js';
    script.setAttribute('data-slug', '${slug}');
    script.setAttribute('data-cor', '${color}');
    script.setAttribute('data-texto', '${text}');
    script.setAttribute('data-posicao', '${position}');
    script.setAttribute('data-button-size', '${buttonSize}');
    script.setAttribute('data-popup-size', '${popupSize}');
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.getElementById('minhai-widget-button')?.remove();
      document.getElementById('minhai-widget-card')?.remove();
      document.querySelector(
        'script[src*="minhai.app/widget.js"]'
      )?.remove();
    };
  }, []);

  return null;
}

// Em layout.tsx ou page.tsx:
// import MinhAiWidget from '@/components/MinhAiWidget';
// <MinhAiWidget />`,
    },
    Vue: {
      note: 'Funciona no Options API e Composition API. O onUnmounted garante limpeza ao trocar de rota.',
      code: `<template>
  <div style="display:none" />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  if (document.getElementById('minhai-widget-button')) return;

  const script = document.createElement('script');
  script.src = 'https://minhai.app/widget.js';
  script.setAttribute('data-slug', '${slug}');
  script.setAttribute('data-cor', '${color}');
  script.setAttribute('data-texto', '${text}');
  script.setAttribute('data-posicao', '${position}');
  script.setAttribute('data-button-size', '${buttonSize}');
  script.setAttribute('data-popup-size', '${popupSize}');
  script.async = true;
  document.body.appendChild(script);
});

onUnmounted(() => {
  document.getElementById('minhai-widget-button')?.remove();
  document.getElementById('minhai-widget-card')?.remove();
  document.querySelector(
    'script[src*="minhai.app/widget.js"]'
  )?.remove();
});
<\/script>`,
    },
    Angular: {
      note: 'Implemente na classe do componente raiz (AppComponent). Guarda a referência do script para remoção segura no ngOnDestroy.',
      code: `import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-minhai-widget',
  template: ''
})
export class MinhaiWidgetComponent implements OnInit, OnDestroy {
  private script: HTMLScriptElement | null = null;

  ngOnInit(): void {
    if (document.getElementById('minhai-widget-button')) return;

    this.script = document.createElement('script');
    this.script.src = 'https://minhai.app/widget.js';
    this.script.setAttribute('data-slug', '${slug}');
    this.script.setAttribute('data-cor', '${color}');
    this.script.setAttribute('data-texto', '${text}');
    this.script.setAttribute('data-posicao', '${position}');
    this.script.setAttribute('data-button-size', '${buttonSize}');
    this.script.setAttribute('data-popup-size', '${popupSize}');
    this.script.async = true;
    document.body.appendChild(this.script);
  }

  ngOnDestroy(): void {
    document.getElementById('minhai-widget-button')?.remove();
    document.getElementById('minhai-widget-card')?.remove();
    this.script?.remove();
  }
}`,
    },
    Svelte: {
      note: 'O onDestroy faz o cleanup automático ao desmontar o componente.',
      code: `<script>
  import { onMount, onDestroy } from 'svelte';

  onMount(() => {
    if (document.getElementById('minhai-widget-button')) return;

    const script = document.createElement('script');
    script.src = 'https://minhai.app/widget.js';
    script.setAttribute('data-slug', '${slug}');
    script.setAttribute('data-cor', '${color}');
    script.setAttribute('data-texto', '${text}');
    script.setAttribute('data-posicao', '${position}');
    script.setAttribute('data-button-size', '${buttonSize}');
    script.setAttribute('data-popup-size', '${popupSize}');
    script.async = true;
    document.body.appendChild(script);
  });

  onDestroy(() => {
    document.getElementById('minhai-widget-button')?.remove();
    document.getElementById('minhai-widget-card')?.remove();
    document.querySelector(
      'script[src*="minhai.app/widget.js"]'
    )?.remove();
  });
<\/script>`,
    },
    WordPress: {
      note: 'Cole no functions.php do seu tema ativo. O wp_footer garante carregamento correto na fila do WordPress.',
      code: `<?php
// Adicione no functions.php do seu tema

function minhai_widget_script() {
    ?>
    <script
        src="https://minhai.app/widget.js"
        data-slug="${slug}"
        data-cor="${color}"
        data-texto="${text}"
        data-posicao="${position}"
        data-button-size="${buttonSize}"
        data-popup-size="${popupSize}"
    ></script>
    <?php
}
add_action('wp_footer', 'minhai_widget_script');`,
    },
    Webflow: {
      note: 'No Webflow: acesse Project Settings → Custom Code → Footer Code e cole o snippet diretamente.',
      code: `<!-- Cole em: Project Settings → Custom Code → Footer Code -->\n${htmlTag}`,
    },
  };
}

export default function WidgetConfigModal({
  isOpen,
  onClose,
  companySlug,
  initialConfig,
  company: initialCompany,
  onUpdateSuccess,
}: WidgetConfigModalProps) {
  const supabase = createClient();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string>('');
  const [color, setColor] = useState('#3b82f6');
  const [text, setText] = useState('💬 Assistente');
  const [position, setPosition] = useState<'left' | 'right'>('right');
  const [buttonSize, setButtonSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [popupSize, setPopupSize] = useState<'small' | 'medium' | 'large'>('medium');

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<Language>('HTML');

  // Carrega os dados apenas uma vez quando a modal abre
  useEffect(() => {
    if (!isOpen) return;

    async function initializeData() {
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

  const snippets = buildSnippets(slug, color, text, position, buttonSize, popupSize);
  const currentSnippet = snippets[activeLanguage];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buttonPreviewStyles = {
    small:  { padding: '8px 16px',   fontSize: '12px' },
    medium: { padding: '10px 20px',  fontSize: '14px' },
    large:  { padding: '14px 28px',  fontSize: '16px' },
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
          widget_popup_size: popupSize,
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

                {/* Tamanho do Botão */}
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

                {/* Tamanho do Popup */}
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
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-4 h-4" /> Código do Snippet
              </h3>

              {/* Abas de linguagem */}
              <div className="flex flex-wrap gap-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => { setActiveLanguage(lang); setCopied(false); }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      activeLanguage === lang
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-500 hover:border-blue-300 hover:text-blue-500'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* Nota da linguagem */}
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 leading-relaxed">
                {currentSnippet.note}
              </p>

              {/* Bloco de código */}
              <div className="relative group">
                <pre className="p-4 bg-slate-950 text-blue-300 rounded-xl text-[12px] font-mono overflow-x-auto border border-white/10 min-h-[200px] max-h-[280px] overflow-y-auto leading-relaxed whitespace-pre">
                  {currentSnippet.code}
                </pre>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all flex items-center gap-2 text-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              {/* Preview do botão */}
              <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-white/10 relative min-h-[120px] flex items-center justify-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 absolute top-3 left-4 tracking-widest">Preview do Botão</span>
                <button
                  type="button"
                  style={{
                    backgroundColor: color,
                    padding: buttonPreviewStyles[buttonSize].padding,
                    fontSize: buttonPreviewStyles[buttonSize].fontSize,
                  }}
                  className="rounded-full text-white font-bold shadow-xl flex items-center gap-2 pointer-events-none transition-all duration-300"
                >
                  {text || '💬 Assistente'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="m6 9 6 6 6-6" />
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
