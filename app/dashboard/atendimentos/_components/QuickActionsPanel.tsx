'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/QuickActionsPanel.tsx

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, X, Zap, PauseCircle, PlayCircle, Send,
  MessageSquare, Phone, Instagram, Facebook, RefreshCw,
  ChevronDown, ChevronUp, CreditCard, MapPin, Building2,
  AlertCircle, User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

// ─── Tipos ────────────────────────────────────────────────────────────────
type Connection = {
  id: string; company_id: string; page_name: string;
  meta_page_id: string; instagram_account_id: string | null;
  whatsapp_number_id: string | null;
  encrypted_page_access_token: string;
};
type Conversation = {
  conversation_id: string; page_id: string; platform: string;
  is_paused: boolean; sender_name: string | null; updated_at: string;
};
type Notification = { id: number; message: string; type: 'success' | 'error' };

const FORCE_FUNCTIONS = [
  { key: 'pix',        label: 'Gerar PIX',   icon: CreditCard, credits: 0, hasInput: true,  placeholder: 'Valor em reais (ex: 150)' },
  { key: 'nossa_marca', label: 'Nossa Marca', icon: Building2,  credits: 1, hasInput: false },
  { key: 'endereco',   label: 'Endereço',     icon: MapPin,     credits: 1, hasInput: false },
];

