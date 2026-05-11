'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

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

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'warning') => {
    setToast({ message, type });
  };

  // Voz na etapa de confirmação
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
        // NFC-e/NF-e — item único simplificado
        body.itens = [{
          nome: descricaoServico || 'Produto',
          quantidade: 1,
          valor_unitario: valor,
          valor_total: valor,
          unidade: 'UN',
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
  const inputCls = `w-full px-4 py-2 rounded-lg border ${border} ${bg} ${textPrimary} focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm`;
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

      <div
        role="dialog"
        className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-orange-950/30' : 'bg-orange-50'} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-xl">
              🧾
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>Emitir Nota Fiscal</h2>
              <p className={`text-xs ${textMuted}`}>{tipoLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            {/* X icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">

          {/* ─── FORM ─── */}
          {step === 'form' && (
            <>
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

              {/* Destinatário */}
              <div className={`p-3 rounded-lg border ${border} space-y-2`}>
                <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wide`}>
                  Destinatário (opcional)
                </p>
                <div>
                  <label className={labelCls}>CPF / CNPJ</label>
                  <input
                    type="text"
                    value={destinatarioCpfCnpj}
                    onChange={(e) => setDestinatarioCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
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
                  className="w-4 h-4 accent-orange-500"
                />
                <span className={`text-sm ${textPrimary}`}>Enviar DANFE por email ao destinatário</span>
              </label>

              <button
                onClick={handleConfirmar}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
              >
                Revisar e Emitir
              </button>
            </>
          )}

          {/* ─── CONFIRMING ─── */}
          {step === 'confirming' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${border} space-y-2`}>
                <p className={`text-sm font-semibold ${textPrimary}`}>Confirme os dados:</p>
                <div className={`text-sm ${textMuted} space-y-1`}>
                  <p><span className="font-medium">Tipo:</span> {tipoLabel}</p>
                  <p><span className="font-medium">Valor:</span> R$ {parseFloat(valorTotal.replace(',', '.')).toFixed(2)}</p>
                  {descricaoServico && <p><span className="font-medium">Descrição:</span> {descricaoServico}</p>}
                  {destinatarioCpfCnpj && <p><span className="font-medium">Destinatário:</span> {destinatarioCpfCnpj}</p>}
                  {destinatarioNome && <p><span className="font-medium">Nome:</span> {destinatarioNome}</p>}
                  <p><span className="font-medium">Pagamento:</span> {formaPagamento.toUpperCase()}</p>
                </div>
              </div>

              <div className={`p-3 rounded-lg ${isDark ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'} border text-center`}>
                <p className={`text-sm ${isDark ? 'text-orange-200' : 'text-orange-800'}`}>
                  Diga <strong>"CONFIRMAR"</strong> para emitir ou <strong>"CANCELAR"</strong> para fechar
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                >
                  Voltar
                </button>
                <button
                  onClick={handleEmitir}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
                >
                  Confirmar Emissão
                </button>
              </div>
            </div>
          )}

          {/* ─── EMITTING ─── */}
          {step === 'emitting' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-lg font-semibold ${textPrimary}`}>Transmitindo para a SEFAZ...</p>
              <p className={`text-sm ${textMuted}`}>Aguarde, isso pode levar alguns segundos</p>
            </div>
          )}

          {/* ─── SUCCESS ─── */}
          {step === 'success' && resultado && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
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
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
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
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className={`text-xl font-bold ${textPrimary}`}>Falha na Emissão</p>
              </div>

              <div className={`p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400`}>
                {erro}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
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
