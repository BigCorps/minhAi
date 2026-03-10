'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, RefreshCw, Download, Mail, Loader2, Mic } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import CameraCapture from '@/components/assistant/CameraCapture';
import { ResultDownloadQR } from '@/components/assistant/ResultDownloadQR';

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';
type Stage = 'capturing' | 'processing' | 'result' | 'error';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

function useCameraProcess() {
  const supabase = createClient();
  const process = async (action: string, base64: string, companyId: string) => {
    const { data, error } = await supabase.functions.invoke('camera-process', {
      body: { action, image: base64, company_id: companyId },
    });
    if (error) throw new Error(error.message);
    if (!data.success) throw new Error(data.error ?? 'Falha no processamento');
    return data as { result: string; speech_text: string; metadata: Record<string, any> };
  };
  return { process };
}

function csvToMarkdown(csv: string): string {
  const rows = csv.trim().split('\n').map(r =>
    r.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
  );
  if (rows.length === 0) return '';
  const header = '| ' + rows[0].join(' | ') + ' |';
  const divider = '| ' + rows[0].map(() => '---').join(' | ') + ' |';
  const body = rows.slice(1).map(r => '| ' + r.join(' | ') + ' |').join('\n');
  return [header, divider, body].filter(Boolean).join('\n');
}

const OPENING_TEXT = 'Fotografe a tabela ou planilha impressa. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
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

