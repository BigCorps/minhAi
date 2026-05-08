'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/ConversationChatModal.tsx
//
// Modal estilo WhatsApp para ver o histórico de uma conversa Meta e enviar mensagens manuais.
// Abre via portal no document.body — não usa lucide-react nos balões.

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, X, Send, PauseCircle, PlayCircle, Phone, Instagram, Facebook } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────

type Connection = {
  id:                          string;
  company_id:                  string;
  page_name:                   string;
  meta_page_id:                string;
  instagram_account_id:        string | null;
  whatsapp_number_id:          string | null;
  whatsapp_number:             string | null;
  encrypted_page_access_token: string;
};

type Conversation = {
  conversation_id: string;
  page_id:         string;
  platform:        string;
  is_paused:       boolean;
  sender_name:     string | null;
  custom_name:     string | null;
  last_message_text: string | null;
  updated_at:      string;
  connection?:     Connection;
};

type Message = {
  id:              string;
  conversation_id: string;
  role:            'user' | 'assistant' | 'system';
  content:         string;
  created_at:      string;
};

interface ConversationChatModalProps {
  conv:           Conversation;
  connection:     Connection;
  onClose:        () => void;
  onTogglePause:  (conv: Conversation) => void;
}

// ─── Estilos dark/light via inline (Tailwind dinâmico não funciona em portais) ──

const STYLES = {
  overlay: {
    position:        'fixed' as const,
    inset:           0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex:          9999,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         '16px',
  },
  modal: (isDark: boolean) => ({
    background:   isDark ? '#0f172a' : '#ffffff',
    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
    borderRadius: '16px',
    width:        '100%',
    maxWidth:     '480px',
    height:       '600px',
    maxHeight:    '90vh',
    display:      'flex',
    flexDirection: 'column' as const,
    overflow:     'hidden',
    boxShadow:    '0 25px 50px rgba(0,0,0,0.4)',
  }),
  header: (isDark: boolean) => ({
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '12px 16px',
    borderBottom:    `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
    background:      isDark ? '#1e293b' : '#f8fafc',
    flexShrink:      0,
  }),
  messagesArea: (isDark: boolean) => ({
    flex:             1,
    overflowY:        'auto' as const,
    padding:          '16px',
    display:          'flex',
    flexDirection:    'column' as const,
    gap:              '8px',
    background:       isDark ? '#0f172a' : '#f1f5f9',
  }),
  inputArea: (isDark: boolean) => ({
    padding:      '10px 12px',
    borderTop:    `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
    display:      'flex',
    gap:          '8px',
    alignItems:   'flex-end',
    background:   isDark ? '#1e293b' : '#f8fafc',
    flexShrink:   0,
  }),
  bubble: (role: 'user' | 'assistant' | 'system', isDark: boolean) => ({
    maxWidth:     '75%',
    padding:      '8px 12px',
    borderRadius: role === 'user'      ? '12px 12px 12px 2px'
                : role === 'assistant' ? '12px 12px 2px 12px'
                :                       '8px',
    background:   role === 'user'      ? (isDark ? '#334155' : '#e2e8f0')
                : role === 'assistant' ? (isDark ? '#1d4ed8' : '#2563eb')
                :                       (isDark ? '#1e3a2f' : '#d1fae5'),
    color:        role === 'user'      ? (isDark ? '#e2e8f0' : '#1e293b')
                :                        '#ffffff',
    alignSelf:    role === 'user' ? 'flex-start' : 'flex-end',
    wordBreak:    'break-word' as const,
  }),
};

// ─── Helper: detectar dark mode ───────────────────────────────────────────

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// ─── Helper: nome de exibição ─────────────────────────────────────────────

function getDisplayName(conv: Conversation): string {
  return conv.custom_name || conv.sender_name || conv.conversation_id.substring(0, 12) + '...';
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Ícone de plataforma ──────────────────────────────────────────────────

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'whatsapp')  return <Phone     className="h-4 w-4 text-green-400" />;
  if (platform === 'instagram') return <Instagram className="h-4 w-4 text-pink-400" />;
  return <Facebook className="h-4 w-4 text-blue-400" />;
}

