'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, RefreshCw, Download, Mail, Loader2, Mic, AlertTriangle, ShieldAlert, CheckCircle2, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';
import { generateConsultaPDF } from '@/lib/generatePDF';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

type Stage = 'input' | 'processing' | 'result' | 'error';

const OPENING_TEXT = 'Consulta de restrições de CNPJ. Digite o CNPJ para verificar pendências.';
const AUTO_CLOSE = 60;

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:\-]+/g, '');

function VoiceHint({ commands, isDark }: { commands: string[]; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
      <Mic className="w-3.5 h-3.5 shrink-0" />
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {commands.map(cmd => (
          <span key={cmd} className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${isDark ? 'bg-slate-600 text-blue-300' : 'bg-gray-200 text-blue-700'}`}>
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RestricoesCNPJDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [cnpj, setCnpj] = useState<string>('');
  const [resultData, setResultData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [speechText, setSpeechText] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const { isConnected: googleConnected } = useGoogleConnected(data.companyId);
  const supabase = createClient();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, onClose]);

  const formatCnpj = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const handleConsultar = useCallback(async () => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setErrorMsg('CNPJ deve ter 14 dígitos.');
      playText('CNPJ inválido. Digite 14 dígitos.').catch(() => {});
      return;
    }

    setStage('processing');
    setErrorMsg(null);

    try {
      const { data: res, error } = await supabase.functions.invoke('ferramentas-consultas', {
        body: { company_id: data.companyId, action: 'restricoes_cnpj', cnpj }
      });

      if (error) throw new Error(error.message);
      if (!res.success) throw new Error(res.error ?? 'Falha na consulta');

      setResultData(res.result);
      setSpeechText(res.speech_text);

      // ✅ Usar PDF da API (Quod) se disponível, senão gerar localmente
      const name = `restricoes_cnpj_${cleanCnpj}_${Date.now()}.pdf`;
      setFileName(name);

      const pdfUrl = res.result?.pdf_url;
      if (pdfUrl) {
        try {
          const pdfRes = await fetch(pdfUrl);
          const arrayBuffer = await pdfRes.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          setFileBase64(`data:application/pdf;base64,${base64}`);
        } catch {
          // fallback para PDF gerado localmente
          setFileBase64(generateConsultaPDF('Restrições CNPJ', res.resultado_formatado));
        }
      } else {
        setFileBase64(generateConsultaPDF('Restrições CNPJ', res.resultado_formatado));
      }

      setStage('result');
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao consultar restrições.');
      setStage('error');
    }
  }, [cnpj, data.companyId, supabase, playText]);

  const handleCopy = useCallback(async () => {
    if (!resultData) return;
    const restrictionsList = resultData.restricoes?.map((r: any) => `${r.tipo}: ${r.descricao}`).join('\n') || 'Nenhuma';
    const text = `CNPJ: ${resultData.cnpj}\nRazão Social: ${resultData.razao_social}\nStatus: ${resultData.status}\n\nRestrições:\n${restrictionsList}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    playText('Dados copiados.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [resultData, playText]);

  const handleDownloadPdf = useCallback(() => {
    if (!fileBase64) return;
    const a = document.createElement('a');
    a.href = fileBase64; // data URI direto (data:application/pdf;base64,...)
    a.download = fileName || `restricoes_cnpj_${Date.now()}.pdf`;
    a.click();
    playText('PDF de restrições baixado.').catch(() => {});
  }, [fileBase64, fileName, playText]);

  const handleReset = useCallback(() => {
    setStage('input');
    setCnpj('');
    setResultData(null);
    setErrorMsg(null);
    setCopied(false);
    setSpeechText('');
    setFileBase64('');
    setFileName('');
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!resultData) return;
    setIsSendingEmail(true);
    try {
      const restrictionsList = resultData.restricoes?.map((r: any) => `${r.tipo}: ${r.descricao} (${r.data})`).join('\n') || 'Nenhuma restrição encontrada';
      const emailBody = `Consulta de Restrições CNPJ: ${resultData.cnpj}\n\nRazão Social: ${resultData.razao_social}\nStatus: ${resultData.status}\n\nRestrições:\n${restrictionsList}\n\nTotal: ${resultData.total_restricoes} pendência(s)`;
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: `Restrições CNPJ: ${resultData.razao_social}`, body: emailBody },
      });
      if (error) throw error;
      playText('Consulta enviada por email.').catch(() => {});
      setTimeout(() => onClose(), 1500);
    } catch {
      playText('Erro ao enviar email.').catch(() => {});
    } finally {
      setIsSendingEmail(false);
    }
  };

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(c => t.includes(c))) {
        playText(stage === 'result' && speechText ? speechText : OPENING_TEXT).catch(() => {});
        return;
      }

      if (stage === 'input') {
        const numbers = t.replace(/\D/g, '');
        if (numbers.length === 14) {
          setCnpj(formatCnpj(numbers));
          playText(`CNPJ ${formatCnpj(numbers)} digitado.`).catch(() => {});
          return;
        }

        if (['consultar', 'buscar', 'pesquisar', 'verificar'].some(c => t.includes(c))) {
          handleConsultar();
          return;
        }
      }

      if (stage === 'result' && resultData) {
        if (['copiar', 'copia', 'copie'].some(c => t.includes(c))) {
          handleCopy(); return;
        }
        if (['baixar', 'download', 'salvar', 'pdf'].some(c => t.includes(c))) {
          handleDownloadPdf(); return;
        }
        if (['nova', 'nova consulta', 'novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
        if (googleConnected && ['enviar email', 'mandar email', 'enviar por email'].some(c => t.includes(c))) {
          handleSendByEmail(); return;
        }
      }

      if (stage === 'error') {
        if (['tentar', 'novamente', 'tentar novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
      }
    }
  });

  const modalMaxWidth = stage === 'result' ? 'max-w-lg sm:max-w-3xl' : 'max-w-lg';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full ${modalMaxWidth} rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Restrições CNPJ</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Input ── */}
        {stage === 'input' && (
          <div className="flex flex-col gap-4">
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Digite o CNPJ para consultar restrições e pendências:
            </p>

            <div className="relative">
              <ShieldAlert className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm ${isDark ? 'bg-slate-900 text-white placeholder-slate-500 border border-slate-700' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200'}`}
                onKeyDown={(e) => e.key === 'Enter' && handleConsultar()}
              />
            </div>

            {errorMsg && (
              <div className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleConsultar}
              disabled={cnpj.replace(/\D/g, '').length !== 14}
              className="w-full py-3 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Consultar Restrições
            </button>

            <VoiceHint commands={['"12345678000190"', '"consultar"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Processing ── */}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Consultando restrições...</p>
          </div>
        )}

        {/* ── Result ── */}
        {stage === 'result' && resultData && (
          <div className="flex flex-col gap-4">
            {/* Banner de status */}
            {resultData.total_restricoes === 0 ? (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Nenhuma restrição encontrada</span>
              </div>
            ) : (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{resultData.total_restricoes} restrição(ões) encontrada(s)</span>
              </div>
            )}

            {/* Layout responsivo */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Coluna esquerda */}
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                {/* Card de informações */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                  {/* Cabeçalho empresa */}
                  <div className="flex items-start gap-3 mb-4 pb-4 border-b border-slate-700">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                      <Building2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {resultData.razao_social}
                      </h3>
                      <p className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        CNPJ: {resultData.cnpj}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        resultData.status === 'LIMPO' 
                          ? isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'
                          : isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700'
                      }`}>
                        {resultData.status}
                      </span>
                    </div>
                  </div>

                  {/* Lista de restrições */}
                  {resultData.restricoes && resultData.restricoes.length > 0 ? (
                    <div className="space-y-2">
                      <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Restrições Encontradas:
                      </p>
                      {resultData.restricoes.map((restricao: any, idx: number) => (
                        <div key={idx} className={`p-3 rounded-lg ${isDark ? 'bg-slate-800 border border-red-900/30' : 'bg-white border border-red-100'}`}>
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {restricao.tipo}
                              </p>
                              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                                {restricao.descricao}
                              </p>
                              {restricao.valor && (
                                <p className={`text-xs mt-1 font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                  Valor: {restricao.valor}
                                </p>
                              )}
                              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                Data: {restricao.data}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                      <CheckCircle2 className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                      <p className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                        Nenhuma restrição encontrada
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        CNPJ sem pendências
                      </p>
                    </div>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                  >
                    <Download className="w-4 h-4" />Baixar PDF
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <RefreshCw className="w-4 h-4" />Nova consulta
                  </button>

                  {googleConnected && (
                    <button
                      onClick={handleSendByEmail}
                      disabled={isSendingEmail}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSendingEmail
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                        : <><Mail className="w-4 h-4" />Enviar por email</>
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* Coluna direita — QR desktop */}
              <div className="hidden sm:flex flex-col shrink-0 w-56">
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={fileName}
                  fileType="application/pdf"
                  fileBase64={fileBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!fileBase64}
                />
              </div>

              {/* QR mobile */}
              <div className="sm:hidden">
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={fileName}
                  fileType="application/pdf"
                  fileBase64={fileBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!fileBase64}
                />
              </div>
            </div>

            {/* Voice hint */}
            <VoiceHint
              commands={['"copiar"', '"baixar pdf"', '"nova consulta"', ...(googleConnected ? ['"enviar email"'] : []), '"fechar"']}
              isDark={isDark}
            />
          </div>
        )}

        {/* ── Error ── */}
        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className={`px-3 py-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
              {errorMsg}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
            <VoiceHint commands={['"tentar novamente"', '"fechar"']} isDark={isDark} />
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
