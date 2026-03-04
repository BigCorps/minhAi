'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wifi, Copy, Check, Lock } from 'lucide-react';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';

interface WifiQRCodeDisplayProps {
  data: {
    networkName: string;
    networkPassword: string;
    companyName?: string;
    autoCloseDuration?: number;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function WifiQRCodeDisplay({
  data,
  onClose,
  theme = 'dark',
}: WifiQRCodeDisplayProps) {
  const AUTO_CLOSE = data.autoCloseDuration ?? 30;
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copiedNet, setCopiedNet] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const { networkName, networkPassword, companyName } = data;

  // Regra 2: fechar manual cancela o áudio
  const handleManualClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleManualClose);

  // Regra 3: cleanup ao desmontar
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // Gerar string WiFi e QR Code
  useEffect(() => {
    if (networkName) {
      // Formato padrão Wi-Fi QR: WIFI:T:WPA;S:<ssid>;P:<password>;;
      const wifiString = `WIFI:T:WPA;S:${networkName};P:${networkPassword};;`;
      const size = 300;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(wifiString)}&margin=10`;
      setQrCodeUrl(url);
    }
  }, [networkName, networkPassword]);

  // Regra 1: auto-close sempre chamando onClose()
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

  const handleCopyNetwork = () => {
    navigator.clipboard.writeText(networkName);
    setCopiedNet(true);
    setTimeout(() => setCopiedNet(false), 2000);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(networkPassword);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const isDark = theme === 'dark';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300
          ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'}
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
              <Wifi className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Wi-Fi {companyName ? `· ${companyName}` : ''}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
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
        <div className="p-8">
          <div className="flex flex-col items-center gap-6">

            {/* QR Code */}
            <div className="p-3 rounded-2xl bg-white shadow-lg">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code Wi-Fi" className="w-48 h-48 object-contain" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
                </div>
              )}
            </div>

            <p className={`text-sm text-center ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Aponte a câmera do celular para o QR Code para conectar automaticamente
            </p>

            {/* Nome da Rede */}
            <div className={`w-full rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Wifi className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-medium mb-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Rede</p>
                    <p className={`text-base font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {networkName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCopyNetwork}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
                    ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-white hover:bg-gray-200 text-gray-900 border border-gray-300'}`}
                >
                  {copiedNet ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedNet ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Senha */}
            {networkPassword && (
              <div className={`w-full rounded-xl p-4 ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Lock className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-medium mb-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Senha</p>
                      <p className={`text-base font-semibold tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {networkPassword}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyPassword}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
                      ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-white hover:bg-gray-200 text-gray-900 border border-gray-300'}`}
                  >
                    {copiedPass ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedPass ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-orange-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
