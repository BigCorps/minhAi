'use client';

import { useState, useEffect } from 'react';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { createPortal } from 'react-dom';
import { X, Wind, Droplets, Thermometer, MapPin, AlertCircle } from 'lucide-react';

interface ClimaTempoDisplayProps {
  data: { companyId: string; city?: string | null };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText: (text: string) => Promise<void>;
}

interface CurrentWeather {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  rain_chance: number;
}

interface ForecastDay {
  date: string;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  rain_chance: number;
}

interface WeatherData {
  city: string;
  current: CurrentWeather;
  forecast: ForecastDay[];
  unit: string;
}

const AUTO_CLOSE_SECONDS = 40;

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatWeekday(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return WEEKDAYS[date.getDay()];
}

function getWeatherEmoji(icon: string) {
  if (icon.includes('01')) return '☀️';
  if (icon.includes('02')) return '🌤️';
  if (icon.includes('03')) return '⛅';
  if (icon.includes('04')) return '☁️';
  if (icon.includes('09') || icon.includes('10')) return '🌧️';
  if (icon.includes('11')) return '⛈️';
  if (icon.includes('13')) return '❄️';
  if (icon.includes('50')) return '🌫️';
  return '🌡️';
}

export default function ClimaTempoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: ClimaTempoDisplayProps) {
  const { companyId, city: initialCity } = data;

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_SECONDS);
  const [searchCity, setSearchCity] = useState(initialCity || '');
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-gray-50';

  // ── Buscar clima ─────────────────────────────────────────────
  const fetchWeather = async (cityName?: string, lat?: number, lon?: number) => {
    setLoading(true);
    setError(null);

    try {
      const body: any = { unit: 'metric' };
      if (lat && lon) { body.lat = lat; body.lon = lon; }
      else if (cityName) { body.city = cityName; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clima-tempo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Erro ao buscar clima');
      }

      setWeatherData(json);
      setTimeLeft(AUTO_CLOSE_SECONDS);

      // Falar o clima atual
      const desc = json.current.description;
      const temp = json.current.temp;
      const rain = json.current.rain_chance;
      const speech =
        `Em ${json.city}, agora são ${temp} graus, ${desc}. ` +
        (rain > 50 ? `Chance de chuva de ${rain} porcento. ` : '') +
        `Mínima de ${json.current.temp_min} e máxima de ${json.current.temp_max} graus.`;

      playText(speech).catch(() => {});

    } catch (err: any) {
      const msg = err.message?.includes('não encontrada')
        ? `Cidade não encontrada. Tente novamente.`
        : 'Não foi possível buscar o clima. Verifique sua conexão.';
      setError(msg);
      playText(msg).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  async function init() {
    // Se o handler já passou uma cidade via prop, usa ela
    if (initialCity) { fetchWeather(initialCity); return; }

    // Buscar config salva no banco
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/company_function_settings?company_id=eq.${companyId}&function_key=eq.clima_tempo&select=config`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      }
    );
    const rows = await res.json();
    const config = rows?.[0]?.config;

    if (config?.mode === 'fixed' && config?.default_city) {
      fetchWeather(config.default_city);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(undefined, pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather('São Paulo')
      );
    } else {
      fetchWeather('São Paulo');
    }
  }
  init();
}, []);

  // ── Auto-close ───────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose]);

  // ── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // ── Toast ────────────────────────────────────────────────────
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ── Comandos de voz ──────────────────────────────────────────
  useModalVoiceCommand({
    active: true,
    onTranscript: (transcript) => {
      const t = transcript
        .toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?;:]+/g, '');

      // Fechar
      if (['fechar', 'cancelar', 'sair', 'voltar', 'encerrar'].some(cmd => t.includes(cmd))) {
        onClose();
        return;
      }

      // Repetir
      if (['repetir', 'repete', 'de novo', 'nao ouvi', 'nao entendi'].some(cmd => t.includes(cmd))) {
        if (weatherData) {
          const speech =
            `Em ${weatherData.city}, agora são ${weatherData.current.temp} graus, ${weatherData.current.description}.`;
          playText(speech).catch(() => {});
        }
        return;
      }

      // Buscar cidade: "tempo em São Paulo", "clima em Rio"
      const cityMatch = t.match(/(?:tempo em|clima em|previsao em|temperatura em)\s+(.+)/);
      if (cityMatch) {
        const city = cityMatch[1].trim();
        setSearchCity(city);
        fetchWeather(city);
        return;
      }
    },
  });

  const handleSearch = () => {
    if (searchCity.trim()) fetchWeather(searchCity.trim());
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3
          ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-amber-400'}
          animate-in slide-in-from-top duration-300`}>
          <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
          <p className="text-white font-semibold text-sm">{toast.message}</p>
        </div>
      )}

