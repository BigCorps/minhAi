'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, RefreshCw, Mail, Loader2, Mic } from 'lucide-react';
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

const OPENING_TEXT = 'Fotografe o documento ou imagem com texto. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
const AUTO_CLOSE = 60;

// CORREÇÃO: normalize remove hífen também ("e-mail" → "email")
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

export default function ImagemEmTextoDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [resultQrUrl, setResultQrUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [speechText, setSpeechText] = useState<string>('');

  const [cameraTab, setCameraTab] = useState<Tab>('companion');

  // CORREÇÃO: debounce de aba
  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { process } = useCameraProcess();

  const { isConnected: googleConnected } = useGoogleConnected(data.companyId);
  const supabase = createClient();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Cleanup ao desmontar
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

  const generateResultQr = useCallback(async (text: string) => {
    if (text.length > 500) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(text, { width: 180, margin: 2 });
      setResultQrUrl(url);
    } catch { /* silencioso */ }
  }, []);

  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');
    try {
      const res = await process('ocr', base64, data.companyId);
      setExtractedText(res.result);
      setSpeechText(res.speech_text);
      setStage('result');
      await generateResultQr(res.result);
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao extrair texto.');
      setStage('error');
    }
  }, [data.companyId, process, generateResultQr, playText]);

  const handleCopy = useCallback(async () => {
    if (!extractedText) return;
    await navigator.clipboard.writeText(extractedText);
    setCopied(true);
    playText('Texto copiado.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [extractedText, playText]);

  const handleReset = useCallback(() => {
    setStage('capturing');
    setExtractedText(null);
    setResultQrUrl(null);
    setErrorMsg(null);
    setCopied(false);
    setSpeechText('');
    // Limpar debounce de aba ao resetar
    if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    lastTabCommandRef.current = null;
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!extractedText) return;
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: 'Resultado: Imagem em Texto', body: extractedText },
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

  const TAB_COMMANDS: Record<string, string[]> = {
    webcam:    ['webcam', 'computador', 'camera do computador'],
    mobile:    ['camera', 'camara', 'meu celular', 'telefone'],
    upload:    ['arquivo', 'upload', 'galeria'],
    companion: ['celular', 'qr code', 'qrcode', 'enviar do celular'],
  };
  const TAB_FEEDBACK: Record<string, string> = {
    webcam:    'Webcam ativada.',
    mobile:    'Câmera do celular selecionada.',
    upload:    'Selecione um arquivo de imagem.',
    companion: 'Aponte o celular para o QR Code.',
  };

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair', 'voltar'].some(cmd => t.includes(cmd))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi', 'ler texto'].some(cmd => t.includes(cmd))) {
        playText(stage === 'result' && speechText ? speechText : OPENING_TEXT).catch(() => {});
        return;
      }

      if (stage === 'capturing') {
        for (const [tab, triggers] of Object.entries(TAB_COMMANDS)) {
          if (triggers.some(tr => t.includes(tr))) {
            // CORREÇÃO: debounce — ignorar se mesmo comando executado recentemente
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
        if (['ler', 'leia', 'ouvir'].some(cmd => t.includes(cmd))) {
          playText(extractedText?.slice(0, 300) ?? '').catch(() => {}); return;
        }
        if (['nova extracao', 'novo', 'outra', 'tentar novamente', 'novamente'].some(cmd => t.includes(cmd))) {
          handleReset(); return;
        }
        // CORREÇÃO: normalize já remove hífen — "e-mail" vira "email"
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Imagem em Texto</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}><X className="w-5 h-5" /></button>
        </div>

        {stage === 'capturing' && (
          <div className="flex flex-col gap-3">
            <CameraCapture
              onCapture={handleCapture}
              onCancel={onClose}
              theme={theme}
              companyId={data.companyId}
              instructions="Fotografe o documento ou imagem com texto."
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Extraindo texto com IA...</p>
          </div>
        )}

        {stage === 'result' && extractedText && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{extractedText.length} caracteres</span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar tudo'}
              </button>
            </div>

            <div className={`p-4 rounded-xl text-sm leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap ${isDark ? 'bg-slate-900/60 text-slate-200' : 'bg-gray-50 text-gray-800'}`}>
              {extractedText}
            </div>

            {resultQrUrl && (
              <div className="flex flex-col items-center gap-2">
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Escaneie para acessar o texto no celular:</p>
                <div className={`p-2 rounded-xl ${isDark ? 'bg-white' : 'bg-white border border-gray-200'}`}>
                  <Image src={resultQrUrl} alt="QR Code do resultado" width={140} height={140} unoptimized />
                </div>
              </div>
            )}

            <button onClick={handleReset} className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}>
              <RefreshCw className="w-4 h-4" />Nova extração
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

            <VoiceHint commands={['"copiar"', '"ler texto"', '"nova extração"', ...(googleConnected ? ['"enviar email"'] : []), '"fechar"']} isDark={isDark} />

            <div className={`h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }} />
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className={`px-3 py-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>{errorMsg}</div>
            <button onClick={handleReset} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700">
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
