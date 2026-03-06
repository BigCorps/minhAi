'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, RefreshCw, Download, Mail, Loader2, Mic } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import CameraCapture from '@/components/assistant/CameraCapture';

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

const OPENING_TEXT = 'Fotografe o contrato ou documento legal. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
const AUTO_CLOSE = 60;

const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:]+/g, '');

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

export default function ContratoEmTextoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [contratoText, setContratoText] = useState<string | null>(null);
  const [resultQrUrl, setResultQrUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [speechText, setSpeechText] = useState<string>('');
  const [isPdf, setIsPdf] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);

  // Ajuste 2: estado da aba elevado para o modal (companion como padrão para contratos)
  const [cameraTab, setCameraTab] = useState<Tab>('companion');

  const { process } = useCameraProcess();

  // Email
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

  const generateResultQr = useCallback(async (text: string) => {
    // Contratos geralmente são longos — só gera QR para textos curtos
    if (text.length > 500) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(text, { width: 180, margin: 2 });
      setResultQrUrl(url);
    } catch { /* silencioso */ }
  }, []);

  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');

    // Detectar se é PDF pelo header base64 (JVBERi = %PDF)
    const detectedPdf = base64.startsWith('JVBERi');
    setIsPdf(detectedPdf);

    try {
      const res = await process('contrato', base64, data.companyId);
      setContratoText(res.result);
      setSpeechText(res.speech_text);

      // Extrair contagem de páginas do metadata se disponível
      if (detectedPdf && res.metadata?.page_count) {
        setPageCount(res.metadata.page_count);
      }

      setStage('result');
      await generateResultQr(res.result);
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao digitalizar contrato.');
      setStage('error');
    }
  }, [data.companyId, process, generateResultQr, playText]);

  const handleCopy = useCallback(async () => {
    if (!contratoText) return;
    await navigator.clipboard.writeText(contratoText);
    setCopied(true);
    playText('Texto copiado.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [contratoText, playText]);

  const handleDownloadTxt = useCallback(() => {
    if (!contratoText) return;
    const blob = new Blob([contratoText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    playText('Arquivo de contrato baixado.').catch(() => {});
  }, [contratoText, playText]);

  const handleReset = useCallback(() => {
    setStage('capturing');
    setContratoText(null);
    setResultQrUrl(null);
    setErrorMsg(null);
    setCopied(false);
    setSpeechText('');
    setIsPdf(false);
    setPageCount(null);
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!contratoText) return;
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: 'Resultado: Contrato em Texto', body: contratoText },
      });
      if (error) throw error;
      playText('email enviado.').catch(() => {});
      setTimeout(() => onClose(), 1500);
    } catch {
      playText('Erro ao enviar email.').catch(() => {});
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Resumo do resultado: "3 páginas processadas → X linhas" ou só "X linhas"
  const getResultSummary = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim()).length;
    const words = text.trim().split(/\s+/).length;
    if (isPdf && pageCount) {
      return `${pageCount} página${pageCount > 1 ? 's' : ''} processada${pageCount > 1 ? 's' : ''} · ${lines} linhas · ${words} palavras`;
    }
    return `${lines} linhas · ${words} palavras`;
  };

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      // ── Universais ────────────────────────────────────────────
      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi', 'ler contrato'].some(c => t.includes(c))) {
        playText(stage === 'result' && speechText ? speechText : OPENING_TEXT).catch(() => {});
        return;
      }

      // ── Troca de aba (só em capturing) ───────────────────────
      if (stage === 'capturing') {
        const TAB_MAP: Record<string, Tab> = {
          celular:    'companion',
          qrcode:     'companion',
          'qr code':  'companion',
          webcam:     'webcam',
          computador: 'webcam',
          camera:     'mobile',
          camara:     'mobile',
          arquivo:    'upload',
          upload:     'upload',
          galeria:    'upload',
          pdf:        'upload',
        };
        const TAB_FEEDBACK: Record<Tab, string> = {
          companion: 'Aponte o celular para o QR Code.',
          webcam:    'Webcam ativada.',
          mobile:    'Câmera do celular selecionada.',
          upload:    'Selecione um arquivo ou PDF.',
        };
        for (const [trigger, tab] of Object.entries(TAB_MAP)) {
          if (t.includes(trigger)) {
            setCameraTab(tab);
            playText(TAB_FEEDBACK[tab]).catch(() => {});
            return;
          }
        }
      }

      // ── Resultado ────────────────────────────────────────────
      if (stage === 'result' && contratoText) {
        if (['copiar', 'copia', 'copie'].some(c => t.includes(c))) {
          handleCopy(); return;
        }
        if (['ler', 'leia', 'ouvir'].some(c => t.includes(c))) {
          playText(contratoText.slice(0, 300)).catch(() => {}); return;
        }
        if (['baixar', 'download', 'salvar', 'txt'].some(c => t.includes(c))) {
          handleDownloadTxt(); return;
        }
        if (['nova', 'novo contrato', 'nova digitalizacao', 'novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
        if (googleConnected && ['enviar email', 'mandar email', 'enviar por email'].some(c => t.includes(c))) {
          handleSendByEmail(); return;
        }
      }

      // ── Erro ─────────────────────────────────────────────────
      if (stage === 'error') {
        if (['tentar', 'novamente', 'tentar novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
      }
    }
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Contrato em Texto</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}><X className="w-5 h-5" /></button>
        </div>

        {/* Ajuste 1: VoiceHint dentro do mesmo bloco, sem <div className="mt-3"> separado */}
        {stage === 'capturing' && (
          <div className="flex flex-col gap-3">
            <CameraCapture
              onCapture={handleCapture}
              onCancel={onClose}
              theme={theme}
              companyId={data.companyId}
              instructions="Fotografe o contrato ou documento legal."
              acceptPdf={true}
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Digitalizando contrato...</p>
            <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Isso pode levar alguns segundos</p>
          </div>
        )}

        {stage === 'result' && contratoText && (
          <div className="flex flex-col gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <Check className="w-4 h-4 shrink-0" />
              <span>Contrato digitalizado!</span>
              {/* Ajuste 3: resumo contextual — páginas PDF ou só contagem de linhas */}
              <span className={`ml-auto text-xs font-normal ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
                {getResultSummary(contratoText)}
              </span>
            </div>

            <div className={`p-4 rounded-xl text-sm leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap ${isDark ? 'bg-slate-900/60 text-slate-200' : 'bg-gray-50 text-gray-800'}`}>
              {contratoText}
            </div>

            {/* QR Code — só para documentos curtos */}
            {resultQrUrl && (
              <div className="flex flex-col items-center gap-2">
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Escaneie para acessar no celular:</p>
                <div className={`p-2 rounded-xl ${isDark ? 'bg-white' : 'bg-white border border-gray-200'}`}>
                  <Image src={resultQrUrl} alt="QR Code do contrato" width={140} height={140} unoptimized />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleCopy} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button onClick={handleDownloadTxt} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700">
                <Download className="w-4 h-4" />Baixar .txt
              </button>
            </div>

            <button onClick={handleReset} className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}>
              <RefreshCw className="w-4 h-4" />Nova digitalização
            </button>

            {googleConnected && (
              <button
                onClick={handleSendByEmail}
                disabled={isSendingEmail}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 w-full"
              >
                {isSendingEmail
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                  : <><Mail className="w-4 h-4" />Enviar por email</>
                }
              </button>
            )}

            <VoiceHint commands={['"copiar"', '"baixar txt"', '"ler contrato"', '"nova digitalização"', ...(googleConnected ? ['"enviar email"'] : []), '"fechar"']} isDark={isDark} />

            <div className={`h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }} />
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className={`px-3 py-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>{errorMsg}</div>
            <button onClick={handleReset} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700">
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}