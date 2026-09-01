'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
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
  provider?: 'google' | 'tuya'; // ✅ ETAPA 5
}

interface DeviceFAQ {
  id: string;
  question: string;
  answer: string;
  variations: string[];
  function_params: Record<string, any>;
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
  const [faqs, setFaqs] = useState<DeviceFAQ[]>([]);

  const hasClosedRef = useRef(false);
  const isDark = theme === 'dark';

  // ✅ ETAPA 5 — fetch paralelo Google + Tuya
  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const [googleRes, tuyaRes] = await Promise.allSettled([
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-home-devices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ company_id: companyId, action: 'list' }),
        }).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tuya-smart-home`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'list', company_id: companyId }),
        }).then(r => r.json()),
      ]);

      const googleDevices: SmartDevice[] =
        googleRes.status === 'fulfilled'
          ? (googleRes.value.devices ?? []).map((d: any) => ({ ...d, provider: 'google' as const }))
          : [];

      const tuyaDevices: SmartDevice[] =
        tuyaRes.status === 'fulfilled'
          ? (tuyaRes.value.devices ?? [])
          : [];

      const allDevices = [...googleDevices, ...tuyaDevices];
      setDevices(allDevices);

      if (allDevices.length === 0) {
        playText('Nenhum dispositivo encontrado.').catch(() => {});
      } else {
        playText(`${allDevices.length} dispositivos encontrados.`).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message);
      playText('Não consegui acessar os dispositivos Smart Home.').catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('faq_entries')
      .select('id, question, answer, variations, function_params')
      .eq('company_id', companyId)
      .eq('function_key', 'aparelhos_smart')
      .eq('is_active', true)
      .then(({ data }) => setFaqs((data as DeviceFAQ[]) ?? []));
  }, [companyId]);

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

  // ✅ ETAPA 5 — sendCommand roteado por provider
  const sendCommand = async (
    device: SmartDevice,
    commandData: { type: 'google' | 'tuya'; payload: any }
  ) => {
    setActionLoading(device.id);
    try {
      const isTuya = device.provider === 'tuya' || commandData.type === 'tuya';
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${isTuya ? 'tuya-smart-home' : 'smart-home-devices'}`;

      let body: string;
      if (isTuya) {
        body = JSON.stringify({
          action: 'command',
          company_id: companyId,
          device_id: device.id,
          commands: commandData.payload,
        });
      } else {
        // Google: precisa do access_token real
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        body = JSON.stringify({
          company_id: companyId,
          action: 'command',
          device_id: device.id,
          command: commandData.payload.command,
          params: commandData.payload.params ?? {},
        });
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
          },
          body,
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setToast('Comando enviado!');
        setTimeout(fetchDevices, 1500);
        return;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setToast('Comando enviado!');
      setTimeout(fetchDevices, 1500);
    } catch {
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

  // ✅ ETAPA 5 — executeFaqAction roteado por provider
  const executeFaqAction = async (faq: DeviceFAQ) => {
    const p = faq.function_params;
    if (!p?.device_id || !p?.command) return;
    setToast(`Executando: ${faq.question}`);

    // Encontra o device na lista para obter o provider atual
    const device = devices.find(d => d.id === p.device_id) ?? {
      id: p.device_id,
      type: '',
      displayName: p.device_name ?? '',
      online: true,
      traits: {},
      provider: (p.provider ?? 'google') as 'google' | 'tuya',
    };

    const isTuya = (p.provider ?? device.provider) === 'tuya';

    await sendCommand(
      device,
      isTuya
        ? { type: 'tuya', payload: [{ code: 'switch_1', value: p.command === 'turnOn' }] }
        : {
            type: 'google',
            payload: {
              command: 'sdm.devices.commands.ThermostatMode.SetMode',
              params: { mode: p.command === 'turnOn' ? 'HEAT' : 'OFF' },
            },
          }
    );
    if (faq.answer) await playText(faq.answer);
  };

  useModalVoiceClose(handleClose);

  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const normalize = (s: string) =>
        s.toLowerCase().trim()
         .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
         .replace(/[.,!?;:]+/g, '');
      const t = normalize(transcript);

      if (['fechar', 'cancelar', 'sair'].some(c => t.includes(c))) { handleClose(); return; }
      if (['atualizar', 'recarregar', 'refresh'].some(c => t.includes(c))) { fetchDevices(); return; }

      // ── 1. Checar FAQs vinculadas primeiro ──
      const matchedFaq = faqs.find(faq => {
        const terms = [faq.question, ...(faq.variations ?? [])].map(normalize);
        return terms.some(term => t.includes(term) || term.includes(t));
      });
      if (matchedFaq) { executeFaqAction(matchedFaq); return; }

      // ── 2. Fallback: Ligar/desligar pelo displayName ──
      // ✅ ETAPA 5 — payload correto por provider no fallback de voz
      devices.forEach(device => {
        const name = normalize(device.displayName);
        if (t.includes(name)) {
          if (['ligar', 'ativar', 'acender', 'on'].some(c => t.includes(c))) {
            sendCommand(
              device,
              device.provider === 'tuya'
                ? { type: 'tuya', payload: [{ code: 'switch_1', value: true }] }
                : { type: 'google', payload: { command: 'sdm.devices.commands.ThermostatMode.SetMode', params: { mode: 'HEAT' } } }
            );
          } else if (['desligar', 'apagar', 'off'].some(c => t.includes(c))) {
            sendCommand(
              device,
              device.provider === 'tuya'
                ? { type: 'tuya', payload: [{ code: 'switch_1', value: false }] }
                : { type: 'google', payload: { command: 'sdm.devices.commands.ThermostatMode.SetMode', params: { mode: 'OFF' } } }
            );
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
              <p className={`${textMuted} text-xs mt-1`}>Certifique-se de ter dispositivos Google Home ou Tuya configurados.</p>
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

                  {/* Badge provider */}
                  {device.provider === 'tuya' && (
                    <div className="absolute top-3 left-3">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                        Tuya
                      </span>
                    </div>
                  )}

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

                  {/* ✅ ETAPA 5 — Botões Ligar/Desligar roteados por provider */}
                  <div className="flex gap-2">
                    {device.online && (
                      <>
                        <button
                          onClick={() => sendCommand(
                            device,
                            device.provider === 'tuya'
                              ? { type: 'tuya', payload: [{ code: 'switch_1', value: true }] }
                              : { type: 'google', payload: { command: 'sdm.devices.commands.ThermostatMode.SetMode', params: { mode: 'HEAT' } } }
                          )}
                          disabled={actionLoading === device.id}
                          className="flex-1 py-1.5 text-xs rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition disabled:opacity-50"
                        >
                          {actionLoading === device.id ? '...' : 'Ligar'}
                        </button>
                        <button
                          onClick={() => sendCommand(
                            device,
                            device.provider === 'tuya'
                              ? { type: 'tuya', payload: [{ code: 'switch_1', value: false }] }
                              : { type: 'google', payload: { command: 'sdm.devices.commands.ThermostatMode.SetMode', params: { mode: 'OFF' } } }
                          )}
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

                  {/* ── Comandos de Voz (FAQs vinculadas) ── */}
                  {(() => {
                    const deviceFaqs = faqs.filter(
                      f => (f.function_params as any)?.device_id === device.id
                    );
                    if (deviceFaqs.length === 0) return null;
                    return (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className={`text-[9px] uppercase font-bold tracking-wide mb-1.5 ${textMuted}`}>
                          Comandos de Voz
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {deviceFaqs.map(faq => (
                            <button
                              key={faq.id}
                              onClick={() => executeFaqAction(faq)}
                              disabled={actionLoading === device.id}
                              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-green-500/10 hover:bg-green-500/25 text-green-400 transition disabled:opacity-40"
                            >
                              {faq.question}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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
              Atualizar dispositivos
            </button>
          )}

          {/* Hint de voz */}
          <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
            isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
          }`}>
            <span>Diga o nome de um <strong>Comando de Voz</strong>, <strong>"ligar [dispositivo]"</strong> ou <strong>"fechar"</strong></span>
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
