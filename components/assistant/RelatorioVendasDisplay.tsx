'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, Calendar, Download, Loader2, TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface RelatorioVendasDisplayProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

interface RelatorioData {
  periodo: string;
  totalVendas: number;
  quantidadeVendas: number;
  ticketMedio: number;
  porFormaPagamento: {
    dinheiro: number;
    pix: number;
    debito: number;
    credito: number;
  };
  topProdutos: Array<{
    produto: string;
    quantidade: number;
    total: number;
  }>;
  profileType: string;
  profileNome: string;
}

export default function RelatorioVendasDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: RelatorioVendasDisplayProps) {
  const { companyId } = data;
  
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();
  const isDark = theme === 'dark';

  // Paletas de cores
  const DARK = {
    bg: 'bg-slate-900',
    cardBg: 'bg-slate-800',
    border: 'border-white/10',
    textPrimary: 'text-white',
    textMuted: 'text-white/60',
  };

  const LIGHT = {
    bg: 'bg-white',
    cardBg: 'bg-gray-50',
    border: 'border-gray-200',
    textPrimary: 'text-gray-900',
    textMuted: 'text-gray-600',
  };

  const colors = isDark ? DARK : LIGHT;

  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  // Buscar dados do relatório
  useEffect(() => {
    async function fetchRelatorio() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Busca perfil ativo do usuário
        const { data: session } = await supabase
          .from('profile_sessions')
          .select('profile_id, company_profiles(nome, tipo)')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .maybeSingle();

        if (!session?.profile_id) return;

        const profileType = (session as any).company_profiles?.tipo || 'colaborador';
        const profileNome = (session as any).company_profiles?.nome || 'Colaborador';

        // Calcula data de início baseado no período
        const agora = new Date();
        let dataInicio = new Date();

        switch (periodo) {
          case 'hoje':
            dataInicio.setHours(0, 0, 0, 0);
            break;
          case 'semana':
            dataInicio.setDate(agora.getDate() - 7);
            break;
          case 'mes':
            dataInicio.setDate(agora.getDate() - 30);
            break;
        }

        // Query base - escopo por perfil
        let query = supabase
          .from('vendas_rapidas')
          .select('valor, tipo_pagamento, descricao, created_at')
          .eq('company_id', companyId)
          .gte('created_at', dataInicio.toISOString());

        // Escopo por tipo de perfil
        // Gerente vê tudo, outros veem só suas vendas
        if (profileType !== 'gerente') {
          query = query.eq('profile_id', session.profile_id);
        }

        const { data: vendas, error } = await query;

        if (error) throw error;

        // Processa dados
        let totalVendas = 0;
        const porFormaPagamento = {
          dinheiro: 0,
          pix: 0,
          debito: 0,
          credito: 0,
        };
        const produtosMap = new Map<string, { quantidade: number; total: number }>();

        (vendas || []).forEach((v: any) => {
          const valor = parseFloat(v.valor);
          totalVendas += valor;

          // Soma por forma de pagamento
          if (v.tipo_pagamento in porFormaPagamento) {
            porFormaPagamento[v.tipo_pagamento as keyof typeof porFormaPagamento] += valor;
          }

          // Conta produtos
          const produto = v.descricao || 'Sem descrição';
          const current = produtosMap.get(produto) || { quantidade: 0, total: 0 };
          produtosMap.set(produto, {
            quantidade: current.quantidade + 1,
            total: current.total + valor,
          });
        });

        // Top 5 produtos
        const topProdutos = Array.from(produtosMap.entries())
          .map(([produto, stats]) => ({
            produto,
            quantidade: stats.quantidade,
            total: stats.total,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        const quantidadeVendas = vendas?.length || 0;
        const ticketMedio = quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0;

        setRelatorio({
          periodo: periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Últimos 7 dias' : 'Últimos 30 dias',
          totalVendas,
          quantidadeVendas,
          ticketMedio,
          porFormaPagamento,
          topProdutos,
          profileType,
          profileNome,
        });

        // TTS com resumo
        if (playText && quantidadeVendas > 0) {
          await playText(
            `${quantidadeVendas} ${quantidadeVendas === 1 ? 'venda' : 'vendas'} totalizando ${formatCurrency(totalVendas)}`
          );
        }

      } catch (error) {
        console.error('Erro ao buscar relatório:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRelatorio();
  }, [companyId, periodo]);

  function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function getPercentual(valor: number, total: number): number {
    if (total === 0) return 0;
    return (valor / total) * 100;
  }

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Modal */}
      <div className={`w-full max-w-4xl rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden max-h-[90vh] flex flex-col`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} flex-shrink-0`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <BarChart3 className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Relatório de Vendas</h2>
                {relatorio && (
                  <p className={`text-xs ${colors.textMuted}`}>
                    {relatorio.profileType === 'gerente' ? 'Visão Completa' : `Suas Vendas - ${relatorio.profileNome}`}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-white/50 hover:text-white hover:bg-white/10' 
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filtros de Período */}
          <div className="flex gap-2">
            {(['hoje', 'semana', 'mes'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                  periodo === p
                    ? isDark
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-600 text-white'
                    : isDark
                    ? 'bg-slate-700 text-white/70 hover:bg-slate-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 dias' : '30 dias'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className={`w-12 h-12 animate-spin ${colors.textMuted}`} />
              <p className={`text-sm ${colors.textMuted} mt-4`}>Carregando relatório...</p>
            </div>
          ) : !relatorio ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className={`w-12 h-12 ${colors.textMuted}`} />
              <p className={`text-lg font-medium ${colors.textPrimary} mt-4`}>Erro ao carregar relatório</p>
            </div>
          ) : relatorio.quantidadeVendas === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className={`p-4 rounded-full ${colors.cardBg} mb-4`}>
                <ShoppingCart className={`w-12 h-12 ${colors.textMuted}`} />
              </div>
              <p className={`text-lg font-medium ${colors.textPrimary}`}>Nenhuma venda registrada</p>
              <p className={`text-sm ${colors.textMuted} mt-2 text-center max-w-sm`}>
                Não há vendas no período selecionado.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Total de Vendas */}
                <div className={`p-4 rounded-xl border ${colors.border} ${colors.cardBg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    <p className={`text-xs font-medium ${colors.textMuted}`}>Total de Vendas</p>
                  </div>
                  <p className={`text-2xl font-bold ${colors.textPrimary}`}>
                    {formatCurrency(relatorio.totalVendas)}
                  </p>
                  <p className={`text-xs ${colors.textMuted} mt-1`}>
                    {relatorio.periodo}
                  </p>
                </div>

                {/* Quantidade */}
                <div className={`p-4 rounded-xl border ${colors.border} ${colors.cardBg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-xs font-medium ${colors.textMuted}`}>Quantidade</p>
                  </div>
                  <p className={`text-2xl font-bold ${colors.textPrimary}`}>
                    {relatorio.quantidadeVendas}
                  </p>
                  <p className={`text-xs ${colors.textMuted} mt-1`}>
                    {relatorio.quantidadeVendas === 1 ? 'venda' : 'vendas'}
                  </p>
                </div>

                {/* Ticket Médio */}
                <div className={`p-4 rounded-xl border ${colors.border} ${colors.cardBg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <p className={`text-xs font-medium ${colors.textMuted}`}>Ticket Médio</p>
                  </div>
                  <p className={`text-2xl font-bold ${colors.textPrimary}`}>
                    {formatCurrency(relatorio.ticketMedio)}
                  </p>
                  <p className={`text-xs ${colors.textMuted} mt-1`}>
                    por venda
                  </p>
                </div>
              </div>

              {/* Formas de Pagamento */}
              <div className={`p-5 rounded-xl border ${colors.border} ${colors.cardBg}`}>
                <h3 className={`text-sm font-semibold ${colors.textPrimary} mb-4`}>
                  Formas de Pagamento
                </h3>
                <div className="space-y-3">
                  {Object.entries(relatorio.porFormaPagamento).map(([tipo, valor]) => {
                    const percentual = getPercentual(valor, relatorio.totalVendas);
                    const icons = {
                      dinheiro: '💵',
                      pix: '📱',
                      debito: '💳',
                      credito: '💳',
                    };

                    return (
                      <div key={tipo}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm ${colors.textPrimary} capitalize`}>
                            {icons[tipo as keyof typeof icons]} {tipo}
                          </span>
                          <span className={`text-sm font-semibold ${colors.textPrimary}`}>
                            {formatCurrency(valor)}
                          </span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full ${
                              tipo === 'dinheiro' ? 'bg-green-500' :
                              tipo === 'pix' ? 'bg-blue-500' :
                              tipo === 'debito' ? 'bg-purple-500' :
                              'bg-orange-500'
                            }`}
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                        <p className={`text-xs ${colors.textMuted} mt-1`}>
                          {percentual.toFixed(1)}% do total
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Produtos */}
              {relatorio.topProdutos.length > 0 && (
                <div className={`p-5 rounded-xl border ${colors.border} ${colors.cardBg}`}>
                  <h3 className={`text-sm font-semibold ${colors.textPrimary} mb-4`}>
                    Top 5 Produtos
                  </h3>
                  <div className="space-y-3">
                    {relatorio.topProdutos.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isDark ? 'bg-slate-700/50' : 'bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            isDark ? 'bg-slate-600 text-white/70' : 'bg-gray-300 text-gray-700'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${colors.textPrimary} truncate`}>
                              {item.produto}
                            </p>
                            <p className={`text-xs ${colors.textMuted}`}>
                              {item.quantidade} {item.quantidade === 1 ? 'venda' : 'vendas'}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${colors.textPrimary} ml-3`}>
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {relatorio && relatorio.quantidadeVendas > 0 && (
          <div className={`px-6 py-4 border-t ${colors.border} flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <p className={`text-xs ${colors.textMuted}`}>
                {relatorio.profileType === 'gerente' 
                  ? '📊 Relatório completo da empresa'
                  : '👤 Apenas suas vendas'}
              </p>
              <button
                onClick={onClose}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
