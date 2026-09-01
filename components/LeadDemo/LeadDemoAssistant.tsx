'use client';

// ============================================================
// LeadDemoAssistant.tsx
// Caminho: components/LeadDemo/LeadDemoAssistant.tsx
// ============================================================
//
// Componente NOVO e isolado para o funil de demonstração /lead.
// Decisão de arquitetura (confirmada): não estende/reusa
// VoiceAssistantWithWakeWord (que tem ~80 cases acoplados a
// companyId real, assistant_sessions, useCompanyConfig, etc.).
// Aqui reaproveitamos apenas infraestrutura de baixo nível:
// - useVoiceRecorder (hook genérico de browser, sem cópia)
// - /api/voice/transcribe-demo (cópia isolada da rota de transcrição)
// - /api/voice/process-demo (rota nova, ver arquivo da rota)
//
// Push-to-talk apenas (pressionar e manter, soltar para enviar).
// Sem wake-word, sem escuta contínua — isso é exclusivo do
// assistente real via slug, por decisão confirmada.

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Send, Volume2, VolumeX } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

export interface LeadDemoMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LeadDemoAssistantProps {
  token: string;
  /** Tema visual: adapta cores de bolhas, input e textos. Default 'dark' — preserva o comportamento anterior se omitida. */
  theme?: 'dark' | 'light';
  /** Estado inicial vindo de GET /api/demo/[token] (lib/demo-token.ts → DemoSessionRecord) */
  initialMessages?: LeadDemoMessage[];
  initialObjetivoCumprido?: boolean;
  initialNomeLead?: string | null;
  /**
   * Chamado quando o backend sinaliza objetivo_cumprido = true por
   * meio de uma tool call (fechar_pedido / marcar_horario). O
   * componente pai decide o que renderizar (modal de PIX mock,
   * modal de agendamento mock) com base nisso.
   */
  onObjetivoCumprido?: (info: { tipo: 'pedido' | 'horario'; horario?: string }) => void;
  /** Chamado quando o nome do lead é capturado (identificar_lead). */
  onNomeLeadCapturado?: (nome: string) => void;
  /**
   * Chamado quando a sessão expirou (API retornou 410). Decisão
   * confirmada: zero recuperação parcial — o pai deve redirecionar
   * para /lead (reiniciar o fluxo do zero).
   */
  onSessaoExpirada?: () => void;
  onFirstMessage?: () => void;
}

