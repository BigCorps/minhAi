'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import {
  Receipt,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  Loader2,
  X,
  ArrowLeft,
  Mic,
} from 'lucide-react';

interface EmitirNotaModalProps {
  data: {
    companyId: string;
    nfe_plano?: string | null;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

type Step = 'form' | 'confirming' | 'emitting' | 'success' | 'error';

export default function EmitirNotaModal({
  data,
  onClose,
  theme = 'dark',
}: EmitirNotaModalProps) {
  const { companyId, nfe_plano } = data;
  const supabase = createClient();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  const [step, setStep] = useState<Step>('form');
  const [plano, setPlano] = useState<string>(nfe_plano ?? '');
  const [modeloNota, setModeloNota] = useState<'nfce' | 'nfe'>('nfce');
  const [destinatarioCpfCnpj, setDestinatarioCpfCnpj] = useState('');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [descricaoServico, setDescricaoServico] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [enviarEmail, setEnviarEmail] = useState(false);
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'warning') => {
    setToast({ message, type });
  };

  useModalVoiceCommand({
    active: step === 'confirming',
    onTranscript: (transcript) => {
      const t = transcript.toLowerCase();
      if (['confirmar', 'confirma', 'emitir', 'sim', 'pode emitir'].some(x => t.includes(x))) {
        handleEmitir();
      } else if (['cancelar', 'cancela', 'fechar', 'não'].some(x => t.includes(x))) {
        onCloseRef.current();
      }
    },
  });

  const handleConfirmar = () => {
    if (!valorTotal || isNaN(parseFloat(valorTotal.replace(',', '.')))) {
      showToast('Informe um valor válido', 'warning');
      return;
    }
    if (plano === 'nfse' && !descricaoServico.trim()) {
      showToast('Informe a descrição do serviço', 'warning');
      return;
    }
    setStep('confirming');
  };

  const handleEmitir = async () => {
    setStep('emitting');
    try {
      const valor = parseFloat(valorTotal.replace(',', '.'));
      const cpfCnpjLimpo = destinatarioCpfCnpj.replace(/\D/g, '');

      const body: Record<string, unknown> = {
        company_id: companyId,
        valor_total: valor,
        forma_pagamento: formaPagamento,
        enviar_email: enviarEmail,
      };

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
          modelo_forcado: modeloNota,
        }];
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
  };

  // ─── Estilos ───────────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = `w-full px-4 py-2 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`;
  const labelCls = `block text-xs font-medium mb-1 ${textMuted}`;

