'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';
import { useIsMobile } from '@/hooks/useIsMobile';
import { createClient } from '@/lib/supabase-browser';

// ============================================================================
// Paletas de cor (inline styles)
// ============================================================================

const DARK = {
  bg: '#1e293b',
  border: 'rgba(255,255,255,0.08)',
  cardBg: 'rgba(15,23,42,0.6)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.4)',
  inputBg: 'rgba(30,41,59,0.8)',
  inputBorder: 'rgba(255,255,255,0.1)',
  buttonPrimary: '#FFA500',
  buttonPrimaryHover: '#FF8C00',
  buttonSecondary: 'rgba(255,255,255,0.1)',
  buttonSecondaryHover: 'rgba(255,255,255,0.15)',
};

const LIGHT = {
  bg: '#ffffff',
  border: '#e2e8f0',
  cardBg: '#f8fafc',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  inputBg: '#f1f5f9',
  inputBorder: '#cbd5e1',
  buttonPrimary: '#FFA500',
  buttonPrimaryHover: '#FF8C00',
  buttonSecondary: '#e2e8f0',
  buttonSecondaryHover: '#cbd5e1',
};

// ============================================================================
// Interfaces
// ============================================================================

interface Props {
  data: {
    companyId: string;
    targetText?: string; // Texto já capturado via "criar nota sobre [assunto]"
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Stage = 'countdown' | 'recording' | 'editing' | 'saved';

// ============================================================================
// Componente
// ============================================================================

export default function CriarNotaDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const { companyId, targetText } = data;
  const supabase = createClient();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();
  const colors = isDark ? DARK : LIGHT;

  const [stage, setStage] = useState<Stage>(targetText ? 'editing' : 'countdown');
  const [countdown, setCountdown] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState(targetText || '');
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState(targetText || '');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recognitionRef = useRef<any>(null);
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null);
  const finalTranscriptRef = useRef<string>(targetText || '');

