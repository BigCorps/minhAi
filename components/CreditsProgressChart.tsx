'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardTitle, CardHeader, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@supabase/supabase-js';
import { format, parseISO, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  TrendingUp, TrendingDown, Eye, EyeOff, ChevronLeft, ChevronRight, Calendar,
  BarChart3, AreaChart as AreaChartIcon, Circle, Filter, Radar, Layers, ScanLine, Loader2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, FunnelChart, Funnel, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

// Função cn inline para evitar dependência
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

// Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

interface FunctionUsage {
  function_key: string;
  custom_name?: string;
  usage_count: number;
  total_credits_consumed: number;
  assistant_functions?: {
    function_name: string;
    color?: string;
  } | {
    function_name: string;
    color?: string;
  }[]; // Adicionado para aceitar array do Supabase
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  consumed: number;
  added: number;
  balance: number;
}

const COLORS = {
  consumed: '#EF4444',
  added: '#26DE81',
  balance: '#3B82F6',
  bonus: '#F59E0B',
  refund: '#8B5CF6',
};

const CHART_COLORS = [
  '#3B82F6', '#26DE81', '#EF4444', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#10B981'
];

const ChartTypeSelector = ({ selected, onChange }: { selected: ChartType, onChange: (type: ChartType) => void }) => {
  const charts = [
    { type: 'line' as const, icon: <TrendingUp className="h-4 w-4" />, title: 'Gráfico de Linha' },
    { type: 'bar' as const, icon: <BarChart3 className="h-4 w-4" />, title: 'Gráfico de Barras' },
    { type: 'area' as const, icon: <AreaChartIcon className="h-4 w-4" />, title: 'Gráfico de Área' },
    { type: 'pie' as const, icon: <Circle className="h-4 w-4" />, title: 'Gráfico de Pizza' },
    { type: 'stacked' as const, icon: <Layers className="h-4 w-4" />, title: 'Barras Empilhadas' },
    { type: 'funnel' as const, icon: <Filter className="h-4 w-4" />, title: 'Gráfico de Funil' },
    { type: 'radar' as const, icon: <Radar className="h-4 w-4" />, title: 'Gráfico de Radar' },
    { type: 'scatter' as const, icon: <ScanLine className="h-4 w-4" />, title: 'Gráfico de Dispersão' },
  ];

  return (
    <div className="flex bg-muted rounded-lg p-1 flex-wrap gap-1">
      {charts.map(chart => (
        <Button
          key={chart.type}
          title={chart.title}
          size="sm"
          variant={selected === chart.type ? 'default' : 'ghost'}
          onClick={() => onChange(chart.type)}
          className="h-8 w-8 p-0"
        >
          {chart.icon}
        </Button>
      ))}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, hideValues }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 border rounded-md shadow-sm">
        <p className="text-sm font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${hideValues ? '******' : entry.value} créditos`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function CreditsProgressChart({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [functionUsage, setFunctionUsage] = useState<FunctionUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideValues, setHideValues] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [usageChartType, setUsageChartType] = useState<ChartType>('pie');
  const [viewType, setViewType] = useState<ViewType>('30days');

  useEffect(() => {
    loadData();
  }, [userId, viewType]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Calcular data inicial baseado no viewType
      let startDate: Date | null = null;
      const now = new Date();

      switch (viewType) {
        case '7days':
          startDate = subDays(now, 7);
          break;
        case '30days':
          startDate = subDays(now, 30);
          break;
        case '90days':
          startDate = subDays(now, 90);
          break;
        case 'all':
          startDate = null;
          break;
      }

      // Buscar transações de crédito
      let transactionsQuery = supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (startDate) {
        transactionsQuery = transactionsQuery.gte('created_at', startDate.toISOString());
      }

      const { data: transactionsData, error: transactionsError } = await transactionsQuery;

      if (transactionsError) {
        console.error('Error loading transactions:', transactionsError);
      } else {
        setTransactions(transactionsData || []);
      }

      // Buscar uso por função
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (companiesData) {
        const { data: usageData, error: usageError } = await supabase
          .from('company_function_settings')
          .select(`
            function_key,
            custom_name,
            usage_count,
            total_credits_consumed,
            assistant_functions (
              function_name,
              color
            )
          `)
          .eq('company_id', companiesData.id)
          .gt('total_credits_consumed', 0)
          .order('total_credits_consumed', { ascending: false });

        if (usageError) {
          console.error('Error loading function usage:', usageError);
        } else {
          // Correção: Cast para unknown primeiro e depois para o tipo correto
          setFunctionUsage((usageData as unknown as FunctionUsage[]) || []);
        }
      }
    } catch (error) {
      console.error('Error in loadData:', error);
    } finally {
      setLoading(false);
    }
  };

  // Processar dados para o gráfico de progressão
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (transactions.length === 0) return [];

    const dataMap = new Map<string, ChartDataPoint>();
    
    transactions.forEach((transaction) => {
      const date = format(parseISO(transaction.created_at), 'yyyy-MM-dd');
      const dateLabel = format(parseISO(transaction.created_at), 'dd/MM');
      
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          date,
          dateLabel,
          consumed: 0,
          added: 0,
          balance: transaction.balance_after,
        });
      }

      const dataPoint = dataMap.get(date)!;
      
      if (transaction.transaction_type === 'usage') {
        dataPoint.consumed += Math.abs(transaction.amount);
      } else if (['purchase', 'bonus', 'initial', 'refund'].includes(transaction.transaction_type)) {
        dataPoint.added += transaction.amount;
      }
      
      // Atualizar saldo com a transação mais recente do dia
      dataPoint.balance = transaction.balance_after;
    });

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

