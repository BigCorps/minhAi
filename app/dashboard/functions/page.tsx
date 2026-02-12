// app/dashboard/functions/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import FunctionSelector from '@/components/dashboard/functions/FunctionSelector';
import FunctionCard from '@/components/dashboard/functions/FunctionCard';

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
  // Usa undefined em vez de '' para que as condições !companyId funcionem corretamente
  const [companyId, setCompanyId] = useState<string | undefined>(
    companyIdFromUrl || undefined
  );
  const [updating, setUpdating] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'dark';

  const supabase = createClient();

  // Sincroniza o estado interno sempre que o parâmetro da URL mudar
  // (ex: usuário navegar de /functions?companyId=A para /functions?companyId=B)
  useEffect(() => {
    const urlId = companyIdFromUrl || undefined;
    if (urlId !== companyId) {
      setCompanyId(urlId);
    }
  }, [companyIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  // Nota: companyId intencionalmente omitido para evitar loop —
  // este efeito só deve reagir a mudanças na URL.

  // Carrega os dados sempre que o companyId mudar
  useEffect(() => {
    if (companyId) {
      loadData(companyId);
    } else {
      // Sem empresa selecionada: limpa os dados e para o loading
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
        .select('*')
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
            is_enabled: false,
            disabled_at: new Date().toISOString()
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

  function handleEdit(functionKey: string) {
    console.log('Editar função:', functionKey);
    alert(`Modal de edição para ${functionKey} ainda não implementado.`);
  }

  // Callback para quando o FunctionSelector escolhe uma empresa.
  // Atualiza o estado interno E a URL (sem recarregar a página).
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
    { key: 'other',          name: 'Outros',        color: '#6B7280' },
  ];

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
              {categories.map(category => {
                const categoryFunctions = functions.filter(
                  f => f && f.function_category === category.key
                );

                if (categoryFunctions.length === 0) return null;

                return (
                  <div key={category.key} className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: category.color }} />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {category.name}
                      </h2>
                      <span className="px-3 py-1 rounded-full bg-gray-200 dark:bg-white/10 text-sm text-gray-700 dark:text-gray-300">
                        {categoryFunctions.length}{' '}
                        {categoryFunctions.length === 1 ? 'função' : 'funções'}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {categoryFunctions.map(fn => {
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
                            onEdit={
                              fn.edit_modal_component
                                ? () => handleEdit(fn.function_key)
                                : undefined
                            }
                            isUpdating={isUpdating}
                            theme={theme}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    }>
      <FunctionsPageContent />
    </Suspense>
  );
}