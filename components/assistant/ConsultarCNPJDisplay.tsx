'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, RefreshCw, Download, Mail, Loader2, Mic, Building2, Calendar, MapPin, Phone, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

type Stage = 'input' | 'processing' | 'result' | 'error';

const OPENING_TEXT = 'Consulta de CNPJ. Digite o CNPJ da empresa ou diga o CNPJ em voz alta.';
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

export default function ConsultarCNPJDisplay({ data, onClose, theme = 'dark', playText }: Props) {
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
  playText(OPENING_TEXT).catch(() => {});
}, []);

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
      const { data: res, error } = await supabase.functions.invoke('consultar-cnpj', {
        body: { company_id: data.companyId, cnpj: cleanCnpj },
      });

      if (error) throw new Error(error.message);
      if (!res.success) throw new Error(res.error ?? 'Falha na consulta');

      setResultData(res.result);
      setSpeechText(res.speech_text);

      // Gerar PDF via jsPDF
      const pdfContent = generatePdfContent(res.result);
      const name = `cnpj_${cleanCnpj}_${Date.now()}.pdf`;
      setFileName(name);
      setFileBase64(pdfContent);

      setStage('result');
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao consultar CNPJ.');
      setStage('error');
    }
  }, [cnpj, data.companyId, supabase, playText]);

  const generatePdfContent = (result: any): string => {
    // Mock - em produção usar jsPDF
    const text = `CONSULTA CNPJ\n\nCNPJ: ${result.cnpj}\nRazão Social: ${result.razao_social}\nNome Fantasia: ${result.nome_fantasia}\nSituação: ${result.situacao}\nAbertura: ${result.abertura}\nCapital Social: ${result.capital_social}\nEndereço: ${result.logradouro}, ${result.numero}\nBairro: ${result.bairro}\nCidade: ${result.municipio} - ${result.uf}\nCEP: ${result.cep}\nTelefone: ${result.telefone}\nEmail: ${result.email}`;
    return btoa(unescape(encodeURIComponent(text)));
  };

  const handleCopy = useCallback(async () => {
    if (!resultData) return;
    const text = `CNPJ: ${resultData.cnpj}\nRazão Social: ${resultData.razao_social}\nNome Fantasia: ${resultData.nome_fantasia}\nSituação: ${resultData.situacao}\nEndereço: ${resultData.logradouro}, ${resultData.numero} - ${resultData.bairro}\n${resultData.municipio} - ${resultData.uf} - ${resultData.cep}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    playText('Dados copiados.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [resultData, playText]);

  const handleDownloadPdf = useCallback(() => {
    if (!fileBase64) return;
    const blob = new Blob([Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `cnpj_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    playText('PDF de CNPJ baixado.').catch(() => {});
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
      const emailBody = `Consulta CNPJ: ${resultData.cnpj}\n\nRazão Social: ${resultData.razao_social}\nNome Fantasia: ${resultData.nome_fantasia}\nSituação: ${resultData.situacao}\nAbertura: ${resultData.abertura}\nCapital Social: ${resultData.capital_social}\n\nEndereço:\n${resultData.logradouro}, ${resultData.numero}\n${resultData.bairro}\n${resultData.municipio} - ${resultData.uf}\nCEP: ${resultData.cep}\n\nContato:\nTelefone: ${resultData.telefone}\nEmail: ${resultData.email}`;
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: `Consulta CNPJ: ${resultData.razao_social}`, body: emailBody },
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
        // Detectar CNPJ falado (14 dígitos)
        const numbers = t.replace(/\D/g, '');
        if (numbers.length === 14) {
          setCnpj(formatCnpj(numbers));
          playText(`CNPJ ${formatCnpj(numbers)} digitado.`).catch(() => {});
          return;
        }

        if (['consultar', 'buscar', 'pesquisar'].some(c => t.includes(c))) {
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
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Consultar CNPJ</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Input ── */}
        {stage === 'input' && (
          <div className="flex flex-col gap-4">
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Digite o CNPJ da empresa para consultar os dados cadastrais:
            </p>

            <div className="relative">
              <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
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
              Consultar CNPJ
            </button>

            <VoiceHint commands={['"12345678000190"', '"consultar"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Processing ── */}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Consultando CNPJ...</p>
          </div>
        )}

        {/* ── Result ── */}
        {stage === 'result' && resultData && (
          <div className="flex flex-col gap-4">
            {/* Banner de sucesso */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <Check className="w-4 h-4 shrink-0" />
              <span>CNPJ encontrado!</span>
            </div>

            {/* Layout responsivo */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Coluna esquerda */}
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                {/* Card de resultado */}
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
                      {resultData.nome_fantasia && (
                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                          {resultData.nome_fantasia}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          resultData.situacao === 'ATIVA' 
                            ? isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'
                            : isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700'
                        }`}>
                          {resultData.situacao}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          CNPJ: {resultData.cnpj}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Informações gerais */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                      <div className="flex-1">
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Abertura</p>
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{resultData.abertura}</p>
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Capital Social</p>
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{resultData.capital_social}</p>
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                      <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Endereço</p>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {resultData.logradouro}, {resultData.numero}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {resultData.bairro}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {resultData.municipio} - {resultData.uf}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      CEP: {resultData.cep}
                    </p>
                  </div>

                  {/* Contato */}
                  <div className="grid grid-cols-2 gap-3">
                    {resultData.telefone && (
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Phone className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Telefone</p>
                        </div>
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {resultData.telefone}
                        </p>
                      </div>
                    )}
                    {resultData.email && (
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Email</p>
                        </div>
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {resultData.email}
                        </p>
                      </div>
                    )}
                  </div>
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