export default function TabelaEmTextoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const [markdownResult, setMarkdownResult] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'csv' | 'markdown'>('csv');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [speechText, setSpeechText] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const [cameraTab, setCameraTab] = useState<Tab>('companion');
  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { process } = useCameraProcess();
  const { isConnected: googleConnected } = useGoogleConnected(data.companyId);
  const supabase = createClient();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    return () => {
      if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    };
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

  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');
    try {
      const res = await process('tabela', base64, data.companyId);
      const csv = res.result;
      const name = `tabela_${Date.now()}.csv`;
      const b64 = btoa(unescape(encodeURIComponent(csv)));

      setCsvResult(csv);
      setMarkdownResult(csvToMarkdown(csv));
      setSpeechText(res.speech_text);
      setFileName(name);
      setFileBase64(b64);
      setStage('result');
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao converter tabela.');
      setStage('error');
    }
  }, [data.companyId, process, playText]);

  const handleDownloadCSV = useCallback(() => {
    if (!csvResult) return;
    const blob = new Blob([csvResult], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `tabela_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    playText('Arquivo CSV baixado.').catch(() => {});
  }, [csvResult, fileName, playText]);

  const handleDownloadXLSX = useCallback(() => {
    if (!csvResult) return;
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvResult], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabela_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    playText('Arquivo Excel baixado.').catch(() => {});
  }, [csvResult, playText]);

  const handleCopy = useCallback(async () => {
    if (!csvResult) return;
    const content = viewMode === 'csv' ? csvResult : (markdownResult ?? csvResult);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    playText('Texto copiado.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [csvResult, markdownResult, viewMode, playText]);

  const handleReset = useCallback(() => {
    setStage('capturing');
    setCsvResult(null);
    setMarkdownResult(null);
    setViewMode('csv');
    setErrorMsg(null);
    setCopied(false);
    setSpeechText('');
    setFileBase64('');
    setFileName('');
    if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    lastTabCommandRef.current = null;
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!csvResult) return;
    setIsSendingEmail(true);
    const content = viewMode === 'csv' ? csvResult : (markdownResult ?? csvResult);
    try {
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: 'Resultado: Tabela em Texto', body: content },
      });
      if (error) throw error;
      playText('enviado.').catch(() => {});
      setTimeout(() => onClose(), 1500);
    } catch {
      playText('Erro ao enviar email.').catch(() => {});
    } finally {
      setIsSendingEmail(false);
    }
  };

  const linhas = csvResult ? csvResult.split('\n').filter(Boolean).length : 0;
  const colunas = csvResult ? (csvResult.split('\n')[0]?.split(',').length ?? 0) : 0;
  const currentContent = viewMode === 'csv' ? csvResult : markdownResult;

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(cmd => t.includes(cmd))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(cmd => t.includes(cmd))) {
        playText(stage === 'result' && speechText ? speechText : OPENING_TEXT).catch(() => {});
        return;
      }

      if (stage === 'capturing') {
        const TAB_COMMANDS: Record<string, string[]> = {
          webcam:    ['webcam', 'computador', 'camera do computador'],
          mobile:    ['camera', 'camara', 'meu celular', 'telefone'],
          upload:    ['arquivo', 'upload', 'galeria'],
          companion: ['celular', 'qr code', 'qrcode', 'enviar do celular'],
        };
        const TAB_FEEDBACK: Record<string, string> = {
          webcam:    'Webcam ativada.',
          mobile:    'Câmera do celular selecionada.',
          upload:    'Selecione um arquivo ou PDF.',
          companion: 'Aponte o celular para o QR Code.',
        };
        for (const [tab, triggers] of Object.entries(TAB_COMMANDS)) {
          if (triggers.some(tr => t.includes(tr))) {
            if (lastTabCommandRef.current === tab) return;
            lastTabCommandRef.current = tab;
            setCameraTab(tab as Tab);
            playText(TAB_FEEDBACK[tab]).catch(() => {});
            if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
            tabCommandTimeoutRef.current = setTimeout(() => {
              lastTabCommandRef.current = null;
            }, 4000);
            return;
          }
        }
      }

      if (stage === 'result') {
        if (['copiar', 'copia', 'copie'].some(cmd => t.includes(cmd))) {
          handleCopy(); return;
        }
        if (['baixar excel', 'baixar xlsx', 'salvar excel'].some(cmd => t.includes(cmd))) {
          handleDownloadXLSX(); return;
        }
        if (['baixar', 'download', 'salvar', 'csv'].some(cmd => t.includes(cmd))) {
          handleDownloadCSV(); return;
        }
        if (['nova tabela', 'novo', 'outra', 'tentar novamente', 'novamente'].some(cmd => t.includes(cmd))) {
          handleReset(); return;
        }
        if (['ver markdown', 'markdown', 'tabela formatada'].some(cmd => t.includes(cmd))) {
          setViewMode('markdown');
          playText('Visualizando em Markdown.').catch(() => {});
          return;
        }
        if (['ver csv', 'csv', 'ver planilha'].some(cmd => t.includes(cmd))) {
          setViewMode('csv');
          playText('Visualizando em CSV.').catch(() => {});
          return;
        }
        if (googleConnected && ['enviar email', 'mandar email', 'enviar por email'].some(cmd => t.includes(cmd))) {
          handleSendByEmail(); return;
        }
      }

      if (stage === 'error') {
        if (['tentar', 'novamente', 'tentar novamente'].some(cmd => t.includes(cmd))) {
          handleReset(); return;
        }
      }
    }
  });

  // Modal mais largo no desktop quando em resultado
  const modalMaxWidth = stage === 'result' ? 'max-w-lg sm:max-w-3xl' : 'max-w-lg';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full ${modalMaxWidth} rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tabela em Texto</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Capturing ── */}
        {stage === 'capturing' && (
          <div className="flex flex-col gap-3">
            <CameraCapture
              onCapture={handleCapture}
              onCancel={onClose}
              theme={theme}
              companyId={data.companyId}
              instructions="Fotografe a tabela ou planilha impressa."
              acceptPdf={true}
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Processing ── */}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Convertendo tabela...</p>
          </div>
        )}

        {/* ── Result ── */}
        {stage === 'result' && csvResult && (
          <div className="flex flex-col gap-4">

            {/* Banner */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <Check className="w-4 h-4 shrink-0" />
              <span>Tabela convertida!</span>
              <span className={`ml-auto text-xs font-normal ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
                {linhas} linhas · {colunas} colunas
              </span>
            </div>

            {/* Layout responsivo: coluna única mobile / duas colunas desktop */}
            <div className="flex flex-col sm:flex-row gap-4">

              {/* Coluna esquerda — conteúdo + ações */}
              <div className="flex flex-col gap-3 flex-1 min-w-0">

                {/* Toggle CSV / Markdown */}
                <div className={`flex gap-1 p-0.5 rounded-lg w-fit ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                  <button
                    onClick={() => setViewMode('csv')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'csv' ? 'bg-blue-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
                  >CSV</button>
                  <button
                    onClick={() => setViewMode('markdown')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'markdown' ? 'bg-blue-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
                  >Markdown</button>
                </div>

                {/* Conteúdo */}
                <div className={`p-3 rounded-xl text-xs font-mono max-h-64 overflow-y-auto whitespace-pre ${isDark ? 'bg-slate-900/60 text-slate-300' : 'bg-gray-50 text-gray-700'}`}>
                  {currentContent}
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <button onClick={handleCopy} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button onClick={handleDownloadCSV} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                    <Download className="w-4 h-4" />Baixar .csv
                  </button>
                  <button onClick={handleDownloadXLSX} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700">
                    <Download className="w-4 h-4" />Baixar .xlsx
                  </button>
                </div>

                {/* Nova tabela + Enviar email na mesma linha */}
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <RefreshCw className="w-4 h-4" />Nova tabela
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

              {/* Coluna direita — QR de download (apenas desktop) */}
              <div className="hidden sm:flex flex-col shrink-0 w-56">
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={fileName}
                  fileType="text/csv"
                  fileBase64={fileBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!fileBase64}
                />
              </div>

              {/* QR mobile — apenas em telas pequenas */}
              <div className="sm:hidden">
                <ResultDownloadQR
                  companyId={data.companyId}
                  fileName={fileName}
                  fileType="text/csv"
                  fileBase64={fileBase64}
                  isDark={isDark}
                  enabled={stage === 'result' && !!fileBase64}
                />
              </div>

            </div>

            <VoiceHint
              commands={['"copiar"', '"baixar csv"', '"baixar excel"', '"markdown"', '"nova tabela"', ...(googleConnected ? ['"enviar email"'] : []), '"fechar"']}
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
            <button onClick={handleReset} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
