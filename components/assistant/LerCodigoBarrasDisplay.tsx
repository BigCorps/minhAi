'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, RefreshCw } from 'lucide-react';
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
    return data as { result: string; speech_text: string; metadata: Record<string, any> };
  };
  return { process };
}

const OPENING_TEXT = 'Aponte a câmera para o código de barras. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
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

export default function LerCodigoBarrasDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [result, setResult] = useState<string | null>(null);
  const [resultQrUrl, setResultQrUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      // Tentar BarcodeDetector nativo primeiro
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
          });
          const img = new window.Image();
          img.src = `data:image/jpeg;base64,${base64}`;
          await new Promise<void>(res => { img.onload = () => res(); });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0) {
            const value = barcodes[0].rawValue;
            setResult(value);
            setStage('result');
            await generateResultQr(value);
            playText(`Código lido: ${value}`).catch(() => {});
            return;
          }
        } catch { /* fallback */ }
      }
      // Fallback: Edge Function
      const res = await process('barcode', base64, data.companyId);
      setResult(res.result);
      setStage('result');
      await generateResultQr(res.result);
      playText(res.speech_text).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao ler código de barras.');
      setStage('error');
    }
  }, [data.companyId, process, generateResultQr, playText]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    playText('Código copiado.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [result, playText]);

  const handleReset = useCallback(() => {
    setStage('capturing');
    setResult(null);
    setResultQrUrl(null);
    setErrorMsg(null);
    setCopied(false);
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
      playText(stage === 'result' && result ? `Código lido: ${result}` : OPENING_TEXT).catch(() => {});
      return;
    }
    if (stage === 'result') {
      if (['copiar', 'copia', 'copie'].some(cmd => t.includes(cmd))) {
        handleCopy(); return;
      }
      if (['nova leitura', 'novo', 'outra', 'tentar novamente'].some(cmd => t.includes(cmd))) {
        handleReset(); return;
      }
    }
  }
});

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ler Código de Barras</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}><X className="w-5 h-5" /></button>
        </div>

        {stage === 'capturing' && (
          <>
            <CameraCapture onCapture={handleCapture} onCancel={onClose} theme={theme} companyId={data.companyId} instructions="Aponte a câmera para o código de barras." />
            <div className="mt-3">
              <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fechar"']} isDark={isDark} />
            </div>
          </>
        )}

        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Lendo código...</p>
          </div>
        )}

        {stage === 'result' && result && (
          <div className="flex flex-col gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <Check className="w-4 h-4" />Código lido com sucesso!
            </div>

            <div className={`p-3 rounded-xl text-sm font-mono break-all ${isDark ? 'bg-slate-900/60 text-slate-200' : 'bg-gray-50 text-gray-800'}`}>
              {result}
            </div>

            {/* QR Code do resultado */}
            {resultQrUrl && (
              <div className="flex flex-col items-center gap-2">
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Escaneie para usar no celular:</p>
                <div className={`p-2 rounded-xl ${isDark ? 'bg-white' : 'bg-white border border-gray-200'}`}>
                  <Image src={resultQrUrl} alt="QR Code do resultado" width={140} height={140} unoptimized />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleCopy} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button onClick={handleReset} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <RefreshCw className="w-4 h-4" />Nova leitura
              </button>
            </div>

            <VoiceHint commands={['"copiar"', '"nova leitura"', '"repetir"', '"fechar"']} isDark={isDark} />

            <div className={`h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }} />
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className={`px-3 py-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>{errorMsg}</div>
            <button onClick={handleReset} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700">
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}