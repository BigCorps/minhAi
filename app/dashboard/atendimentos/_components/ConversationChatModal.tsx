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

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 287.56 191"
      fill="currentColor"
    >
      <path d="M31.06,126c0,11,2.41,19.41,5.56,24.51A19,19,0,0,0,53.19,160c8.1,0,15.51-2,29.79-21.76,11.44-15.83,24.92-38,34-52l15.36-23.6c10.67-16.39,23-34.61,37.18-47C181.07,5.6,193.54,0,206.09,0c21.07,0,41.14,12.21,56.5,35.11,16.81,25.08,25,56.67,25,89.27,0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191V160c17.63,0,22-16.2,22-34.74,0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16c-18.2,32.27-22.81,39.62-31.91,51.75C84.74,183,71.12,191,53.19,191c-21.27,0-34.72-9.21-43-23.09C3.34,156.6,0,141.76,0,124.85Z"/>
      <path d="M24.49,37.3C38.73,15.35,59.28,0,82.85,0c13.65,0,27.22,4,41.39,15.61,15.5,12.65,32,33.48,52.63,67.81l7.39,12.32c17.84,29.72,28,45,33.93,52.22,7.64,9.26,13,12,19.94,12,17.63,0,22-16.2,22-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191c-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71L146.08,93.6c-12.94-21.62-24.81-37.74-31.68-45C107,40.71,97.51,31.23,82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78Z"/>
      <path d="M82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78C38.61,71.62,31.06,99.34,31.06,126c0,11,2.41,19.41,5.56,24.51L10.14,167.91C3.34,156.6,0,141.76,0,124.85,0,94.1,8.44,62.05,24.49,37.3,38.73,15.35,59.28,0,82.85,0Z"/>
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// ─── Ícone de plataforma ──────────────────────────────────────────────────

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'whatsapp')  return <WhatsAppIcon  className="h-4 w-4 text-green-400" />;
  if (platform === 'instagram') return <InstagramIcon className="h-4 w-4 text-pink-400" />;
  return <FacebookIcon className="h-4 w-4 text-blue-400" />;
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
  } catch (e: any) {
    setSendError(e.message);
    setText(sentText); // Restaurar texto em caso de erro
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
