'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, DollarSign, Check, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface FecharCaixaDisplayProps {
  data: {
    companyId: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

interface CaixaData {
  turnoId: string;
  profileNome: string;
  inicio: string;
  totalVendas: number;
  totalDinheiro: number;
  totalPix: number;
  totalDebito: number;
  totalCredito: number;
  quantidadeVendas: number;
}

export default function FecharCaixaDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: FecharCaixaDisplayProps) {
  const { companyId } = data;
  
  const [valorContado, setValorContado] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [caixaData, setCaixaData] = useState<CaixaData | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const isDark = theme === 'dark';

  // Paletas de cores
  const DARK = {
    bg: 'bg-slate-900',
    cardBg: 'bg-slate-800',
    border: 'border-white/10',
    textPrimary: 'text-white',
    textMuted: 'text-white/60',
    inputBg: 'bg-slate-700',
  };

  const LIGHT = {
    bg: 'bg-white',
    cardBg: 'bg-gray-50',
    border: 'border-gray-200',
    textPrimary: 'text-gray-900',
    textMuted: 'text-gray-600',
    inputBg: 'bg-white',
  };

  const colors = isDark ? DARK : LIGHT;

  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  // Buscar dados do caixa/turno
  useEffect(() => {
    async function fetchCaixaData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Busca perfil ativo do usuário
        const { data: session } = await supabase
          .from('profile_sessions')
          .select('profile_id, company_profiles(nome)')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .maybeSingle();

        if (!session?.profile_id) return;

        // Busca turno ativo
        const { data: turno } = await supabase
          .from('turnos')
          .select('id, inicio')
          .eq('company_id', companyId)
          .eq('profile_id', session.profile_id)
          .eq('status', 'ativo')
          .maybeSingle();

        if (!turno) {
          showToast('Nenhum turno ativo encontrado', 'warning');
          return;
        }

        // Busca vendas rápidas do turno
        const { data: vendas } = await supabase
          .from('vendas_rapidas')
          .select('valor, tipo_pagamento')
          .eq('company_id', companyId)
          .eq('profile_id', session.profile_id)
          .gte('created_at', turno.inicio);

        // Calcula totais por tipo de pagamento
        let totalDinheiro = 0;
        let totalPix = 0;
        let totalDebito = 0;
        let totalCredito = 0;

        (vendas || []).forEach((v: any) => {
          const valor = parseFloat(v.valor);
          switch (v.tipo_pagamento) {
            case 'dinheiro':
              totalDinheiro += valor;
              break;
            case 'pix':
              totalPix += valor;
              break;
            case 'debito':
              totalDebito += valor;
              break;
            case 'credito':
              totalCredito += valor;
              break;
          }
        });

        const totalVendas = totalDinheiro + totalPix + totalDebito + totalCredito;

        setCaixaData({
          turnoId: turno.id,
          profileNome: (session as any).company_profiles?.nome || 'Colaborador',
          inicio: turno.inicio,
          totalVendas,
          totalDinheiro,
          totalPix,
          totalDebito,
          totalCredito,
          quantidadeVendas: vendas?.length || 0,
        });

        // Preenche valor contado automaticamente com total em dinheiro
        setValorContado(totalDinheiro.toFixed(2).replace('.', ','));

      } catch (error) {
        console.error('Erro ao buscar dados do caixa:', error);
        showToast('Erro ao carregar dados do caixa', 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchCaixaData();
  }, [companyId]);

  // Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message: string, type: 'error' | 'success' | 'warning') {
    setToast({ message, type });
  }

  async function handleFecharCaixa() {
    if (!caixaData) return;

    const valorContadoNum = parseFloat(valorContado.replace(',', '.'));
    if (isNaN(valorContadoNum) || valorContadoNum < 0) {
      showToast('Valor contado inválido', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const agora = new Date().toISOString();
      const diferenca = valorContadoNum - caixaData.totalDinheiro;

      // Fecha o turno
      const { error: turnoError } = await supabase
        .from('turnos')
        .update({
          fim: agora,
          status: 'fechado',
          observacoes: observacoes.trim() || null,
        })
        .eq('id', caixaData.turnoId);

      if (turnoError) throw turnoError;

      // Registra fechamento de caixa
      const { error: fechamentoError } = await supabase
        .from('fechamentos_caixa')
        .insert({
          company_id: companyId,
          turno_id: caixaData.turnoId,
          valor_esperado: caixaData.totalDinheiro,
          valor_contado: valorContadoNum,
          diferenca: diferenca,
          total_vendas: caixaData.totalVendas,
          total_pix: caixaData.totalPix,
          total_debito: caixaData.totalDebito,
          total_credito: caixaData.totalCredito,
          quantidade_vendas: caixaData.quantidadeVendas,
          observacoes: observacoes.trim() || null,
          fechado_em: agora,
        });

      if (fechamentoError) throw fechamentoError;

      showToast('Caixa fechado com sucesso!', 'success');
      
      if (playText) {
        const diferencaMsg = diferenca === 0 
          ? 'Caixa bateu certinho!' 
          : diferenca > 0 
            ? `Caixa com sobra de ${Math.abs(diferenca).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
            : `Caixa com falta de ${Math.abs(diferenca).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        
        await playText(`Caixa fechado com sucesso! ${diferencaMsg}`);
      }

      // Fecha após 2s
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      showToast('Erro ao fechar caixa', 'error');
      
      if (playText) {
        await playText('Erro ao fechar caixa. Tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function formatCurrencyInput(value: string): string {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseFloat(numbers) / 100;
    return amount.toFixed(2).replace('.', ',');
  }

  function handleValorContadoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCurrencyInput(e.target.value);
    setValorContado(formatted);
  }

  function formatDuration(inicio: string): string {
    const start = new Date(inicio);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}min`;
  }

  if (!mounted) return null;

  const valorContadoNum = parseFloat(valorContado.replace(',', '.')) || 0;
  const diferenca = valorContadoNum - (caixaData?.totalDinheiro || 0);

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'error' 
            ? 'bg-red-600 text-white' 
            : toast.type === 'warning'
            ? 'bg-yellow-600 text-white'
            : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Modal */}
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <Lock className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Fechar Caixa</h2>
              <p className={`text-xs ${colors.textMuted}`}>Fechamento do turno</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-white/50 hover:text-white hover:bg-white/10' 
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            } disabled:opacity-50`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className={`w-12 h-12 animate-spin ${colors.textMuted}`} />
              <p className={`text-sm ${colors.textMuted} mt-4`}>Carregando dados do caixa...</p>
            </div>
          ) : !caixaData ? (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border`}>
              <p className={`text-sm ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
                ⚠️ Nenhum turno ativo encontrado. Não é possível fechar o caixa.
              </p>
            </div>
          ) : (
            <>
              {/* Info do Turno */}
              <div className={`p-4 rounded-lg ${colors.cardBg} border ${colors.border}`}>
                <p className={`text-xs ${colors.textMuted} mb-2`}>Responsável: <strong className={colors.textPrimary}>{caixaData.profileNome}</strong></p>
                <p className={`text-xs ${colors.textMuted}`}>Duração: <strong className={colors.textPrimary}>{formatDuration(caixaData.inicio)}</strong></p>
              </div>

              {/* Resumo de Vendas */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-semibold ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                    Resumo de Vendas
                  </p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-blue-800 text-blue-100' : 'bg-blue-200 text-blue-900'}`}>
                    {caixaData.quantidadeVendas} {caixaData.quantidadeVendas === 1 ? 'venda' : 'vendas'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>💵 Dinheiro</span>
                    <span className={`text-sm font-semibold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                      {formatCurrency(caixaData.totalDinheiro)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>📱 PIX</span>
                    <span className={`text-sm font-semibold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                      {formatCurrency(caixaData.totalPix)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>💳 Débito</span>
                    <span className={`text-sm font-semibold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                      {formatCurrency(caixaData.totalDebito)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>💳 Crédito</span>
                    <span className={`text-sm font-semibold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                      {formatCurrency(caixaData.totalCredito)}
                    </span>
                  </div>
                  <div className={`pt-2 border-t ${isDark ? 'border-blue-700' : 'border-blue-300'} flex items-center justify-between`}>
                    <span className={`text-sm font-bold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>TOTAL</span>
                    <span className={`text-lg font-bold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                      {formatCurrency(caixaData.totalVendas)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Valor Contado */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                  💵 Valor em Dinheiro Contado: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} />
                  <input
                    type="text"
                    value={valorContado}
                    onChange={handleValorContadoChange}
                    placeholder="0,00"
                    disabled={isSaving}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 text-lg font-semibold`}
                  />
                </div>
                <p className={`text-xs ${colors.textMuted} mt-1`}>
                  Esperado: {formatCurrency(caixaData.totalDinheiro)}
                </p>
              </div>

              {/* Diferença */}
              {valorContado && (
                <div className={`p-4 rounded-lg border ${
                  diferenca === 0 
                    ? isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
                    : diferenca > 0
                    ? isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
                    : isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {diferenca === 0 ? (
                      <Check className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    ) : diferenca > 0 ? (
                      <TrendingUp className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    ) : (
                      <TrendingDown className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${
                        diferenca === 0 
                          ? isDark ? 'text-green-200' : 'text-green-800'
                          : diferenca > 0
                          ? isDark ? 'text-blue-200' : 'text-blue-800'
                          : isDark ? 'text-red-200' : 'text-red-800'
                      }`}>
                        {diferenca === 0 
                          ? '✅ Caixa conferido!' 
                          : diferenca > 0 
                          ? `💰 Sobra de ${formatCurrency(Math.abs(diferenca))}`
                          : `⚠️ Falta de ${formatCurrency(Math.abs(diferenca))}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                  Observações:
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Registre ocorrências, motivo de diferenças, etc..."
                  rows={3}
                  disabled={isSaving}
                  className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none disabled:opacity-50`}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition disabled:opacity-50 ${
                    isDark 
                      ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFecharCaixa}
                  disabled={isSaving || !valorContado}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Fechando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Fechar Caixa
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
