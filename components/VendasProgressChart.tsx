'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { format, parseISO, subDays } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area,
} from 'recharts';
import { TrendingUp, BarChart3, AreaChart as AreaChartIcon } from 'lucide-react';

type ChartType = 'line' | 'bar' | 'area';
type ViewType = '7days' | '30days' | '90days' | 'all';

interface VendasDataPoint {
  date: string;
  dateLabel: string;
  vendas: number;
  comissoes: number;
  quantidade: number;
}

const COLORS = {
  vendas:    '#f59e0b',
  comissoes: '#f97316',
  quantidade:'#a78bfa',
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 border rounded-lg shadow-sm bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <p className="text-sm font-medium mb-1 text-gray-900 dark:text-white">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.dataKey === 'quantidade' ? entry.value : fmt(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function VendasProgressChart({ companyId }: { companyId: string }) {
  const [data, setData] = useState<VendasDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('area');
  const [viewType, setViewType] = useState<ViewType>('30days');
  const supabase = createClient();

  useEffect(() => { loadData(); }, [companyId, viewType]);

  async function loadData() {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = viewType === 'all' ? null
        : viewType === '7days'  ? subDays(now, 7)
        : viewType === '30days' ? subDays(now, 30)
        : subDays(now, 90);

      let query = supabase
        .from('commission_pending')
        .select('valor_venda, valor_comissao, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (startDate) query = query.gte('created_at', startDate.toISOString());

      const { data: rows } = await query;
      if (!rows) return;

      const map = new Map<string, VendasDataPoint>();
      rows.forEach(row => {
        const date = format(parseISO(row.created_at), 'yyyy-MM-dd');
        const dateLabel = format(parseISO(row.created_at), 'dd/MM');
        if (!map.has(date)) {
          map.set(date, { date, dateLabel, vendas: 0, comissoes: 0, quantidade: 0 });
        }
        const pt = map.get(date)!;
        pt.vendas     += Number(row.valor_venda);
        pt.comissoes  += Number(row.valor_comissao);
        pt.quantidade += 1;
      });

      setData(Array.from(map.values()));
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => ({
    vendas:    data.reduce((s, d) => s + d.vendas, 0),
    comissoes: data.reduce((s, d) => s + d.comissoes, 0),
    quantidade:data.reduce((s, d) => s + d.quantidade, 0),
  }), [data]);

  const chartProps = {
    data,
    margin: { top: 5, right: 20, left: 10, bottom: 5 },
  };

  const commonLines = (
    <>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={v => `R$${v}`} tick={{ fontSize: 11 }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
    </>
  );

  function renderChart() {
    if (chartType === 'bar') return (
      <BarChart {...chartProps}>
        {commonLines}
        <Bar dataKey="vendas" name="Vendas" fill={COLORS.vendas} radius={[4,4,0,0]} />
        <Bar dataKey="comissoes" name="Comissões" fill={COLORS.comissoes} radius={[4,4,0,0]} />
      </BarChart>
    );
    if (chartType === 'line') return (
      <LineChart {...chartProps}>
        {commonLines}
        <Line type="monotone" dataKey="vendas" name="Vendas" stroke={COLORS.vendas} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="comissoes" name="Comissões" stroke={COLORS.comissoes} strokeWidth={2} dot={false} />
      </LineChart>
    );
    return (
      <AreaChart {...chartProps}>
        {commonLines}
        <defs>
          <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.vendas} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.vendas} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gComissoes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.comissoes} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.comissoes} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="vendas" name="Vendas" stroke={COLORS.vendas} fill="url(#gVendas)" strokeWidth={2} />
        <Area type="monotone" dataKey="comissoes" name="Comissões" stroke={COLORS.comissoes} fill="url(#gComissoes)" strokeWidth={2} />
      </AreaChart>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Progressão de Vendas</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vendas e comissões ao longo do tempo</p>
        </div>

        {/* Resumo */}
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide">Total vendido</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(totals.vendas)}</p>
          </div>
          <div>
            <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Comissões</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(totals.comissoes)}</p>
          </div>
          <div>
            <p className="text-xs text-violet-500 font-semibold uppercase tracking-wide">Vendas</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{totals.quantidade}</p>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Período */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          {(['7days','30days','90days','all'] as ViewType[]).map(v => (
            <button
              key={v}
              onClick={() => setViewType(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                viewType === v
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {v === '7days' ? '7 dias' : v === '30days' ? '30 dias' : v === '90days' ? '90 dias' : 'Tudo'}
            </button>
          ))}
        </div>

        {/* Tipo de gráfico */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          {([
            { type: 'line' as const, icon: <TrendingUp className="w-4 h-4" /> },
            { type: 'bar'  as const, icon: <BarChart3 className="w-4 h-4" /> },
            { type: 'area' as const, icon: <AreaChartIcon className="w-4 h-4" /> },
          ]).map(({ type, icon }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition ${
                chartType === type
                  ? 'bg-white dark:bg-slate-600 text-amber-500 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          Nenhuma venda registrada no período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={264}>
          {renderChart()}
        </ResponsiveContainer>
      )}
    </div>
  );
}
