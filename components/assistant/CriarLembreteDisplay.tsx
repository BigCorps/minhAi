'use client';

// ============================================================
// CriarLembreteDisplay.tsx — VERSÃO CORRIGIDA
// - Sem emoji no título
// - Se cliente já passou título + dateTime por voz:
//   salva automaticamente e fecha em 3 segundos
// - Modal de alarming (quando o watcher dispara): fecha em 10s
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

interface LembreteData {
  titulo?: string;
  descricao?: string;
  dateTime?: string;
  isAlarming?: boolean;
}

interface Props {
  data: LembreteData;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export default function CriarLembreteDisplay({ data, onClose, theme }: Props) {
  const isDark = theme === 'dark';
  const autoCloseRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [isRinging, setIsRinging] = useState(data.isAlarming ?? false);
  const [saved, setSaved] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  const [formTitulo, setFormTitulo] = useState(data.titulo ?? '');
  const [formData, setFormData] = useState('');
  const [formHora, setFormHora] = useState('');

  const handleClose = () => {
    window.speechSynthesis.cancel();
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    onClose();
  };

  // ── Auto-save se cliente já especificou tudo por voz ──────
  useEffect(() => {
    if (data.titulo && data.dateTime && !isRinging) {
      const target = new Date(data.dateTime);
      const hh = String(target.getHours()).padStart(2, '0');
      const mm = String(target.getMinutes()).padStart(2, '0');

      setFormTitulo(data.titulo);
      setFormHora(`${hh}:${mm}`);
      setFormData(target.toISOString().split('T')[0]);

      // Salva imediatamente
      const lembretes = JSON.parse(localStorage.getItem('eai_lembretes') ?? '[]');
      lembretes.push({
        id: Date.now(),
        titulo: data.titulo,
        descricao: data.descricao ?? '',
        dateTime: data.dateTime,
      });
      localStorage.setItem('eai_lembretes', JSON.stringify(lembretes));
      window.dispatchEvent(new Event('eai:lembrete:saved'));

      setSaved(true);
      setAutoSaved(true);

      // Fecha em 3 segundos
      autoCloseRef.current = setTimeout(() => handleClose(), 3000);
    }
  }, []);

  // ── Modo alarming (watcher reabriu o modal) ───────────────
  useEffect(() => {
    if (!isRinging) return;

    const msg = new SpeechSynthesisUtterance(
      `Atenção! Lembrete: ${data.titulo ?? 'Evento sem título'}. ${data.descricao ?? ''}`
    );
    msg.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);

    let count = 10;
    const tick = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(tick);
        handleClose();
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [isRinging]);

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  const handleSave = () => {
    if (!formTitulo || !formHora) return;

    const now = new Date();
    const [hh, mm] = formHora.split(':').map(Number);
    const targetDate = formData
      ? new Date(`${formData}T${formHora}`)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);

    const lembretes = JSON.parse(localStorage.getItem('eai_lembretes') ?? '[]');
    lembretes.push({ id: Date.now(), titulo: formTitulo, descricao: '', dateTime: targetDate.toISOString() });
    localStorage.setItem('eai_lembretes', JSON.stringify(lembretes));
    window.dispatchEvent(new Event('eai:lembrete:saved'));

    setSaved(true);
    setTimeout(() => handleClose(), 2000);
  };

  // ── Render: tocando alarme ────────────────────────────────
  if (isRinging) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
        <div className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden
          ${isDark ? 'bg-slate-900 border border-amber-500/40' : 'bg-white border border-amber-200'}`}>

          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center animate-pulse">
            <h2 className="text-2xl font-bold text-white">Lembrete</h2>
          </div>

          <button onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10">✕</button>

          <div className="p-8 text-center">
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {data.titulo ?? 'Evento sem título'}
            </h3>
            {data.descricao && (
              <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{data.descricao}</p>
            )}
            <div className={`text-5xl font-mono font-bold mb-6
              ${countdown <= 3 ? 'text-red-500' : isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              {countdown}s
            </div>
            <button onClick={handleClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg hover:opacity-90 transition">
              Ok, entendido!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: auto-salvo (dados completos vindos por voz) ───
  if (autoSaved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
        <div className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
          ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6">
            <h2 className="text-xl font-bold text-white">Lembrete Criado</h2>
          </div>

          <button onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10">✕</button>

          <div className="p-8 text-center">
            <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formTitulo}
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {formHora && `Às ${formHora}`}{formData && ` · ${new Date(formData + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
            </p>
            <p className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
              Fechando automaticamente...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: formulário manual ─────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Cabeçalho sem emoji */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6">
          <h2 className="text-xl font-bold text-white">Criar Lembrete</h2>
          <p className="text-white/70 text-sm mt-1">Configure o lembrete e eu te aviso na hora certa</p>
        </div>

        <button onClick={handleClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10">✕</button>

        <div className="p-6 space-y-4">
          {saved ? (
            <div className="text-center py-8">
              <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Lembrete salvo!</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Você será avisado na hora marcada.</p>
            </div>
          ) : (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  O que devo lembrar? *
                </label>
                <input type="text" value={formTitulo} onChange={e => setFormTitulo(e.target.value)}
                  placeholder="Ex: Ligar para o João"
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-amber-400
                    ${isDark ? 'bg-slate-800 border-white/10 text-white placeholder-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Data (opcional)</label>
                  <input type="date" value={formData} onChange={e => setFormData(e.target.value)}
                    className={`w-full px-3 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-amber-400
                      ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Horário *</label>
                  <input type="time" value={formHora} onChange={e => setFormHora(e.target.value)}
                    className={`w-full px-3 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-amber-400
                      ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                </div>
              </div>

              <button onClick={handleSave} disabled={!formTitulo || !formHora}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold
                  disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition mt-2">
                Salvar Lembrete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
