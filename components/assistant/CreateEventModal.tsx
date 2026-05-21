'use client';

// ============================================================
// GestorAgendaDisplay.tsx
// Caminho: components/assistant/GestorAgendaDisplay.tsx
//
// Modal de agendamento guiado por IA — padrão FazerPedidoDisplay.
// Coluna esquerda: chat conversacional (AssistenteAgendaChat)
// Coluna direita: painel dinâmico (slots do dia / produto / confirmação)
// Step 2: calendário mensal para confirmar data
// Step pagamento: CheckoutFlow reutilizado integralmente
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import CheckoutFlow from '@/components/VoiceAssistant/modals/SaleModeModal/CheckoutFlow';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GestorAgendaDisplayProps {
  data: {
    companyId: string;
    slug?: string;
    assistantType?: 'smart' | 'vendas';
    prefilledData?: {
      date?: Date;
      time?: string;
      name?: string;
      produtoId?: string;
    };
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

type Step = 'agendamento' | 'confirmar_data' | 'pagamento' | 'confirmado';
type AbaAtiva = 'chat' | 'painel';

interface DadosAgendamento {
  data: Date | null;
  hora: string;
  duracao: number; // minutos
  nomeCliente: string;
  observacoes: string;
  produtoId: string | null;
  produtoNome: string | null;
  produtoPreco: number | null;
  produtoImagemUrl: string | null;
}

interface MensagemChat {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SlotHorario {
  hora: string;
  ocupado: boolean;
  eventoNome?: string;
}

interface ProdutoVenda {
  id: string;
  nome: string;
  preco_venda: number;
  imagem_url?: string | null;
  descricao?: string | null;
}

// ─── Paleta de cores ──────────────────────────────────────────────────────────

function useCores(isDark: boolean) {
  return {
    bg:               isDark ? '#1e293b' : '#ffffff',
    bgSecondary:      isDark ? '#334155' : '#f8fafc',
    bgChat:           isDark ? '#0f172a' : '#f1f5f9',
    text:             isDark ? '#f1f5f9' : '#0f172a',
    textMuted:        isDark ? '#94a3b8' : '#64748b',
    border:           isDark ? '#475569' : '#e2e8f0',
    accent:           '#10b981',
    accentBlue:       '#3b82f6',
    userBubble:       isDark ? '#10b981' : '#059669',
    assistantBubble:  isDark ? '#334155' : '#e2e8f0',
  };
}

type Cores = ReturnType<typeof useCores>;

// ─── SVGs inline (sem lucide-react) ─────────────────────────────────────────

const IconX = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconCalendar = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const IconMic = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

const IconSend = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const IconLoader = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconVolume = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
  </svg>
);

const IconVolumeX = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
  </svg>
);

const IconCheck = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const IconChevronLeft = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const IconChevronRight = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const IconPackage = ({ size = 40, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const IconMessageSquare = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);

// ─── Utilitários de data ──────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Extrai data/hora do texto de resposta da IA via regex simples
function extractDataFromText(text: string, dados: DadosAgendamento): Partial<DadosAgendamento> {
  const updates: Partial<DadosAgendamento> = {};

  // Hora: "10h", "14:30", "às 9h"
  const horaMatch = text.match(/(?:às\s*)?(\d{1,2})[:h](\d{2})?/i);
  if (horaMatch && !dados.hora) {
    const h = horaMatch[1].padStart(2, '0');
    const m = horaMatch[2] ?? '00';
    updates.hora = `${h}:${m}`;
  }

  // Data: "dia 15", "amanhã", "segunda"
  const hoje = new Date();
  if (/amanh[ãa]/i.test(text) && !dados.data) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + 1);
    updates.data = d;
  }
  const diaMatch = text.match(/dia\s+(\d{1,2})/i);
  if (diaMatch && !dados.data) {
    const d = new Date(hoje);
    const dia = parseInt(diaMatch[1]);
    d.setDate(dia);
    if (d < hoje) d.setMonth(d.getMonth() + 1);
    updates.data = d;
  }

  // Duração: "30 minutos", "1 hora"
  const durMatch = text.match(/(\d+)\s*(hora|minuto)/i);
  if (durMatch) {
    const n = parseInt(durMatch[1]);
    updates.duracao = /hora/i.test(durMatch[2]) ? n * 60 : n;
  }

  return updates;
}

// ─── Chat de Agenda ───────────────────────────────────────────────────────────

