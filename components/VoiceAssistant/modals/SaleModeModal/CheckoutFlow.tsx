// components/VoiceAssistant/modals/SaleModeModal/CheckoutFlow.tsx
// v5 — link_pagamento InfinitePay adicionado como método de pagamento

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Smartphone, CreditCard, Banknote, ExternalLink,
  ArrowLeft, Check, Copy, CheckCheck, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useCart } from '@/hooks/useCart';
import { criarPedido, atualizarStatusPedido, formatarPreco } from '@/lib/produtos-venda';
import RegistrationDisplay from '@/components/assistant/RegistrationDisplay';

type Step = 'cliente' | 'pagamento' | 'aguardando' | 'confirmado' | 'erro';
type MetodoPagamento = 'pix' | 'nfc' | 'tef' | 'dinheiro' | 'link';

interface CheckoutFlowProps {
  companyId: string;
  theme: 'dark' | 'light';
  onClose: () => void;
  playText?: (text: string) => Promise<void>;
  /** Chaves de métodos ativos vindas do banco (company_function_settings).
   *  Ex: ['pix_generate', 'tef_debito', 'link_pagamento']
   *  Se undefined, exibe todos (comportamento legado). */
  metodosAtivos?: string[];
  profile?: { nome: string; email?: string | null; identificador?: string | null; telefone?: string | null; endereco?: string | null } | null; // ← adicionado
}

