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

// ─── Timezone ────────────────────────────────────────────────────────────────
// O banco armazena UTC (correto). Sempre exibir convertido para Brasília.
const BRT = 'America/Sao_Paulo';

function formatBRT(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    timeZone: BRT,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Funções que mostram conversa real (buscam da tabela messages)
const DIALOGUE_FUNCTIONS = ['chatgpt', 'orcamento', 'faq'];

// Funções Meta que também têm conteúdo de mensagem real
const META_FUNCTIONS = ['meta_reply', 'meta_comment'];

// Todas as funções que precisam de conteúdo real
const RICH_FUNCTIONS = [...DIALOGUE_FUNCTIONS, ...META_FUNCTIONS];

export default function HistoricoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [functions, setFunctions] = useState<Record<string, AssistantFunction>>({});
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<'all' | 'conversations' | 'actions'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [typeDropdownPosition, setTypeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const typeButtonRef = useRef<HTMLButtonElement>(null);
  const supabase = createClient();

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
    if (typeDropdownOpen && typeButtonRef.current) {
      const rect = typeButtonRef.current.getBoundingClientRect();
      setTypeDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 140),
      });
    }
  }, [typeDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node) &&
        typeButtonRef.current && !typeButtonRef.current.contains(event.target as Node)
      ) {
        setTypeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setPage(0);
    setLogs([]);
    loadData(0);
  }, [selectedCompany]);

  const PAGE_SIZE = 20;

  async function loadData(pageToLoad = 0) {
    const isFirstPage = pageToLoad === 0;
    if (isFirstPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
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
        userCompanyIds = adminData.map((a: any) => a.company_id);
      } else {
        const { data: allCompanies } = await supabase.from('companies').select('id');
        if (allCompanies) userCompanyIds = allCompanies.map((c: any) => c.id);
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
      (functionsData || []).forEach((f: any) => {
        functionsMap[f.function_key] = f;
      });
      setFunctions(functionsMap);

      // 4. Buscar logs paginados (20 por vez) com contagem total
      const from = pageToLoad * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('assistant_function_logs')
        .select('id, company_id, function_key, credits_consumed, executed_at, metadata', { count: 'exact' })
        .in('company_id', userCompanyIds)
        .order('executed_at', { ascending: false })
        .range(from, to);

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }

      const { data: logsData, error: logsError, count } = await query;
      if (logsError) throw new Error('Erro ao carregar histórico: ' + logsError.message);

      const total = count ?? 0;
      setTotalCount(total);
      setHasMore(from + PAGE_SIZE < total);

      const newBatch: LogEntry[] = (logsData || []).map((log: any) => ({
        ...log,
        companyName: companiesData?.find((c: any) => c.id === log.company_id)?.name ?? '—',
      }));

      let enriched = newBatch;

      // 5. Enriquecer logs que precisam de conteúdo real
      //    Estratégia: um único query de messages cobrindo o período dos logs,
      //    depois cruza por conversation_id (quando disponível no metadata)
      //    ou por timestamp ±5s (fallback).

      const richLogs = enriched.filter(log => RICH_FUNCTIONS.includes(log.function_key));

      if (richLogs.length > 0) {
        // Calcular janela de tempo dos logs (mais 10s de margem)
        const timestamps = richLogs.map(l => new Date(l.executed_at).getTime());
        const minTs = new Date(Math.min(...timestamps) - 20000).toISOString();
        const maxTs = new Date(Math.max(...timestamps) + 20000).toISOString();

        // Buscar todas as mensagens do período em um único query
        const { data: allMessages } = await supabase
          .from('messages')
          .select('id, conversation_id, role, content, created_at')
          .gte('created_at', minTs)
          .lte('created_at', maxTs)
          .in('role', ['user', 'assistant'])
          .order('created_at', { ascending: true });

        if (allMessages && allMessages.length > 0) {
          // Agrupar mensagens por conversation_id para acesso rápido
          const msgsByConv: Record<string, Array<{ role: string; content: string; created_at: string }>> = {};
          for (const msg of allMessages) {
            if (!msg.conversation_id) continue;
            if (!msgsByConv[msg.conversation_id]) msgsByConv[msg.conversation_id] = [];
            msgsByConv[msg.conversation_id].push(msg);
          }

          // Indexar mensagens por timestamp (ms) para busca por proximidade
          // Cada entrada: { ts, conversation_id, role, content }
          const msgsByTime = allMessages.map((m: any) => ({
            ts: new Date(m.created_at).getTime(),
            conversation_id: m.conversation_id,
            role: m.role,
            content: m.content,
          }));

          for (const log of richLogs) {
            const logTs = new Date(log.executed_at).getTime();

            // Caminho 1: metadata já tem user_input/assistant_response (logs novos após fix)
            if (log.metadata?.user_input || log.metadata?.assistant_response) {
              const logIndex = enriched.findIndex(l => l.id === log.id);
              if (logIndex !== -1) {
                enriched[logIndex] = {
                  ...enriched[logIndex],
                  realUserMessage: log.metadata.user_input || '',
                  realAssistantMessage: log.metadata.assistant_response || '',
                };
              }
              continue;
            }

            // Caminho 2: Meta functions — ler direto do metadata da plataforma
            if (META_FUNCTIONS.includes(log.function_key) && log.metadata) {
              const metaUser = log.metadata.from_message || log.metadata.comment_text || log.metadata.message || '';
              const metaAssistant = log.metadata.reply_text || log.metadata.response || '';
              if (metaUser || metaAssistant) {
                const logIndex = enriched.findIndex(l => l.id === log.id);
                if (logIndex !== -1) {
                  enriched[logIndex] = {
                    ...enriched[logIndex],
                    realUserMessage: metaUser,
                    realAssistantMessage: metaAssistant,
                  };
                }
                continue;
              }
            }

            // Caminho 3: Cruzar por timestamp ±5s → pegar conversation_id → último par user/assistant
            const WINDOW_MS = 15000; // 15s — cobre latência do GPT no orçamento
            const nearMsg = msgsByTime.find(m => Math.abs(m.ts - logTs) <= WINDOW_MS);

            if (nearMsg?.conversation_id) {
              const convMsgs = msgsByConv[nearMsg.conversation_id] || [];

              // Pegar o último par user → assistant em sequência
              let userMsg = '';
              let assistantMsg = '';

              for (let i = convMsgs.length - 1; i > 0; i--) {
                const prev = convMsgs[i - 1];
                const curr = convMsgs[i];
                if (prev.role === 'user' && curr.role === 'assistant') {
                  userMsg = prev.content;
                  assistantMsg = curr.content;
                  break;
                }
              }

              // Fallback: últimas duas mensagens de qualquer ordem
              if (!userMsg && convMsgs.length >= 2) {
                const last2 = convMsgs.slice(-2);
                if (last2[0].role === 'user') userMsg = last2[0].content;
                if (last2[1].role === 'assistant') assistantMsg = last2[1].content;
              }

              if (userMsg || assistantMsg) {
                const logIndex = enriched.findIndex(l => l.id === log.id);
                if (logIndex !== -1) {
                  enriched[logIndex] = {
                    ...enriched[logIndex],
                    realUserMessage: userMsg,
                    realAssistantMessage: assistantMsg,
                  };
                }
              }
            }
          }
        }
      }

      // Acumular: primeira página substitui, páginas seguintes somam
      setLogs(prev => pageToLoad === 0 ? enriched : [...prev, ...enriched]);
    } catch (err: any) {
      console.error('❌ Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadData(nextPage);
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

  // Verifica se o log tem conteúdo real de diálogo para exibir
  function hasRealDialogue(log: LogEntry): boolean {
    return !!(log.realUserMessage || log.realAssistantMessage);
  }

  // Mensagem do usuário: real se disponível, senão genérica
  function getUserMessage(log: LogEntry): string {
    if (log.realUserMessage) return log.realUserMessage;
    // Fallback para metadados diretos de qualquer função
    if (log.metadata?.transcript) return log.metadata.transcript;
    if (log.metadata?.user_input) return log.metadata.user_input;
    if (log.metadata?.from_message) return log.metadata.from_message;
    if (log.metadata?.comment_text) return log.metadata.comment_text;
    // Genérico: apenas informa qual função foi usada
    const func = functions[log.function_key];
    return `Função "${func?.function_name ?? log.function_key}" executada`;
  }

  // Resposta do assistente: real se disponível, senão descrição da função
  function getAssistantMessage(log: LogEntry): string {
    if (log.realAssistantMessage) return log.realAssistantMessage;
    if (log.metadata?.assistant_response) return log.metadata.assistant_response;
    if (log.metadata?.response) return log.metadata.response;
    if (log.metadata?.reply_text) return log.metadata.reply_text;
    const func = functions[log.function_key];
    return func?.short_description ?? func?.description ?? 'Função executada com sucesso.';
  }

  const filteredLogs = logs.filter(log => {
    // Filtro por tipo: tudo / só conversas / só ações
    const isDialogueLog = DIALOGUE_FUNCTIONS.includes(log.function_key) || META_FUNCTIONS.includes(log.function_key);
    if (viewFilter === 'conversations' && !isDialogueLog) return false;
    if (viewFilter === 'actions' && isDialogueLog) return false;

    // Filtro por texto
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
            {totalCount > 0 && (
              <span className="ml-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                · {totalCount} registros
              </span>
            )}
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

        <div className="rounded-xl shadow-sm px-4 py-4 mb-6 transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">

          {/* ── Desktop: tudo em uma linha ─── Mobile: busca+refresh / seletores ── */}

          {/* Linha 1: busca + seletores desktop + refresh */}
          <div className="flex items-center gap-2">

            {/* Busca */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
                bg-white/50 border-gray-300 text-gray-900
                dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            {/* Seletor Tipo — só desktop */}
            <div className="hidden sm:block relative">
              <button
                ref={typeButtonRef}
                type="button"
                onClick={() => { setTypeDropdownOpen(v => !v); setDropdownOpen(false); }}
                className="flex items-center gap-1 py-2 pl-3 pr-2 text-sm border rounded-lg transition-colors whitespace-nowrap
                bg-white/50 border-gray-300 text-gray-900
                dark:bg-white/5 dark:border-white/10 dark:text-white"
              >
                <span>{viewFilter === 'all' ? 'Tudo' : viewFilter === 'conversations' ? 'Conversas' : 'Funções'}</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Seletor Assistente — só desktop */}
            <div className="hidden sm:block relative">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => { setDropdownOpen(v => !v); setTypeDropdownOpen(false); }}
                className="flex items-center gap-1 py-2 pl-3 pr-2 text-sm border rounded-lg transition-colors whitespace-nowrap
                bg-white/50 border-gray-300 text-gray-900
                dark:bg-white/5 dark:border-white/10 dark:text-white"
              >
                <span className="max-w-[120px] truncate">
                  {selectedCompany === 'all' ? 'Assistente' : companies.find(c => c.id === selectedCompany)?.name || 'Selecionar'}
                </span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              title="Atualizar"
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-transparent transition-colors disabled:opacity-50 flex-shrink-0
              bg-gray-100 text-gray-700 hover:bg-gray-200
              dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Atualizar</span>
            </button>

          </div>

          {/* Linha 2 (mobile): dois seletores lado a lado — idênticos visualmente */}
          <div className="flex gap-2 mt-2 sm:hidden">

            <button
              ref={typeButtonRef}
              type="button"
              onClick={() => { setTypeDropdownOpen(v => !v); setDropdownOpen(false); }}
              className="flex-1 flex items-center justify-between gap-1 py-2 pl-3 pr-2 text-sm border rounded-lg transition-colors
              bg-white/50 border-gray-300 text-gray-900
              dark:bg-white/5 dark:border-white/10 dark:text-white"
            >
              <span>{viewFilter === 'all' ? 'Tudo' : viewFilter === 'conversations' ? 'Conversas' : 'Funções'}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <button
              ref={buttonRef}
              type="button"
              onClick={() => { setDropdownOpen(v => !v); setTypeDropdownOpen(false); }}
              className="flex-1 flex items-center justify-between gap-1 py-2 pl-3 pr-2 text-sm border rounded-lg transition-colors
              bg-white/50 border-gray-300 text-gray-900
              dark:bg-white/5 dark:border-white/10 dark:text-white"
            >
              <span className="truncate">
                {selectedCompany === 'all' ? 'Assistente' : companies.find(c => c.id === selectedCompany)?.name || 'Selecionar'}
              </span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

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
              const isDialogue = hasRealDialogue(log);
              const isGeneric = !isDialogue && !RICH_FUNCTIONS.includes(log.function_key);

              return (
                <div
                  key={log.id}
                  className="rounded-xl shadow-sm overflow-hidden border transition-all
                  bg-white/80 border-gray-200 hover:border-blue-300
                  dark:bg-white/5 dark:border-white/10 dark:hover:border-blue-500/30 backdrop-blur-sm"
                >
                  <div className="p-4 sm:p-6">
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {log.companyName}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          {func?.function_name ?? log.function_key}
                        </span>
                        {isDialogue && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            💬 Conversa real
                          </span>
                        )}
                        {isGeneric && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
                            ⚡ Ação executada
                          </span>
                        )}
                        {log.credits_consumed > 0 && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            {log.credits_consumed} crédito{log.credits_consumed !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatBRT(log.executed_at)}
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

                    {/* Conteúdo */}
                    <div className="space-y-3">
                      {/* Mensagem do usuário */}
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                          <p className={`text-sm whitespace-pre-wrap ${isGeneric ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-gray-200'}`}>
                            {userMsg}
                          </p>
                        </div>
                      </div>

                      {/* Resposta do assistente */}
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100/50 dark:border-blue-500/10">
                          <p className={`text-sm whitespace-pre-wrap ${isGeneric ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-gray-200'}`}>
                            {assistantMsg}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Botão Carregar Mais ── */}
          {hasMore && !loading && (
            <div className="flex flex-col items-center gap-2 pt-2 pb-4">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Mostrando {logs.length} de {totalCount} registros
              </p>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors
                bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300
                dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10
                disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    Carregar mais
                    <span className="text-gray-400 dark:text-gray-500">
                      ({totalCount - logs.length} restantes)
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Sem mais registros */}
          {!hasMore && logs.length > 0 && !loading && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
              Todos os {totalCount} registros carregados
            </p>
          )}
        )}
      </div>

      {/* Dropdown: Tipo (Tudo / Conversas / Funções) */}
      {typeDropdownOpen && (
        <div
          ref={typeDropdownRef}
          className="fixed z-[99999] rounded-lg border shadow-lg overflow-hidden bg-white border-gray-200 dark:bg-gray-800 dark:border-white/10"
          style={{ top: `${typeDropdownPosition.top}px`, left: `${typeDropdownPosition.left}px`, width: `${typeDropdownPosition.width}px` }}
        >
          {(['all', 'conversations', 'actions'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { setViewFilter(opt); setTypeDropdownOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                ${viewFilter === opt
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10'}`}
            >
              {opt === 'all' ? 'Tudo' : opt === 'conversations' ? 'Conversas' : 'Funções'}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown: Assistente */}
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
