'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Car, Loader2, AlertCircle, FileText, Download, CheckCircle, Mail, ShieldCheck } from 'lucide-react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import { createClient } from '@/lib/supabase-browser';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';
import { generateConsultaPDF } from '@/lib/generatePDF';

interface ConsultarLeilaoModalProps {
  data: {
    companyId: string;
    placaPrefill?: string;
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

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

export default function ConsultarLeilaoModal({
  data,
  onClose,
  theme = 'dark',
  playText,
}: ConsultarLeilaoModalProps) {
  const { companyId, placaPrefill = '' } = data;

  const [step, setStep] = useState<Step>('input');
  const [placa, setPlaca] = useState(placaPrefill);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoFormatado[]>([]);
  const [semHistorico, setSemHistorico] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const { isConnected: googleConnected } = useGoogleConnected(companyId);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  // ── formatação / validação ───────────────────────────────────────────────

  const formatarPlaca = (valor: string) => {
    const limpo = valor.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7);
    if (limpo.length <= 3) return limpo;
    return `${limpo.slice(0, 3)}-${limpo.slice(3, 7)}`;
  };

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaca(formatarPlaca(e.target.value));
  };

  const validarPlaca = (placaStr: string): boolean => {
    const p = placaStr.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (p.length !== 7) return false;
    return /^[A-Z]{3}\d{4}$/.test(p) || /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(p);
  };

  // ── consultar ───────────────────────────────────────────────────────────

  const handleConsultar = async () => {
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    if (!validarPlaca(placaLimpa)) {
      setError('Placa inválida. Formato: ABC1234 ou ABC1D23.');
      playText('Placa inválida. Por favor, informe uma placa válida.').catch(() => {});
      return;
    }

    setStep('loading');
    setError(null);
    setResultado([]);
    setPdfBase64(null);
    setSemHistorico(false);

    try {
      const supabase = createClient();

      const { data: res, error } = await supabase.functions.invoke('ferramentas-consultas', {
        body: { company_id: companyId, action: 'consultar_leilao', placa: placaLimpa },
      });

      if (error) throw new Error(error.message);
      if (!res.success) throw new Error(res.speech_text || res.error || 'Falha na consulta');

      const rows: ResultadoFormatado[] = (res.resultado_formatado ?? []).map(
        (r: any) => Array.isArray(r) ? { label: r[0], value: r[1] } : r
      );

      setSemHistorico(!res.result?.em_leilao);
      setResultado(rows);
      setPdfFileName(`consulta-leilao-${placaLimpa}.pdf`);
      setPdfBase64(generateConsultaPDF('Consultar Leilão', res.resultado_formatado || []));
      setStep('result');

      playText(res.speech_text || (rows.length > 0
        ? 'Consulta realizada. Histórico de leilão encontrado.'
        : 'Consulta realizada. Nenhum leilão encontrado para este veículo.'
      )).catch(() => {});

    } catch (err: any) {
      console.error('Erro ao consultar leilão:', err);
      setError(err.message || 'Erro ao consultar leilão.');
      setStep('input');
      playText('Erro ao consultar leilão. Tente novamente.').catch(() => {});
    }
  };

  // ── download PDF ─────────────────────────────────────────────────────────

  const handleDownloadPdf = () => {
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = pdfFileName || `consulta_leilao_${placa.replace(/[^A-Z0-9]/gi, '')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playText('PDF baixado com sucesso.').catch(() => {});
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
          subject: `Resultado: Consulta Leilão ${placa}`,
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

  // ── voz ──────────────────────────────────────────────────────────────────

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }

      if (step === 'input') {
        const match = transcript.replace(/\s/g, '').match(/[A-Z]{3}\d[A-Z0-9]\d{2}|[A-Z]{3}\d{4}/i);
        if (match) {
          setPlaca(formatarPlaca(match[0]));
          return;
        }
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

  // ── render ───────────────────────────────────────────────────────────────

  const modalMaxWidth = step === 'result' ? 'max-w-lg sm:max-w-3xl' : 'max-w-lg';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`relative w-full ${modalMaxWidth} rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col`}>

        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-orange-950/40' : 'bg-orange-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Consultar Leilão</h2>
                <p className={`text-sm ${textMuted}`}>Histórico de leilão do veículo</p>
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
                  Placa do Veículo *
                </label>
                <input
                  type="text"
                  value={placa}
                  onChange={handlePlacaChange}
                  placeholder="ABC-1234 ou ABC-1D23"
                  maxLength={8}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${isDark ? 'bg-slate-800' : 'bg-white'} ${textPrimary} placeholder-slate-500 focus:ring-2 focus:ring-orange-500 transition uppercase`}
                  autoFocus
                />
                <p className={`mt-1 text-xs ${textMuted}`}>
                  Formatos aceitos: ABC1234 (antigo) ou ABC1D23 (Mercosul)
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${border} ${isDark ? 'bg-blue-950/20' : 'bg-blue-50'}`}>
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Custo da consulta</p>
                    <p className={`text-xs ${textMuted} mt-1`}>
                      2 créditos + R$ 25,00 do saldo serão consumidos ao realizar esta consulta
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConsultar}
                disabled={!placa || placa.replace(/[^A-Z0-9]/gi, '').length < 7}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <Car className="w-5 h-5" />
                Consultar Leilão
              </button>
            </div>
          )}

          {/* ── STEP: LOADING ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
              <p className={`text-lg font-medium ${textPrimary}`}>Consultando leilão...</p>
              <p className={`text-sm ${textMuted} mt-2`}>Aguarde enquanto buscamos os dados</p>
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === 'result' && (
            <div className="flex flex-col gap-4">

              {/* Banner sucesso ou sem histórico */}
              {semHistorico ? (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>Nenhum registro de leilão encontrado para este veículo.</span>
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-orange-900/30 border border-orange-700 text-orange-300' : 'bg-orange-50 border border-orange-200 text-orange-700'}`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Histórico de leilão encontrado para este veículo.</span>
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
                            <div className="font-semibold text-orange-400 text-sm">{item.value}</div>
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
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white"
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
