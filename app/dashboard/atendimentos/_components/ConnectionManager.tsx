'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/ConnectionManager.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  AlertCircle,
  Instagram,
  Facebook,
  CheckCircle,
  Trash2,
  Phone,
  Share2,
  X,
  Bot,
  Save,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CreditCard,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

// ─── Tipos ────────────────────────────────────────────────────────────────
type Company = { id: string; name: string; system_prompt: string | null };

type MetaConnection = {
  id: string;
  company_id: string;
  meta_page_id: string;
  page_name: string;
  instagram_account_id: string | null;
  instagram_username: string | null;
  whatsapp_number_id: string | null;
  whatsapp_number: string | null;
  agent_enabled: boolean;
  agent_prompt: string | null;
  faq_enabled: boolean;
  pix_enabled: boolean;
  credits_per_reply_facebook: number;
  credits_per_reply_instagram: number;
  credits_per_reply_whatsapp: number;
  created_at: string;
};

type Notification = { id: number; message: string; type: 'success' | 'error' };

// ─── Notificações inline ───────────────────────────────────────────────────
function Notifications({ items, onDismiss }: { items: Notification[]; onDismiss: (id: number) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {items.map((n) => (
        <div
          key={n.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white max-w-xs
            ${n.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          <span className="flex-1">{n.message}</span>
          <button onClick={() => onDismiss(n.id)} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Painel de configuração do agente ─────────────────────────────────────
function AgentConfigPanel({
  connection,
  companySystemPrompt,
  onSave,
}: {
  connection: MetaConnection;
  companySystemPrompt: string | null;
  onSave: (updates: Partial<MetaConnection>) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [useCustomPrompt, setUseCustomPrompt] = useState(!!connection.agent_prompt);
  const [promptText, setPromptText] = useState(
    connection.agent_prompt || companySystemPrompt || ''
  );

  async function handleSave() {
    setIsSaving(true);
    await onSave({ agent_prompt: useCustomPrompt ? promptText.trim() || null : null });
    setIsSaving(false);
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition w-full"
      >
        <Bot className="h-4 w-4" />
        <span>Configurar prompt do agente</span>
        {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex-1">
              <p className="text-sm font-medium">Prompt personalizado para Meta</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {useCustomPrompt
                  ? 'Usando prompt exclusivo para WhatsApp/Instagram/Messenger'
                  : 'Usando o prompt configurado em Perguntas/Respostas do assistente'}
              </p>
            </div>
            <Switch
              checked={useCustomPrompt}
              onCheckedChange={(v) => {
                setUseCustomPrompt(v);
                if (!v) setPromptText(companySystemPrompt || '');
              }}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {useCustomPrompt ? 'Prompt exclusivo para Meta' : 'Prompt atual do assistente (somente leitura)'}
            </p>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              disabled={!useCustomPrompt}
              rows={5}
              placeholder="Ex: Você é um atendente da Loja X. Responda apenas sobre nossos produtos e horários..."
              className={`w-full text-sm rounded-lg border p-3 resize-y leading-relaxed outline-none transition
                bg-background text-foreground border-border placeholder:text-muted-foreground
                ${useCustomPrompt
                  ? 'focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                  : 'opacity-60 cursor-not-allowed'}`}
            />
            {!useCustomPrompt && (
              <p className="text-xs text-muted-foreground">
                Para editar, ative o prompt personalizado acima ou edite em{' '}
                <a href="/dashboard/faqs" className="underline hover:text-foreground">Perguntas/Respostas</a>.
              </p>
            )}
          </div>

          {useCustomPrompt && (
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                : <><Save className="mr-2 h-4 w-4" />Salvar prompt</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Painel de funções habilitadas ────────────────────────────────────────
function FunctionsPanel({
  connection,
  onSave,
}: {
  connection: MetaConnection;
  onSave: (updates: Partial<MetaConnection>) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [faqEnabled, setFaqEnabled] = useState(connection.faq_enabled ?? true);
  const [pixEnabled, setPixEnabled] = useState(connection.pix_enabled ?? false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggle(field: 'faq_enabled' | 'pix_enabled', value: boolean) {
    if (field === 'faq_enabled') setFaqEnabled(value);
    else setPixEnabled(value);
    setIsSaving(true);
    await onSave({ [field]: value });
    setIsSaving(false);
  }

  return (
    <div className="mt-2 border-t border-border pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition w-full"
      >
        <Zap className="h-4 w-4" />
        <span>Funções habilitadas</span>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Perguntas Frequentes (FAQ)</p>
                <p className="text-xs text-muted-foreground">
                  Responde com base nas perguntas cadastradas ·{' '}
                  <span className="text-yellow-500 font-medium">1 crédito</span>
                </p>
              </div>
            </div>
            <Switch checked={faqEnabled} onCheckedChange={(v) => handleToggle('faq_enabled', v)} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">PIX — Geração e Confirmação</p>
                <p className="text-xs text-muted-foreground">
                  Gera código copia-e-cola e confirma pagamentos ·{' '}
                  <span className="text-yellow-500 font-medium">1 crédito</span> por confirmação
                </p>
              </div>
            </div>
            <Switch checked={pixEnabled} onCheckedChange={(v) => handleToggle('pix_enabled', v)} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-dashed border-border opacity-70">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Respostas via IA (Prompt)</p>
                <p className="text-xs text-muted-foreground">
                  Sempre ativo como fallback ·{' '}
                  <span className="text-yellow-500 font-medium">2 créditos</span>
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Sempre ativo</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────
export function ConnectionManager() {
  const supabase = createClient();

  // ── Lê o companyId da URL (vindo da página de Assistentes) ──────────────
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');

  const [companies, setCompanies] = useState<Company[]>([]);
  // Inicializa já com o ID da URL se existir, evitando flash de seleção errada
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyIdFromUrl || '');
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifCounter = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function notify(message: string, type: 'success' | 'error') {
    const id = ++notifCounter.current;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  }
  function dismissNotif(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  // Carregar companies
  useEffect(() => {
    async function loadCompanies() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('companies')
        .select('id, name, system_prompt')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      if (data && data.length > 0) {
        setCompanies(data);
        // Pré-seleciona pela URL se o ID existir na lista; senão usa o primeiro
        const preSelected = companyIdFromUrl && data.find((c: Company) => c.id === companyIdFromUrl);
        setSelectedCompanyId(preSelected ? companyIdFromUrl! : data[0].id);
      }
    }
    loadCompanies();
  }, []);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null;

  // Buscar conexões
  const fetchConnections = useCallback(async (companyId?: string) => {
    const id = companyId || selectedCompanyId;
    if (!id) { setIsLoading(false); return []; }
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('company_id', id)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setConnections(data || []);
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => { setIsLoading(true); fetchConnections(); }, [selectedCompanyId, fetchConnections]);

  // Realtime
  useEffect(() => {
    if (!selectedCompanyId) return;
    const channel = supabase
      .channel('meta_connections_realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'meta_connections',
        filter: `company_id=eq.${selectedCompanyId}`,
      }, () => { fetchConnections(); stopPolling(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCompanyId, fetchConnections]);

  // Focus/visibility
  useEffect(() => {
    const onFocus = () => fetchConnections();
    const onVisibility = () => { if (!document.hidden) fetchConnections(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchConnections]);

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const found = await fetchConnections();
      if (found && found.length > 0) stopPolling();
    }, 5000);
  }
  function stopPolling() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }
  useEffect(() => {
    if (!isLoading && connections.length === 0) startPolling();
    else stopPolling();
    return stopPolling;
  }, [connections.length, isLoading]);

  // OAuth
  const handleConnect = async () => {
    if (!selectedCompanyId) { notify('Selecione um assistente antes de conectar.', 'error'); return; }
    setIsConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
      if (!META_APP_ID) throw new Error('META_APP_ID não configurado');

      const state = `${user.id}:${selectedCompanyId}:${crypto.randomUUID().substring(0, 8)}`;
      const redirectUri = `${window.location.origin}/auth/callback/facebook`;
      const scopes = [
        'pages_show_list', 'pages_read_engagement', 'pages_manage_metadata',
        'pages_messaging', 'instagram_basic', 'instagram_manage_messages',
        'whatsapp_business_management', 'whatsapp_business_messaging',
      ].join(',');
      const oauthUrl =
        `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopes)}&response_type=code`;

      await openOAuthWindow(oauthUrl);
      notify('Conta Meta conectada! As conexões aparecerão em instantes.', 'success');
      await fetchConnections();
      setTimeout(() => fetchConnections(), 1500);
      setTimeout(() => fetchConnections(), 4000);
    } catch (err: any) {
      const isCancellation = err.message.includes('cancelada') || err.message.includes('fechado') || err.message.includes('closed');
      if (!isCancellation) notify(err.message, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  function openOAuthWindow(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = screen as any;
      const width = 580, height = 680;
      const left = Math.round((s.availLeft ?? 0) + (screen.availWidth - width) / 2);
      const top  = Math.round((s.availTop  ?? 0) + (screen.availHeight - height) / 2);
      const popup = window.open(url, 'MetaOAuth', `width=${width},height=${height},left=${left},top=${top}`);

      if (!popup || popup.closed) {
        localStorage.removeItem('meta_connection_result');
        window.open(url, '_blank');
        const lsInterval = setInterval(() => {
          const stored = localStorage.getItem('meta_connection_result');
          if (stored) {
            try {
              const d = JSON.parse(stored);
              if (Date.now() - (d.timestamp || 0) < 60_000) {
                localStorage.removeItem('meta_connection_result');
                clearInterval(lsInterval);
                d.success ? resolve() : reject(new Error(d.error || 'Erro'));
              }
            } catch { /* ignore */ }
          }
        }, 1000);
        setTimeout(() => { clearInterval(lsInterval); reject(new Error('Tempo esgotado.')); }, 120_000);
        return;
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'meta_connection_success') { window.removeEventListener('message', messageHandler); resolve(); }
        else if (event.data?.type === 'meta_connection_error') { window.removeEventListener('message', messageHandler); reject(new Error(event.data.error || 'Erro')); }
      };
      window.addEventListener('message', messageHandler);

      const closedCheck = setInterval(() => {
        if (popup.closed) { clearInterval(closedCheck); window.removeEventListener('message', messageHandler); reject(new Error('Autenticação cancelada pelo usuário')); }
      }, 500);
      setTimeout(() => {
        clearInterval(closedCheck); window.removeEventListener('message', messageHandler);
        if (!popup.closed) popup.close();
        reject(new Error('Tempo esgotado.'));
      }, 120_000);
    });
  }

  // Salvar qualquer campo da conexão
  const handleSaveConnection = async (connectionId: string, updates: Partial<MetaConnection>) => {
    const { error: updateError } = await supabase
      .from('meta_connections')
      .update(updates)
      .eq('id', connectionId);
    if (updateError) { notify(updateError.message, 'error'); return; }
    setConnections((prev) => prev.map((c) => c.id === connectionId ? { ...c, ...updates } : c));
  };

  // Toggle respostas automáticas
  const handleToggleAgent = async (connectionId: string, enabled: boolean) => {
    await handleSaveConnection(connectionId, { agent_enabled: enabled });
    notify(enabled ? '🤖 Respostas automáticas ativadas' : '⏸️ Respostas automáticas pausadas', 'success');
  };

  // Remover conexão
  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta conta?')) return;
    const { error: deleteError } = await supabase.from('meta_connections').delete().eq('id', connectionId);
    if (deleteError) { notify(deleteError.message, 'error'); return; }
    notify('Conta desconectada com sucesso.', 'success');
    await fetchConnections();
  };

  return (
    <>
      <Notifications items={notifications} onDismiss={dismissNotif} />

      <div className="space-y-6">

        {/* Seletor de assistente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-500" />
              Atendimentos Meta
            </CardTitle>
            <CardDescription>
              Conecte seu assistente ao WhatsApp Business, Instagram e Facebook Messenger
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Assistente</p>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Selecione um assistente" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O agente responderá automaticamente de acordo com o prompt (1 crédito por resposta).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conexões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Facebook className="h-5 w-5 text-blue-600" />
              Conexões Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && connections.length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Carregando conexões...</p>
              </div>
            ) : error && connections.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <p className="text-sm text-red-500 mb-4">{error}</p>
                <Button variant="outline" onClick={() => fetchConnections()}>Tentar Novamente</Button>
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-10">
                <div className="bg-muted/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
                  <Facebook className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Nenhuma conta conectada</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  Conecte sua conta do Facebook para ativar o agente no Instagram, WhatsApp e Messenger.
                </p>
                <Button onClick={handleConnect} size="lg" disabled={isConnecting || !selectedCompanyId}>
                  {isConnecting
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo...</>
                    : <><Facebook className="mr-2 h-5 w-5" />Conectar Conta Meta</>}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {connections.length} {connections.length === 1 ? 'conexão ativa' : 'conexões ativas'}
                  </p>
                  <Button variant="outline" onClick={handleConnect} disabled={isConnecting || !selectedCompanyId}>
                    {isConnecting
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Conectando...</>
                      : <><Facebook className="mr-2 h-4 w-4" />Conectar Nova Conta</>}
                  </Button>
                </div>

                {connections.map((conn) => (
                  <Card key={conn.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">

                      {/* Cabeçalho */}
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Facebook className="h-4 w-4 text-blue-600" />
                            <p className="font-bold">{conn.page_name}</p>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                          {conn.instagram_username && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Instagram className="h-4 w-4 text-pink-600" />
                              <span>@{conn.instagram_username}</span>
                            </div>
                          )}
                          {conn.whatsapp_number && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4 text-green-600" />
                              <span>{conn.whatsapp_number}</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground pt-1">
                            Configure suas contas do Facebook · Instagram · WhatsApp diretamente no Business Suite do Grupo Meta
                          </p>
                        </div>

                        {/* Toggle + Remover */}
                        <div className="flex flex-col gap-3 items-end">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Respostas automáticas</span>
                            <Switch
                              checked={conn.agent_enabled}
                              onCheckedChange={(checked) => handleToggleAgent(conn.id, checked)}
                            />
                            <span className={`text-xs font-medium ${conn.agent_enabled ? 'text-green-500' : 'text-gray-400'}`}>
                              {conn.agent_enabled ? 'Ativas' : 'Pausadas'}
                            </span>
                          </div>
                          <Button variant="destructive" size="sm" onClick={() => handleDisconnect(conn.id)}>
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remover
                          </Button>
                        </div>
                      </div>

                      {/* Funções habilitadas */}
                      <FunctionsPanel
                        connection={conn}
                        onSave={(updates) => handleSaveConnection(conn.id, updates)}
                      />

                      {/* Prompt do agente */}
                      <AgentConfigPanel
                        connection={conn}
                        companySystemPrompt={selectedCompany?.system_prompt || null}
                        onSave={(updates) => handleSaveConnection(conn.id, updates)}
                      />

                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </>
  );
}