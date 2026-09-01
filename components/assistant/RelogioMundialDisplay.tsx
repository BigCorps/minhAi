'use client';

// ============================================================
// RelogioMundialDisplay.tsx
// A fala "Essas são as principais horas..." é feita pelo
// handler via playText ANTES de abrir o modal.
// Este componente NÃO fala nada por conta própria.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
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

export default function RelogioMundialDisplay({ data, onClose, theme, playText }: Props) {
  const isDark = theme === 'dark';
  const [tick, setTick] = useState(0);
  const [countdown, setCountdown] = useState(20);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    onClose();
  };

  useEffect(() => {
    // Fala ao abrir usando a voz do assistente
    playText?.('Aqui estão as principais horas ao redor do mundo.').catch(() => {});

    // Tick para atualizar os relógios a cada segundo
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);

    // Auto-close em 20 segundos
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
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>

      {/* max-w-sm em pé no mobile | max-w-4xl deitado no desktop */}
      <div className={`relative w-full rounded-3xl shadow-2xl overflow-hidden
        max-w-sm md:max-w-4xl
        ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Cabeçalho */}
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
            <button onClick={handleClose}
              className="text-white/70 hover:text-white text-2xl font-bold leading-none">✕</button>
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
                    <p className={`text-sm font-bold leading-tight truncate
                      ${isDark ? 'text-white' : 'text-gray-900'}`}>{cidade}</p>
                    <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{pais}</p>
                  </div>
                  <span className="text-base flex-shrink-0">{isDay ? '☀️' : '🌙'}</span>
                </div>
                <p className={`font-mono text-2xl font-bold tabular-nums
                  ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{time}</p>
                <p className={`text-xs mt-0.5 capitalize ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{date}</p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