function AssistenteAgendaChat({
  companyId,
  assistantType,
  C,
  playText,
  dados,
  onDadosUpdate,
  onFinalizarAgendamento,
  muteRef,
  produtos,
  onProdutoSelecionado,
}: {
  companyId: string;
  assistantType: 'smart' | 'vendas';
  C: Cores;
  playText?: (text: string) => Promise<void>;
  dados: DadosAgendamento;
  onDadosUpdate: (updates: Partial<DadosAgendamento>) => void;
  onFinalizarAgendamento: () => void;
  muteRef?: React.MutableRefObject<{ toggle: () => void; muted: boolean } | null>;
  produtos: ProdutoVenda[];
  onProdutoSelecionado: (produto: ProdutoVenda) => void;
}) {
  const voiceRecorder = useVoiceRecorder();
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [audioMutado, setAudioMutado] = useState(false);
  const audioMutadoRef = useRef(false);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessaoRef = useRef<{ messages: { role: string; content: string }[] }>({ messages: [] });
  const hasSpokenRef = useRef(false);

  const toggleMute = useCallback(() => {
    setAudioMutado(prev => {
      audioMutadoRef.current = !prev;
      if (muteRef) muteRef.current = { toggle: toggleMute, muted: !prev };
      return !prev;
    });
  }, [muteRef]);

  useEffect(() => {
    if (muteRef) muteRef.current = { toggle: toggleMute, muted: audioMutado };
  }, [muteRef, toggleMute, audioMutado]);

  const playTextSafe = useCallback(async (text: string) => {
    if (audioMutadoRef.current || !playText) return;
    audioQueueRef.current.push(text);
    if (isPlayingRef.current) return;
    while (audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const next = audioQueueRef.current.shift();
      if (next) {
        try { await playText(next); await new Promise(r => setTimeout(r, 300)); } catch {}
      }
    }
    isPlayingRef.current = false;
    inputRef.current?.focus({ preventScroll: true });
  }, [playText]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensagens]);

  // Saudação inicial
  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;
    const saudacao = assistantType === 'vendas'
      ? 'Olá! Para marcar um agendamento, primeiro me diga: qual serviço o cliente vai realizar?'
      : 'Olá! Vou te ajudar a marcar um compromisso. Qual o nome do evento ou compromisso?';
    setMensagens([{ id: 'init', role: 'assistant', content: saudacao }]);
    sessaoRef.current.messages.push({ role: 'assistant', content: saudacao });
    playTextSafe(saudacao);
  }, [assistantType, playTextSafe]);

  // Gatilhos de finalização
  const FINALIZAR = ['confirmar', 'agendar', 'marcar', 'pronto', 'pode marcar', 'finalizar', 'confirme', 'confirma'];

  const enviarMensagem = useCallback(async (texto: string) => {
    if (!texto.trim() || carregando) return;

    // Detecta intenção de finalizar ANTES de chamar IA
    const lower = texto.toLowerCase();
    if (FINALIZAR.some(x => lower.includes(x))) {
      onFinalizarAgendamento();
      return;
    }

    const userMsg: MensagemChat = { id: `u-${Date.now()}`, role: 'user', content: texto };
    setMensagens(prev => [...prev, userMsg]);
    setInput('');
    setCarregando(true);
    sessaoRef.current.messages.push({ role: 'user', content: texto });

    try {
      const contextoAgenda: Record<string, any> = {
        data: dados.data ? formatDateShort(dados.data) : null,
        hora: dados.hora,
        duracao: dados.duracao,
        nomeCliente: dados.nomeCliente,
        observacoes: dados.observacoes,
        produtoId: dados.produtoId,
        produtoNome: dados.produtoNome,
        produtoPreco: dados.produtoPreco,
      };

      const contextoProdutos = assistantType === 'vendas'
        ? produtos.map(p => `- ${p.nome}: ${formatCurrency(p.preco_venda)}${p.descricao ? ` (${p.descricao})` : ''}`).join('\n')
        : undefined;

      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('assistente-agenda-chat', {
        body: {
          company_id: companyId,
          messages: sessaoRef.current.messages,
          agenda_context: contextoAgenda,
          assistant_type: assistantType,
          produtos_context: contextoProdutos,
        },
      });

      const respostaTexto = (!error && data?.message) ? data.message : 'Pode me repetir? Não consegui processar.';
      sessaoRef.current.messages.push({ role: 'assistant', content: respostaTexto });

      setMensagens(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: respostaTexto }]);
      playTextSafe(respostaTexto);

      // Sincroniza painel a partir do texto da IA
      const updates = extractDataFromText(respostaTexto, dados);

      // Detecta produto mencionado
      const produtoMencionado = produtos.find(p =>
        respostaTexto.toLowerCase().includes(p.nome.toLowerCase())
      );
      if (produtoMencionado && !dados.produtoId) {
        updates.produtoId = produtoMencionado.id;
        updates.produtoNome = produtoMencionado.nome;
        updates.produtoPreco = produtoMencionado.preco_venda;
        updates.produtoImagemUrl = produtoMencionado.imagem_url ?? null;
        onProdutoSelecionado(produtoMencionado);
      }

      // Detecta nome do cliente no texto do usuário
      if (!dados.nomeCliente) {
        const nomeMatch = texto.match(/(?:sou|meu nome é|me chamo|para|cliente)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú]?[a-zà-ú]+)*)/i);
        if (nomeMatch) updates.nomeCliente = nomeMatch[1];
      }

      if (Object.keys(updates).length > 0) onDadosUpdate(updates);

    } catch {
      setMensagens(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'Erro ao processar. Tente novamente.' }]);
    } finally {
      setCarregando(false);
    }
  }, [carregando, dados, companyId, assistantType, playTextSafe, onFinalizarAgendamento, onDadosUpdate, onProdutoSelecionado, produtos]);

  const handleStartVoice = useCallback(async () => {
    try { await voiceRecorder.startRecording(); } catch {}
  }, [voiceRecorder]);

  const handleStopVoice = useCallback(async () => {
    try {
      setTranscrevendo(true);
      const audioBlob = await voiceRecorder.stopRecording();
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}` },
        body: formData,
      });
      if (response.ok) {
        const { text } = await response.json();
        if (text?.trim()) await enviarMensagem(text.trim());
      }
    } catch {} finally { setTranscrevendo(false); }
  }, [voiceRecorder, enviarMensagem]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: C.bgChat }}>
      {/* Mensagens */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
        {mensagens.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%',
              borderRadius: '16px',
              padding: '10px 14px',
              fontSize: '14px',
              backgroundColor: msg.role === 'user' ? C.userBubble : C.assistantBubble,
              color: msg.role === 'user' ? '#ffffff' : C.text,
              lineHeight: 1.5,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {carregando && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ borderRadius: '16px', padding: '10px 14px', backgroundColor: C.assistantBubble, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ animation: 'spin 1s linear infinite', display: 'flex' }}>
                <IconLoader size={16} color={C.accent} />
              </div>
              <span style={{ fontSize: '13px', color: C.textMuted }}>Processando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, backgroundColor: C.bg, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(input); } }}
            onBlur={e => {
              const rel = e.relatedTarget as HTMLElement | null;
              if (!carregando && !transcrevendo && !voiceRecorder.isRecording && (!rel || rel.tagName === 'BODY')) {
                setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
              }
            }}
            placeholder="Digite sua mensagem..."
            disabled={carregando || transcrevendo}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}`,
              fontSize: '14px', backgroundColor: C.bgSecondary, color: C.text, outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={voiceRecorder.isRecording ? handleStopVoice : handleStartVoice}
            disabled={carregando || transcrevendo}
            style={{
              padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: voiceRecorder.isRecording ? '#ef4444' : C.accentBlue,
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: (carregando || transcrevendo) ? 0.5 : 1,
            }}
          >
            {transcrevendo ? <IconLoader size={18} color="#fff" /> : <IconMic size={18} color="#fff" />}
          </button>
          <button
            type="button"
            onClick={() => enviarMensagem(input)}
            disabled={!input.trim() || carregando || transcrevendo}
            style={{
              padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: C.accent, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: (!input.trim() || carregando || transcrevendo) ? 0.5 : 1,
            }}
          >
            {carregando ? <IconLoader size={18} color="#fff" /> : <IconSend size={18} color="#fff" />}
          </button>
        </div>
        {voiceRecorder.isRecording && (
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>Gravando... {voiceRecorder.duration}s</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

// ─── Mini Calendário Mensal ───────────────────────────────────────────────────

function MiniCalendario({
  C,
  dataSelecionada,
  eventosOcupados,
  onSelectData,
}: {
  C: Cores;
  dataSelecionada: Date | null;
  eventosOcupados: string[]; // ISO strings de datas ocupadas
  onSelectData: (data: Date) => void;
}) {
  const [mesAtual, setMesAtual] = useState(() => {
    const d = dataSelecionada ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const hoje = new Date();
  const diasNoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
  const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).getDay();

  const mesStr = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div style={{ padding: '12px' }}>
      {/* Navegação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button
          onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))}
          style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px', color: C.textMuted }}
        >
          <IconChevronLeft size={16} color={C.textMuted} />
        </button>
        <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, textTransform: 'capitalize' }}>{mesStr}</span>
        <button
          onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))}
          style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px', color: C.textMuted }}
        >
          <IconChevronRight size={16} color={C.textMuted} />
        </button>
      </div>

      {/* Cabeçalho dias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {diasSemana.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: C.textMuted, padding: '2px' }}>{d}</div>
        ))}
      </div>

      {/* Grid dias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: diasNoMes }).map((_, i) => {
          const dia = i + 1;
          const data = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia);
          const isoStr = data.toISOString().split('T')[0];
          const isHoje = data.toDateString() === hoje.toDateString();
          const isSelected = dataSelecionada && data.toDateString() === dataSelecionada.toDateString();
          const isOcupado = eventosOcupados.includes(isoStr);
          const isPast = data < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

          return (
            <button
              key={dia}
              disabled={isPast}
              onClick={() => onSelectData(data)}
              style={{
                padding: '4px 0',
                border: 'none',
                cursor: isPast ? 'not-allowed' : 'pointer',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : 400,
                backgroundColor: isSelected ? C.accent : isHoje ? `${C.accent}30` : 'transparent',
                color: isSelected ? '#fff' : isPast ? C.textMuted : C.text,
                opacity: isPast ? 0.4 : 1,
                position: 'relative',
                textAlign: 'center',
              }}
            >
              {dia}
              {isOcupado && !isSelected && (
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#ef4444', position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Painel de slots do dia ───────────────────────────────────────────────────

function PainelSlotsDia({
  C,
  data,
  slots,
  horaSelecionada,
  onSelectHora,
}: {
  C: Cores;
  data: Date;
  slots: SlotHorario[];
  horaSelecionada: string;
  onSelectHora: (hora: string) => void;
}) {
  return (
    <div style={{ padding: '12px' }}>
      <p style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Horários disponíveis — {data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {slots.map(slot => (
          <button
            key={slot.hora}
            disabled={slot.ocupado}
            onClick={() => !slot.ocupado && onSelectHora(slot.hora)}
            title={slot.ocupado ? slot.eventoNome ?? 'Ocupado' : ''}
            style={{
              padding: '6px 4px',
              border: `1px solid ${horaSelecionada === slot.hora ? C.accent : C.border}`,
              borderRadius: '6px',
              fontSize: '12px',
              cursor: slot.ocupado ? 'not-allowed' : 'pointer',
              backgroundColor: horaSelecionada === slot.hora ? C.accent : slot.ocupado ? C.bgSecondary : 'transparent',
              color: horaSelecionada === slot.hora ? '#fff' : slot.ocupado ? C.textMuted : C.text,
              opacity: slot.ocupado ? 0.5 : 1,
              textAlign: 'center',
            }}
          >
            {slot.hora}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Painel lateral direito ───────────────────────────────────────────────────

function PainelAgendamento({
  C,
  dados,
  assistantType,
  onDadosUpdate,
  onConfirmar,
  step,
  eventosOcupados,
  slots,
  loadingSlots,
}: {
  C: Cores;
  dados: DadosAgendamento;
  assistantType: 'smart' | 'vendas';
  onDadosUpdate: (updates: Partial<DadosAgendamento>) => void;
  onConfirmar: () => void;
  step: Step;
  eventosOcupados: string[];
  slots: SlotHorario[];
  loadingSlots: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: `1px solid ${C.border}`,
    fontSize: '13px',
    backgroundColor: C.bgSecondary,
    color: C.text,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '4px',
    display: 'block',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: `1px solid ${C.border}`,
  };

  if (step === 'confirmar_data') {
    // Step 2: calendário + slots
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '12px 12px 0', flexShrink: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Confirme a data</p>
          <p style={{ fontSize: '12px', color: C.textMuted }}>Selecione o dia e horário desejados</p>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <MiniCalendario
            C={C}
            dataSelecionada={dados.data}
            eventosOcupados={eventosOcupados}
            onSelectData={data => onDadosUpdate({ data })}
          />
          {dados.data && (
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              {loadingSlots ? (
                <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: C.textMuted }}>
                  <IconLoader size={16} color={C.textMuted} /> <span style={{ fontSize: '13px' }}>Carregando horários...</span>
                </div>
              ) : (
                <PainelSlotsDia
                  C={C}
                  data={dados.data}
                  slots={slots}
                  horaSelecionada={dados.hora}
                  onSelectHora={hora => onDadosUpdate({ hora })}
                />
              )}
            </div>
          )}
        </div>
        {dados.data && dados.hora && (
          <div style={{ padding: '12px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: `${C.accent}15`, border: `1px solid ${C.accent}40`, marginBottom: '10px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: C.accent }}>
                {formatDate(dados.data)} às {dados.hora}
              </p>
              {dados.duracao > 0 && (
                <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>Duração: {dados.duracao >= 60 ? `${dados.duracao / 60}h` : `${dados.duracao}min`}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step agendamento: formulário editável + produto
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>

        {/* Data e hora */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>📅 Data</label>
              <input
                type="date"
                value={dados.data ? dados.data.toISOString().split('T')[0] : ''}
                onChange={e => {
                  if (e.target.value) onDadosUpdate({ data: new Date(e.target.value + 'T12:00:00') });
                }}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>⏱️ Hora</label>
              <input
                type="time"
                value={dados.hora}
                onChange={e => onDadosUpdate({ hora: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Duração */}
        <div style={sectionStyle}>
          <label style={labelStyle}>⏱️ Duração</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[30, 60, 90, 120].map(min => (
              <button
                key={min}
                onClick={() => onDadosUpdate({ duracao: min })}
                style={{
                  flex: 1, padding: '6px 4px', borderRadius: '6px', border: `1px solid ${dados.duracao === min ? C.accent : C.border}`,
                  fontSize: '11px', cursor: 'pointer', backgroundColor: dados.duracao === min ? C.accent : 'transparent',
                  color: dados.duracao === min ? '#fff' : C.text,
                }}
              >
                {min < 60 ? `${min}m` : `${min / 60}h`}
              </button>
            ))}
          </div>
        </div>

        {/* Nome cliente */}
        <div style={sectionStyle}>
          <label style={labelStyle}>👤 Nome / Cliente</label>
          <input
            type="text"
            placeholder="Nome do cliente ou evento"
            value={dados.nomeCliente}
            onChange={e => onDadosUpdate({ nomeCliente: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Produto/serviço */}
        {(assistantType === 'vendas' || dados.produtoNome) && (
          <div style={sectionStyle}>
            <label style={labelStyle}>📦 Serviço / Produto</label>
            {dados.produtoNome ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', border: `1px solid ${C.accent}40`, backgroundColor: `${C.accent}08` }}>
                {dados.produtoImagemUrl && (
                  <img src={dados.produtoImagemUrl} alt={dados.produtoNome} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: C.text, margin: 0 }}>{dados.produtoNome}</p>
                  {dados.produtoPreco && (
                    <p style={{ fontSize: '12px', color: C.accent, margin: 0 }}>{formatCurrency(dados.produtoPreco)}</p>
                  )}
                </div>
                <button
                  onClick={() => onDadosUpdate({ produtoId: null, produtoNome: null, produtoPreco: null, produtoImagemUrl: null })}
                  style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: C.textMuted, flexShrink: 0 }}
                >
                  <IconX size={14} color={C.textMuted} />
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: C.textMuted, fontStyle: 'italic' }}>
                {assistantType === 'vendas' ? 'Obrigatório — diga o serviço no chat' : 'Opcional — diga o serviço no chat'}
              </p>
            )}
          </div>
        )}

        {/* Valor */}
        {dados.produtoPreco && (
          <div style={sectionStyle}>
            <label style={labelStyle}>💰 Valor</label>
            <p style={{ fontSize: '18px', fontWeight: 700, color: C.accent, margin: 0 }}>{formatCurrency(dados.produtoPreco)}</p>
          </div>
        )}

        {/* Observações */}
        <div style={sectionStyle}>
          <label style={labelStyle}>📝 Observações</label>
          <textarea
            rows={2}
            placeholder="Observações opcionais..."
            value={dados.observacoes}
            onChange={e => onDadosUpdate({ observacoes: e.target.value })}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>
      </div>

      {/* Botão confirmar */}
      <div style={{ padding: '12px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button
          onClick={onConfirmar}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
            backgroundColor: C.accent, color: '#fff', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <IconCalendar size={16} color="#fff" />
          Confirmar Agendamento
        </button>
      </div>
    </div>
  );
}

// ─── Componente interno ───────────────────────────────────────────────────────

function GestorAgendaInner({ data: propData, onClose, theme = 'dark', playText }: GestorAgendaDisplayProps) {
  const { companyId, slug, assistantType: assistantTypeProp, prefilledData } = propData;
  const isDark = theme === 'dark';
  const C = useCores(isDark);
  const isMobile = useIsMobile();
  const supabase = createClient();

  // Estado
  const [step, setStep] = useState<Step>('agendamento');
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('chat');
  const [assistantType, setAssistantType] = useState<'smart' | 'vendas'>(assistantTypeProp ?? 'smart');
  const [dados, setDados] = useState<DadosAgendamento>({
    data: prefilledData?.date ?? null,
    hora: prefilledData?.time ?? '',
    duracao: 60,
    nomeCliente: prefilledData?.name ?? '',
    observacoes: '',
    produtoId: prefilledData?.produtoId ?? null,
    produtoNome: null,
    produtoPreco: null,
    produtoImagemUrl: null,
  });
  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]);
  const [metodosAtivos, setMetodosAtivos] = useState<string[]>(['pix_generate']);
  const [eventosOcupados, setEventosOcupados] = useState<string[]>([]);
  const [slots, setSlots] = useState<SlotHorario[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [criandoEvento, setCriandoEvento] = useState(false);
  const [googleEventId, setGoogleEventId] = useState<string | null>(null);
  const muteRef = useRef<{ toggle: () => void; muted: boolean } | null>(null);
  const [, forceUpdate] = useState(0);

  // Carrega dados iniciais
  useEffect(() => {
    async function load() {
      // Detecta assistant_type da empresa
      const { data: company } = await supabase
        .from('companies')
        .select('assistant_type')
        .eq('id', companyId)
        .maybeSingle();
      if (company?.assistant_type) setAssistantType(company.assistant_type as 'smart' | 'vendas');

      // Carrega produtos
      const { data: prods } = await supabase
        .from('produtos_venda')
        .select('id, nome, descricao, preco_venda, imagem_url')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (prods) setProdutos(prods);

      // Carrega métodos de pagamento ativos
      const { data: settings } = await supabase
        .from('company_function_settings')
        .select('function_key, is_enabled')
        .eq('company_id', companyId)
        .in('function_key', ['pix_generate', 'nfc_debito', 'nfc_credito', 'tef_debito', 'tef_credito', 'dinheiro']);
      const ativos = (settings ?? []).filter((r: any) => r.is_enabled).map((r: any) => r.function_key);
      if (ativos.length > 0) setMetodosAtivos(ativos);

      // Carrega eventos do Google Calendar para o mês atual (ocupados)
      try {
        const hoje = new Date();
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
        const { data: evResult } = await supabase.functions.invoke('listar-eventos-google', {
          body: { company_id: companyId, time_min: hoje.toISOString(), time_max: fim.toISOString() },
        });
        if (evResult?.events) {
          const ocupados = (evResult.events as any[]).map((ev: any) =>
            new Date(ev.start.dateTime || ev.start.date).toISOString().split('T')[0]
          );
          setEventosOcupados([...new Set(ocupados)]);
        }
      } catch {}
    }
    load();
  }, [companyId]);

  // Carrega slots do dia selecionado
  useEffect(() => {
    if (!dados.data) return;
    setLoadingSlots(true);
    async function loadSlots() {
      try {
        const dateStr = dados.data!.toISOString().split('T')[0];
        const { data: evResult } = await supabase.functions.invoke('listar-eventos-google', {
          body: {
            company_id: companyId,
            time_min: `${dateStr}T00:00:00`,
            time_max: `${dateStr}T23:59:59`,
          },
        });

        // Gera slots de 8h-18h de 30 em 30 min
        const slotsGerados: SlotHorario[] = [];
        for (let h = 8; h < 18; h++) {
          for (let m = 0; m < 60; m += 30) {
            const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            let ocupado = false;
            let eventoNome: string | undefined;
            if (evResult?.events) {
              for (const ev of evResult.events as any[]) {
                const inicio = new Date(ev.start.dateTime);
                const fim = new Date(ev.end.dateTime);
                const slotDt = new Date(`${dateStr}T${hora}:00`);
                if (slotDt >= inicio && slotDt < fim) {
                  ocupado = true;
                  eventoNome = ev.summary;
                  break;
                }
              }
            }
            slotsGerados.push({ hora, ocupado, eventoNome });
          }
        }
        setSlots(slotsGerados);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [dados.data, companyId]);

  const handleDadosUpdate = useCallback((updates: Partial<DadosAgendamento>) => {
    setDados(prev => ({ ...prev, ...updates }));
  }, []);

  const handleFinalizarAgendamento = useCallback(() => {
    setStep('confirmar_data');
    if (isMobile) setAbaAtiva('painel');
  }, [isMobile]);

  const handleConfirmarData = useCallback(async () => {
    if (!dados.data || !dados.hora) return;

    // Se vendas, obrigatório ter produto
    if (assistantType === 'vendas' && !dados.produtoId) {
      alert('Para o modo vendas, é necessário selecionar um serviço/produto.');
      return;
    }

    setCriandoEvento(true);
    try {
      // Registra commission_pending ANTES de qualquer outra coisa (versão vendas)
      if (assistantType === 'vendas' && dados.produtoPreco && dados.produtoId) {
        await supabase.from('commission_pending').insert({
          company_id: companyId,
          pedido_id: null,
          metodo: 'agendamento',
          valor_venda: dados.produtoPreco,
          valor_comissao: dados.produtoPreco * 0.10,
          status: 'pendente',
        });
      }

      // Cria evento no Google Calendar
      const [horas, minutos] = dados.hora.split(':').map(Number);
      const startTime = new Date(dados.data);
      startTime.setHours(horas, minutos, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + dados.duracao);

      const descricao = [
        dados.produtoNome ? `Serviço: ${dados.produtoNome}` : '',
        dados.produtoPreco ? `Valor: ${formatCurrency(dados.produtoPreco)}` : '',
        dados.observacoes,
      ].filter(Boolean).join('\n');

      const { data: evResult } = await supabase.functions.invoke('criar-evento-calendario', {
        body: {
          company_id: companyId,
          summary: dados.nomeCliente || dados.produtoNome || 'Agendamento',
          description: descricao,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        },
      });

      if (evResult?.event_id) setGoogleEventId(evResult.event_id);

      // Registra em customer_appointments
      await supabase.from('customer_appointments').insert({
        company_id: companyId,
        google_event_id: evResult?.event_id ?? `local-${Date.now()}`,
        appointment_date: startTime.toISOString(),
        appointment_end: endTime.toISOString(),
        customer_name: dados.nomeCliente || null,
        service_type: dados.produtoNome || null,
        status: 'scheduled',
        notes: dados.observacoes || null,
      }).maybeSingle();

      // Verifica se deve cobrar agora
      const { data: funcConfig } = await supabase
        .from('company_function_settings')
        .select('config')
        .eq('company_id', companyId)
        .eq('function_key', 'agendar_compromisso')
        .maybeSingle();

      const cobrarNoAgendamento = funcConfig?.config?.cobrar_no_agendamento === true;

      if (cobrarNoAgendamento && dados.produtoPreco) {
        setStep('pagamento');
      } else {
        setStep('confirmado');
        playText?.('Agendamento confirmado com sucesso!').catch(() => {});
      }
    } catch (err) {
      console.error('Erro ao criar evento:', err);
      alert('Erro ao criar evento. Verifique se o Google Calendar está conectado.');
    } finally {
      setCriandoEvento(false);
    }
  }, [dados, assistantType, companyId, playText]);

  // Título e subtítulo do header por step
  const titulo = step === 'agendamento' ? 'Gestor de Agenda'
    : step === 'confirmar_data' ? 'Confirmar Data'
    : step === 'pagamento' ? 'Pagamento'
    : 'Agendado!';

  const subtitulo = step === 'agendamento'
    ? (assistantType === 'vendas' ? 'Agendamento com produto obrigatório' : 'Agendamento assistido por IA')
    : step === 'confirmar_data' ? 'Selecione data e horário'
    : step === 'pagamento' ? 'Finalize o pagamento'
    : 'Compromisso registrado';

  // Step confirmado
  if (step === 'confirmado') {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px' }}>
        <div style={{ backgroundColor: C.bg, borderRadius: '16px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: `${C.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <IconCheck size={32} color={C.accent} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Agendamento Confirmado!</h3>
          <p style={{ fontSize: '14px', color: C.textMuted, marginBottom: '8px' }}>
            {dados.nomeCliente || dados.produtoNome || 'Compromisso'} registrado com sucesso.
          </p>
          {dados.data && dados.hora && (
            <p style={{ fontSize: '14px', fontWeight: 600, color: C.accent, marginBottom: '24px' }}>
              {formatDate(dados.data)} às {dados.hora}
            </p>
          )}
          <button
            onClick={onClose}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: C.accent, color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      </div>,
      document.body
    );
  }

  function renderConteudo() {
    // Step pagamento
    if (step === 'pagamento') {
      return (
        <div style={{ height: 560, padding: '0 24px 24px' }}>
          <CheckoutFlow
            companyId={companyId}
            theme={theme}
            onClose={onClose}
            onVoltar={() => setStep('confirmar_data')}
            playText={playText}
            metodosAtivos={metodosAtivos}
            observacaoEntrega={`Agendamento: ${dados.nomeCliente || dados.produtoNome || 'Compromisso'} - ${dados.data ? formatDateShort(dados.data) : ''} às ${dados.hora}`}
          />
        </div>
      );
    }

    // Steps agendamento e confirmar_data — duas colunas
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 560 }}>
        {/* Tabs mobile */}
        {isMobile && (
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {([
              { key: 'chat' as const, label: 'Assistente', Icon: IconMessageSquare },
              { key: 'painel' as const, label: step === 'confirmar_data' ? 'Calendário' : 'Painel', Icon: IconCalendar },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setAbaAtiva(key)}
                style={{
                  flex: 1, padding: '10px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  borderBottom: abaAtiva === key ? `2px solid ${C.accent}` : '2px solid transparent',
                  color: abaAtiva === key ? C.accent : C.textMuted,
                }}
              >
                <Icon size={16} color={abaAtiva === key ? C.accent : C.textMuted} />
                {label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Coluna esquerda: chat */}
          {(!isMobile || abaAtiva === 'chat') && (
            <div style={{
              flex: 1, overflow: 'hidden',
              ...((!isMobile) ? { borderRight: `1px solid ${C.border}` } : {}),
              display: (!isMobile || abaAtiva === 'chat') ? 'flex' : 'none',
              flexDirection: 'column',
            }}>
              <AssistenteAgendaChat
                companyId={companyId}
                assistantType={assistantType}
                C={C}
                playText={playText}
                dados={dados}
                onDadosUpdate={handleDadosUpdate}
                onFinalizarAgendamento={handleFinalizarAgendamento}
                muteRef={muteRef}
                produtos={produtos}
                onProdutoSelecionado={p => handleDadosUpdate({
                  produtoId: p.id,
                  produtoNome: p.nome,
                  produtoPreco: p.preco_venda,
                  produtoImagemUrl: p.imagem_url ?? null,
                })}
              />
            </div>
          )}

          {/* Coluna direita: painel */}
          {(!isMobile || abaAtiva === 'painel') && (
            <div style={{
              width: isMobile ? '100%' : '340px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: C.bg,
            }}>
              {step === 'confirmar_data' ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <PainelAgendamento
                    C={C}
                    dados={dados}
                    assistantType={assistantType}
                    onDadosUpdate={handleDadosUpdate}
                    onConfirmar={handleConfirmarData}
                    step="confirmar_data"
                    eventosOcupados={eventosOcupados}
                    slots={slots}
                    loadingSlots={loadingSlots}
                  />
                  {/* Botão de confirmar separado para o step de data */}
                  {dados.data && dados.hora && (
                    <div style={{ padding: '12px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                      <button
                        onClick={handleConfirmarData}
                        disabled={criandoEvento}
                        style={{
                          width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                          backgroundColor: criandoEvento ? C.border : C.accent,
                          color: '#fff', fontWeight: 700, fontSize: '14px',
                          cursor: criandoEvento ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                      >
                        {criandoEvento ? <><IconLoader size={16} color="#fff" /> Criando...</> : <><IconCheck size={16} color="#fff" /> Confirmar Agendamento</>}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <PainelAgendamento
                  C={C}
                  dados={dados}
                  assistantType={assistantType}
                  onDadosUpdate={handleDadosUpdate}
                  onConfirmar={handleFinalizarAgendamento}
                  step="agendamento"
                  eventosOcupados={eventosOcupados}
                  slots={slots}
                  loadingSlots={loadingSlots}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Steps no header
  const stepsConfig = [
    { key: 'agendamento', label: 'Chat' },
    { key: 'confirmar_data', label: 'Data' },
    { key: 'pagamento', label: 'Pag.' },
  ];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: isMobile ? '480px' : '900px',
          borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden', border: `1px solid ${C.border}`,
          backgroundColor: C.bg, display: 'flex', flexDirection: 'column',
          animation: 'zoomIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCalendar size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: C.text, margin: 0 }}>{titulo}</h2>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: 0 }}>{subtitulo}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Indicador de progresso */}
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                {stepsConfig.map((s, i) => {
                  const isActive = s.key === step || (s.key === 'agendamento' && (step === 'agendamento' || step === 'confirmar_data'));
                  const isDone = (s.key === 'agendamento' && (step === 'confirmar_data' || step === 'pagamento' || step === 'confirmado'))
                    || (s.key === 'confirmar_data' && (step === 'pagamento' || step === 'confirmado'));
                  return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: isDone || isActive ? C.accent : C.border,
                        transition: 'background-color 0.2s',
                      }} />
                      {i < stepsConfig.length - 1 && <div style={{ width: '12px', height: '1px', backgroundColor: C.border }} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Botão mute */}
            {step === 'agendamento' && (
              <button
                onClick={() => { muteRef.current?.toggle(); forceUpdate(n => n + 1); }}
                style={{
                  padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  backgroundColor: muteRef.current?.muted ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                  color: muteRef.current?.muted ? '#ef4444' : C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {muteRef.current?.muted ? <IconVolumeX size={18} color="#ef4444" /> : <IconVolume size={18} color={C.accent} />}
              </button>
            )}

            <button
              onClick={onClose}
              style={{ padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', display: 'flex' }}
            >
              <IconX size={18} color={C.textMuted} />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ position: 'relative', overflow: 'hidden', backgroundColor: C.bg }}>
          {renderConteudo()}
        </div>
      </div>

      <style>{`
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>,
    document.body
  );
}

// ─── Export com montagem controlada ──────────────────────────────────────────

export default function CreateEventModal(props: GestorAgendaDisplayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <GestorAgendaInner {...props} />;
}