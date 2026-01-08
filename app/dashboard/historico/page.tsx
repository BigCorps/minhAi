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
      // 1. Carregar empresas para filtro
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug')
        .order('name');

      if (companiesError) {
        console.error('Erro ao carregar empresas:', companiesError);
        throw new Error('Não foi possível carregar as empresas');
      }

      setCompanies(companiesData || []);

      // 2. Carregar conversas (USAR started_at)
      let query = supabase
        .from('conversations')
        .select('id, company_id, started_at')
        .order('started_at', { ascending: false })
        .limit(50);

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }

      const { data: conversations, error: convError } = await query;

      if (convError) {
        console.error('Erro ao carregar conversas:', convError);
        throw new Error('Erro ao carregar conversas: ' + convError.message);
      }

      if (!conversations || conversations.length === 0) {
        setMessagePairs([]);
        setLoading(false);
        return;
      }

      // 3. Para cada conversa, buscar mensagens e empresa
      const pairs: MessagePair[] = [];

      for (const conv of conversations) {
        // Buscar empresa
        const company = companiesData?.find(c => c.id === conv.company_id);
        
        if (!company) continue;

        // Buscar mensagens
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('Erro ao carregar mensagens:', msgError);
          continue;
        }

        if (!messages || messages.length === 0) continue;

        // Agrupar mensagens em pares (user + assistant)
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
            i++; // Pular próxima mensagem já processada
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

      // Recarregar dados
      loadData();
    } catch (error: any) {
      console.error('Error deleting:', error);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Voltar
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Histórico de Conversas
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-900 font-semibold mb-1">Erro ao carregar histórico</h3>
                <p className="text-red-800 text-sm mb-3">{error}</p>
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

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                id="search"
                placeholder="Buscar por pergunta, resposta ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="w-full md:w-64">
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Empresa
              </label>
              <select
                id="company"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredPairs.length} {filteredPairs.length === 1 ? 'interação' : 'interações'}
            </span>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition disabled:opacity-50"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : filteredPairs.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Nenhuma conversa ainda
            </h2>
            <p className="text-gray-600 mb-6">
              As conversas aparecerão aqui quando os clientes usarem o assistente
            </p>
            <Link
              href="/dashboard/empresas"
              className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              Ver Empresas
            </Link>
          </div>
        ) : !error && (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pergunta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resposta
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPairs.map((pair) => (
                      <tr key={pair.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                            href={`/assistente/${pair.companySlug}`}
                            target="_blank"
                            className="text-sm font-medium text-orange-600 hover:text-orange-700"
                          >
                            {pair.companyName}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md">
                            <div className="flex items-start space-x-2">
                              <span className="flex-shrink-0 text-blue-600">👤</span>
                              <p className="line-clamp-3">{pair.userMessage}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 max-w-md">
                            <div className="flex items-start space-x-2">
                              <span className="flex-shrink-0 text-green-600">🤖</span>
                              <p className="line-clamp-3">{pair.assistantMessage}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDelete(pair)}
                            className="text-red-600 hover:text-red-900 transition"
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

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                💡 Dica: Use o histórico para melhorar o prompt
              </h3>
              <p className="text-sm text-blue-800">
                Analise as respostas do assistente. Se não estiverem adequadas, vá em <strong>Empresas → Editar</strong> e ajuste o <strong>Prompt do Assistente</strong> com mais detalhes.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
