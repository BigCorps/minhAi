// components/dashboard/ChatPromptModal.tsx
// Modal de chat para editar o system_prompt do assistente por linguagem natural.
// Painel direito: preview do prompt em tempo real + campo groq_fallback_message.
// Abre como portal, sobrepondo o FunctionConfigModal.

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  Loader2, Send, Mic, X, Volume2, VolumeX,
  Bot, Sparkles, Save, RotateCcw,
} from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────

interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: Date;
}

interface ChatPromptModalProps {
  companyId:         string;
  companyName:       string;
  assistantType:     'smart' | 'vendas';
  initialPrompt:     string;
  initialFallback:   string;  // groq_fallback_message atual
  onClose:           () => void;
  onSaved:           () => void; // recarrega as configurações na página pai
  theme?:            'dark' | 'light';
  playText:          (text: string) => Promise<void>;
}

// ── Componente ───────────────────────────────────────────────

export default function ChatPromptModal({
  companyId,
  companyName,
  assistantType,
  initialPrompt,
  initialFallback,
  onClose,
  onSaved,
  theme = 'dark',
  playText,
}: ChatPromptModalProps) {
  const isDark = theme === 'dark';
  const voiceRecorder = useVoiceRecorder();

  const C = {
    bg:              isDark ? '#1e293b' : '#ffffff',
    bgSecondary:     isDark ? '#334155' : '#f8fafc',
    bgChat:          isDark ? '#0f172a' : '#f1f5f9',
    bgPreview:       isDark ? '#0f172a' : '#f8fafc',
    text:            isDark ? '#f1f5f9' : '#0f172a',
    textMuted:       isDark ? '#94a3b8' : '#64748b',
    border:          isDark ? '#475569' : '#e2e8f0',
    accent:          '#3b82f6',
    success:         '#22c55e',
    userBubble:      isDark ? '#3b82f6' : '#2563eb',
    assistantBubble: isDark ? '#334155' : '#e2e8f0',
  };

  // ── State ────────────────────────────────────────────────
  const [messages, setMessages]             = useState<Message[]>([]);
  const [inputText, setInputText]           = useState('');
  const [isProcessing, setIsProcessing]     = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [audioMutado, setAudioMutado]       = useState(false);
  const [isMobile, setIsMobile]             = useState(false);

  // Prompt editável em tempo real
  const [currentPrompt, setCurrentPrompt]   = useState(initialPrompt);
  const [fallbackMsg, setFallbackMsg]       = useState(initialFallback);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [promptHistory, setPromptHistory]   = useState<string[]>([initialPrompt]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const audioMutadoRef = useRef(false);
  const audioQueueRef  = useRef<string[]>([]);
  const isPlayingRef   = useRef(false);
  const hasStartedRef  = useRef(false);

  // ── Breakpoint ──────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Mensagem inicial ────────────────────────────────────
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const hasPrompt = initialPrompt?.trim().length > 0;
    const msg = hasPrompt
      ? `Olá! Estou aqui para ajudar a ajustar o comportamento do assistente "${companyName}". O prompt atual já está configurado. O que você quer mudar? Pode pedir coisas como "mude o tom para mais formal", "adicione que não falamos de concorrentes" ou "como está configurado agora?".`
      : `Olá! O assistente "${companyName}" ainda não tem um comportamento configurado. Me conte o que ele deve fazer e como deve se comunicar, que eu crio o prompt para você!`;

    addAssistantMessage(msg);
    playTextSafe(msg);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Audio ───────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setAudioMutado(prev => { audioMutadoRef.current = !prev; return !prev; });
  }, []);

  const playTextSafe = useCallback(async (text: string) => {
    if (audioMutadoRef.current) return;
    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;
    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try { await playText(next); await new Promise(r => setTimeout(r, 200)); }
        catch {}
      }
    }
    isPlayingRef.current = false;
  }, [playText]);

  // ── Helpers de mensagem ─────────────────────────────────
  function addAssistantMessage(content: string) {
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'assistant', content, timestamp: new Date(),
    }]);
  }
  function addUserMessage(content: string) {
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user', content, timestamp: new Date(),
    }]);
  }

  // ── Processar mensagem ──────────────────────────────────
  async function processarInput(texto: string) {
    if (!texto.trim() || isProcessing) return;
    addUserMessage(texto);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/setup/chat-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          message:       texto,
          currentPrompt,
        }),
      });

      const data = await res.json();

      // Atualizar prompt se houve mudança
      if (data.changed && data.updatedPrompt) {
        setPromptHistory(prev => [...prev, currentPrompt]); // salva para desfazer
        setCurrentPrompt(data.updatedPrompt);
        setPendingChanges(true);
      }

      const reply = data.reply ?? 'Pronto!';
      addAssistantMessage(reply);
      playTextSafe(reply);

    } catch {
      const errMsg = 'Tive um problema. Pode tentar novamente?';
      addAssistantMessage(errMsg);
      playTextSafe(errMsg);
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Desfazer última alteração ───────────────────────────
  function desfazerAlteracao() {
    if (promptHistory.length <= 1) return;
    const anterior = promptHistory[promptHistory.length - 2];
    setPromptHistory(prev => prev.slice(0, -1));
    setCurrentPrompt(anterior);
    setPendingChanges(anterior !== initialPrompt);
    addAssistantMessage('Voltei ao prompt anterior. Quer fazer outra alteração?');
  }

  // ── Salvar no banco ─────────────────────────────────────
  async function salvar() {
    setIsSaving(true);
    try {
      const { createClient } = await import('@/lib/supabase-browser');
      const supabase = createClient();

      const { error } = await supabase
        .from('companies')
        .update({
          system_prompt:        currentPrompt,
          groq_fallback_message: fallbackMsg || null,
          updated_at:           new Date().toISOString(),
        })
        .eq('id', companyId);

      if (error) throw error;

      setPendingChanges(false);
      onSaved();

      const msg = 'Perfeito! As configurações foram salvas. O assistente já vai usar o novo comportamento.';
      addAssistantMessage(msg);
      playTextSafe(msg);

    } catch (err: any) {
      addAssistantMessage('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Enviar por texto ────────────────────────────────────
  function enviarMensagem() {
    if (!inputText.trim() || isProcessing) return;
    processarInput(inputText);
    setInputText('');
  }

  // ── Microfone ───────────────────────────────────────────
  async function handleMicPress() {
    if (voiceRecorder.isRecording) {
      setIsTranscribing(true);
      try {
        const audioBlob = await voiceRecorder.stopRecording();
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        const base64Audio = await new Promise<string>(resolve => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        });
        const response = await fetch('/api/voice/transcribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        });
        if (response.ok) {
          const { text } = await response.json();
          if (text?.trim()) processarInput(text.trim());
        }
      } catch {}
      finally { setIsTranscribing(false); }
    } else {
      await voiceRecorder.startRecording();
    }
  }

  // ── Sugestões rápidas ───────────────────────────────────
  const SUGESTOES = [
    'Como está configurado agora?',
    'Mude o tom para mais formal',
    'Adicione que não falamos de concorrentes',
    'Adicione o horário de funcionamento',
    'Crie um prompt do zero para mim',
  ];

  // ── JSX: painel direito (preview do prompt) ─────────────
  const painelPreviewJSX = (
    <div style={{ overflowY: 'auto', padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header do painel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
          Comportamento atual
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {promptHistory.length > 1 && (
            <button
              onClick={desfazerAlteracao}
              title="Desfazer última alteração"
              style={{
                padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
                background: 'transparent', cursor: 'pointer', color: C.textMuted,
                fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <RotateCcw size={11} /> Desfazer
            </button>
          )}
          {pendingChanges && (
            <span style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 20,
              background: '#f59e0b22', color: '#f59e0b', fontWeight: 600,
            }}>
              Alterado
            </span>
          )}
        </div>
      </div>

      {/* Preview do prompt */}
      <textarea
        value={currentPrompt}
        onChange={e => { setCurrentPrompt(e.target.value); setPendingChanges(true); }}
        placeholder="O comportamento do assistente aparece aqui. Converse com o assistente para configurar, ou edite diretamente."
        style={{
          flex: 1, minHeight: 160, padding: '10px 12px',
          background: C.bgPreview, border: `1px solid ${C.border}`,
          borderRadius: 8, color: C.text, fontSize: 12,
          lineHeight: 1.6, resize: 'none', outline: 'none',
          fontFamily: 'inherit',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
        onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
      />

      {/* Separador */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>
          Mensagem quando ChatGPT estiver desativado
          <span style={{ fontWeight: 400, marginLeft: 4 }}>(opcional)</span>
        </div>
        <textarea
          rows={2}
          value={fallbackMsg}
          onChange={e => { setFallbackMsg(e.target.value); setPendingChanges(true); }}
          placeholder='Ex: "Não tenho informações sobre isso. Entre em contato com a empresa."'
          maxLength={300}
          style={{
            width: '100%', padding: '8px 10px',
            background: C.bgPreview, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text, fontSize: 11,
            lineHeight: 1.5, resize: 'none', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
        />
        <div style={{ fontSize: 10, color: C.textMuted, textAlign: 'right', marginTop: 3 }}>
          {fallbackMsg.length}/300
        </div>
      </div>

      {/* Botão salvar */}
      {pendingChanges && (
        <button
          onClick={salvar}
          disabled={isSaving}
          style={{
            width: '100%', padding: '11px',
            background: C.accent, color: 'white', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {isSaving
            ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
            : <><Save size={14} /> Salvar Comportamento</>
          }
        </button>
      )}
    </div>
  );

  // ── JSX: chat messages ──────────────────────────────────
  const mensagensJSX = (fontSize: string, maxWidth: string, padding: string) => (
    <>
      {messages.map(msg => (
        <div key={msg.id} style={{
          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
          maxWidth, padding, borderRadius: 12,
          background: msg.role === 'user' ? C.userBubble : C.assistantBubble,
          color: msg.role === 'user' ? 'white' : C.text,
          fontSize, lineHeight: 1.5,
        }}>
          {msg.content}
        </div>
      ))}
      {isProcessing && (
        <div style={{
          alignSelf: 'flex-start', padding, borderRadius: 12,
          background: C.assistantBubble, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Loader2 size={13} className="animate-spin" color={C.accent} />
          <span style={{ fontSize, color: C.text }}>Pensando...</span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );

  // ── JSX: sugestões rápidas ──────────────────────────────
  const sugestoesJSX = messages.length <= 1 ? (
    <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {SUGESTOES.map(s => (
        <button
          key={s}
          onClick={() => { processarInput(s); }}
          disabled={isProcessing}
          style={{
            padding: '5px 10px', borderRadius: 16, fontSize: 11,
            border: `1px solid ${C.border}`, background: C.bgSecondary,
            color: C.textMuted, cursor: 'pointer',
            transition: 'all 0.1s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = C.accent;
            e.currentTarget.style.color = C.accent;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.textMuted;
          }}
        >
          {s}
        </button>
      ))}
    </div>
  ) : null;

  // ── JSX: input bar ──────────────────────────────────────
  const inputBarJSX = (mobile = false) => (
    <div style={{
      padding: mobile ? '10px 14px' : '12px 16px',
      borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!inputText.trim() && (
          <button
            onClick={handleMicPress}
            disabled={isProcessing || isTranscribing}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
              border: 'none', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              opacity: (isProcessing || isTranscribing) ? 0.5 : 1,
            }}
          >
            <Mic size={16} className={voiceRecorder.isRecording ? 'animate-pulse' : ''} />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
          placeholder='Ex: "mude o tom para formal", "adicione o horário de funcionamento"'
          disabled={isProcessing || voiceRecorder.isRecording || isTranscribing}
          style={{
            flex: 1, padding: '9px 13px',
            background: C.bgSecondary, border: `1px solid ${C.border}`,
            borderRadius: 20, color: C.text, fontSize: 13, outline: 'none',
          }}
        />
        {inputText.trim() && (
          <button
            onClick={enviarMensagem}
            disabled={isProcessing}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: C.accent, border: 'none', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            <Send size={14} />
          </button>
        )}
      </div>
      {voiceRecorder.isRecording && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444', textAlign: 'center' }}>
          Gravando... clique novamente para enviar ({voiceRecorder.duration}s)
        </div>
      )}
      {isTranscribing && (
        <div style={{ marginTop: 6, fontSize: 11, color: C.accent, textAlign: 'center' }}>
          Transcrevendo...
        </div>
      )}
    </div>
  );

  // ── Header ──────────────────────────────────────────────
  const headerJSX = (mobile = false) => (
    <div style={{
      padding: mobile ? '12px 14px' : '14px 20px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sparkles size={mobile ? 17 : 20} color={C.accent} />
        <div>
          <div style={{ fontSize: mobile ? 13 : 15, fontWeight: 700, color: C.text }}>
            Comportamento do Assistente
          </div>
          <div style={{ fontSize: 10, color: C.textMuted }}>
            {companyName} · {assistantType === 'vendas' ? 'minhAi Vendas' : 'minhAi Smart'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={toggleMute} style={{
          padding: 7, background: 'transparent', border: 'none',
          cursor: 'pointer', color: audioMutado ? C.textMuted : C.accent,
        }}>
          {audioMutado ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <button onClick={onClose} style={{
          padding: 7, background: 'transparent', border: 'none',
          cursor: 'pointer', color: C.textMuted,
        }}>
          <X size={17} />
        </button>
      </div>
    </div>
  );

  // ── RENDER MOBILE ───────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000, // acima do FunctionConfigModal (z-50)
        background: C.bg, display: 'flex', flexDirection: 'column',
      }}>
        {headerJSX(true)}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {mensagensJSX('13px', '85%', '9px 12px')}
        </div>
        {sugestoesJSX}
        <div style={{ maxHeight: '40vh', overflowY: 'auto', borderTop: `1px solid ${C.border}`, background: C.bgSecondary, flexShrink: 0 }}>
          {painelPreviewJSX}
        </div>
        {inputBarJSX(true)}
      </div>,
      document.body
    );
  }

  // ── RENDER DESKTOP ──────────────────────────────────────
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, // acima do FunctionConfigModal (z-50)
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 980, height: '86vh',
        background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {headerJSX(false)}

        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px',
          gap: 1, background: C.border, overflow: 'hidden',
        }}>
          {/* Chat */}
          <div style={{ background: C.bgChat, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
              {mensagensJSX('14px', '72%', '11px 15px')}
            </div>
            {sugestoesJSX}
            {inputBarJSX(false)}
          </div>

          {/* Painel preview */}
          <div style={{ background: C.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>Preview do comportamento</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>
                Edite diretamente ou peça ao assistente para alterar
              </div>
            </div>
            {painelPreviewJSX}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
