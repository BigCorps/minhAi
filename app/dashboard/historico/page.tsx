'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Search, RefreshCw, Zap, Trash2, ChevronDown, User, MessageSquare } from 'lucide-react';

interface AssistantFunction {
  function_key: string;
  function_name: string;
  short_description: string | null;
  description: string;
}

interface LogEntry {
  id: string;
  company_id: string;
  function_key: string;
  credits_consumed: number;
  executed_at: string;
  metadata: any;
  companyName: string;
  realUserMessage?: string;
  realAssistantMessage?: string;
}

export default function HistoricoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [functions, setFunctions] = useState<Record<string, AssistantFunction>>({});
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const supabase = createClient();

  const DIALOGUE_FUNCTIONS = ['chatgpt', 'orcamento', 'faq'];

  useEffect(() => {
    if (dropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [dropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCompany]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Buscar empresas do usuário
      const { data: adminData } = await supabase
        .from('company_admins')
        .select('company_id')
        .eq('user_id', user.id);

      let userCompanyIds: string[] = [];
      if (adminData && adminData.length > 0) {
        userCompanyIds = adminData.map(a => a.company_id);
      } else {
        const { data: allCompanies } = await supabase.from('companies').select('id');
        if (allCompanies) userCompanyIds = allCompanies.map(c => c.id);
      }

      if (userCompanyIds.length === 0) {
        setCompanies([]);
        setLogs([]);
        setLoading(false);
        return;
      }

      // 2. Carregar empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .in('id', userCompanyIds)
        .order('name');

      if (companiesError) throw new Error('Não foi possível carregar as empresas');
      setCompanies(companiesData || []);

      // 3. Carregar funções
      const { data: functionsData } = await supabase
        .from('assistant_functions')
        .select('function_key, function_name, short_description, description');

      const functionsMap: Record<string, AssistantFunction> = {};
      (functionsData || []).forEach(f => {
        functionsMap[f.function_key] = f;
      });
      setFunctions(functionsMap);

      // 4. Buscar logs
      let query = supabase
        .from('assistant_function_logs')
        .select('id, company_id, function_key, credits_consumed, executed_at, metadata')
        .in('company_id', userCompanyIds)
        .order('executed_at', { ascending: false })
        .limit(200);

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }

      const { data: logsData, error: logsError } = await query;
      if (logsError) throw new Error('Erro ao carregar histórico: ' + logsError.message);

      let enriched: LogEntry[] = (logsData || []).map(log => ({
        ...log,
        companyName: companiesData?.find(c => c.id === log.company_id)?.name ?? '—',
      }));

      console.log('🔍 INÍCIO DO DEBUG');
      console.log('Total de logs:', enriched.length);
      
      // ABORDAGEM ALTERNATIVA: Buscar conversas por timestamp
      const dialogueLogs = enriched.filter(log => DIALOGUE_FUNCTIONS.includes(log.function_key));
      console.log('Logs de diálogo (chatgpt, orcamento, faq):', dialogueLogs.length);

      if (dialogueLogs.length > 0) {
        // Para cada log de diálogo, buscar conversas próximas no tempo
        for (const log of dialogueLogs) {
          console.log('\n📝 Processando log:', {
            function_key: log.function_key,
            executed_at: log.executed_at,
            metadata: log.metadata
          });

          // Tentar 1: Usar conversation_id do metadata se existir
          let conversationId = log.metadata?.conversation_id;
          console.log('  conversation_id do metadata:', conversationId);

          if (!conversationId) {
            // Tentar 2: Buscar conversa por timestamp próximo (±30 segundos)
            const logTime = new Date(log.executed_at);
            const timeBefore = new Date(logTime.getTime() - 30000); // 30 seg antes
            const timeAfter = new Date(logTime.getTime() + 30000);  // 30 seg depois

            console.log('  Buscando conversa por timestamp:', {
              logTime: logTime.toISOString(),
              timeBefore: timeBefore.toISOString(),
              timeAfter: timeAfter.toISOString()
            });

            const { data: nearConversations } = await supabase
              .from('conversations')
              .select('id, started_at')
              .eq('company_id', log.company_id)
              .gt('started_at', timeBefore.toISOString())
              .lt('started_at', timeAfter.toISOString())
              .gt('total_messages', 0)
              .order('started_at', { ascending: false })
              .limit(1);

            console.log('  Conversas encontradas:', nearConversations?.length);
            
            if (nearConversations && nearConversations.length > 0) {
              conversationId = nearConversations[0].id;
              console.log('  ✅ Conversa encontrada por timestamp:', conversationId);
            }
          }

          if (conversationId) {
            // Buscar mensagens dessa conversa
            console.log('  Buscando mensagens da conversa:', conversationId);
            
            const { data: messages, error: msgError } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: true });

            console.log('  Mensagens encontradas:', messages?.length);
            console.log('  Erro ao buscar mensagens:', msgError);

            if (messages && messages.length > 0) {
              console.log('  Primeira mensagem:', messages[0]);
              console.log('  Última mensagem:', messages[messages.length - 1]);

              // Buscar o último par user->assistant
              let userMsg = '';
              let assistantMsg = '';

              for (let i = messages.length - 1; i > 0; i--) {
                const msg1 = messages[i - 1];
                const msg2 = messages[i];

                if (msg1.role === 'user' && msg2.role === 'assistant') {
                  userMsg = msg1.content;
                  assistantMsg = msg2.content;
                  console.log('  ✅ Par encontrado no índice:', i - 1, i);
                  break;
                }
              }

              if (!userMsg && messages.length >= 2) {
                // Fallback: pegar as duas últimas mensagens de qualquer tipo
                const lastTwo = messages.slice(-2);
                if (lastTwo[0].role === 'user') userMsg = lastTwo[0].content;
                if (lastTwo[1].role === 'assistant') assistantMsg = lastTwo[1].content;
                console.log('  ⚠️ Usando fallback - últimas 2 mensagens');
              }

              console.log('  User message length:', userMsg.length);
              console.log('  Assistant message length:', assistantMsg.length);

              // Atualizar o log com mensagens reais
              const logIndex = enriched.findIndex(l => l.id === log.id);
              if (logIndex !== -1) {
                enriched[logIndex] = {
                  ...enriched[logIndex],
                  realUserMessage: userMsg,
                  realAssistantMessage: assistantMsg,
                };
                console.log('  ✅ Log atualizado com mensagens reais');
              }
            } else {
              console.log('  ❌ Nenhuma mensagem encontrada');
            }
          } else {
            console.log('  ❌ Nenhum conversation_id disponível');
          }
        }
      }

      console.log('\n🏁 FIM DO DEBUG');
      console.log('Logs finais com realUserMessage:', enriched.filter(l => l.realUserMessage).length);

      setLogs(enriched);
    } catch (err: any) {
      console.error('❌ Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const { error } = await supabase.from('assistant_function_logs').delete().eq('id', id);
      if (error) throw error;
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  }

  function shouldShowRealDialogue(log: LogEntry): boolean {
    return DIALOGUE_FUNCTIONS.includes(log.function_key) && 
           (!!log.realUserMessage || !!log.realAssistantMessage);
  }

  function getUserMessage(log: LogEntry): string {
    if (shouldShowRealDialogue(log) && log.realUserMessage) {
      return log.realUserMessage;
    }
    if (log.metadata?.transcript) return log.metadata.transcript;
    if (log.metadata?.user_input) return log.metadata.user_input;
    const func = functions[log.function_key];
    return func?.function_name ?? log.function_key;
  }

  function getAssistantMessage(log: LogEntry): string {
    if (shouldShowRealDialogue(log) && log.realAssistantMessage) {
      return log.realAssistantMessage;
    }
    if (log.metadata?.assistant_response) return log.metadata.assistant_response;
    if (log.metadata?.response) return log.metadata.response;
    const func = functions[log.function_key];
    return func?.short_description ?? func?.description ?? 'Função executada com sucesso.';
  }

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const func = functions[log.function_key];
    return (
      log.function_key.toLowerCase().includes(search) ||
      (func?.function_name ?? '').toLowerCase().includes(search) ||
      log.companyName.toLowerCase().includes(search) ||
      getUserMessage(log).toLowerCase().includes(search) ||
      getAssistantMessage(log).toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen transition-colors duration-500 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-8">
          <h1 className="text-3xl font-bold transition-colors text-gray-900 dark:text-white">
            Histórico de Conversas
          </h1>
          <p className="mt-2 transition-colors text-gray-600 dark:text-white/60">
            Visualize e gerencie as interações dos usuários com seus assistentes.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-red-600 dark:text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-red-900 dark:text-red-200 font-semibold mb-1">Erro ao carregar histórico</h3>
                <p className="text-red-800 dark:text-red-300 text-sm mb-3">{error}</p>
                <button onClick={loadData} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        )}

