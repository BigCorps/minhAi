'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Check } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import CameraCapture from '@/components/assistant/CameraCapture';

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
    .replace(/[.,!?;:]+/g, '');

function VoiceHint({ commands, isDark }: { commands: string[]; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
      <span className="text-base flex-shrink-0">🎤</span>
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
  const { process } = useCameraProcess();

  useEffect(() => {
    playText(OPENING_TEXT).catch(() => {});
    return () => { window.speechSynthesis.cancel(); };
  }, []); // eslint-disable-line

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
      const url = await QRCode.toDataURL(text, { width: 180, margin: 2 });
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
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

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
    if (stage === 'result') {
      if (['novo cupom', 'novo', 'outra', 'tentar novamente'].some(cmd => t.includes(cmd))) {
        handleReset(); return;
      }
    }
  }
});

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Validar Cupom</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}><X className="w-5 h-5" /></button>
        </div>

        {stage === 'capturing' && (
          <>
            <CameraCapture onCapture={handleCapture} onCancel={onClose} theme={theme} companyId={data.companyId} instructions="Fotografe o cupom ou voucher." />
            <div className="mt-3">
              <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
            </div>
          </>
        )}

        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Validando cupom...</p>
          </div>
        )}

        {stage === 'result' && (
          <div className="flex flex-col gap-4">
            {cupomCode && (
              <div className={`text-center p-3 rounded-xl font-mono text-xl font-bold tracking-widest ${isDark ? 'bg-slate-900/60 text-white' : 'bg-gray-50 text-gray-900'}`}>
                {cupomCode}
              </div>
            )}

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

            {/* QR Code do resultado — para totens */}
            {resultQrUrl && cupomCode && (
              <div className="flex flex-col items-center gap-2">
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Código do cupom em QR:</p>
                <div className={`p-2 rounded-xl ${isDark ? 'bg-white' : 'bg-white border border-gray-200'}`}>
                  <Image src={resultQrUrl} alt="QR Code do cupom" width={120} height={120} unoptimized />
                </div>
              </div>
            )}

            <button onClick={handleReset} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <RefreshCw className="w-4 h-4" />Novo cupom
            </button>

            <VoiceHint commands={['"novo cupom"', '"repetir"', '"fechar"']} isDark={isDark} />

            <div className={`h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }} />
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className={`px-3 py-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>{errorMsg}</div>
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