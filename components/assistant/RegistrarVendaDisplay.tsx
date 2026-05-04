'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, Check, Loader2, AlertCircle, DollarSign, Zap } from 'lucide-react';
import { atualizarStatusPedido } from '@/lib/produtos-venda';
import PIXConfirmationModal from '@/components/VoiceAssistant/modals/PixConfirmationModal';
import MercadoPagoPointDisplay from '@/components/VoiceAssistant/modals/MercadoPagoPointDisplay';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RegistrarVendaDisplayProps {
  data: {
    companyId: string;
    profileId?: string | null;
    produto?: string;
    valor?: number;
    initialValue?: number;
    pagamento?: string;
    metodoPagamento?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type PixData = {
  transactionId: string;
  qrCodeUrl: string;
  pixCode: string;
  companyName: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function numberToFormatted(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  return (parseFloat(numbers) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBRL(str: string): number {
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

const PAGAMENTO_MAP: Record<string, 'pix' | 'nfc' | 'tef' | 'dinheiro' | 'fiado'> = {
  dinheiro: 'dinheiro',
  pix:      'pix',
  debito:   'nfc',
  credito:  'nfc',
  fiado:    'fiado',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function RegistrarVendaDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: RegistrarVendaDisplayProps) {
  const {
    companyId,
    profileId,
    produto: produtoInicial,
    valor: valorLegado,
    initialValue,
    pagamento: pagamentoLegado,
    metodoPagamento,
  } = data;

  const valorInicialNum  = initialValue ?? valorLegado;
  const pagamentoInicial = metodoPagamento ?? pagamentoLegado ?? 'dinheiro';

  const [produto,       setProduto]       = useState(produtoInicial || '');
  const [valor,         setValor]         = useState<string>(
    valorInicialNum != null ? numberToFormatted(valorInicialNum) : ''
  );
  const [pagamento,     setPagamento]     = useState(pagamentoInicial);
  const [vendaRapida,   setVendaRapida]   = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [isGerandoPix,  setIsGerandoPix]  = useState(false);
  const [toast,         setToast]         = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [mounted,       setMounted]       = useState(false);

  // Modais de cobrança
  const [pixData,       setPixData]       = useState<PixData | null>(null);
  const [showTef,       setShowTef]       = useState(false);

  const isDark = theme === 'dark';

  const DARK  = { bg: 'bg-slate-900', cardBg: 'bg-slate-800', border: 'border-white/10',  textPrimary: 'text-white',    textMuted: 'text-white/60', inputBg: 'bg-slate-700' };
  const LIGHT = { bg: 'bg-white',     cardBg: 'bg-gray-50',   border: 'border-gray-200',  textPrimary: 'text-gray-900', textMuted: 'text-gray-600', inputBg: 'bg-white'     };
  const colors = isDark ? DARK : LIGHT;

  const PAYMENT_TYPES = [
    { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
    { value: 'pix',      label: 'PIX',      icon: '📱' },
    { value: 'debito',   label: 'Débito',   icon: '💳' },
    { value: 'credito',  label: 'Crédito',  icon: '💳' },
  ];

  // Pagamentos que abrem modal de cobrança quando vendaRapida=false
  const precisaModal = !vendaRapida && ['pix', 'debito', 'credito'].includes(pagamento);

  useEffect(() => {
    setMounted(true);
    window.dispatchEvent(new CustomEvent('eai:modalOpen'));
    return () => window.dispatchEvent(new CustomEvent('eai:modalClose'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
  }

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValor(formatCurrency(e.target.value));
  }

  // ── Registrar venda (fallback direto no Supabase) ─────────────────────────
  async function handleSaveFallback(valorNumerico: number, statusFinal: 'pago' | 'aberto' = 'pago') {
    const { createClient } = await import('@/lib/supabase-browser');
    const supabase  = createClient();
    const descricao = produto.trim() || 'Venda rápida';
    const metodoDB  = PAGAMENTO_MAP[pagamento] ?? 'dinheiro';
    const now       = new Date().toISOString();

    try {
      let userId: string | null = null;
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        userId = authData.user.id;
      } else {
        const { data: company } = await supabase
          .from('companies')
          .select('user_id')
          .eq('id', companyId)
          .maybeSingle();
        userId = company?.user_id ?? null;
      }

      const resolvedProfileId = profileId ?? null;

      const { data: pedidoInserido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          company_id:       companyId,
          user_id:          userId,
          profile_id:       resolvedProfileId,
          subtotal:         valorNumerico,
          desconto:         0,
          total:            valorNumerico,
          metodo_pagamento: metodoDB,
          status:           statusFinal,
          observacoes:      descricao !== 'Venda rápida' ? descricao : null,
          paid_at:          statusFinal === 'pago' ? now : null,
          created_at:       now,
          updated_at:       now,
        })
        .select('id')
        .single();

      if (pedidoError) throw pedidoError;

      // Produto placeholder
      let produtoId: string | null = null;
      const { data: produtoAvulso } = await supabase
        .from('produtos_venda')
        .select('id')
        .eq('company_id', companyId)
        .eq('nome', 'Venda Avulsa')
        .limit(1)
        .maybeSingle();

      if (produtoAvulso) {
        produtoId = produtoAvulso.id;
      } else {
        const { data: novoProduto } = await supabase
          .from('produtos_venda')
          .insert({
            company_id:       companyId,
            nome:             'Venda Avulsa',
            descricao:        'Placeholder para vendas rápidas via assistente',
            preco_venda:      valorNumerico,
            unidade:          'un',
            controla_estoque: false,
            is_active:        false,
          })
          .select('id')
          .single();
        produtoId = novoProduto?.id ?? null;
      }

      if (produtoId && pedidoInserido?.id) {
        await supabase.from('pedido_itens').insert({
          pedido_id:      pedidoInserido.id,
          produto_id:     produtoId,
          nome_snapshot:  descricao,
          preco_unitario: valorNumerico,
          quantidade:     1,
          subtotal:       valorNumerico,
        });
      }

      return pedidoInserido?.id ?? null;
    } catch (err) {
      throw err;
    }
  }

  // ── Fluxo principal ───────────────────────────────────────────────────────
  async function handleSave() {
    const valorNumerico = parseBRL(valor);
    if (valorNumerico <= 0) {
      showToast('Informe um valor maior que zero', 'error');
      return;
    }

    // Venda Rápida marcada → registra direto
    if (vendaRapida) {
      setIsSaving(true);
      try {
        await handleSaveFallback(valorNumerico, 'pago');
        showToast('Venda registrada com sucesso!', 'success');
        if (playText) await playText(`Venda de ${valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} registrada com sucesso!`);
        setTimeout(() => onClose(), 1500);
      } catch (err) {
        console.error('Erro ao registrar venda:', err);
        showToast('Erro ao registrar venda. Tente novamente.', 'error');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Sem Venda Rápida + dinheiro/fiado → registra direto também
    if (['dinheiro', 'fiado'].includes(pagamento)) {
      setIsSaving(true);
      try {
        await handleSaveFallback(valorNumerico, 'pago');
        showToast('Venda registrada com sucesso!', 'success');
        if (playText) await playText(`Venda registrada com sucesso!`);
        setTimeout(() => onClose(), 1500);
      } catch (err) {
        showToast('Erro ao registrar venda. Tente novamente.', 'error');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Sem Venda Rápida + PIX → gera cobrança e abre modal
    if (pagamento === 'pix') {
      setIsGerandoPix(true);
      try {
        const { createClient } = await import('@/lib/supabase-browser');
        const supabase = createClient();
        const descricao = produto.trim() || 'Venda rápida';

        const { data: pixResult, error } = await supabase.functions.invoke('gerar-pix-assistente', {
          body: {
            company_id:   companyId,
            amount_cents: Math.round(valorNumerico * 100),
            description:  descricao,
          },
        });

        if (error) throw error;

        setPixData({
          transactionId: pixResult.transaction_id,
          qrCodeUrl:     pixResult.qr_code_url,
          pixCode:       pixResult.pix_code,
          companyName:   pixResult.company_name ?? '',
        });
      } catch (err) {
        console.error('Erro ao gerar PIX:', err);
        showToast('Erro ao gerar cobrança PIX. Tente novamente.', 'error');
      } finally {
        setIsGerandoPix(false);
      }
      return;
    }

    // Sem Venda Rápida + débito/crédito → abre TEF
    if (['debito', 'credito'].includes(pagamento)) {
      setShowTef(true);
      return;
    }
  }

  if (!mounted) return null;

  // ── Modal PIX aberto ──────────────────────────────────────────────────────
  if (pixData) {
    const valorNumerico = parseBRL(valor);
    return (
      <PIXConfirmationModal
        transactionId={pixData.transactionId}
        amount={valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        qrCodeUrl={pixData.qrCodeUrl}
        pixCode={pixData.pixCode}
        companyName={pixData.companyName}
        theme={theme}
        onConfirm={async () => {
          await handleSaveFallback(valorNumerico, 'pago');
          onClose();
        }}
        onCancel={async () => {
          setPixData(null);
        }}
      />
    );
  }

  // ── Modal TEF aberto ──────────────────────────────────────────────────────
  if (showTef) {
    const valorNumerico = parseBRL(valor);
    return (
      <MercadoPagoPointDisplay
        companyId={companyId}
        paymentType={pagamento === 'credito' ? 'credit_card' : 'debit_card'}
        initialAmount={Math.round(valorNumerico * 100)}
        theme={theme}
        playText={playText}
        onClose={async () => {
          // Quando TEF fecha (pago ou cancelado), registra a venda e fecha
          try {
            await handleSaveFallback(valorNumerico, 'pago');
          } catch (_) {}
          onClose();
        }}
      />
    );
  }

  // ── Modal principal ───────────────────────────────────────────────────────
  const content = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Modal */}
      <div className={`w-full max-w-md rounded-2xl shadow-2xl ${colors.bg} ${colors.border} border overflow-hidden`}>

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
            disabled={isSaving || isGerandoPix}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
              isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
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
              disabled={isSaving || isGerandoPix}
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
                disabled={isSaving || isGerandoPix}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${colors.border} ${colors.inputBg} ${colors.textPrimary} focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 text-lg font-semibold`}
              />
            </div>
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
                  disabled={isSaving || isGerandoPix}
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

          {/* Toggle Venda Rápida */}
          <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
            vendaRapida
              ? isDark
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-amber-50 border-amber-200'
              : isDark
                ? 'bg-white/3 border-white/10'
                : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 flex-shrink-0 ${
                vendaRapida
                  ? isDark ? 'text-amber-400' : 'text-amber-600'
                  : isDark ? 'text-white/40' : 'text-gray-400'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  vendaRapida
                    ? isDark ? 'text-amber-300' : 'text-amber-700'
                    : colors.textPrimary
                }`}>
                  Venda Rápida
                </p>
                <p className={`text-xs ${colors.textMuted}`}>
                  {vendaRapida
                    ? 'Registra direto como pago'
                    : precisaModal
                      ? pagamento === 'pix' ? 'Vai gerar cobrança PIX' : 'Vai abrir terminal TEF'
                      : 'Registra direto como pago'
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVendaRapida(!vendaRapida)}
              disabled={isSaving || isGerandoPix}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                vendaRapida ? 'bg-amber-400' : isDark ? 'bg-slate-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                vendaRapida ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving || isGerandoPix}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition disabled:opacity-50 ${
                isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isGerandoPix || parseBRL(valor) <= 0}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isSaving || isGerandoPix ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isGerandoPix ? 'Gerando PIX...' : 'Salvando...'}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {precisaModal
                    ? pagamento === 'pix' ? 'Cobrar via PIX' : 'Cobrar via TEF'
                    : 'Registrar Venda'
                  }
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
