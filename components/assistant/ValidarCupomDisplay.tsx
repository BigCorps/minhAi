'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Mail, Loader2, Mic } from 'lucide-react';
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
    return data as {
      result: string;
      speech_text: string;
      cupom_status?: { valid: boolean; discount?: number; message: string };
      metadata: Record<string, any>;
    };
  };
  return { process };
}

const OPENING_TEXT = 'Fotografe o cupom ou voucher. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
const AUTO_CLOSE = 30;

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

export default function ValidarCupomDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [cupomCode, setCupomCode] = useState<string | null>(null);
  const [cupomStatus, setCupomStatus] = useState<{ valid: boolean; discount?: number; message: string } | null>(null);
  const [resultQrUrl, setResultQrUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speechText, setSpeechText] = useState<string>('');

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

  const generateResultQr = useCallback(async (text: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      // QR do código do cupom — para o celular escanear e usar o desconto
      const url = await QRCode.toDataURL(text, {
        width: 160,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      });
      setResultQrUrl(url);
    } catch { /* silencioso */ }
  }, []);

  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');
    try {
      const res = await process('cupom', base64, data.companyId);
      setCupomCode(res.result);
      setCupomStatus(res.cupom_status ?? null);
      setSpeechText(res.speech_text);
      setStage('result');
      await generateResultQr(res.result);
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao validar cupom.');
      setStage('error');
    }
  }, [data.companyId, process, generateResultQr, playText]);

  const handleReset = useCallback(() => {
    setStage('capturing');
    setCupomCode(null);
    setCupomStatus(null);
    setResultQrUrl(null);
    setErrorMsg(null);
    setSpeechText('');
    if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    lastTabCommandRef.current = null;
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!cupomCode) return;
    setIsSendingEmail(true);
    const body = cupomStatus
      ? `Código: ${cupomCode}\nStatus: ${cupomStatus.message}${cupomStatus.discount ? `\nDesconto: ${cupomStatus.discount}%` : ''}`
      : cupomCode;
    try {
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: 'Resultado: Validar Cupom', body },
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
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(cmd => t.includes(cmd))) {
        playText(stage === 'result' && speechText ? speechText : OPENING_TEXT).catch(() => {});
        return;
      }

      if (stage === 'capturing') {
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
        if (['novo cupom', 'novo', 'outra', 'tentar novamente', 'novamente'].some(cmd => t.includes(cmd))) {
          handleReset(); return;
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Validar Cupom</h2>
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
              instructions="Fotografe o cupom ou voucher."
              activeTab={cameraTab}
              onTabChange={setCameraTab}
            />
            <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
          </div>
        )}

        {/* ── Processing ── */}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Validando cupom...</p>
          </div>
        )}

        {/* ── Result ── */}
        {stage === 'result' && (
          <div className="flex flex-col gap-4">

            {/* Código do cupom */}
            {cupomCode && (
              <div className={`text-center p-3 rounded-xl font-mono text-xl font-bold tracking-widest ${isDark ? 'bg-slate-900/60 text-white' : 'bg-gray-50 text-gray-900'}`}>
                {cupomCode}
              </div>
            )}

            {/* Status */}
            {cupomStatus && (
              <div className={`px-4 py-3 rounded-xl text-sm font-medium text-center ${
                cupomStatus.valid
                  ? isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'
                  : isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                {cupomStatus.message}
                {cupomStatus.valid && cupomStatus.discount && (
                  <div className="text-2xl font-bold mt-1">{cupomStatus.discount}% OFF</div>
                )}
              </div>
            )}

            {/* QR do código do cupom — para escanear e usar */}
            {resultQrUrl && cupomCode && (
              <div className="flex flex-col items-center gap-2">
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Código do cupom em QR:</p>
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resultQrUrl} alt="QR Code do cupom" width={120} height={120} className="rounded-lg" />
                </div>
              </div>
            )}

            {/* Novo cupom + Enviar email na mesma linha */}
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <RefreshCw className="w-4 h-4" />Novo cupom
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

            <VoiceHint
              commands={['"novo cupom"', '"repetir"', ...(googleConnected ? ['"enviar email"'] : []), '"fechar"']}
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
            <button onClick={handleReset} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-700">
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
