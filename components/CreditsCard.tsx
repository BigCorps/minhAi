'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Zap, CreditCard, Star } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

interface CreditsCardProps {
  userId: string;
}

interface UserCredits {
  available_credits: number;
  total_used: number;
  has_active_plan: boolean;
  plan_expires_at: string | null;
  active_plan_name: string | null;
}

export function CreditsCard({ userId }: CreditsCardProps) {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    const loadCredits = async () => {
      try {
        const { data, error } = await supabase
          .from('user_credits')
          .select('available_credits, total_used, has_active_plan, plan_expires_at, active_plan_name')
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
              total_purchased: 20,
              total_used: 0,
              has_active_plan: false,
              plan_expires_at: null,
              active_plan_name: null
            });

          if (!insertError) {
            setCredits({ 
              available_credits: 20, 
              total_used: 0,
              has_active_plan: false,
              plan_expires_at: null,
              active_plan_name: null
            });
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

    // ✅ ADICIONAR: Realtime subscription para atualizar automaticamente
    const channel = supabase
      .channel('user_credits_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // UPDATE, INSERT, DELETE
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('💰 Créditos atualizados em tempo real:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as UserCredits;
            setCredits({
              available_credits: newData.available_credits,
              total_used: newData.total_used,
              has_active_plan: newData.has_active_plan,
              plan_expires_at: newData.plan_expires_at,
              active_plan_name: newData.active_plan_name
            });
          }
        }
      )
      .subscribe();

    // Cleanup ao desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Evita erro de hidratação e garante que o tema foi detectado
  if (!mounted || loading) {
    return (
      <div className="rounded-xl shadow-lg p-6 border transition-colors animate-pulse bg-slate-800/50 border-white/10 backdrop-blur-xl">
        <div className="h-32"></div>
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const totalCredits = (credits?.available_credits || 0) + (credits?.total_used || 0);
  const usagePercentage = totalCredits > 0 
    ? Math.min(100, Math.max(0, ((credits?.available_credits || 0) / totalCredits) * 100))
    : 0;

  const hasActivePlan =
    credits?.has_active_plan === true &&
    credits?.plan_expires_at != null &&
    new Date(credits.plan_expires_at) > new Date();

  const isTrial = hasActivePlan && credits?.active_plan_name === 'Trial';

  const planExpiresFormatted = credits?.plan_expires_at
    ? new Date(credits.plan_expires_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <Link
      href="/dashboard/credits"
      className={`block rounded-xl shadow-lg p-6 border transition-all hover:shadow-2xl hover:-translate-y-1 ${
        isDark
          ? 'bg-gradient-to-br from-blue-900/40 to-slate-900 border-blue-500/20 backdrop-blur-xl hover:border-blue-500/40'
          : 'bg-white border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            isDark
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-blue-100 text-blue-600'
          }`}>
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h3 className={`text-xl font-bold transition-colors ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Seus Créditos
            </h3>
            <p className={`text-sm transition-colors ${
              isDark ? 'text-white/60' : 'text-gray-600'
            }`}>
              Status do seu saldo para interações de IA
            </p>
            
            {hasActivePlan && (
              <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isTrial
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                  : isDark
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {isTrial ? <Star className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                {isTrial
                  ? `Teste até ${planExpiresFormatted}`
                  : `${credits?.active_plan_name} até ${planExpiresFormatted}`
                }
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-md">
          <div className="flex justify-between items-end mb-2">
            <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
              Progresso de Uso
            </span>
            <span className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              {credits?.available_credits || 0} disponíveis
            </span>
          </div>
          <div className={`w-full h-3 rounded-full overflow-hidden ${
            isDark ? 'bg-slate-700' : 'bg-gray-100'
          }`}>
            <div 
              className="h-full bg-blue-600 transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              {credits?.total_used || 0} gastos
            </span>
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              Total: {totalCredits}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {credits?.available_credits || 0}
            </p>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              Créditos
            </p>
          </div>
          <button className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
            isDark
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
          }`}>
            <CreditCard className="w-4 h-4" />
            Recarregar
          </button>
        </div>
      </div>
    </Link>
  );
}