  const tipoLabel = plano === 'nfse' ? 'NFS-e (Serviço)' : plano === 'nfe' ? 'NF-e / NFC-e (Produto)' : 'Nota Fiscal';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
          ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}
          animate-in slide-in-from-top duration-300`}>
          <p className="text-white font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Modal */}
      <div
        role="dialog"
        className={`relative w-full max-w-lg sm:max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/30' : 'bg-blue-50'} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>Emitir Nota Fiscal</h2>
              <p className={`text-xs ${textMuted}`}>{tipoLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">

          {/* ─── FORM ─── */}
          {step === 'form' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Coluna esquerda */}
                <div className="space-y-4">
                  {/* Valor */}
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

                  {/* Seletor de modelo — apenas para NF-e/NFC-e */}
                  {plano === 'nfe' && (
                    <div>
                      <label className={labelCls}>Tipo de Nota *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setModeloNota('nfce')}
                          className={`py-2 px-3 rounded-lg border text-sm font-medium transition text-left ${
                            modeloNota === 'nfce'
                              ? 'bg-lime-500 border-lime-500 text-white'
                              : isDark
                                ? 'border-slate-600 text-gray-300 hover:border-lime-500'
                                : 'border-gray-300 text-gray-600 hover:border-lime-500'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 flex-shrink-0" />
                            NFC-e
                          </span>
                          <span className="block text-xs font-normal opacity-75 mt-0.5">Cupom fiscal / consumidor</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setModeloNota('nfe')}
                          className={`py-2 px-3 rounded-lg border text-sm font-medium transition text-left ${
                            modeloNota === 'nfe'
                              ? 'bg-lime-500 border-lime-500 text-white'
                              : isDark
                                ? 'border-slate-600 text-gray-300 hover:border-lime-500'
                                : 'border-gray-300 text-gray-600 hover:border-lime-500'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            NF-e
                          </span>
                          <span className="block text-xs font-normal opacity-75 mt-0.5">Nota completa / empresas</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Descrição */}
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

                  {/* Forma de pagamento */}
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

                  {/* Enviar email */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enviarEmail}
                      onChange={(e) => setEnviarEmail(e.target.checked)}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className={`text-sm ${textPrimary}`}>Enviar DANFE por email</span>
                  </label>
                </div>

                {/* Coluna direita — Destinatário */}
                <div>
                  <div className={`h-full p-3 rounded-lg border ${border} space-y-3`}>
                    <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wide`}>
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
                      <label className={labelCls}>Email</label>
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

              {/* Botão — largura total, fora do grid */}
              <button
                onClick={handleConfirmar}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition"
              >
                Revisar e Emitir
              </button>
            </div>
          )}

          {/* ─── CONFIRMING ─── */}
          {step === 'confirming' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${border} space-y-2`}>
                <p className={`text-sm font-semibold ${textPrimary}`}>Confirme os dados:</p>
                <div className={`text-sm ${textMuted} space-y-1`}>
                  <p><span className="font-medium">Tipo:</span> {tipoLabel}{plano === 'nfe' && ` — ${modeloNota.toUpperCase()}`}</p>
                  <p><span className="font-medium">Valor:</span> R$ {parseFloat(valorTotal.replace(',', '.')).toFixed(2)}</p>
                  {descricaoServico && <p><span className="font-medium">Descrição:</span> {descricaoServico}</p>}
                  {destinatarioCpfCnpj && <p><span className="font-medium">Destinatário:</span> {destinatarioCpfCnpj}</p>}
                  {destinatarioNome && <p><span className="font-medium">Nome:</span> {destinatarioNome}</p>}
                  <p><span className="font-medium">Pagamento:</span> {formaPagamento.toUpperCase()}</p>
                </div>
              </div>

              <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border flex items-center gap-2`}>
                <Mic className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                  Diga <strong>"CONFIRMAR"</strong> para emitir ou <strong>"CANCELAR"</strong> para fechar
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  className={`flex-1 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
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
          )}

          {/* ─── EMITTING ─── */}
          {step === 'emitting' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
              <p className={`text-lg font-semibold ${textPrimary}`}>Transmitindo para a SEFAZ...</p>
              <p className={`text-sm ${textMuted}`}>Aguarde, isso pode levar alguns segundos</p>
            </div>
          )}

          {/* ─── SUCCESS ─── */}
          {step === 'success' && resultado && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <p className={`text-xl font-bold ${textPrimary}`}>Nota Fiscal Emitida!</p>
                {resultado.aguardando_processamento && (
                  <p className={`text-sm ${textMuted} text-center`}>
                    A prefeitura está processando. O número da nota será gerado em breve.
                  </p>
                )}
              </div>

              <div className={`p-4 rounded-lg border ${border} space-y-2 text-sm ${textMuted}`}>
                {resultado.numero_nfse && (
                  <p><span className="font-medium">Número NFS-e:</span> {String(resultado.numero_nfse)}</p>
                )}
                {resultado.numero && (
                  <p><span className="font-medium">Número:</span> {String(resultado.numero)}</p>
                )}
                {resultado.chave_acesso && (
                  <p className="break-all"><span className="font-medium">Chave:</span> {String(resultado.chave_acesso)}</p>
                )}
                {resultado.cod_verificacao && (
                  <p><span className="font-medium">Cód. Verificação:</span> {String(resultado.cod_verificacao)}</p>
                )}
                {resultado.cod_lote && resultado.aguardando_processamento && (
                  <p><span className="font-medium">Protocolo:</span> {String(resultado.cod_lote)}</p>
                )}
              </div>

              {resultado.danfe_base64 && (
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `data:application/pdf;base64,${resultado.danfe_base64}`;
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
          )}

          {/* ─── ERROR ─── */}
          {step === 'error' && (
            <div className="space-y-4">
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
                  className={`flex-1 py-3 rounded-lg font-medium transition ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
