'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Loader2, AlertCircle, FileText, Download, CheckCircle, Mail, ShieldCheck } from 'lucide-react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import { createClient } from '@/lib/supabase-browser';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';
import { generateConsultaPDF } from '@/lib/generatePDF';
import PIXConfirmationModal from '@/components/assistant/PixConfirmationModal';

interface ConsultarProtestosModalProps {
  data: {
    companyId: string;
    cpfPrefill?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

type Step = 'input' | 'loading' | 'result';

interface ResultadoFormatado {
  label: string;
  value: string;
}

// ── Validações de documento ──────────────────────────────────────────────────
const validateCPF = (cpf: string): boolean => {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf[i - 1]) * (11 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf[i - 1]) * (12 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(cpf[10]);
};

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

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

export default function ConsultarProtestosModal({
  data,
  onClose,
  theme = 'dark',
  playText,
}: ConsultarProtestosModalProps) {
  const { companyId, cpfPrefill = '' } = data;

  const [step, setStep] = useState<Step>('input');
  const [cpf, setCpf] = useState(cpfPrefill);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoFormatado[]>([]);
  const [semProtestos, setSemProtestos] = useState(false);
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

  // ── formatação ───────────────────────────────────────────────

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
      .slice(0, 14);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  // ── consultar ───────────────────────────────────────────────

  const handleConsultar = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');

    if (cleanCpf.length !== 11) {
      setError('CPF inválido. Informe os 11 dígitos.');
      playText('CPF inválido. Por favor, informe um CPF válido.').catch(() => {});
      return;
    }

    if (!validateCPF(cleanCpf)) {
      setError('CPF inválido. Verifique os números digitados.');
      playText('CPF inválido. Verifique os números digitados.').catch(() => {});
      return;
    }

    setStep('loading');
    setError(null);
    setResultado([]);
    setPdfBase64(null);
    setSemProtestos(false);

    try {
      const supabase = createClient();
      const params = pendingParams ?? { company_id: companyId, action: 'consultar_protestos', cpf: cleanCpf };

      const { data: res, error } = await supabase.functions.invoke('ferramentas-consultas', {
        body: params,
      });

      if (error) throw new Error(error.message);

      if (res.requires_payment) {
        setPendingParams({ company_id: companyId, action: 'consultar_protestos', cpf: cleanCpf, payment_confirmed: true });
        setPixAmountBrl(res.amount_brl ?? '10,00');
        setStep('input');

        const pixRes = await supabase.functions.invoke('gerar-pix-assistente', {
          body: {
            company_id: companyId,
            amount_cents: res.amount_cents,
            purpose: 'consulta_fee',
            description: `Consulta Protestos - R$ ${res.amount_brl}`,
          },
        });
        if (pixRes.error) throw new Error(pixRes.error.message);

        setPixData({
          qrCodeUrl: pixRes.data.qr_code_url,
          pixCode: pixRes.data.pix_code,
          transactionId: pixRes.data.transaction_id,
        });
        playText(`Saldo insuficiente. Gerei um PIX de R$ ${res.amount_brl}. Escaneie para pagar e a consulta será liberada.`).catch(() => {});
        return;
      }

      if (!res.success) throw new Error(res.speech_text || res.error || 'Falha na consulta');

      const rows: ResultadoFormatado[] = (res.resultado_formatado ?? []).map(
        (r: any) => Array.isArray(r) ? { label: r[0], value: r[1] } : r
      );

      setSemProtestos(!res.result?.consta_protestos && !res.result?.possui_pendencias);
      setResultado(rows);
      setPdfFileName(`protestos-${cleanCpf}.pdf`);
      setPdfBase64(generateConsultaPDF('Consulta de Protestos', res.resultado_formatado || []));
      setPendingParams(null);
      setPixData(null);
      setStep('result');

      playText(res.speech_text || 'Consulta realizada com sucesso.').catch(() => {});

    } catch (err: any) {
      console.error('Erro ao consultar protestos:', err);
      setError(err.message || 'Erro ao consultar protestos.');
      setStep('input');
      playText('Erro ao consultar protestos. Tente novamente.').catch(() => {});
    }
  };

  // ── download PDF ─────────────────────────────────────────────

  const handleDownloadPdf = () => {
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = pdfFileName || `protestos_${cpf.replace(/\D/g, '')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playText('PDF baixado com sucesso.').catch(() => {});
  };

  // ── enviar por e-mail ────────────────────────────────────────

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
          subject: `Consulta de Protestos — CPF ${cpf}`,
          body: bodyText,
        },
      });
      if (error) throw error;
      playText('E-mail enviado com sucesso.').catch(() => {});
      setTimeout(() => onClose(), 1500);
    } catch {
      playText('Erro ao enviar e-mail.').catch(() => {});
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ── voz ──────────────────────────────────────────────────────

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }

      if (step === 'result') {
        if (['baixar', 'download', 'pdf'].some(c => t.includes(c))) {
          handleDownloadPdf(); return;
        }
        if (googleConnected && ['enviar email', 'mandar email', 'enviar por email'].some(c => t.includes(c))) {
          handleSendByEmail(); return;
        }
      }
    },
  });

  // ── render ───────────────────────────────────────────────────

  const modalMaxWidth = step === 'result' ? 'max-w-lg sm:max-w-3xl' : 'max-w-lg';

  if (pixData && pendingParams) {
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
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-purple-950/40' : 'bg-purple-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Consulta de Protestos</h2>
                <p className={`text-sm ${textMuted}`}>Protestos e pendências em cartório</p>
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
                  CPF do Titular *
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} placeholder-slate-500 focus:ring-2 focus:ring-purple-500 transition`}
                  autoFocus
                />
                <p className={`mt-1 text-xs ${textMuted}`}>
                  Verifique protestos em cartório e pendências tributárias em âmbito nacional
                </p>
              </div>

              <button
                onClick={handleConsultar}
                disabled={!cpf || cpf.replace(/\D/g, '').length !== 11}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                Consultar Protestos
              </button>
            </div>
          )}

          {/* ── STEP: LOADING ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
              <p className={`text-lg font-medium ${textPrimary}`}>Consultando protestos...</p>
              <p className={`text-sm ${textMuted} mt-2`}>Verificando cartórios e pendências nacionais</p>
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === 'result' && (
            <div className="flex flex-col gap-4">

              {/* Banner status */}
              {semProtestos ? (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>Nenhum protesto ou pendência encontrado para este CPF.</span>
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Protestos e/ou pendências encontrados para este CPF.</span>
                </div>
              )}

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
                            <div className="font-semibold text-purple-400 text-sm">{item.value}</div>
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
                        onClick={handleDownloadPdf}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white"
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
