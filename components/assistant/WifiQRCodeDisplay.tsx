'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wifi } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

interface WifiQRCodeDisplayProps {
  data: {
    networkName: string;
    networkPassword: string;
    companyName?: string;
    companyId?: string;
    autoCloseDuration?: number;
  };
  onClose: () => void;
  playText: (text: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

const OPENING_TEXT = 'Aqui está o QR Code do Wi-Fi. Aponte a câmera para conectar automaticamente. Diga fechar para sair.';

export default function WifiQRCodeDisplay({
  data,
  onClose,
  playText,
  theme = 'dark',
}: WifiQRCodeDisplayProps) {
  const AUTO_CLOSE = data.autoCloseDuration ?? 30;
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const { networkName, networkPassword, companyName, companyId } = data;

  const normalize = (text: string) =>
    text.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]+/g, '');

  const handleManualClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleManualClose);

  useEffect(() => {
    playText(OPENING_TEXT).catch(() => {});
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    if (networkName) {
      const wifiString = `WIFI:T:WPA;S:${networkName};P:${networkPassword};;`;
      const size = 400;
      const url = `/api/qrcode?size=${size}&data=${encodeURIComponent(wifiString)}&color=%23000080${companyId ? `&company_id=${companyId}` : ''}`;
      setQrCodeUrl(url);
    }
  }, [networkName, networkPassword]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.speechSynthesis.cancel();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose]);

useModalVoiceCommand({
  active: true,
  onTranscript: (transcript) => {
    const t = normalize(transcript);

    if (['fechar', 'cancelar', 'sair', 'voltar', 'encerrar'].some(cmd => t.includes(cmd))) {
      onClose();
      return;
    }

    if (['repetir', 'repete', 'de novo'].some(cmd => t.includes(cmd))) {
      playText(OPENING_TEXT).catch(() => {});
      return;
    }
  }
});

  const isDark = theme === 'dark';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300
          ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
              <Wifi className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Wi-Fi {companyName ? `· ${companyName}` : ''}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}>
              {timeLeft}s
            </div>
            <button
              onClick={handleManualClose}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-8 flex flex-col items-center gap-6">
          <div className="p-4 rounded-2xl bg-white shadow-lg">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code Wi-Fi" className="w-56 h-56 object-contain" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            )}
          </div>

          <p className={`text-sm text-center ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Aponte a câmera do celular para conectar automaticamente
          </p>
        </div>

        {/* Voice Hint */}
        <div className={`mx-6 mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
          <span>Diga <strong>"fechar"</strong> ou <strong>"repetir"</strong></span>
        </div>

        {/* Barra de progresso */}
        <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-green-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
