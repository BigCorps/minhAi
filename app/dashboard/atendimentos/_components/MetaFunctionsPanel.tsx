// components/dashboard/meta/MetaFunctionsPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import FunctionConfigModal from '@/components/dashboard/functions/FunctionConfigModal';

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
  // enabled_gpt?: boolean; // GPT — ainda não implementado
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

// Funções que possuem modal de configuração (mesma lista do FunctionCard)
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

// ─── Pill shared classes (idênticas ao page.tsx) ──────────────────────────────

const pillCommon =
  'inline-flex items-center justify-center gap-1.5 ' +
  'px-3 py-1.5 rounded-full text-xs sm:text-base font-medium border ' +
  'transition-all duration-150 whitespace-nowrap';

const pillInactive =
  'bg-transparent ' +
  'text-gray-700 border-gray-300 hover:border-gray-500 hover:text-gray-900 ' +
  'dark:text-gray-300 dark:border-white/20 dark:hover:border-white/40 dark:hover:text-white';

const pillActiveNeutral =
  'bg-gray-800 text-white border-gray-800 shadow-sm ' +
  'dark:bg-white dark:text-gray-900 dark:border-white';

const pillActiveColored = 'text-white shadow-sm border-transparent';

// ─── Switch simples sem shadcn ────────────────────────────────────────────────

function SimpleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function FunctionBadges({
  fn,
  compact = false,
}: {
  fn: MetaFunction;
  compact?: boolean;
}) {
  const base = compact
    ? 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full'
    : 'text-xs font-medium px-2 py-0.5 rounded-full';

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {/* Todas as funções funcionam na IA */}
      <span className={`${base} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
        IA
      </span>

      {/* Disponível também nos serviços Meta */}
      {fn.enabled_meta && (
        <span className={`${base} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300`}>
          Meta
        </span>
      )}

      {/* Requer plano pago */}
      {fn.is_premium && (
        <span className={`${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300`}>
          Premium
        </span>
      )}

      {/* fn.enabled_gpt && (
        <span className={`${base} bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300`}>
          GPT
        </span>
      ) */}
    </div>
  );
}

// ─── MetaFunctionCard ─────────────────────────────────────────────────────────

function MetaFunctionCard({
  fn,
  isEnabled,
  isUpdating,
  onToggle,
  onEdit,
  viewMode,
}: {
  fn: MetaFunction;
  isEnabled: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onEdit: () => void;
  viewMode: 'grid' | 'list';
}) {
  const categoryName = CATEGORY_NAMES[fn.function_category] ?? fn.function_category;
  const hasEditModal = CONFIGURABLE_FUNCTIONS.includes(fn.function_key);

  // ── MODO LISTA ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => { if (hasEditModal) onEdit(); }}
        className={`relative border rounded-xl px-4 py-2.5 transition-all duration-300 flex items-center gap-3 ${
          hasEditModal ? 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/5' : ''
        } ${
          isEnabled
            ? 'bg-white dark:bg-slate-900 shadow-sm border-gray-200 dark:border-white/10'
            : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-white/10'
        }`}
      >
        {/* Bolinha categoria */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: fn.color || '#6B7280' }}
        />

        {/* Categoria */}
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 flex-shrink-0 truncate">
          {categoryName}
        </span>

        {/* Nome */}
        <span className="font-bold text-sm text-gray-900 dark:text-white truncate flex-shrink-0 w-36 sm:w-44">
          {fn.function_name}
        </span>

        {/* Badges compact */}
        <FunctionBadges fn={fn} compact />

        {/* Descrição */}
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1 hidden sm:block">
          {fn.short_description}
        </span>

        {/* Ações */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {hasEditModal && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              disabled={isUpdating}
              aria-label="Configurar função"
              title="Configurar função"
            >
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          {fn.consumes_credits && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              <span className="text-blue-500">©️</span>
              <span className="font-medium">{fn.credits_per_use}</span>
            </div>
          )}
          <div onClick={e => e.stopPropagation()}>
            <SimpleSwitch checked={isEnabled} onChange={onToggle} disabled={isUpdating} />
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

  // ── MODO GRID ───────────────────────────────────────────────────────────────
  return (
    <div
      onClick={() => { if (hasEditModal) onEdit(); }}
      className={`relative border rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between h-full ${
        hasEditModal ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        isEnabled
          ? 'bg-white dark:bg-slate-900 shadow-sm border-gray-200 dark:border-white/10'
          : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-white/10'
      }`}
    >
      <div className="flex-grow">
        {/* Linha superior: categoria (esq.) + badges (dir.) */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: fn.color || '#6B7280' }}
            />
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
              <span className="font-medium">
                {fn.credits_per_use} crédito{fn.credits_per_use !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasEditModal && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              disabled={isUpdating}
              aria-label="Configurar função"
              title="Configurar função"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <div onClick={e => e.stopPropagation()}>
            <SimpleSwitch checked={isEnabled} onChange={onToggle} disabled={isUpdating} />
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
  companyId: string;
}

export default function MetaFunctionsPanel({ companyId }: MetaFunctionsPanelProps) {
  const [functions, setFunctions]   = useState<MetaFunction[]>([]);
  const [enabled, setEnabled]       = useState<Record<string, boolean>>({});
  const [loading, setLoading]       = useState(true);
  const [updating, setUpdating]     = useState<string | null>(null);
  const [editingFn, setEditingFn]   = useState<MetaFunction | null>(null);

  // Filtros — idênticos ao page.tsx
  const [searchQuery, setSearchQuery]           = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode]                 = useState<'grid' | 'list'>('grid');

  const supabase = createClient();

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  async function loadData() {
    setLoading(true);
    try {
      // Busca todas as funções ativas com enabled_meta
      const { data: fns } = await supabase
        .from('assistant_functions')
        .select('id, function_key, function_name, function_category, description, short_description, icon, color, is_premium, consumes_credits, credits_per_use, edit_modal_component, default_enabled, enabled_meta')
        .eq('is_active', true)
        .eq('enabled_meta', true)   // Só funções meta
        .order('display_order');

      setFunctions(fns ?? []);

      // Estado de ativação por empresa (company_meta_function_settings)
      const { data: settings } = await supabase
        .from('company_meta_function_settings')
        .select('function_key, is_enabled')
        .eq('company_id', companyId);

      const map: Record<string, boolean> = {};
      for (const fn of fns ?? []) {
        const s = (settings ?? []).find(s => s.function_key === fn.function_key);
        map[fn.function_key] = s ? s.is_enabled : (fn.default_enabled ?? false);
      }
      setEnabled(map);
    } catch (err) {
      console.error('MetaFunctionsPanel: erro ao carregar', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Toggle ─────────────────────────────────────────────────────────────────

  async function handleToggle(functionKey: string) {
    setUpdating(functionKey);
    const next = !enabled[functionKey];
    try {
      await supabase
        .from('company_meta_function_settings')
        .upsert(
          { company_id: companyId, function_key: functionKey, is_enabled: next },
          { onConflict: 'company_id,function_key' }
        );
      setEnabled(prev => ({ ...prev, [functionKey]: next }));
    } catch (err) {
      console.error('Erro ao atualizar função Meta:', err);
    } finally {
      setUpdating(null);
    }
  }

  // ── Filtros ────────────────────────────────────────────────────────────────

  const isAllSelected = selectedCategories.length === 0;

  function handleToggleCategory(key: string) {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  const filtered = functions.filter(fn => {
    const matchesCat  = isAllSelected || selectedCategories.includes(fn.function_category);
    const matchesSearch =
      fn.function_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fn.short_description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ── Search input class (idêntico ao page.tsx) ──────────────────────────────

  const searchInputClass =
    'w-full pl-10 pr-4 py-2 rounded-lg border ' +
    'bg-white text-gray-900 border-gray-300 placeholder-gray-400 ' +
    'dark:bg-slate-800 dark:text-white dark:border-white/10 dark:placeholder-gray-500 ' +
    'focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  // ── Render ─────────────────────────────────────────────────────────────────

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

  // Categorias presentes nas funções carregadas (para não exibir pills vazios)
  const presentCategoryKeys = [...new Set(functions.map(f => f.function_category))];
  const filteredCategories = categories.filter(c => presentCategoryKeys.includes(c.key));

  return (
    <div className="space-y-6">

      {/* ── FILTER BAR (idêntica ao page.tsx) ──────────────────────────────── */}
      <div className="flex flex-col gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">

        {/* Linha superior: busca + toggle grid/lista */}
        <div className="flex items-center gap-3">
          <div className="relative flex-grow min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar função..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={searchInputClass}
            />
          </div>

          {/* Toggle grid / lista */}
          <div className="flex items-center border border-gray-300 dark:border-white/10 rounded-lg p-1 dark:bg-slate-800 flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
              }`}
              aria-label="Visualização em grade"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
              }`}
              aria-label="Visualização em lista"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Pills de categoria — apenas as categorias presentes */}
        <div className="flex flex-wrap gap-2">
          {/* Todas as Funções */}
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
                onClick={() => handleToggleCategory(cat.key)}
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

      {/* ── Cards ──────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10">
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma função encontrada com os filtros selecionados.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* Lista */
        <div className="space-y-2">
          {filtered.map(fn => (
            <MetaFunctionCard
              key={fn.id}
              fn={fn}
              isEnabled={!!enabled[fn.function_key]}
              isUpdating={updating === fn.function_key}
              onToggle={() => handleToggle(fn.function_key)}
              onEdit={() => setEditingFn(fn)}
              viewMode="list"
            />
          ))}
        </div>
      ) : (
        /* Grid — rows de 3 (igual ao page.tsx) */
        <div className="flex flex-col gap-6">
          {Array.from({ length: Math.ceil(filtered.length / 3) }, (_, rowIdx) => {
            const row = filtered.slice(rowIdx * 3, rowIdx * 3 + 3);
            const colClass =
              row.length === 1 ? 'grid-cols-1' :
              row.length === 2 ? 'grid-cols-2' :
              'grid-cols-3';
            return (
              <div key={rowIdx} className={`grid gap-6 ${colClass}`}>
                {row.map(fn => (
                  <MetaFunctionCard
                    key={fn.id}
                    fn={fn}
                    isEnabled={!!enabled[fn.function_key]}
                    isUpdating={updating === fn.function_key}
                    onToggle={() => handleToggle(fn.function_key)}
                    onEdit={() => setEditingFn(fn)}
                    viewMode="grid"
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de config compartilhado com page.tsx ──────────────────────
           Usa o mesmo FunctionConfigModal que as funções do assistente.
           Quando o usuário salva aqui, a config é atualizada na tabela
           `companies` — a mesma lida pelo assistente padrão. Configuração
           única, refletida nos dois painéis automaticamente.
      ──────────────────────────────────────────────────────────────────── */}
      {editingFn && (
        <FunctionConfigModal
          isOpen={!!editingFn}
          onClose={() => setEditingFn(null)}
          functionData={editingFn}
          companyId={companyId}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
