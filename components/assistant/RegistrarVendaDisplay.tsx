'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, Check, Loader2, AlertCircle, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface RegistrarVendaDisplayProps {
  data: {
    companyId: string;
    produto?: string;          // Nome do produto (opcional)
    valor?: number;            // legado — ainda aceito
    initialValue?: number;     // nome enviado pelo handler do assistente
    pagamento?: string;        // legado
    metodoPagamento?: string;  // nome enviado pelo handler do assistente
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

/** Converte um número (ex: 12.5) para string formatada "12,50" */
function numberToFormatted(n: number): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte string digitada (ex: "1250" → "12,50") */
function formatCurrency(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  const amount = parseFloat(numbers) / 100;
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte string formatada "12,50" para número 12.5 */
function parseBRL(str: string): number {
  // Remove pontos de milhar, troca vírgula decimal por ponto
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

export default function RegistrarVendaDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: RegistrarVendaDisplayProps) {
  const {
    companyId,
    produto: produtoInicial,
    // aceita tanto "valor" (legado) quanto "initialValue" (handler atual)
    valor: valorLegado,
    initialValue,
    pagamento: pagamentoLegado,
    metodoPagamento,
  } = data;

  // Resolve valor inicial: prefere initialValue, cai em valorLegado
  const valorInicialNum = initialValue ?? valorLegado;
  const pagamentoInicial = metodoPagamento ?? pagamentoLegado ?? 'dinheiro';

  const [produto, setProduto] = useState(produtoInicial || '');
  // Se vier número do handler, já formata; se vier undefined, começa vazio
  const [valor, setValor] = useState<string>(
    valorInicialNum != null ? numberToFormatted(valorInicialNum) : ''
  );
  const [pagamento, setPagamento] = useState(pagamentoInicial);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();
  const isDark = theme === 'dark';

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

  const PAYMENT_TYPES = [
    { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
    { value: 'pix',      label: 'PIX',      icon: '📱' },
    { value: 'debito',   label: 'Débito',   icon: '💳' },
    { value: 'credito',  label: 'Crédito',  icon: '💳' },
  ];

  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => {
      window.dispatchEvent(new CustomEvent('eai:modalClose'));
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
  }

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValor(formatCurrency(e.target.value));
  }

  async function handleSave() {
    const valorNumerico = parseBRL(valor);

    if (valorNumerico <= 0) {
      showToast('Informe um valor maior que zero', 'error');
      return;
    }

    setIsSaving(true);

    try {
      // ──────────────────────────────────────────────────────────────────────
      // O cliente do totem pode NÃO estar autenticado, portanto NÃO
      // bloqueamos o fluxo em caso de ausência de sessão.
      // profile_id fica null quando não há usuário logado — a coluna aceita NULL.
      // ──────────────────────────────────────────────────────────────────────
      let profileId: string | null = null;

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;

      if (user) {
        // Tenta encontrar sessão de perfil ativa para este usuário/empresa
        const { data: session } = await supabase
          .from('profile_sessions')
          .select('profile_id')
          .eq('company_id', companyId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        profileId = session?.profile_id ?? null;
      }

      const { error: insertError } = await supabase
        .from('vendas_rapidas')
        .insert({
          company_id:      companyId,
          profile_id:      profileId,          // null é aceito pelo schema
          descricao:       produto.trim() || 'Venda rápida',
          valor:           valorNumerico,
          tipo_pagamento:  pagamento,
          created_at:      new Date().toISOString(),
        });

      if (insertError) throw insertError;

      showToast('Venda registrada com sucesso!', 'success');

      if (playText) {
        await playText(
          `Venda de ${valorNumerico.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })} registrada com sucesso!`
        );
      }

      setTimeout(() => onClose(), 1500);

    } catch (err) {
      console.error('Erro ao registrar venda:', err);
      showToast('Erro ao registrar venda. Tente novamente.', 'error');

      if (playText) {
        await playText('Erro ao registrar venda. Tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}
        >
          {toast.type === 'error'
            ? <AlertCircle className="w-5 h-5" />
            : <Check className="w-5 h-5" />
          }
          {toast.message}
        </div>
      )}

      {/* Modal */}
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
              <ShoppingCart className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>Registrar Venda</h2>
              <p className={`text-xs ${colors.textMuted}`}>Registro rápido</p>
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
        <div className="p-6 space-y-4">

          {/* Produto/Descrição */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              Produto ou Descrição:
            </label>
            <input
              type="text"
              value={produto}
              onChange={(e) => setProduto(e.target.value)}
              placeholder="Ex: Café expresso, Serviço de impressão..."
              disabled={isSaving}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50`}
            />
          </div>

          {/* Valor */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              Valor: <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} />
              <input
                type="text"
                inputMode="numeric"
                value={valor}
                onChange={handleValorChange}
                placeholder="0,00"
                disabled={isSaving}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 text-lg font-semibold`}
              />
            </div>
            {valor ? (
              <p className={`text-xs ${colors.textMuted} mt-1`}>R$ {valor}</p>
            ) : null}
          </div>

          {/* Tipo de Pagamento */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              Forma de Pagamento:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setPagamento(type.value)}
                  disabled={isSaving}
                  className={`px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                    pagamento === type.value
                      ? isDark
                        ? 'border-green-500 bg-green-900/30 text-green-400'
                        : 'border-green-500 bg-green-50 text-green-700'
                      : `${colors.border} ${colors.cardBg} ${colors.textPrimary} hover:border-green-500/50`
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div
            className={`p-3 rounded-lg border ${
              isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
            }`}
          >
            <p className={`text-xs ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
              💡 Registro rápido para agilizar o atendimento. A venda aparecerá nos relatórios do estabelecimento.
            </p>
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
              onClick={handleSave}
              disabled={isSaving || parseBRL(valor) <= 0}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Registrar Venda
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
