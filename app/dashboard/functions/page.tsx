// app/dashboard/functions/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { Lightbulb, Send, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase-browser';
import { useAssistant } from '@/contexts/AssistantContext';
import { useTheme } from 'next-themes';
import { Search, Settings, User } from 'lucide-react';
import FunctionCard from '@/components/dashboard/functions/FunctionCard';
import FunctionConfigModal from '@/components/dashboard/functions/FunctionConfigModal';

interface AssistantFunction {
  id: string;
  function_key: string;
  function_name: string;
  function_category: string;
  description: string;
  short_description: string;
  demo_text: string;
  icon: string;
  color: string;
  requires_payment: boolean;
  is_premium: boolean;
  save_to_history: boolean;
  consumes_credits: boolean;
  credits_per_use: number;
  voice_triggers: string[];
  example_phrases: string[];
  is_active: boolean;
  display_order: number;
  edit_modal_component?: string;
  default_enabled?: boolean;
}

interface CompanyFunctionSetting {
  id: string;
  function_key: string;
  is_enabled: boolean;
  usage_count: number;
  total_credits_consumed: number;
  last_used_at?: string;
}

interface Company {
  id: string;
  name: string;
  wake_word?: string;
  created_at?: string;
}

const categories = [
  { key: 'ai_assistant',  name: 'Conhecimento', color: '#0000ff' },
  { key: 'products',      name: 'Comercial',    color: '#FF00FF' },
  { key: 'payment',       name: 'Financeiro',    color: '#F44336' },
  { key: 'information',   name: 'Informação',   color: '#00FFF7' },
  { key: 'video',         name: 'Multimídia',   color: '#A52A2A' },
  { key: 'schedule',      name: 'Agendamento',  color: '#FFC0CB' },
  { key: 'contact',       name: 'Contato',      color: '#10B981' },
  { key: 'configuration', name: 'Localização',  color: '#800080' },
  { key: 'knowledge',     name: 'Consultas',    color: '#FFFF00' },
  { key: 'biometry',      name: 'Identificação',    color: '#808000' },
  { key: 'images',        name: 'Arquivos',     color: '#000080' },
  { key: 'utylities',     name: 'Utilitários',  color: '#FFA500' },
  { key: 'codes',         name: 'Câmera',       color: '#808080' },
  { key: 'services',      name: 'Serviços',     color: '#D2691E' },
];

const statusOptions = [
  { key: 'all',      label: 'Todos os Status' },
  { key: 'active',   label: 'Ativas' },
  { key: 'inactive', label: 'Inativas' },
];

// ── Shared pill classes ────────────────────────────────────────────────────────
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

