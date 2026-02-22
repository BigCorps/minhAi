'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/QuickActionsPanel.tsx

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, X, Zap, PauseCircle, PlayCircle, Send,
  MessageSquare, Phone, Instagram, Facebook, RefreshCw,
  ChevronDown, ChevronUp, Bot, CreditCard, MapPin,
  Building2, AtSign, Calculator, AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

// ─── Tipos ────────────────────────────────────────────────────────────────
type Company   = { id: string; name: string };
type Connection = {
  id: string; company_id: string; page_name: string; platform: string;
  meta_page_id: string; instagram_account_id: string | null;
  whatsapp_number_id: string | null; whatsapp_number: string | null;
  encrypted_page_access_token: string;
};
type Conversation = {
  conversation_id: string; page_id: string; platform: string;
  is_paused: boolean; ai_enabled: boolean;
  last_ai_response_at: string | null; updated_at: string;
};
type Notification = { id: number; message: string; type: 'success' | 'error' };

// ─── Funções forçáveis ────────────────────────────────────────────────────
const FORCE_FUNCTIONS = [
  { key: 'endereco',    label: 'Endereço',       icon: MapPin,        credits: 1, hasInput: false },
  { key: 'nossa_marca', label: 'Nossa Marca',    icon: Building2,     credits: 1, hasInput: false },
  { key: 'contacts',   label: 'Contatos',        icon: AtSign,        credits: 1, hasInput: false },
  { key: 'meu_sistema', label: 'Meu Sistema',   icon: Bot,           credits: 0, hasInput: false },
  { key: 'pix',        label: 'Gerar PIX',       icon: CreditCard,    credits: 0, hasInput: true,  placeholder: 'Valor em reais (ex: 150)' },
  { key: 'orcamento',  label: 'Orçamento',       icon: Calculator,    credits: 2, hasInput: true,  placeholder: 'Descreva o que o cliente quer' },
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
          <button onClick={() => onDismiss(n.id)} className="opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Badge de plataforma ──────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    facebook:  { icon: <Facebook  className="h-3 w-3" />, label: 'Facebook',  color: 'text-blue-600  bg-blue-600/10'  },
    instagram: { icon: <Instagram className="h-3 w-3" />, label: 'Instagram', color: 'text-pink-600  bg-pink-600/10'  },
    whatsapp:  { icon: <Phone     className="h-3 w-3" />, label: 'WhatsApp',  color: 'text-green-600 bg-green-600/10' },
  };
  const p = map[platform] ?? { icon: <MessageSquare className="h-3 w-3" />, label: platform, color: 'text-muted-foreground bg-muted' };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${p.color}`}>
      {p.icon}{p.label}
    </span>
  );
}

// ─── Linha de conversa ────────────────────────────────────────────────────
function ConversationRow({
  conv, connection, onAction,
}: {
  conv: Conversation;
  connection: Connection;
  onAction: (conv: Conversation, conn: Connection) => void;
}) {
  const relTime = conv.updated_at
    ? (() => {
        const diff = Date.now() - new Date(conv.updated_at).getTime();
        if (diff < 60_000)    return 'agora';
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min atrás`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`;
        return `${Math.floor(diff / 86_400_000)}d atrás`;
      })()
    : '';

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/30 transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${conv.is_paused ? 'bg-yellow-500' : 'bg-green-500'}`} />
        <div className="min-w-0">
          <p className="text-sm font-mono truncate text-foreground">{conv.conversation_id}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <PlatformBadge platform={conv.platform} />
            <span className="text-xs text-muted-foreground">{relTime}</span>
            {conv.is_paused && <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Pausado</span>}
          </div>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={() => onAction(conv, connection)}
        className="shrink-0 text-xs">
        <Zap className="h-3 w-3 mr-1" />Ações
      </Button>
    </div>
  );
}

