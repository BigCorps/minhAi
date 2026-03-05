'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import CameraCapture from '@/components/assistant/CameraCapture';

type Stage = 'capturing' | 'processing' | 'result' | 'error';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
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

export default function ValidarCupomDisplay({ data, onClose, theme = 'dark' }: Props) {
  const isDark = theme === 'dark';
  const AUTO_CLOSE = 30;
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [cupomCode, setCupomCode] = useState<string | null>(null);
  const [cupomStatus, setCupomStatus] = useState<{ valid: boolean; discount?: number; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { process } = useCameraProcess();

  useEffect(() => { return () => { window.speechSynthesis.cancel(); }; }, []);

  useEffect(() => {
    if (stage !== 'result') return;
    setTimeLeft(AUTO_CLOSE);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { window.speechSynthesis.cancel(); onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, onClose]);

  const handleManualClose = useCallback(() => { window.speechSynthesis.cancel(); onClose(); }, [onClose]);

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    window.speechSynthesis.speak(u);
  };

  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');
    try {
      const res = await process('cupom', base64, data.companyId);
      setCupomCode(res.result);
      setCupomStatus(res.cupom_status ?? null);
      setStage('result');
      speakText(res.speech_text);
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao validar cupom.');
      setStage('error');
    }
  }, [data.companyId, process]);

  const handleReset = () => { setStage('capturing'); setCupomCode(null); setCupomStatus(null); setErrorMsg(null); };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Validar Cupom</h2>
          <button onClick={handleManualClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}><X className="w-5 h-5" /></button>
        </div>

        {stage === 'capturing' && (
          <CameraCapture onCapture={handleCapture} onCancel={handleManualClose} theme={theme} companyId={data.companyId} instructions="Fotografe o cupom ou voucher." />
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
            <button onClick={handleReset} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <RefreshCw className="w-4 h-4" />Novo cupom
            </button>
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