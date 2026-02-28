'use client';

// ============================================================
// RelogioMundialDisplay.tsx — VERSÃO CORRIGIDA
// - Layout deitado no desktop (4 colunas), em pé no mobile (2 colunas)
// - Sem emoji no título
// - Mantém emojis ☀️ 🌙 apenas nos cards
// - Fecha automaticamente em 20 segundos
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme: 'dark' | 'light';
}

const CIDADES = [
  { cidade: 'São Paulo',   pais: 'Brasil',         emoji: '🇧🇷', timezone: 'America/Sao_Paulo'  },
  { cidade: 'Nova York',   pais: 'EUA',             emoji: '🇺🇸', timezone: 'America/New_York'    },
  { cidade: 'Los Angeles', pais: 'EUA',             emoji: '🇺🇸', timezone: 'America/Los_Angeles' },
  { cidade: 'Londres',     pais: 'Reino Unido',     emoji: '🇬🇧', timezone: 'Europe/London'       },
  { cidade: 'Paris',       pais: 'França',          emoji: '🇫🇷', timezone: 'Europe/Paris'        },
  { cidade: 'Dubai',       pais: 'Emirados Árabes', emoji: '🇦🇪', timezone: 'Asia/Dubai'          },
  { cidade: 'Tóquio',      pais: 'Japão',           emoji: '🇯🇵', timezone: 'Asia/Tokyo'          },
  { cidade: 'Sydney',      pais: 'Austrália',       emoji: '🇦🇺', timezone: 'Australia/Sydney'    },
];

function getLocalTime(timezone: string) {
  const now = new Date();
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone, weekday: 'short', day: '2-digit', month: 'short',
  }).format(now);
  const hour = parseInt(time.split(':')[0]);
  return { time, date, isDay: hour >= 6 && hour < 20 };
}

export default function RelogioMundialDisplay({ data, onClose, theme }: Props) {
  const isDark = theme === 'dark';
  const [tick, setTick] = useState(0);
  const [countdown, setCountdown] = useState(20);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    window.speechSynthesis.cancel();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    onClose();
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);

    const msg = new SpeechSynthesisUtterance('Essas são as principais horas atuais ao redor do mundo.');
    msg.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);

    let count = 20;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        handleClose();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>

      {/* max-w-sm em pé no mobile | max-w-4xl deitado no desktop */}
      <div className={`relative w-full rounded-3xl shadow-2xl overflow-hidden
        max-w-sm md:max-w-4xl
        ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Cabeçalho — título sem emoji */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Relógio Mundial</h2>
            <p className="text-white/70 text-sm mt-0.5">Principais horas atuais ao redor do mundo</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-mono tabular-nums
              ${countdown <= 5 ? 'text-red-300 animate-pulse' : 'text-white/50'}`}>
              {countdown}s
            </span>
            <button onClick={handleClose} className="text-white/70 hover:text-white text-2xl font-bold leading-none">✕</button>
          </div>
        </div>

        {/* Grid: 2 cols mobile | 4 cols desktop */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {CIDADES.map(({ cidade, pais, emoji, timezone }) => {
            const { time, date, isDay } = getLocalTime(timezone);
            return (
              <div key={timezone}
                className={`rounded-2xl p-4 border transition
                  ${isDark
                    ? 'bg-slate-800/60 border-white/5 hover:border-indigo-500/30'
                    : 'bg-gray-50 border-gray-100 hover:border-indigo-200'}`}>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{cidade}</p>
                    <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{pais}</p>
                  </div>
                  {/* Apenas estes dois emojis são mantidos */}
                  <span className="text-base flex-shrink-0">{isDay ? '☀️' : '🌙'}</span>
                </div>

                <p className={`font-mono text-2xl font-bold tabular-nums
                  ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{time}</p>
                <p className={`text-xs mt-0.5 capitalize ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{date}</p>
              </div>
            );
          })}
        </div>

        <div className="px-4 pb-4">
          <button onClick={handleClose}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition border
              ${isDark ? 'border-white/10 text-white/50 hover:text-white/80' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
