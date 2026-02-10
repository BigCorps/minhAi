'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { Search, RefreshCw, MessageSquare, Trash2, ChevronRight, User } from 'lucide-react';

interface MessagePair {
  id: string;
  userMessage: string;
  assistantMessage: string;
  conversationId: string;
  companyName: string;
  companySlug: string;
  timestamp: string;
}

export default function HistoricoPage() {
  const [messagePairs, setMessagePairs] = useState<MessagePair[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [selectedCompany]);

  async function loadData() {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // 1. Buscar empresas onde o usuário é admin
      const { data: adminData } = await supabase
        .from('company_admins')
        .select('company_id')
        .eq('user_id', user.id);

      let userCompanyIds: string[] = [];

      if (adminData && adminData.length > 0) {
        userCompanyIds = adminData.map(a => a.company_id);
      } else {
        const { data: allCompanies } = await supabase
          .from('companies')
          .select('id');
        
        if (allCompanies && allCompanies.length > 0) {
          userCompanyIds = allCompanies.map(c => c.id);
        }
      }

      if (userCompanyIds.length === 0) {
        setCompanies([]);
        setMessagePairs([]);
        setLoading(false);
        return;
      }

      // 2. Carregar detalhes das empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .in('id', userCompanyIds)
        .order('name');

      if (companiesError) throw new Error('Não foi possível carregar as empresas');
      setCompanies(companiesData || []);

      // 3. CORREÇÃO: Buscar conversas que REALMENTE possuem mensagens
      //    Filtramos por total_messages > 0 e aumentamos o limite
      let query = supabase
        .from('conversations')
        .select('id, company_id, started_at')
        .in('company_id', userCompanyIds)
        .gt('total_messages', 0) // <-- NOVO: apenas conversas com mensagens
        .order('started_at', { ascending: false })
        .limit(100); // <-- AUMENTADO: de 50 para 100

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }

      const { data: conversations, error: convError } = await query;

      if (convError) throw new Error('Erro ao carregar conversas: ' + convError.message);

      if (!conversations || conversations.length === 0) {
        setMessagePairs([]);
        setLoading(false);
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // 4. CORREÇÃO: Buscar mensagens em lotes para evitar limites de URL
      //    O Supabase/PostgREST tem limites no tamanho da URL com .in()
      const BATCH_SIZE = 20;
      let allMessages: any[] = [];

      for (let i = 0; i < conversationIds.length; i += BATCH_SIZE) {
        const batch = conversationIds.slice(i, i + BATCH_SIZE);
        const { data: batchMessages, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', batch)
          .order('created_at', { ascending: true });

        if (msgError) throw new Error('Erro ao carregar mensagens: ' + msgError.message);
        if (batchMessages) {
          allMessages = allMessages.concat(batchMessages);
        }
      }

      // 5. Agrupar mensagens em pares (User -> Assistant)
      const pairs: MessagePair[] = [];
      const messagesByConv: Record<string, any[]> = {};
      allMessages.forEach(msg => {
        if (!messagesByConv[msg.conversation_id]) {
          messagesByConv[msg.conversation_id] = [];
        }
        messagesByConv[msg.conversation_id].push(msg);
      });

      // Ordenar mensagens de cada conversa por created_at
      Object.values(messagesByConv).forEach(msgs => {
        msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      conversations.forEach(conv => {
        const company = companiesData?.find(c => c.id === conv.company_id);
        if (!company) return;

        const convMessages = messagesByConv[conv.id] || [];
        
        for (let i = 0; i < convMessages.length - 1; i++) {
          const msg1 = convMessages[i];
          const msg2 = convMessages[i + 1];

          if (msg1.role === 'user' && msg2.role === 'assistant') {
            pairs.push({
              id: `${msg1.id}-${msg2.id}`,
              userMessage: msg1.content,
              assistantMessage: msg2.content,
              conversationId: conv.id,
              companyName: company.name,
              companySlug: company.slug,
              timestamp: msg1.created_at,
            });
            i++; 
          }
        }
      });

      // CORREÇÃO: Ordenar pares por timestamp decrescente
      pairs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setMessagePairs(pairs);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(pair: MessagePair) {
    if (!confirm('Tem certeza que deseja excluir esta interação?')) {
      return;
    }

    try {
      const ids = pair.id.split('-');
      const { error } = await supabase
        .from('messages')
        .delete()
        .in('id', ids);

      if (error) throw error;
      setMessagePairs(prev => prev.filter(p => p.id !== pair.id));
    } catch (error: any) {
      alert('Erro ao excluir interação: ' + error.message);
    }
  }

  const filteredPairs = messagePairs.filter((pair) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      pair.userMessage.toLowerCase().includes(search) ||
      pair.assistantMessage.toLowerCase().includes(search) ||
      pair.companyName.toLowerCase().includes(search)
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
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl shadow-sm p-6 mb-6 transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 relative">
              <label htmlFor="search" className="block text-sm font-medium mb-2 transition-colors text-gray-700 dark:text-gray-300">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  id="search"
                  placeholder="Buscar por pergunta, resposta ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors 
                  bg-white/50 border-gray-300 text-gray-900 
                  dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>

            <div className="w-full md:w-64">
              <label htmlFor="company" className="block text-sm font-medium mb-2 transition-colors text-gray-700 dark:text-gray-300">
                Filtrar por Empresa
              </label>
              <select
                id="company"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
                bg-white/50 border-gray-300 text-gray-900
                dark:bg-white/5 dark:border-white/10 dark:text-white"
              >
                <option value="all">Todas as empresas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm transition-colors text-gray-600 dark:text-gray-400">
            <span>
              {filteredPairs.length} {filteredPairs.length === 1 ? 'interação' : 'interações'}
            </span>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-1 rounded transition disabled:opacity-50
              bg-gray-100 text-gray-700 hover:bg-gray-200
              dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl shadow-sm p-12 text-center transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="transition-colors text-gray-600 dark:text-gray-400">Carregando histórico...</p>
          </div>
        ) : filteredPairs.length === 0 && !error ? (
          <div className="rounded-xl shadow-sm p-12 text-center transition-colors bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-white/10">
              <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
              Nenhuma conversa encontrada
            </h2>
            <p className="transition-colors text-gray-600 dark:text-gray-400">
              Ainda não há interações registradas para os critérios selecionados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPairs.map((pair) => (
              <div
                key={pair.id}
                className="rounded-xl shadow-sm overflow-hidden border transition-all
                bg-white/80 border-gray-200 hover:border-blue-300
                dark:bg-white/5 dark:border-white/10 dark:hover:border-blue-500/30 backdrop-blur-sm"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {pair.companyName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(pair.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(pair)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Excluir interação"
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
                        <p className="text-sm text-gray-900 dark:text-gray-200">{pair.userMessage}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100/50 dark:border-blue-500/10">
                        <p className="text-sm text-gray-900 dark:text-gray-200">{pair.assistantMessage}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-2 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex justify-end">
                  <Link
                    href={`/dashboard/assistentes/${pair.companySlug}/chat?conv=${pair.conversationId}`}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                  >
                    Ver conversa completa <ChevronRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}