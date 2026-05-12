'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import AssistenteFiscalChat from '@/components/dashboard/vendas/AssistenteFiscalChat';
import PreviewNotaFiscal from '@/components/dashboard/vendas/PreviewNotaFiscal';
import {
  Receipt,
  FileText,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
  Mic,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DadosNota {
  destinatario: {
    nome: string;
    cpf_cnpj?: string;
    endereco?: string;
  };
  itens: Array<{
    nome: string;
    quantidade: number;
    valor_unitario: number;
    unidade: string;
    ncm?: string;
    cfop?: number;
    origem_produto?: number;
    produto_id?: string;
    ncm_sugerido?: boolean;
  }>;
}

// ─── Props — mantém interface do componente original ─────────────────────────

interface EmitirNotaModalProps {
  data: {
    companyId: string;
    nfe_plano?: string | null;
    pedidoId?: string; // opcional: se vier de pedido pago
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

type Step = 'form' | 'form_nfe' | 'confirming' | 'emitting' | 'success' | 'error';

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EmitirNotaModal({
  data,
  onClose,
  theme = 'dark',
}: EmitirNotaModalProps) {
  const { companyId, nfe_plano, pedidoId } = data;
  const supabase = createClient();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  // Steps: form → escolha do tipo
  //        form_nfe → assistente IA coleta dados NF-e
  //        confirming → revisão antes de emitir
  //        emitting → aguardando SEFAZ
  //        success / error
  const [step, setStep] = useState<Step>('form');
  const [tipoNota, setTipoNota] = useState<'nfce' | 'nfe'>('nfce');
  const [plano] = useState<string>(nfe_plano ?? '');

  // Dados coletados pelo assistente IA (NF-e)
  const [dadosNfe, setDadosNfe] = useState<DadosNota | null>(null);
  const [statusAssistente, setStatusAssistente] = useState<'collecting' | 'ready' | 'error'>('collecting');

  // Campos do formulário manual (NFCe / NFS-e)
  const [destinatarioCpfCnpj, setDestinatarioCpfCnpj] = useState('');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [descricaoServico, setDescricaoServico] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [enviarEmail, setEnviarEmail] = useState(false);

  // Resultado
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [company, setCompany] = useState<any>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // ─── Reset ao montar ───────────────────────────────────────────────────────
  useEffect(() => {
    setStep('form');
    setTipoNota('nfce');
    setDadosNfe(null);
    setStatusAssistente('collecting');
    setResultado(null);
    setErro('');
    setValorTotal('');
    setDescricaoServico('');
    setDestinatarioCpfCnpj('');
    setDestinatarioNome('');
    setDestinatarioEmail('');
    setFormaPagamento('pix');
    setEnviarEmail(false);
  }, []); // roda uma vez ao montar

  // ─── Carregar empresa ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadCompany = async () => {
      const { data: row } = await supabase
        .from('companies')
        .select('nfe_ativo, nfe_cnpj, nfe_crt, name')
        .eq('id', companyId)
        .single();
      setCompany(row);
    };
    loadCompany();
  }, [companyId]);

  // ─── Toast auto-dismiss ────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'warning') =>
    setToast({ message, type });

  // ─── TTS ──────────────────────────────────────────────────────────────────
  const playText = useCallback(async (text: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
      return new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
      });
    } catch (err) {
      console.error('Erro TTS:', err);
    }
  }, []);

  // ─── Voz na tela de confirmação ────────────────────────────────────────────
  useModalVoiceCommand({
    active: step === 'confirming',
    onTranscript: (transcript) => {
      const t = transcript.toLowerCase();
      if (['confirmar', 'confirma', 'emitir', 'sim', 'pode emitir'].some((x) => t.includes(x))) {
        handleEmitir();
      } else if (['cancelar', 'cancela', 'fechar', 'não'].some((x) => t.includes(x))) {
        onCloseRef.current();
      }
    },
  });

  // ─── Callback do assistente IA ─────────────────────────────────────────────
  const handleDadosAtualizados = useCallback(
    (novosDados: DadosNota | null, status: 'collecting' | 'ready' | 'error') => {
      setDadosNfe(novosDados);
      setStatusAssistente(status);
    },
    [],
  );

  // ─── Avançar step ─────────────────────────────────────────────────────────
  const handleAvancar = useCallback(() => {
    if (step === 'form') {
      if (tipoNota === 'nfe') {
        // NF-e → assistente IA coleta os dados
        setStep('form_nfe');
      } else {
        // NFCe / NFS-e → formulário manual → confirmar
        if (!valorTotal || isNaN(parseFloat(valorTotal.replace(',', '.')))) {
          showToast('Informe um valor válido', 'warning');
          return;
        }
        if (plano === 'nfse' && !descricaoServico.trim()) {
          showToast('Informe a descrição do serviço', 'warning');
          return;
        }
        setStep('confirming');
      }
    } else if (step === 'form_nfe' && statusAssistente === 'ready') {
      setStep('confirming');
    }
  }, [step, tipoNota, statusAssistente, valorTotal, descricaoServico, plano]);

  // ─── Emitir (chama Edge Function) ─────────────────────────────────────────
  const handleEmitir = useCallback(async () => {
    setStep('emitting');
    try {
      const isNFe = tipoNota === 'nfe';
      const valor = parseFloat(valorTotal.replace(',', '.'));
      const cpfCnpjLimpo = destinatarioCpfCnpj.replace(/\D/g, '');

      const body: Record<string, unknown> = {
        company_id: companyId,
        tipo: isNFe ? 'nfe' : 'nfce',
        modelo: isNFe ? '55' : '65',
        pedido_id: pedidoId,
        forma_pagamento: formaPagamento,
        enviar_email: enviarEmail,
      };

      if (isNFe && dadosNfe) {
        // Dados coletados pelo assistente IA
        body.destinatario = dadosNfe.destinatario;
        body.itens = dadosNfe.itens;
      } else {
        // Dados do formulário manual
        body.valor_total = valor;
        if (cpfCnpjLimpo) body.destinatario_cpf_cnpj = cpfCnpjLimpo;
        if (destinatarioNome) body.destinatario_nome = destinatarioNome;
        if (destinatarioEmail) body.destinatario_email = destinatarioEmail;

        if (plano === 'nfse') {
          body.descricao_servico = descricaoServico;
        } else {
          body.itens = [{
            nome: descricaoServico || 'Produto',
            quantidade: 1,
            valor_unitario: valor,
            valor_total: valor,
            unidade: 'UN',
          }];
        }
      }

      const { data: result, error } = await supabase.functions.invoke('emitir-nota', { body });

      if (error) throw error;

      if (!result.success) {
        setErro(result.detalhe_rejeicao ?? result.error ?? 'Nota rejeitada pela SEFAZ/prefeitura.');
        setStep('error');
        return;
      }

      setResultado(result);
      setStep('success');
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao emitir nota. Tente novamente.');
      setStep('error');
    }
  }, [
    tipoNota, valorTotal, destinatarioCpfCnpj, destinatarioNome,
    destinatarioEmail, descricaoServico, formaPagamento, enviarEmail,
    companyId, pedidoId, dadosNfe, plano,
  ]);

  // ─── Estilos ───────────────────────────────────────────────────────────────
  const bg        = isDark ? 'bg-slate-900' : 'bg-white';
  const border    = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls  = `w-full px-4 py-2 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`;
  const labelCls  = `block text-xs font-medium mb-1 ${textMuted}`;

  const tipoLabel =
    plano === 'nfse' ? 'NFS-e (Serviço)'
    : tipoNota === 'nfe' ? 'NF-e (Nota Fiscal Eletrônica)'
    : 'NFC-e (Cupom Fiscal)';

  // ─── Render por step ───────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ── Escolha do tipo de nota ──────────────────────────────────────────
      case 'form':
        return (
          <div className="p-6 space-y-5">
            <div>
              <h3 className={`text-base font-semibold mb-1 ${textPrimary}`}>
                Tipo de nota
              </h3>
              <p className={`text-sm ${textMuted}`}>
                Escolha o modelo que deseja emitir
              </p>
            </div>

            <div className="space-y-3">
              {/* NFCe */}
              <button
                type="button"
                onClick={() => setTipoNota('nfce')}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  tipoNota === 'nfce'
                    ? isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                    : isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-bold mb-0.5 ${textPrimary}`}>NFC-e (Cupom Fiscal)</p>
                    <p className={`text-sm ${textMuted}`}>Modelo 65 — Ideal para vendas no balcão</p>
                  </div>
                  {tipoNota === 'nfce' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  )}
                </div>
              </button>

              {/* NF-e */}
              <button
                type="button"
                onClick={() => setTipoNota('nfe')}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  tipoNota === 'nfe'
                    ? isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                    : isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-bold mb-0.5 ${textPrimary}`}>NF-e (Nota Fiscal Eletrônica)</p>
                    <p className={`text-sm ${textMuted}`}>
                      Modelo 55 — Com assistente IA para preencher os dados
                    </p>
                  </div>
                  {tipoNota === 'nfe' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  )}
                </div>
              </button>
            </div>

            {/* Formulário manual — apenas para NFCe / NFS-e */}
            {tipoNota === 'nfce' && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Esquerda */}
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Valor Total (R$) *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={valorTotal}
                        onChange={(e) => setValorTotal(e.target.value)}
                        placeholder="0,00"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>
                        {plano === 'nfse' ? 'Descrição do Serviço *' : 'Descrição do Produto'}
                      </label>
                      <input
                        type="text"
                        value={descricaoServico}
                        onChange={(e) => setDescricaoServico(e.target.value)}
                        placeholder={plano === 'nfse' ? 'Ex: Desenvolvimento de website' : 'Ex: Produto'}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Forma de Pagamento</label>
                      <select
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                        className={inputCls}
                      >
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="debito">Cartão Débito</option>
                        <option value="credito">Cartão Crédito</option>
                        <option value="nfc">NFC / Tap to Pay</option>
                        <option value="tef">TEF / Maquininha</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enviarEmail}
                        onChange={(e) => setEnviarEmail(e.target.checked)}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <span className={`text-sm ${textPrimary}`}>Enviar DANFE por e-mail</span>
                    </label>
                  </div>

                  {/* Direita — Destinatário */}
                  <div className={`p-3 rounded-lg border ${border} space-y-3`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>
                      Destinatário (opcional)
                    </p>
                    <div>
                      <label className={labelCls}>CPF / CNPJ</label>
                      <input
                        type="text"
                        value={destinatarioCpfCnpj}
                        onChange={(e) => setDestinatarioCpfCnpj(e.target.value)}
                        placeholder="000.000.000-00"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Nome</label>
                      <input
                        type="text"
                        value={destinatarioNome}
                        onChange={(e) => setDestinatarioNome(e.target.value)}
                        placeholder="Nome do cliente"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>E-mail</label>
                      <input
                        type="email"
                        value={destinatarioEmail}
                        onChange={(e) => setDestinatarioEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleAvancar}
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      // ── Assistente IA — coleta dados NF-e ────────────────────────────────
      case 'form_nfe':
        return (
          <div className="flex flex-col h-[600px]">
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} flex-1 overflow-hidden`}>
              {/* Chat */}
              <div className={`flex-1 ${!isMobile ? `border-r ${border}` : `border-b ${border}`} overflow-hidden`}>
                <AssistenteFiscalChat
                  companyId={companyId}
                  theme={theme}
                  playText={playText}
                  onDadosAtualizados={handleDadosAtualizados}
                />
              </div>

              {/* Preview — oculto em mobile para economizar espaço */}
              {!isMobile && (
                <div className="w-[380px] overflow-y-auto">
                  <PreviewNotaFiscal dados={dadosNfe} theme={theme} />
                </div>
              )}
            </div>

            {/* Footer fixo */}
            <div className={`px-6 py-4 border-t ${border} flex gap-3 flex-shrink-0 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
              <button
                onClick={() => setStep('form')}
                className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={handleAvancar}
                disabled={statusAssistente !== 'ready'}
                className="flex-1 py-2 px-4 rounded-lg font-semibold transition bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {statusAssistente === 'ready' ? 'Emitir NF-e' : 'Aguardando dados...'}
              </button>
            </div>
          </div>
        );

      // ── Confirmação ───────────────────────────────────────────────────────
      case 'confirming':
        return (
          <div className="p-6 space-y-4">
            <div className={`p-4 rounded-lg border ${border} space-y-2`}>
              <p className={`text-sm font-semibold ${textPrimary}`}>Confirme os dados:</p>
              <div className={`text-sm ${textMuted} space-y-1`}>
                <p><span className="font-medium">Tipo:</span> {tipoLabel}</p>
                {valorTotal && (
                  <p><span className="font-medium">Valor:</span> R$ {parseFloat(valorTotal.replace(',', '.')).toFixed(2)}</p>
                )}
                {dadosNfe && (
                  <>
                    {dadosNfe.destinatario.nome && (
                      <p><span className="font-medium">Destinatário:</span> {dadosNfe.destinatario.nome}</p>
                    )}
                    <p><span className="font-medium">Itens:</span> {dadosNfe.itens.length}</p>
                  </>
                )}
                {descricaoServico && (
                  <p><span className="font-medium">Descrição:</span> {descricaoServico}</p>
                )}
                {destinatarioCpfCnpj && (
                  <p><span className="font-medium">CPF/CNPJ:</span> {destinatarioCpfCnpj}</p>
                )}
                <p><span className="font-medium">Pagamento:</span> {formaPagamento.toUpperCase()}</p>
              </div>
            </div>

            {/* Hint de voz */}
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${
              isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
            }`}>
              <Mic className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
              <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                Diga <strong>"CONFIRMAR"</strong> para emitir ou <strong>"CANCELAR"</strong> para fechar
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(tipoNota === 'nfe' ? 'form_nfe' : 'form')}
                className={`flex-1 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={handleEmitir}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                Confirmar Emissão
              </button>
            </div>
          </div>
        );

      // ── Emitindo ──────────────────────────────────────────────────────────
      case 'emitting':
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            <p className={`text-lg font-semibold ${textPrimary}`}>Transmitindo para a SEFAZ...</p>
            <p className={`text-sm ${textMuted}`}>Aguarde, isso pode levar alguns segundos</p>
          </div>
        );

      // ── Sucesso ───────────────────────────────────────────────────────────
      case 'success':
        return (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>Nota Fiscal Emitida!</p>
              {resultado?.aguardando_processamento && (
                <p className={`text-sm text-center ${textMuted}`}>
                  A prefeitura está processando. O número será gerado em breve.
                </p>
              )}
            </div>

            <div className={`p-4 rounded-lg border ${border} space-y-2 text-sm ${textMuted}`}>
              {resultado?.numero_nfse && (
                <p><span className="font-medium">Número NFS-e:</span> {String(resultado.numero_nfse)}</p>
              )}
              {resultado?.numero && (
                <p><span className="font-medium">Número:</span> {String(resultado.numero)}</p>
              )}
              {resultado?.chave_acesso && (
                <p className="break-all"><span className="font-medium">Chave:</span> {String(resultado.chave_acesso)}</p>
              )}
              {resultado?.cod_verificacao && (
                <p><span className="font-medium">Cód. Verificação:</span> {String(resultado.cod_verificacao)}</p>
              )}
              {resultado?.cod_lote && resultado?.aguardando_processamento && (
                <p><span className="font-medium">Protocolo:</span> {String(resultado.cod_lote)}</p>
              )}
            </div>

            {resultado?.danfe_base64 && (
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `data:application/pdf;base64,${resultado!.danfe_base64}`;
                  link.download = `nota-fiscal-${Date.now()}.pdf`;
                  link.click();
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Baixar DANFE
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
            >
              Concluir
            </button>
          </div>
        );

      // ── Erro ──────────────────────────────────────────────────────────────
      case 'error':
        return (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>Falha na Emissão</p>
            </div>

            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {erro}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('form')}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition"
              >
                Tentar Novamente
              </button>
              <button
                onClick={onClose}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        );
    }
  };

  // ─── Portal — garante renderização acima de qualquer stacking context ──────
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
          ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}
          animate-in slide-in-from-top duration-300`}
        >
          <p className="text-white font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg sm:max-w-5xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300 flex flex-col`}
      >
        {/* Header — oculto apenas no step emitting */}
        {step !== 'emitting' && (
          <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/30' : 'bg-blue-50'} flex items-center justify-between flex-shrink-0`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary}`}>Emitir Nota Fiscal</h2>
                <p className={`text-xs ${textMuted}`}>{company?.name ?? tipoLabel}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition"
              aria-label="Fechar"
            >
              <X className={`w-5 h-5 ${textMuted}`} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="relative overflow-y-auto max-h-[85vh]">
          {renderStep()}
        </div>
      </div>
    </div>,
    document.body,
  );
}