// ─── Componente principal ─────────────────────────────────────────────────

export function ConversationChatModal({
  conv,
  connection,
  onClose,
  onTogglePause,
}: ConversationChatModalProps) {
  const supabase   = createClient();
  const isDark     = useIsDark();

  const [messages, setMessages]       = useState<Message[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [text, setText]               = useState('');
  const [isSending, setIsSending]     = useState(false);
  const [sendError, setSendError]     = useState<string | null>(null);
  const [convId, setConvId]           = useState<string | null>(null);
  const messagesEndRef                = useRef<HTMLDivElement>(null);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  const displayName = getDisplayName(conv);

  // ── Scroll automático para o final ──────────────────────────────────────
  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Fechar ao pressionar Escape ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

useEffect(() => {
  async function loadMessages() {
    setIsLoading(true)
    
    console.log('🔍 DEBUG modal:', {
      conversation_id: conv.conversation_id,
      page_id: conv.page_id,
      platform: conv.platform,
    })

    const { data: convRows } = await supabase
      .from('conversations')
      .select('id')
      .eq('meta_from_id', conv.conversation_id)
      .eq('meta_page_id', conv.page_id)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('🔍 convRows encontradas:', convRows)

    if (!convRows || convRows.length === 0) {
      setIsLoading(false)
      return
    }

    // Usar a mais recente para o realtime
    setConvId(convRows[0].id)
    const convIds = convRows.map(c => c.id)

    // Buscar mensagens de TODAS as conversations
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })
      .limit(60)

    setMessages(msgs || [])
    setIsLoading(false)
  }

  loadMessages()
}, [conv.conversation_id, conv.page_id])