export function LeadDemoAssistant({
  token,
  theme = 'dark',
  initialMessages = [],
  initialObjetivoCumprido = false,
  initialNomeLead = null,
  onObjetivoCumprido,
  onNomeLeadCapturado,
  onSessaoExpirada,
  onFirstMessage,
}: LeadDemoAssistantProps) {
  const isDark = theme !== 'light';
  const [messages, setMessages] = useState<LeadDemoMessage[]>(initialMessages);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [objetivoCumprido, setObjetivoCumprido] = useState(initialObjetivoCumprido);
  const [nomeLead, setNomeLead] = useState<string | null>(initialNomeLead);
  const [error, setError] = useState<string | null>(null);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const objetivoCumpridoRef = useRef(initialObjetivoCumprido);
  useEffect(() => { objetivoCumpridoRef.current = objetivoCumprido; }, [objetivoCumprido]);
  const voiceRecorder = useVoiceRecorder();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Envio de mensagem (texto digitado ou transcrito) ──────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;

      // Corrigido: onFirstMessage não pode ser chamado dentro do
      // updater function de setMessages (React não permite setState
      // de outro componente durante o cálculo de outro setState).
      // Verificamos messages.length ANTES de atualizar o estado.
      if (messages.length === 0) onFirstMessage?.();

      setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
      setTextInput('');
      setIsProcessing(true);

      try {
        const formData = new FormData();
        formData.append('token', token);
        formData.append('directQuestion', trimmed);
        formData.append('channel', 'pagina');
        // Decisão confirmada: sem TTS quando mutado (economiza custo),
        // áudio binário quando não mutado.
        formData.append('returnText', isMuted ? 'true' : 'false');

        const response = await fetch('/api/voice/process-demo', {
          method: 'POST',
          body: formData,
        });

        if (response.status === 410) {
          // Decisão confirmada: zero recuperação parcial.
          onSessaoExpirada?.();
          return;
        }

        if (!response.ok) {
          throw new Error(`Erro: ${response.status}`);
        }

        if (isMuted) {
          // Modo texto: resposta vem como JSON
          const data = await response.json();
          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
          applyObjetivoEffects(data.objetivoCumprido, data.nomeLead, data.horarioMarcado, data.toolCalls);
        } else {
          // Modo áudio: resposta vem nos headers + corpo binário
          const responseTextHeader = response.headers.get('X-Response-Text');
          const responseText = responseTextHeader ? decodeURIComponent(responseTextHeader) : '';
          const novoObjetivo = response.headers.get('X-Objetivo-Cumprido') === 'true';
          const horarioHeader = response.headers.get('X-Horario-Marcado');
          const horario = horarioHeader ? decodeURIComponent(horarioHeader) : undefined;
          const toolCallsHeader = response.headers.get('X-Tool-Calls');
          const toolNames: string[] = toolCallsHeader ? JSON.parse(decodeURIComponent(toolCallsHeader)) : [];

          setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          setIsPlayingAudio(true);
          audio.onended = () => setIsPlayingAudio(false);
          audio.onerror = () => setIsPlayingAudio(false);
          audio.play().catch(() => setIsPlayingAudio(false));

          applyObjetivoEffects(novoObjetivo, null, horario, toolNames.map(n => ({ name: n, id: '', arguments: {} })));
        }
      } catch (err: any) {
        console.error('[LeadDemoAssistant] Erro ao enviar mensagem:', err);
        setError('Não consegui processar sua mensagem. Pode tentar de novo?');
      } finally {
        setIsProcessing(false);
      }
    },
    [token, isMuted, isProcessing, onSessaoExpirada, messages, onFirstMessage]
  );

  // Aplica efeitos de objetivo cumprido / nome capturado, vindos tanto
  // do caminho JSON (mutado) quanto do caminho de headers (com áudio).
  function applyObjetivoEffects(
    novoObjetivo: boolean | undefined,
    nomeLeadVindo: string | null | undefined,
    horario: string | undefined,
    toolCalls: Array<{ name: string }> | undefined
  ) {
    if (nomeLeadVindo) {
      setNomeLead(nomeLeadVindo);
      onNomeLeadCapturado?.(nomeLeadVindo);
    }

    if (novoObjetivo && !objetivoCumpridoRef.current) {
      setObjetivoCumprido(true);
      const fechouPedido = toolCalls?.some(t => t.name === 'fechar_pedido');
      const marcouHorario = toolCalls?.some(t => t.name === 'marcar_horario');
      if (fechouPedido) {
        onObjetivoCumprido?.({ tipo: 'pedido' });
      } else if (marcouHorario) {
        onObjetivoCumprido?.({ tipo: 'horario', horario });
      }
    }
  }

  // ── Push-to-talk: pressionar e manter, soltar para enviar ─────────
  const handleMicDown = useCallback(
    async (e?: React.MouseEvent | React.TouchEvent) => {
      e?.preventDefault();
      if (isProcessing || isTranscribing || voiceRecorder.isRecording) return;
      await voiceRecorder.startRecording();
    },
    [isProcessing, isTranscribing, voiceRecorder]
  );

  const handleMicUp = useCallback(async () => {
    if (!voiceRecorder.isRecording) return;

    setIsTranscribing(true);
    try {
      const audioBlob = await voiceRecorder.stopRecording();
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

      const response = await fetch('/api/voice/transcribe-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) throw new Error('Erro na transcrição');
      const { text } = await response.json();

      if (text?.trim()) {
        await sendMessage(text.trim());
      }
    } catch (err) {
      console.error('[LeadDemoAssistant] Erro na transcrição:', err);
      setError('Não consegui entender o áudio. Pode tentar de novo ou digitar?');
    } finally {
      setIsTranscribing(false);
    }
  }, [voiceRecorder, sendMessage]);

  const handleStopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsPlayingAudio(false);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!isMuted) {
      // Ativando mute: para qualquer áudio em reprodução agora.
      handleStopAudio();
    }
    setIsMuted(prev => !prev);
  }, [isMuted, handleStopAudio]);

  const handleTextSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(textInput);
    },
    [textInput, sendMessage]
  );

  return (
    <div className="flex flex-col w-full h-full max-w-2xl mx-auto overflow-hidden pb-[72px]">

      {/* Histórico de mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : isDark
                  ? 'bg-white/10 text-white/90'
                  : 'bg-black/5 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-4 py-2 text-sm animate-pulse ${
              isDark ? 'bg-white/10 text-white/50' : 'bg-black/5 text-gray-500'
            }`}>
              Digitando...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className={`px-4 py-2 text-xs border-t ${
          isDark ? 'text-red-300 bg-red-500/10 border-red-500/20' : 'text-red-700 bg-red-50 border-red-200'
        }`}>
          {error}
        </div>
      )}

      {/* Input: texto + microfone */}
      <form onSubmit={handleTextSubmit} className="fixed bottom-6 left-0 right-0 max-w-7xl mx-auto flex items-center gap-2 px-4 sm:px-6 lg:px-8">
        <input
          type="text"
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          placeholder={isPlayingAudio ? 'Falando...' : 'Digite sua mensagem...'}
          disabled={isProcessing || voiceRecorder.isRecording}
          className={`flex-1 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 border ${
            isDark
              ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
              : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 shadow-sm'
          }`}
        />

        <button
          type="button"
          onMouseDown={handleMicDown}
          onMouseUp={handleMicUp}
          onTouchStart={handleMicDown}
          onTouchEnd={handleMicUp}
          disabled={isProcessing || isTranscribing}
          aria-label="Pressione e mantenha para falar"
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all select-none ${
            voiceRecorder.isRecording
              ? 'bg-red-500 animate-pulse'
              : isTranscribing
              ? 'bg-orange-400 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
          } disabled:opacity-50`}
        >
          <Mic className="w-5 h-5 text-white" />
        </button>

        <button
          type="button"
          onClick={handleToggleMute}
          aria-label={isMuted ? 'Ativar áudio' : 'Mutar áudio'}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10 border border-gray-300'
          }`}
        >
          {isMuted ? (
            <VolumeX className={`w-5 h-5 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
          ) : (
            <Volume2 className={`w-5 h-5 ${isDark ? 'text-white/70' : 'text-gray-600'}`} />
          )}
        </button>

        <button
          type="submit"
          disabled={!textInput.trim() || isProcessing}
          aria-label="Enviar mensagem"
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 ${
            isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10 border border-gray-300'
          }`}
        >
          <Send className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-700'}`} />
        </button>
      </form>

      {voiceRecorder.error && (
        <div className={`px-4 py-2 text-xs ${isDark ? 'text-red-300 bg-red-500/10' : 'text-red-700 bg-red-50'}`}>
          {voiceRecorder.error}
        </div>
      )}
    </div>
  );
}