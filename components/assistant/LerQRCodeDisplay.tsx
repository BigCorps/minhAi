'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, Copy, ExternalLink, Check, RefreshCw, Mail, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { useGoogleConnected } from '@/components/VoiceAssistant/hooks/useGoogleConnected';
import CameraCapture from '@/components/assistant/CameraCapture';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

type Tab = 'companion' | 'webcam' | 'mobile' | 'upload';
type Stage = 'capturing' | 'processing' | 'result' | 'error';

// ── Textos de voz ────────────────────────────────────────────────
const OPENING_TEXT = 'Aponte a câmera para o QR Code e fotografe. Você pode dizer: celular para usar o QR Code, webcam, câmera, arquivo, ou fechar.';
const AUTO_CLOSE = 30;

// ── Normalização padrão ──────────────────────────────────────────
const normalize = (text: string) =>
  text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:]+/g, '');

// ── VoiceHint ────────────────────────────────────────────────────
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

export default function LerQRCodeDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [stage, setStage] = useState<Stage>('capturing');
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [resultQrUrl, setResultQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado da aba elevado para o modal
  const [cameraTab, setCameraTab] = useState<Tab>('webcam');

  // Refs para captura externa e scan automático
  const captureRef = useRef<(() => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Email
  const { isConnected: googleConnected } = useGoogleConnected(data.companyId);
  const supabase = createClient();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // ── Auto-close após resultado ────────────────────────────────
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

  // ── Gerar QR Code do resultado (para totens) ─────────────────
  const generateResultQr = useCallback(async (text: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(text, { width: 200, margin: 2 });
      setResultQrUrl(url);
    } catch { /* silencioso */ }
  }, []);

  // ── Processar imagem capturada com jsQR ──────────────────────
  const handleCapture = useCallback(async (base64: string) => {
    setStage('processing');
    try {
      const jsQR = (await import('jsqr')).default;
      const img = new window.Image();
      img.src = `data:image/jpeg;base64,${base64}`;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context não disponível');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        setQrResult(code.data);
        setStage('result');
        await generateResultQr(code.data);
        playText(`QR Code lido: ${code.data.slice(0, 80)}`).catch(() => {});
      } else {
        setErrorMsg('QR Code não detectado. Tente uma foto mais nítida e centralizada.');
        setStage('error');
        playText('Não consegui ler o QR Code. Tente novamente com a imagem mais centralizada.').catch(() => {});
      }
    } catch (err: any) {
      setErrorMsg('Erro ao processar imagem: ' + (err.message ?? 'desconhecido'));
      setStage('error');
    }
  }, [generateResultQr, playText]);

  // ── Escaneamento automático via webcam ───────────────────────
  useEffect(() => {
    if (stage !== 'capturing' || cameraTab !== 'webcam') {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      return;
    }

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

      const jsQR = (await import('jsqr')).default;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code?.data) {
        clearInterval(scanIntervalRef.current!);
        handleCapture(base64);
      }
    }, 800);

    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, [stage, cameraTab, handleCapture]);

  const handleCopy = useCallback(async () => {
    if (!qrResult) return;
    await navigator.clipboard.writeText(qrResult);
    setCopied(true);
    playText('Texto copiado.').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [qrResult, playText]);

  const handleReset = useCallback(() => {
    setStage('capturing');
    setQrResult(null);
    setResultQrUrl(null);
    setErrorMsg(null);
    setCopied(false);
    setTimeLeft(AUTO_CLOSE);
    playText(OPENING_TEXT).catch(() => {});
  }, [playText]);

  const handleSendByEmail = async () => {
    if (!qrResult) return;
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('enviar-email-google', {
        body: { company_id: data.companyId, subject: 'Resultado: Ler QR Code', body: qrResult },
      });
      if (error) throw error;
      playText('Resultado enviado por email.').catch(() => {});
    } catch {
      playText('Erro ao enviar email.').catch(() => {});
    } finally {
      setIsSendingEmail(false);
    }
  };

  const isUrl = (text: string) => {
    try { new URL(text); return text.startsWith('http'); } catch { return false; }
  };

  // ── Comandos de voz ──────────────────────────────────────────
  const TAB_COMMANDS: Record<string, string[]> = {
    webcam:    ['webcam', 'computador', 'camera do computador'],
    mobile:    ['camera', 'camara', 'meu celular', 'telefone'],
    upload:    ['arquivo', 'upload', 'galeria'],
    companion: ['celular', 'qr code', 'qrcode', 'enviar do celular'],
  };
  const TAB_FEEDBACK: Record<string, string> = {
    webcam:    'Webcam ativada. Posicionando para escanear automaticamente.',
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
        playText(stage === 'result' && qrResult ? `QR Code lido: ${qrResult.slice(0, 80)}` : OPENING_TEXT).catch(() => {});
        return;
      }
      if (stage === 'result') {
        if (['copiar', 'copia', 'copie'].some(cmd => t.includes(cmd))) {
          handleCopy(); return;
        }
        if (['nova leitura', 'novo', 'outra', 'tentar novamente', 'reiniciar'].some(cmd => t.includes(cmd))) {
          handleReset(); return;
        }
      }

      // Mudar aba por voz
      for (const [tab, triggers] of Object.entries(TAB_COMMANDS)) {
        if (triggers.some(tr => t.includes(tr))) {
          setCameraTab(tab as Tab);
          playText(TAB_FEEDBACK[tab]).catch(() => {});
          return;
        }
      }

      // Fotografar manual
      if (['fotografar', 'tirar foto', 'capturar', 'foto', 'bater foto'].some(cmd => t.includes(cmd))) {
        captureRef.current?.();
        return;
      }

      // Enviar por email
      if (googleConnected && ['enviar email', 'mandar email', 'enviar por email'].some(cmd => t.includes(cmd))) {
        handleSendByEmail();
        return;
      }
    }
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}`}>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ler QR Code</h2>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {stage === 'capturing' && (
          <>
            <CameraCapture
              onCapture={handleCapture}
              onCancel={onClose}
              theme={theme}
              companyId={data.companyId}
              instructions="Aponte a câmera para o QR Code e fotografe."
              defaultTab="webcam"
              activeTab={cameraTab}
              onTabChange={setCameraTab}
              captureRef={captureRef}
              videoRef={videoRef}
            />
            <div className="mt-3">
              <VoiceHint commands={['"celular"', '"webcam"', '"câmera"', '"arquivo"', '"fotografar"', '"fechar"']} isDark={isDark} />
            </div>
          </>
        )}

        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Lendo QR Code...</p>
          </div>
        )}

        {stage === 'result' && qrResult && (
          <div className="flex flex-col gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <Check className="w-4 h-4 shrink-0" />QR Code lido com sucesso!
            </div>

            <div className={`p-3 rounded-xl text-sm break-all ${isDark ? 'bg-slate-900/60 text-slate-200' : 'bg-gray-50 text-gray-800'}`}>
              {qrResult}
            </div>

            {resultQrUrl && (
              <div className="flex flex-col items-center gap-2">
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Escaneie para acessar no seu celular:</p>
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
              {isUrl(qrResult) && (
                <a href={qrResult} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700">
                  <ExternalLink className="w-4 h-4" />Abrir link
                </a>
              )}
            </div>

            <button onClick={handleReset} className={`flex items-center justify-center gap-2 py-2 rounded-xl text-sm ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}>
              <RefreshCw className="w-4 h-4" />Nova leitura
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

            <VoiceHint commands={['"copiar"', '"nova leitura"', '"repetir"', ...(googleConnected ? ['"enviar email"'] : []), '"fechar"']} isDark={isDark} />

            <div className={`h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }} />
            </div>
            <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Fechando em {timeLeft}s</p>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col gap-4">
            <div className={`px-3 py-3 rounded-xl text-sm ${isDark ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>{errorMsg}</div>
            <button onClick={handleReset} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700">
              <RefreshCw className="w-4 h-4" />Tentar novamente
            </button>
            <button onClick={onClose} className={`py-2 rounded-xl text-sm ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}>Fechar</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}