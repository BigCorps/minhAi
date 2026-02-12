'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Zap, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface CreditsCardProps {
  userId: string; // ← MUDOU! Agora é userId ao invés de companyId
  theme: 'dark' | 'light';
}

interface UserCredits {
  available_credits: number;
  total_used: number;
}

export function CreditsCard({ userId, theme }: CreditsCardProps) {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const loadCredits = async () => {
      try {
        // ✅ Busca de user_credits ao invés de company_credits
        const { data, error } = await supabase
          .from('user_credits')
          .select('available_credits, total_used')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Erro ao carregar créditos:', error);
          // Se não encontrar, criar registro inicial
          const { error: insertError } = await supabase
            .from('user_credits')
            .insert({
              user_id: userId,
              available_credits: 20,
              total_purchased: 0,
              total_used: 0
            });

          if (!insertError) {
            setCredits({ available_credits: 20, total_used: 0 });
          }
        } else {
          setCredits(data);
        }
      } catch (error) {
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadCredits();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className={`rounded-xl shadow-lg p-6 border transition-colors animate-pulse ${
        theme === 'dark'
          ? 'bg-slate-800/50 border-white/10 backdrop-blur-xl'
          : 'bg-white border-gray-200'
      }`}>
        <div className="h-24"></div>
      </div>
    );
  }

  return (
    <Link
      href="/dashboard/credits"
      className={`block rounded-xl shadow-lg p-6 border transition-all hover:shadow-2xl hover:-translate-y-1 ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-blue-900/50 to-blue-950/50 border-blue-500/20 backdrop-blur-xl hover:border-blue-500/40'
          : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            theme === 'dark'
              ? 'bg-blue-500/20'
              : 'bg-blue-100'
          }`}>
            <Zap className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-bold transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Seus Créditos
            </h3>
            <p className={`text-sm transition-colors ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-600'
            }`}>
              Gerencie suas interações
            </p>
          </div>
        </div>

        <button className={`px-4 py-2 rounded-lg font-semibold transition ${
          theme === 'dark'
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}>
          Comprar +
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-lg p-4 border ${
          theme === 'dark'
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Zap className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            <p className={`text-xs font-medium ${
              theme === 'dark' ? 'text-green-300' : 'text-green-900'
            }`}>
              Disponíveis
            </p>
          </div>
          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>
            {credits?.available_credits || 0}
          </p>
        </div>

        <div className={`rounded-lg p-4 border ${
          theme === 'dark'
            ? 'bg-slate-800/50 border-white/10'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`} />
            <p className={`text-xs font-medium ${
              theme === 'dark' ? 'text-white/70' : 'text-gray-900'
            }`}>
              Utilizados
            </p>
          </div>
          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
            {credits?.total_used || 0}
          </p>
        </div>
      </div>

      <p className={`text-xs mt-4 text-center transition-colors ${
        theme === 'dark' ? 'text-white/40' : 'text-gray-500'
      }`}>
        Compartilhados entre todas as suas empresas
      </p>
    </Link>
  );
}