<div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${bg} ${border}
  animate-in zoom-in-95 duration-300 flex flex-col`}>

  {/* Header */}
  <div className={`px-6 py-4 border-b ${border} ${isDark ? 'bg-blue-950/40' : 'bg-blue-50'} flex-shrink-0`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-xl">
          🌤️
        </div>
        <div>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Clima e Tempo</h2>
          <p className={`text-sm ${textMuted}`}>
            {weatherData ? weatherData.city : 'Buscando localização...'}
          </p>
        </div>
      </div>
      <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
        <X className={`w-5 h-5 ${textMuted}`} />
      </button>
    </div>
  </div>

  {/* Busca */}
  <div className={`px-6 pt-4 pb-2 flex-shrink-0`}>
    <div className="flex gap-2">
      <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border ${border} ${cardBg}`}>
        <MapPin className={`w-4 h-4 flex-shrink-0 ${textMuted}`} />
        <input
          type="text"
          value={searchCity}
          onChange={(e) => setSearchCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder='Ex: "Rio de Janeiro"'
          className={`flex-1 bg-transparent text-sm outline-none ${textPrimary}`}
        />
      </div>
      <button
        onClick={handleSearch}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition"
      >
        Buscar
      </button>
    </div>
  </div>

  {/* Loading */}
  {loading && (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className={`text-sm ${textMuted}`}>Buscando clima...</p>
    </div>
  )}

  {/* Erro */}
  {!loading && error && (
    <div className={`mx-6 my-4 p-4 rounded-xl border ${isDark ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'} text-sm text-center`}>
      {error}
    </div>
  )}

  {/* Conteúdo em 2 colunas no desktop */}
  {!loading && weatherData && (
    <div className="px-6 pb-4 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">

      {/* Coluna esquerda: clima atual */}
      <div className={`p-5 rounded-2xl ${isDark ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-50 border border-blue-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className={`text-6xl font-bold ${textPrimary}`}>
              {weatherData.current.temp}°
            </div>
            <div className={`text-sm capitalize mt-1 ${textMuted}`}>
              {weatherData.current.description}
            </div>
            <div className={`text-xs mt-0.5 ${textMuted}`}>
              Sensação: {weatherData.current.feels_like}°
            </div>
          </div>
          <div className="text-7xl">
            {getWeatherEmoji(weatherData.current.icon)}
          </div>
        </div>

        {/* Min/Máx */}
        <div className={`flex justify-center gap-4 text-sm ${textMuted} mb-3`}>
          <span>↓ {weatherData.current.temp_min}°</span>
          <span>↑ {weatherData.current.temp_max}°</span>
        </div>

        {/* Detalhes */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`flex flex-col items-center gap-1 p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className={`text-xs ${textMuted}`}>Umidade</span>
            <span className={`text-sm font-semibold ${textPrimary}`}>{weatherData.current.humidity}%</span>
          </div>
          <div className={`flex flex-col items-center gap-1 p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
            <Wind className="w-4 h-4 text-cyan-400" />
            <span className={`text-xs ${textMuted}`}>Vento</span>
            <span className={`text-sm font-semibold ${textPrimary}`}>{weatherData.current.wind_speed} km/h</span>
          </div>
          <div className={`flex flex-col items-center gap-1 p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
            <Thermometer className="w-4 h-4 text-orange-400" />
            <span className={`text-xs ${textMuted}`}>Chuva</span>
            <span className={`text-sm font-semibold ${textPrimary}`}>{weatherData.current.rain_chance}%</span>
          </div>
        </div>
      </div>

      {/* Coluna direita: previsão + hint */}
      <div className="flex flex-col gap-3">
        {weatherData.forecast.length > 0 && (
          <div className={`rounded-2xl border ${border} ${cardBg} overflow-hidden flex-1`}>
            <p className={`px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>
              Próximos dias
            </p>
            <div className="divide-y divide-white/5">
              {weatherData.forecast.map((day) => (
                <div key={day.date} className="flex items-center justify-between px-4 py-2">
                  <span className={`text-sm font-medium w-10 ${textPrimary}`}>
                    {formatWeekday(day.date)}
                  </span>
                  <span className="text-lg">{getWeatherEmoji(day.icon)}</span>
                  <span className={`text-xs capitalize flex-1 mx-2 truncate ${textMuted}`}>
                    {day.description}
                  </span>
                  {day.rain_chance > 20 && (
                    <span className="text-xs text-blue-400 mr-1">{day.rain_chance}%💧</span>
                  )}
                  <span className={`text-sm font-medium ${textPrimary}`}>
                    {day.temp_min}°/{day.temp_max}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hint de voz */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
          <span>🎤</span>
          <span>Diga <strong>"clima em [cidade]"</strong>, <strong>"repetir"</strong> ou <strong>"fechar"</strong></span>
        </div>
      </div>
    </div>
  )}

  {/* Barra de auto-close */}
  <div className={`h-1 flex-shrink-0 ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
    <div
      className="h-full bg-blue-500 transition-all duration-1000"
      style={{ width: `${(timeLeft / AUTO_CLOSE_SECONDS) * 100}%` }}
    />
  </div>
</div>
    </div>,
    document.body
  );
}
