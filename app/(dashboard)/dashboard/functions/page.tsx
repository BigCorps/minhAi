// app/(dashboard)/dashboard/functions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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

export default function AssistantFunctionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');
  
  const [functions, setFunctions] = useState<AssistantFunction[]>([]);
  const [settings, setSettings] = useState<CompanyFunctionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>(companyIdFromUrl || '');
  const [updating, setUpdating] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const supabase = createClient();
  
  // Detectar tema do sistema
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
  }, []);
  
  // Carregar dados quando companyId muda
  useEffect(() => {
    if (companyId) {
      loadData(companyId);
    }
  }, [companyId]);
  
  async function loadData(selectedCompanyId: string) {
    try {
      setLoading(true);
      
      console.log('📋 Carregando dados para empresa:', selectedCompanyId);
      
      // 1. Buscar todas as funções ativas
      const { data: allFunctions, error: functionsError } = await supabase
        .from('assistant_functions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (functionsError) {
        console.error('❌ Erro ao buscar funções:', functionsError);
      }
      
      console.log('✅ Funções encontradas:', allFunctions?.length || 0);
      
      setFunctions(allFunctions || []);
      
      // 2. Buscar configurações da empresa
      const { data: companySettings, error: settingsError } = await supabase
        .from('company_function_settings')
        .select('*')
        .eq('company_id', selectedCompanyId);
      
      if (settingsError) {
        console.error('❌ Erro ao buscar settings:', settingsError);
      }
      
      console.log('✅ Settings encontrados:', companySettings?.length || 0);
      
      setSettings(companySettings || []);
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function toggleFunction(functionKey: string, currentlyEnabled: boolean) {
    try {
      setUpdating(functionKey);
      
      const setting = settings.find(s => s.function_key === functionKey);
      
      if (setting) {
        // Atualizar existente
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
        
        console.log(`✅ Função ${currentlyEnabled ? 'desativada' : 'ativada'}:`, functionKey);
      } else {
        // Criar novo (primeira vez que está sendo configurada)
        const { error } = await supabase
          .from('company_function_settings')
          .insert({
            company_id: companyId,
            function_key: functionKey,
            is_enabled: false, // Se está toggleando pela primeira vez, é pra desativar
            disabled_at: new Date().toISOString()
          });
        
        if (error) throw error;
        
        console.log('✅ Setting criado e função desativada:', functionKey);
      }
      
      // Recarregar
      await loadData(companyId);
      
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      alert('Erro ao atualizar função. Tente novamente.');
    } finally {
      setUpdating(null);
    }
  }
  
  function isFunctionEnabled(functionKey: string): boolean {
    const setting = settings.find(s => s.function_key === functionKey);
    // Se não tem setting, assume ATIVA (padrão)
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
    // TODO: Abrir modal de edição baseado em edit_modal_component
    console.log('🔧 Editar função:', functionKey);
    alert(`Modal de edição para ${functionKey} ainda não implementado.`);
  }
  
  const categories = [
    { key: 'knowledge', name: 'Conhecimento', icon: '🧠', color: '#3B82F6' },
    { key: 'configuration', name: 'Configuração', icon: '⚙️', color: '#8B5CF6' },
    { key: 'contact', name: 'Contato', icon: '📞', color: '#10B981' },
    { key: 'payment', name: 'Pagamento', icon: '💰', color: '#F59E0B' },
    { key: 'schedule', name: 'Agendamento', icon: '📅', color: '#8B5CF6' },
    { key: 'other', name: 'Outros', icon: '⚡', color: '#6B7280' },
  ];
  
  if (loading && !companyId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Funções do Assistente
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Ative ou desative as funções que seu assistente pode executar
                </p>
              </div>
              
              {/* Seletor de Assistente */}
              <FunctionSelector
                onCompanySelect={setCompanyId}
                selectedCompanyId={companyId}
                theme={theme}
              />
            </div>
          </div>
          
          {/* Mensagem se não tem empresa selecionada */}
          {!companyId && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                Selecione um assistente acima para gerenciar suas funções
              </p>
            </div>
          )}
          
          {/* Loading */}
          {loading && companyId && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}
          
          {/* Funções por categoria */}
          {!loading && companyId && functions.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Nenhuma função disponível no momento.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Execute os SQLs de criação de funções no banco de dados.
              </p>
            </div>
          )}
          
          {!loading && companyId && functions.length > 0 && (
            <>
              {categories.map(category => {
                const categoryFunctions = functions.filter(f => f.function_category === category.key);
                
                if (categoryFunctions.length === 0) return null;
                
                return (
                  <div key={category.key} className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl">{category.icon}</span>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {category.name}
                      </h2>
                      <span className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
                        {categoryFunctions.length} {categoryFunctions.length === 1 ? 'função' : 'funções'}
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {categoryFunctions.map(fn => {
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
                            onEdit={fn.edit_modal_component ? () => handleEdit(fn.function_key) : undefined}
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
