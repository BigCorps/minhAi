'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/ConversationsPanel.tsx
//
// Substitui o QuickActionsPanel. Mostra todas as conversas ativas de todas
// as conexões do assistente, com filtros, realtime e ações inline.
//
// Passo 3: integração do ConversationChatModal (botão "Ver" em cada card)

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2, X, Zap, PauseCircle, PlayCircle, Send,
  MessageSquare, Phone, Instagram, Facebook, RefreshCw,
  CreditCard, MapPin, Building2, AlertCircle, User,
  Pencil, Check, Search, Filter, MessageCircle,
  CheckCircle2, XCircle, Pause, Play, Smartphone,
  Camera, Users, ChevronRight, Circle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { ConversationChatModal } from './ConversationChatModal';

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
  // join para sabermos de qual conexão é
  connection?:     Connection;
};

type Filter = 'all' | 'paused' | 'active' | 'whatsapp' | 'instagram' | 'facebook';

type Notification = { id: number; message: string; type: 'success' | 'error' };

const FORCE_FUNCTIONS = [
  { key: 'pix',         label: 'Gerar PIX',   icon: CreditCard, credits: 0,  hasInput: true,  placeholder: 'Valor em reais (ex: 150)' },
  { key: 'nossa_marca', label: 'Nossa Marca',  icon: Building2,  credits: 1,  hasInput: false },
  { key: 'endereco',    label: 'Endereço',     icon: MapPin,     credits: 1,  hasInput: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function getDisplayName(conv: Conversation): string {
  return conv.custom_name || conv.sender_name || conv.conversation_id.substring(0, 12) + '...';
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000)      return 'agora';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

// ─── Notificações ─────────────────────────────────────────────────────────

let notifId = 0;
function Notifications({ items, onDismiss }: { items: Notification[]; onDismiss: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {items.map((n) => (
        <div key={n.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white max-w-xs
          ${n.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {n.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 shrink-0 opacity-90" />
            : <XCircle      className="h-4 w-4 shrink-0 opacity-90" />
          }
          <span className="flex-1">{n.message}</span>
          <button onClick={() => onDismiss(n.id)}><X className="h-4 w-4 opacity-70 hover:opacity-100" /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Badge de plataforma ──────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    facebook:  { icon: <Facebook  className="h-3 w-3" />, label: 'Facebook',  color: 'text-blue-600 bg-blue-600/10'   },
    instagram: { icon: <Instagram className="h-3 w-3" />, label: 'Instagram', color: 'text-pink-600 bg-pink-600/10'   },
    whatsapp:  { icon: <Phone     className="h-3 w-3" />, label: 'WhatsApp',  color: 'text-green-600 bg-green-600/10' },
  };
  const p = map[platform] ?? { icon: <MessageSquare className="h-3 w-3" />, label: platform, color: 'text-gray-500 bg-gray-100 dark:bg-white/10' };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${p.color}`}>
      {p.icon}{p.label}
    </span>
  );
}

// ─── Card de conversa ─────────────────────────────────────────────────────

function ConversationCard({
  conv, onOpenModal, onTogglePause, onQuickMessage, onOpenChat, togglingPause,
}: {
  conv:           Conversation;
  onOpenModal:    (conv: Conversation) => void;
  onTogglePause:  (conv: Conversation) => void;
  onQuickMessage: (conv: Conversation) => void;
  onOpenChat:     (conv: Conversation) => void;
  togglingPause:  string | null;
}) {
  const displayName = getDisplayName(conv);
  const isToggling  = togglingPause === conv.conversation_id + conv.page_id;

  return (
    <div className={`rounded-xl border transition-all group
      ${conv.is_paused
        ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/40'
        : 'bg-white dark:bg-slate-800/60 border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700/50'
      }`}>
      <div className="p-3">
        {/* Linha 1: nome + plataforma + tempo */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${conv.is_paused ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</span>
              {conv.custom_name && (
                <Pencil className="h-3 w-3 text-blue-500 shrink-0" title="Nome personalizado" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PlatformBadge platform={conv.platform} />
            <span className="text-xs text-gray-400">{relativeTime(conv.updated_at)}</span>
          </div>
        </div>

        {/* Linha 2: última mensagem */}
        {conv.last_message_text && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2.5 pl-3.5">
            {conv.last_message_text}
          </p>
        )}

{/* Linha 3: ações — 1 linha no desktop, 2 no mobile */}
<div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
  <button
    onClick={() => onTogglePause(conv)}
    disabled={isToggling}
    title={conv.is_paused ? 'Retomar assistente' : 'Pausar assistente'}
    className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition
      ${conv.is_paused
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
      } disabled:opacity-50`}
  >
    {isToggling
      ? <Loader2 className="h-3 w-3 animate-spin" />
      : conv.is_paused
        ? <><PlayCircle  className="h-3 w-3" />Retomar</>
        : <><PauseCircle className="h-3 w-3" />Pausar</>
    }
  </button>

  <button
    onClick={() => onQuickMessage(conv)}
    title="Enviar mensagem rápida"
    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition
      bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400
      hover:bg-blue-200 dark:hover:bg-blue-900/50"
  >
    <Send className="h-3 w-3" />Responder
  </button>

  <button
    onClick={() => onOpenChat(conv)}
    title="Ver histórico da conversa"
    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition
      bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400
      hover:bg-purple-200 dark:hover:bg-purple-900/50"
  >
    <MessageSquare className="h-3 w-3" />Ver
  </button>

  <button
    onClick={() => onOpenModal(conv)}
    title="Mais ações"
    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition
      bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400
      hover:bg-gray-200 dark:hover:bg-white/20"
  >
    <Zap className="h-3 w-3" />Ações
  </button>
</div>
</div>
            </div>
    </div>
  );
}

// ─── Quick Message (inline) ────────────────────────────────────────────────

function QuickMessageBar({
  conv, connection, onDone, onCancel,
}: {
  conv:       Conversation;
  connection: Connection;
  onDone:     (msg: string) => void;
  onCancel:   () => void;
}) {
  const supabase = createClient();
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSend() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/meta-send-message`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            recipient_id:      conv.conversation_id,
            message:           text.trim(),
            page_access_token: connection.encrypted_page_access_token,
            platform:          conv.platform,
          }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro ao enviar');
      onDone('Mensagem enviada');
    } catch (e: any) { onDone('Erro: ' + e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="mt-1 mx-1 mb-1 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        rows={2}
        placeholder={`Responder ${getDisplayName(conv)}... (Enter para enviar)`}
        className="w-full text-sm rounded-lg border p-2 resize-none outline-none
          bg-white dark:bg-slate-800 text-gray-900 dark:text-white
          border-gray-300 dark:border-white/10 placeholder:text-gray-400
          focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
      />
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={handleSend} disabled={loading || !text.trim()} className="flex-1">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="mr-1.5 h-3.5 w-3.5" />Enviar</>}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="px-3">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Modal de ações completo ───────────────────────────────────────────────

function ActionsModal({ conv, connection, onClose, onDone }: {
  conv:       Conversation;
  connection: Connection;
  onClose:    () => void;
  onDone:     (msg: string) => void;
}) {
  const supabase  = createClient();
  const [tab, setTab]               = useState<'function' | 'name'>('function');
  const [loading, setLoading]       = useState(false);
  const [selectedFn, setSelectedFn] = useState(FORCE_FUNCTIONS[0].key);
  const [fnInput, setFnInput]       = useState('');
  const [customName, setCustomName] = useState(conv.custom_name ?? '');
  const [nameSaved, setNameSaved]   = useState(false);

  const fnDef       = FORCE_FUNCTIONS.find((f) => f.key === selectedFn)!;
  const displayName = getDisplayName(conv);

  async function handleForceFunction() {
    setLoading(true);
    try {
      const msgMap: Record<string, string> = {
        pix:         `gerar pix de ${fnInput || '0'} reais`,
        nossa_marca: 'sobre a empresa',
        endereco:    'endereço',
      };
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/meta-force-function`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            conversation_id:   conv.conversation_id,
            page_id:           conv.page_id,
            platform:          conv.platform,
            message:           msgMap[selectedFn],
            page_access_token: connection.encrypted_page_access_token,
            company_id:        connection.company_id,
          }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro');
      onDone(`Função "${fnDef.label}" executada`);
    } catch (e: any) { onDone('Erro: ' + e.message); }
    finally { setLoading(false); }
  }

  async function handleSaveName() {
    setLoading(true);
    try {
      const { error } = await supabase.from('conversation_ai_control')
        .update({ custom_name: customName.trim() || null, updated_at: new Date().toISOString() })
        .eq('conversation_id', conv.conversation_id)
        .eq('page_id', conv.page_id);
      if (error) throw error;
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
      onDone('Nome salvo');
    } catch (e: any) { onDone('Erro: ' + e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">Ações</p>
            <div className="flex items-center gap-2 mt-0.5">
              <PlatformBadge platform={conv.platform} />
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <User className="h-3 w-3" />{displayName}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10">
          {[
            { key: 'function', label: 'Funções', icon: Zap   },
            { key: 'name',     label: 'Nome',    icon: Pencil },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition border-b-2
                ${tab === key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* Funções */}
          {tab === 'function' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {FORCE_FUNCTIONS.map((fn) => {
                  const Icon = fn.icon;
                  return (
                    <button
                      key={fn.key}
                      onClick={() => setSelectedFn(fn.key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition
                        ${selectedFn === fn.key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700/50'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {fn.label}
                      {fn.credits > 0 && (
                        <span className="text-[10px] text-gray-400">{fn.credits} crédito{fn.credits > 1 ? 's' : ''}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {fnDef.hasInput && (
                <input
                  type="number"
                  value={fnInput}
                  onChange={(e) => setFnInput(e.target.value)}
                  placeholder={fnDef.placeholder}
                  className="w-full text-sm rounded-lg border p-2.5 outline-none
                    bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                    border-gray-300 dark:border-white/10 placeholder:text-gray-400
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              )}

              <Button
                onClick={handleForceFunction}
                disabled={loading || (fnDef.hasInput && !fnInput)}
                className="w-full"
              >
                {loading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Zap className="mr-2 h-4 w-4" />
                }
                Executar para {displayName}
              </Button>
            </div>
          )}

          {/* Nome personalizado */}
          {tab === 'name' && (
            <div className="space-y-3">
              {conv.sender_name && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10">
                  <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Nome detectado automaticamente:</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{conv.sender_name}</p>
                  </div>
                </div>
              )}
              <input
                type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: João da Padaria, Maria VIP..."
                maxLength={100}
                className="w-full text-sm rounded-lg border p-2.5 outline-none
                  bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                  border-gray-300 dark:border-white/10 placeholder:text-gray-400
                  focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
              />
              <Button onClick={handleSaveName} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
                {loading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : nameSaved
                    ? <><Check className="mr-2 h-4 w-4" />Salvo!</>
                    : <><Pencil className="mr-2 h-4 w-4" />Salvar nome</>}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export function ConversationsPanel({ selectedCompanyId }: { selectedCompanyId: string }) {
  const supabase = createClient();

  const [connections, setConnections]     = useState<Connection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeModal, setActiveModal]     = useState<Conversation | null>(null);
  const [chatConv, setChatConv]           = useState<Conversation | null>(null);
  const [quickMsgConv, setQuickMsgConv]   = useState<string | null>(null); // conversation_id+page_id
  const [togglingPause, setTogglingPause] = useState<string | null>(null);
  const [filter, setFilter]               = useState<Filter>('all');
  const [search, setSearch]               = useState('');
  const [showSearch, setShowSearch]       = useState(false);

  function notify(message: string, type: 'success' | 'error' = 'success') {
    const id = ++notifId;
    setNotifications((p) => [...p, { id, message, type }]);
    setTimeout(() => setNotifications((p) => p.filter((n) => n.id !== id)), 4000);
  }

  // ── Carregar conexões ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCompanyId) return;
    async function loadConnections() {
      const { data } = await supabase
        .from('meta_connections')
        .select('id, company_id, page_name, meta_page_id, instagram_account_id, whatsapp_number_id, whatsapp_number, encrypted_page_access_token')
        .eq('company_id', selectedCompanyId)
        .eq('agent_enabled', true);
      setConnections(data || []);
    }
    loadConnections();
  }, [selectedCompanyId]);

  // ── Carregar conversas de TODAS as conexões ────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!connections.length) return;
    setIsLoading(true);
    try {
      // Coletar todos os page_ids de todas as conexões
      const pageIds = connections.flatMap((c) =>
        [c.meta_page_id, c.instagram_account_id, c.whatsapp_number_id].filter(Boolean)
      );
      if (!pageIds.length) { setConversations([]); return; }

      const { data } = await supabase
        .from('conversation_ai_control')
        .select('conversation_id, page_id, platform, is_paused, sender_name, custom_name, last_message_text, updated_at')
        .in('page_id', pageIds)
        .order('updated_at', { ascending: false })
        .limit(50);

      // Associar cada conversa à sua conexão
      const withConnection = (data || []).map((conv: any) => {
        const connection = connections.find((c) =>
          c.meta_page_id         === conv.page_id ||
          c.instagram_account_id === conv.page_id ||
          c.whatsapp_number_id   === conv.page_id
        );
        return { ...conv, connection };
      });

      setConversations(withConnection);
    } finally {
      setIsLoading(false);
    }
  }, [connections]);

  // Carregar ao montar e quando connections mudar
  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Realtime: atualizar quando chegar nova mensagem ────────────────────
  useEffect(() => {
    if (!connections.length) return;

    const pageIds = connections.flatMap((c) =>
      [c.meta_page_id, c.instagram_account_id, c.whatsapp_number_id].filter(Boolean)
    );

    const channel = supabase
      .channel('conversations_panel_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_ai_control' },
        (payload: any) => {
          const newRecord = payload.new as any;
          if (!newRecord || !pageIds.includes(newRecord.page_id)) return;

          setConversations((prev) => {
            const idx = prev.findIndex(
              (c) => c.conversation_id === newRecord.conversation_id && c.page_id === newRecord.page_id
            );
            const connection = connections.find((c) =>
              c.meta_page_id         === newRecord.page_id ||
              c.instagram_account_id === newRecord.page_id ||
              c.whatsapp_number_id   === newRecord.page_id
            );
            const updated = { ...newRecord, connection };

            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            } else {
              return [updated, ...prev];
            }
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [connections]);

  // ── Toggle pausa inline ────────────────────────────────────────────────
  async function handleTogglePause(conv: Conversation) {
    const key = conv.conversation_id + conv.page_id;
    setTogglingPause(key);
    try {
      const newPaused = !conv.is_paused;
      const { error } = await supabase
        .from('conversation_ai_control')
        .update({ is_paused: newPaused, paused_until: null, updated_at: new Date().toISOString() })
        .eq('conversation_id', conv.conversation_id)
        .eq('page_id', conv.page_id);
      if (error) throw error;
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conv.conversation_id && c.page_id === conv.page_id
            ? { ...c, is_paused: newPaused }
            : c
        )
      );
      notify(newPaused ? 'Assistente pausado' : 'Assistente retomado');
    } catch (e: any) {
      notify('Erro: ' + e.message, 'error');
    } finally {
      setTogglingPause(null);
    }
  }

  // ── Filtrar conversas ──────────────────────────────────────────────────
  const filtered = conversations.filter((conv) => {
    const matchesFilter =
      filter === 'all'       ? true :
      filter === 'paused'    ? conv.is_paused :
      filter === 'active'    ? !conv.is_paused :
      filter === 'whatsapp'  ? conv.platform === 'whatsapp' :
      filter === 'instagram' ? conv.platform === 'instagram' :
      filter === 'facebook'  ? conv.platform === 'facebook' :
      true;

    const matchesSearch = !search.trim() || [
      getDisplayName(conv),
      conv.last_message_text || '',
      conv.conversation_id,
    ].some((s) => s.toLowerCase().includes(search.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const pausedCount = conversations.filter((c) => c.is_paused).length;

  // ── Conexão de uma conversa ────────────────────────────────────────────
  function getConnection(conv: Conversation): Connection | undefined {
    return conv.connection || connections[0];
  }

  return (
    <>
      <Notifications items={notifications} onDismiss={(id) => setNotifications((p) => p.filter((n) => n.id !== id))} />

      {/* Modal de ações (Funções + Nome) */}
      {activeModal && getConnection(activeModal) && (
        <ActionsModal
          conv={activeModal}
          connection={getConnection(activeModal)!}
          onClose={() => setActiveModal(null)}
          onDone={(msg) => {
            notify(msg, msg.startsWith('Erro') ? 'error' : 'success');
            setActiveModal(null);
            loadConversations();
          }}
        />
      )}

      {/* Modal de chat estilo WhatsApp */}
      {chatConv && getConnection(chatConv) && (
        <ConversationChatModal
          conv={chatConv}
          connection={getConnection(chatConv)!}
          onClose={() => setChatConv(null)}
          onTogglePause={(c) => {
            handleTogglePause(c);
            setChatConv((prev) => prev ? { ...prev, is_paused: !prev.is_paused } : prev);
          }}
        />
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Conversas</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
                {pausedCount > 0 && (
                  <span className="ml-1.5 text-yellow-600 dark:text-yellow-400 font-medium inline-flex items-center gap-1">
                    <span className="mx-0.5">·</span>
                    <PauseCircle className="h-3 w-3" />
                    {pausedCount} pausada{pausedCount !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg border transition text-sm
                ${showSearch
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800'
                }`}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={loadConversations}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800
                text-gray-500 hover:text-gray-900 dark:hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Busca */}
        {showSearch && (
          <div className="px-4 pt-3 pb-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou mensagem..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10
                  bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400
                  outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto">
          {([
            { key: 'all',       label: 'Todas',     icon: MessageCircle },
            { key: 'paused',    label: 'Pausadas',   icon: PauseCircle   },
            { key: 'active',    label: 'Ativas',     icon: PlayCircle    },
            { key: 'whatsapp',  label: 'WhatsApp',   icon: Phone         },
            { key: 'instagram', label: 'Instagram',  icon: Instagram     },
            { key: 'facebook',  label: 'Facebook',   icon: Facebook      },
          ] as { key: Filter; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap
                ${filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
            >
              <Icon className="h-3 w-3" />{label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="px-4 pb-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              {search || filter !== 'all' ? (
                <>
                  <Filter className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma conversa encontrada</p>
                  <button onClick={() => { setFilter('all'); setSearch(''); }}
                    className="text-xs text-blue-500 mt-1 hover:underline">
                    Limpar filtros
                  </button>
                </>
              ) : (
                <>
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma conversa ainda</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    As conversas aparecerão aqui após a primeira interação dos clientes.
                  </p>
                </>
              )}
            </div>
          ) : (
            filtered.map((conv) => {
              const convKey    = conv.conversation_id + conv.page_id;
              const connection = getConnection(conv);
              if (!connection) return null;

              return (
                <div key={convKey}>
                  <ConversationCard
                    conv={conv}
                    onOpenModal={setActiveModal}
                    onTogglePause={handleTogglePause}
                    onQuickMessage={() => setQuickMsgConv(quickMsgConv === convKey ? null : convKey)}
                    onOpenChat={(c) => setChatConv(c)}
                    togglingPause={togglingPause}
                  />
                  {quickMsgConv === convKey && (
                    <QuickMessageBar
                      conv={conv}
                      connection={connection}
                      onDone={(msg) => {
                        notify(msg, msg.startsWith('Erro') ? 'error' : 'success');
                        setQuickMsgConv(null);
                      }}
                      onCancel={() => setQuickMsgConv(null)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
