'use client';

// ============================================================
// AlarmeDisplay.tsx — VERSÃO CORRIGIDA
// - Sem emoji no título
// - Se cliente já especificou horário por voz:
//   salva automaticamente e fecha em 3 segundos
// - Modal de alarming: fecha em 10s com countdown
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  data: {
    companyId: string;
    targetTime?: string;
    label?: string;
    isAlarming?: boolean;
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
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function AlarmeDisplay({ data, onClose, theme }: Props) {
  const isDark = theme === 'dark';
  const { targetTime, label, isAlarming: initialAlarming = false } = data;

  const [remaining, setRemaining] = useState(0);
  const [isAlarming, setIsAlarming] = useState(initialAlarming);
  const [autoSaved, setAutoSaved] = useState(false);
  const [alarmCountdown, setAlarmCountdown] = useState(10);

  const [formHora, setFormHora] = useState('');
  const [formLabel, setFormLabel] = useState(label ?? '');
  const [saved, setSaved] = useState(!!targetTime);
  const [actualTarget, setActualTarget] = useState(targetTime ?? null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmingRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    window.speechSynthesis.cancel();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (alarmingRef.current) clearInterval(alarmingRef.current);
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    onClose();
  };

  // ── Auto-save se cliente já especificou horário por voz ───
  useEffect(() => {
    if (targetTime && !initialAlarming) {
      const alarmes = JSON.parse(localStorage.getItem('eai_alarmes') ?? '[]');
      alarmes.push({ id: Date.now(), label: label || 'Alarme', targetTime });
      localStorage.setItem('eai_alarmes', JSON.stringify(alarmes));
      window.dispatchEvent(new Event('eai:alarme:saved'));

      setActualTarget(targetTime);
      setSaved(true);
      setAutoSaved(true);

      // Fecha em 3 segundos
      autoCloseRef.current = setTimeout(() => handleClose(), 3000);
      return;
    }

    if (initialAlarming) triggerAlarm();
  }, []);

  // ── Tick de contagem regressiva (só para formulário manual salvo) ──
  useEffect(() => {
    if (!actualTarget || isAlarming || autoSaved) return;

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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [actualTarget, isAlarming, autoSaved]);

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alarmingRef.current) clearInterval(alarmingRef.current);
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  const triggerAlarm = () => {
    setIsAlarming(true);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const speechLabel = formLabel || label || 'Alarme';
    const msg = new SpeechSynthesisUtterance(`Atenção! ${speechLabel}. Seu alarme está tocando!`);
    msg.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);

    let count = 10;
    alarmingRef.current = setInterval(() => {
      count--;
      setAlarmCountdown(count);
      if (count <= 0) {
        if (alarmingRef.current) clearInterval(alarmingRef.current);
        handleClose();
      }
    }, 1000);
  };

  const handleSave = () => {
    if (!formHora) return;
    const [hh, mm] = formHora.split(':').map(Number);
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    const alarmes = JSON.parse(localStorage.getItem('eai_alarmes') ?? '[]');
    alarmes.push({ id: Date.now(), label: formLabel || 'Alarme', targetTime: target.toISOString() });
    localStorage.setItem('eai_alarmes', JSON.stringify(alarmes));
    window.dispatchEvent(new Event('eai:alarme:saved'));

    setActualTarget(target.toISOString());
    setSaved(true);
  };

  // ── Render: TOCANDO ───────────────────────────────────────
  if (isAlarming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
          ${isDark ? 'bg-slate-900 border border-red-500/40' : 'bg-white border border-red-200'}`}>

          <div className="bg-gradient-to-r from-red-600 to-orange-500 p-8 text-center animate-pulse">
            <h2 className="text-2xl font-bold text-white">Alarme</h2>
            {(formLabel || label) && (
              <p className="text-white/80 mt-1 text-sm">{formLabel || label}</p>
            )}
          </div>

          <button onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10">✕</button>

          <div className="p-8 text-center">
            <div className={`text-5xl font-mono font-bold mb-6
              ${alarmCountdown <= 3 ? 'text-red-500 animate-bounce' : isDark ? 'text-red-400' : 'text-red-600'}`}>
              {alarmCountdown}s
            </div>
            <button onClick={handleClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-lg hover:opacity-90 transition">
              Desligar Alarme
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: AUTO-SALVO (cliente especificou horário por voz) ──
  if (autoSaved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
        <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
          ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

          <div className="bg-gradient-to-r from-red-600 to-rose-500 p-6">
            <h2 className="text-xl font-bold text-white">Alarme Criado</h2>
          </div>

          <button onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10">✕</button>

          <div className="p-8 text-center space-y-3">
            <div className={`text-xs uppercase font-semibold tracking-wider ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Alarme para
            </div>
            <div className={`font-mono text-5xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              {targetTime ? formatTargetTime(targetTime) : formHora}
            </div>
            {(label || formLabel) && (
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{label || formLabel}</p>
            )}
            <p className={`text-xs pt-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
              Fechando automaticamente...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: FORMULÁRIO MANUAL ─────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
      <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Cabeçalho sem emoji */}
        <div className="bg-gradient-to-r from-red-600 to-rose-500 p-6">
          <h2 className="text-xl font-bold text-white">{saved ? 'Alarme Configurado' : 'Criar Alarme'}</h2>
          {!saved && <p className="text-white/70 text-sm mt-1">Defina o horário do alarme</p>}
        </div>

        <button onClick={handleClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10">✕</button>

        <div className="p-6">
          {!saved ? (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  Nome do alarme (opcional)
                </label>
                <input type="text" value={formLabel} onChange={e => setFormLabel(e.target.value)}
                  placeholder="Ex: Reunião, Remédio..."
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-red-400
                    ${isDark ? 'bg-slate-800 border-white/10 text-white placeholder-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Horário *</label>
                <input type="time" value={formHora} onChange={e => setFormHora(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-red-400
                    ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              </div>
              <button onClick={handleSave} disabled={!formHora}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold
                  disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition">
                Salvar Alarme
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className={`text-xs uppercase font-semibold tracking-wider ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Alarme para</div>
              <div className={`font-mono text-5xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {actualTarget ? formatTargetTime(actualTarget) : formHora}
              </div>
              {(formLabel || label) && (
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{formLabel || label}</p>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? 'bg-slate-800 text-white/60' : 'bg-gray-50 text-gray-500'}`}>
                Faltam <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCountdown(remaining)}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Alarme ativo</span>
              </div>
              <button onClick={handleClose}
                className={`w-full py-2.5 rounded-xl border text-sm font-medium transition
                  ${isDark ? 'border-white/10 text-white/40 hover:text-white/70' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}>
                Cancelar Alarme
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
