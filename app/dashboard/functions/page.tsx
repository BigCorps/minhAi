// app/dashboard/functions/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search, LayoutGrid, List } from 'lucide-react';
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
}

interface CompanyFunctionSetting {
  id: string;
  function_key: string;
  is_enabled: boolean;
  usage_count: number;
  total_credits_consumed: number;
  last_used_at?: string;
}

function FunctionsPageContent() {
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');

  const [functions, setFunctions] = useState<AssistantFunction[]>([]);
  const [settings, setSettings] = useState<CompanyFunctionSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | undefined>(
    companyIdFromUrl || undefined
  );
  const [updating, setUpdating] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'dark';

  // ===== NOVOS ESTADOS PARA FILTROS E VISUALIZAÇÃO =====
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingFunction, setEditingFunction] = useState<AssistantFunction | null>(null);
  // ===== FIM DOS NOVOS ESTADOS =====

  const supabase = createClient();

  useEffect(() => {
    const urlId = companyIdFromUrl || undefined;
    if (urlId !== companyId) {
      setCompanyId(urlId);
    }
  }, [companyIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (companyId) {
      loadData(companyId);
    } else {
      setFunctions([]);
      setSettings([]);
      setLoading(false);
    }
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData(selectedCompanyId: string) {
    try {
      setLoading(true);

      const { data: allFunctions, error: functionsError } = await supabase
        .from('assistant_functions')
        .select('id, function_key, function_name, ..., default_enabled') 
        .eq('is_active', true)
        .order('display_order');

      if (functionsError) {
        console.error('Erro ao buscar funções:', functionsError);
      }

      setFunctions(allFunctions || []);

      const { data: companySettings, error: settingsError } = await supabase
        .from('company_function_settings')
        .select('*')
        .eq('company_id', selectedCompanyId);

      if (settingsError) {
        console.error('Erro ao buscar settings:', settingsError);
      }

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
              : { enabled_at: new Date().toISOString() }
            )
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
              : { enabled_at: new Date().toISOString() }
            )
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
    return setting ? setting.is_enabled : true;
  }

  function getFunctionStats(functionKey: string) {
    const setting = settings.find(s => s.function_key === functionKey);
    return {
      usageCount: setting?.usage_count || 0,
      creditsConsumed: setting?.total_credits_consumed || 0,
      lastUsed: setting?.last_used_at || null
    };
  }

  // ===== HANDLER ATUALIZADO PARA ABRIR O MODAL =====
  function handleEdit(fn: AssistantFunction) {
    setEditingFunction(fn);
  }
  // ===== FIM DO HANDLER ATUALIZADO =====

  function handleCompanySelect(id: string) {
    setCompanyId(id);
    const params = new URLSearchParams(window.location.search);
    params.set('companyId', id);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }

const categories = [
  { key: 'knowledge',      name: 'Conhecimento', color: '#3B82F6' },
  { key: 'configuration',  name: 'Configuração',  color: '#8B5CF6' },
  { key: 'contact',        name: 'Contato',       color: '#10B981' },
  { key: 'payment',        name: 'Pagamento',     color: '#F59E0B' },
  { key: 'schedule',       name: 'Agendamento',   color: '#8B5CF6' },
  { key: 'information',    name: 'Informação',    color: '#3B82F6' },  // NOVO
  { key: 'ai_assistant',   name: 'Assistente IA', color: '#8B5CF6' },  // NOVO
  { key: 'other',          name: 'Outros',        color: '#6B7280' },
];

  // ===== LÓGICA DE FILTRO =====
  const filteredFunctions = functions.filter(fn => {
    if (!fn) return false;

    const matchesCategory = selectedCategory === 'all' || fn.function_category === selectedCategory;
    const matchesSearch = fn.function_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          fn.short_description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isEnabled = isFunctionEnabled(fn.function_key);
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && isEnabled) || 
      (filterStatus === 'inactive' && !isEnabled);

    return matchesCategory && matchesSearch && matchesStatus;
  });
  // ===== FIM DA LÓGICA DE FILTRO =====

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Funções do Assistente
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Ative ou desative as funções que seu assistente pode executar
                </p>
              </div>

              <FunctionSelector
                onCompanySelect={handleCompanySelect}
                selectedCompanyId={companyId}
                theme={theme}
              />
            </div>
          </div>

          {/* Estado: nenhum assistente selecionado */}
          {!companyId && !loading && (
            <div className="text-center py-12 bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10">
              <p className="text-gray-600 dark:text-gray-400">
                Selecione um assistente acima para gerenciar suas funções
              </p>
            </div>
          )}

          {/* Estado: carregando */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Estado: sem funções cadastradas */}
          {!loading && companyId && functions.length === 0 && (
            <div className="text-center py-12 bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Nenhuma função disponível no momento.
              </p>
            </div>
          )}

          {/* Estado: funções carregadas */}
          {!loading && companyId && functions.length > 0 && (
            <>
              {/* ===== BARRA DE FILTROS E BUSCA ===== */}
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-4">
                <div className="flex-grow max-w-xs relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                  <select 
                    value={selectedCategory} 
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="border rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todas as Categorias</option>
                    {categories.map(cat => (
                      <option key={cat.key} value={cat.key}>{cat.name}</option>
                    ))}
                  </select>

                  <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)}
                    className="border rounded-lg px-3 py-2 dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Ativas</option>
                    <option value="inactive">Inativas</option>
                  </select>

                  <div className="flex items-center border rounded-lg p-1 dark:bg-slate-800 dark:border-white/10">
                    <button 
                      onClick={() => setViewMode('grid')} 
                      className={`p-1.5 rounded-md transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-blue-500 text-white' 
                          : 'hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                      aria-label="Visualização em grade"
                    >
                      <LayoutGrid size={20} />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')} 
                      className={`p-1.5 rounded-md transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-blue-500 text-white' 
                          : 'hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                      aria-label="Visualização em lista"
                    >
                      <List size={20} />
                    </button>
                  </div>
                </div>
              </div>
              {/* ===== FIM DA BARRA DE FILTROS ===== */}

              {/* ===== GRID/LISTA DE FUNÇÕES ===== */}
              {filteredFunctions.length === 0 ? (
                <div className="text-center py-12 bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/10">
                  <p className="text-gray-600 dark:text-gray-400">
                    Nenhuma função encontrada com os filtros selecionados.
                  </p>
                </div>
              ) : (
                <div className={
                  viewMode === 'grid' 
                    ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' 
                    : 'space-y-4'
                }>
{filteredFunctions.map(fn => {
  if (!fn || !fn.function_key) return null;

  const enabled = isFunctionEnabled(fn.function_key);
  const stats = getFunctionStats(fn.function_key);
  const isUpdating = updating === fn.function_key;

  return (
    <FunctionCard
      key={fn.id}
      function={fn}
      isEnabled={enabled}
      stats={stats}
      onToggle={() => toggleFunction(fn.function_key, enabled)}
      onEdit={() => handleEdit(fn)}  // <--- VERIFICAR SE ESTÁ ASSIM
      isUpdating={isUpdating}
      theme={theme}
    />
  );
})}
                </div>
              )}
              {/* ===== FIM DO GRID/LISTA ===== */}
            </>
          )}

          {/* ===== MODAL DE CONFIGURAÇÃO ===== */}
          {editingFunction && companyId && (
            <FunctionConfigModal
              isOpen={!!editingFunction}
              onClose={() => setEditingFunction(null)}
              functionData={editingFunction}
              companyId={companyId}
              onUpdate={() => loadData(companyId)}
            />
          )}
          {/* ===== FIM DO MODAL ===== */}
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    }>
      <FunctionsPageContent />
    </Suspense>
  );
}