// ─── CategoryPillSelector ──────────────────────────────────────────────────────
function CategoryPillSelector({
  selectedCategories,
  onToggleCategory,
  onSelectAll,
  isAllSelected,
  isMobile,
}: {
  selectedCategories: string[];
  onToggleCategory: (key: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  isMobile: boolean;
}) {
  const allBtn = (
    <button
      onClick={onSelectAll}
      className={`${pillCommon} ${isAllSelected ? pillActiveNeutral : pillInactive}`}
    >
      Todas as Funções
    </button>
  );

  const catBtns = categories.map(cat => {
    const isSelected = selectedCategories.includes(cat.key);
    return (
      <button
        key={cat.key}
        onClick={() => onToggleCategory(cat.key)}
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
  });

  if (isMobile) {
    const firstRowCats = catBtns.filter((_, i) => categories[i].key === 'contact' || categories[i].key === 'video');
    const restCats = catBtns.filter((_, i) => categories[i].key !== 'contact' && categories[i].key !== 'video');
    return (
      <div className="flex flex-col gap-0.5 w-full"> {/* Diminuído de gap-2 para 1.5 */}
        <div className="grid grid-cols-3 gap-0.5"> {/* Diminuído de gap-2 para 1.5 */}
          {allBtn}
          {firstRowCats}
        </div>
        <div className="grid grid-cols-3 gap-0.5"> {/* Diminuído de gap-2 para 1.5 */}
          {restCats}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {allBtn}
      {catBtns}
    </div>
  );
}

// ─── StatusPillSelector ────────────────────────────────────────────────────────
function StatusPillSelector({
  filterStatus,
  onSetStatus,
  isMobile,
}: {
  filterStatus: string;
  onSetStatus: (key: string) => void;
  isMobile: boolean;
}) {
  const btns = statusOptions.map(opt => {
    const isSelected = filterStatus === opt.key;
    return (
      <button
        key={opt.key}
        onClick={() => onSetStatus(opt.key)}
        className={`${pillCommon} ${isSelected ? pillActiveNeutral : pillInactive}`}
      >
        {opt.label}
      </button>
    );
  });

  if (isMobile) {
    return <div className="grid grid-cols-3 gap-2 w-full">{btns}</div>;
  }

  return <div className="flex gap-2">{btns}</div>;
}

// ─── ProfileTypeSelector ───────────────────────────────────────────────────────
const TIPOS_LABEL: Record<string, string> = {
  cliente: 'Clientes', totem: 'Totens', frentista: 'Frentistas',
  atendente: 'Atendentes', caixa: 'Caixas', gerente: 'Gerentes', colaborador: 'Colaboradores',
};
const TIPOS_COR: Record<string, string> = {
  cliente: '#ec4899', totem: '#06b6d4', frentista: '#f97316',
  atendente: '#3b82f6', caixa: '#22c55e', gerente: '#a855f7', colaborador: '#6b7280',
};

function ProfileTypeSelector({ selectedTipo, tiposDisponiveis, onSelect }: {
  selectedTipo: string | null;
  tiposDisponiveis: string[];
  onSelect: (tipo: string | null) => void;
}) {
  const selectedColor = selectedTipo ? (TIPOS_COR[selectedTipo] ?? '#6b7280') : null;

  return (
    <>
      {/* Desktop: icone + select visivel */}
      <div className="hidden sm:flex items-center gap-1.5 relative">
        <User
          className="w-4 h-4 flex-shrink-0"
          style={selectedColor ? { color: selectedColor } : { color: '#9ca3af' }}
        />
        <select
          value={selectedTipo ?? ''}
          onChange={e => onSelect(e.target.value === '' ? null : e.target.value)}
          className="appearance-none pl-2 pr-6 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-200"
          style={selectedTipo ? { borderColor: selectedColor!, color: selectedColor! } : {}}
        >
          <option value="">Principal</option>
          {tiposDisponiveis.map(tipo => (
            <option key={tipo} value={tipo}>{TIPOS_LABEL[tipo] ?? tipo}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
          <svg className="w-3 h-3 text-gray-400" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>

      {/* Mobile: so o icone, select invisivel por baixo */}
      <div className="sm:hidden relative flex items-center">
        <User
          className="w-5 h-5"
          style={selectedColor ? { color: selectedColor } : { color: '#9ca3af' }}
        />
        <select
          value={selectedTipo ?? ''}
          onChange={e => onSelect(e.target.value === '' ? null : e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        >
          <option value="">Principal</option>
          {tiposDisponiveis.map(tipo => (
            <option key={tipo} value={tipo}>{TIPOS_LABEL[tipo] ?? tipo}</option>
          ))}
        </select>
      </div>
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
function FunctionsPageContent() {
  const { selectedAssistantId: companyId, selectedAssistantName } = useAssistant();
  const [functions, setFunctions] = useState<AssistantFunction[]>([]);
  const [settings, setSettings] = useState<CompanyFunctionSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingFunction, setEditingFunction] = useState<AssistantFunction | null>(null);

  // Estados novos — perfis
  const [profilePermissions, setProfilePermissions] = useState<{tipo: string; function_key: string; is_enabled: boolean}[]>([]);
  const [tiposDisponiveis, setTiposDisponiveis] = useState<string[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null); // null = principal

  const supabase = createClient();

  const { toast } = useToast();
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [isSendingsuggestion, setIsSendingSuggestion] = useState(false);

async function handleSendSuggestion() {
  if (suggestionText.trim().length < 10) {
    toast({ title: "Sugestão muito curta", description: "Por favor, descreva com mais detalhes.", variant: "destructive" });
    return;
  }
  setIsSendingSuggestion(true);
  try {
    const { error } = await supabase.functions.invoke('send-suggestion', {
      body: { suggestion: suggestionText },
    });
    if (error) throw error;
    toast({ title: "Sugestão Enviada!", description: "Obrigado! Sua opinião é muito importante para nós." });
    setSuggestionText('');
    setIsSuggestionOpen(false);
  } catch (error: any) {
    toast({ title: "Erro ao enviar", description: error.message || "Tente novamente mais tarde.", variant: "destructive" });
  } finally {
    setIsSendingSuggestion(false);
  }
}

  useEffect(() => {
    if (companyId) {
      loadData(companyId);
    } else {
      setFunctions([]);
      setSettings([]);
      setLoading(false);
    }
  }, [companyId]);

  async function loadData(selectedCompanyId: string) {
    try {
      setLoading(true);
      const { data: allFunctions, error: functionsError } = await supabase
        .from('assistant_functions')
        .select('*, default_enabled')
        .eq('is_active', true)
        .order('display_order');
      if (functionsError) console.error('Erro ao buscar funções:', functionsError);
      setFunctions(allFunctions || []);

      const { data: companySettings, error: settingsError } = await supabase
        .from('company_function_settings')
        .select('*')
        .eq('company_id', selectedCompanyId);
      if (settingsError) console.error('Erro ao buscar settings:', settingsError);
      setSettings(companySettings || []);

      // Tipos de perfil com pelo menos 1 perfil cadastrado
      const { data: profilesData } = await supabase
        .from('company_profiles')
        .select('tipo')
        .eq('company_id', selectedCompanyId)
        .eq('is_active', true);

      const tipos = [...new Set((profilesData ?? []).map((p: any) => p.tipo))]
        .filter(t => t !== 'administrador');
      setTiposDisponiveis(tipos);

      // Permissões de perfil (inicializa se necessário)
      if (tipos.length > 0) {
        const { data: perms } = await supabase
          .from('profile_type_permissions')
          .select('tipo, function_key, is_enabled')
          .eq('company_id', selectedCompanyId);

        if (!perms || perms.length === 0) {
          await supabase.rpc('initialize_company_profile_permissions', { p_company_id: selectedCompanyId });
          const { data: permsInit } = await supabase
            .from('profile_type_permissions')
            .select('tipo, function_key, is_enabled')
            .eq('company_id', selectedCompanyId);
          setProfilePermissions(permsInit ?? []);
        } else {
          setProfilePermissions(perms);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFunction(functionKey: string, currentlyEnabled: boolean) {
    if (!companyId) return;
    setUpdating(functionKey);
    try {
      if (selectedTipo === null) {
        // Modo principal — comportamento original
        const setting = settings.find(s => s.function_key === functionKey);
        if (setting) {
          await supabase.from('company_function_settings').update({
            is_enabled: !currentlyEnabled,
            ...(currentlyEnabled ? { disabled_at: new Date().toISOString() } : { enabled_at: new Date().toISOString() }),
          }).eq('id', setting.id);
        } else {
          await supabase.from('company_function_settings').insert({
            company_id: companyId, function_key: functionKey,
            is_enabled: !currentlyEnabled,
            ...(currentlyEnabled ? { disabled_at: new Date().toISOString() } : { enabled_at: new Date().toISOString() }),
          });
        }
        await loadData(companyId);
      } else {
        // Modo perfil — atualiza profile_type_permissions
        await supabase.from('profile_type_permissions').upsert(
          { company_id: companyId, tipo: selectedTipo, function_key: functionKey, is_enabled: !currentlyEnabled },
          { onConflict: 'company_id,tipo,function_key' }
        );
        // Atualiza estado local sem recarregar tudo
        setProfilePermissions(prev => {
          const exists = prev.find(p => p.tipo === selectedTipo && p.function_key === functionKey);
          if (exists) return prev.map(p =>
            p.tipo === selectedTipo && p.function_key === functionKey ? { ...p, is_enabled: !currentlyEnabled } : p
          );
          return [...prev, { tipo: selectedTipo, function_key: functionKey, is_enabled: !currentlyEnabled }];
        });
        setUpdating(null);
        return; // não precisa recarregar tudo
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar função. Tente novamente.');
    } finally {
      setUpdating(null);
    }
  }

  function isFunctionEnabled(functionKey: string): boolean {
    if (selectedTipo === null) {
      // Modo principal — comportamento original
      const setting = settings.find(s => s.function_key === functionKey);
      if (setting) return setting.is_enabled;
      const func = functions.find(f => f.function_key === functionKey);
      return func?.default_enabled ?? false;
    }
    // Modo perfil — usa profile_type_permissions
    return profilePermissions.find(
      p => p.tipo === selectedTipo && p.function_key === functionKey
    )?.is_enabled ?? false;
  }

  function getFunctionStats(functionKey: string) {
    const setting = settings.find(s => s.function_key === functionKey);
    return {
      usageCount: setting?.usage_count || 0,
      creditsConsumed: setting?.total_credits_consumed || 0,
      lastUsed: setting?.last_used_at || null,
    };
  }

function getFunctionCredits(functionKey: string): number {
  const setting = settings.find(s => s.function_key === functionKey);
  // Prioriza o valor customizado da empresa, cai no global se não existir
  if (setting?.custom_credits_per_use != null) return setting.custom_credits_per_use;
  const func = functions.find(f => f.function_key === functionKey);
  return func?.credits_per_use ?? 0;
}

  function handleEdit(fn: AssistantFunction) {
    setEditingFunction(fn);
  }

  const isAllSelected = selectedCategories.length === 0;

  function handleToggleCategory(key: string) {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  function handleSelectAll() {
    setSelectedCategories([]);
  }

  const filteredFunctions = functions.filter(fn => {
    if (!fn) return false;
    const matchesCategory = isAllSelected || selectedCategories.includes(fn.function_category);
    const matchesSearch =
      fn.function_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fn.short_description.toLowerCase().includes(searchQuery.toLowerCase());
    const isEnabled = isFunctionEnabled(fn.function_key);
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && isEnabled) ||
      (filterStatus === 'inactive' && !isEnabled);
    return matchesCategory && matchesSearch && matchesStatus;
  });

  const searchInputClass =
    'w-full pl-10 pr-4 py-2 rounded-lg border ' +
    'bg-white text-gray-900 border-gray-300 placeholder-gray-400 ' +
    'dark:bg-slate-800 dark:text-white dark:border-white/10 dark:placeholder-gray-500 ' +
    'focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  function renderCardList(mode: 'grid' | 'list', forceSingleColumn = false) {
    if (mode === 'list') {
      return filteredFunctions.map(fn => {
        if (!fn || !fn.function_key) return null;
        const enabled = isFunctionEnabled(fn.function_key);
        const stats = getFunctionStats(fn.function_key);
        return (
          <FunctionCard
            key={fn.id}
            function={{ ...fn, credits_per_use: getFunctionCredits(fn.function_key) }}
            isEnabled={enabled}
            stats={stats}
            onToggle={() => toggleFunction(fn.function_key, enabled)}
            onEdit={() => handleEdit(fn)}
            isUpdating={updating === fn.function_key}
            theme={theme}
            viewMode={mode}
          />
        );
      });
    }

    // Grid mode: chunk into rows of 3
    const rows: AssistantFunction[][] = [];
    for (let i = 0; i < filteredFunctions.length; i += 3) {
      rows.push(filteredFunctions.slice(i, i + 3));
    }

    return rows.map((row, rowIdx) => {
      const colClass = forceSingleColumn
        ? 'grid-cols-1'
        : row.length === 1 ? 'grid-cols-1'
        : row.length === 2 ? 'grid-cols-2'
        : 'grid-cols-3';

      return (
        <div key={rowIdx} className={`grid gap-6 ${colClass}`}>
          {row.map(fn => {
            if (!fn || !fn.function_key) return null;
            const enabled = isFunctionEnabled(fn.function_key);
            const stats = getFunctionStats(fn.function_key);
            return (
              <FunctionCard
                key={fn.id}
                function={{ ...fn, credits_per_use: getFunctionCredits(fn.function_key) }}
                isEnabled={enabled}
                stats={stats}
                onToggle={() => toggleFunction(fn.function_key, enabled)}
                onEdit={() => handleEdit(fn)}
                isUpdating={updating === fn.function_key}
                theme={theme}
                viewMode="grid"
              />
            );
          })}
        </div>
      );
    });
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">

          {/* ── Header ── */}
<div className="mb-4 sm:mb-8">
  {/* Desktop */}
  <div className="hidden sm:flex items-start justify-between gap-4 mb-6">
    <div className="flex-1">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Funções do Assistente
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Defina as funções que seu assistente {selectedAssistantName} pode executar
      </p>
    </div>
    {/* Seletor de perfil + botão de configuração — desktop */}
    {companyId && tiposDisponiveis.length > 0 && (
      <ProfileTypeSelector
        selectedTipo={selectedTipo}
        tiposDisponiveis={tiposDisponiveis}
        onSelect={setSelectedTipo}
      />
    )}
    {companyId && (
      <a
        href={`/dashboard/assistentes/${companyId}`}
        className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition"
        title="Configurar assistente"
      >
        <Settings className="w-5 h-5" />
      </a>
    )}
  </div>

  {/* Mobile */}
  <div className="sm:hidden flex flex-col gap-3 mb-4">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Funções do Assistente
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Defina as funções que seu assistente {selectedAssistantName} pode executar
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 mt-1">
        {companyId && tiposDisponiveis.length > 0 && (
          <ProfileTypeSelector
            selectedTipo={selectedTipo}
            tiposDisponiveis={tiposDisponiveis}
            onSelect={setSelectedTipo}
          />
        )}
        {companyId && (
          <a
            href={`/dashboard/assistentes/${companyId}`}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition"
            title="Configurar assistente"
          >
            <Settings className="w-5 h-5" />
          </a>
        )}
      </div>
    </div>
  </div>
</div>

          {/* ── Com assistente selecionado ── */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          )}

          {!loading && companyId && functions.length === 0 && (
            <div className="text-center py-12 bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Nenhuma função disponível no momento.
              </p>
            </div>
          )}

          {!loading && companyId && functions.length > 0 && (
            <>
              {/* FILTER BAR — MOBILE */}
              <div className="sm:hidden mb-6 flex flex-col gap-3 bg-white dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={searchInputClass}
                  />
                </div>
                <StatusPillSelector
                  filterStatus={filterStatus}
                  onSetStatus={setFilterStatus}
                  isMobile
                />
                <CategoryPillSelector
                  selectedCategories={selectedCategories}
                  onToggleCategory={handleToggleCategory}
                  onSelectAll={handleSelectAll}
                  isAllSelected={isAllSelected}
                  isMobile
                />
              </div>

              {/* FILTER BAR — DESKTOP */}
              <div className="hidden sm:flex flex-col gap-3 mb-6 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-grow min-w-[160px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className={searchInputClass}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusPillSelector
                      filterStatus={filterStatus}
                      onSetStatus={setFilterStatus}
                      isMobile={false}
                    />
                    <div className="flex items-center border border-gray-300 dark:border-white/10 rounded-lg p-1 dark:bg-slate-800">
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
                </div>
                <CategoryPillSelector
                  selectedCategories={selectedCategories}
                  onToggleCategory={handleToggleCategory}
                  onSelectAll={handleSelectAll}
                  isAllSelected={isAllSelected}
                  isMobile={false}
                />
              </div>

              {/* ── Cards ── */}
              {filteredFunctions.length === 0 ? (
                <div className="text-center py-12 bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10">
                  <p className="text-gray-600 dark:text-gray-400">
                    Nenhuma função encontrada com os filtros selecionados.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile: Espaçamento reduzido entre cards */}
                  <div className="sm:hidden flex flex-col gap-3"> {/* Trocado space-y-2 por gap-3 para consistência */}
                    {filteredFunctions.map(fn => {
                      const enabled = isFunctionEnabled(fn.function_key);
                      const stats = getFunctionStats(fn.function_key);
                      return (
                        <FunctionCard
                          key={fn.id}
                          function={{ ...fn, credits_per_use: getFunctionCredits(fn.function_key) }}
                          isEnabled={enabled}
                          stats={stats}
                          onToggle={() => toggleFunction(fn.function_key, enabled)}
                          onEdit={() => handleEdit(fn)}
                          isUpdating={updating === fn.function_key}
                          theme={theme}
                          viewMode="grid" // No mobile usamos o layout de card
                        />
                      );
                    })}
                  </div>

                  {/* Desktop: Mantém o layout original de grid/lista */}
                  <div className="hidden sm:block">
                    <div className={viewMode === 'list' ? 'space-y-2' : 'flex flex-col gap-6'}>
                      {renderCardList(viewMode)}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

{editingFunction && companyId && (
            <FunctionConfigModal
              isOpen={!!editingFunction}
              onClose={() => setEditingFunction(null)}
              functionData={editingFunction}
              companyId={companyId}
              onUpdate={() => loadData(companyId)}
            />
          )}

          {/* ── Link de sugestões ── */}
<div className="mt-10 text-center">
  <div className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
    Não encontrou a função que precisa?
    <button
      onClick={() => setIsSuggestionOpen(true)}
      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
    >
      <Lightbulb className="w-4 h-4" />
      Envie uma sugestão
    </button>
  </div>
</div>

          {/* ── Modal de sugestões ── */}
          {isSuggestionOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-white/5 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enviar Sugestão</h2>
                  <button
                    onClick={() => setIsSuggestionOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Adoramos ouvir suas ideias! Descreva sua sugestão de melhoria ou nova funcionalidade.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sua sugestão
                    </label>
                    <textarea
                      placeholder="Ex: Gostaria de uma função que faça X..."
                      rows={6}
                      value={suggestionText}
                      onChange={e => setSuggestionText(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsSuggestionOpen(false)}
                      className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSendSuggestion}
                      disabled={isSendingsuggestion}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#b0cb1f] text-white rounded-xl hover:bg-[#8ca214] transition font-bold disabled:opacity-50 shadow-lg shadow-[#b0cb1f]/20"
                    >
                      {isSendingsuggestion
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <><Send className="w-5 h-5" />Enviar</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AssistantFunctionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    }>
      <FunctionsPageContent />
    </Suspense>
  );
}
