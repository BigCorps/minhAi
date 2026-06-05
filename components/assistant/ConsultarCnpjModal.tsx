'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building, Loader2, AlertCircle, FileText, Download, CheckCircle, Mail } from 'lucide-react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import { createClient } from '@/lib/supabase-browser';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';
import { generateConsultaPDF } from '@/lib/generatePDF';
import PIXConfirmationModal from '@/components/assistant/PixConfirmationModal';

interface ConsultarCnpjModalProps {
  data: {
    companyId: string;
    cnpjPrefill?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Step = 'input' | 'loading' | 'result';

interface ResultadoFormatado {
  label: string;
  value: string;
}

// ── Validação de CNPJ ────────────────────────────────────────────────────────
const validateCNPJ = (cnpj: string): boolean => {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  let len = 12, sum = 0, pos = len - 7;
  for (let i = len; i >= 1; i--) { sum += parseInt(cnpj[len - i]) * pos--; if (pos < 2) pos = 9; }
  let rem = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (rem !== parseInt(cnpj[12])) return false;
  len = 13; sum = 0; pos = len - 7;
  for (let i = len; i >= 1; i--) { sum += parseInt(cnpj[len - i]) * pos--; if (pos < 2) pos = 9; }
  rem = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return rem === parseInt(cnpj[13]);
};

export default function ConsultarCnpjModal({
  data,
  onClose,
  theme = 'dark',
  playText,
}: ConsultarCnpjModalProps) {
  const { companyId, cnpjPrefill } = data;

  const [step, setStep] = useState<Step>('input');
  const [cnpj, setCnpj] = useState(cnpjPrefill || '');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoFormatado[]>([]);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [pixData, setPixData] = useState<{ qrCodeUrl: string; pixCode: string; transactionId: string } | null>(null);
  const [pendingParams, setPendingParams] = useState<Record<string, any> | null>(null);
  const [pixAmountBrl, setPixAmountBrl] = useState<string>('0,00');

  const { isConnected: googleConnected } = useGoogleConnected(companyId);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  // ── helpers ─────────────────────────────────────────────────────────────

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 14) {
      return cleaned
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCNPJ(e.target.value));
  };

  // ── consultar ───────────────────────────────────────────────────────────