// ─── Modal de ações ───────────────────────────────────────────────────────
function ActionsModal({
  conv, connection, onClose, onDone,
}: {
  conv: Conversation;
  connection: Connection;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<'pause' | 'message' | 'function'>('pause');
  const [loading, setLoading] = useState(false);

  // Mensagem manual
  const [manualText, setManualText] = useState('');

  // Forçar função
  const [selectedFn, setSelectedFn] = useState(FORCE_FUNCTIONS[0].key);
  const [fnInput, setFnInput] = useState('');
  const fnDef = FORCE_FUNCTIONS.find((f) => f.key === selectedFn)!;

  // ── Pausar / Retomar ─────────────────────────────────────────────────
  async function handleTogglePause() {
    setLoading(true);
    try {
      const newPaused = !conv.is_paused;
      const { error } = await supabase.from('conversation_ai_control')
        .update({ is_paused: newPaused, paused_until: null, updated_at: new Date().toISOString() })
        .eq('conversation_id', conv.conversation_id)
        .eq('page_id', conv.page_id);
      if (error) throw error;
      onDone(newPaused ? '⏸️ Bot pausado para esta conversa' : '▶️ Bot retomado');
    } catch (err: any) {
      onDone('❌ ' + err.message);
    } finally { setLoading(false); }
  }

  // ── Enviar mensagem manual ───────────────────────────────────────────
  async function handleSendMessage() {
    if (!manualText.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-send-message', {
        body: {
          recipient_id:       conv.conversation_id,
          message:            manualText.trim(),
          page_access_token:  connection.encrypted_page_access_token,
          platform:           conv.platform,
        },
      });
      if (error) throw error;
      onDone('✅ Mensagem enviada');
    } catch (err: any) {
      onDone('❌ ' + err.message);
    } finally { setLoading(false); }
  }

  // ── Forçar função ────────────────────────────────────────────────────
  async function handleForceFunction() {
    setLoading(true);
    try {
      // Monta mensagem artificial que vai acionar a função no webhook
      const msgMap: Record<string, string> = {
        endereco:    'endereço',
        nossa_marca: 'sobre a empresa',
        contacts:    'whatsapp',
        meu_sistema: 'sobre o sistema eai',
        pix:         `gerar pix de ${fnInput || '0'} reais`,
        orcamento:   fnInput || 'quero um orçamento',
      };
      const fakeMessage = msgMap[selectedFn];

      const { error } = await supabase.functions.invoke('meta-force-function', {
        body: {
          conversation_id:    conv.conversation_id,
          page_id:            conv.page_id,
          platform:           conv.platform,
          message:            fakeMessage,
          page_access_token:  connection.encrypted_page_access_token,
          company_id:         connection.company_id,
        },
      });
      if (error) throw error;
      onDone(`✅ Função "${fnDef.label}" executada`);
    } catch (err: any) {
      onDone('❌ ' + err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md border border-border" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <p className="font-semibold text-sm">Ações rápidas</p>
            <div className="flex items-center gap-2 mt-0.5">
              <PlatformBadge platform={conv.platform} />
              <p className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{conv.conversation_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { key: 'pause',    label: 'Pausar/Retomar', icon: PauseCircle },
            { key: 'message',  label: 'Mensagem',       icon: Send        },
            { key: 'function', label: 'Função',         icon: Zap         },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition border-b-2
                ${tab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-4">

          {/* ── Tab: Pausar/Retomar ── */}
          {tab === 'pause' && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${conv.is_paused ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className="text-sm font-medium">
                  {conv.is_paused ? '⏸️ Bot pausado nesta conversa' : '🤖 Bot ativo nesta conversa'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {conv.is_paused
                    ? 'O bot não está respondendo. Clique para retomar o atendimento automático.'
                    : 'O bot está respondendo automaticamente. Pause para atender manualmente.'}
                </p>
              </div>
              <Button onClick={handleTogglePause} disabled={loading} className="w-full"
                variant={conv.is_paused ? 'default' : 'outline'}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                  conv.is_paused ? <><PlayCircle className="mr-2 h-4 w-4" />Retomar bot</> :
                    <><PauseCircle className="mr-2 h-4 w-4" />Pausar bot</>}
              </Button>
            </div>
          )}

          {/* ── Tab: Mensagem manual ── */}
          {tab === 'message' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground">
                  Mensagem enviada diretamente como a página — não passa pelo bot e não consome créditos.
                </p>
              </div>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={4}
                placeholder="Digite a mensagem para enviar ao cliente..."
                className="w-full text-sm rounded-lg border p-3 resize-none outline-none
                  bg-background text-foreground border-border placeholder:text-muted-foreground
                  focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <Button onClick={handleSendMessage} disabled={loading || !manualText.trim()} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" />Enviar mensagem</>}
              </Button>
            </div>
          )}

          {/* ── Tab: Forçar função ── */}
          {tab === 'function' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground">
                  Executa uma função e envia o resultado diretamente para o cliente.
                  {fnDef.credits > 0 && <span className="text-yellow-500 font-medium"> · {fnDef.credits} crédito(s)</span>}
                  {fnDef.credits === 0 && <span className="text-green-500 font-medium"> · grátis</span>}
                </p>
              </div>

              {/* Seletor de função */}
              <div className="grid grid-cols-3 gap-2">
                {FORCE_FUNCTIONS.map((fn) => {
                  const Icon = fn.icon;
                  return (
                    <button key={fn.key} onClick={() => { setSelectedFn(fn.key); setFnInput(''); }}
                      className={`p-2.5 rounded-lg border text-xs font-medium transition flex flex-col items-center gap-1.5
                        ${selectedFn === fn.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'}`}>
                      <Icon className="h-4 w-4" />
                      {fn.label}
                    </button>
                  );
                })}
              </div>

              {/* Input adicional (PIX e Orçamento) */}
              {fnDef.hasInput && (
                <input
                  type={fnDef.key === 'pix' ? 'number' : 'text'}
                  value={fnInput}
                  onChange={(e) => setFnInput(e.target.value)}
                  placeholder={fnDef.placeholder}
                  className="w-full text-sm rounded-lg border p-2.5 outline-none
                    bg-background text-foreground border-border placeholder:text-muted-foreground
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              )}

              <Button onClick={handleForceFunction} disabled={loading || (fnDef.hasInput && !fnInput.trim())} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                  <><Zap className="mr-2 h-4 w-4" />Executar {fnDef.label}</>}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────
export function QuickActionsPanel() {
  const supabase = createClient();
  const [companies, setCompanies]         = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [connections, setConnections]     = useState<Connection[]>([]);
  const [selectedConnId, setSelectedConnId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeConv, setActiveConv]       = useState<{ conv: Conversation; conn: Connection } | null>(null);
  const [isOpen, setIsOpen]               = useState(false);

  function notify(message: string, type: 'success' | 'error' = 'success') {
    const id = ++notifId;
    setNotifications((p) => [...p, { id, message, type }]);
    setTimeout(() => setNotifications((p) => p.filter((n) => n.id !== id)), 4000);
  }

  // Carregar empresas
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('companies').select('id, name')
        .eq('user_id', user.id).eq('is_active', true).order('name');
      if (data?.length) { setCompanies(data); setSelectedCompanyId(data[0].id); }
    }
    load();
  }, []);

  // Carregar conexões quando troca de empresa
  useEffect(() => {
    if (!selectedCompanyId) return;
    async function load() {
      const { data } = await supabase.from('meta_connections')
        .select('id, company_id, page_name, meta_page_id, instagram_account_id, whatsapp_number_id, whatsapp_number, encrypted_page_access_token')
        .eq('company_id', selectedCompanyId).eq('agent_enabled', true);
      if (data?.length) {
        // Adicionar campo platform derivado
        const withPlatform = data.map((c) => ({
          ...c,
          platform: c.whatsapp_number_id ? 'whatsapp' : c.instagram_account_id ? 'instagram' : 'facebook',
        }));
        setConnections(withPlatform as Connection[]);
        setSelectedConnId(withPlatform[0].id);
      } else {
        setConnections([]);
        setSelectedConnId('');
      }
    }
    load();
  }, [selectedCompanyId]);

  // Carregar conversas quando troca de conexão
  const loadConversations = useCallback(async () => {
    const conn = connections.find((c) => c.id === selectedConnId);
    if (!conn) return;
    setIsLoading(true);
    try {
      // Determinar page_id correto por plataforma
      const pageIds = [conn.meta_page_id, conn.instagram_account_id, conn.whatsapp_number_id].filter(Boolean);
      const { data } = await supabase.from('conversation_ai_control')
        .select('conversation_id, page_id, platform, is_paused, ai_enabled, last_ai_response_at, updated_at')
        .in('page_id', pageIds)
        .order('updated_at', { ascending: false })
        .limit(20);
      setConversations(data || []);
    } finally {
      setIsLoading(false);
    }
  }, [selectedConnId, connections]);

  useEffect(() => { if (selectedConnId && isOpen) loadConversations(); }, [selectedConnId, isOpen]);

  const selectedConn = connections.find((c) => c.id === selectedConnId);

  function handleActionDone(message: string) {
    const type = message.startsWith('❌') ? 'error' : 'success';
    notify(message, type);
    setActiveConv(null);
    loadConversations();
  }

  return (
    <>
      <Notifications items={notifications} onDismiss={(id) => setNotifications((p) => p.filter((n) => n.id !== id))} />

      {activeConv && (
        <ActionsModal
          conv={activeConv.conv}
          connection={activeConv.conn}
          onClose={() => setActiveConv(null)}
          onDone={handleActionDone}
        />
      )}

      <Card>
        <CardHeader>
          <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-yellow-500" />
                Ações Rápidas
              </CardTitle>
              <CardDescription className="mt-1">
                Pause o bot, envie mensagens manuais ou force funções em conversas ativas
              </CardDescription>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>
        </CardHeader>

        {isOpen && (
          <CardContent className="space-y-4 pt-0">

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Assistente</p>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Conexão</p>
                <Select value={selectedConnId} onValueChange={setSelectedConnId} disabled={!connections.length}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.page_name} · {c.platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="icon" onClick={loadConversations} disabled={isLoading}
                  className="shrink-0 h-10 w-10">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Lista de conversas */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !selectedConnId || !connections.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhuma conexão ativa encontrada.</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhuma conversa recente nesta conexão.</p>
                <p className="text-xs mt-1">As conversas aparecem após a primeira interação do cliente.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
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
                    conv={conv}
                    connection={selectedConn!}
                    onAction={(c, conn) => setActiveConv({ conv: c, conn })}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </>
  );
}
