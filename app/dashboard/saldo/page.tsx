'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  Loader2, TrendingUp, RefreshCw, Download, Wallet,
  AlertCircle, CheckCircle2, Filter, Zap,
} from 'lucide-react';
import PixLinkModal from '@/components/dashboard/PixLinkModal';

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
  destination_withdrawal_pix_key: string;
  notes?: string;
  company_id: string;
}

interface CreditPackage {
  id: string;
  name: string;
  price_cents: number;
  interactions: number;
  package_type: 'credits' | 'monthly';
  is_highlighted: boolean;
  display_order: number;
}

type StatusFilter = 'confirmed' | 'cancelled' | 'all';
type WithdrawTab = 'withdraw' | 'buy';

export default function SaldoPage() {
  const supabase = createClient();

  // ── Auth / perfil ──────────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);

  // ── Saldo ──────────────────────────────────────────────────────────────────
  const [companyBalances, setCompanyBalances] = useState<CompanyBalance[]>([]);
  const [totalBalance, setTotalBalance] = useState({
    available_balance_cents: 0,
    total_received_cents: 0,
    total_transferred_cents: 0,
  });

  // ── Transações PIX ────────────────────────────────────────────────────────
  const [pixTransactions, setPixTransactions] = useState<PixTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<PixTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('confirmed');

  // ── UI geral ──────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pix' | 'withdraw'>('pix');
  const [pixLinkModalOpen, setPixLinkModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Saque PIX ─────────────────────────────────────────────────────────────
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // ── Comprar créditos com saldo ────────────────────────────────────────────
  const [activeWithdrawTab, setActiveWithdrawTab] = useState<WithdrawTab>('withdraw');
  const [availablePackages, setAvailablePackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isBuyingWithBalance, setIsBuyingWithBalance] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (userId) loadBalanceData(); }, [userId]);
  useEffect(() => { filterTransactions(); }, [pixTransactions, statusFilter]);
  useEffect(() => { loadPackages(); }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function filterTransactions() {
    let filtered = [...pixTransactions];
    if (statusFilter === 'confirmed')
      filtered = filtered.filter(tx => tx.status === 'confirmed' || tx.status === 'transferred');
    else if (statusFilter === 'cancelled')
      filtered = filtered.filter(tx => tx.status === 'cancelled' || tx.status === 'expired');
    setFilteredTransactions(filtered);
  }

  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatPixKey(key: string) {
    if (!key) return '';
    if (key.length > 20) return key.substring(0, 10) + '...' + key.substring(key.length - 10);
    return key;
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { label: string; className: string }> = {
      confirmed:  { label: 'Confirmado', className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' },
      transferred:{ label: 'Concluído',  className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' },
      pending:    { label: 'Pendente',   className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' },
      cancelled:  { label: 'Cancelado',  className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
      expired:    { label: 'Expirado',   className: 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${config.className}`}>
        {config.label}
      </span>
    );
  }

  // ── Data loaders ──────────────────────────────────────────────────────────
  async function loadInitialData() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (profile) setUserProfile(profile);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      setIsLoading(false);
    }
  }

  async function loadBalanceData() {
    setIsLoading(true);
    try {
      const { data: balanceData, error: balanceError } = await supabase
        .from('company_balance')
        .select('*')
        .eq('user_id', userId);

      if (!balanceError && balanceData && balanceData.length > 0) {
        setCompanyBalances(balanceData);
        const total = balanceData.reduce(
          (acc, curr) => ({
            available_balance_cents: acc.available_balance_cents + curr.available_balance_cents,
            total_received_cents: acc.total_received_cents + curr.total_received_cents,
            total_transferred_cents: acc.total_transferred_cents + curr.total_transferred_cents,
          }),
          { available_balance_cents: 0, total_received_cents: 0, total_transferred_cents: 0 }
        );
        setTotalBalance(total);
      }

      const { data: pixData, error: pixError } = await supabase
        .from('pix_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })
        .limit(100);

      if (!pixError && pixData) setPixTransactions(pixData);
    } catch (error) {
      console.error('Erro ao carregar dados de saldo:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPackages() {
    const { data } = await supabase
      .from('credits_packages')
      .select('id, name, price_cents, interactions, package_type, is_highlighted, display_order')
      .eq('is_active', true)
      .gt('price_cents', 0)
      .order('display_order');
    setAvailablePackages(data || []);
  }

  // ── Ações ─────────────────────────────────────────────────────────────────
  async function handleWithdraw() {
    setMessage(null);
    const pixKey = userProfile?.withdrawal_pix_key;

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
        body: { amount, userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;

      setMessage({ type: 'success', text: 'Solicitação de saque enviada com sucesso! O valor será creditado em sua conta em breve.' });
      setWithdrawAmount('');
      setTimeout(() => loadBalanceData(), 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao processar saque: ' + (error.message || 'Tente novamente mais tarde.') });
    } finally {
      setIsWithdrawing(false);
    }
  }

  async function handleBuyWithBalance() {
    if (!selectedPackage) {
      setMessage({ type: 'error', text: 'Selecione um pacote.' });
      return;
    }

    const pkg = availablePackages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    if (pkg.price_cents > totalBalance.available_balance_cents) {
      setMessage({ type: 'error', text: 'Saldo insuficiente para este pacote.' });
      return;
    }

    setIsBuyingWithBalance(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('purchase-with-balance', {
        body: { package_id: selectedPackage },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');

      setMessage({
        type: 'success',
        text: `✅ ${pkg.name} ativado! ${pkg.interactions.toLocaleString('pt-BR')} créditos adicionados à sua conta.`,
      });
      setSelectedPackage(null);
      setTimeout(() => loadBalanceData(), 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao processar compra.' });
    } finally {
      setIsBuyingWithBalance(false);
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const fee = withdrawAmount ? parseFloat(withdrawAmount) * 0.01 : 0;
  const netAmount = withdrawAmount ? parseFloat(withdrawAmount) - fee : 0;
  const pixKey = userProfile?.withdrawal_pix_key;

  const statusCounts = {
    confirmed: pixTransactions.filter(tx => tx.status === 'confirmed' || tx.status === 'transferred').length,
    cancelled: pixTransactions.filter(tx => tx.status === 'cancelled' || tx.status === 'expired').length,
    all: pixTransactions.length,
  };

  // ── Loading state ─────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recebimentos</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerencie seus recebimentos e solicite saque imediato</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPixLinkModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Link PIX
            </button>
            <button
              onClick={loadBalanceData}
              className="inline-flex items-center px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition shadow-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </button>
          </div>
        </div>

        {/* ── Cards de resumo ───────────────────────────────────────────────── */}
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

        {/* ── Tabs principais ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab('pix')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'pix'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Histórico de Transações
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'withdraw'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Solicitar Saque
            </button>
          </div>

          <div className="p-8">

            {/* ══════════════════════════════════════════════════════════════
                ABA: HISTÓRICO DE TRANSAÇÕES
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'pix' && (
              <div className="space-y-6">

                {/* Filtros */}
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
                      <tbody>
                        {(() => {
                          const rows: React.ReactNode[] = [];
                          let lastDay = '';
                          let dayTotal = 0;
                          let dayGroup: PixTransaction[] = [];

                          const flushDay = (day: string, group: PixTransaction[], total: number) => {
                            // Separador de dia
                            rows.push(
                              <tr key={`sep-${day}`}>
                                <td colSpan={5} className="pt-5 pb-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', {
                                        weekday: 'short',
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                    <div className="flex-1 border-t border-gray-200 dark:border-white/10" />
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                      Total do dia:{' '}
                                      <span className="text-green-600 dark:text-green-400">
                                        {formatCurrency(total)}
                                      </span>
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );

                            // Linhas do dia
                            group.forEach((tx) => {
                              rows.push(
                                <tr key={tx.id} className="text-sm border-t border-gray-100 dark:border-white/5">
                                  <td className="py-4 text-gray-600 dark:text-gray-400">
                                    {new Date(tx.requested_at).toLocaleString('pt-BR')}
                                  </td>
                                  <td className="py-4">
                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                                      {tx.notes?.includes('Saque') || tx.notes?.includes('Compra via saldo')
                                        ? tx.notes?.includes('Compra via saldo') ? 'Compra Créditos' : 'Saque'
                                        : 'PIX Recebido'}
                                    </span>
                                  </td>
                                  <td className="py-4 font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(tx.amount_cents)}
                                  </td>
                                  <td className="py-4">
                                    {getStatusBadge(tx.status)}
                                  </td>
                                  <td className="py-4 text-gray-500 dark:text-gray-500 font-mono text-xs">
                                    {tx.notes || formatPixKey(tx.destination_withdrawal_pix_key)}
                                  </td>
                                </tr>
                              );
                            });
                          };

                          filteredTransactions.forEach((tx) => {
                            const day = tx.requested_at.slice(0, 10);
                            if (day !== lastDay) {
                              if (lastDay) flushDay(lastDay, dayGroup, dayTotal);
                              lastDay = day;
                              dayTotal = 0;
                              dayGroup = [];
                            }
                            dayTotal += tx.amount_cents;
                            dayGroup.push(tx);
                          });

                          if (lastDay) flushDay(lastDay, dayGroup, dayTotal);

                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ABA: SOLICITAR SAQUE
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'withdraw' && (
              <div className="max-w-2xl mx-auto space-y-6">

                {/* Mensagem de feedback */}
                {message && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                      : 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                  }`}>
                    {message.type === 'success'
                      ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                )}

                {/* Sub-tabs: Saque PIX | Comprar com Saldo */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => { setActiveWithdrawTab('withdraw'); setMessage(null); }}
                    className={`flex-1 py-2.5 text-sm font-semibold transition ${
                      activeWithdrawTab === 'withdraw'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    Saque PIX
                  </button>
                  <button
                    onClick={() => { setActiveWithdrawTab('buy'); setMessage(null); }}
                    className={`flex-1 py-2.5 text-sm font-semibold transition ${
                      activeWithdrawTab === 'buy'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    Comprar Créditos com Saldo
                  </button>
                </div>

                {/* ── SUB-ABA: SAQUE PIX ─────────────────────────────────── */}
                {activeWithdrawTab === 'withdraw' && (
                  <div className="space-y-4">
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
                          <span className="text-gray-500">Taxa de Serviço (1%)</span>
                          <span className="text-red-500 font-medium">
                            -{fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-white/10 pt-2">
                          <span className="text-gray-900 dark:text-white">Valor Líquido</span>
                          <span className="text-green-600 dark:text-green-400">
                            {netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleWithdraw}
                      disabled={isWithdrawing || !pixKey || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      {isWithdrawing ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                      ) : (
                        <><Download className="w-5 h-5" /> Solicitar Saque</>
                      )}
                    </button>

                    {!pixKey && (
                      <p className="text-center text-xs text-red-500 font-medium">
                        ⚠️ Configure sua chave Pix no Perfil para habilitar saques.
                      </p>
                    )}
                  </div>
                )}

                {/* ── SUB-ABA: COMPRAR CRÉDITOS COM SALDO ───────────────── */}
                {activeWithdrawTab === 'buy' && (
                  <div className="space-y-5">

                    {/* Saldo disponível */}
                    <div className="bg-blue-50 dark:bg-blue-500/5 rounded-2xl p-4 border border-blue-100 dark:border-blue-500/10 flex justify-between items-center">
                      <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">Saldo disponível</span>
                      <span className="text-xl font-bold text-blue-900 dark:text-white">
                        {formatCurrency(totalBalance.available_balance_cents)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Selecione um pacote — <strong>sem taxa de serviço</strong>. O valor é debitado do seu saldo e os créditos são ativados instantaneamente.
                    </p>

                    {/* Grid de pacotes */}
                    {availablePackages.length === 0 ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Carregando pacotes...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availablePackages.map((pkg) => {
                          const isSelected = selectedPackage === pkg.id;
                          const canAfford = pkg.price_cents <= totalBalance.available_balance_cents;
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => canAfford && setSelectedPackage(isSelected ? null : pkg.id)}
                              disabled={!canAfford}
                              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                  : canAfford
                                    ? 'border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 bg-white dark:bg-white/5'
                                    : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] opacity-50 cursor-not-allowed'
                              }`}
                            >
                              {pkg.is_highlighted && (
                                <span className="absolute -top-2 right-3 bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Popular
                                </span>
                              )}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className={`font-bold text-sm ${
                                    isSelected
                                      ? 'text-blue-700 dark:text-blue-300'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {pkg.name}
                                  </p>
                                  <p className={`text-xs mt-0.5 ${
                                    isSelected
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {pkg.interactions.toLocaleString('pt-BR')} créditos
                                    {pkg.package_type === 'monthly' && ' · 30 dias'}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className={`font-bold text-base ${
                                    isSelected
                                      ? 'text-blue-700 dark:text-blue-300'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {formatCurrency(pkg.price_cents)}
                                  </p>
                                  {isSelected && (
                                    <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto mt-1" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Resumo da compra selecionada */}
                    {selectedPackage && (() => {
                      const pkg = availablePackages.find(p => p.id === selectedPackage)!;
                      return (
                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Pacote</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{pkg.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Créditos</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              +{pkg.interactions.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          {pkg.package_type === 'monthly' && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Validade</span>
                              <span className="font-semibold text-gray-900 dark:text-white">30 dias</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Taxa</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">Sem taxa</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-2 font-bold">
                            <span className="text-gray-900 dark:text-white">Débito no saldo</span>
                            <span className="text-red-500">-{formatCurrency(pkg.price_cents)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span className="text-gray-900 dark:text-white">Saldo após compra</span>
                            <span className="text-gray-900 dark:text-white">
                              {formatCurrency(totalBalance.available_balance_cents - pkg.price_cents)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      onClick={handleBuyWithBalance}
                      disabled={isBuyingWithBalance || !selectedPackage}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      {isBuyingWithBalance ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                      ) : (
                        <><Zap className="w-5 h-5" /> Confirmar Compra com Saldo</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {pixLinkModalOpen && (
        <PixLinkModal
          onClose={() => setPixLinkModalOpen(false)}
          isDark={true}
        />
      )}
    </div>
  );
}
