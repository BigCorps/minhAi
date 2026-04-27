'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/MetaFunctionsPanel.tsx
//
// Exibe todas as funções com enabled_meta = true da tabela assistant_functions.
// O toggle de cada função controla meta_connections.[function_key]_enabled
// para a conexão ativa do assistente selecionado.

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Switch } from '@/components/ui/switch';
import {
  Loader2, Search, Zap, AlertCircle,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────

interface MetaFunction {
  id: string;
  function_key: string;
  function_name: string;
  function_category: string;
  description: string;
  short_description: string | null;
  icon: string | null;
  color: string | null;
  credits_per_use: number;
  consumes_credits: boolean;
  display_order: number;
  enabled_meta: boolean;
}

interface MetaConnection {
  id: string;
  [key: string]: any; // colunas _enabled dinâmicas
}

// ─── Mapeamento de categorias ─────────────────────────────────────────────

const CATEGORIES: Record<string, { name: string; color: string }> = {
  ai_assistant:  { name: 'Conhecimento',  color: '#0000ff' },
  products:      { name: 'Comercial',     color: '#FF00FF' },
  payment:       { name: 'Financeiro',    color: '#F44336' },
  information:   { name: 'Informação',    color: '#00FFF7' },
  video:         { name: 'Multimídia',    color: '#A52A2A' },
  schedule:      { name: 'Agendamento',   color: '#FFC0CB' },
  contact:       { name: 'Contato',       color: '#10B981' },
  configuration: { name: 'Localização',   color: '#800080' },
  knowledge:     { name: 'Consultas',     color: '#FFFF00' },
  biometry:      { name: 'Identificação', color: '#808000' },
  images:        { name: 'Arquivos',      color: '#000080' },
  utylities:     { name: 'Utilitários',   color: '#FFA500' },
  codes:         { name: 'Câmera',        color: '#808080' },
  services:      { name: 'Serviços',      color: '#D2691E' },
};

// Coluna em meta_connections para cada function_key
// Convenção: [function_key]_enabled
// Para funções que já existiam antes das novas colunas, mapeamos para o campo legado
const LEGACY_FIELD_MAP: Record<string, string> = {
  faq:              'faq_enabled',
  pix_generate:     'pix_enabled',
  pix_confirm:      'pix_enabled',
  nossa_marca:      'nossa_marca_enabled',
  endereco:         'endereco_enabled',
  orcamento:        'orcamento_enabled',
  meta_reply:       'prompt_enabled',
  contacts:         'contacts_enabled',
  ver_agenda:       'ver_agenda_enabled',
  agendar_compromisso: 'agendar_enabled',
  reagendar_compromisso: 'agendar_enabled',
  confirmar_presenca: 'agendar_enabled',
  cancelar_agendamento: 'agendar_enabled',
  horarios_disponiveis: 'agendar_enabled',
  enviar_email:     'email_enabled',
};

function getConnectionField(functionKey: string): string {
  return LEGACY_FIELD_MAP[functionKey] ?? `${functionKey}_enabled`;
}

// Funções que controlam campos compartilhados (não têm toggle próprio)
const SHARED_FIELD_KEYS = new Set([
  'pix_confirm',
  'reagendar_compromisso',
  'confirmar_presenca',
  'cancelar_agendamento',
  'horarios_disponiveis',
]);

// Pill de filtro
const pillBase = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap';
const pillOff  = 'bg-transparent text-gray-700 border-gray-300 hover:border-gray-500 dark:text-gray-300 dark:border-white/20 dark:hover:border-white/40';
const pillOn   = 'text-white shadow-sm border-transparent';
const pillNeutralOn = 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-gray-900 dark:border-white';

// ─── Card de função Meta ──────────────────────────────────────────────────

function MetaFunctionCard({
  fn,
  isEnabled,
  isUpdating,
  onToggle,
}: {
  fn: MetaFunction;
  isEnabled: boolean;
  isUpdating: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const cat = CATEGORIES[fn.function_category];
  const catColor = fn.color || cat?.color || '#6b7280';
  const catName  = cat?.name || fn.function_category;
  const isShared = SHARED_FIELD_KEYS.has(fn.function_key);

  return (
    <div className={`relative rounded-xl border transition-all
      ${isEnabled
        ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700/50 shadow-sm'
        : 'bg-white/60 dark:bg-slate-900/60 border-gray-200 dark:border-white/10'
      }`}
    >
      {/* Barra de cor da categoria */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
        style={{ backgroundColor: catColor }}
      />

      <div className="p-4 pt-5">
        {/* Linha superior: categoria + badge Meta */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: catColor }}
            />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {catName}
            </span>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            Meta
          </span>
        </div>

        {/* Ícone + nome */}
        <div className="flex items-start gap-3 mb-3">
          {fn.icon && (
            <span className="text-xl leading-none mt-0.5">{fn.icon}</span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
              {fn.function_name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {fn.short_description || fn.description}
            </p>
          </div>
        </div>

        {/* Rodapé: créditos + toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="text-yellow-500">©</span>
            {fn.consumes_credits
              ? `${fn.credits_per_use} crédito${fn.credits_per_use !== 1 ? 's' : ''}`
              : 'Grátis'
            }
          </div>

          {isShared ? (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
              via agendamento
            </span>
          ) : isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export function MetaFunctionsPanel({ selectedCompanyId }: { selectedCompanyId: string }) {
  const supabase = createClient();

  const [functions, setFunctions]       = useState<MetaFunction[]>([]);
  const [connection, setConnection]     = useState<MetaConnection | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [updating, setUpdating]         = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedCat, setSelectedCat]   = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // ── Carregar funções + conexão ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedCompanyId) return;
    loadData();
  }, [selectedCompanyId]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      // Funções habilitadas para Meta
      const { data: fns, error: fnErr } = await supabase
        .from('assistant_functions')
        .select('id, function_key, function_name, function_category, description, short_description, icon, color, credits_per_use, consumes_credits, display_order, enabled_meta')
        .eq('enabled_meta', true)
        .eq('is_active', true)
        .order('display_order');

      if (fnErr) throw fnErr;

      // Conexão ativa da empresa
      const { data: conn, error: connErr } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .limit(1)
        .maybeSingle();

      if (connErr) throw connErr;

      setFunctions(fns || []);
      setConnection(conn || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Estado de enable de cada função ───────────────────────────────────
  function isFunctionEnabled(fn: MetaFunction): boolean {
    if (!connection) return false;
    const field = getConnectionField(fn.function_key);
    return connection[field] === true;
  }

  // ── Toggle ─────────────────────────────────────────────────────────────
  async function handleToggle(fn: MetaFunction, newValue: boolean) {
    if (!connection) return;
    const field = getConnectionField(fn.function_key);

    setUpdating(fn.function_key);
    try {
      const { error: updateErr } = await supabase
        .from('meta_connections')
        .update({ [field]: newValue })
        .eq('id', connection.id);

      if (updateErr) throw updateErr;

      // Atualizar localmente
      setConnection(prev => prev ? { ...prev, [field]: newValue } : prev);
    } catch (e: any) {
      console.error('Erro ao atualizar função:', e.message);
    } finally {
      setUpdating(null);
    }
  }

  // ── Filtros ────────────────────────────────────────────────────────────
  const categories = Array.from(
    new Set(functions.map(f => f.function_category))
  ).filter(c => CATEGORIES[c]);

  const filtered = functions.filter(fn => {
    const enabled = isFunctionEnabled(fn);

    if (filterStatus === 'active'   && !enabled) return false;
    if (filterStatus === 'inactive' && enabled)  return false;
    if (selectedCat && fn.function_category !== selectedCat) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        fn.function_name.toLowerCase().includes(q) ||
        fn.description.toLowerCase().includes(q) ||
        (fn.short_description?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  // ── Contadores ─────────────────────────────────────────────────────────
  const enabledCount = functions.filter(fn => isFunctionEnabled(fn)).length;

  // ── Render ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800/40 p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        <button
          onClick={loadData}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
        <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Nenhuma conexão ativa</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Conecte uma conta Meta na aba Conexões para gerenciar as funções.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header do painel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Funções no Meta</h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{enabledCount}</span>
            {' '}de{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{functions.length}</span>
            {' '}ativas
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ative as funções que seus clientes poderão usar via WhatsApp, Instagram e Facebook.
        </p>
      </div>

      {/* Barra de busca + filtro de status */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10
              bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400
              outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
        </div>

        {/* Filtros de status */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`${pillBase} ${filterStatus === s ? pillNeutralOn : pillOff}`}
            >
              {s === 'all' ? 'Todos os Status' : s === 'active' ? 'Ativas' : 'Inativas'}
            </button>
          ))}
        </div>

        {/* Filtros de categoria */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCat(null)}
            className={`${pillBase} ${selectedCat === null ? pillNeutralOn : pillOff}`}
          >
            Todas as Categorias
          </button>
          {categories.map(catKey => {
            const cat = CATEGORIES[catKey];
            const isSelected = selectedCat === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCat(isSelected ? null : catKey)}
                className={`${pillBase} ${isSelected ? pillOn : pillOff}`}
                style={isSelected ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : cat.color }}
                />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de cards */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
          <Search className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Nenhuma função encontrada com os filtros selecionados.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCat(null); setFilterStatus('all'); }}
            className="text-xs text-blue-500 mt-2 hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(fn => (
            <MetaFunctionCard
              key={fn.id}
              fn={fn}
              isEnabled={isFunctionEnabled(fn)}
              isUpdating={updating === fn.function_key}
              onToggle={(v) => handleToggle(fn, v)}
            />
          ))}
        </div>
      )}

    </div>
  );
}