function usePixTimer(expiresAt: string | null) {
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return timeLeft;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function CheckoutFlow({ companyId, theme, onClose, playText, metodosAtivos, profile }: CheckoutFlowProps) {
  const { itens, total, clear } = useCart();
  const isDark = theme === 'dark';

  const [step, setStep] = useState<Step>('cliente');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTel, setClienteTel] = useState('');

  // Pré-preencher com dados do perfil logado
useEffect(() => {
  if (!profile) return;
  if (profile.nome) setClienteNome(profile.nome);
  if (profile.telefone) setClienteTel(profile.telefone);
}, [profile]);
  const [metodo, setMetodo] = useState<MetodoPagamento>('pix');

  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [pixTransactionId, setPixTransactionId] = useState<string | null>(null);
  const [pixExpiresAt, setPixExpiresAt] = useState<string | null>(null);
  const [cobrancaId, setCobrancaId] = useState<string | null>(null);
  const [mpOrderId, setMpOrderId] = useState<string | null>(null);

  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixQRCode, setPixQRCode] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  // Link InfinitePay
  const [linkCobranca, setLinkCobranca] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isConfirmingLink, setIsConfirmingLink] = useState(false);
  const [linkPendingMsg, setLinkPendingMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Total salvo antes do clear() para exibir na tela de confirmado
  const [totalConfirmado, setTotalConfirmado] = useState(0);

  // Cadastro configurável
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationFields, setRegistrationFields] = useState<string[]>([]);

  useEffect(() => {
    async function checkRegistration() {
      const supabase = createClient();
      const { data } = await supabase
        .from('registration_configs')
        .select('fields')
        .eq('company_id', companyId)
        .maybeSingle();
      const fields = data?.fields ?? [];
      const extras = fields.filter((f: string) => f !== 'nome' && f !== 'telefone' && f !== 'sobrenome');
      if (extras.length > 0) setRegistrationFields(fields);
    }
    checkRegistration();
  }, [companyId]);

  // Auto-check PIX: delay 30s após QR gerado, depois verifica a cada 5s
  const [autoChecking, setAutoChecking] = useState(false);
  const pixTimeLeft = usePixTimer(pixExpiresAt);

  useEffect(() => {
    if (!pixTransactionId) return;
    const delay = setTimeout(() => setAutoChecking(true), 30_000);
    return () => clearTimeout(delay);
  }, [pixTransactionId]);

  useEffect(() => {
    if (!autoChecking || !pixTransactionId || !pedidoId) return;
    const supabase = createClient();

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('confirmar-pix-assistente', {
          body: { transaction_id: pixTransactionId },
        });
        if (!error && data?.success) {
          clearInterval(interval);
          setAutoChecking(false);
          setTotalConfirmado(total);
          setStep('confirmado');
          playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {});
          clear();
        }
      } catch { /* erro pontual — continua tentando */ }
    }, 5_000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setAutoChecking(false);
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [autoChecking, pixTransactionId, pedidoId, total, playText, clear]);

  // Polling NFC / TEF
  useEffect(() => {
    if (!polling || !pedidoId) return;
    if (metodo !== 'nfc' && metodo !== 'tef') return;
    const supabase = createClient();
    const interval = setInterval(async () => {
      try {
        if (metodo === 'nfc') {
          if (!cobrancaId) return;
          const { data: cob } = await supabase.from('cobrancas').select('status').eq('id', cobrancaId).single();
          if (cob?.status === 'PAGA') {
            const { data: p } = await supabase.from('pedidos').select('status').eq('id', pedidoId).single();
            if (p?.status !== 'pago') await supabase.rpc('confirmar_pedido_pago', { p_pedido_id: pedidoId });
            clearInterval(interval); setPolling(false);
            setTotalConfirmado(total);
            setStep('confirmado');
            playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {}); clear();
          }
        } else if (metodo === 'tef') {
          if (!mpOrderId) return;
          const { data: od } = await supabase.functions.invoke('consultar-order-mp-point', {
            body: { order_id: mpOrderId, company_id: companyId },
          });
          if (od?.status === 'paid' || od?.status === 'processed') {
            const { data: p } = await supabase.from('pedidos').select('status').eq('id', pedidoId).single();
            if (p?.status !== 'pago') await supabase.rpc('confirmar_pedido_pago', { p_pedido_id: pedidoId });
            clearInterval(interval); setPolling(false);
            setTotalConfirmado(total);
            setStep('confirmado');
            playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {}); clear();
          }
        }
      } catch { /* erro pontual */ }
    }, 3_000);
    const timeout = setTimeout(() => { clearInterval(interval); setPolling(false); }, 10 * 60 * 1000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [polling, pedidoId, cobrancaId, mpOrderId, metodo, companyId, playText, clear]);

  // Verificação manual PIX
  async function handleVerificarManual() {
    if (!pixTransactionId) return;
    setConfirmLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('confirmar-pix-assistente', {
        body: { transaction_id: pixTransactionId },
      });
      if (!error && data?.success) {
        setTotalConfirmado(total);
        setStep('confirmado'); setAutoChecking(false);
        playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {}); clear();
      } else {
        alert('PIX ainda não confirmado. Aguarde e tente novamente.');
      }
    } catch { alert('Erro ao verificar pagamento. Tente novamente.'); }
    finally { setConfirmLoading(false); }
  }

  // Confirmação manual do Link InfinitePay
  async function handleConfirmarLink() {
    if (!cobrancaId || isConfirmingLink) return;
    setIsConfirmingLink(true);
    setLinkPendingMsg(null);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const response = await fetch(`${supabaseUrl}/functions/v1/confirmar-pagamento-infinitepay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ cobranca_id: cobrancaId, company_id: companyId }),
      });
      const json = await response.json();
      if (response.status === 400 && json.pending) {
        setLinkPendingMsg(json.error || 'Pagamento ainda não identificado. Aguarde o cliente pagar e tente novamente.');
        return;
      }
      if (!response.ok || !json.success) {
        setLinkPendingMsg(json.error || 'Erro ao confirmar. Tente novamente.');
        return;
      }
      // Confirma o pedido no banco
      if (pedidoId) {
        const supabase = createClient();
        await supabase.rpc('confirmar_pedido_pago', { p_pedido_id: pedidoId });
      }
      setTotalConfirmado(total);
      setStep('confirmado');
      playText?.('Pagamento confirmado! Obrigado pela sua compra.').catch(() => {});
      clear();
    } catch {
      setLinkPendingMsg('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsConfirmingLink(false);
    }
  }

  // Criar pedido + cobrança
  const handleConfirmarPagamento = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const supabase = createClient();
      const pedido = await criarPedido({
        company_id: companyId,
        cliente_nome: clienteNome || undefined,
        cliente_telefone: clienteTel || undefined,
        itens,
        metodo_pagamento: metodo === 'link' ? 'nfc' : metodo, // link usa cobranca igual ao nfc
      });
      setPedidoId(pedido.id);

      if (metodo === 'dinheiro') {
        await atualizarStatusPedido(pedido.id, 'pago');
        setTotalConfirmado(total);
        setStep('confirmado');
        playText?.('Pedido registrado! Valor a receber: ' + formatarPreco(total)).catch(() => {});
        clear(); return;
      }

      if (metodo === 'pix') {
        const { data: pixData, error: pixErr } = await supabase.functions.invoke('gerar-pix-assistente', {
          body: { company_id: companyId, amount_cents: Math.round(total * 100) },
        });
        if (pixErr || !pixData?.transaction_id) throw new Error('Erro ao gerar PIX');
        await supabase.from('pix_transactions').update({ pedido_id: pedido.id }).eq('id', pixData.transaction_id);
        await atualizarStatusPedido(pedido.id, 'aguardando_pagamento');
        setPixTransactionId(pixData.transaction_id);
        setPixExpiresAt(pixData.expires_at ?? null);
        setPixCode(pixData.pix_code ?? null);
        setPixQRCode(pixData.qr_code_url ?? null);
        setStep('aguardando');
        playText?.('Escaneie o QR code para pagar via PIX.').catch(() => {}); return;
      }

      if (metodo === 'nfc') {
        const { data: cobData, error: cobErr } = await supabase.functions.invoke('gerar-cobranca-infinitepay', {
          body: {
            company_id: companyId,
            amount_cents: Math.round(total * 100),
            tipo: 'NFC',
            nfc_payment_method: 'debit',
            descricao: `Pedido ${pedido.id.substring(0, 8).toUpperCase()}`,
          },
        });
        if (cobErr || !cobData?.cobranca_id) throw new Error('Erro ao gerar cobrança NFC');
        await atualizarStatusPedido(pedido.id, 'aguardando_pagamento', cobData.cobranca_id);
        setCobrancaId(cobData.cobranca_id); setStep('aguardando'); setPolling(true);
        playText?.('Aproxime o cartão na maquininha para pagar.').catch(() => {}); return;
      }

      if (metodo === 'link') {
        const { data: cobData, error: cobErr } = await supabase.functions.invoke('gerar-cobranca-infinitepay', {
          body: {
            company_id: companyId,
            amount_cents: Math.round(total * 100),
            tipo: 'LINK_PAGAMENTO',
            descricao: `Pedido ${pedido.id.substring(0, 8).toUpperCase()}`,
          },
        });
        if (cobErr || !cobData?.cobranca_id) throw new Error('Erro ao gerar link de pagamento');
        await atualizarStatusPedido(pedido.id, 'aguardando_pagamento', cobData.cobranca_id);
        setCobrancaId(cobData.cobranca_id);
        setLinkCobranca(cobData.link_cobranca);
        setStep('aguardando');
        playText?.('Link de pagamento gerado. Abra o link para o cliente pagar.').catch(() => {}); return;
      }

      if (metodo === 'tef') {
        const { data: orderData, error: orderErr } = await supabase.functions.invoke('criar-order-mp-point', {
          body: {
            company_id: companyId,
            amount_cents: Math.round(total * 100),
            description: `Pedido ${pedido.id.substring(0, 8).toUpperCase()}`,
            payment_type: 'debit_card',
          },
        });
        if (orderErr || !orderData?.id) throw new Error('Erro ao criar order na maquininha');
        await supabase.from('mp_orders').update({ pedido_id: pedido.id }).eq('id', orderData.id);
        await atualizarStatusPedido(pedido.id, 'aguardando_pagamento');
        setMpOrderId(orderData.id); setStep('aguardando'); setPolling(true);
        playText?.('Insira o cartão na maquininha Point para pagar.').catch(() => {}); return;
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao processar pagamento'); setStep('erro');
    } finally { setLoading(false); }
  }, [companyId, clienteNome, clienteTel, itens, metodo, total, playText, clear]);

  const handleFinalizar = () => { clear(); onClose(); };

  // Estilos
  const textPrimary   = isDark ? 'text-white'      : 'text-gray-900';
  const textSecondary = isDark ? 'text-white/50'   : 'text-gray-500';
  const textMuted     = isDark ? 'text-white/30'   : 'text-gray-400';
  const cardBase      = `rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`;
  const inputCls      = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${
    isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30'
           : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'}`;
  const labelCls    = `text-xs font-medium mb-1 block ${textSecondary}`;
  const btnPrimary  = `w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20`;
  const btnSecondary = `w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
    isDark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`;
  const btnOutline  = `w-full py-2 rounded-xl text-xs font-medium border transition-all ${
    isDark ? 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
           : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`;

  // ── STEP: CLIENTE ─────────────────────────────────────────────────────────
  if (step === 'cliente') return (
    <>
      <div className="w-full flex flex-col gap-4">
        <div>
          <p className={`text-base font-bold mb-0.5 ${textPrimary}`}>Dados do cliente</p>
          <p className={`text-xs ${textMuted}`}>Opcional — preencha para histórico</p>
        </div>

        {registrationFields.length > 0 ? (
          <>
            <div>
              <label className={labelCls}>Nome</label>
              <input type="text" value={clienteNome} onChange={e => setClienteNome(e.target.value)}
                placeholder="Nome do cliente" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input type="tel" value={clienteTel} onChange={e => setClienteTel(e.target.value)}
                placeholder="(00) 00000-0000" className={inputCls} />
            </div>
            <button
              type="button"
              onClick={() => setShowRegistration(true)}
              className={`w-full py-2 rounded-xl text-xs border transition-all ${
                isDark ? 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                       : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
              }`}
            >
              + Cadastro completo (campos adicionais)
            </button>
          </>
        ) : (
          <>
            <div>
              <label className={labelCls}>Nome</label>
              <input type="text" value={clienteNome} onChange={e => setClienteNome(e.target.value)}
                placeholder="Nome do cliente" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input type="tel" value={clienteTel} onChange={e => setClienteTel(e.target.value)}
                placeholder="(00) 00000-0000" className={inputCls} />
            </div>
          </>
        )}

        <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
          <div className={`flex justify-between text-sm font-bold ${textPrimary}`}>
            <span>Total a pagar</span>
            <span className="text-emerald-500">{formatarPreco(total)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button onClick={() => setStep('pagamento')} className={btnPrimary}>Continuar →</button>
        </div>
      </div>

      {showRegistration && (
        <RegistrationDisplay
          data={{ companyId }}
          onClose={() => setShowRegistration(false)}
          theme={theme}
          playText={playText}
        />
      )}
    </>
  );

  // ── STEP: PAGAMENTO ───────────────────────────────────────────────────────
  if (step === 'pagamento') {
    const todosMétodos: {
      key: MetodoPagamento;
      label: string;
      Icon: React.ElementType;
      desc: string;
      dbKeys: string[];
    }[] = [
      { key: 'pix',      label: 'PIX',              Icon: Zap,          desc: 'QR Code instantâneo',      dbKeys: ['pix_generate'] },
      { key: 'link',     label: 'Link InfinitePay',  Icon: ExternalLink, desc: 'Cliente paga pelo celular', dbKeys: ['link_pagamento'] },
      { key: 'nfc',      label: 'Cartão NFC',        Icon: Smartphone,   desc: 'Aproximar cartão',         dbKeys: ['nfc_debito', 'nfc_credito'] },
      { key: 'tef',      label: 'TEF Maquininha',    Icon: CreditCard,   desc: 'Inserir na maquininha',    dbKeys: ['tef_debito', 'tef_credito'] },
      { key: 'dinheiro', label: 'Dinheiro',           Icon: Banknote,     desc: 'Pagamento em espécie',     dbKeys: ['dinheiro'] },
    ];

    const metodosFiltrados = metodosAtivos === undefined
      ? todosMétodos
      : todosMétodos.filter(m => m.dbKeys.some(k => metodosAtivos.includes(k)));

    // Garante que o método selecionado é válido; se não for, usa o primeiro disponível
    const primeiroAtivo = metodosFiltrados[0]?.key ?? 'pix';
    const metodoValido = metodosFiltrados.some(m => m.key === metodo) ? metodo : primeiroAtivo;
    if (metodoValido !== metodo) setMetodo(metodoValido);

    return (
      <div className="w-full flex flex-col gap-4">
        <div>
          <p className={`text-base font-bold mb-0.5 ${textPrimary}`}>Forma de pagamento</p>
          <p className={`text-xs ${textMuted}`}>{formatarPreco(total)} · {itens.length} {itens.length === 1 ? 'item' : 'itens'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {metodosFiltrados.map(m => (
            <button key={m.key} onClick={() => setMetodo(m.key)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                metodo === m.key
                  ? isDark ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500 bg-emerald-50'
                  : isDark ? 'border-white/10 hover:border-white/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <m.Icon className={`w-5 h-5 mb-1.5 ${
                metodo === m.key
                  ? m.key === 'link' ? 'text-violet-500' : 'text-emerald-500'
                  : textSecondary
              }`} />
              <div className={`text-xs font-semibold ${textPrimary}`}>{m.label}</div>
              <div className={`text-[10px] ${textMuted}`}>{m.desc}</div>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep('cliente')} className={btnSecondary}>
            <span className="flex items-center justify-center gap-1"><ArrowLeft className="w-4 h-4" />Voltar</span>
          </button>
          <button onClick={handleConfirmarPagamento} disabled={loading}
            className={btnPrimary + (loading ? ' opacity-70 cursor-not-allowed' : '')}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processando...
                </span>
              : 'Confirmar pagamento'}
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: AGUARDANDO ──────────────────────────────────────────────────────
  if (step === 'aguardando') {

    // PIX — 2 colunas
    if (metodo === 'pix') return (
      <div className="w-full flex flex-col gap-3">
        <div>
          <p className={`text-base font-bold ${textPrimary}`}>Pague com PIX</p>
          <p className={`text-xs ${textMuted}`}>Escaneie o QR Code ou copie o código abaixo</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Coluna 1 — info + botões */}
          <div className={`${cardBase} p-3 flex flex-col gap-2`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Copia e Cola</p>

            <div className={`rounded-lg p-2 space-y-1 ${isDark ? 'bg-white/3' : 'bg-gray-50'}`}>
              <div className="flex justify-between text-xs">
                <span className={textMuted}>Total</span>
                <span className="font-bold text-emerald-500">{formatarPreco(total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className={textMuted}>Banco</span>
                <span className={textSecondary}>Inter</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className={textMuted}>Expira</span>
                {pixExpiresAt
                  ? <span className={pixTimeLeft < 300 ? 'font-bold text-red-400' : 'font-medium text-emerald-500'}>{formatTime(pixTimeLeft)}</span>
                  : <span className="text-emerald-500">30 min</span>}
              </div>
            </div>

            {pixCode && (
              <div className={`rounded-lg px-2 py-1 text-[9px] font-mono truncate ${
                isDark ? 'bg-white/5 text-white/40' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                {pixCode.substring(0, 38)}...
              </div>
            )}

            <button
              onClick={() => { if (pixCode) { navigator.clipboard.writeText(pixCode); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000); }}}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${pixCopied ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              {pixCopied
                ? <><CheckCheck className="w-3.5 h-3.5" />Copiado!</>
                : <><Copy className="w-3.5 h-3.5" />Copiar Código PIX</>}
            </button>

            <button onClick={handleVerificarManual} disabled={confirmLoading} className={btnOutline}>
              {confirmLoading
                ? <span className="flex items-center justify-center gap-1">
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />Verificando...
                  </span>
                : 'Já paguei, verificar'}
            </button>

            <button onClick={() => { setAutoChecking(false); setStep('pagamento'); }}
              className={`text-[10px] flex items-center justify-center gap-1 transition-colors ${textMuted}`}>
              <ArrowLeft className="w-3 h-3" />Cancelar
            </button>
          </div>

          {/* Coluna 2 — QR Code */}
          <div className={`${cardBase} p-3 flex flex-col items-center gap-2`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted} self-start`}>QR Code</p>

            {pixQRCode
              ? <div className="bg-white p-2 rounded-xl w-full aspect-square flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pixQRCode} alt="QR Code PIX" className="w-full h-full object-contain" />
                </div>
              : <div className={`w-full aspect-square rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <span className="w-5 h-5 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
                </div>}

            <div className="flex items-center gap-1.5 mt-auto">
              {autoChecking
                ? <><span className="w-3 h-3 border border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" /><span className={`text-[9px] ${textMuted}`}>Verificando...</span></>
                : <span className={`text-[9px] text-center ${textMuted}`}>Auto-verificação em 30s</span>}
            </div>
          </div>
        </div>
      </div>
    );

    // Link InfinitePay
    if (metodo === 'link') return (
      <div className="w-full flex flex-col gap-4">
        <div>
          <p className={`text-base font-bold ${textPrimary}`}>Link de Pagamento</p>
          <p className={`text-xs ${textMuted}`}>Abra o link para o cliente pagar pelo celular</p>
        </div>

        {/* Info */}
        <div className={`p-3 rounded-xl border text-xs ${
          isDark ? 'bg-violet-500/10 border-violet-500/20 text-violet-300'
                 : 'bg-violet-50 border-violet-200 text-violet-700'
        }`}>
          O cliente preenche o telefone na tela da InfinitePay para receber o código de confirmação.
        </div>

        {/* Valor */}
        <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
          <div className={`flex justify-between text-sm font-bold ${textPrimary}`}>
            <span>Total</span>
            <span className="text-violet-500">{formatarPreco(total)}</span>
          </div>
        </div>

        {/* Botão abrir link */}
        <button
          onClick={() => linkCobranca && window.open(linkCobranca, '_blank')}
          disabled={!linkCobranca}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir link de pagamento
        </button>

        {/* Botão copiar link */}
        <button
          onClick={() => {
            if (linkCobranca) {
              navigator.clipboard.writeText(linkCobranca);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            }
          }}
          disabled={!linkCobranca}
          className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${
            linkCopied
              ? 'bg-emerald-500 text-white border-emerald-500'
              : isDark
                ? 'border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {linkCopied
            ? <><CheckCheck className="w-4 h-4" />Copiado!</>
            : <><Copy className="w-4 h-4" />Copiar link</>}
        </button>

        {/* Aviso pendente */}
        {linkPendingMsg && (
          <div className={`p-3 rounded-xl border text-xs ${
            isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                   : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            {linkPendingMsg}
          </div>
        )}

        {/* Confirmar pagamento */}
        <div className={`pt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
          <p className={`text-xs text-center mb-3 ${textMuted}`}>Após o cliente pagar:</p>
          <button
            onClick={handleConfirmarLink}
            disabled={isConfirmingLink || !cobrancaId}
            className={btnPrimary + (isConfirmingLink ? ' opacity-70 cursor-not-allowed' : '')}
          >
            {isConfirmingLink
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verificando...
                </span>
              : <span className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />Confirmar pagamento recebido
                </span>
            }
          </button>
        </div>

        <button
          onClick={() => { setStep('pagamento'); setLinkCobranca(null); setLinkPendingMsg(null); }}
          className={btnSecondary}
        >
          <span className="flex items-center justify-center gap-1"><ArrowLeft className="w-4 h-4" />Cancelar</span>
        </button>
      </div>
    );

    // NFC / TEF — simples centralizado
    return (
      <div className="w-full flex flex-col items-center gap-4">
        <div className="text-center">
          <p className={`text-base font-bold mb-0.5 ${textPrimary}`}>
            {metodo === 'nfc' ? 'Aproxime o cartão' : 'Insira o cartão na maquininha'}
          </p>
          <p className={`text-xs ${textMuted}`}>
            {metodo === 'nfc' ? 'Aproxime na maquininha para pagar' : 'Insira ou aproxime o cartão na maquininha Point'}
          </p>
        </div>
        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50 border border-gray-200'}`}>
          {metodo === 'nfc'
            ? <Smartphone className={`w-10 h-10 ${textSecondary}`} />
            : <CreditCard className={`w-10 h-10 ${textSecondary}`} />}
        </div>
        <p className="text-2xl font-bold text-emerald-500">{formatarPreco(total)}</p>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
          <span className={`text-xs ${textMuted}`}>Aguardando pagamento...</span>
        </div>
        <button onClick={() => { setPolling(false); setStep('pagamento'); }} className={btnSecondary}>Cancelar</button>
      </div>
    );
  }

  // ── STEP: CONFIRMADO ──────────────────────────────────────────────────────
  if (step === 'confirmado') return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
        <Check className="w-10 h-10 text-emerald-500" strokeWidth={2.5} />
      </div>
      <div className="text-center">
        <p className={`text-xl font-bold mb-1 ${textPrimary}`}>Pagamento confirmado!</p>
        {clienteNome && <p className={`text-sm ${textSecondary}`}>Obrigado, {clienteNome}!</p>}
        <p className="text-lg font-bold mt-2 text-emerald-500">{formatarPreco(totalConfirmado)}</p>
      </div>
      <button onClick={handleFinalizar} className={`${btnPrimary} flex items-center justify-center gap-2`}>
        <Check className="w-4 h-4" />Fechar
      </button>
    </div>
  );

  // ── STEP: ERRO ────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
        <X className="w-8 h-8 text-red-500" />
      </div>
      <p className={`text-sm text-center ${textSecondary}`}>{erro}</p>
      <div className="flex gap-2 w-full">
        <button onClick={onClose} className={btnSecondary}>Fechar</button>
        <button onClick={() => { setErro(null); setStep('pagamento'); }} className={btnPrimary}>Tentar novamente</button>
      </div>
    </div>
  );
}
