'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/MetaStatsCard.tsx
//
// Card de métricas de atendimento, exibido na aba Conexões quando há conexão ativa.

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  Loader2, MessageCircle, PauseCircle, Clock, TrendingUp,
  Users, MessageSquare, BarChart3,
} from 'lucide-react';

type Stats = {
  period_days: number;
  total_conversations: number;
  active_conversations: number;
  paused_conversations: number;
  new_conversations: number;
  platform_breakdown: Record<string, number>;
  stage_breakdown: Record<string, number>;
  messages_by_day: Record<string, number>;
  avg_response_seconds: number | null;
  top_functions: { function_key: string; count: number }[];
  comments_answered: number;
};

const FUNCTION_LABELS: Record<string, string> = {
  pix_generate: 'Gerar PIX', pix_confirm: 'Confirmar PIX', pix_check: 'Consultar PIX',
  faq: 'FAQ', nossa_marca: 'Nossa Marca', endereco: 'Endereço',
  meta_reply: 'IA (ChatGPT)', cardapio: 'Cardápio', meu_sistema: 'Meu Sistema',
  meta_comment: 'Comentários', criar_nota: 'Criar Nota', orcamento: 'Orçamento',
  agendar_compromisso: 'Agendar', gerar_senha: 'Gerar Senha',
};

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

function StatBlock({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
      </div>
    </div>
  );
}

export function MetaStatsCard({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState(7);

  useEffect(() => {
    if (!companyId) return;
    loadStats();
  }, [companyId, period]);

  async function loadStats() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/meta-stats`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ company_id: companyId, days: period }),
        }
      );
      const d = await res.json();
      if (d.success) setStats(d);
    } catch (e) {
      console.error('MetaStatsCard:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) return null;

  const maxDayCount = Math.max(1, ...Object.values(stats.messages_by_day));
  const days = Object.keys(stats.messages_by_day).sort();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Estatísticas de Atendimento</h3>
        </div>
        <div className="flex gap-1">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition
                ${period === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatBlock icon={MessageCircle} label="Conversas ativas" value={stats.active_conversations}
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
          <StatBlock icon={PauseCircle} label="Pausadas" value={stats.paused_conversations}
            color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" />
          <StatBlock icon={Users} label={`Novos contatos (${period}d)`} value={stats.new_conversations}
            color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
          <StatBlock icon={Clock} label="Tempo médio de resposta"
            value={stats.avg_response_seconds ? formatSeconds(stats.avg_response_seconds) : '—'}
            color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
        </div>

        {/* Gráfico de volume por dia */}
        {days.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mensagens por dia</p>
            <div className="flex items-end gap-1 h-20">
              {days.map((day) => {
                const count = stats.messages_by_day[day];
                const heightPct = (count / maxDayCount) * 100;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                    <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition absolute -top-4">
                      {count}
                    </span>
                    <div
                      className="w-full bg-blue-500 dark:bg-blue-600 rounded-t-sm transition-all hover:bg-blue-600 dark:hover:bg-blue-500"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                    <span className="text-[9px] text-gray-400">{day.substring(8, 10)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Funil + Plataformas lado a lado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Funil */}
          {Object.keys(stats.stage_breakdown).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Funil de conversas</p>
              <div className="space-y-1.5">
                {Object.entries(stats.stage_breakdown).map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">{stage.replace('_', ' ')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plataformas */}
          {Object.keys(stats.platform_breakdown).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Por canal</p>
              <div className="space-y-1.5">
                {Object.entries(stats.platform_breakdown).map(([platform, count]) => (
                  <div key={platform} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">{platform}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top funções */}
        {stats.top_functions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Funções mais usadas ({period}d)</p>
            <div className="space-y-1.5">
              {stats.top_functions.map((f) => (
                <div key={f.function_key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">
                    {FUNCTION_LABELS[f.function_key] || f.function_key}
                  </span>
                  <div className="w-24 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(f.count / stats.top_functions[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white w-6 text-right">{f.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.comments_answered > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
            <MessageSquare className="h-3.5 w-3.5 text-pink-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-white">{stats.comments_answered}</strong> comentário{stats.comments_answered !== 1 ? 's' : ''} respondido{stats.comments_answered !== 1 ? 's' : ''} no período
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