<div className="rounded-xl shadow-sm p-6 mb-6 transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
  {/* Container principal flex: no desktop os 3 itens ficarão lado a lado, alinhados por baixo */}
  <div className="flex flex-col md:flex-row md:items-end gap-4">
    
    {/* 1. Busca (Ocupa o espaço restante com flex-1) */}
    <div className="flex-1 relative">
      <label className="block text-sm font-medium mb-2 transition-colors text-gray-700 dark:text-gray-300">
        Buscar
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por função, assistente, pergunta..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
          bg-white/50 border-gray-300 text-gray-900
          dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
        />
      </div>
    </div>

    {/* 2. Filtro */}
    <div className="w-full md:w-64">
      <label className="block text-sm font-medium mb-2 transition-colors text-gray-700 dark:text-gray-300">
        Filtrar por Assistente
      </label>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
        bg-white/50 border-gray-300 text-gray-900
        dark:bg-white/5 dark:border-white/10 dark:text-white
        flex items-center justify-between text-left"
      >
        <span className="truncate">
          {selectedCompany === 'all'
            ? 'Todos os assistentes'
            : companies.find(c => c.id === selectedCompany)?.name || 'Selecionar'}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>

    {/* 3. Botão Atualizar */}
    <div className="w-full md:w-auto">
      {/* O padding (py-2 px-4) e arredondamento (rounded-lg) foram igualados aos campos ao lado */}
      <button
        onClick={loadData}
        disabled={loading}
        className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border border-transparent transition-colors disabled:opacity-50
        bg-gray-100 text-gray-700 hover:bg-gray-200
        dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        <span>Atualizar</span>
      </button>
    </div>

  </div>