// Processar dados para o gráfico de uso por função
  const usageByFunction = useMemo(() => {
    return functionUsage.map((func, index) => {
      // Garante o acesso aos dados da função, lidando com o fato de vir como array ou objeto
      const assistantFunc = Array.isArray(func.assistant_functions) 
        ? func.assistant_functions[0] 
        : func.assistant_functions;

      return {
        name: func.custom_name || assistantFunc?.function_name || func.function_key,
        value: func.total_credits_consumed,
        usage: func.usage_count,
        color: assistantFunc?.color || CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [functionUsage]);

  // Estatísticas gerais
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

  const renderProgressChart = (type: ChartType) => {
    const height = type === 'pie' ? 300 : 250;

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip hideValues={hideValues} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="added" name="Adicionados" fill={COLORS.added} />
              <Bar dataKey="consumed" name="Consumidos" fill={COLORS.consumed} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip hideValues={hideValues} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area 
                type="monotone" 
                dataKey="balance" 
                name="Saldo" 
                stroke={COLORS.balance} 
                fill={COLORS.balance} 
                fillOpacity={0.3} 
              />
              <Area 
                type="monotone" 
                dataKey="added" 
                name="Adicionados" 
                stroke={COLORS.added} 
                fill={COLORS.added} 
                fillOpacity={0.2} 
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = [
          { name: 'Consumidos', value: stats.totalConsumed, color: COLORS.consumed },
          { name: 'Disponíveis', value: stats.currentBalance, color: COLORS.balance },
        ];
        
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Tooltip formatter={(value: any) => hideValues ? '******' : `${value ?? 0} créditos`} />
                </PieChart>
          </ResponsiveContainer>
        );

      case 'stacked':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip hideValues={hideValues} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="added" name="Adicionados" stackId="a" fill={COLORS.added} />
              <Bar dataKey="consumed" name="Consumidos" stackId="a" fill={COLORS.consumed} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData.slice(-7)}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dateLabel" />
              <PolarRadiusAxis />
              <Tooltip content={<CustomTooltip hideValues={hideValues} />} />
              <RechartsRadar 
                name="Adicionados" 
                dataKey="added" 
                stroke={COLORS.added} 
                fill={COLORS.added} 
                fillOpacity={0.6} 
              />
              <RechartsRadar 
                name="Consumidos" 
                dataKey="consumed" 
                stroke={COLORS.consumed} 
                fill={COLORS.consumed} 
                fillOpacity={0.6} 
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        const funnelData = [
          { name: 'Total Adicionado', value: stats.totalAdded, fill: COLORS.added },
          { name: 'Total Consumido', value: stats.totalConsumed, fill: COLORS.consumed },
          { name: 'Saldo Atual', value: stats.currentBalance, fill: COLORS.balance }
        ].filter(item => item.value > 0);
        
        return (
          <ResponsiveContainer width="100%" height={height}>
            <FunnelChart>
                  <Tooltip formatter={(value: any) => hideValues ? '******' : `${value ?? 0} créditos`} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="added" 
                name="Adicionados" 
                tick={{ fontSize: 12 }} 
              />
              <YAxis 
                type="number" 
                dataKey="consumed" 
                name="Consumidos" 
                tick={{ fontSize: 12 }} 
              />
              <ZAxis dataKey="dateLabel" name="Data" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                content={<CustomTooltip hideValues={hideValues} />} 
              />
              <Legend />
              <Scatter 
                name="Relação Créditos" 
                data={chartData} 
                fill={COLORS.balance} 
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip hideValues={hideValues} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="balance" 
                name="Saldo" 
                stroke={COLORS.balance} 
                strokeWidth={2} 
              />
              <Line 
                type="monotone" 
                dataKey="added" 
                name="Adicionados" 
                stroke={COLORS.added} 
                strokeWidth={2} 
              />
              <Line 
                type="monotone" 
                dataKey="consumed" 
                name="Consumidos" 
                stroke={COLORS.consumed} 
                strokeWidth={2} 
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderUsageChart = (type: ChartType) => {
    if (usageByFunction.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum uso de função registrado</p>
        </div>
      );
    }

    const height = type === 'pie' ? 300 : 250;

    switch (type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={usageByFunction}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {usageByFunction.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Tooltip formatter={(value: any) => hideValues ? '******' : `${value ?? 0} créditos`} />
                </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={usageByFunction}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: any) => hideValues ? '******' : `${value ?? 0} créditos`} />
                <Bar dataKey="value" name="Créditos Consumidos">
                {usageByFunction.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return renderUsageChart('pie');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Créditos Adicionados</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {hideValues ? '******' : stats.totalAdded}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Créditos Consumidos</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {hideValues ? '******' : stats.totalConsumed}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {hideValues ? '******' : stats.currentBalance}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Circle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Gráfico de Progressão */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Progressão de Créditos</CardTitle>
              <CardDescription>
                Acompanhe o uso e adição de créditos ao longo do tempo
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHideValues(!hideValues)}
              >
                {hideValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
                <SelectTrigger className="w-32">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 dias</SelectItem>
                  <SelectItem value="30days">30 dias</SelectItem>
                  <SelectItem value="90days">90 dias</SelectItem>
                  <SelectItem value="all">Tudo</SelectItem>
                </SelectContent>
              </Select>

              <ChartTypeSelector selected={chartType} onChange={setChartType} />
            </div>

            {chartData.length > 0 ? (
              <div className={cn(
                "flex items-center justify-center",
                chartType === 'pie' ? "h-[300px]" : "h-[250px]"
              )}>
                {renderProgressChart(chartType)}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Nenhuma transação encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Uso por Função */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Uso por Função</CardTitle>
              <CardDescription>
                Distribuição de créditos consumidos por cada função
              </CardDescription>
            </div>
            <ChartTypeSelector 
              selected={usageChartType} 
              onChange={setUsageChartType}
            />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "flex items-center justify-center",
              usageChartType === 'pie' ? "h-[300px]" : "h-[250px]"
            )}>
              {renderUsageChart(usageChartType)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}