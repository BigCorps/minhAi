'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, RefreshCw, Download, Mail, Loader2, Mic, Calendar, PartyPopper } from 'lucide-react';
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

const OPENING_TEXT = 'Consulta de feriados nacionais. Digite o ano desejado ou diga o ano em voz alta.';
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

export default function FeriadosNacionaisDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('input');
  const [ano, setAno] = useState<string>(new Date().getFullYear().toString());
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

  const handleConsultar = useCallback(async () => {
    const year = parseInt(ano);
    if (isNaN(year) || year < 2000 || year > 2100) {
      setErrorMsg('Digite um ano válido entre 2000 e 2100.');
      playText('Ano inválido.').catch(() => {});
      return;
    }

    setStage('processing');
    setErrorMsg(null);

    try {
      const { data: res, error } = await supabase.functions.invoke('ferramentas-consultas', {
        body: { company_id: data.companyId, action: 'consultar_feriados', ano }
      });

      if (error) throw new Error(error.message);
      if (!res.success) throw new Error(res.error ?? 'Falha na consulta');

      setResultData(res.result);
      setSpeechText(res.speech_text);

      // Gerar PDF via jsPDF
      const pdfContent = generatePdfContent(res.result);
      const name = `feriados_${year}_${Date.now()}.pdf`;
      setFileName(name);
      setFileBase64(pdfContent);

      setStage('result');
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao consultar feriados.');
      setStage('error');
    }
  }, [ano, data.companyId, supabase, playText]);

  const generatePdfContent = (result: any): string => {
    // Mock - em produção usar jsPDF
    const feriadosList = result.feriados?.map((f: any) => `${f.data} - ${f.nome} (${f.tipo})`).join('\n') || '';
    const text = `FERIADOS NACIONAIS ${result.ano}\n\n${feriadosList}\n\nTotal: ${result.total} feriados`;
    return btoa(unescape(encodeURIComponent(text)));
  };

  const handleCopy = useCallback(async () => {
    if (!resultData) return;
    const feriadosList = resultData.feriados?.map((f: any) => `${f.data} - ${f.nome} (${f.tipo})`).join('\n') || '';
    const text = `Feriados Nacionais ${resultData.ano}\n\n${feriadosList}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    playText('Feriados copiados.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [resultData, playText]);

  const handleDownloadPdf = useCallback(() => {
    if (!fileBase64) return;
    const blob = new Blob([Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `feriados_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    playText('PDF de feriados baixado.').catch(() => {});
  }, [fileBase64, fileName, playText]);

  const handleReset = useCallback(() => {
    setStage('input');
    setAno(new Date().getFullYear().toString());
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
      const feriadosList = resultData.feriados?.map((f: any) => `${f.data} - ${f.nome} (${f.tipo})`).join('\n') || '';
      const emailBody = `Feriados Nacionais ${resultData.ano}\n\n${feriadosList}\n\nTotal: ${resultData.total} feriados`;
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: `Feriados Nacionais ${resultData.ano}`, body: emailBody },
      });
      if (error) throw error;
      playText('Feriados enviados por email.').catch(() => {});
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
        if (numbers.length === 4) {
          setAno(numbers);
          playText(`Ano ${numbers} selecionado.`).catch(() => {});
          return;
        }

        if (['consultar', 'buscar', 'pesquisar', 'listar'].some(c => t.includes(c))) {
          handleConsultar();
          return;
        }

        if (['este ano', 'ano atual', 'corrente'].some(c => t.includes(c))) {
          const currentYear = new Date().getFullYear().toString();
          setAno(currentYear);
          playText(`Ano ${currentYear} selecionado.`).catch(() => {});
          return;
        }

        if (['proximo ano', 'ano que vem'].some(c => t.includes(c))) {
          const nextYear = (new Date().getFullYear() + 1).toString();
          setAno(nextYear);
          playText(`Ano ${nextYear} selecionado.`).catch(() => {});
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
        if (['nova', 'nova consulta', 'novamente', 'outro ano'].some(c => t.includes(c))) {
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

  const getMonthName = (monthNum: number): string => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return months[monthNum - 1] || '';
  };

  const groupByMonth = (feriados: any[]) => {
    const grouped: Record<number, any[]> = {};
    feriados.forEach(f => {
      const month = parseInt(f.data.split('/')[1]);
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(f);
    });
    return grouped;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full ${modalMaxWidth} rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Feriados Nacionais</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Input ── */}
        {stage === 'input' && (
          <div className="flex flex-col gap-4">
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Digite o ano para consultar os feriados nacionais:
            </p>

            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
              <input
                type="text"
                value={ano}
                onChange={(e) => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="2024"
                maxLength={4}
                className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm ${isDark ? 'bg-slate-900 text-white placeholder-slate-500 border border-slate-700' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200'}`}
                onKeyDown={(e) => e.key === 'Enter' && handleConsultar()}
              />
            </div>

            {/* Botões rápidos */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  const year = (new Date().getFullYear() - 1).toString();
                  setAno(year);
                  playText(`Ano ${year} selecionado.`).catch(() => {});
                }}
                className={`py-2 px-3 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {new Date().getFullYear() - 1}
              </button>
              <button
                onClick={() => {
                  const year = new Date().getFullYear().toString();
                  setAno(year);
                  playText(`Ano ${year} selecionado.`).catch(() => {});
                }}
                className={`py-2 px-3 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {new Date().getFullYear()}
              </button>
              <button
                onClick={() => {
                  const year = (new Date().getFullYear() + 1).toString();
                  setAno(year);
                  playText(`Ano ${year} selecionado.`).catch(() => {});
                }}
                className={`py-2 px-3 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {new Date().getFullYear() + 1}
              </button>
            </div>

            {errorMsg && (
              <div className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleConsultar}
              disabled={ano.length !== 4}
              className="w-full py-3 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Consultar Feriados
            </button>

            <VoiceHint commands={['"2024"', '"este ano"', '"próximo ano"', '"consultar"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Processing ── */}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Consultando feriados...</p>
          </div>
        )}

        {/* ── Result ── */}
        {stage === 'result' && resultData && (
          <div className="flex flex-col gap-4">
            {/* Banner de sucesso */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <Check className="w-4 h-4 shrink-0" />
              <span>{resultData.total} feriados encontrados em {resultData.ano}</span>
            </div>

            {/* Layout responsivo */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Coluna esquerda */}
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                {/* Lista de feriados agrupados por mês */}
                <div className={`p-4 rounded-xl max-h-96 overflow-y-auto ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                  {resultData.feriados && Object.entries(groupByMonth(resultData.feriados)).map(([month, feriados]: [string, any]) => (
                    <div key={month} className="mb-4 last:mb-0">
                      <h4 className={`text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {getMonthName(parseInt(month))}
                      </h4>
                      <div className="space-y-2">
                        {(feriados as any[]).map((feriado, idx) => (
                          <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                            <PartyPopper className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {feriado.nome}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                  {feriado.data}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  feriado.tipo === 'Nacional' 
                                    ? isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                                    : isDark ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {feriado.tipo}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
