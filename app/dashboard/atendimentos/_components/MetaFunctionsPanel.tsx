// app/dashboard/atendimentos/_components/MetaFunctionsPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MetaFunction {
  id: string;
  function_key: string;
  function_name: string;
  function_category: string;
  description: string;
  short_description: string;
  icon: string;
  color: string;
  is_premium: boolean;
  consumes_credits: boolean;
  credits_per_use: number;
  edit_modal_component?: string;
  default_enabled?: boolean;
  enabled_meta: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORY_NAMES: Record<string, string> = {
  knowledge:     'Consultas',
  configuration: 'Localização',
  contact:       'Contato',
  payment:       'Financeiro',
  schedule:      'Agendamento',
  information:   'Informação',
  ai_assistant:  'Conhecimento',
  video:         'Multimídia',
  biometry:      'Identificação',
  products:      'Comercial',
  images:        'Arquivos',
  codes:         'Câmera',
  utylities:     'Utilitários',
  services:      'Serviços',
};

const categories = [
  { key: 'ai_assistant',  name: 'Conhecimento', color: '#0000ff' },
  { key: 'products',      name: 'Comercial',    color: '#FF00FF' },
  { key: 'payment',       name: 'Financeiro',   color: '#F44336' },
  { key: 'information',   name: 'Informação',   color: '#00FFF7' },
  { key: 'video',         name: 'Multimídia',   color: '#A52A2A' },
  { key: 'schedule',      name: 'Agendamento',  color: '#FFC0CB' },
  { key: 'contact',       name: 'Contato',      color: '#10B981' },
  { key: 'configuration', name: 'Localização',  color: '#800080' },
  { key: 'knowledge',     name: 'Consultas',    color: '#FFFF00' },
  { key: 'biometry',      name: 'Identificação',color: '#808000' },
  { key: 'images',        name: 'Arquivos',     color: '#000080' },
  { key: 'utylities',     name: 'Utilitários',  color: '#FFA500' },
  { key: 'codes',         name: 'Câmera',       color: '#808080' },
  { key: 'services',      name: 'Serviços',     color: '#D2691E' },
];

const CONFIGURABLE_FUNCTIONS = [
  'qrcode_whatsapp','qrcode_instagram','qrcode_website','qrcode_facebook',
  'qrcode_email','qrcode_linkedin','qrcode_tiktok','qrcode_twitter','qrcode_telefone',
  'pix_generate','chatgpt','orcamento','endereco','faq','nossa_marca',
  'video_instrucoes','agendar_compromisso','ver_agenda','enviar_email',
  'link_pagamento','nfc_credito','nfc_debito','sequencia_videos','wifi_qrcode',
  'cardapio','nosso_qrcode','validar_cupom','imagem_em_texto','tabela_em_texto',
  'ler_qrcode','ler_codigo_barras','contrato_em_texto','fichas_producao_conversacional',
  'cancelar_agendamento','confirmar_presenca','reagendar_compromisso','horarios_disponiveis',
  'meu_cupom','cadastro','clima_tempo','tocar_video','tocar_musica',
  'impressao_local','impressao_remota','impressao_recibo',
  'modo_venda','ver_produtos','fazer_pedido','consultar_estoque','cadastrar_produto',
  'consultar_cep','playlist','porta_retrato','painel_ofertas','aparelhos_smart',
  'canal_youtube','identificar_fraude','segunda_via_boleto','rastreio_correios',
  'buscar_endereco','tracar_rota','criar_nota','lembrete_remedios','ver_noticias',
  'procurar_produto','chamar_gerente','pre_atendimento','responder_pesquisa',
  'tef_debito','tef_credito',
];

// Funções de sistema que aparecem com badge "Sempre ativo" ao invés de toggle
const SYSTEM_FUNCTIONS_META = new Set(['meu_sistema']);

// ─── Pill classes ─────────────────────────────────────────────────────────────

const pillCommon =
  'inline-flex items-center justify-center gap-1.5 ' +
  'px-3 py-1.5 rounded-full text-xs sm:text-base font-medium border ' +
  'transition-all duration-150 whitespace-nowrap';