  // ── Mount: fala abertura ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    const openingText = targetText
      ? 'Nota capturada. Você pode editar o texto ou salvar.'
      : 'Vamos criar uma nota. Prepare-se para falar.';
    playText?.(openingText).catch(() => {});
  }, []);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && stage === 'countdown') {
      startRecording();
    }
  }, [countdown, stage]);

  // ── Toast auto-hide ───────────────────────────────────────────────────────
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (googleSpeechRef.current) {
        googleSpeechRef.current.stopRecording().catch(() => {});
        googleSpeechRef.current.disconnect();
      }
    };
  }, []);

  // ── Voice commands (stage editing) ────────────────────────────────────────
  useModalVoiceCommand({
    active: stage === 'editing',
    onTranscript: (transcript) => {
      const lower = transcript.toLowerCase().trim();
      if (lower.includes('salvar') || lower.includes('confirmar')) {
        handleSave();
      } else if (lower.includes('cancelar') || lower.includes('fechar')) {
        onClose();
      } else if (lower.includes('apagar') || lower.includes('limpar')) {
        setConteudo('');
        setTitulo('');
      }
    },
  });

  // ── Recording: Mobile ─────────────────────────────────────────────────────
  const startRecordingMobile = async () => {
    finalTranscriptRef.current = '';
    setIsRecording(true);

    const FIM_TRIGGERS = ['concluir', 'acabou', 'terminou', 'pronto', 'fim'];

    try {
      const gs = new GoogleSpeechWebSocket({
        onTranscript: (text, isFinal) => {
          if (!isFinal || !text.trim()) return;

          const lowerT = text
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[.,!?;:]+/g, '');

          const hasFim = FIM_TRIGGERS.some((t) => lowerT.endsWith(t) || lowerT === t);
          if (hasFim) {
            let cleaned = finalTranscriptRef.current;
            for (const t of FIM_TRIGGERS) {
              cleaned = cleaned.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
            }
            cleaned = cleaned.trim();
            finalTranscriptRef.current = cleaned;
            setTranscription(cleaned);
            setConteudo(cleaned);
            stopRecording();
            setStage('editing');
            return;
          }

          const isSoloTrigger = FIM_TRIGGERS.some((t) => lowerT === t);
          if (!isSoloTrigger) {
            let textToAdd = text.trim();
            for (const t of FIM_TRIGGERS) {
              textToAdd = textToAdd.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
            }
            textToAdd = textToAdd.trim();
            if (textToAdd) {
              finalTranscriptRef.current += textToAdd + ' ';
              setTranscription(finalTranscriptRef.current.trim());
            }
          }
        },
        onError: (err) => {
          console.error('❌ [Mobile] Erro gravação:', err);
          setIsRecording(false);
          setToast({ message: 'Erro ao capturar áudio', type: 'error' });
        },
        volumeThreshold: 0.03,
        silenceThreshold: 60,
      });

      googleSpeechRef.current = gs;
      await gs.connect();
      await gs.startRecording();
    } catch (err) {
      setIsRecording(false);
      setToast({ message: 'Erro ao iniciar gravação', type: 'error' });
    }
  };

  // ── Recording: Desktop ────────────────────────────────────────────────────
  const startRecordingDesktop = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setToast({ message: 'Navegador não suporta reconhecimento de voz', type: 'error' });
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    finalTranscriptRef.current = '';

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const FIM_TRIGGERS = ['concluir', 'acabou', 'terminou', 'pronto', 'fim'];
          const cleanedTranscript = transcript.trim();
          const lowerClean = cleanedTranscript
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[.,!?;:]+/g, '');

          const isSoloTrigger = FIM_TRIGGERS.some((t) => lowerClean === t);
          if (isSoloTrigger) {
            recognition.stop();
            return;
          }

          if (FIM_TRIGGERS.some((t) => lowerClean.endsWith(t))) {
            let textToAdd = cleanedTranscript;
            for (const t of FIM_TRIGGERS) {
              textToAdd = textToAdd.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
            }
            textToAdd = textToAdd.trim();
            if (textToAdd) finalTranscriptRef.current += textToAdd + ' ';
            recognition.stop();
            return;
          }

          let textToAdd = cleanedTranscript;
          for (const t of FIM_TRIGGERS) {
            textToAdd = textToAdd.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
          }
          textToAdd = textToAdd.trim();
          if (textToAdd) finalTranscriptRef.current += textToAdd + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      setTranscription(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onend = () => {
      setIsRecording(false);
      const FIM_TRIGGERS_CLEAN = ['fim', 'pronto', 'terminar', 'encerrar', 'concluir', 'acabou'];
      let cleaned = finalTranscriptRef.current;
      for (const t of FIM_TRIGGERS_CLEAN) {
        cleaned = cleaned.replace(new RegExp(`\\s*${t}\\s*$`, 'gi'), '');
      }
      cleaned = cleaned.trim();
      setTranscription(cleaned);
      setConteudo(cleaned);
      finalTranscriptRef.current = cleaned;

      if (cleaned) {
        setStage('editing');
      } else {
        setToast({ message: 'Nenhum áudio detectado', type: 'error' });
      }
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === 'no-speech') {
        setToast({ message: 'Nenhuma fala detectada', type: 'error' });
      } else if (event.error === 'not-allowed') {
        setToast({ message: 'Permissão do microfone negada', type: 'error' });
      } else {
        setToast({ message: 'Erro ao capturar áudio', type: 'error' });
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  // ── Start Recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    setStage('recording');
    if (isMobile) {
      await startRecordingMobile();
    } else {
      startRecordingDesktop();
    }
  };

  // ── Stop Recording ────────────────────────────────────────────────────────
  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (googleSpeechRef.current) {
      googleSpeechRef.current.stopRecording().catch(() => {});
      googleSpeechRef.current.disconnect();
      googleSpeechRef.current = null;
    }
    setIsRecording(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!conteudo.trim()) {
      setToast({ message: 'O conteúdo da nota não pode estar vazio', type: 'error' });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from('notas').insert({
        company_id: companyId,
        titulo: titulo.trim() || null,
        conteudo: conteudo.trim(),
      });

      if (error) throw error;

      // Cobrar crédito
      await supabase.rpc('decrement_credits', {
        p_company_id: companyId,
        p_amount: 1,
      });

      setStage('saved');
      playText?.('Nota salva com sucesso!').catch(() => {});
      setTimeout(() => onClose(), 2000);
    } catch (error: any) {
      console.error('Erro ao salvar nota:', error);
      setToast({ message: 'Erro ao salvar nota', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          style={{
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
          }}
        >
          <span className="text-white font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            borderBottom: `1px solid ${colors.border}`,
            background: colors.cardBg,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Ícone SVG inline */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: colors.buttonPrimary }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <div>
              <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                Criar Nota
              </h2>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                {stage === 'countdown' && 'Preparando gravação...'}
                {stage === 'recording' && 'Gravando áudio...'}
                {stage === 'editing' && 'Edite ou confirme sua nota'}
                {stage === 'saved' && 'Nota salva com sucesso!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition"
            style={{
              background: colors.buttonSecondary,
              color: colors.textPrimary,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.buttonSecondaryHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = colors.buttonSecondary)}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STAGE: Countdown */}
          {stage === 'countdown' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center animate-pulse"
                style={{ background: `${colors.buttonPrimary}20` }}
              >
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: `${colors.buttonPrimary}40` }}
                >
                  <span className="text-6xl font-bold" style={{ color: colors.textPrimary }}>
                    {countdown}
                  </span>
                </div>
              </div>
              <p className="text-lg font-medium mt-6" style={{ color: colors.textPrimary }}>
                Prepare-se para falar...
              </p>
            </div>
          )}

          {/* STAGE: Recording */}
          {stage === 'recording' && (
            <div className="space-y-6">
              <div
                className="p-4 rounded-lg border"
                style={{
                  background: `${colors.buttonPrimary}15`,
                  borderColor: `${colors.buttonPrimary}50`,
                }}
              >
                <p className="text-sm text-center font-medium" style={{ color: colors.textPrimary }}>
                  🎤 <strong>Gravando áudio...</strong> Diga <strong>"CONCLUIR"</strong> quando terminar
                </p>
              </div>

              {isRecording && (
                <div className="flex justify-center">
                  <div
                    className="flex items-center gap-3 px-6 py-3 rounded-full shadow-lg"
                    style={{ background: '#ef4444' }}
                  >
                    <div className="relative">
                      <div className="w-3 h-3 bg-white rounded-full animate-ping absolute" />
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                    <span className="text-white font-semibold">GRAVANDO</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                  Transcrição em tempo real:
                </label>
                <div
                  className="p-4 rounded-lg min-h-[200px]"
                  style={{
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap" style={{ color: colors.textPrimary }}>
                    {transcription || 'O texto aparecerá aqui conforme você fala...'}
                  </p>
                </div>
              </div>

              <button
                onClick={stopRecording}
                disabled={!isRecording}
                className="w-full px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                }}
              >
                Parar e Editar
              </button>
            </div>
          )}

          {/* STAGE: Editing */}
          {stage === 'editing' && (
            <div className="space-y-4">
              <div
                className="p-4 rounded-lg border"
                style={{
                  background: `${colors.buttonPrimary}15`,
                  borderColor: `${colors.buttonPrimary}50`,
                }}
              >
                <p className="text-sm text-center font-medium" style={{ color: colors.textPrimary }}>
                  ✏️ Edite ou confirme sua nota. Diga <strong>"SALVAR"</strong> para confirmar
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                  Título (opcional):
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Anotações da reunião"
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2"
                  style={{
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    color: colors.textPrimary,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                  Conteúdo da nota:
                </label>
                <textarea
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:ring-2 resize-none"
                  style={{
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    color: colors.textPrimary,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !conteudo.trim()}
                  className="px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: colors.buttonPrimary,
                    color: '#ffffff',
                  }}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Nota'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 rounded-lg font-semibold transition"
                  style={{
                    background: colors.buttonSecondary,
                    color: colors.textPrimary,
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* STAGE: Saved */}
          {stage === 'saved' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                style={{ background: '#10b981' }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-xl font-bold mb-2" style={{ color: colors.textPrimary }}>
                Nota salva com sucesso!
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Fechando automaticamente...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
