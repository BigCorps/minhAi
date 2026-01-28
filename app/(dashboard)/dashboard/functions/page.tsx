// app/[slug]/assistant/functions/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, TrendingUp, Clock } from 'lucide-react';

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
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [functions, setFunctions] = useState<AssistantFunction[]>([]);
  const [settings, setSettings] = useState<CompanyFunctionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  const [updating, setUpdating] = useState<string | null>(null);
  
  const supabase = createClient();
  
  useEffect(() => {
    loadData();
  }, [slug]);
  
  async function loadData() {
    try {
      setLoading(true);
      
      // 1. Buscar company_id
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!company) {
        console.error('Empresa não encontrada');
        return;
      }
      
      setCompanyId(company.id);
      
      // 2. Buscar todas as funções
      const { data: allFunctions } = await supabase
        .from('assistant_functions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      setFunctions(allFunctions || []);
      
      // 3. Buscar configurações da empresa
      const { data: companySettings } = await supabase
        .from('company_function_settings')
        .select('*')
        .eq('company_id', company.id);
      
      setSettings(companySettings || []);
      
    } catch (error) {
      console.error('Erro ao carregar:', error);
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
            ...(currentlyEnabled ? { disabled_at: new Date().toISOString() } : { enabled_at: new Date().toISOString() })
          })
          .eq('id', setting.id);
        
        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase
          .from('company_function_settings')
          .insert({
            company_id: companyId,
            function_key: functionKey,
            is_enabled: true,
            enabled_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }
      
      // Recarregar
      await loadData();
      
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar função. Tente novamente.');
    } finally {
      setUpdating(null);
    }
  }
  
  function isFunctionEnabled(functionKey: string): boolean {
    const setting = settings.find(s => s.function_key === functionKey);
    return setting ? setting.is_enabled : true; // Ativada por padrão
  }
  
  function getFunctionStats(functionKey: string) {
    const setting = settings.find(s => s.function_key === functionKey);
    return {
      usageCount: setting?.usage_count || 0,
      creditsConsumed: setting?.total_credits_consumed || 0,
      lastUsed: setting?.last_used_at || null
    };
  }
  
  const categories = [
    { key: 'knowledge', name: 'Conhecimento', icon: '🧠', color: '#3B82F6' },
    { key: 'contact', name: 'Contato', icon: '📞', color: '#10B981' },
    { key: 'payment', name: 'Pagamento', icon: '💰', color: '#F59E0B' },
    { key: 'schedule', name: 'Agendamento', icon: '📅', color: '#8B5CF6' },
    { key: 'other', name: 'Outros', icon: '⚡', color: '#6B7280' },
  ];
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando funções...</p>
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
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Funções do Assistente
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Ative ou desative as funções que seu assistente pode executar
            </p>
          </div>
          
          {/* Categories */}
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
                      <div
                        key={fn.id}
                        className={`border rounded-2xl p-6 transition-all ${
                          enabled
                            ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 shadow-lg'
                            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {/* Header do Card */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                              style={{ backgroundColor: `${fn.color}20` }}
                            >
                              {fn.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                {fn.function_name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {fn.short_description}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => toggleFunction(fn.function_key, enabled)}
                            disabled={isUpdating}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                              enabled
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isUpdating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>...</span>
                              </>
                            ) : enabled ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Ativada</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4" />
                                <span>Desativada</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Descrição */}
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                          {fn.description}
                        </p>
                        
                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {fn.requires_payment && (
                            <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                              💳 Requer Pagamento
                            </span>
                          )}
                          {fn.is_premium && (
                            <span className="px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
                              ⭐ Premium
                            </span>
                          )}
                          {fn.consumes_credits && (
                            <span className="px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium">
                              🔥 {fn.credits_per_use} crédito{fn.credits_per_use > 1 ? 's' : ''}
                            </span>
                          )}
                          {!fn.save_to_history && (
                            <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium">
                              👻 Não salva histórico
                            </span>
                          )}
                        </div>
                        
                        {/* Stats */}
                        {enabled && stats.usageCount > 0 && (
                          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Usos</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{stats.usageCount}</p>
                              </div>
                            </div>
                            {stats.lastUsed && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">Último uso</p>
                                  <p className="font-semibold text-gray-900 dark:text-white text-xs">
                                    {new Date(stats.lastUsed).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Exemplos */}
                        {fn.example_phrases && fn.example_phrases.length > 0 && (
                          <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                              💬 Exemplos de uso:
                            </p>
                            <ul className="space-y-1">
                              {fn.example_phrases.slice(0, 2).map((phrase, i) => (
                                <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
                                  • "{phrase}"
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
