'use client';

// ============================================================
// TemporizadorDisplay.tsx
// playText é recebido via prop e usado para avisar que o tempo acabou.
// Nenhum speechSynthesis direto neste componente.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  data: { companyId: string; durationMs: number; label?: string };
  onClose: () => void;
  theme: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function TemporizadorDisplay({ data, onClose, theme, playText }: Props) {
  const isDark = theme === 'dark';
  const { durationMs = 300000, label = '' } = data;

  const [remaining, setRemaining] = useState(durationMs);
  const [finished, setFinished] = useState(false);
  const [countdown, setCountdown] = useState(15);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number>(Date.now() + durationMs);

  const progress = Math.max(0, Math.min(1, remaining / durationMs));
  const circumference = 2 * Math.PI * 54;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const rem = Math.max(0, endTimeRef.current - Date.now());
      setRemaining(rem);
      if (rem <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        handleFinished();
      }
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleFinished = () => {
    setFinished(true);
    setRemaining(0);

    // Usa a voz Google TTS do assistente via playText
    const msg = label
      ? `Tempo esgotado! O temporizador de ${label} acabou.`
      : 'Tempo esgotado! O temporizador terminou.';
    playText?.(msg).catch(() => {});

    let count = 15;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        handleClose();
      }
    }, 1000);
  };

  const handleClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    onClose();
  };

  const ringColor = finished ? '#EF4444' : progress > 0.5 ? '#10B981' : progress > 0.2 ? '#F59E0B' : '#EF4444';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
      <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

        <div className={`p-6 text-center ${finished
          ? 'bg-gradient-to-r from-red-600 to-orange-500'
          : 'bg-gradient-to-r from-emerald-600 to-teal-500'}`}>
          <h2 className="text-xl font-bold text-white">
            {finished ? 'Tempo Esgotado' : `Temporizador${label ? `: ${label}` : ''}`}
          </h2>
        </div>

        <button onClick={handleClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10">✕</button>

        <div className="p-8 flex flex-col items-center">
          <div className="relative w-40 h-40 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none"
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth="8" />
              <circle cx="60" cy="60" r="54" fill="none"
                stroke={ringColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                className="transition-all duration-200" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono text-3xl font-bold
                ${finished ? 'text-red-400 animate-pulse' : isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatTime(remaining)}
              </span>
              {!finished && (
                <span className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>restante</span>
              )}
            </div>
          </div>

          {finished ? (
            <div className="w-full text-center space-y-3">
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Fechando em <span className="font-bold text-red-400">{countdown}s</span>
              </p>
              <button onClick={handleClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold hover:opacity-90 transition">
                Ok, entendido!
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: ringColor }} />
                <span className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Contagem em andamento</span>
              </div>
              <button onClick={handleClose}
                className={`mt-6 w-full py-2 rounded-xl border text-sm font-medium transition
                  ${isDark ? 'border-white/10 text-white/40 hover:text-white/70' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
