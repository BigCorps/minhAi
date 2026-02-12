'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { format, parseISO, subDays } from 'date-fns';

type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'stacked' | 'funnel' | 'radar' | 'scatter';
type ViewType = '7days' | '30days' | '90days' | 'all';

interface CreditTransaction {
  id: string;
  transaction_type: 'purchase' | 'usage' | 'bonus' | 'refund' | 'initial';
  amount: number;
  balance_after: number;
  created_at: string;
  notes?: string;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  consumed: number;
  added: number;
  balance: number;
}

export function CreditsProgressChartSimple({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Evitar problemas de hidratação SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [userId, mounted]);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const startDate = subDays(new Date(), 30);

      let transactionsQuery = supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      const { data: transactionsData, error: transactionsError } = await transactionsQuery;

      if (transactionsError) {
        console.error('Error loading transactions:', transactionsError);
      } else {
        setTransactions(transactionsData || []);
      }
    } catch (error) {
      console.error('Error in loadData:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalConsumed = transactions
      .filter(t => t.transaction_type === 'usage')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalAdded = transactions
      .filter(t => ['purchase', 'bonus', 'initial', 'refund'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentBalance = transactions.length > 0 
      ? transactions[transactions.length - 1].balance_after 
      : 0;

    return { totalConsumed, totalAdded, currentBalance };
  }, [transactions]);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Progressão de Créditos</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Últimos 30 dias</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Adicionados</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalAdded}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Consumidos</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalConsumed}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.currentBalance}</p>
          </div>
        </div>

        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">Gráfico será carregado em breve</p>
          <p className="text-xs mt-1">{transactions.length} transações encontradas</p>
        </div>
      </div>
    </div>
  );
}
