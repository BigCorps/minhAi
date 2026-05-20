// components/dashboard/FuncoesChat.tsx
// Modal de chat para gerenciar funções do assistente por linguagem natural.
// Fork enxuto do SetupAssistantChat — sem etapas de ramo/dados.
// Abre como portal sobre a página de funções.

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  Loader2, Send, Mic, X, Volume2, VolumeX,
  Bot, CheckCircle2, Circle, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────

interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: Date;
}

interface FuncaoItem {
  function_key:      string;
  function_name:     string;
  short_description: string;
  function_category: string;
}

interface FuncoesPorCategoria {
  [category: string]: FuncaoItem[];
}

const CATEGORIA_LABELS: Record<string, string> = {
  ai_assistant:    'Conhecimento',
  products:        'Comercial',
  payment:         'Financeiro',
  information:     'Informação',
  video:           'Multimídia',
  schedule:        'Agendamento',
  contact:         'Contato',
  configuration:   'Localização',
  knowledge:       'Consultas',
  biometry:        'Identificação',
  images:          'Arquivos',
  utylities:       'Utilitários',
  codes:           'Câmera',
  services:        'Serviços',
};

// ── Props ────────────────────────────────────────────────────

interface FuncoesChatProps {
  companyId:        string;
  companyName:      string;
  assistantType:    'smart' | 'vendas';
  onClose:          () => void;
  onFunctionsChanged: () => void; // recarrega a lista na página pai
  theme?:           'dark' | 'light';
  playText:         (text: string) => Promise<void>;
  stopAudio:          () => void;
}

// ── Componente ───────────────────────────────────────────────