const pillInactive =
  'bg-transparent text-gray-700 border-gray-300 hover:border-gray-500 hover:text-gray-900 ' +
  'dark:text-gray-300 dark:border-white/20 dark:hover:border-white/40 dark:hover:text-white';

const pillActiveNeutral =
  'bg-gray-800 text-white border-gray-800 shadow-sm ' +
  'dark:bg-white dark:text-gray-900 dark:border-white';

const pillActiveColored = 'text-white shadow-sm border-transparent';

// ─── SVGs inline (evita qualquer problema de import externo) ──────────────────

const IconSettings = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconX = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconGrid = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const IconList = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

// ─── Switch ───────────────────────────────────────────────────────────────────

function SimpleSwitch({ checked, onChange, disabled }: {
  checked: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        disabled:opacity-50 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
        ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function FunctionBadges({ fn, compact = false }: { fn: MetaFunction; compact?: boolean }) {
  const base = compact
    ? 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full'
    : 'text-xs font-medium px-2 py-0.5 rounded-full';

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <span className={`${base} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
        IA
      </span>
      {fn.enabled_meta && (
        <span className={`${base} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300`}>
          Meta
        </span>
      )}
      {fn.is_premium && (
        <span className={`${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300`}>
          Premium
        </span>
      )}
    </div>
  );
}

// ─── Mini-modal "Configurar em Funções" ───────────────────────────────────────

function ConfigRedirectModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200 dark:border-white/10 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <IconSettings size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <IconX size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-1">
          Configurar função
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          As configurações desta função são compartilhadas com o assistente padrão.
          Acesse a seção{' '}
          <strong className="text-gray-700 dark:text-gray-300">Funções</strong>{' '}
          para ajustá-la.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10
              text-sm font-medium text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-white/5 transition"
          >
            Cancelar
          </button>
          <a
            href="/dashboard/functions"
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700
              text-white text-sm font-semibold text-center transition"
          >
            Ir para Funções
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── MetaFunctionCard ─────────────────────────────────────────────────────────

function MetaFunctionCard({ fn, isEnabled, isUpdating, onToggle, onConfigClick, viewMode, isSystemFunction }: {
  fn: MetaFunction;
  isEnabled: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onConfigClick: () => void;
  viewMode: 'grid' | 'list';
  isSystemFunction: boolean;
}) {
  const categoryName = CATEGORY_NAMES[fn.function_category] ?? fn.function_category;
  const hasConfig = CONFIGURABLE_FUNCTIONS.includes(fn.function_key);

  if (viewMode === 'list') {
    return (
      <div className={`relative border rounded-xl px-4 py-2.5 flex items-center gap-3 transition-all duration-300 ${
        isEnabled
          ? 'bg-white dark:bg-slate-900 shadow-sm border-gray-200 dark:border-white/10'
          : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-white/10'
      }`}>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: fn.color || '#6B7280' }} />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 flex-shrink-0 truncate">
          {categoryName}
        </span>
        <span className="font-bold text-sm text-gray-900 dark:text-white truncate flex-shrink-0 w-36 sm:w-44">
          {fn.function_name}
        </span>
        <FunctionBadges fn={fn} compact />
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1 hidden sm:block">
          {fn.short_description}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {hasConfig && (
            <button
              onClick={e => { e.stopPropagation(); onConfigClick(); }}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              title="Configurar função"
            >
              <IconSettings size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}
          {fn.consumes_credits && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              <span className="text-blue-500">©️</span>
              <span className="font-medium">{fn.credits_per_use}</span>
            </div>
          )}
          <div onClick={e => e.stopPropagation()}>
            {isSystemFunction ? (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                Sempre ativo
              </span>
            ) : (
              <SimpleSwitch checked={isEnabled} onChange={onToggle} disabled={isUpdating} />
            )}
          </div>
        </div>
        {isUpdating && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-xl">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative border rounded-2xl p-4 flex flex-col justify-between h-full transition-all duration-300 ${
      isEnabled
        ? 'bg-white dark:bg-slate-900 shadow-sm border-gray-200 dark:border-white/10'
        : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-white/10'
    }`}>
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: fn.color || '#6B7280' }} />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              {categoryName}
            </span>
          </div>
          <FunctionBadges fn={fn} />
        </div>
        <h3 className="font-bold text-md text-gray-900 dark:text-white mb-1.5 truncate">
          {fn.function_name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 h-[40px]">
          {fn.short_description}
        </p>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          {fn.consumes_credits && (
            <>
              <span className="text-base leading-none">©️</span>
              <span className="font-medium">{fn.credits_per_use} crédito{fn.credits_per_use !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasConfig && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onConfigClick(); }}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              title="Configurar função"
            >
              <IconSettings size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <div onClick={e => e.stopPropagation()}>
            {isSystemFunction ? (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                Sempre ativo
              </span>
            ) : (
              <SimpleSwitch checked={isEnabled} onChange={onToggle} disabled={isUpdating} />
            )}
          </div>
        </div>
      </div>
      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-2xl">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface MetaFunctionsPanelProps {
  selectedCompanyId: string;
}

export function MetaFunctionsPanel({ selectedCompanyId }: MetaFunctionsPanelProps) {
  const companyId = selectedCompanyId;

  const [functions, setFunctions]     = useState<MetaFunction[]>([]);
  const [enabled, setEnabled]         = useState<Record<string, boolean>>({});
  const [loading, setLoading]         = useState(true);
  const [updating, setUpdating]       = useState<string | null>(null);
  const [configModal, setConfigModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode]       = useState<'grid' | 'list'>('grid');

  const supabase = createClient();

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: fns } = await supabase
        .from('assistant_functions')
        .select('id, function_key, function_name, function_category, description, short_description, icon, color, is_premium, consumes_credits, credits_per_use, edit_modal_component, default_enabled, enabled_meta')
        .eq('is_active', true)
        .eq('enabled_meta', true)
        .order('display_order');

      setFunctions(fns ?? []);

      const { data: settings } = await supabase
  .from('company_function_settings') // <-- Alterado aqui
  .select('function_key, meta_enabled') // <-- Ajuste o campo que deseja ler
  .eq('company_id', companyId);

      const map: Record<string, boolean> = {};
      for (const fn of fns ?? []) {
        const s = (settings ?? []).find(s => s.function_key === fn.function_key);
        map[fn.function_key] = s ? s.is_enabled : (fn.default_enabled ?? false);
      }
      setEnabled(map);
    } catch (err) {
      console.error('MetaFunctionsPanel:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(functionKey: string) {
    // Funções de sistema não podem ser desativadas
    if (SYSTEM_FUNCTIONS_META.has(functionKey)) {
      return;
    }
    
    setUpdating(functionKey);
    const next = !enabled[functionKey];
    try {
await supabase
  .from('company_function_settings') // <-- Alterado aqui
  .upsert(
    { 
      company_id: companyId, 
      function_key: functionKey, 
      meta_enabled: next // <-- Ajustado para a coluna existente no schema
    },
    { onConflict: 'company_id,function_key' } // (Certifique-se de que existe uma constraint unique para esses dois campos no banco)
  );
      setEnabled(prev => ({ ...prev, [functionKey]: next }));
    } catch (err) {
      console.error('Erro ao atualizar função Meta:', err);
    } finally {
      setUpdating(null);
    }
  }

  const isAllSelected = selectedCategories.length === 0;

  const filtered = functions.filter(fn => {
    const matchesCat = isAllSelected || selectedCategories.includes(fn.function_category);
    const matchesSearch =
      fn.function_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fn.short_description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const presentCategoryKeys = [...new Set(functions.map(f => f.function_category))];
  const filteredCategories = categories.filter(c => presentCategoryKeys.includes(c.key));

  const searchInputClass =
    'w-full pl-10 pr-4 py-2 rounded-lg border ' +
    'bg-white text-gray-900 border-gray-300 placeholder-gray-400 ' +
    'dark:bg-slate-800 dark:text-white dark:border-white/10 dark:placeholder-gray-500 ' +
    'focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (functions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Nenhuma função Meta disponível no momento.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Filter bar */}
      <div className="flex flex-col gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar função..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={searchInputClass}
            />
          </div>
          {/* Toggle só no desktop */}
          <div className="hidden sm:flex items-center border border-gray-300 dark:border-white/10 rounded-lg p-1 dark:bg-slate-800 flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'}`}
            >
              <IconGrid />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'}`}
            >
              <IconList />
            </button>
          </div>
        </div>

        {/* Pills */}
        {/* Mobile: grid 3 colunas */}
        <div className="sm:hidden flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedCategories([])}
              className={`${pillCommon} ${isAllSelected ? pillActiveNeutral : pillInactive}`}
            >
              Todas as Funções
            </button>
            {filteredCategories.slice(0, 2).map(cat => {
              const isSelected = selectedCategories.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategories(prev =>
                    prev.includes(cat.key) ? prev.filter(k => k !== cat.key) : [...prev, cat.key]
                  )}
                  className={`${pillCommon} ${isSelected ? pillActiveColored : pillInactive}`}
                  style={isSelected ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : cat.color }}
                  />
                  {cat.name}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {filteredCategories.slice(2).map(cat => {
              const isSelected = selectedCategories.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategories(prev =>
                    prev.includes(cat.key) ? prev.filter(k => k !== cat.key) : [...prev, cat.key]
                  )}
                  className={`${pillCommon} ${isSelected ? pillActiveColored : pillInactive}`}
                  style={isSelected ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : cat.color }}
                  />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop: flex-wrap centralizado */}
        <div className="hidden sm:flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setSelectedCategories([])}
            className={`${pillCommon} ${isAllSelected ? pillActiveNeutral : pillInactive}`}
          >
            Todas as Funções
          </button>
          {filteredCategories.map(cat => {
            const isSelected = selectedCategories.includes(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategories(prev =>
                  prev.includes(cat.key) ? prev.filter(k => k !== cat.key) : [...prev, cat.key]
                )}
                className={`${pillCommon} ${isSelected ? pillActiveColored : pillInactive}`}
                style={isSelected ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : cat.color }}
                />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
          <p className="text-gray-500 dark:text-gray-400">Nenhuma função encontrada.</p>
        </div>
      ) : (
        <>
          {/* Mobile: 1 card por linha, sem toggle */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map(fn => (
              <MetaFunctionCard
                key={fn.id}
                fn={fn}
                isEnabled={!!enabled[fn.function_key]}
                isUpdating={updating === fn.function_key}
                onToggle={() => handleToggle(fn.function_key)}
                onConfigClick={() => setConfigModal(true)}
                viewMode="grid"
                isSystemFunction={SYSTEM_FUNCTIONS_META.has(fn.function_key)}
              />
            ))}
          </div>

          {/* Desktop: lista ou grid 3 colunas */}
          <div className="hidden sm:block">
            {viewMode === 'list' ? (
              <div className="space-y-2">
                {filtered.map(fn => (
                  <MetaFunctionCard
                    key={fn.id}
                    fn={fn}
                    isEnabled={!!enabled[fn.function_key]}
                    isUpdating={updating === fn.function_key}
                    onToggle={() => handleToggle(fn.function_key)}
                    onConfigClick={() => setConfigModal(true)}
                    viewMode="list"
                    isSystemFunction={SYSTEM_FUNCTIONS_META.has(fn.function_key)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {Array.from({ length: Math.ceil(filtered.length / 3) }, (_, i) => {
                  const row = filtered.slice(i * 3, i * 3 + 3);
                  const cols = row.length === 1 ? 'grid-cols-1' : row.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
                  return (
                    <div key={i} className={`grid gap-6 ${cols}`}>
                      {row.map(fn => (
                        <MetaFunctionCard
                          key={fn.id}
                          fn={fn}
                          isEnabled={!!enabled[fn.function_key]}
                          isUpdating={updating === fn.function_key}
                          onToggle={() => handleToggle(fn.function_key)}
                          onConfigClick={() => setConfigModal(true)}
                          viewMode="grid"
                          isSystemFunction={SYSTEM_FUNCTIONS_META.has(fn.function_key)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Mini-modal */}
      {configModal && <ConfigRedirectModal onClose={() => setConfigModal(false)} />}

    </div>
  );
}