// ── Realtime: escuta mensagens novas E mudanças no controle da conversa ──
useEffect(() => {
  if (!convId) return

  // Canal 1: mensagens novas na conversation atual
  const msgChannel = supabase
    .channel(`chat_msgs_${convId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${convId}`,
      },
      (payload: any) => {
        const msg = payload.new as Message
        setMessages((prev) => {
          const withoutTemp = prev.filter(
            (m) => !(m.id.startsWith('temp_') && m.content === msg.content)
          )
          if (withoutTemp.some((m) => m.id === msg.id)) return withoutTemp
          return [...withoutTemp, msg]
        })
      }
    )
    .subscribe()

  // Canal 2: qualquer update no conversation_ai_control → recarrega tudo
  const ctrlChannel = supabase
    .channel(`chat_ctrl_${conv.conversation_id}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'conversation_ai_control',
        filter: `conversation_id=eq.${conv.conversation_id}`,
      },
      async () => {
        // Rebuscar todas as conversations e mensagens do contato
        const { data: convRows } = await supabase
          .from('conversations')
          .select('id')
          .eq('meta_from_id', conv.conversation_id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!convRows || convRows.length === 0) return

        const latestId = convRows[0].id
        if (latestId !== convId) setConvId(latestId)

        const convIds = convRows.map(c => c.id)
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, conversation_id, role, content, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true })
          .limit(60)

        setMessages(msgs || [])
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(msgChannel)
    supabase.removeChannel(ctrlChannel)
  }
}, [convId, conv.conversation_id])

  // ── Enviar mensagem ──────────────────────────────────────────────────────
  async function handleSend() {
    if (!text.trim() || isSending) return;
    setSendError(null);
    setIsSending(true);

    // Otimistic UI
    const tempMsg: Message = {
      id:              `temp_${Date.now()}`,
      conversation_id: convId || '',
      role:            'assistant',
      content:         text.trim(),
      created_at:      new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    const sentText = text.trim();
    setText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/meta-send-message`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            recipient_id:      conv.conversation_id,
            message:           sentText,
            page_access_token: connection.encrypted_page_access_token,
            platform:          conv.platform,
          }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro ao enviar');

      // Substituir mensagem temp pelo id real (se retornado)
      if (d.message_id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsg.id ? { ...m, id: d.message_id } : m
          )
        );
      }
    } catch (e: any) {
      setSendError(e.message);
      // Remover mensagem otimista em caso de erro
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const modal = (
    <div style={STYLES.overlay} onClick={onClose}>
      <div style={STYLES.modal(isDark)} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={STYLES.header(isDark)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {/* Avatar com inicial */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: isDark ? '#334155' : '#dbeafe',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 700,
              color: isDark ? '#93c5fd' : '#1d4ed8',
              flexShrink: 0,
            }}>
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>

            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: '14px', fontWeight: 600,
                color: isDark ? '#f1f5f9' : '#0f172a',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayName}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <PlatformIcon platform={conv.platform} />
                <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'capitalize' }}>
                  {conv.platform}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Botão pausar/retomar */}
            <button
              onClick={() => onTogglePause(conv)}
              title={conv.is_paused ? 'Retomar assistente' : 'Pausar assistente'}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                background: conv.is_paused
                  ? (isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7')
                  : (isDark ? 'rgba(234,179,8,0.15)'  : '#fef9c3'),
                color: conv.is_paused
                  ? (isDark ? '#4ade80' : '#15803d')
                  : (isDark ? '#facc15' : '#854d0e'),
              }}
            >
              {conv.is_paused
                ? <><PlayCircle  style={{ width: 13, height: 13 }} />Retomar</>
                : <><PauseCircle style={{ width: 13, height: 13 }} />Pausar</>
              }
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: '50%', border: 'none',
                cursor: 'pointer',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                color: isDark ? '#94a3b8' : '#64748b',
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* ── Mensagens ── */}
        <div style={STYLES.messagesArea(isDark)}>
          {isLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <p style={{ fontSize: '13px', color: isDark ? '#64748b' : '#94a3b8' }}>
                Nenhuma mensagem no histórico.
              </p>
              <p style={{ fontSize: '11px', color: isDark ? '#475569' : '#cbd5e1' }}>
                Só mensagens após a migration ficam registradas.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    msg.role === 'user' ? 'flex-start' : 'flex-end',
              }}>
                <div style={STYLES.bubble(msg.role as any, isDark)}>
                  <p style={{ fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                    {msg.content.replace(/^\[Manual\] /, '')}
                  </p>
                </div>
                <span style={{
                  fontSize: '10px', marginTop: '2px',
                  color: isDark ? '#475569' : '#94a3b8',
                  paddingLeft:  msg.role === 'user' ? '4px' : 0,
                  paddingRight: msg.role !== 'user' ? '4px' : 0,
                }}>
                  {formatTime(msg.created_at)}
                  {msg.role === 'assistant' && ' ✓✓'}
                </span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Erro de envio ── */}
        {sendError && (
          <div style={{
            padding: '6px 16px', fontSize: '12px',
            background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2',
            color: isDark ? '#fca5a5' : '#dc2626',
            borderTop: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`,
          }}>
            ❌ {sendError}
          </div>
        )}

        {/* ── Input ── */}
        <div style={STYLES.inputArea(isDark)}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            rows={1}
            placeholder={`Mensagem para ${displayName}...`}
            style={{
              flex: 1, resize: 'none', outline: 'none',
              padding: '8px 12px', borderRadius: '20px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db'}`,
              background: isDark ? '#0f172a' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#0f172a',
              fontSize: '13px', lineHeight: '1.4',
              maxHeight: '100px', overflowY: 'auto',
            }}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !text.trim()}
            style={{
              width: 38, height: 38, borderRadius: '50%', border: 'none',
              cursor: isSending || !text.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              background: isSending || !text.trim()
                ? (isDark ? '#1e293b' : '#e2e8f0')
                : '#2563eb',
              color: isSending || !text.trim()
                ? (isDark ? '#475569' : '#94a3b8')
                : '#ffffff',
              transition: 'all 0.15s',
            }}
          >
            {isSending
              ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
              : <Send style={{ width: 16, height: 16 }} />
            }
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
