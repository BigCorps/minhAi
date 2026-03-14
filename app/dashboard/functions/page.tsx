// app/dashboard/functions/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search } from 'lucide-react';
import FunctionSelector from '@/components/dashboard/functions/FunctionSelector';
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

// ─── Main page ─────────────────────────────────────────────────────────────────
function FunctionsPageContent() {
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [functions, setFunctions] = useState<AssistantFunction[]>([]);
  const [settings, setSettings] = useState<CompanyFunctionSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | undefined>(
    companyIdFromUrl || undefined
  );
  const [updating, setUpdating] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingFunction, setEditingFunction] = useState<AssistantFunction | null>(null);

  const supabase = createClient();

  // Carrega lista de empresas para exibir quando nenhum assistente está selecionado
  useEffect(() => {
    async function loadCompanies() {
      try {
        setLoadingCompanies(true);
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, wake_word, created_at')
          .order('created_at', { ascending: true });
        if (error) console.error('Erro ao buscar empresas:', error);
        setCompanies(data || []);
      } catch (error) {
        console.error('Erro ao carregar empresas:', error);
      } finally {
        setLoadingCompanies(false);
      }
    }
    loadCompanies();
  }, []);

  useEffect(() => {
    const urlId = companyIdFromUrl || undefined;
    if (urlId !== companyId) setCompanyId(urlId);
  }, [companyIdFromUrl]);

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
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFunction(functionKey: string, currentlyEnabled: boolean) {
    if (!companyId) return;
    try {
      setUpdating(functionKey);
      const setting = settings.find(s => s.function_key === functionKey);
      if (setting) {
        const { error } = await supabase
          .from('company_function_settings')
          .update({
            is_enabled: !currentlyEnabled,
            ...(currentlyEnabled
              ? { disabled_at: new Date().toISOString() }
              : { enabled_at: new Date().toISOString() }),
          })
          .eq('id', setting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_function_settings')
          .insert({
            company_id: companyId,
            function_key: functionKey,
            is_enabled: !currentlyEnabled,
            ...(currentlyEnabled
              ? { disabled_at: new Date().toISOString() }
              : { enabled_at: new Date().toISOString() }),
          });
        if (error) throw error;
      }
      await loadData(companyId);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar função. Tente novamente.');
    } finally {
      setUpdating(null);
    }
  }

  function isFunctionEnabled(functionKey: string): boolean {
    const setting = settings.find(s => s.function_key === functionKey);
    if (setting) return setting.is_enabled;
    const func = functions.find(f => f.function_key === functionKey);
    return func?.default_enabled ?? false;
  }

  function getFunctionStats(functionKey: string) {
    const setting = settings.find(s => s.function_key === functionKey);
    return {
      usageCount: setting?.usage_count || 0,
      creditsConsumed: setting?.total_credits_consumed || 0,
      lastUsed: setting?.last_used_at || null,
    };
  }

  function handleEdit(fn: AssistantFunction) {
    setEditingFunction(fn);
  }

  function handleCompanySelect(id: string) {
    setCompanyId(id);
    const params = new URLSearchParams(window.location.search);
    params.set('companyId', id);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
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
            function={fn}
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
                function={fn}
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
                  Ative ou desative as funções que seu assistente pode executar
                </p>
              </div>
              {companyId && (
                <FunctionSelector
                  onCompanySelect={handleCompanySelect}
                  selectedCompanyId={companyId}
                  theme={theme}
                />
              )}
            </div>

            {/* Mobile */}
            <div className="sm:hidden flex flex-col gap-3 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Funções do Assistente
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Ative ou desative as funções que seu assistente pode executar
                </p>
              </div>
              {companyId && (
                <div className="w-full">
                  <FunctionSelector
                    onCompanySelect={handleCompanySelect}
                    selectedCompanyId={companyId}
                    theme={theme}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Sem assistente selecionado: grade de empresas ── */}
          {!companyId && (
            <>
              {loadingCompanies ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-12 bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10">
                  <p className="text-gray-600 dark:text-gray-400">
                    Nenhum assistente cadastrado.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {companies.map(company => (
                    <button
                      key={company.id}
                      onClick={() => handleCompanySelect(company.id)}
                      className="text-left rounded-xl shadow-md p-6 hover:shadow-xl transition group bg-white/80 dark:bg-white/5 border border-transparent dark:border-white/10 hover:border-blue-500/30 dark:hover:border-blue-500/30 backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
                            {company.name}
                          </h3>
                          {company.wake_word && (
                            <p className="text-sm text-gray-500 dark:text-white/40">
                              Palavra: {company.wake_word}
                            </p>
                          )}
                        </div>
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 dark:text-white/40 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                        <div className="flex items-center text-sm text-gray-600 dark:text-white/60">
                          <svg className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Gerenciar Funções
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

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
                          function={fn}
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
