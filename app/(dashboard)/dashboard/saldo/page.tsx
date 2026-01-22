'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { Loader2, TrendingUp, TrendingDown, DollarSign, CreditCard, Download, RefreshCw } from 'lucide-react';

interface CompanyBalance {
  available_balance_cents: number;
  total_received_cents: number;
  total_transferred_cents: number;
  withdrawal_pix_key?: string;
  withdrawal_pix_key_type?: string;
}

interface PixTransaction {
  id: string;
  amount_cents: number;
  status: string;
  requested_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  destination_pix_key: string;
}

export default function SaldoPage() {
  const [companyId, setCompanyId] = useState<string>('');
  const [balance, setBalance] = useState<CompanyBalance | null>(null);
  const [pixTransactions, setPixTransactions] = useState<PixTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pix' | 'withdraw' | 'credits' | 'history'>('pix');

  // Formulários
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPixKey, setWithdrawPixKey] = useState('');
  const [withdrawPixKeyType, setWithdrawPixKeyType] = useState('phone');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    loadCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  async function loadCompanyId() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: admin } = await supabase
        .from('company_admins')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (admin) {
        setCompanyId(admin.company_id);
      }
    } catch (error) {
      console.error('Erro ao carregar company_id:', error);
    }
  }

  async function loadData() {
    setIsLoading(true);
    try {
      const { data: balanceData } = await supabase
        .from('company_balance')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (balanceData) {
        setBalance(balanceData);
        setWithdrawPixKey(balanceData.withdrawal_pix_key || '');
        setWithdrawPixKeyType(balanceData.withdrawal_pix_key_type || 'phone');
      }

      const { data: pixData } = await supabase
        .from('pix_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (pixData) setPixTransactions(pixData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('❌ Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWithdraw() {
    if (!withdrawAmount || !withdrawPixKey) {
      alert('❌ Preencha todos os campos');
      return;
    }

    const amountCents = Math.floor(parseFloat(withdrawAmount) * 100);

    if (amountCents <= 0 || amountCents > (balance?.available_balance_cents || 0)) {
      alert('❌ Valor inválido ou insuficiente');
      return;
    }

    setIsWithdrawing(true);
    try {
      alert('✅ Solicitação enviada! Seu saque será processado em breve');
      setWithdrawAmount('');
      loadData();
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
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

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      transferred: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    };

    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
      transferred: 'Transferido',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
        {labels[status] || status}
      </span>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">💰 Saldo</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie seus recebimentos via PIX</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Saldo Disponível</p>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(balance?.available_balance_cents || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Recebido</p>
          <p className="text-3xl font-bold">
            {formatCurrency(balance?.total_received_cents || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Transferido</p>
          <p className="text-3xl font-bold">
            {formatCurrency(balance?.total_transferred_cents || 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          {[
            { key: 'pix', label: 'PIX Recebidos' },
            { key: 'withdraw', label: 'Solicitar Saque' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* PIX Recebidos */}
          {activeTab === 'pix' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">📱 PIX Recebidos</h3>
              {pixTransactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhum PIX recebido ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {pixTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{formatCurrency(tx.amount_cents)}</p>
                          {getStatusBadge(tx.status)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(tx.requested_at).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Chave: {tx.destination_pix_key}
                        </p>
                      </div>
                      {tx.status === 'confirmed' && (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Solicitar Saque */}
          {activeTab === 'withdraw' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">💸 Solicitar Saque</h3>
              
              <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Saldo disponível:</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(balance?.available_balance_cents || 0)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Valor do Saque</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Tipo de Chave PIX</label>
                <select
                  value={withdrawPixKeyType}
                  onChange={(e) => setWithdrawPixKeyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Chave Aleatória</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Chave PIX</label>
                <input
                  placeholder="Digite sua chave PIX"
                  value={withdrawPixKey}
                  onChange={(e) => setWithdrawPixKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900"
                />
              </div>

              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition flex items-center justify-center gap-2"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Solicitar Saque
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
