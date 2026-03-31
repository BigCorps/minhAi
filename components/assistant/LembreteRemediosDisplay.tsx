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
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Stage = 'countdown' | 'recording_nome' | 'recording_horarios' | 'editing' | 'saved';

// ============================================================================
// Componente
// ============================================================================

export default function LembreteRemediosDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const { companyId } = data;
  const supabase = createClient();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();
  const colors = isDark ? DARK : LIGHT;

  const [stage, setStage] = useState<Stage>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [nomeRemedio, setNomeRemedio] = useState('');
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horariosInput, setHorariosInput] = useState('');
  const [modoLembrete, setModoLembrete] = useState<'assistente' | 'calendario' | 'ambos'>('assistente');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  const recognitionRef = useRef<any>(null);
  const googleSpeechRef = useRef<GoogleSpeechWebSocket | null>(null);
  const finalTranscriptRef = useRef<string>('');

  // ── Mount: fala abertura + checa Google ───────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    playText?.('Vamos configurar um lembrete de remédio. Prepare-se para falar o nome do remédio.').catch(() => {});

    // Verifica se Google está conectado
    supabase
      .from('google_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => setGoogleConnected(!!data));
  }, []);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && stage === 'countdown') {
      startRecording('nome');
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
      }
    },
  });

  // ── Recording: Mobile ─────────────────────────────────────────────────────
  const startRecordingMobile = async (mode: 'nome' | 'horarios') => {
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
            
            if (mode === 'nome') {
              setNomeRemedio(cleaned);
              stopRecording();
              // Próximo: horários
              playText?.('Agora diga os horários do remédio. Por exemplo: 8 horas, 14 horas e 20 horas.').catch(() => {});
              setTimeout(() => {
                setTranscription('');
                startRecording('horarios');
              }, 3000);
            } else {
              setHorariosInput(cleaned);
              stopRecording();
              setStage('editing');
            }
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
  const startRecordingDesktop = (mode: 'nome' | 'horarios') => {
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
      finalTranscriptRef.current = cleaned;

      if (cleaned) {
        if (mode === 'nome') {
          setNomeRemedio(cleaned);
          playText?.('Agora diga os horários do remédio. Por exemplo: 8 horas, 14 horas e 20 horas.').catch(() => {});
          setTimeout(() => {
            setTranscription('');
            startRecording('horarios');
          }, 3000);
        } else {
          setHorariosInput(cleaned);
          setStage('editing');
        }
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
  const startRecording = async (mode: 'nome' | 'horarios') => {
    if (mode === 'nome') {
      setStage('recording_nome');
    } else {
      setStage('recording_horarios');
    }
    
    if (isMobile) {
      await startRecordingMobile(mode);
    } else {
      startRecordingDesktop(mode);
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

  // ── Parse horários ────────────────────────────────────────────────────────
  const parseHorarios = (texto: string): string[] => {
    // Extrai números seguidos de "hora" ou "horas"
    const regex = /(\d+)\s*(?:h|hora|horas)/gi;
    const matches = texto.matchAll(regex);
    const horasEncontradas: string[] = [];
    
    for (const match of matches) {
      const hora = parseInt(match[1]);
      if (hora >= 0 && hora <= 23) {
        horasEncontradas.push(`${String(hora).padStart(2, '0')}:00`);
      }
    }
    
    return horasEncontradas;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!nomeRemedio.trim()) {
      setToast({ message: 'Informe o nome do remédio', type: 'error' });
      return;
    }

    const horariosFinais = horarios.length > 0 ? horarios : parseHorarios(horariosInput);
    
    if (horariosFinais.length === 0) {
      setToast({ message: 'Informe pelo menos um horário', type: 'error' });
      return;
    }

    setIsSaving(true);

    try {
      // Salva no banco
      const { error: insertError } = await supabase.from('lembretes_remedios').insert({
        company_id: companyId,
        nome_remedio: nomeRemedio.trim(),
        horarios: horariosFinais,
        modo_lembrete: modoLembrete,
      });

      if (insertError) throw insertError;

      // Se modo incluir calendario, cria eventos no Google Calendar
      if ((modoLembrete === 'calendario' || modoLembrete === 'ambos') && googleConnected) {
        for (const horario of horariosFinais) {
          const [hora, minuto] = horario.split(':');
          const agora = new Date();
          const dataEvento = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), parseInt(hora), parseInt(minuto));
          
          await supabase.functions.invoke('criar-evento-calendario', {
            body: {
              company_id: companyId,
              titulo: `Lembrete: ${nomeRemedio}`,
              descricao: `Horário de tomar ${nomeRemedio}`,
              data_inicio: dataEvento.toISOString(),
              duracao_minutos: 15,
              recorrente: true,
              frequencia: 'daily',
            },
          });
        }
      }

      // Cobrar crédito
      await supabase.rpc('decrement_credits', {
        p_company_id: companyId,
        p_amount: 1,
      });

      setStage('saved');
      playText?.('Lembrete de remédio salvo com sucesso!').catch(() => {});
      setTimeout(() => onClose(), 2000);
    } catch (error: any) {
      console.error('Erro ao salvar lembrete:', error);
      setToast({ message: 'Erro ao salvar lembrete', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Adicionar horário manual ──────────────────────────────────────────────
  const handleAddHorario = (hora: string) => {
    if (!hora) return;
    if (!horarios.includes(hora)) {
      setHorarios([...horarios, hora].sort());
    }
  };

  const handleRemoveHorario = (hora: string) => {
    setHorarios(horarios.filter(h => h !== hora));
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div>
              <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                Lembrete de Remédios
              </h2>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                {stage === 'countdown' && 'Preparando gravação...'}
                {stage === 'recording_nome' && 'Gravando nome do remédio...'}
                {stage === 'recording_horarios' && 'Gravando horários...'}
                {stage === 'editing' && 'Edite ou confirme o lembrete'}
                {stage === 'saved' && 'Lembrete salvo com sucesso!'}
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
                Prepare-se para falar o nome do remédio...
              </p>
            </div>
          )}

          {/* STAGE: Recording Nome */}
          {stage === 'recording_nome' && (
            <div className="space-y-6">
              <div
                className="p-4 rounded-lg border"
                style={{
                  background: `${colors.buttonPrimary}15`,
                  borderColor: `${colors.buttonPrimary}50`,
                }}
              >
                <p className="text-sm text-center font-medium" style={{ color: colors.textPrimary }}>
                  🎤 <strong>Gravando...</strong> Diga o nome do remédio e depois <strong>"CONCLUIR"</strong>
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
                  className="p-4 rounded-lg min-h-[100px]"
                  style={{
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap" style={{ color: colors.textPrimary }}>
                    {transcription || 'O nome do remédio aparecerá aqui...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STAGE: Recording Horários */}
          {stage === 'recording_horarios' && (
            <div className="space-y-6">
              <div
                className="p-4 rounded-lg border"
                style={{
                  background: `${colors.buttonPrimary}15`,
                  borderColor: `${colors.buttonPrimary}50`,
                }}
              >
                <p className="text-sm text-center font-medium" style={{ color: colors.textPrimary }}>
                  🎤 <strong>Gravando horários...</strong> Ex: "8 horas, 14 horas e 20 horas". Depois diga <strong>"CONCLUIR"</strong>
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
                  className="p-4 rounded-lg min-h-[100px]"
                  style={{
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap" style={{ color: colors.textPrimary }}>
                    {transcription || 'Os horários aparecerão aqui...'}
                  </p>
                </div>
              </div>
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
                  ✏️ Edite ou confirme o lembrete. Diga <strong>"SALVAR"</strong> para confirmar
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                  Nome do remédio:
                </label>
                <input
                  type="text"
                  value={nomeRemedio}
                  onChange={(e) => setNomeRemedio(e.target.value)}
                  placeholder="Ex: Paracetamol"
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
                  Horários reconhecidos:
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(horarios.length > 0 ? horarios : parseHorarios(horariosInput)).map((hora) => (
                    <span
                      key={hora}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
                      style={{
                        background: colors.buttonPrimary,
                        color: '#ffffff',
                      }}
                    >
                      {hora}
                      <button
                        onClick={() => handleRemoveHorario(hora)}
                        className="text-white hover:text-red-200"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="time"
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleAddHorario(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      color: colors.textPrimary,
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                  Modo de lembrete:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['assistente', 'calendario', 'ambos'] as const).map((modo) => (
                    <button
                      key={modo}
                      onClick={() => setModoLembrete(modo)}
                      disabled={modo !== 'assistente' && !googleConnected}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: modoLembrete === modo ? colors.buttonPrimary : colors.buttonSecondary,
                        color: modoLembrete === modo ? '#ffffff' : colors.textPrimary,
                      }}
                    >
                      {modo === 'assistente' && 'Assistente'}
                      {modo === 'calendario' && 'Calendar'}
                      {modo === 'ambos' && 'Ambos'}
                    </button>
                  ))}
                </div>
                {!googleConnected && (
                  <p className="text-xs mt-2" style={{ color: colors.textMuted }}>
                    Google Calendar desconectado. Somente modo Assistente disponível.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !nomeRemedio.trim()}
                  className="px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: colors.buttonPrimary,
                    color: '#ffffff',
                  }}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Lembrete'}
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
                Lembrete salvo com sucesso!
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
