'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Loader2, Wifi, WifiOff, Thermometer, Wind, Lightbulb, Tv, Speaker } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useModalVoiceClose } from '@/components/VoiceAssistant/hooks/useModalVoiceClose';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

interface SmartDevice {
  id: string;
  type: string;
  displayName: string;
  online: boolean;
  traits: Record<string, any>;
}

interface AparelhosSmartDisplayProps {
  data: { companyId: string; transcript?: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

const AUTO_CLOSE = 60;

function getDeviceIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('thermostat')) return <Thermometer className="w-6 h-6" />;
  if (t.includes('fan')) return <Wind className="w-6 h-6" />;
  if (t.includes('light') || t.includes('lamp')) return <Lightbulb className="w-6 h-6" />;
  if (t.includes('display') || t.includes('tv')) return <Tv className="w-6 h-6" />;
  if (t.includes('speaker') || t.includes('audio')) return <Speaker className="w-6 h-6" />;
  return <Wifi className="w-6 h-6" />;
}

function getDeviceColor(type: string) {
  const t = type.toLowerCase();
  if (t.includes('thermostat')) return '#FF6B6B';
  if (t.includes('fan')) return '#4ECDC4';
  if (t.includes('light') || t.includes('lamp')) return '#FFE66D';
  if (t.includes('display') || t.includes('tv')) return '#A8E6CF';
  return '#95E1D3';
}

export default function AparelhosSmartDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: AparelhosSmartDisplayProps) {
  const { companyId } = data;

  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const hasClosedRef = useRef(false);
  const isDark = theme === 'dark';

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-home-devices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ company_id: companyId, action: 'list' }),
        }
      );
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Erro ao buscar dispositivos');
      setDevices(json.devices || []);
      if (json.devices?.length === 0) {
        playText('Nenhum dispositivo encontrado na conta Google.').catch(() => {});
      } else {
        playText(`${json.devices.length} dispositivos encontrados.`).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message);
      playText('Não consegui acessar os dispositivos Smart Home.').catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  // Auto-close
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose]);

  // Cleanup
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // Toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const sendCommand = async (deviceId: string, command: string, params: any = {}) => {
    setActionLoading(deviceId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-home-devices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ company_id: companyId, action: 'command', device_id: deviceId, command, params }),
        }
      );
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error);
      setToast('Comando enviado!');
      setTimeout(fetchDevices, 1500);
    } catch (err: any) {
      setToast('Erro ao executar comando.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = () => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    window.speechSynthesis.cancel();
    onClose();
  };

  useModalVoiceClose(handleClose);

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = transcript.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?;:]+/g, '');

      if (['fechar', 'cancelar', 'sair'].some(c => t.includes(c))) { handleClose(); return; }
      if (['atualizar', 'recarregar', 'refresh'].some(c => t.includes(c))) { fetchDevices(); return; }

      // Ligar/desligar por nome
      devices.forEach(device => {
        const name = device.displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (t.includes(name)) {
          if (['ligar', 'ativar', 'acender', 'on'].some(c => t.includes(c))) {
            sendCommand(device.id, 'sdm.devices.commands.ThermostatMode.SetMode', { mode: 'HEAT' });
          } else if (['desligar', 'apagar', 'off'].some(c => t.includes(c))) {
            sendCommand(device.id, 'sdm.devices.commands.ThermostatMode.SetMode', { mode: 'OFF' });
          }
        }
      });
    },
  });

  const isDarkMode = isDark;
  const bg = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const border = isDarkMode ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDarkMode ? 'bg-slate-800' : 'bg-gray-50';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl bg-green-500 animate-in slide-in-from-top duration-300">
          <p className="text-white font-semibold text-sm">{toast}</p>
        </div>
      )}

      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border} flex flex-col animate-in zoom-in-95 duration-300`}>

        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-xl">
                🏠
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Aparelhos Smart</h2>
                <p className={`text-sm ${textMuted}`}>
                  {loading ? 'Buscando dispositivos...' : `${devices.length} dispositivo${devices.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className={`w-5 h-5 ${textMuted}`} />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5 overflow-y-auto max-h-[60vh] flex-shrink-0">

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
              <p className={`text-sm ${textMuted}`}>Buscando dispositivos...</p>
            </div>
          )}

          {!loading && error && (
            <div className={`p-4 rounded-xl border text-sm text-center ${
              isDarkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}

          {!loading && devices.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">🔌</p>
              <p className={`${textMuted} text-sm`}>Nenhum dispositivo encontrado.</p>
              <p className={`${textMuted} text-xs mt-1`}>Certifique-se de ter dispositivos Google Home configurados.</p>
            </div>
          )}

          {!loading && devices.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {devices.map(device => (
                <div
                  key={device.id}
                  className={`p-4 rounded-xl border ${cardBg} ${border} relative overflow-hidden`}
                >
                  {/* Indicador online */}
                  <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                    device.online ? 'bg-green-400' : 'bg-gray-400'
                  }`} />

                  {/* Ícone e nome */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white"
                    style={{ backgroundColor: getDeviceColor(device.type) + '33', color: getDeviceColor(device.type) }}
                  >
                    {getDeviceIcon(device.type)}
                  </div>

                  <p className={`text-sm font-semibold truncate ${textPrimary} mb-1`}>
                    {device.displayName}
                  </p>
                  <p className={`text-xs ${textMuted} mb-3`}>
                    {device.online ? 'Online' : 'Offline'}
                  </p>

                  {/* Ações baseadas no tipo */}
                  <div className="flex gap-2">
                    {device.online && (
                      <>
                        {/* Ligar */}
                        <button
                          onClick={() => sendCommand(device.id, 'sdm.devices.commands.ThermostatMode.SetMode', { mode: 'HEAT' })}
                          disabled={actionLoading === device.id}
                          className="flex-1 py-1.5 text-xs rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition disabled:opacity-50"
                        >
                          {actionLoading === device.id ? '...' : 'Ligar'}
                        </button>
                        {/* Desligar */}
                        <button
                          onClick={() => sendCommand(device.id, 'sdm.devices.commands.ThermostatMode.SetMode', { mode: 'OFF' })}
                          disabled={actionLoading === device.id}
                          className="flex-1 py-1.5 text-xs rounded-lg bg-red-500/80 hover:bg-red-600 text-white font-medium transition disabled:opacity-50"
                        >
                          Desligar
                        </button>
                      </>
                    )}
                    {!device.online && (
                      <p className={`text-xs ${textMuted} text-center w-full`}>Dispositivo offline</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão atualizar */}
          {!loading && (
            <button
              onClick={fetchDevices}
              className={`mt-4 w-full py-2 text-xs rounded-xl transition ${
                isDarkMode ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              🔄 Atualizar dispositivos
            </button>
          )}

          {/* Hint de voz */}
          <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
            isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
          }`}>
            <span>🎤</span>
            <span>Diga <strong>"ligar [dispositivo]"</strong>, <strong>"desligar [dispositivo]"</strong> ou <strong>"fechar"</strong></span>
          </div>
        </div>

        {/* Barra de auto-close */}
        <div className={`h-1 flex-shrink-0 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-green-500 transition-all duration-1000"
            style={{ width: `${(timeLeft / AUTO_CLOSE) * 100}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
