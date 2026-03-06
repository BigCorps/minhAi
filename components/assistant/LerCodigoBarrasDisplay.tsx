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

const OPENING_TEXT = 'Aponte a câmera para o código de barras. Você pode dizer: celular, webcam, câmera, arquivo ou fechar.';
const AUTO_CLOSE = 30;

// CORREÇÃO: normalize remove hífen também ("e-mail" → "email", "QR-code" → "QRcode")
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

export default function LerCodigoBarrasDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [result, setResult] = useState<string | null>(null);
  const [resultQrUrl, setResultQrUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [cameraTab, setCameraTab] = useState<Tab>('webcam');

  const captureRef = useRef<(() => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // CORREÇÃO: debounce de aba
  const lastTabCommandRef = useRef<string | null>(null);
  const tabCommandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar suporte ao BarcodeDetector no browser
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  useEffect(() => {
    setHasBarcodeDetector('BarcodeDetector' in window);
  }, []);

  const { isConnected: googleConnected } = useGoogleConnected(data.companyId);
  const supabaseEmail = createClient();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const { process } = useCameraProcess();

  // Cleanup do tabCommandTimeout ao desmontar
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
      const url = await QRCode.toDataURL(text, { width: 180, margin: 2 });
      setResultQrUrl(url);
    } catch { /* silencioso */ }
  }, []);

  const handleCapture = useCallback(async (base64: string, directValue?: string) => {
    setStage('processing');
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    try {
      let finalResult: string;
      let speechText: string;

      if (directValue) {
        // BarcodeDetector leu — não consome créditos
        finalResult = directValue;
        speechText = `Código de barras lido: ${directValue.replace(/\d/g, '$& ')}`;
      } else {
        // Captura manual → edge com GPT-4o Vision
        const res = await process('barcode', base64, data.companyId);
        finalResult = res.result;
        speechText = res.speech_text;
      }

      setResult(finalResult);
      setStage('result');
      await generateResultQr(finalResult);
      playText(speechText).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao ler código de barras.');
      setStage('error');
    }
  }, [data.companyId, process, generateResultQr, playText]);

  // CORREÇÃO: scan automático captura frame no canvas (mais confiável que video element direto)
  useEffect(() => {
    if (stage !== 'capturing' || cameraTab !== 'webcam') {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      return;
    }

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      if (!('BarcodeDetector' in window)) return; // sem detector → não faz nada automático

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0);

      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar'],
        });
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          clearInterval(scanIntervalRef.current!);
          scanIntervalRef.current = null;
          const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          handleCapture(base64, barcodes[0].rawValue);
        }
      } catch {
        // BarcodeDetector falhou neste frame, tentar no próximo
      }
    }, 600);

    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, [stage, cameraTab, handleCapture]);

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
    // Limpar debounce de aba ao resetar
    if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
    lastTabCommandRef.current = null;
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!result) return;
    setIsSendingEmail(true);
    try {
      const { error } = await supabaseEmail.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: 'Resultado: Ler Código de Barras', body: result },
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

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = normalize(transcript);

      // ── Universais ────────────────────────────────────────────
      if (['fechar', 'cancelar', 'sair', 'voltar'].some(c => t.includes(c))) {
        onClose(); return;
      }
      if (['repetir', 'repete', 'de novo', 'nao ouvi'].some(c => t.includes(c))) {
        playText(stage === 'result' && result ? `Código lido: ${result}` : OPENING_TEXT).catch(() => {});
        return;
      }

      // ── Troca de aba + fotografar (só em capturing) ──────────
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
        };
        const TAB_FEEDBACK: Record<Tab, string> = {
          companion: 'Aponte o celular para o QR Code.',
          webcam:    'Webcam ativada. Escaneando automaticamente.',
          mobile:    'Câmera do celular selecionada.',
          upload:    'Selecione um arquivo de imagem.',
        };
        for (const [trigger, tab] of Object.entries(TAB_MAP)) {
          if (t.includes(trigger)) {
            // CORREÇÃO: debounce — ignorar se mesmo comando executado recentemente
            if (lastTabCommandRef.current === tab) return;
            lastTabCommandRef.current = tab;
            setCameraTab(tab as Tab);
            playText(TAB_FEEDBACK[tab as Tab]).catch(() => {});
            if (tabCommandTimeoutRef.current) clearTimeout(tabCommandTimeoutRef.current);
            tabCommandTimeoutRef.current = setTimeout(() => {
              lastTabCommandRef.current = null;
            }, 4000);
            return;
          }
        }
        if (['fotografar', 'tirar foto', 'capturar', 'foto', 'bater foto'].some(c => t.includes(c))) {
          captureRef.current?.(); return;
        }
      }

      // ── Resultado ────────────────────────────────────────────
      if (stage === 'result') {
        if (['copiar', 'copia', 'copie'].some(c => t.includes(c))) {
          handleCopy(); return;
        }
        if (['nova leitura', 'novo', 'outra', 'tentar novamente', 'novamente'].some(c => t.includes(c))) {
          handleReset(); return;
        }
        // CORREÇÃO: normalize já remove hífen, então "e-mail" vira "email" automaticamente
        if (googleConnected && ['enviar email', 'mandar email', 'enviar por email'].some(c => t.includes(c))) {
          handleSendByEmail(); return;
        }
      }

      // ── Erro ─────────────────────────────────────────────────
      if (stage === 'error') {
        if (['tentar', 'novamente'].some(c => t.includes(c))) {
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
            <CameraCapture
              onCapture={handleCapture}
              onCancel={onClose}
              theme={theme}
              companyId={data.companyId}
              instructions="Aponte a câmera para o código de barras."
              defaultTab="webcam"
              activeTab={cameraTab}
              onTabChange={setCameraTab}
              captureRef={captureRef}
              videoRef={videoRef}
            />
            <div className="mt-3 flex flex-col gap-2">
              {cameraTab === 'webcam' && !hasBarcodeDetector && (
                <p className="text-xs text-amber-400 text-center">
                  Seu navegador não suporta leitura automática. Use o botão &quot;Fotografar&quot;.
                </p>
              )}
              {cameraTab === 'webcam' && hasBarcodeDetector && (
                <p className={`text-xs text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Aponte o código de barras para a câmera — leitura automática ativada.
                </p>
              )}
              <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fotografar"', '"fechar"']} isDark={isDark} />
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

            <VoiceHint commands={['"copiar"', '"nova leitura"', '"repetir"', ...(googleConnected ? ['"enviar email"'] : []), '"fechar"']} isDark={isDark} />

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
