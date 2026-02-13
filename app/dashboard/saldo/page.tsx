'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, TrendingUp, RefreshCw, Download, Wallet, AlertCircle, CheckCircle2, Filter } from 'lucide-react';

interface CompanyBalance {
  company_id: string;
  available_balance_cents: number;
  total_received_cents: number;
  total_transferred_cents: number;
  user_id: string;
}

interface PixTransaction {
  id: string;
  amount_cents: number;
  status: string;
  requested_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  transferred_at?: string;
  destination_pix_key: string;
  notes?: string;
  company_id: string;
}

type StatusFilter = 'confirmed' | 'cancelled' | 'all';

export default function SaldoPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string>('');
  const [companyBalances, setCompanyBalances] = useState<CompanyBalance[]>([]);
  const [totalBalance, setTotalBalance] = useState({
    available_balance_cents: 0,
    total_received_cents: 0,
    total_transferred_cents: 0
  });
  const [pixTransactions, setPixTransactions] = useState<PixTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<PixTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('confirmed');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pix' | 'withdraw'>('pix');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Formulários
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (userId) {
      loadBalanceData();
    }
  }, [userId]);

  // ✅ Filtrar transações quando mudar o filtro
  useEffect(() => {
    filterTransactions();
  }, [pixTransactions, statusFilter]);

  function filterTransactions() {
    let filtered = [...pixTransactions];

    switch (statusFilter) {
      case 'confirmed':
        filtered = filtered.filter(tx => 
          tx.status === 'confirmed' || tx.status === 'transferred'
        );
        break;
      case 'cancelled':
        filtered = filtered.filter(tx => 
          tx.status === 'cancelled' || tx.status === 'expired'
        );
        break;
      case 'all':
        // Mostra todos
        break;
    }

    setFilteredTransactions(filtered);
  }

  async function loadInitialData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      setUserId(user.id);
      console.log('User ID:', user.id);

      // Load user profile for Pix key
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        console.log('Perfil não encontrado');
      } else if (profile) {
        setUserProfile(profile);
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados iniciais:', error);
      setIsLoading(false);
    }
  }

  async function loadBalanceData() {
    setIsLoading(true);
    
    try {
      console.log('Carregando saldo do usuário:', userId);
      
      // Buscar saldo de TODAS as empresas do usuário
      const { data: balanceData, error: balanceError } = await supabase
        .from('company_balance')
        .select('*')
        .eq('user_id', userId);

      if (balanceError) {
        console.error('Erro ao carregar saldo:', balanceError);
      } else if (balanceData && balanceData.length > 0) {
        console.log('Saldos carregados:', balanceData);
        setCompanyBalances(balanceData);
        
        // Calcular total consolidado
        const total = balanceData.reduce((acc, curr) => ({
          available_balance_cents: acc.available_balance_cents + curr.available_balance_cents,
          total_received_cents: acc.total_received_cents + curr.total_received_cents,
          total_transferred_cents: acc.total_transferred_cents + curr.total_transferred_cents
        }), {
          available_balance_cents: 0,
          total_received_cents: 0,
          total_transferred_cents: 0
        });
        
        setTotalBalance(total);
        console.log('Saldo total consolidado:', total);
      } else {
        console.log('Nenhum saldo encontrado');
      }

      // Carregar todas as transações PIX do usuário
      const { data: pixData, error: pixError } = await supabase
        .from('pix_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })
        .limit(100);

      if (pixError) {
        console.error('Erro ao carregar transações PIX:', pixError);
      } else if (pixData) {
        console.log(`${pixData.length} transações PIX encontradas`);
        setPixTransactions(pixData);
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados de saldo:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWithdraw() {
    setMessage(null);
    
    const pixKey = userProfile?.pix_key;
    
    if (!pixKey) {
      setMessage({ type: 'error', text: 'Você precisa configurar sua chave Pix no Perfil antes de solicitar um saque.' });
      return;
    }

    if (!withdrawAmount) {
      setMessage({ type: 'error', text: 'Informe o valor do saque.' });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const amountCents = Math.floor(amount * 100);

    if (amountCents < 100) {
      setMessage({ type: 'error', text: 'O valor mínimo para saque é R$ 1,00.' });
      return;
    }

    if (amountCents > totalBalance.available_balance_cents) {
      setMessage({ type: 'error', text: 'Saldo insuficiente.' });
      return;
    }

    setIsWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('request-withdrawal', {
        body: { 
          amount: amount,
          userId: userId
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Solicitação de saque enviada com sucesso! O valor será creditado em sua conta em breve.' });
      setWithdrawAmount('');
      
      setTimeout(() => {
        loadBalanceData();
      }, 1000);

    } catch (error: any) {
      console.error('Erro ao solicitar saque:', error);
      setMessage({ type: 'error', text: 'Erro ao processar saque: ' + (error.message || 'Tente novamente mais tarde.') });
    } finally {
      setIsWithdrawing(false);
    }
  }

  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function formatPixKey(key: string) {
    if (!key) return '';
    if (key.length > 20) {
      return key.substring(0, 10) + '...' + key.substring(key.length - 10);
    }
    return key;
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string; className: string }> = {
      'confirmed': { 
        label: 'Confirmado', 
        className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
      },
      'transferred': { 
        label: 'Concluído', 
        className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
      },
      'pending': { 
        label: 'Pendente', 
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
      },
      'cancelled': { 
        label: 'Cancelado', 
        className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
      },
      'expired': { 
        label: 'Expirado', 
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400'
      },
    };

    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${config.className}`}>
        {config.label}
      </span>
    );
  }

  const fee = withdrawAmount ? parseFloat(withdrawAmount) * 0.005 : 0;
  const netAmount = withdrawAmount ? parseFloat(withdrawAmount) - fee : 0;
  const pixKey = userProfile?.pix_key;

  // Contar por status
  const statusCounts = {
    confirmed: pixTransactions.filter(tx => tx.status === 'confirmed' || tx.status === 'transferred').length,
    cancelled: pixTransactions.filter(tx => tx.status === 'cancelled' || tx.status === 'expired').length,
    all: pixTransactions.length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Saldo e Saques</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerencie seus recebimentos e solicite transferências</p>
            {companyBalances.length > 1 && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Saldo consolidado de {companyBalances.length} empresas
              </p>
            )}
          </div>
          <button
            onClick={loadBalanceData}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo Disponível</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalBalance.available_balance_cents)}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Recebido</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalBalance.total_received_cents)}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
                <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sacado</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalBalance.total_transferred_cents)}
            </p>
          </div>
        </div>

        {/* Tabs e Conteúdo */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-white/5">
            <button
              onClick={() => setActiveTab('pix')}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                activeTab === 'pix' 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-500/5' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Histórico de Transações
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                activeTab === 'withdraw' 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-500/5' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Solicitar Saque
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'pix' ? (
              <div className="space-y-6">
                {/* ✅ Filtros de Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filtrar:</span>
                  
                  <button
                    onClick={() => setStatusFilter('confirmed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === 'confirmed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 ring-2 ring-green-500'
                        : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Confirmados ({statusCounts.confirmed})
                  </button>
                  
                  <button
                    onClick={() => setStatusFilter('cancelled')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === 'cancelled'
                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 ring-2 ring-red-500'
                        : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Cancelados ({statusCounts.cancelled})
                  </button>
                  
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === 'all'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 ring-2 ring-blue-500'
                        : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Todos ({statusCounts.all})
                  </button>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      {statusFilter === 'confirmed' && 'Nenhuma transação confirmada.'}
                      {statusFilter === 'cancelled' && 'Nenhuma transação cancelada.'}
                      {statusFilter === 'all' && 'Nenhuma transação encontrada.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-white/5">
                          <th className="pb-4 font-bold">Data</th>
                          <th className="pb-4 font-bold">Tipo</th>
                          <th className="pb-4 font-bold">Valor</th>
                          <th className="pb-4 font-bold">Status</th>
                          <th className="pb-4 font-bold">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="text-sm">
                            <td className="py-4 text-gray-600 dark:text-gray-400">
                              {new Date(tx.requested_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="py-4">
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                                {tx.notes?.includes('Saque') ? 'Saque' : 'PIX Recebido'}
                              </span>
                            </td>
                            <td className="py-4 font-bold text-gray-900 dark:text-white">
                              {formatCurrency(tx.amount_cents)}
                            </td>
                            <td className="py-4">
                              {getStatusBadge(tx.status)}
                            </td>
                            <td className="py-4 text-gray-500 dark:text-gray-500 font-mono text-xs">
                              {tx.notes || formatPixKey(tx.destination_pix_key)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-6">
                {message && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 ${
                    message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                  }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-500/5 rounded-2xl p-6 border border-blue-100 dark:border-blue-500/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-blue-800 dark:text-blue-300">Saldo Disponível Total</span>
                    <span className="text-xl font-bold text-blue-900 dark:text-white">
                      {formatCurrency(totalBalance.available_balance_cents)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-blue-700 dark:text-blue-400">
                    <span>Chave Pix</span>
                    <span className="font-mono">{pixKey ? formatPixKey(pixKey) : 'Não configurada'}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Valor do Saque (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-lg font-bold text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl space-y-2 border border-gray-100 dark:border-white/5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Taxa de Serviço (0,5%)</span>
                        <span className="text-red-500 font-medium">-{fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-white/10 pt-2">
                        <span className="text-gray-900 dark:text-white">Valor Líquido</span>
                        <span className="text-green-600 dark:text-green-400">{netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing || !pixKey || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    {isWithdrawing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Solicitar Saque
                      </>
                    )}
                  </button>

                  {!pixKey && (
                    <p className="text-center text-xs text-red-500 font-medium">
                      ⚠️ Configure sua chave Pix no Perfil para habilitar saques.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
