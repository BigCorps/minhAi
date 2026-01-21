'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface CreditsData {
  available_credits: number;
  total_purchased: number;
  total_used: number;
  percentage_used: number;
}

interface CreditsCardProps {
  companyId: string;
  theme?: 'dark' | 'light';
}

export function CreditsCard({ companyId, theme = 'light' }: CreditsCardProps) {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    fetchCredits();
  }, [companyId]);

  async function fetchCredits() {
    try {
      const response = await fetch(`/api/credits/${companyId}`);
      if (!response.ok) throw new Error('Erro ao buscar créditos');
      const data = await response.json();
      setCredits(data);
    } catch (err) {
      setError('Erro ao carregar créditos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={`rounded-xl p-6 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      } border shadow-lg animate-pulse`}>
        <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error || !credits) {
    return (
      <div className={`rounded-xl p-6 ${
        isDark ? 'bg-slate-800 border-red-900' : 'bg-white border-red-200'
      } border shadow-lg`}>
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Erro ao carregar'}</span>
        </div>
      </div>
    );
  }

  const { available_credits, total_used, percentage_used } = credits;
  const isLowCredits = available_credits <= 10;
  const isOutOfCredits = available_credits === 0;

  return (
    <div className={`rounded-xl p-6 ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
    } border shadow-lg transition-all duration-300 hover:shadow-xl`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${
            isDark ? 'bg-blue-900/30' : 'bg-blue-50'
          }`}>
            <CreditCard className={`w-6 h-6 ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Seus Créditos
            </h3>
            <p className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Interações disponíveis
            </p>
          </div>
        </div>
      </div>

      {/* Créditos Disponíveis */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-4xl font-bold ${
            isOutOfCredits ? 'text-red-500' : 
            isLowCredits ? 'text-yellow-500' : 
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}>
            {available_credits}
          </span>
          <span className={`text-lg ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            interações
          </span>
        </div>

        {/* Barra de Progresso */}
        <div className={`w-full h-2 rounded-full overflow-hidden ${
          isDark ? 'bg-slate-700' : 'bg-gray-200'
        }`}>
          <div 
            className={`h-full transition-all duration-500 ${
              isOutOfCredits ? 'bg-red-500' :
              isLowCredits ? 'bg-yellow-500' :
              'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
            style={{ 
              width: `${Math.max(5, 100 - percentage_used)}%` 
            }}
          />
        </div>
      </div>

      {/* Alertas */}
      {isOutOfCredits && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Sem créditos disponíveis
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                Seu assistente está inativo. Adquira créditos para continuar.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLowCredits && !isOutOfCredits && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                Créditos baixos
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                Restam apenas {available_credits} interações. Recarregue em breve.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className={`p-3 rounded-lg ${
          isDark ? 'bg-slate-700/50' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Zap className={`w-4 h-4 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-xs ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Utilizadas
            </span>
          </div>
          <p className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {total_used}
          </p>
        </div>

        <div className={`p-3 rounded-lg ${
          isDark ? 'bg-slate-700/50' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-xs ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Uso
            </span>
          </div>
          <p className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {percentage_used.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => window.location.href = '/dashboard/credits'}
        className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
          isOutOfCredits
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
            : isLowCredits
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/30'
            : isDark
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
        }`}
      >
        {isOutOfCredits ? '🚨 Recarregar Agora' : 
         isLowCredits ? '⚡ Adicionar Créditos' : 
         '💰 Comprar Mais Créditos'}
      </button>
    </div>
  );
}
