'use client';

// ============================================================
// RelogioMundialDisplay.tsx
// Caminho: components/assistant/RelogioMundialDisplay.tsx
//
// Comportamento:
// - Exibe as 8 principais horas mundiais em tempo real
// - Atualiza a cada segundo
// - Fala: "Essas são as principais horas atuais ao redor do mundo"
// - Fecha no X ou por comando de voz (stopEverything)
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme: 'dark' | 'light';
}

const CIDADES = [
  { cidade: 'São Paulo',    pais: 'Brasil',         emoji: '🇧🇷', timezone: 'America/Sao_Paulo'    },
  { cidade: 'Nova York',    pais: 'EUA',             emoji: '🇺🇸', timezone: 'America/New_York'      },
  { cidade: 'Los Angeles',  pais: 'EUA',             emoji: '🇺🇸', timezone: 'America/Los_Angeles'   },
  { cidade: 'Londres',      pais: 'Reino Unido',     emoji: '🇬🇧', timezone: 'Europe/London'         },
  { cidade: 'Paris',        pais: 'França',          emoji: '🇫🇷', timezone: 'Europe/Paris'          },
  { cidade: 'Dubai',        pais: 'Emirados Árabes', emoji: '🇦🇪', timezone: 'Asia/Dubai'            },
  { cidade: 'Tóquio',       pais: 'Japão',           emoji: '🇯🇵', timezone: 'Asia/Tokyo'            },
  { cidade: 'Sydney',       pais: 'Austrália',       emoji: '🇦🇺', timezone: 'Australia/Sydney'      },
];

function getLocalTime(timezone: string): { time: string; date: string; isDay: boolean } {
  const now = new Date();
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  const date = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(now);

  const hour = parseInt(time.split(':')[0]);
  const isDay = hour >= 6 && hour < 20;

  return { time, date, isDay };
}

export default function RelogioMundialDisplay({ data, onClose, theme }: Props) {
  const isDark = theme === 'dark';
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Atualiza a cada segundo ───────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Fala ao abrir ─────────────────────────────────────────
  useEffect(() => {
    const msg = new SpeechSynthesisUtterance(
      'Essas são as principais horas atuais ao redor do mundo.'
    );
    msg.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);

    return () => {
      window.speechSynthesis.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleClose = () => {
    window.speechSynthesis.cancel();
    if (intervalRef.current) clearInterval(intervalRef.current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
      <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="text-4xl mb-1">🌍</div>
          <h2 className="text-xl font-bold text-white">Relógio Mundial</h2>
          <p className="text-white/70 text-sm mt-1">
            Principais horas atuais ao redor do mundo
          </p>
        </div>

        {/* Botão X */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10"
        >✕</button>

        {/* Grid de cidades */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {CIDADES.map(({ cidade, pais, emoji, timezone }) => {
            const { time, date, isDay } = getLocalTime(timezone);
            return (
              <div
                key={timezone}
                className={`rounded-2xl p-4 border transition
                  ${isDark
                    ? 'bg-slate-800/60 border-white/5 hover:border-indigo-500/30'
                    : 'bg-gray-50 border-gray-100 hover:border-indigo-200'}`}
              >
                {/* Cidade + bandeira */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <p className={`text-sm font-bold leading-tight
                      ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {cidade}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      {pais}
                    </p>
                  </div>
                  {/* Dia / Noite */}
                  <span className="ml-auto text-base">{isDay ? '☀️' : '🌙'}</span>
                </div>

                {/* Horário */}
                <p className={`font-mono text-2xl font-bold tabular-nums
                  ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  {time}
                </p>
                <p className={`text-xs mt-0.5 capitalize
                  ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  {date}
                </p>
              </div>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className={`px-4 pb-4 text-center`}>
          <button
            onClick={handleClose}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition
              ${isDark
                ? 'border border-white/10 text-white/50 hover:text-white/80'
                : 'border border-gray-200 text-gray-400 hover:text-gray-600'}`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
