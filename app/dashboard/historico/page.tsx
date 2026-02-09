'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

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

      // 1. Buscar company_id via company_admins
      const { data: adminData } = await supabase
        .from('company_admins')
        .select('company_id')
        .eq('user_id', user.id);

      let userCompanyIds: string[] = [];

      if (adminData && adminData.length > 0) {
        userCompanyIds = adminData.map(a => a.company_id);
      } else {
        // FALLBACK: Buscar empresas criadas pelo usuário
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

      // 2. Carregar empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .in('id', userCompanyIds)
        .order('name');

      if (companiesError) throw new Error('Não foi possível carregar as empresas');

      setCompanies(companiesData || []);

      // 3. Carregar conversas
      let query = supabase
        .from('conversations')
        .select('id, company_id, started_at')
        .in('company_id', userCompanyIds)
        .order('started_at', { ascending: false })
        .limit(50);

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

      // 4. Buscar mensagens
      const pairs: MessagePair[] = [];

      for (const conv of conversations) {
        const company = companiesData?.find(c => c.id === conv.company_id);
        if (!company) continue;

        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (msgError) continue;
        if (!messages || messages.length === 0) continue;

        // Agrupar em pares
        for (let i = 0; i < messages.length - 1; i++) {
          const msg1 = messages[i];
          const msg2 = messages[i + 1];

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
      }

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
      loadData();
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
    <div className="min-h-screen transition-colors duration-500 bg-gray-50 dark:bg-slate-950">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Cabeçalho da Página (Interno) */}
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
              <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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

        {/* Filtros */}
        <div className="rounded-lg shadow-md p-6 mb-6 transition-colors bg-white dark:bg-slate-900 dark:border dark:border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium mb-2 transition-colors text-gray-700 dark:text-gray-300">
                Buscar
              </label>
              <input
                type="text"
                id="search"
                placeholder="Buscar por pergunta, resposta ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors 
                bg-white border-gray-300 text-gray-900 
                dark:bg-slate-800 dark:border-white/10 dark:text-white dark:placeholder-gray-500"
              />
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
                bg-white border-gray-300 text-gray-900
                dark:bg-slate-800 dark:border-white/10 dark:text-white"
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
              className="px-3 py-1 rounded transition disabled:opacity-50
              bg-gray-100 text-gray-700 hover:bg-gray-200
              dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              Atualizar
            </button>
          </div>
        </div>

        {/* Loading e Lista */}
        {loading ? (
          <div className="rounded-lg shadow-md p-12 text-center transition-colors bg-white dark:bg-slate-900">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="transition-colors text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        ) : filteredPairs.length === 0 && !error ? (
          <div className="rounded-lg shadow-md p-12 text-center transition-colors bg-white dark:bg-slate-900 dark:border dark:border-white/10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-slate-800">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2 transition-colors text-gray-900 dark:text-white">
              Nenhuma conversa ainda
            </h2>
            <p className="mb-6 transition-colors text-gray-600 dark:text-gray-400">
              As conversas aparecerão aqui quando os clientes usarem o assistente
            </p>
            <Link
              href="/dashboard/empresas"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Ver Empresas
            </Link>
          </div>
        ) : !error && (
          <>
            <div className="rounded-lg shadow-md overflow-hidden transition-colors bg-white dark:bg-slate-900 dark:border dark:border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="transition-colors bg-gray-50 border-b border-gray-200 dark:bg-slate-800 dark:border-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors text-gray-500 dark:text-gray-400">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors text-gray-500 dark:text-gray-400">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors text-gray-500 dark:text-gray-400">
                        Pergunta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors text-gray-500 dark:text-gray-400">
                        Resposta
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider transition-colors text-gray-500 dark:text-gray-400">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y transition-colors bg-white divide-gray-200 dark:bg-slate-900 dark:divide-white/10">
                    {filteredPairs.map((pair) => (
                      <tr key={pair.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm transition-colors text-gray-500 dark:text-gray-400">
                          {new Date(pair.timestamp).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/ia/${pair.companySlug}`}
                            target="_blank"
                            className="text-sm font-medium transition-colors text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {pair.companyName}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm max-w-md transition-colors text-gray-900 dark:text-gray-100">
                            <div className="flex items-start space-x-2">
                              <span className="flex-shrink-0 text-blue-600 dark:text-blue-400">👤</span>
                              <p className="line-clamp-3">{pair.userMessage}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm max-w-md transition-colors text-gray-700 dark:text-gray-300">
                            <div className="flex items-start space-x-2">
                              <span className="flex-shrink-0 text-green-600 dark:text-green-400">🤖</span>
                              <p className="line-clamp-3">{pair.assistantMessage}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDelete(pair)}
                            className="transition-colors text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Excluir"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 rounded-lg p-4 transition-colors bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-500/30">
              <h3 className="font-semibold mb-2 transition-colors text-gray-900 dark:text-white">
                Dica: Use o histórico para melhorar o prompt
              </h3>
              <p className="text-sm transition-colors text-gray-700 dark:text-gray-300">
                Analise as respostas do assistente. Se não estiverem adequadas, vá em <strong>Empresas → Editar</strong> e ajuste o <strong>Prompt do Assistente</strong> com mais detalhes.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}