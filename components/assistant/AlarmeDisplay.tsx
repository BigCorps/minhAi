'use client';

// ============================================================
// AlarmeDisplay.tsx
// Caminho: components/assistant/AlarmeDisplay.tsx
//
// Comportamento:
// - Recebe targetTime (ISO string) ou apenas hora (HH:MM)
// - Mostra contagem regressiva até o alarme
// - Quando a hora chegar: abre modal, fala, pisca
// - Fecha no X ou por comando de voz
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  data: {
    companyId: string;
    targetTime?: string;   // ISO string da hora alvo
    label?: string;        // Ex: "7h da manhã"
    isAlarming?: boolean;  // true = já tocando
  };
  onClose: () => void;
  theme: 'dark' | 'light';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTargetTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AlarmeDisplay({ data, onClose, theme }: Props) {
  const isDark = theme === 'dark';
  const { targetTime, label, isAlarming: initialAlarming = false } = data;

  const [remaining, setRemaining] = useState(0);
  const [isAlarming, setIsAlarming] = useState(initialAlarming);
  const [savedManually, setSavedManually] = useState(false);

  // Formulário manual (quando não há targetTime pré-definido)
  const [formHora, setFormHora] = useState('');
  const [formLabel, setFormLabel] = useState(label ?? '');
  const [saved, setSaved] = useState(!!targetTime);
  const [actualTarget, setActualTarget] = useState(targetTime ?? null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [alarmCountdown, setAlarmCountdown] = useState(10);

  // ── Tick de contagem regressiva ───────────────────────────
  useEffect(() => {
    if (!actualTarget || isAlarming) return;

    const tick = () => {
      const rem = Math.max(0, new Date(actualTarget).getTime() - Date.now());
      setRemaining(rem);

      if (rem <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        triggerAlarm();
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [actualTarget, isAlarming]);

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alarmingIntervalRef.current) clearInterval(alarmingIntervalRef.current);
    };
  }, []);

  // ── Se já está alarming ao abrir ──────────────────────────
  useEffect(() => {
    if (initialAlarming) triggerAlarm();
  }, []);

  const triggerAlarm = () => {
    setIsAlarming(true);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Fala
    const speechLabel = formLabel || label || 'Alarme';
    const msg = new SpeechSynthesisUtterance(
      `Atenção! ${speechLabel}. Seu alarme está tocando!`
    );
    msg.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);

    // Countdown automático de 10s (conforme spec do alarme)
    let count = 10;
    alarmingIntervalRef.current = setInterval(() => {
      count--;
      setAlarmCountdown(count);
      if (count <= 0) {
        if (alarmingIntervalRef.current) clearInterval(alarmingIntervalRef.current);
        handleClose();
      }
    }, 1000);
  };

  const handleClose = () => {
    window.speechSynthesis.cancel();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (alarmingIntervalRef.current) clearInterval(alarmingIntervalRef.current);
    onClose();
  };

  const handleSave = () => {
    if (!formHora) return;

    const [hh, mm] = formHora.split(':').map(Number);
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);

    // Se horário já passou, agenda para amanhã
    if (target <= now) target.setDate(target.getDate() + 1);

    setActualTarget(target.toISOString());
    setSaved(true);
    setSavedManually(true);

    // Salva no localStorage
    const alarmes = JSON.parse(localStorage.getItem('eai_alarmes') ?? '[]');
    alarmes.push({
      id: Date.now(),
      label: formLabel || 'Alarme',
      targetTime: target.toISOString(),
    });
    localStorage.setItem('eai_alarmes', JSON.stringify(alarmes));
    // Acorda o watcher na mesma aba
    window.dispatchEvent(new Event('eai:alarme:saved'));
  };

  // ── Render: TOCANDO ───────────────────────────────────────
  if (isAlarming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
          ${isDark ? 'bg-slate-900 border border-red-500/40' : 'bg-white border border-red-200'}`}>

          {/* Cabeçalho pulsante */}
          <div className="bg-gradient-to-r from-red-600 to-orange-500 p-8 text-center animate-pulse">
            <div className="text-7xl mb-2">⏰</div>
            <h2 className="text-2xl font-bold text-white">Alarme!</h2>
            {(formLabel || label) && (
              <p className="text-white/80 mt-1 text-sm">{formLabel || label}</p>
            )}
          </div>

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10"
          >✕</button>

          <div className="p-8 text-center">
            <div className={`text-5xl font-mono font-bold mb-6
              ${alarmCountdown <= 3 ? 'text-red-500 animate-bounce' : isDark ? 'text-red-400' : 'text-red-600'}`}>
              {alarmCountdown}s
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-lg hover:opacity-90 transition"
            >
              Desligar Alarme
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: AGUARDANDO ────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
      <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-red-600 to-rose-500 p-6">
          <div className="text-4xl mb-1">⏰</div>
          <h2 className="text-xl font-bold text-white">
            {saved ? 'Alarme Configurado' : 'Criar Alarme'}
          </h2>
          {!saved && (
            <p className="text-white/70 text-sm mt-1">Defina o horário do alarme</p>
          )}
        </div>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10"
        >✕</button>

        <div className="p-6">
          {!saved ? (
            <div className="space-y-4">
              {/* Label */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  Nome do alarme (opcional)
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  placeholder="Ex: Reunião, Remédio..."
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-red-400
                    ${isDark
                      ? 'bg-slate-800 border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                />
              </div>

              {/* Hora */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  Horário *
                </label>
                <input
                  type="time"
                  value={formHora}
                  onChange={e => setFormHora(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-red-400
                    ${isDark
                      ? 'bg-slate-800 border-white/10 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!formHora}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold
                  disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
              >
                Salvar Alarme
              </button>
            </div>
          ) : (
            /* Aguardando o horário */
            <div className="text-center space-y-4">
              <div className={`text-xs uppercase font-semibold tracking-wider
                ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                Alarme para
              </div>
              <div className={`font-mono text-5xl font-bold
                ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {actualTarget ? formatTargetTime(actualTarget) : formHora}
              </div>
              {(formLabel || label) && (
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  {formLabel || label}
                </p>
              )}

              {/* Contagem até o alarme */}
              <div className={`rounded-2xl px-4 py-3 text-sm
                ${isDark ? 'bg-slate-800 text-white/60' : 'bg-gray-50 text-gray-500'}`}>
                ⏳ Faltam <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatCountdown(remaining)}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  Alarme ativo
                </span>
              </div>

              <button
                onClick={handleClose}
                className={`w-full py-2.5 rounded-xl border text-sm font-medium transition
                  ${isDark
                    ? 'border-white/10 text-white/40 hover:text-white/70'
                    : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
              >
                Cancelar Alarme
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