// ─── Notificações ─────────────────────────────────────────────────────────
let notifId = 0;
function Notifications({ items, onDismiss }: { items: Notification[]; onDismiss: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {items.map((n) => (
        <div key={n.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white max-w-xs
          ${n.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span className="flex-1">{n.message}</span>
          <button onClick={() => onDismiss(n.id)} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
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

// ─── Linha de conversa ────────────────────────────────────────────────────
function ConversationRow({ conv, connection, onAction }: {
  conv: Conversation; connection: Connection;
  onAction: (conv: Conversation, conn: Connection) => void;
}) {
  const diff  = Date.now() - new Date(conv.updated_at).getTime();
  const relTime = diff < 60_000 ? 'agora'
    : diff < 3_600_000  ? `${Math.floor(diff / 60_000)}min atrás`
    : diff < 86_400_000 ? `${Math.floor(diff / 3_600_000)}h atrás`
    : `${Math.floor(diff / 86_400_000)}d atrás`;

  const displayName = conv.sender_name || conv.conversation_id;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg
      bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10
      hover:bg-gray-50 dark:hover:bg-slate-700 transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${conv.is_paused ? 'bg-yellow-500' : 'bg-green-500'}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-gray-400 shrink-0" />
            <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{displayName}</p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <PlatformBadge platform={conv.platform} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{relTime}</span>
            {conv.is_paused && (
              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Pausado</span>
            )}
          </div>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={() => onAction(conv, connection)} className="shrink-0 text-xs">
        <Zap className="h-3 w-3 mr-1" />Ações
      </Button>
    </div>
  );
}

// ─── Modal de ações ───────────────────────────────────────────────────────
function ActionsModal({ conv, connection, onClose, onDone }: {
  conv: Conversation; connection: Connection;
  onClose: () => void; onDone: (msg: string) => void;
}) {
  const supabase = createClient();
  const [tab, setTab]           = useState<'pause' | 'message' | 'function'>('pause');
  const [loading, setLoading]   = useState(false);
  const [manualText, setManualText] = useState('');
  const [selectedFn, setSelectedFn] = useState(FORCE_FUNCTIONS[0].key);
  const [fnInput, setFnInput]   = useState('');
  const fnDef = FORCE_FUNCTIONS.find((f) => f.key === selectedFn)!;
  const displayName = conv.sender_name || conv.conversation_id;

  async function handleTogglePause() {
    setLoading(true);
    try {
      const newPaused = !conv.is_paused;
      const { error } = await supabase.from('conversation_ai_control')
        .update({ is_paused: newPaused, paused_until: null, updated_at: new Date().toISOString() })
        .eq('conversation_id', conv.conversation_id)
        .eq('page_id', conv.page_id);
      if (error) throw error;
      onDone(newPaused ? '⏸️ Bot pausado' : '▶️ Bot retomado');
    } catch (e: any) { onDone('❌ ' + e.message); }
    finally { setLoading(false); }
  }

  async function handleSendMessage() {
    if (!manualText.trim()) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/meta-send-message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            recipient_id: conv.conversation_id,
            message: manualText.trim(),
            page_access_token: connection.encrypted_page_access_token,
            platform: conv.platform,
          }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro ao enviar');
      onDone('✅ Mensagem enviada');
    } catch (e: any) { onDone('❌ ' + e.message); }
    finally { setLoading(false); }
  }

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
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            conversation_id: conv.conversation_id,
            page_id:         conv.page_id,
            platform:        conv.platform,
            message:         msgMap[selectedFn],
            page_access_token: connection.encrypted_page_access_token,
            company_id:      connection.company_id,
          }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro');
      onDone(`✅ Função "${fnDef.label}" executada`);
    } catch (e: any) { onDone('❌ ' + e.message); }
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
            <p className="font-semibold text-sm text-gray-900 dark:text-white">Ações rápidas</p>
            <div className="flex items-center gap-2 mt-0.5">
              <PlatformBadge platform={conv.platform} />
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <User className="h-3 w-3" />{displayName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500 dark:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10">
          {[
            { key: 'pause',    label: 'Pausar/Retomar', icon: PauseCircle },
            { key: 'message',  label: 'Mensagem',       icon: Send        },
            { key: 'function', label: 'Função',         icon: Zap         },
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

        {/* Conteúdo */}
        <div className="p-5 space-y-4">

          {/* ── Pausar/Retomar ── */}
          {tab === 'pause' && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${conv.is_paused
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {conv.is_paused ? '⏸️ Bot pausado nesta conversa' : '🤖 Bot ativo nesta conversa'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {conv.is_paused
                    ? 'O bot não está respondendo. Clique para retomar o atendimento automático.'
                    : 'O bot está respondendo automaticamente. Pause para atender manualmente.'}
                </p>
              </div>
              <Button onClick={handleTogglePause} disabled={loading}
                variant={conv.is_paused ? 'default' : 'outline'} className="w-full">
                {loading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : conv.is_paused
                    ? <><PlayCircle  className="mr-2 h-4 w-4" />Retomar bot</>
                    : <><PauseCircle className="mr-2 h-4 w-4" />Pausar bot</>}
              </Button>
            </div>
          )}

          {/* ── Mensagem manual ── */}
          {tab === 'message' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Mensagem enviada diretamente como a página, sem passar pelo bot e sem consumir créditos.
                </p>
              </div>
              <textarea
                value={manualText} onChange={(e) => setManualText(e.target.value)} rows={4}
                placeholder={`Digite a mensagem para ${displayName}...`}
                className="w-full text-sm rounded-lg border p-3 resize-none outline-none
                  bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                  border-gray-300 dark:border-white/10 placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <Button onClick={handleSendMessage} disabled={loading || !manualText.trim()} className="w-full">
                {loading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <><Send className="mr-2 h-4 w-4" />Enviar mensagem</>}
              </Button>
            </div>
          )}

          {/* ── Forçar função ── */}
          {tab === 'function' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Executa uma função e envia o resultado para{' '}
                  <span className="font-medium text-gray-900 dark:text-white">{displayName}</span>.
                  {fnDef.credits > 0
                    ? <span className="text-yellow-600 dark:text-yellow-400 font-medium ml-1">{fnDef.credits} crédito(s)</span>
                    : <span className="text-green-600 dark:text-green-400 font-medium ml-1">grátis</span>}
                </p>
              </div>

              {/* Seletor de função */}
              <div className="grid grid-cols-3 gap-2">
                {FORCE_FUNCTIONS.map((fn) => {
                  const Icon = fn.icon;
                  return (
                    <button key={fn.key}
                      onClick={() => { setSelectedFn(fn.key); setFnInput(''); }}
                      className={`p-3 rounded-lg border text-xs font-medium transition flex flex-col items-center gap-2
                        ${selectedFn === fn.key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}>
                      <Icon className="h-4 w-4" />
                      {fn.label}
                    </button>
                  );
                })}
              </div>

              {fnDef.hasInput && (
                <input
                  type="number" value={fnInput} onChange={(e) => setFnInput(e.target.value)}
                  placeholder={fnDef.placeholder}
                  className="w-full text-sm rounded-lg border p-2.5 outline-none
                    bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                    border-gray-300 dark:border-white/10 placeholder:text-gray-400
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              )}

              <Button
                onClick={handleForceFunction}
                disabled={loading || (fnDef.hasInput && !fnInput.trim())}
                className="w-full">
                {loading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <><Zap className="mr-2 h-4 w-4" />Executar {fnDef.label}</>}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────
export function QuickActionsPanel({ selectedCompanyId }: { selectedCompanyId: string }) {
  const supabase = createClient();
  const [connections, setConnections]       = useState<Connection[]>([]);
  const [selectedConnId, setSelectedConnId] = useState('');
  const [conversations, setConversations]   = useState<Conversation[]>([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [notifications, setNotifications]   = useState<Notification[]>([]);
  const [activeConv, setActiveConv]         = useState<{ conv: Conversation; conn: Connection } | null>(null);
  const [isOpen, setIsOpen]                 = useState(false);

  function notify(message: string, type: 'success' | 'error' = 'success') {
    const id = ++notifId;
    setNotifications((p) => [...p, { id, message, type }]);
    setTimeout(() => setNotifications((p) => p.filter((n) => n.id !== id)), 4000);
  }

  useEffect(() => {
    if (!selectedCompanyId) return;
    async function load() {
      const { data } = await supabase.from('meta_connections')
        .select('id, company_id, page_name, meta_page_id, instagram_account_id, whatsapp_number_id, encrypted_page_access_token')
        .eq('company_id', selectedCompanyId).eq('agent_enabled', true);
      if (data?.length) { setConnections(data as Connection[]); setSelectedConnId(data[0].id); }
      else { setConnections([]); setSelectedConnId(''); }
    }
    load();
  }, [selectedCompanyId]);

  const loadConversations = useCallback(async () => {
    const conn = connections.find((c) => c.id === selectedConnId);
    if (!conn) return;
    setIsLoading(true);
    try {
      const pageIds = [conn.meta_page_id, conn.instagram_account_id, conn.whatsapp_number_id].filter(Boolean);
      const { data } = await supabase.from('conversation_ai_control')
        .select('conversation_id, page_id, platform, is_paused, sender_name, updated_at')
        .in('page_id', pageIds)
        .order('updated_at', { ascending: false })
        .limit(20);
      setConversations(data || []);
    } finally { setIsLoading(false); }
  }, [selectedConnId, connections]);

  useEffect(() => { if (selectedConnId && isOpen) loadConversations(); }, [selectedConnId, isOpen]);

  const selectedConn = connections.find((c) => c.id === selectedConnId);

  function handleActionDone(message: string) {
    notify(message, message.startsWith('❌') ? 'error' : 'success');
    setActiveConv(null);
    loadConversations();
  }

  return (
    <>
      <Notifications items={notifications} onDismiss={(id) => setNotifications((p) => p.filter((n) => n.id !== id))} />

      {activeConv && (
        <ActionsModal
          conv={activeConv.conv} connection={activeConv.conn}
          onClose={() => setActiveConv(null)} onDone={handleActionDone}
        />
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        {/* Header clicável */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Ações Rápidas</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Pause o bot, envie mensagens manuais ou force funções em conversas ativas
            </p>
          </div>
          {isOpen
            ? <ChevronUp   className="h-5 w-5 text-gray-400 shrink-0" />
            : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />}
        </button>

        {isOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-200 dark:border-white/10 pt-4">

            {/* Seletor de conexão + refresh */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Conexão</p>
                <Select value={selectedConnId} onValueChange={setSelectedConnId} disabled={!connections.length}>
                  <SelectTrigger className="w-full dark:bg-slate-800 dark:border-white/10">
                    <SelectValue placeholder={connections.length ? 'Selecione' : 'Nenhuma conexão ativa'} />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.page_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={loadConversations} disabled={isLoading}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition text-gray-600 dark:text-gray-400 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Estado */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !selectedConnId || !connections.length ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma conexão ativa encontrada.</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma conversa recente nesta conexão.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">As conversas aparecem após a primeira interação do cliente.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {conversations.length} conversa{conversations.length !== 1 ? 's' : ''} recente{conversations.length !== 1 ? 's' : ''}
                  {conversations.some((c) => c.is_paused) && (
                    <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">
                      · {conversations.filter((c) => c.is_paused).length} pausada{conversations.filter((c) => c.is_paused).length !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
                {conversations.map((conv) => (
                  <ConversationRow
                    key={`${conv.conversation_id}-${conv.page_id}`}
                    conv={conv} connection={selectedConn!}
                    onAction={(c, conn) => setActiveConv({ conv: c, conn })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
