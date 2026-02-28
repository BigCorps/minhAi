'use client';

// ============================================================
// CronometroDisplay.tsx — VERSÃO CORRIGIDA
// - Sem emoji no título
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  data: { companyId: string };
  onClose: () => void;
  theme: 'dark' | 'light';
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export default function CronometroDisplay({ data, onClose, theme }: Props) {
  const isDark = theme === 'dark';
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [stopped, setStopped] = useState(false);
  const [countdown, setCountdown] = useState(15);

  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const finalTimeRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  useEffect(() => {
    const handleStopEvent = () => handleStop();
    window.addEventListener('eai:cronometro:stop', handleStopEvent);
    return () => window.removeEventListener('eai:cronometro:stop', handleStopEvent);
  }, [elapsed]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleStop = () => {
    if (stopped) return;
    finalTimeRef.current = elapsed;
    setRunning(false);
    setStopped(true);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const totalSeconds = Math.floor(finalTimeRef.current / 1000);
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    let speechText = 'Cronômetro finalizado. Tempo: ';
    if (min > 0) speechText += `${min} minuto${min !== 1 ? 's' : ''} e `;
    speechText += `${sec} segundo${sec !== 1 ? 's' : ''}.`;

    const msg = new SpeechSynthesisUtterance(speechText);
    msg.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);

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
    window.speechSynthesis.cancel();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    onClose();
  };

  const displayTime = stopped ? formatTime(finalTimeRef.current) : formatTime(elapsed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
      <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Cabeçalho sem emoji */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-6 text-center">
          <h2 className="text-xl font-bold text-white">
            {stopped ? 'Cronômetro Finalizado' : 'Cronômetro'}
          </h2>
          {!stopped && (
            <p className="text-white/70 text-sm mt-1">Diga "finalizar cronômetro" para parar</p>
          )}
        </div>

        <button onClick={handleClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10">✕</button>

        <div className="p-8 text-center">
          <div className={`font-mono text-5xl font-bold mb-2 transition-all
            ${stopped ? 'animate-pulse text-blue-400 scale-110' : isDark ? 'text-white' : 'text-gray-900'}`}
            style={{ letterSpacing: '0.05em' }}>
            {displayTime}
          </div>

          {!stopped ? (
            <>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Contando...</span>
              </div>
              <button onClick={handleStop}
                className="mt-6 w-full py-3 rounded-xl border-2 border-blue-500 text-blue-400 font-bold hover:bg-blue-500/10 transition">
                Parar
              </button>
            </>
          ) : (
            <div className="mt-4 space-y-3">
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Fechando em <span className="font-bold text-blue-400">{countdown}s</span>
              </p>
              <button onClick={handleClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold hover:opacity-90 transition">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
