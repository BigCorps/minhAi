'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/ConnectionManager.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button }   from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch }   from '@/components/ui/switch';
import {
  Loader2, AlertCircle, Instagram, Facebook, CheckCircle,
  Trash2, Phone, X, Bot, Save, ChevronDown, ChevronUp,
  MessageSquare, Zap,
} from 'lucide-react';
import { createClient }          from '@/lib/supabase-browser';
import EmbeddedSignupButton      from '@/components/meta/EmbeddedSignupButton';

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
  prompt_enabled: boolean;
  greeting_message: string | null;
  startup_function_key_meta: string | null;
  created_at: string;
};

type AvailableFunction = {
  function_key: string;
  function_name: string;
  short_description?: string;
};

type Notification = { id: number; message: string; type: 'success' | 'error' };

// ─── Notificações ─────────────────────────────────────────────────────────

function Notifications({ items, onDismiss }: { items: Notification[]; onDismiss: (id: number) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-[calc(100vw-2rem)]">
      {items.map((n) => (
        <div
          key={n.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white
            ${n.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          <span className="flex-1 break-words">{n.message}</span>
          <button onClick={() => onDismiss(n.id)} className="opacity-70 hover:opacity-100 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── GreetingStartupSection ───────────────────────────────────────────────
// Substitui o antigo GreetingConfig.
// Exposto fora do AgentConfigPanel — visível sempre, independente do modo IA.
// Mutuamente exclusivo: texto OU função, nunca os dois ao mesmo tempo.

function GreetingStartupSection({
  connection,
  availableFunctions,
  onSave,
}: {
  connection: MetaConnection;
  availableFunctions: AvailableFunction[];
  onSave: (updates: Partial<MetaConnection>) => Promise<void>;
}) {
  type Mode = 'text' | 'function';
  const [mode, setMode]                 = useState<Mode>(connection.startup_function_key_meta ? 'function' : 'text');
  const [greetingText, setGreetingText] = useState(connection.greeting_message || '');
  const [fnKey, setFnKey]               = useState(connection.startup_function_key_meta || '');
  const [fnInputText, setFnInputText]   = useState('');
  const [suggestions, setSuggestions]   = useState<AvailableFunction[]>([]);
  const [showSugg, setShowSugg]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

// Calcula posição do dropdown quando ele abre
useEffect(() => {
  if (showSugg && inputWrapperRef.current) {
    const rect = inputWrapperRef.current.getBoundingClientRect();
    setDropdownPos({
      top:   rect.bottom + 4,
      left:  rect.left,
      width: rect.width,
    });
  }
}, [showSugg]);

  // Preenche label da função quando há valor salvo
  useEffect(() => {
    if (!connection.startup_function_key_meta || !availableFunctions.length) return;
    const match = availableFunctions.find(f => f.function_key === connection.startup_function_key_meta);
    setFnInputText(match ? match.function_name : connection.startup_function_key_meta);
  }, [connection.startup_function_key_meta, availableFunctions]);

  function handleFnInput(val: string) {
    setFnInputText(val);
    setFnKey('');
    if (val.length > 0) {
      const term = val.toLowerCase();
      const filtered = availableFunctions.filter(f =>
        f.function_key.includes(term) || f.function_name.toLowerCase().includes(term)
      );
      setSuggestions(filtered);
      setShowSugg(filtered.length > 0);
    } else {
      setShowSugg(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === 'text') {
        await onSave({
          greeting_message:          greetingText.trim() || null,
          startup_function_key_meta: null,
        });
      } else {
        await onSave({
          greeting_message:          null,
          startup_function_key_meta: fnKey || null,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const savedFnName = availableFunctions.find(f => f.function_key === connection.startup_function_key_meta)?.function_name
    ?? connection.startup_function_key_meta;

  const statusLabel = mode === 'text'
    ? (connection.greeting_message ? 'Texto configurado' : 'Nenhum texto salvo')
    : (connection.startup_function_key_meta ? `Função: ${savedFnName}` : 'Nenhuma função salva');

  return (
    <div className="mt-3 border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border flex-wrap gap-y-1">
        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold">Saudação Inicial</span>
        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[160px] sm:max-w-xs">
          {statusLabel}
        </span>
      </div>

      <div className="p-3 space-y-3">
{/* Seletor de modo */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('text')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium border transition-all
              ${mode === 'text'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-background text-muted-foreground border-border hover:border-blue-400 hover:text-blue-600'}`}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span>Texto</span>
          </button>
          <button
            onClick={() => setMode('function')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium border transition-all
              ${mode === 'function'
                ? 'bg-lime-500 text-white border-lime-500'
                : 'bg-background text-muted-foreground border-border hover:border-lime-400 hover:text-lime-600'}`}
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>Função</span>
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {mode === 'text'
            ? 'Mensagem enviada automaticamente ao primeiro contato do cliente, em qualquer modo.'
            : 'Função executada na primeira mensagem (ex: cardápio, nossa marca, orçamento).'}
        </p>

        {/* Campo texto */}
        {mode === 'text' && (
          <textarea
            value={greetingText}
            onChange={(e) => setGreetingText(e.target.value)}
            rows={3}
            placeholder="Ex: Olá! Posso te ajudar com orçamentos, endereço ou PIX. O que precisa?"
            className="w-full text-sm rounded-lg border border-border p-2.5 resize-none outline-none
              bg-background text-foreground placeholder:text-muted-foreground
              focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        )}

{/* Campo função */}
{mode === 'function' && (
  <div className="relative">
    <div className="flex gap-2">
      <div className="relative flex-1 min-w-0" ref={inputWrapperRef}>
        <input
          type="text"
          value={fnInputText}
          onChange={(e) => handleFnInput(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSugg(true);
          }}
          onBlur={() => setTimeout(() => setShowSugg(false), 150)}
          placeholder="Buscar função..."
          className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background text-sm
            text-foreground placeholder:text-muted-foreground outline-none
            focus:ring-2 focus:ring-lime-500/30 focus:border-lime-500"
        />
        {fnKey && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold
            px-1 py-0.5 rounded bg-lime-100 dark:bg-lime-900/30
            text-lime-700 dark:text-lime-300">✓</span>
        )}
      </div>
      {fnKey && (
        <button
          onClick={() => { setFnKey(''); setFnInputText(''); }}
          className="shrink-0 p-2 rounded-lg border border-destructive/30 text-destructive
            hover:bg-destructive/10 transition"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>

    {showSugg && dropdownPos && createPortal(
      <div
        style={{
          position: 'fixed',
          top:    dropdownPos.top,
          left:   dropdownPos.left,
          width:  dropdownPos.width,
          zIndex: 9999,
        }}
        className="rounded-lg border border-border shadow-xl max-h-48 overflow-y-auto bg-white dark:bg-slate-800"
      >
        {suggestions.map(fn => (
          <button
            key={fn.function_key}
            type="button"
            onMouseDown={() => {
              setFnKey(fn.function_key);
              setFnInputText(fn.function_name);
              setShowSugg(false);
            }}
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition flex flex-col gap-0.5"
          >
            <span className="font-semibold text-foreground">{fn.function_name}</span>
            {fn.short_description && (
              <span className="text-xs text-muted-foreground truncate">{fn.short_description}</span>
            )}
          </button>
        ))}
      </div>,
      document.body
    )}
  </div>
)}
          </div>
        )}

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || (mode === 'function' && !fnKey && !connection.startup_function_key_meta)}
          className={`w-full sm:w-auto ${mode === 'function' ? 'bg-lime-500 hover:bg-lime-600 text-white' : ''}`}
        >
          {saving ? (
            <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Salvando...</>
          ) : saved ? (
            <>✓ Salvo!</>
          ) : (
            <><Save className="mr-2 h-3 w-3" />Salvar saudação</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── AgentConfigPanel ─────────────────────────────────────────────────────
// GreetingConfig foi removido daqui — agora está em GreetingStartupSection.

function AgentConfigPanel({
  connection,
  companySystemPrompt,
  onSave,
}: {
  connection: MetaConnection;
  companySystemPrompt: string | null;
  onSave: (updates: Partial<MetaConnection>) => Promise<void>;
}) {
  const [isOpen, setIsOpen]             = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [useCustom, setUseCustom]       = useState(!!connection.agent_prompt);
  const [promptText, setPromptText]     = useState(connection.agent_prompt || companySystemPrompt || '');
  const [promptEnabled, setPromptEnabled]           = useState(connection.prompt_enabled ?? true);
  const [savingPromptEnabled, setSavingPromptEnabled] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    await onSave({ agent_prompt: useCustom ? promptText.trim() || null : null });
    setIsSaving(false);
  }

  async function handleTogglePromptEnabled(value: boolean) {
    setSavingPromptEnabled(true);
    setPromptEnabled(value);
    await onSave({ prompt_enabled: value });
    setSavingPromptEnabled(false);
  }

  return (
    <div className="mt-2 border-t border-border pt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition w-full"
      >
        <Bot className="h-4 w-4 shrink-0" />
        <span>Configurar prompt do agente</span>
        {savingPromptEnabled && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">

          {/* Toggle: Respostas via IA */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Respostas via IA (ChatGPT)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {promptEnabled
                  ? 'Responde mensagens sem função reconhecida com IA'
                  : 'Modo só-funções: bot ignora mensagens sem função'}
              </p>
            </div>
            <Switch
              checked={promptEnabled}
              onCheckedChange={handleTogglePromptEnabled}
              disabled={savingPromptEnabled}
            />
          </div>

          {/* Prompt personalizado */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Prompt personalizado para Meta</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {useCustom
                  ? 'Usando prompt exclusivo para este canal'
                  : 'Usando prompt do assistente (Perguntas/Respostas)'}
              </p>
            </div>
            <Switch
              checked={useCustom}
              onCheckedChange={(v) => {
                setUseCustom(v);
                if (!v) setPromptText(companySystemPrompt || '');
              }}
            />
          </div>

          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            disabled={!useCustom}
            rows={5}
            placeholder="Ex: Você é um atendente da Loja X. Responda apenas sobre nossos produtos..."
            className={`w-full text-sm rounded-lg border p-3 resize-y outline-none transition
              bg-background text-foreground border-border placeholder:text-muted-foreground
              ${useCustom
                ? 'focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                : 'opacity-60 cursor-not-allowed'}`}
          />

          {!useCustom && (
            <p className="text-xs text-muted-foreground">
              Para editar, ative o prompt personalizado acima ou edite na{' '}
              <a href="/dashboard/faqs" className="underline hover:text-foreground">
                Perguntas/Respostas
              </a>.
            </p>
          )}

          {useCustom && (
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                : <><Save className="mr-2 h-4 w-4" />Salvar prompt</>
              }
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export function ConnectionManager({
  selectedCompanyId,
  onCompanyChange,
  onConnectionsChange,
}: {
  selectedCompanyId: string;
  onCompanyChange?: (id: string) => void;
  onConnectionsChange?: (hasConnections: boolean) => void;
}) {
  const supabase = createClient();
  const [companies, setCompanies]               = useState<Company[]>([]);
  const [connections, setConnections]           = useState<MetaConnection[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<AvailableFunction[]>([]);
  const [isLoading, setIsLoading]               = useState(true);
  const [isConnecting, setIsConnecting]         = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [notifications, setNotifications]       = useState<Notification[]>([]);
  const [userId, setUserId]                     = useState<string>('');
  const notifCounter = useRef(0);
  const pollingRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const configIdWA = process.env.NEXT_PUBLIC_META_CONFIG_ID_WA;

  function notify(message: string, type: 'success' | 'error') {
    const id = ++notifCounter.current;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  }
  function dismissNotif(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  // ── Carregar funções Meta disponíveis (autocomplete de saudação) ───────
  useEffect(() => {
    async function loadFunctions() {
      const { data } = await supabase
        .from('assistant_functions')
        .select('function_key, function_name, short_description')
        .eq('is_active', true)
        .eq('enabled_meta', true)
        .order('function_name');
      if (data) setAvailableFunctions(data);
    }
    loadFunctions();
  }, []);

  // ── Carregar usuário e empresas ────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('companies')
        .select('id, name, system_prompt')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      if (data) setCompanies(data);
    }
    loadUser();
  }, []);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null;

  // ── Buscar conexões ────────────────────────────────────────────────────
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
      onConnectionsChange?.((data || []).length > 0);
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    setIsLoading(true);
    fetchConnections();
  }, [selectedCompanyId, fetchConnections]);

  // Realtime
  useEffect(() => {
    if (!selectedCompanyId) return;
    const channel = supabase.channel('meta_connections_rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'meta_connections',
        filter: `company_id=eq.${selectedCompanyId}`,
      }, () => { fetchConnections(); stopPolling(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCompanyId, fetchConnections]);

  // Re-fetch ao voltar para a página
  useEffect(() => {
    const onFocus = () => fetchConnections();
    const onVis   = () => { if (!document.hidden) fetchConnections(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchConnections]);

  // Polling enquanto sem conexão
  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const f = await fetchConnections();
      if (f && f.length > 0) stopPolling();
    }, 5000);
  }
  function stopPolling() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }
  useEffect(() => {
    if (!isLoading && connections.length === 0) startPolling(); else stopPolling();
    return stopPolling;
  }, [connections.length, isLoading]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleConnect = async () => {
    if (!selectedCompanyId) { notify('Selecione um assistente antes de conectar.', 'error'); return; }
    setIsConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
      if (!META_APP_ID) throw new Error('META_APP_ID não configurado');
      const state       = `${user.id}:${selectedCompanyId}:${crypto.randomUUID().substring(0, 8)}`;
      const redirectUri = `${window.location.origin}/auth/callback/facebook`;
      const scopes = [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_engagement',
        'pages_manage_metadata',
        'pages_messaging',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_manage_messages',
        'instagram_manage_comments',
      ].join(',');
      const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
      await openOAuthWindow(oauthUrl);
      notify('✅ Facebook / Instagram conectado!', 'success');
      await fetchConnections();
      setTimeout(() => fetchConnections(), 1500);
      setTimeout(() => fetchConnections(), 4000);
    } catch (err: any) {
      const isCancel = err.message.includes('cancelada') || err.message.includes('fechado') || err.message.includes('closed');
      if (!isCancel) notify(err.message, 'error');
    } finally { setIsConnecting(false); }
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
        const lsi = setInterval(() => {
          const stored = localStorage.getItem('meta_connection_result');
          if (stored) {
            try {
              const d = JSON.parse(stored);
              if (Date.now() - (d.timestamp || 0) < 60_000) {
                localStorage.removeItem('meta_connection_result');
                clearInterval(lsi);
                d.success ? resolve() : reject(new Error(d.error || 'Erro'));
              }
            } catch { }
          }
        }, 1000);
        setTimeout(() => { clearInterval(lsi); reject(new Error('Tempo esgotado.')); }, 120_000);
        return;
      }
      const mh = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'meta_connection_success') { window.removeEventListener('message', mh); resolve(); }
        else if (event.data?.type === 'meta_connection_error') { window.removeEventListener('message', mh); reject(new Error(event.data.error || 'Erro')); }
      };
      window.addEventListener('message', mh);
      const cc = setInterval(() => {
        if (popup.closed) {
          clearInterval(cc);
          window.removeEventListener('message', mh);
          reject(new Error('Autenticação cancelada pelo usuário'));
        }
      }, 500);
      setTimeout(() => { clearInterval(cc); window.removeEventListener('message', mh); if (!popup.closed) popup.close(); reject(new Error('Tempo esgotado.')); }, 120_000);
    });
  }

  function handleSignupSuccess(result: {
    waba_id: string;
    phone_number_id: string;
    display_phone_number: string | null;
  }) {
    const waMsg = result.display_phone_number ? ` WhatsApp: ${result.display_phone_number}.` : '';
    notify(`✅ Conta Meta conectada com sucesso!${waMsg}`, 'success');
    setIsConnecting(false);
    fetchConnections();
    setTimeout(() => fetchConnections(), 1500);
    setTimeout(() => fetchConnections(), 4000);
  }

  function handleSignupError(err: string) {
    const isCancel = err.toLowerCase().includes('cancel');
    if (!isCancel) notify(err, 'error');
    setIsConnecting(false);
  }

  const handleSaveConnection = async (connectionId: string, updates: Partial<MetaConnection>) => {
    const { error: updateError } = await supabase
      .from('meta_connections')
      .update(updates)
      .eq('id', connectionId);
    if (updateError) { notify(updateError.message, 'error'); return; }
    setConnections((prev) => prev.map((c) => c.id === connectionId ? { ...c, ...updates } : c));
  };

  const handleToggleAgent = async (connectionId: string, enabled: boolean) => {
    await handleSaveConnection(connectionId, { agent_enabled: enabled });
    notify(enabled ? '🤖 Respostas automáticas ativadas' : '⏸️ Respostas automáticas pausadas', 'success');
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta conta?')) return;
    const { error: deleteError } = await supabase
      .from('meta_connections')
      .delete()
      .eq('id', connectionId);
    if (deleteError) { notify(deleteError.message, 'error'); return; }
    notify('Conta desconectada com sucesso.', 'success');
    await fetchConnections();
  };

  // ── Botões de conexão ──────────────────────────────────────────────────

  function renderConnectButton(size: 'sm' | 'lg' = 'lg') {
    if (!selectedCompanyId || !userId) {
      return (
        <div className={`grid gap-2 w-full ${size === 'lg' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <Button size={size} disabled variant="outline" className="flex-1 min-w-0">
            <Phone className={`mr-2 shrink-0 ${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            <span className="truncate">{size === 'lg' ? 'Conectar WhatsApp' : 'WhatsApp'}</span>
          </Button>
          <Button size={size} disabled className="flex-1 min-w-0">
            <Facebook className={`mr-2 shrink-0 ${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            <span className="truncate">{size === 'lg' ? 'Conectar Facebook / Instagram' : 'Facebook / Instagram'}</span>
          </Button>
        </div>
      );
    }

    return (
      <div className={`grid gap-2 w-full ${size === 'lg' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>

        {/* Botão WhatsApp */}
        {configIdWA ? (
          <EmbeddedSignupButton
            companyId={selectedCompanyId}
            userId={userId}
            mode="coexistence"
            configIdOverride={configIdWA}
            whatsappOnly
            onSuccess={(result) => {
              if (result.display_phone_number) {
                notify(`📱 WhatsApp ${result.display_phone_number} conectado!`, 'success');
              } else {
                notify('✅ WhatsApp conectado com sucesso!', 'success');
              }
              setIsConnecting(false);
              fetchConnections();
              setTimeout(() => fetchConnections(), 1500);
              setTimeout(() => fetchConnections(), 4000);
            }}
            onError={handleSignupError}
            onLoading={setIsConnecting}
            disabled={isConnecting}
            className={`flex-1 min-w-0 inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors
              border border-green-500 text-green-700 dark:text-green-400
              bg-green-50 dark:bg-green-900/20
              hover:bg-green-100 dark:hover:bg-green-900/40
              disabled:opacity-50 disabled:pointer-events-none
              ${size === 'lg' ? 'h-11 px-4 text-base' : 'h-9 px-3 text-sm'}`}
          >
            {isConnecting
              ? <><Loader2 className={`animate-spin shrink-0 ${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} /><span className="truncate">Conectando...</span></>
              : <><Phone className={`shrink-0 ${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} /><span className="truncate">{size === 'lg' ? 'Conectar WhatsApp' : 'WhatsApp'}</span></>
            }
          </EmbeddedSignupButton>
        ) : (
          <Button
            size={size}
            variant="outline"
            disabled
            title="Configure NEXT_PUBLIC_META_CONFIG_ID_WA no Vercel para habilitar"
            className="w-full border-green-300 text-green-500 opacity-50 cursor-not-allowed"
          >
            <Phone className={`mr-2 shrink-0 ${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />
            <span className="truncate">{size === 'lg' ? 'Conectar WhatsApp' : 'WhatsApp'}</span>
          </Button>
        )}

        {/* Botão Facebook / Instagram */}
<Button
  onClick={handleConnect}
  disabled={isConnecting}
  size={size}
  className={`w-full ${size === 'lg' ? 'h-12 px-4 text-base' : 'h-10 px-3 text-sm'}`}
>
          {isConnecting
            ? <><Loader2 className={`mr-2 animate-spin shrink-0 ${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} /><span className="truncate">Conectando...</span></>
            : <><Facebook className={`mr-2 shrink-0 ${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} /><span className="truncate">{size === 'lg' ? 'Conectar Facebook / Instagram' : 'Facebook / Instagram'}</span></>
          }
        </Button>

      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Notifications items={notifications} onDismiss={dismissNotif} />

      <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Facebook className="h-5 w-5 text-blue-600 shrink-0" />
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
              <Button variant="outline" onClick={() => fetchConnections()}>
                Tentar Novamente
              </Button>
            </div>

          ) : connections.length === 0 ? (
            <div className="text-center py-10">
              <div className="bg-muted/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
                <Facebook className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Nenhuma conta conectada</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Conecte sua conta do <strong>Facebook</strong> para ativar o agente no Instagram e Messenger,
                ou conecte o <strong>WhatsApp</strong> diretamente.
              </p>
              <div className="flex justify-center">
                {renderConnectButton('lg')}
              </div>
            </div>

          ) : (
            <div className="space-y-4">

              {/* Header da lista: contagem + botões de adicionar */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {connections.length}{' '}
                  {connections.length === 1 ? 'conexão ativa' : 'conexões ativas'}
                </p>
                {renderConnectButton('sm')}
              </div>

              {/* Cards de conexão */}
              {connections.map((conn) => (
                <Card key={conn.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">

                    {/* ── Linha principal: info + controles ── */}
                    <div className="flex flex-col gap-3">

                      {/* Info da conexão */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Facebook className="h-4 w-4 text-blue-600 shrink-0" />
                            <p className="font-bold truncate">{conn.page_name}</p>
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          </div>

                          {conn.instagram_username && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Instagram className="h-4 w-4 text-pink-600 shrink-0" />
                              <span className="truncate">@{conn.instagram_username}</span>
                            </div>
                          )}

                          {conn.whatsapp_number ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4 text-green-600 shrink-0" />
                              <span className="truncate">{conn.whatsapp_number}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 flex-wrap">
                              <Phone className="h-4 w-4 shrink-0" />
                              <span>WhatsApp não conectado</span>
                              {configIdWA ? (
                                <EmbeddedSignupButton
                                  companyId={conn.company_id}
                                  userId={userId}
                                  mode="coexistence"
                                  configIdOverride={configIdWA}
                                  whatsappOnly
                                  onSuccess={(result) => {
                                    if (result.display_phone_number) {
                                      notify(`📱 WhatsApp ${result.display_phone_number} conectado!`, 'success');
                                    } else {
                                      notify('✅ WhatsApp conectado!', 'success');
                                    }
                                    fetchConnections();
                                  }}
                                  onError={handleSignupError}
                                  className="text-xs underline underline-offset-2 hover:no-underline bg-transparent border-0 p-0 text-amber-600 dark:text-amber-400 cursor-pointer"
                                >
                                  Conectar agora
                                </EmbeddedSignupButton>
                              ) : (
                                <EmbeddedSignupButton
                                  companyId={conn.company_id}
                                  userId={userId}
                                  mode="coexistence"
                                  onSuccess={(result) => {
                                    if (result.display_phone_number) {
                                      notify(`📱 WhatsApp ${result.display_phone_number} conectado!`, 'success');
                                      fetchConnections();
                                    }
                                  }}
                                  onError={handleSignupError}
                                  className="text-xs underline underline-offset-2 hover:no-underline bg-transparent border-0 p-0 text-amber-600 dark:text-amber-400 cursor-pointer"
                                >
                                  Conectar agora
                                </EmbeddedSignupButton>
                              )}
                            </div>
                          )}

<p className="text-xs text-muted-foreground pt-0.5">
                            Configure e acompanhe as conversas do Facebook · Instagram · WhatsApp
                            diretamente no Business Suite do Grupo Meta
                          </p>

                          {/* Saudação inicial / Função de boas-vindas */}
                          <GreetingStartupSection
                            connection={conn}
                            availableFunctions={availableFunctions}
                            onSave={(u) => handleSaveConnection(conn.id, u)}
                          />
                        </div>
                      </div>

                      {/* ── Controles: toggle + remover (nunca estouram o card) ── */}
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-border">
                        {/* Toggle respostas automáticas */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Switch
                            checked={conn.agent_enabled}
                            onCheckedChange={(v) => handleToggleAgent(conn.id, v)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">Respostas automáticas</p>
                            <p className={`text-xs font-medium ${conn.agent_enabled ? 'text-green-500' : 'text-gray-400'}`}>
                              {conn.agent_enabled ? 'Ativas' : 'Pausadas'}
                            </p>
                          </div>
                        </div>

                        {/* Botão remover */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisconnect(conn.id)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Remover</span>
                        </Button>
                      </div>
                    </div>

                    {/* ── Configurações expandíveis ── */}

                    {/* Prompt do agente (IA, prompt personalizado) */}
                    <AgentConfigPanel
                      connection={conn}
                      companySystemPrompt={selectedCompany?.system_prompt || null}
                      onSave={(u) => handleSaveConnection(conn.id, u)}
                    />

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
