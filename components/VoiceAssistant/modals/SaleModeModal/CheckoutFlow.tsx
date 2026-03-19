// components/VoiceAssistant/modals/SaleModeModal/CheckoutFlow.tsx
//
// CORREÇÕES v2:
// - PIX: usa gerar-pix-assistente → pix_transactions (não cobrancas)
//   polling em pix_transactions.status = 'confirmed'
//   pedido_id gravado em pix_transactions para a edge confirmar_pedido_pago
// - NFC: usa gerar-cobranca-infinitepay → cobrancas
//   link pedido via cobranca_id (já existia)
// - TEF: usa criar-order-mp-point → mp_orders
//   pedido_id gravado em mp_orders para o webhook fechar o ciclo

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useCart } from '@/hooks/useCart';
import { criarPedido, atualizarStatusPedido, formatarPreco } from '@/lib/produtos-venda';

type Step = 'cliente' | 'pagamento' | 'aguardando' | 'confirmado' | 'erro';
type MetodoPagamento = 'pix' | 'nfc' | 'tef' | 'dinheiro';

interface CheckoutFlowProps {
  companyId: string;
  theme: 'dark' | 'light';
  onClose: () => void;
  playText?: (text: string) => Promise<void>;
}

export default function CheckoutFlow({ companyId, theme, onClose, playText }: CheckoutFlowProps) {
  const { itens, total, clear } = useCart();
  const isDark = theme === 'dark';

  const [step, setStep] = useState<Step>('cliente');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTel, setClienteTel] = useState('');
  const [metodo, setMetodo] = useState<MetodoPagamento>('pix');

  // IDs de controle — semântica por método:
  // PIX:  pixTransactionId = pix_transactions.id
  // NFC:  cobrancaId       = cobrancas.id
  // TEF:  mpOrderId        = mp_orders.id
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [pixTransactionId, setPixTransactionId] = useState<string | null>(null);
  const [cobrancaId, setCobrancaId] = useState<string | null>(null);
  const [mpOrderId, setMpOrderId] = useState<string | null>(null);

  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixQRCode, setPixQRCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // ── Polling — cada método verifica sua própria tabela ─────────────────────
  useEffect(() => {
    if (!polling || !pedidoId) return;

    const supabase = createClient();

    const interval = setInterval(async () => {
      try {

        // ── PIX: verifica pix_transactions.status ──────────────────────────
        if (metodo === 'pix') {
          if (!pixTransactionId) return;

          const { data: tx } = await supabase
            .from('pix_transactions')
            .select('status')
            .eq('id', pixTransactionId)
            .single();

          // A edge confirmar-pix-assistente já chamou confirmar_pedido_pago
          // então basta verificar o status do pedido ou da transação
          if (tx?.status === 'confirmed') {
            setPolling(false);
            setStep('confirmado');
            playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {});
            clear();
            clearInterval(interval);
            return;
          }

          // Fallback: verifica o pedido diretamente (caso a edge já confirmou)
          const { data: pedido } = await supabase
            .from('pedidos')
            .select('status')
            .eq('id', pedidoId)
            .single();

          if (pedido?.status === 'pago') {
            setPolling(false);
            setStep('confirmado');
            playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {});
            clear();
            clearInterval(interval);
          }
        }

        // ── NFC: verifica cobrancas.status ─────────────────────────────────
        else if (metodo === 'nfc') {
          if (!cobrancaId) return;

          const { data: cob } = await supabase
            .from('cobrancas')
            .select('status')
            .eq('id', cobrancaId)
            .single();

          if (cob?.status === 'PAGA') {
            // infinitepay-webhook já chamou confirmar_pedido_pago
            // mas fazemos o fallback para garantir
            const { data: pedido } = await supabase
              .from('pedidos')
              .select('status')
              .eq('id', pedidoId)
              .single();

            if (pedido?.status !== 'pago') {
              await supabase.rpc('confirmar_pedido_pago', { p_pedido_id: pedidoId });
            }

            setPolling(false);
            setStep('confirmado');
            playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {});
            clear();
            clearInterval(interval);
          }
        }

        // ── TEF: consulta mp_orders via edge consultar-order-mp-point ──────
        else if (metodo === 'tef') {
          if (!mpOrderId) return;

          const { data: orderData } = await supabase.functions.invoke('consultar-order-mp-point', {
            body: { order_id: mpOrderId, company_id: companyId },
          });

          if (orderData?.status === 'paid' || orderData?.status === 'processed') {
            // mp-point-webhook já chamou confirmar_pedido_pago via pedido_id
            // fallback para garantir
            const { data: pedido } = await supabase
              .from('pedidos')
              .select('status')
              .eq('id', pedidoId)
              .single();

            if (pedido?.status !== 'pago') {
              await supabase.rpc('confirmar_pedido_pago', { p_pedido_id: pedidoId });
            }

            setPolling(false);
            setStep('confirmado');
            playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {});
            clear();
            clearInterval(interval);
          }
        }

      } catch (e) {
        console.error('Erro no polling:', e);
        // Não interrompe o polling por erro pontual
      }
    }, 3000);

    // Timeout de 10 minutos
    const timeout = setTimeout(() => {
      setPolling(false);
      clearInterval(interval);
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [polling, pedidoId, pixTransactionId, cobrancaId, mpOrderId, metodo, companyId, playText, clear]);

  // ── Criar pedido + cobrança ───────────────────────────────────────────────
  const handleConfirmarPagamento = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const supabase = createClient();

      // 1. Criar o pedido
      const pedido = await criarPedido({
        company_id: companyId,
        cliente_nome: clienteNome || undefined,
        cliente_telefone: clienteTel || undefined,
        itens,
        metodo_pagamento: metodo,
      });
      setPedidoId(pedido.id);

      // ── Dinheiro: confirma direto ─────────────────────────────────────────
      if (metodo === 'dinheiro') {
        await atualizarStatusPedido(pedido.id, 'pago');
        setStep('confirmado');
        playText?.('Pedido registrado! Valor a receber: ' + formatarPreco(total)).catch(() => {});
        clear();
        return;
      }

      // ── PIX ───────────────────────────────────────────────────────────────
      if (metodo === 'pix') {
        const { data: pixData, error: pixErr } = await supabase.functions.invoke('gerar-pix-assistente', {
          body: {
            company_id: companyId,
            amount_cents: Math.round(total * 100),
          },
        });

        if (pixErr || !pixData?.transaction_id) {
          throw new Error('Erro ao gerar PIX');
        }

        // Salva pedido_id em pix_transactions para a edge confirmar-pix-assistente
        // chamar confirmar_pedido_pago e baixar o estoque automaticamente
        await supabase
          .from('pix_transactions')
          .update({ pedido_id: pedido.id })
          .eq('id', pixData.transaction_id);

        await atualizarStatusPedido(pedido.id, 'aguardando_pagamento');

        setPixTransactionId(pixData.transaction_id);
        setPixCode(pixData.pix_code ?? null);
        setPixQRCode(pixData.qr_code_url ?? null);
        setStep('aguardando');
        setPolling(true);
        playText?.('Escaneie o QR code para pagar via PIX.').catch(() => {});
        return;
      }

      // ── NFC InfinitePay ───────────────────────────────────────────────────
      if (metodo === 'nfc') {
        const { data: cobData, error: cobErr } = await supabase.functions.invoke('gerar-cobranca-infinitepay', {
          body: {
            company_id: companyId,
            amount_cents: Math.round(total * 100),
            description: `Pedido ${pedido.id.substring(0, 8).toUpperCase()}`,
          },
        });

        if (cobErr || !cobData?.id) {
          throw new Error('Erro ao gerar cobrança NFC');
        }

        // pedido.cobranca_id já aponta para cobrancas.id
        // infinitepay-webhook busca pedido via cobrancas.id e chama confirmar_pedido_pago
        await atualizarStatusPedido(pedido.id, 'aguardando_pagamento', cobData.id);

        setCobrancaId(cobData.id);
        setStep('aguardando');
        setPolling(true);
        playText?.('Aproxime o cartão na maquininha para pagar.').catch(() => {});
        return;
      }

      // ── TEF Mercado Pago Point ────────────────────────────────────────────
      if (metodo === 'tef') {
        const { data: orderData, error: orderErr } = await supabase.functions.invoke('criar-order-mp-point', {
          body: {
            company_id: companyId,
            amount_cents: Math.round(total * 100),
            description: `Pedido ${pedido.id.substring(0, 8).toUpperCase()}`,
            payment_type: 'debit_card',
          },
        });

        if (orderErr || !orderData?.id) {
          throw new Error('Erro ao criar order na maquininha');
        }

        // Salva pedido_id em mp_orders para o webhook fechar o ciclo
        await supabase
          .from('mp_orders')
          .update({ pedido_id: pedido.id })
          .eq('id', orderData.id);

        await atualizarStatusPedido(pedido.id, 'aguardando_pagamento');

        setMpOrderId(orderData.id);
        setStep('aguardando');
        setPolling(true);
        playText?.('Insira o cartão na maquininha Point para pagar.').catch(() => {});
        return;
      }

    } catch (err: any) {
      console.error('Erro no checkout:', err);
      setErro(err?.message || 'Erro ao processar pagamento');
      setStep('erro');
    } finally {
      setLoading(false);
    }
  }, [companyId, clienteNome, clienteTel, itens, metodo, total, playText, clear]);

  const handleFinalizar = () => {
    clear();
    onClose();
  };

  // ── Estilos compartilhados ────────────────────────────────────────────────
  const baseCard = 'w-full max-w-sm mx-auto flex flex-col gap-4';

  const labelCls = `text-xs font-medium mb-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`;

  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
  }`;

  const btnPrimary = `w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20`;

  const btnSecondary = `w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
    isDark
      ? 'bg-white/5 hover:bg-white/10 text-white/60'
      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
  }`;

  // ── Step 1: Dados do cliente ──────────────────────────────────────────────
  if (step === 'cliente') {
    return (
      <div className={baseCard}>
        <div>
          <p className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Dados do cliente
          </p>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            Opcional — preencha para histórico
          </p>
        </div>

        <div>
          <label className={labelCls}>Nome</label>
          <input
            type="text"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            placeholder="Nome do cliente"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Telefone</label>
          <input
            type="tel"
            value={clienteTel}
            onChange={(e) => setClienteTel(e.target.value)}
            placeholder="(00) 00000-0000"
            className={inputCls}
          />
        </div>

        <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
          <div className={`flex justify-between text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span>Total a pagar</span>
            <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>
              {formatarPreco(total)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button onClick={() => setStep('pagamento')} className={btnPrimary}>
            Continuar →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Método de pagamento ───────────────────────────────────────────
  if (step === 'pagamento') {
    const metodos: { key: MetodoPagamento; label: string; icon: string; desc: string }[] = [
      { key: 'pix',      label: 'PIX',              icon: '⚡', desc: 'QR Code instantâneo' },
      { key: 'nfc',      label: 'Cartão NFC',        icon: '📱', desc: 'Aproximar cartão' },
      { key: 'tef',      label: 'TEF Maquininha',    icon: '💳', desc: 'Inserir na maquininha' },
      { key: 'dinheiro', label: 'Dinheiro',          icon: '💵', desc: 'Pagamento em espécie' },
    ];

    return (
      <div className={baseCard}>
        <div>
          <p className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Forma de pagamento
          </p>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            {formatarPreco(total)} · {itens.length} {itens.length === 1 ? 'item' : 'itens'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {metodos.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetodo(m.key)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                metodo === m.key
                  ? isDark
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-emerald-500 bg-emerald-50'
                  : isDark
                    ? 'border-white/10 bg-white/3 hover:border-white/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-1">{m.icon}</div>
              <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {m.label}
              </div>
              <div className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                {m.desc}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setStep('cliente')} className={btnSecondary}>← Voltar</button>
          <button
            onClick={handleConfirmarPagamento}
            disabled={loading}
            className={btnPrimary + (loading ? ' opacity-70 cursor-not-allowed' : '')}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </span>
            ) : 'Confirmar pagamento'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Aguardando pagamento ──────────────────────────────────────────
  if (step === 'aguardando') {
    return (
      <div className={baseCard + ' items-center'}>
        <div className="text-center">
          <p className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {metodo === 'pix' ? 'Escaneie o QR Code' : 'Apresente o cartão'}
          </p>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            {metodo === 'tef'
              ? 'Insira ou aproxime o cartão na maquininha Point'
              : metodo === 'nfc'
              ? 'Aproxime o cartão na maquininha'
              : 'Aguardando confirmação do pagamento...'}
          </p>
        </div>

        {/* QR Code PIX */}
        {metodo === 'pix' && pixQRCode && (
          <div className={`p-4 rounded-2xl ${isDark ? 'bg-white' : 'bg-white border border-gray-200'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pixQRCode} alt="QR Code PIX" className="w-48 h-48 object-contain" />
          </div>
        )}

        {/* PIX copia-e-cola */}
        {metodo === 'pix' && pixCode && (
          <div className="w-full">
            <p className={`text-[10px] mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              Copia e cola:
            </p>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
              isDark ? 'bg-white/5' : 'bg-gray-50 border border-gray-200'
            }`}>
              <p className={`text-[10px] flex-1 truncate font-mono ${
                isDark ? 'text-white/60' : 'text-gray-600'
              }`}>
                {pixCode}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(pixCode)}
                className={`text-[10px] flex-shrink-0 px-2 py-1 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-white/10 text-white/60 hover:bg-white/20'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Copiar
              </button>
            </div>
          </div>
        )}

        {/* Ícone maquininha para NFC/TEF */}
        {(metodo === 'nfc' || metodo === 'tef') && (
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl ${
            isDark ? 'bg-white/5' : 'bg-gray-50 border border-gray-200'
          }`}>
            {metodo === 'nfc' ? '📱' : '💳'}
          </div>
        )}

        {/* Spinner */}
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${
            isDark
              ? 'border-emerald-500/40 border-t-emerald-500'
              : 'border-emerald-300 border-t-emerald-500'
          }`} />
          <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            Verificando pagamento...
          </span>
        </div>

        <p className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
          {formatarPreco(total)}
        </p>

        <button
          onClick={() => { setPolling(false); setStep('pagamento'); }}
          className={btnSecondary}
        >
          Cancelar
        </button>
      </div>
    );
  }

  // ── Step 4: Confirmado ────────────────────────────────────────────────────
  if (step === 'confirmado') {
    return (
      <div className={baseCard + ' items-center'}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
          isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
        }`}>
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="text-center">
          <p className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Pagamento confirmado!
          </p>
          {clienteNome && (
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              Obrigado, {clienteNome}!
            </p>
          )}
          <p className={`text-lg font-bold mt-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {formatarPreco(total)}
          </p>
        </div>

        <button onClick={handleFinalizar} className={btnPrimary}>
          Fechar ✓
        </button>
      </div>
    );
  }

  // ── Step erro ─────────────────────────────────────────────────────────────
  return (
    <div className={baseCard + ' items-center'}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
        isDark ? 'bg-red-500/20' : 'bg-red-100'
      }`}>
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <p className={`text-sm text-center ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
        {erro}
      </p>

      <div className="flex gap-2 w-full">
        <button onClick={onClose} className={btnSecondary}>Fechar</button>
        <button
          onClick={() => { setErro(null); setStep('pagamento'); }}
          className={btnPrimary}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