  const handleConsultar = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      setError('Por favor, informe um CNPJ válido com 14 dígitos');
      playText?.('Por favor, informe um CNPJ válido com 14 dígitos').catch(() => {});
      return;
    }

    if (!validateCNPJ(cnpjLimpo)) {
      setError('CNPJ inválido. Verifique os números digitados.');
      playText?.('CNPJ inválido. Verifique os números digitados.').catch(() => {});
      return;
    }

    setStep('loading');
    setError(null);

    try {
      const supabase = createClient();
      const params = pendingParams ?? { company_id: companyId, action: 'dados_cnpj', cnpj: cnpjLimpo };

      const { data: res, error } = await supabase.functions.invoke('ferramentas-consultas', {
        body: params,
      });

      if (error) throw new Error(error.message);

      // Saldo insuficiente — abrir fluxo PIX
      if (res.requires_payment) {
        setPendingParams({ company_id: companyId, action: 'dados_cnpj', cnpj: cnpjLimpo, payment_confirmed: true });
        setPixAmountBrl(res.amount_brl ?? '3,00');
        setStep('input');

        const pixRes = await supabase.functions.invoke('gerar-pix-assistente', {
          body: {
            company_id: companyId,
            amount_cents: res.amount_cents,
            purpose: 'consulta_fee',
            description: `Consulta CNPJ - R$ ${res.amount_brl}`,
          },
        });
        if (pixRes.error) throw new Error(pixRes.error.message);

        setPixData({
          qrCodeUrl: pixRes.data.qr_code_url,
          pixCode: pixRes.data.pix_code,
          transactionId: pixRes.data.transaction_id,
        });
        playText?.(`Saldo insuficiente. Gerei um PIX de R$ ${res.amount_brl}. Escaneie para pagar e a consulta será liberada.`).catch(() => {});
        return;
      }

      if (!res.success) throw new Error(res.error ?? 'Falha na consulta');

      const rows: ResultadoFormatado[] = (res.resultado_formatado ?? []).map(
        (r: any) => Array.isArray(r) ? { label: r[0], value: r[1] } : r
      );
      setResultado(rows);
      setPdfFileName(`consulta-cnpj-${cnpjLimpo}.pdf`);
      setPdfBase64(generateConsultaPDF('Dados CNPJ', res.resultado_formatado || []));
      setPendingParams(null);
      setPixData(null);
      setStep('result');

      const razaoSocial = rows.find((r) => r.label === 'Razão Social')?.value;
      playText?.(
        razaoSocial
          ? `Consulta realizada com sucesso. Razão social: ${razaoSocial}`
          : 'Consulta realizada com sucesso.'
      ).catch(() => {});

    } catch (err: any) {
      console.error('Erro ao consultar CNPJ:', err);
      setError(err.message || 'Erro ao consultar CNPJ. Tente novamente.');
      setStep('input');
      playText?.('Erro ao consultar CNPJ. Tente novamente.').catch(() => {});
    }
  };

  // ── download PDF ─────────────────────────────────────────────────────────

  const handleDownloadPDF = () => {
    if (!pdfBase64) return;
    try {
      const a = document.createElement('a');
      a.href = pdfBase64;
      a.download = pdfFileName || `consulta_${Date.now()}.pdf`;
      a.click();
      playText?.('PDF baixado.').catch(() => {});
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      playText?.('Erro ao gerar PDF.').catch(() => {});
    }
  };

  // ── enviar por e-mail ────────────────────────────────────────────────────

  const handleSendByEmail = async () => {
    if (!resultado.length) return;
    setIsSendingEmail(true);
    try {
      const supabase = createClient();
      const bodyText = resultado
        .map(r => (r.label === '---' ? `\n${r.value}` : `${r.label}: ${r.value}`))
        .join('\n');

      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: {
          company_id: companyId,
          subject: `Resultado: Consulta CNPJ ${cnpj}`,
          body: bodyText,
        },
      });
      if (error) throw error;
      playText?.('E-mail enviado com sucesso.').catch(() => {});
      setTimeout(() => onClose(), 1500);
    } catch {
      playText?.('Erro ao enviar e-mail.').catch(() => {});
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ── voz ──────────────────────────────────────────────────────────────────

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = transcript.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?;:\-]+/g, '');

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }

      if (step === 'result') {
        if (['baixar', 'download', 'pdf'].some(c => t.includes(c))) {
          handleDownloadPDF(); return;
        }
        if (googleConnected && ['enviar email', 'mandar email', 'enviar por email'].some(c => t.includes(c))) {
          handleSendByEmail(); return;
        }
      }
    },
  });

  // ── render ───────────────────────────────────────────────────────────────

  const modalMaxWidth = step === 'result' ? 'max-w-2xl sm:max-w-4xl' : 'max-w-2xl';

  if (pixData) {
    return (
      <PIXConfirmationModal
        transactionId={pixData.transactionId}
        amount={pixAmountBrl}
        qrCodeUrl={pixData.qrCodeUrl}
        pixCode={pixData.pixCode}
        theme={theme}
        onConfirm={async () => {
          setPixData(null);
          setStep('loading');
          await handleConsultar();
        }}
        onCancel={async () => {
          setPixData(null);
          setPendingParams(null);
        }}
      />
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`relative w-full ${modalMaxWidth} rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col`}>

        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-yellow-950/40' : 'bg-yellow-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Dados CNPJ</h2>
                <p className={`text-sm ${textMuted}`}>Consulta de dados cadastrais</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">

          {error && (
            <div className={`mb-4 p-3 rounded-lg border flex items-start gap-2 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>{error}</p>
            </div>
          )}

          {/* ── STEP: INPUT ── */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  CNPJ *
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} placeholder-slate-500 focus:ring-2 focus:ring-yellow-500 transition`}
                  autoFocus
                />
                <p className={`mt-1 text-xs ${textMuted}`}>
                  Digite apenas os números ou no formato 00.000.000/0000-00
                </p>
              </div>

              <button
                onClick={handleConsultar}
                disabled={!cnpj || cnpj.replace(/\D/g, '').length !== 14}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <Building className="w-5 h-5" />
                Consultar CNPJ
              </button>
            </div>
          )}

          {/* ── STEP: LOADING ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
              <p className={`text-lg font-medium ${textPrimary}`}>Consultando CNPJ...</p>
              <p className={`text-sm ${textMuted} mt-2`}>Aguarde enquanto buscamos os dados</p>
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === 'result' && (
            <div className="flex flex-col gap-4">

              {/* Banner sucesso */}
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                <span className={`font-semibold ${textPrimary}`}>Consulta realizada com sucesso</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">

                <div className="flex flex-col gap-3 flex-1 min-w-0">

                  {/* Tabela de resultados */}
                  <div className={`border ${border} rounded-xl overflow-hidden`}>
                    <div className="max-h-[360px] overflow-y-auto">
                      {resultado.map((item, index) => (
                        <div
                          key={index}
                          className={`px-4 py-3 border-b ${border} last:border-b-0 ${
                            index % 2 === 0
                              ? isDark ? 'bg-slate-800/50' : 'bg-gray-50'
                              : isDark ? 'bg-slate-900' : 'bg-white'
                          }`}
                        >
                          {item.label === '---' ? (
                            <div className={`font-semibold ${textPrimary} text-sm`}>{item.value}</div>
                          ) : (
                            <div className="grid grid-cols-3 gap-4">
                              <div className={`text-sm font-medium ${textMuted}`}>{item.label}</div>
                              <div className={`col-span-2 text-sm ${textPrimary}`}>{item.value}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-2">
                    {pdfBase64 && (
                      <button
                        onClick={handleDownloadPDF}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-yellow-500 hover:bg-yellow-600 text-white"
                      >
                        <Download className="w-4 h-4" />
                        Baixar PDF
                      </button>
                    )}

                    {googleConnected && (
                      <button
                        onClick={handleSendByEmail}
                        disabled={isSendingEmail}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        {isSendingEmail
                          ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                          : <><Mail className="w-4 h-4" />Enviar por e-mail</>
                        }
                      </button>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  >
                    Fechar
                  </button>
                </div>

                {/* QR desktop */}
                {pdfBase64 && (
                  <div className="hidden sm:flex flex-col shrink-0 w-56">
                    <ResultDownloadQR
                      companyId={companyId}
                      fileName={pdfFileName}
                      fileType="application/pdf"
                      fileBase64={pdfBase64}
                      isDark={isDark}
                      enabled={step === 'result' && !!pdfBase64}
                    />
                  </div>
                )}
              </div>

              {/* QR mobile */}
              {pdfBase64 && (
                <div className="sm:hidden">
                  <ResultDownloadQR
                    companyId={companyId}
                    fileName={pdfFileName}
                    fileType="application/pdf"
                    fileBase64={pdfBase64}
                    isDark={isDark}
                    enabled={step === 'result' && !!pdfBase64}
                  />
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