export default function FuncoesChat({
  companyId,
  companyName,
  assistantType,
  onClose,
  onFunctionsChanged,
  theme = 'dark',
  playText,
  stopAudio,
}: FuncoesChatProps) {
  const isDark = theme === 'dark';
  const voiceRecorder = useVoiceRecorder();

  // ── Cores ────────────────────────────────────────────────
  const C = {
    bg:              isDark ? '#1e293b' : '#ffffff',
    bgSecondary:     isDark ? '#334155' : '#f8fafc',
    bgChat:          isDark ? '#0f172a' : '#f1f5f9',
    text:            isDark ? '#f1f5f9' : '#0f172a',
    textMuted:       isDark ? '#94a3b8' : '#64748b',
    border:          isDark ? '#475569' : '#e2e8f0',
    accent:          '#3b82f6',
    success:         '#22c55e',
    userBubble:      isDark ? '#3b82f6' : '#2563eb',
    assistantBubble: isDark ? '#334155' : '#e2e8f0',
  };

  // ── State ────────────────────────────────────────────────
  const [messages, setMessages]           = useState<Message[]>([]);
  const [inputText, setInputText]         = useState('');
  const [isProcessing, setIsProcessing]   = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [audioMutado, setAudioMutado]     = useState(false);
  const [isMobile, setIsMobile]           = useState(false);

  // Catálogo de funções
  const [todasPorCategoria, setTodasPorCategoria] = useState<FuncoesPorCategoria>({});
  const [funcoesSelecionadas, setFuncoesSelecionadas] = useState<Set<string>>(new Set());
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);

  // Refs
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const audioMutadoRef  = useRef(false);
  const audioQueueRef   = useRef<string[]>([]);
  const isPlayingRef    = useRef(false);
  const hasStartedRef   = useRef(false);
  const cancelledRef = useRef(false);

  // ── Breakpoint ──────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Carregar funções ao abrir ───────────────────────────
  useEffect(() => {
    loadFunctions();
  }, [companyId]);

  async function loadFunctions() {
    try {
      const { createClient } = await import('@/lib/supabase-browser');
      const supabase = createClient();

      // Todas as funções do catálogo
      const { data: allFns } = await supabase
        .from('assistant_functions')
        .select('function_key, function_name, short_description, function_category')
        .eq('is_active', true)
        .order('function_category')
        .order('function_name');

      // Funções ativas desta empresa
      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('function_key, is_enabled')
        .eq('company_id', companyId);

      const activeSet = new Set(
        (settings ?? []).filter(s => s.is_enabled).map(s => s.function_key)
      );
      setFuncoesSelecionadas(activeSet);

      // Agrupar por categoria
      const porCategoria: FuncoesPorCategoria = {};
      for (const fn of allFns ?? []) {
        if (!porCategoria[fn.function_category]) porCategoria[fn.function_category] = [];
        porCategoria[fn.function_category].push(fn);
      }
      setTodasPorCategoria(porCategoria);

    } catch (err) {
      console.error('Erro ao carregar funções:', err);
    }
  }

  // ── Mensagem inicial ────────────────────────────────────
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const activasCount = funcoesSelecionadas.size;
    const msg = assistantType === 'vendas'
      ? `Olá! Sou o auxiliar de funções do ${companyName}. Você tem ${activasCount} função(ões) ativa(s). Me diga o que quer ativar, desativar ou explicar — pode falar naturalmente!`
      : `Olá! Sou o auxiliar de funções do ${companyName}. Você tem ${activasCount} função(ões) ativa(s) no minhAi Smart. Pode me pedir para ativar, desativar, explicar ou recomendar funções — é só falar!`;

    addAssistantMessage(msg);
    playTextSafe(msg);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
   cancelledRef.current = false;
   return () => {
     // Ao desmontar: cancela a fila e para o speechSynthesis se estiver falando
     cancelledRef.current = true;
     audioQueueRef.current = [];
     isPlayingRef.current = false;
     if (typeof window !== 'undefined' && window.speechSynthesis) {
       window.speechSynthesis.cancel();
     }
   };
 }, []);

  // ── Scroll automático ───────────────────────────────────
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
     if (cancelledRef.current) break;
      if (next) {
        try { await playText(next); await new Promise(r => setTimeout(r, 200)); }
        catch {}
      }
    }
   if (cancelledRef.current) {
     audioQueueRef.current = [];
   }
    isPlayingRef.current = false;
  }, [playText]);

  // ── Helpers de mensagem ─────────────────────────────────
  function addAssistantMessage(content: string) {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content, timestamp: new Date() }]);
  }
  function addUserMessage(content: string) {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content, timestamp: new Date() }]);
  }

  // ── Toggle manual de função no painel ──────────────────
  function toggleFuncao(functionKey: string) {
    setFuncoesSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(functionKey)) next.delete(functionKey);
      else next.add(functionKey);
      return next;
    });
    setPendingChanges(true);
  }

  // ── Processar mensagem do usuário ───────────────────────
  async function processarInput(texto: string) {
    if (!texto.trim() || isProcessing) return;
    addUserMessage(texto);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/setup/chat-funcoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          message:         texto,
          activeFunctions: Array.from(funcoesSelecionadas),
        }),
      });

      const data = await res.json();

      // Aplicar ações retornadas pelo GPT ao estado local
      if (data.actions?.length > 0) {
        setFuncoesSelecionadas(prev => {
          const next = new Set(prev);
          for (const action of data.actions) {
            if (action.action === 'enable')  next.add(action.function_key);
            if (action.action === 'disable') next.delete(action.function_key);
          }
          return next;
        });
        setPendingChanges(true);
      }

      const reply = data.reply ?? 'Pronto!';
      addAssistantMessage(reply);
      playTextSafe(reply);

    } catch (err) {
      const errMsg = 'Tive um problema. Pode tentar novamente?';
      addAssistantMessage(errMsg);
      playTextSafe(errMsg);
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Salvar alterações no banco ──────────────────────────
  async function salvarAlteracoes() {
    setIsSaving(true);
    try {
      const { createClient } = await import('@/lib/supabase-browser');
      const supabase = createClient();

      // Buscar todas as function_keys do catálogo
      const allKeys = Object.values(todasPorCategoria).flat().map(f => f.function_key);

      // Upsert de cada função
      const rows = allKeys.map(key => ({
        company_id:   companyId,
        function_key: key,
        is_enabled:   funcoesSelecionadas.has(key),
        updated_at:   new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('company_function_settings')
        .upsert(rows, { onConflict: 'company_id,function_key' });

      if (error) throw error;

      setPendingChanges(false);
      onFunctionsChanged(); // recarrega a página pai

      const msg = `Pronto! As alterações foram salvas. ${funcoesSelecionadas.size} função(ões) ativa(s) no ${companyName}.`;
      addAssistantMessage(msg);
      playTextSafe(msg);

    } catch (err: any) {
      addAssistantMessage('Erro ao salvar as alterações. Tente novamente.');
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

  // ── JSX: painel de funções ──────────────────────────────
  const painelFuncoesJSX = (
    <div style={{ overflowY: 'auto', padding: '16px', height: '100%' }}>

      {/* Contador */}
      <div style={{
        marginBottom: 12, padding: '10px 12px',
        background: C.success + '18', border: `1px solid ${C.success}44`,
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Zap size={14} color={C.success} />
        <span style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>
          {funcoesSelecionadas.size} função(ões) ativa(s)
        </span>
        {pendingChanges && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, padding: '2px 8px',
            borderRadius: 20, background: '#f59e0b22', color: '#f59e0b',
            fontWeight: 600,
          }}>
            Alterações pendentes
          </span>
        )}
      </div>

      {/* Categorias */}
      {Object.entries(todasPorCategoria).map(([cat, funcoes]) => (
        <div key={cat} style={{ marginBottom: 8 }}>
          <div
            onClick={() => setCategoriaAberta(p => p === cat ? null : cat)}
            style={{
              fontSize: 10, fontWeight: 700, color: C.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: 4, marginBottom: 4, userSelect: 'none',
            }}
          >
            {categoriaAberta === cat ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {CATEGORIA_LABELS[cat] || cat} ({funcoes.length})
          </div>

          {categoriaAberta === cat && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
              {funcoes.map(f => {
                const ativa = funcoesSelecionadas.has(f.function_key);
                return (
                  <div
                    key={f.function_key}
                    onClick={() => toggleFuncao(f.function_key)}
                    style={{
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${ativa ? C.accent : C.border}`,
                      background: ativa ? C.accent + '15' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all 0.1s',
                    }}
                  >
                    {ativa
                      ? <CheckCircle2 size={13} color={C.accent} />
                      : <Circle size={13} color={C.textMuted} />
                    }
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>
                        {f.function_name}
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>
                        {f.short_description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Botão salvar */}
      {pendingChanges && (
        <button
          onClick={salvarAlteracoes}
          disabled={isSaving}
          style={{
            width: '100%', marginTop: 12, padding: '11px',
            background: C.accent, color: 'white', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {isSaving
            ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
            : '💾 Salvar Alterações'
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
      {(isProcessing || isSaving) && (
        <div style={{
          alignSelf: 'flex-start', padding, borderRadius: 12,
          background: C.assistantBubble, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Loader2 size={13} className="animate-spin" color={C.accent} />
          <span style={{ fontSize, color: C.text }}>
            {isSaving ? 'Salvando...' : 'Processando...'}
          </span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );

  // ── JSX: input bar ──────────────────────────────────────
  const inputBarJSX = (mobile = false) => (
    <div style={{
      padding: mobile ? '12px 16px' : '14px 16px',
      borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!inputText.trim() && (
          <button
            onClick={handleMicPress}
            disabled={isProcessing || isTranscribing}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: voiceRecorder.isRecording ? '#ef4444' : C.accent,
              border: 'none', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              opacity: (isProcessing || isTranscribing) ? 0.5 : 1,
            }}
          >
            <Mic size={17} className={voiceRecorder.isRecording ? 'animate-pulse' : ''} />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
          placeholder='Ex: "ative o PIX", "o que faz o cardápio?", "quero receber pagamentos"'
          disabled={isProcessing || voiceRecorder.isRecording || isTranscribing}
          style={{
            flex: 1, padding: '10px 14px',
            background: C.bgSecondary, border: `1px solid ${C.border}`,
            borderRadius: 22, color: C.text, fontSize: 13, outline: 'none',
          }}
        />
        {inputText.trim() && (
          <button
            onClick={enviarMensagem}
            disabled={isProcessing}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: C.accent, border: 'none', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            <Send size={15} />
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
      padding: mobile ? '12px 16px' : '16px 20px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bot size={mobile ? 18 : 22} color={C.accent} />
        <div>
          <div style={{ fontSize: mobile ? 14 : 16, fontWeight: 700, color: C.text }}>
            Auxiliar de Funções
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            {companyName} · {assistantType === 'vendas' ? 'minhAi Vendas' : 'minhAi Smart'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={toggleMute} style={{
          padding: 8, background: 'transparent', border: 'none',
          cursor: 'pointer', color: audioMutado ? C.textMuted : C.accent,
        }}>
          {audioMutado ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button onClick={onClose} style={{
          padding: 8, background: 'transparent', border: 'none',
          cursor: 'pointer', color: C.textMuted,
        }}>
          <X size={18} />
        </button>
      </div>
    </div>
  );

  // ── RENDER MOBILE ───────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: C.bg, display: 'flex', flexDirection: 'column',
      }}>
        {headerJSX(true)}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {mensagensJSX('13px', '85%', '10px 12px')}
        </div>
        <div style={{ maxHeight: '38vh', overflowY: 'auto', borderTop: `1px solid ${C.border}`, background: C.bgSecondary, flexShrink: 0 }}>
          {painelFuncoesJSX}
        </div>
        {inputBarJSX(true)}
      </div>,
      document.body
    );
  }

  // ── RENDER DESKTOP ──────────────────────────────────────
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 960, height: '88vh',
        background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {headerJSX(false)}

        {/* Body: chat + painel */}
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px',
          gap: 1, background: C.border, overflow: 'hidden',
        }}>
          {/* Chat */}
          <div style={{ background: C.bgChat, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
              {mensagensJSX('14px', '72%', '12px 16px')}
            </div>
            {inputBarJSX(false)}
          </div>

          {/* Painel de funções */}
          <div style={{ background: C.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Funções disponíveis</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                Clique para ativar/desativar ou peça ao assistente
              </div>
            </div>
            {painelFuncoesJSX}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