</div>

        {loading ? (
          <div className="rounded-xl shadow-sm p-12 text-center transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="transition-colors text-gray-600 dark:text-gray-400">Carregando histórico...</p>
          </div>
        ) : filteredLogs.length === 0 && !error ? (
          <div className="rounded-xl shadow-sm p-12 text-center transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-white/10">
              <Zap className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
              Nenhuma interação encontrada
            </h2>
            <p className="transition-colors text-gray-600 dark:text-gray-400">
              Ainda não há funções executadas para os critérios selecionados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map(log => {
              const func = functions[log.function_key];
              const userMsg = getUserMessage(log);
              const assistantMsg = getAssistantMessage(log);
              const isRealDialogue = shouldShowRealDialogue(log);

              return (
                <div
                  key={log.id}
                  className="rounded-xl shadow-sm overflow-hidden border transition-all
                  bg-white/80 border-gray-200 hover:border-blue-300
                  dark:bg-white/5 dark:border-white/10 dark:hover:border-blue-500/30 backdrop-blur-sm"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {log.companyName}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          {func?.function_name ?? log.function_key}
                        </span>
                        {isRealDialogue && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            💬 Diálogo Real
                          </span>
                        )}
                        {log.credits_consumed > 0 && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            {log.credits_consumed} crédito{log.credits_consumed !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(log.executed_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                          <p className="text-sm text-gray-900 dark:text-gray-200 whitespace-pre-wrap">{userMsg}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100/50 dark:border-blue-500/10">
                          <p className="text-sm text-gray-900 dark:text-gray-200 whitespace-pre-wrap">{assistantMsg}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-[99999] rounded-lg border shadow-lg overflow-hidden bg-white border-gray-200 dark:bg-gray-800 dark:border-white/10"
          style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, width: `${dropdownPosition.width}px` }}
        >
          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => { setSelectedCompany('all'); setDropdownOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                ${selectedCompany === 'all'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10'}`}
            >
              Todos os assistentes
            </button>
            {companies.map(company => (
              <button
                key={company.id}
                type="button"
                onClick={() => { setSelectedCompany(company.id); setDropdownOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                  ${selectedCompany === company.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10'}`}
              >
                {company.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
